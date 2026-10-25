/** Locale-aware formatting shared by the app, admin, dist service, and tools. */

export const shortMonths = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const weekdays = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export function pick(value, locale) {
  return value[locale];
}

export function formatDate(iso, locale) {
  const [year, month, day] = String(iso ?? '').split('-');
  if (!year || !month || !day) return iso;
  if (locale === 'de') return `${day}.${month}.${year}`;
  return `${Number(day)} ${shortMonths.en[Number(month) - 1]} ${year}`;
}

export function formatDay(value, locale) {
  const date = String(value ?? '').slice(0, 10);
  const [year, month, day] = date.split('-');
  const monthIndex = Number(month) - 1;
  if (!year || !month || !day || monthIndex < 0 || monthIndex > 11) return value;
  if (locale === 'de') return `${Number(day)}. ${shortMonths.de[monthIndex]} ${year}`;
  return `${Number(day)} ${shortMonths.en[monthIndex]} ${year}`;
}

export function formatTime(value) {
  const match = String(value ?? '').match(/T(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatTimestamp(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${formatDay(localDay(date), locale)}, ${time}`;
}

export function formatGrade(value, locale) {
  const text = Number(value).toFixed(1);
  return locale === 'de' ? text.replace('.', ',') : text;
}

export function monthShort(iso, locale) {
  return shortMonths[locale][Number(String(iso ?? '').slice(5, 7)) - 1] ?? '';
}

export function weekdayOf(iso, locale) {
  return weekdays[locale][new Date(`${iso}T12:00:00`).getDay()] ?? '';
}

export function shiftDay(iso, delta) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return localDay(date);
}

export function hay(value) {
  return String(value ?? '')
    .toLowerCase()
    .replaceAll('ä', 'a')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ß', 'ss');
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function breakable(value) {
  return String(value ?? '').replace(/([/?&=_\-])/g, '$1\u200B');
}

/** `820 KB`, `1,4 MB` — compact enough for an attachment row. */
export function formatBytes(size, locale) {
  if (!Number.isFinite(size) || size <= 0) return '0 KB';
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  const value = (size / (1024 * 1024)).toFixed(1);
  return `${locale === 'de' ? value.replace('.', ',') : value} MB`;
}
