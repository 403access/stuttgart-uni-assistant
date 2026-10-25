import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

import { IliasError } from './api';

/** One place for the server's error codes → user-facing ILIAS messages. */
export function iliasErrorMessage(caught: unknown, locale: Locale): string {
  const code = caught instanceof IliasError ? caught.message : caught instanceof Error ? caught.message : 'ilias_failed';
  if (code === 'server_unreachable') return tx(locale, 'tabsIlias.server');
  if (code === 'ilias_login_rejected' || code === 'ilias_rejected') return tx(locale, 'tabsIlias.abgelehnt');
  if (code === 'ilias_session_expired' || code === 'ilias_credentials_missing') return tx(locale, 'tabsIlias.abgelaufen');
  if (code === 'ilias_not_configured') return tx(locale, 'tabsIlias.nicht_konfiguriert');
  return tx(locale, 'tabsIlias.fehler', [code]);
}

/** The same mapping for a content or download request. */
export function iliasContentErrorMessage(caught: unknown, locale: Locale): string {
  const code = caught instanceof IliasError ? caught.message : caught instanceof Error ? caught.message : 'ilias_failed';
  if (code === 'server_unreachable') return tx(locale, 'tabsIlias.server');
  if (code === 'ilias_session_expired' || code === 'ilias_credentials_missing') return tx(locale, 'tabsIlias.abgelaufen');
  if (code === 'ilias_ref_id_invalid') return tx(locale, 'tabsIlias.inhalte_leer');
  return tx(locale, 'tabsIlias.inhalte_fehler', [code]);
}
