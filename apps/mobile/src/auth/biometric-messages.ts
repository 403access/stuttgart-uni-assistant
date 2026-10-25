import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

/** A cancelled prompt is a decision, not a hardware failure. */
export function isBiometricCancel(code?: string): boolean {
  return code === 'user_cancel' || code === 'app_cancel' || code === 'system_cancel' || code === 'user_fallback';
}

/** User-facing explanation for a failed biometric prompt. */
export function biometricMessage(locale: Locale, code?: string): string {
  switch (code) {
    case 'not_available':
    case 'missing_usage_description':
      return tx(locale, 'biometrie.not_available');
    case 'not_enrolled':
      return tx(locale, 'biometrie.not_enrolled');
    case 'lockout':
      return tx(locale, 'biometrie.lockout');
    case 'passcode_not_set':
      return tx(locale, 'biometrie.passcode');
    case 'authentication_failed':
      return tx(locale, 'biometrie.failed');
    default:
      return tx(locale, 'biometrie.unknown');
  }
}
