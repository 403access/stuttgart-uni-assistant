import { Platform, Share } from 'react-native';

import { showToast } from '@/src/components/toast';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/**
 * Share sheet on native and in supporting browsers; on the web without
 * `navigator.share` the text lands in the clipboard instead.
 */
export async function shareText(message: string, title: string, locale: Locale): Promise<void> {
  try {
    await Share.share({ message, title });
  } catch (error) {
    if ((error as { name?: string } | null)?.name === 'AbortError') return;
    const clipboard = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.clipboard : null;
    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(message);
        showToast({ title: tx(locale, 'profil.kopiert'), tone: 'success' });
        return;
      } catch {
        // Fall through to the error toast.
      }
    }
    showToast({ title: tx(locale, 'profil.kopieren_fehler'), tone: 'error' });
  }
}
