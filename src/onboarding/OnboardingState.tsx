import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { authenticateWithBiometrics, biometricsStatus, type BiometricAuthResult, type BiometricsStatus } from '@/src/auth/biometrics';
import { fetchServerPreferences, saveServerPreferences } from '@/src/auth/session';
import { useAppStateChange } from '@/src/hooks/use-app-state-change';
import { useApp } from '@/src/state/AppState';

/**
 * First-run onboarding and the device-level biometric preference. These are
 * deliberately outside the signed-in `PersistedState`: the flow runs once per
 * installation, and the App Lock survives a sign-out or a local data reset.
 */

export const ONBOARDING_STORAGE_KEY = 'university-assistant/onboarding.v2';

export interface OnboardingPreferences {
  /** ISO timestamp of the completed first-run flow, or null while it is due. */
  completedAt: string | null;
  /** Ask for Face ID / fingerprint when the app opens. */
  biometricsEnabled: boolean;
  /** Development only: show the flow even when the biometric probe says no. */
  forceOnboarding: boolean;
}

const defaults: OnboardingPreferences = { completedAt: null, biometricsEnabled: false, forceOnboarding: false };

interface OnboardingContextValue {
  ready: boolean;
  completed: boolean;
  completedAt: string | null;
  forceOnboarding: boolean;
  biometricsEnabled: boolean;
  /** The device has a fingerprint/face sensor. */
  biometricsHardware: boolean;
  /** A fingerprint or face is enrolled. */
  biometricsEnrolled: boolean;
  /** Hardware plus enrollment: the onboarding page has something to ask for. */
  biometricsAvailable: boolean;
  /** True right after the user enabled biometrics; suppresses the lock once. */
  biometricsJustEnabled: boolean;
  /** Re-check hardware and enrollment, e.g. after returning from system settings. */
  refreshBiometrics: () => Promise<void>;
  /**
   * Write a pending onboarding record for the next launch without changing the
   * running session. The gate therefore does not redirect until the app is
   * reopened; `clearBiometrics` also turns the App Lock preference off.
   */
  scheduleOnboardingForNextLaunch: (clearBiometrics?: boolean) => Promise<OnboardingPreferences | null>;
  /** Re-read the stored record, e.g. when a sign-out should apply a pending dev reset. */
  reloadPreferences: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Authenticate, then persist the preference. A cancelled prompt returns a failure result without changing anything. */
  enableBiometrics: (promptMessage: string, cancelLabel: string) => Promise<BiometricAuthResult>;
  disableBiometrics: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function parse(raw: string | null): OnboardingPreferences {
  if (!raw) return defaults;
  try {
    const value = JSON.parse(raw) as { completedAt?: unknown; biometricsEnabled?: unknown; forceOnboarding?: unknown };
    return {
      completedAt: typeof value.completedAt === 'string' && value.completedAt ? value.completedAt : null,
      biometricsEnabled: value.biometricsEnabled === true,
      forceOnboarding: value.forceOnboarding === true,
    };
  } catch {
    return defaults;
  }
}

export async function readStoredOnboardingPreferences(): Promise<OnboardingPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}

async function loadPreferences(): Promise<OnboardingPreferences> {
  try {
    return (await readStoredOnboardingPreferences()) ?? defaults;
  } catch {
    return defaults;
  }
}

