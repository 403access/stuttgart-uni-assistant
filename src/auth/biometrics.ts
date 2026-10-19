import { Platform } from 'react-native';

/**
 * Device biometrics used to unlock the app. Wrapped here so every caller shares
 * the same platform guard: `expo-local-authentication` exists only on iOS and
 * Android, and the web build must not load the native module at all.
 */

type LocalAuthenticationModule = typeof import('expo-local-authentication');

async function localAuthentication(): Promise<LocalAuthenticationModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-local-authentication');
  } catch {
    return null;
  }
}

export interface BiometricsStatus {
  /** The native module was found in this binary. */
  module: boolean;
  /** The device has a fingerprint/face sensor. */
  hardware: boolean;
  /** A fingerprint or face is enrolled. */
  enrolled: boolean;
  /** Both of the above, i.e. the onboarding page has something to ask for. */
  available: boolean;
}

/** Detailed check used by the onboarding provider's development log. */
export async function biometricsStatus(): Promise<BiometricsStatus> {
  const module = await localAuthentication();
  if (!module) return { module: false, hardware: false, enrolled: false, available: false };
  try {
    const [reportedHardware, reportedEnrolled, types, level] = await Promise.all([
      module.hasHardwareAsync(),
      module.isEnrolledAsync(),
      module.supportedAuthenticationTypesAsync(),
      module.getEnrolledLevelAsync(),
    ]);
    // Different platforms/versions disagree slightly on these probes (for
    // example a simulator or a device with no enrollment yet). Treat either
    // signal as positive so a working sensor is not reported as unavailable.
    const hardware = reportedHardware || types.length > 0;
    const enrolled = reportedEnrolled || level >= module.SecurityLevel.BIOMETRIC_WEAK;
    return { module: true, hardware, enrolled, available: hardware && enrolled };
  } catch {
    return { module: true, hardware: false, enrolled: false, available: false };
  }
}

/**
 * Whether this device has a biometric sensor with an enrolled fingerprint or
 * face. A device passcode alone does not count: the onboarding page only asks
 * when there is an actual biometric to enable.
 */
export async function biometricsAvailable(): Promise<boolean> {
  return (await biometricsStatus()).available;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

/**
 * Show the system prompt. `requireBiometrics` maps to `disableDeviceFallback`
 * and is used when enabling the feature: the device passcode is not proof that
 * Face ID or a fingerprint works. Unlocking the app leaves it off so the OS can
 * use its normal fallback when biometrics fail.
 */
export async function authenticateWithBiometrics(
  promptMessage: string,
  cancelLabel: string,
  options: { requireBiometrics?: boolean } = {},
): Promise<BiometricAuthResult> {
  const module = await localAuthentication();
  if (!module) return { success: false, error: 'not_available' };
  try {
    const result = await module.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: options.requireBiometrics === true,
    });
    if (__DEV__) {
      console.info('[biometrics] auth', {
        requireBiometrics: options.requireBiometrics === true,
        success: result.success,
        error: result.success ? undefined : result.error,
        warning: result.success ? undefined : result.warning,
      });
    }
    if (result.success) return { success: true };
    return { success: false, error: result.error, warning: result.warning };
  } catch (error) {
    if (__DEV__) console.warn('[biometrics] auth failed', error);
    return { success: false, error: 'unknown' };
  }
}
