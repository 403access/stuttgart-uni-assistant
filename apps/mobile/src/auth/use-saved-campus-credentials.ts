import { useCallback, useEffect, useRef, useState } from 'react';

import { authenticateWithBiometrics } from '@/src/auth/biometrics';
import { biometricMessage, isBiometricCancel } from '@/src/auth/biometric-messages';
import {
  clearLogin,
  clearLoginHint,
  readLoginResult,
  storedLoginHint,
  type StoredLogin,
} from '@/src/auth/vault';
import { useOnboarding } from '@/src/onboarding/OnboardingState';
import { useAppSelector } from '@/src/state/AppState';
import { tx } from '@ua/core/format';

/** How long a revealed password stays on screen before it hides itself. */
const REVEAL_MS = 30_000;

export interface StoredLoginHint {
  account: string;
  biometrics: boolean;
}

export type UnlockResult =
  | { status: 'ok'; login: StoredLogin }
  | { status: 'empty' }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

export interface SavedCampusCredentials {
  /** Account id and biometric flag, without reading the secret. */
  hint: StoredLoginHint | null;
  /** The account and password while the user asked to see them. */
  revealed: StoredLogin | null;
  /** A prompt or vault read is in flight. */
  busy: boolean;
  /** Why the last reveal failed, empty when it did not. */
  error: string;
  /** Re-read the hint, e.g. after returning from another screen. */
  refresh: () => Promise<void>;
  /** Read the vault for display, prompting for biometrics when configured. */
  reveal: () => Promise<void>;
  /** Hide the revealed credential and drop it from memory. */
  hide: () => void;
  /** Read the vault for one use (automated sign-in), without displaying it. */
  unlock: () => Promise<UnlockResult>;
  /** Delete the vault entry and the hint. */
  forget: () => Promise<void>;
}

/**
 * The one place that turns the write-only vault into something the UI may show.
 * Reading always goes through the entry's own gate: an entry saved with
 * biometrics raises the OS prompt in `expo-secure-store`, an entry without the
 * gate is read directly — unless the App Lock is on, in which case the user is
 * asked for Face ID / fingerprint first so a later opt-in still protects it.
 */
export function useSavedCampusCredentials(): SavedCampusCredentials {
  const locale = useAppSelector((state) => state.locale);
  const { biometricsEnabled } = useOnboarding();
  const [hint, setHint] = useState<StoredLoginHint | null>(null);
  const [revealed, setRevealed] = useState<StoredLogin | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlocking = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);

  const refresh = useCallback(async () => {
    setHint(await storedLoginHint().catch(() => null));
  }, []);

  useEffect(() => {
    let active = true;
    storedLoginHint()
      .then((stored) => {
        if (active) setHint(stored);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      clearHideTimer();
    };
  }, [clearHideTimer]);

  const unlock = useCallback(async (): Promise<UnlockResult> => {
    if (unlocking.current) return { status: 'cancelled' };
    unlocking.current = true;
    setBusy(true);
    setError('');
    try {
      const stored = hint ?? (await storedLoginHint().catch(() => null));
      if (!stored) {
        setHint(null);
        return { status: 'empty' };
      }
      const prompt = tx(locale, 'savedCredentials.entsperren');
      if (!stored.biometrics && biometricsEnabled) {
        // The entry predates the App Lock or was saved without the gate. Ask
        // explicitly so "biometrics on" always means a prompt before revealing.
        const auth = await authenticateWithBiometrics(prompt, tx(locale, 'common.abbrechen'));
        if (!auth.success) {
          if (isBiometricCancel(auth.error)) return { status: 'cancelled' };
          return { status: 'failed', message: biometricMessage(locale, auth.error) };
        }
      }
      // A gated entry raises the OS prompt itself; the flag decides the read.
      const read = await readLoginResult(prompt, stored.biometrics);
      if (read.status === 'ok') return { status: 'ok', login: read.login };
      if (read.status === 'missing') {
        // The entry is gone (deleted, or its biometric set was invalidated).
        // Only the hint may be dropped: there is nothing left to delete.
        await clearLoginHint();
        setHint(null);
        setRevealed(null);
        return { status: 'empty' };
      }
      if (read.status === 'cancelled') return { status: 'cancelled' };
      return { status: 'failed', message: tx(locale, 'savedCredentials.fehler') };
    } finally {
      unlocking.current = false;
      setBusy(false);
    }
  }, [biometricsEnabled, hint, locale]);

  const reveal = useCallback(async () => {
    const result = await unlock();
    if (result.status === 'ok') {
      setRevealed(result.login);
      clearHideTimer();
      hideTimer.current = setTimeout(() => setRevealed(null), REVEAL_MS);
      return;
    }
    setRevealed(null);
    if (result.status === 'failed') setError(result.message);
    else if (result.status === 'empty') setError(tx(locale, 'savedCredentials.leer'));
  }, [clearHideTimer, locale, unlock]);

  const hide = useCallback(() => {
    clearHideTimer();
    setRevealed(null);
    setError('');
  }, [clearHideTimer]);

  const forget = useCallback(async () => {
    clearHideTimer();
    await clearLogin();
    setHint(null);
    setRevealed(null);
    setError('');
  }, [clearHideTimer]);

  return { hint, revealed, busy, error, refresh, reveal, hide, unlock, forget };
}
