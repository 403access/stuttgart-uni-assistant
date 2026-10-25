import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  breakable,
  formatBytes,
  formatDate,
  formatDay,
  formatGrade,
  formatTime,
  formatTimestamp,
  hay,
  localDay,
  monthShort,
  shiftDay,
  weekdayOf,
} from '../index.js';

test('dates follow German and English conventions', () => {
  assert.equal(formatDate('2026-10-19', 'de'), '19.10.2026');
  assert.equal(formatDate('2026-10-19', 'en'), '19 Oct 2026');
  assert.equal(formatDay('2026-10-19T14:00', 'de'), '19. Okt 2026');
  assert.equal(formatDay('2026-10-19T14:00', 'en'), '19 Oct 2026');
  assert.equal(formatTime('2026-10-19T14:05'), '14:05');
  assert.equal(monthShort('2026-10-19', 'de'), 'Okt');
  assert.equal(weekdayOf('2026-10-19', 'de'), 'Montag');
  assert.equal(shiftDay('2026-10-19', 1), '2026-10-20');
});

test('a timestamp uses the local day and time', () => {
  const value = formatTimestamp('2026-10-19T14:05:00', 'en');
  assert.match(value, /^19 Oct 2026, 14:05$/);
});

test('grades and bytes use the locale decimal separator', () => {
  assert.equal(formatGrade(1.9, 'de'), '1,9');
  assert.equal(formatGrade(1.9, 'en'), '1.9');
  assert.equal(formatBytes(820 * 1024, 'de'), '820 KB');
  assert.equal(formatBytes(1.4 * 1024 * 1024, 'de'), '1,4 MB');
  assert.equal(formatBytes(1.4 * 1024 * 1024, 'en'), '1.4 MB');
});

test('search folding and wrapping helpers are stable', () => {
  assert.equal(hay('Prüfung'), 'prufung');
  assert.equal(localDay(new Date(2026, 9, 19)), '2026-10-19');
  assert.match(breakable('a/b'), /a\/\u200Bb/);
});