const emptyStatus: BiometricsStatus = { module: false, hardware: false, enrolled: false, available: false };

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { authToken, theme, design, locale, setTheme, setDesign, setLocale } = useApp();
  const [preferences, setPreferences] = useState<OnboardingPreferences>(defaults);
  const [pending, setPending] = useState(true);
  const [biometrics, setBiometrics] = useState<BiometricsStatus>(emptyStatus);
  const [justEnabled, setJustEnabled] = useState(false);
  const [checkedToken, setCheckedToken] = useState<string | null>(null);
  const [syncNonce, setSyncNonce] = useState(0);
  const preferencesRef = useRef(preferences);
  // Set as soon as the user changes a preference, so a slow initial load cannot
  // overwrite the new value with the pre-change snapshot.
  const preferencesTouched = useRef(false);
  const biometricsTouched = useRef(false);
  const lastVerifiedAt = useRef(0);
  const appRef = useRef({ theme, design, locale, setTheme, setDesign, setLocale });

  useEffect(() => {
    appRef.current = { theme, design, locale, setTheme, setDesign, setLocale };
  }, [theme, design, locale, setTheme, setDesign, setLocale]);

  const persist = useCallback(async (next: OnboardingPreferences) => {
    preferencesTouched.current = true;
    preferencesRef.current = next;
    setPreferences(next);
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      // The in-memory preference still applies for this launch. Keep the failure
      // visible in development so "onboarding opens again" has a log entry.
      if (__DEV__) console.warn('[onboarding] could not save preferences', error);
    }
  }, []);

  // Pull the phone's onboarding decision and display choices before Onboarding's
  // `ready` flips, so the web build never flashes the first-run flow. The phone
  // remains local-first for its own appearance; only the web adopts the remote
  // values.
  useEffect(() => {
    if (!authToken) return;
    let active = true;
    (async () => {
      const remote = await fetchServerPreferences(authToken);
      if (!active) return;
      const current = preferencesRef.current;
      if (remote?.onboardingCompletedAt && !current.completedAt) {
        await persist({ ...current, completedAt: remote.onboardingCompletedAt, forceOnboarding: false });
      } else if (Platform.OS === 'web' && !current.completedAt) {
        // A web session can only be approved by a phone that has already been
        // through onboarding. Record that even if an older phone had no prefs.
        await persist({ ...current, completedAt: new Date().toISOString(), forceOnboarding: false });
      }
      if (Platform.OS === 'web' && remote) {
        const app = appRef.current;
        if (remote.theme) app.setTheme(remote.theme);
        if (remote.design) app.setDesign(remote.design);
        if (remote.locale) app.setLocale(remote.locale);
      }
      if (active) setCheckedToken(authToken);
    })().catch(() => {
      if (active) setCheckedToken(authToken);
    });
    return () => {
      active = false;
    };
  }, [authToken, persist]);

  // Push the local completion and appearance after the remote check settled.
  useEffect(() => {
    if (!authToken) return;
    if (Platform.OS === 'web' && checkedToken !== authToken) return;
    const payload = {
      onboardingCompletedAt: preferences.completedAt,
      theme,
      design,
      locale,
    };
    void saveServerPreferences(authToken, payload);
  }, [authToken, checkedToken, preferences.completedAt, theme, design, locale, syncNonce]);

  useEffect(() => {
    let active = true;
    Promise.all([loadPreferences(), biometricsStatus()])
      .then(([stored, status]) => {
        if (!active) return;
        if (!preferencesTouched.current) {
          preferencesRef.current = stored;
          setPreferences(stored);
        }
        if (!biometricsTouched.current) setBiometrics(status);
        if (__DEV__) {
          console.info('[onboarding]', {
            ...status,
            completedAt: preferencesTouched.current ? preferencesRef.current.completedAt : stored.completedAt,
            biometricsEnabled: preferencesTouched.current ? preferencesRef.current.biometricsEnabled : stored.biometricsEnabled,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshBiometrics = useCallback(async () => {
    try {
      const next = await biometricsStatus();
      // Some platforms report a stale "not enrolled" state immediately after
      // the system prompt closes. A successful prompt is stronger evidence
      // than that probe, so do not let it undo the enable the user just saw.
      if (
        !next.available &&
        next.hardware &&
        preferencesRef.current.biometricsEnabled &&
        Date.now() - lastVerifiedAt.current < 15_000
      ) {
        if (__DEV__) console.info('[onboarding] ignoring stale probe after prompt', next);
        return;
      }
      setBiometrics(next);
      if (__DEV__) console.info('[onboarding] refreshed', next);
    } catch {
      // Keep the previous status when the probe itself fails.
    }
  }, []);

  // Re-check when the user returns from system settings, so enrolling or
  // removing biometrics is picked up. The probe above ignores the stale
  // post-prompt result for a short window.
  useAppStateChange((state) => {
    if (state === 'background') setJustEnabled(false);
    if (state === 'active') {
      void refreshBiometrics();
      // Retry a preference push that may have failed while the server or
      // network was unavailable.
      setSyncNonce((value) => value + 1);
    }
  });

  const scheduleOnboardingForNextLaunch = useCallback(async (clearBiometrics = false) => {
    const next: OnboardingPreferences = {
      completedAt: null,
      biometricsEnabled: clearBiometrics ? false : preferencesRef.current.biometricsEnabled,
      forceOnboarding: true,
    };
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
      if (__DEV__) console.info('[onboarding] scheduled for next launch', next);
      return next;
    } catch (error) {
      if (__DEV__) console.warn('[onboarding] could not schedule onboarding', error);
      return null;
    }
  }, []);

  const reloadPreferences = useCallback(async () => {
    const stored = await loadPreferences();
    preferencesTouched.current = false;
    preferencesRef.current = stored;
    setPreferences(stored);
    if (__DEV__) console.info('[onboarding] reloaded preferences', stored);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (preferencesRef.current.completedAt) return;
    await persist({ ...preferencesRef.current, completedAt: new Date().toISOString(), forceOnboarding: false });
  }, [persist]);

  const enableBiometrics = useCallback(
    async (promptMessage: string, cancelLabel: string) => {
      const result = await authenticateWithBiometrics(promptMessage, cancelLabel, { requireBiometrics: true });
      if (!result.success) return result;
      await persist({ ...preferencesRef.current, biometricsEnabled: true });
      // A successful prompt proves the sensor works even if a platform probe
      // is stale or reports the wrong enrollment state.
      biometricsTouched.current = true;
      lastVerifiedAt.current = Date.now();
      setBiometrics((current) => ({ ...current, hardware: true, enrolled: true, available: true }));
      setJustEnabled(true);
      return result;
    },
    [persist],
  );

  const disableBiometrics = useCallback(async () => {
    setJustEnabled(false);
    await persist({ ...preferencesRef.current, biometricsEnabled: false });
  }, [persist]);

  return (
    <OnboardingContext.Provider
      value={{
        ready:
          !pending &&
          (Platform.OS !== 'web' ||
            !authToken ||
            Boolean(preferences.completedAt) ||
            checkedToken === authToken),
        completed: Boolean(preferences.completedAt),
        completedAt: preferences.completedAt,
        forceOnboarding: preferences.forceOnboarding,
        biometricsEnabled: preferences.biometricsEnabled,
        biometricsHardware: biometrics.hardware,
        biometricsEnrolled: biometrics.enrolled,
        biometricsAvailable: biometrics.available,
        biometricsJustEnabled: justEnabled,
        refreshBiometrics,
        scheduleOnboardingForNextLaunch,
        reloadPreferences,
        completeOnboarding,
        enableBiometrics,
        disableBiometrics,
      }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return value;
}
