import { showToast } from '@/src/components/toast';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

export interface FetchAlert {
  title: string;
  code: string;
  detail?: string;
  onRetry?: () => void;
}

/**
 * Error toast for a failed fetch, with an optional retry action.
 * Complements the inline error text, which stays on screen for reference.
 * Only used for user-initiated loads — background and auto loads report
 * inline so they never pop up unasked.
 */
export function showFetchAlert(locale: Locale, alert: FetchAlert): void {
  showToast({
    tone: 'error',
    title: alert.title,
    message: [alert.code, alert.detail].filter(Boolean).join('\n'),
    actionLabel: alert.onRetry ? tx(locale, 'fetchAlert.erneut') : undefined,
    onAction: alert.onRetry,
  });
}
