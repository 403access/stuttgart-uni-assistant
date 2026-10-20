/** Switch between setup, login, and the signed-in shell. */

import { $ } from './dom.mjs';

export function showSetup() { $('setup').hidden = false; $('login').hidden = true; $('app').hidden = true; $('skip-link').hidden = true; }
export function showLogin() {
  $('setup').hidden = true;
  $('login').hidden = false;
  $('app').hidden = true;
  $('skip-link').hidden = true;
  setTimeout(() => $('login-token')?.focus(), 50);
}
export function showApp() { $('setup').hidden = true; $('login').hidden = true; $('app').hidden = false; $('skip-link').hidden = false; }

export function setPage(title, subtitle) {
  $('page-title').textContent = title;
  $('page-subtitle').textContent = subtitle || '';
  document.title = title + ' · Verwaltung';
}

export function navFor(name) {
  if (name === 'user') return 'users';
  return name;
}

export function setActiveNav(name) {
  for (const item of document.querySelectorAll('[data-nav]')) {
    const active = item.dataset.nav === navFor(name);
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
}

export function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebar-backdrop').classList.remove('show');
}

