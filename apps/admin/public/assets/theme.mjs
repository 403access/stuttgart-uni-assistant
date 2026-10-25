/** Light/dark theme persistence and toggle. */

import { icon } from './icons.mjs';
import { $ } from './dom.mjs';

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('ua-admin-theme', theme); } catch { /* private mode */ }
  const label = $('theme-label');
  if (label) label.textContent = theme === 'dark' ? 'Helles Design' : 'Dunkles Design';
  const holder = $('theme-toggle');
  if (holder) {
    const existing = holder.querySelector('.icon');
    const replacement = icon(theme === 'dark' ? 'sun' : 'moon');
    if (existing) existing.replaceWith(replacement);
  }
}

export function initTheme() {
  let stored = null;
  try { stored = localStorage.getItem('ua-admin-theme'); } catch { /* private mode */ }
  const theme = stored === 'dark' || stored === 'light' ? stored : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
  $('theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

