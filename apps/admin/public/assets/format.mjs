/** Date, number, and label formatting for the German console. */

import { MODES, PLATFORM_NAMES } from './constants.mjs';

export function date(value, opts) {
  if (!value) return '–';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short', ...(opts || {}) });
}

export function dateOnly(value) {
  if (!value) return '–';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('de-DE', { dateStyle: 'medium' });
}

export function relative(value) {
  if (!value) return 'nie';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const diff = parsed.getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 45 * 1000) return 'gerade eben';
  const units = [['year', 31536000000], ['month', 2592000000], ['week', 604800000], ['day', 86400000], ['hour', 3600000], ['minute', 60000]];
  const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'gerade eben';
}

export function number(value) {
  return new Intl.NumberFormat('de-DE').format(Number(value) || 0);
}

export function bytes(value) {
  const size = Number(value) || 0;
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1).replace('.', ',') + ' KB';
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
  return (size / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',') + ' GB';
}

export function uptime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return days + ' T ' + hours + ' h';
  if (hours) return hours + ' h ' + minutes + ' min';
  return minutes + ' min';
}

export function icsDate(value) {
  if (!value) return '–';
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(String(value));
  if (!match) return String(value);
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('de-DE', {
    dateStyle: 'medium',
    ...(match[4] ? { timeStyle: 'short' } : {}),
    timeZone: 'Europe/Berlin',
  });
}

export function duration(ms) {
  const value = Number(ms) || 0;
  if (value < 1000) return value + ' ms';
  return (value / 1000).toFixed(value < 10000 ? 1 : 0).replace('.', ',') + ' s';
}

export function modeName(mode) { return MODES[mode] || mode || '–'; }
export function platformName(id) { return PLATFORM_NAMES[id] || id || '–'; }

export function detailText(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(detailText).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => key + ': ' + detailText(item))
      .join(' · ');
  }
  return String(value);
}

