import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { BrowserHarvest } from '@/src/auth/campus-harvest';

/**
 * Device vault for the opt-in C@MPUS autologin credential. This is the only
 * place in the project that keeps a university password, and it is deleted on
 * sign out. The automated sign-in runs in the WebView on this device and the
 * assistant server sees only the harvested session; the same st-account and
 * password are then reused to connect UniMail, whose IMAP proof does run on
 * the server (see `use-login-flow.ts`).
 *
 * Backing store is `expo-secure-store`: the iOS keychain (hardware-backed where
 * the device has a Secure Enclave) and Android `SharedPreferences` encrypted
 * with the Android Keystore. With biometrics enabled the entry additionally
 * requires user authentication to read (iOS stores it with `biometryCurrentSet`
 * and Android with `setUserAuthenticationRequired`). Without biometrics the
 * entry is still OS-encrypted, bound to this device and deleted when the device
 * passcode is removed, but it is deliberately *not* gated by the Secure Enclave's
 * user-presence check — that is the acceptable fallback for "remember login",
 * never plaintext in AsyncStorage.
 */

const KEY = 'campus.autologin.v1';

/**
 * Non-secret marker so the login screen can offer the vaulted login without
 * raising a biometric prompt just to find out that nothing is stored. Holds
 * only the account id and whether the entry is biometric-gated; the account id
 * is already in plain storage in the session record.
 */
const HINT_KEY = 'campus.autologin.hint.v1';

/**
 * The last C@MPUS session the server accepted, kept so the app can re-establish
 * its app session on resume without asking for the password again. It holds the
 * portal cookies and storage keys the server already validated — no password.
 * Cleared on sign-out and when the server rejects it.
 */
const HARVEST_KEY = 'campus.harvest.v1';

export interface StoredLogin {
  account: string;
  password: string;
  /** The entry is readable only after a successful biometric check. */
  biometrics: boolean;
  savedAt: string;
}

export interface SaveLoginInput {
  account: string;
  password: string;
  biometrics: boolean;
}

type SecureStoreModule = typeof import('expo-secure-store');

/** Native module on device, `null` on web where there is no keystore. */
async function secureStore(): Promise<SecureStoreModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    const module = await import('expo-secure-store');
    return (await module.isAvailableAsync()) ? module : null;
  } catch {
    return null;
  }
}

/**
 * Whether the device can protect the entry with biometrics. `requireAuthentication`
 * needs an enrolled, sufficiently strong biometric; a PIN alone is not enough.
 */
export async function biometricUnlockAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const module = await import('expo-secure-store');
    return module.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}

function optionsFor(module: SecureStoreModule, biometrics: boolean, prompt: string) {
  if (!biometrics) {
    // No biometric gate: a normal keychain/Keystore entry protected by the
    // device passcode. Still encrypted at rest and this-device-only, so the
    // fallback is weaker than Face ID but far better than AsyncStorage.
    return { keychainAccessible: module.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY };
  }
  return {
    keychainAccessible: module.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    requireAuthentication: true,
    authenticationPrompt: prompt,
  };
}

export async function saveLogin(input: SaveLoginInput, prompt: string): Promise<boolean> {
  const module = await secureStore();
  if (!module) return false;
  const payload: StoredLogin = {
    account: input.account.trim(),
    password: input.password,
    biometrics: input.biometrics,
    savedAt: new Date().toISOString(),
  };
  await module.setItemAsync(KEY, JSON.stringify(payload), optionsFor(module, input.biometrics, prompt));
  await AsyncStorage.setItem(HINT_KEY, JSON.stringify({ account: payload.account, biometrics: payload.biometrics })).catch(
    () => undefined,
  );
  return true;
}

/**
 * Read the vault. `biometrics` comes from the non-secret hint: only a
 * biometric-gated entry is read with `requireAuthentication`, so an entry
 * without the gate never raises a prompt it does not need. A rejection for a
 * user cancel, a lockout, or an invalidated entry means "no stored login".
 */
export async function readLogin(prompt: string, biometrics: boolean): Promise<StoredLogin | null> {
  const module = await secureStore();
  if (!module) return null;
  let raw: string | null = null;
  try {
    raw = await module.getItemAsync(KEY, biometrics ? { requireAuthentication: true, authenticationPrompt: prompt } : {});
  } catch {
    return null;
  }
  if (!raw) return null;
  const parsed = parseLogin(raw);
  if (parsed) return parsed;
  await module.deleteItemAsync(KEY).catch(() => undefined);
  return null;
}

function parseLogin(raw: string): StoredLogin | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredLogin>;
    if (typeof parsed.account !== 'string' || typeof parsed.password !== 'string' || !parsed.account || !parsed.password) return null;
    return {
      account: parsed.account,
      password: parsed.password,
      biometrics: Boolean(parsed.biometrics),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

export async function clearLogin(): Promise<void> {
  const module = await secureStore();
  await AsyncStorage.removeItem(HINT_KEY).catch(() => undefined);
  if (!module) return;
  await module.deleteItemAsync(KEY).catch(() => undefined);
}

/** Remember the portal session that `/v1/campus/credentials` just validated. */
export async function saveCampusHarvest(harvest: BrowserHarvest): Promise<void> {
  const storage = harvest.storage ?? {};
  if (!harvest.cookies && !Object.keys(storage).length) return;
  const raw = JSON.stringify({ cookies: harvest.cookies.slice(0, 8000), storage });
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(HARVEST_KEY, raw).catch(() => undefined);
    return;
  }
  const module = await secureStore();
  if (!module) return;
  // Deliberately not biometric-gated: the resume path runs without a prompt.
  await module
    .setItemAsync(HARVEST_KEY, raw, { keychainAccessible: module.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY })
    .catch(() => undefined);
}

/** The last accepted portal session, or null when there is none. */
export async function readCampusHarvest(): Promise<BrowserHarvest | null> {
  let raw: string | null = null;
  if (Platform.OS === 'web') {
    raw = await AsyncStorage.getItem(HARVEST_KEY).catch(() => null);
  } else {
    const module = await secureStore();
    if (!module) return null;
    try {
      raw = await module.getItemAsync(HARVEST_KEY);
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { cookies?: unknown; storage?: unknown };
    if (typeof parsed.cookies !== 'string') return null;
    const storage: Record<string, string> = {};
    if (parsed.storage && typeof parsed.storage === 'object') {
      for (const [key, value] of Object.entries(parsed.storage)) {
        if (typeof value === 'string') storage[key] = value;
      }
    }
    return { cookies: parsed.cookies, storage };
  } catch {
    return null;
  }
}

export async function clearCampusHarvest(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(HARVEST_KEY).catch(() => undefined);
    return;
  }
  const module = await secureStore();
  if (!module) return;
  await module.deleteItemAsync(HARVEST_KEY).catch(() => undefined);
}

/** Account id and biometric flag of a vaulted login, or `null`. Never reads the secret. */
export async function storedLoginHint(): Promise<{ account: string; biometrics: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { account?: unknown; biometrics?: unknown };
    if (typeof parsed.account !== 'string' || !parsed.account) return null;
    return { account: parsed.account, biometrics: Boolean(parsed.biometrics) };
  } catch {
    return null;
  }
}
