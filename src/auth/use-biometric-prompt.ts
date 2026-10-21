import { useCallback, useRef, useState } from 'react';

import { authenticateWithBiometrics, type BiometricAuthResult } from '@/src/auth/biometrics';
import { biometricMessage, isBiometricCancel } from '@/src/auth/biometric-messages';
import { useOnboarding } from '@/src/onboarding/OnboardingState';
import { useAppSelector } from '@/src/state/AppState';
import { tx, type TranslationKey } from '@/src/text';

export interface BiometricPrompt {
  /** Run the system prompt; null when one is already open. */
  prompt: (reasonKey: TranslationKey, cancelKey?: TranslationKey) => Promise<BiometricAuthResult | null>;
  busy: boolean;
  /** User-facing explanation for a non-cancel failure. */
  error: string;
  clearError: () => void;
}

/**
 * The Face ID / fingerprint prompt shared by onboarding, the security screen
 * and the app lock. With `persist` (the default) a successful prompt enables
 * the preference and requires biometrics; without it, the app lock allows the
 * OS device-passcode fallback and never touches the stored preference.
 */
export function useBiometricPrompt(options: { persist?: boolean } = {}): BiometricPrompt {
  const { persist = true } = options;
  const locale = useAppSelector((state) => state.locale);
  const { enableBiometrics } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const prompting = useRef(false);

  const prompt = useCallback(
    async (
      reasonKey: TranslationKey,
      cancelKey: TranslationKey = 'common.abbrechen',
    ): Promise<BiometricAuthResult | null> => {
      if (prompting.current) return null;
      prompting.current = true;
      setBusy(true);
      setError('');
      try {
        const reason = tx(locale, reasonKey);
        const cancel = tx(locale, cancelKey);
        const result = persist
          ? await enableBiometrics(reason, cancel)
          : await authenticateWithBiometrics(reason, cancel);
        if (!result.success && !isBiometricCancel(result.error)) {
          setError(biometricMessage(locale, result.error));
        }
        return result;
      } finally {
        prompting.current = false;
        setBusy(false);
      }
    },
    [enableBiometrics, locale, persist],
  );

  const clearError = useCallback(() => setError(''), []);

  return { prompt, busy, error, clearError };
}
