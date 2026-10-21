/** Fetch wrapper, error codes, and user-facing error text. */

import { showLogin, showSetup } from './auth-ui.mjs';

export class AdminError extends Error {
  constructor(code, status, detail) {
    super(code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export async function api(path, options) {
  const opts = options || {};
  const init = {
    method: opts.method || 'GET',
    credentials: 'same-origin',
    headers: {},
  };
  if (opts.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  let response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new AdminError('network', 0);
  }
  let payload = {};
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }
  if (response.status === 401) {
    showLogin();
    throw new AdminError('unauthorized', 401);
  }
  if (response.status === 503 && payload.error === 'admin_unconfigured') {
    showSetup();
    throw new AdminError('admin_unconfigured', 503);
  }
  if (!response.ok) {
    throw new AdminError(payload.error || ('http_' + response.status), response.status, payload.detail);
  }
  return payload;
}

const ERROR_TEXT = {
  unauthorized: 'Die Sitzung ist abgelaufen. Bitte erneut anmelden.',
  admin_unconfigured: 'Das Dashboard ist nicht konfiguriert.',
  network: 'Der Server ist nicht erreichbar.',
  account_missing: 'Die Kennung darf nicht leer sein.',
  account_invalid: 'Die Kennung ist zu lang.',
  account_taken: 'Diese Kennung ist bereits einem anderen Konto zugeordnet.',
  bad_mode: 'Unbekannter Anmeldemodus.',
  bad_platform: 'Unbekannte Plattform.',
  bad_user_id: 'Ungültige Konto-ID.',
  bad_action: 'Ungültige Aktion.',
  unknown_user: 'Das Konto existiert nicht mehr.',
  unknown_session: 'Die Sitzung existiert nicht mehr oder wurde bereits widerrufen.',
  unknown_job: 'Der Synchronisations-Job existiert nicht mehr.',
  bad_json: 'Die Anfrage konnte nicht gelesen werden.',
  bad_study_id: 'Ungültige Studiengangs-ID.',
  campus_credentials_missing: 'Für dieses Konto ist gerade kein C@MPUS-Zugang im Speicher. Das Konto muss sich zuerst neu mit C@MPUS verbinden.',
  news_title_missing: 'Die Meldung braucht einen deutschen Titel.',
  news_body_missing: 'Die Meldung braucht einen deutschen Text.',
  bad_news_source: 'Unbekannte Quelle.',
  bad_news_date: 'Ungültiges Datum.',
  bad_news_state: 'Ungültiger Veröffentlichungsstatus.',
  unknown_news: 'Die Meldung existiert nicht mehr.',
};

export function errorText(error) {
  if (!error) return 'Unbekannter Fehler.';
  if (error.code && ERROR_TEXT[error.code]) return ERROR_TEXT[error.code];
  if (error.detail) return error.detail;
  if (error.message && error.message !== 'undefined') return error.message;
  return 'Aktion fehlgeschlagen.';
}

