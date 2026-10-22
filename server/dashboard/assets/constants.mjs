/** Labels, platform ids, page sizes, sort options, and audit names. */

export const MODES = { campus: 'C@MPUS', oidc: 'SIAM', demo: 'Demo', local: 'Lokal' };
export const PLATFORMS = ['campus', 'ilias', 'sdg', 'siam', 'mail'];
export const PLATFORM_NAMES = { campus: 'C@MPUS', ilias: 'ILIAS', sdg: 'SDG Campus', siam: 'SIAM', mail: 'UniMail' };
export const PLATFORM_ICONS = { campus: 'globe', ilias: 'grid', sdg: 'list', siam: 'key', mail: 'mail' };
export const SERVICE_NAMES = {
  assistant: 'Assistent',
  campus: 'C@MPUS',
  ilias: 'ILIAS',
  mail: 'UniMail',
  oidc: 'SIAM / OIDC',
  sync: 'Synchronisation',
  auth: 'Anmeldung',
  admin: 'Verwaltung',
  http: 'HTTP',
  server: 'Server',
};
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
export const LOG_LEVEL_NAMES = { debug: 'Debug', info: 'Info', warn: 'Warnung', error: 'Fehler' };
export const LOG_LEVEL_TONES = { debug: '', info: 'blue', warn: 'warn', error: 'danger' };
export const PAGE_SIZES = [25, 50, 100, 200];
export const SORTS = [
  ['recent', 'Zuletzt aktiv'],
  ['created', 'Neueste Konten'],
  ['name', 'Name A–Z'],
  ['account', 'Kennung A–Z'],
  ['sessions', 'Meiste Sitzungen'],
  ['data', 'Meiste Daten'],
];
export const AUDIT_LABELS = {
  'admin.login': 'Operator angemeldet',
  'admin.logout': 'Operator abgemeldet',
  'user.update': 'Kontodaten geändert',
  'user.create': 'Konto angelegt',
  'user.delete': 'Konto gelöscht',
  'session.revoke': 'Sitzung widerrufen',
  'session.revoke_all': 'Alle Sitzungen widerrufen',
  'device.revoke': 'Web-Gerät widerrufen',
  'platform.link': 'Plattform verknüpft',
  'platform.unlink': 'Plattform entfernt',
  'platform.touch': 'Plattform-Sync markiert',
  'campus.disconnect': 'C@MPUS getrennt',
  'campus.source': 'C@MPUS-Quelle gesetzt',
  'ilias.disconnect': 'ILIAS getrennt',
  'portal.clear_study': 'Studiengang-Daten gelöscht',
  'portal.clear_all': 'Portal-Daten gelöscht',
  'calendar.clear': 'Kalender geleert',
  'calls.clear': 'Aufrufprotokoll geleert',
  'sync.start': 'Synchronisation gestartet',
  'sync.cancel': 'Synchronisation abgebrochen',
  'mail.disconnect': 'UniMail getrennt',
  'logs.clear': 'Logs gelöscht',
  'news.create': 'Meldung angelegt',
  'news.update': 'Meldung geändert',
  'news.delete': 'Meldung gelöscht',
};
export const DANGEROUS_ACTIONS = new Set(['user.delete', 'portal.clear_all', 'portal.clear_study', 'calendar.clear', 'calls.clear', 'session.revoke_all', 'device.revoke', 'campus.disconnect', 'ilias.disconnect', 'mail.disconnect', 'news.delete', 'logs.clear']);

