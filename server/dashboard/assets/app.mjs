/** Dashboard entry point: hash router, theme, login, and boot. */

import { api, errorText } from './api.mjs';
import { setActiveNav, closeSidebar, showApp, showLogin, showSetup } from './auth-ui.mjs';
import { $, h } from './dom.mjs';
import { number } from './format.mjs';
import { icon, paintIcons } from './icons.mjs';
import { renderAuditPage } from '../pages/audit.mjs';
import { renderComponentsPage } from '../pages/components.mjs';
import { renderDevicePage } from '../pages/device.mjs';
import { renderDevicesPage } from '../pages/devices.mjs';
import { renderIliasPage } from '../pages/ilias.mjs';
import { renderLogsPage, stopLogsAutoRefresh } from '../pages/logs.mjs';
import { renderNewsPage, submitNewsForm } from '../pages/news.mjs';
import { renderQuizPage } from '../pages/quiz/index.mjs';
import { renderOverview } from '../pages/overview.mjs';
import { renderSystemPage } from '../pages/system.mjs';
import { renderUserPage } from '../pages/user.mjs';
import { renderUsersPage, submitCreateUser } from '../pages/users.mjs';
import { parseHash } from './routing.mjs';
import { refresh, state } from './runtime.mjs';
import { initTheme } from './theme.mjs';
import { emptyState, toast } from './ui.mjs';

async function renderRoute() {
  const route = parseHash();
  if (route.name !== 'logs') stopLogsAutoRefresh();
  if (route.name === 'overview' && state.route?.name && state.route.name !== 'overview') state.overview = null;
  state.route = route;
  setActiveNav(route.name);
  closeSidebar();
  const view = $('view');
  view.setAttribute('aria-busy', 'true');
  try {
    if (route.name === 'overview') await renderOverview();
    else if (route.name === 'news') await renderNewsPage(route);
    else if (route.name === 'quiz' || route.name === 'quiz-topic' || route.name === 'quiz-attempts' || route.name === 'quiz-sessions') await renderQuizPage(route);
    else if (route.name === 'users') await renderUsersPage(route);
    else if (route.name === 'user') await renderUserPage(route.id, route.tab);
    else if (route.name === 'ilias') await renderIliasPage();
    else if (route.name === 'devices') await renderDevicesPage(route);
    else if (route.name === 'device') await renderDevicePage(route.id);
    else if (route.name === 'audit') await renderAuditPage(route);
    else if (route.name === 'logs') await renderLogsPage(route);
    else if (route.name === 'system') await renderSystemPage();
    else if (route.name === 'components') await renderComponentsPage(route);
    else await renderOverview();
  } catch (error) {
    if (error.code === 'unauthorized' || error.code === 'admin_unconfigured') return;
    view.replaceChildren(
      h('div', { className: 'card section-card' },
        emptyState('alert', 'Ansicht konnte nicht geladen werden', errorText(error), h('button', {
          className: 'btn secondary', type: 'button', onClick: () => renderRoute(),
        }, icon('refresh'), 'Erneut versuchen')),
      ),
    );
    toast(errorText(error), 'error');
  } finally {
    view.removeAttribute('aria-busy');
    paintIcons(document);
  }
}
async function boot() {
  try {
    const stats = await api('/v1/admin/overview');
    state.overview = stats;
    const badge = $('nav-users-count');
    if (badge) { badge.textContent = number(stats.users); badge.hidden = false; }
    const deviceBadge = $('nav-devices-count');
    if (deviceBadge) { deviceBadge.textContent = number(stats.devices || 0); deviceBadge.hidden = false; }
    showApp();
    if (!location.hash) location.hash = '#/overview';
    await renderRoute();
  } catch (error) {
    if (error.code === 'admin_unconfigured') { showSetup(); return; }
    if (error.code === 'unauthorized') { showLogin(); return; }
    showLogin();
    $('login-error').textContent = errorText(error);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const token = $('login-token').value;
  $('login-error').textContent = '';
  const button = event.target.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    const response = await fetch('/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (response.status === 503) { showSetup(); return; }
    if (!response.ok) { $('login-error').textContent = response.status === 401 ? 'Token ungültig.' : 'Anmeldung fehlgeschlagen.'; return; }
    $('login-token').value = '';
    await boot();
  } catch {
    $('login-error').textContent = 'Server nicht erreichbar.';
  } finally {
    if (button) button.disabled = false;
  }
}

function wireEvents() {
  paintIcons(document);
  initTheme();
  $('login-form').addEventListener('submit', handleLogin);
  $('create-form').addEventListener('submit', submitCreateUser);
  $('create-cancel').addEventListener('click', () => $('create-user').close());
  $('news-form').addEventListener('submit', submitNewsForm);
  $('news-cancel').addEventListener('click', () => $('news-editor').close());
  for (const id of ['create-user', 'news-editor', 'confirm']) {
    $(id).addEventListener('click', (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  }
  $('logout').addEventListener('click', async () => {
    await fetch('/v1/admin/logout', { method: 'POST' }).catch(() => undefined);
    stopLogsAutoRefresh();
    state.user = { id: null, detail: null, tab: 'overview', cache: {}, data: null, calendar: null, calls: null, platformEdit: null };
    state.users = { query: '', mode: '', platform: '', credential: '', activity: '', data: '', sort: 'recent', limit: 25, offset: 0, list: [], total: 0, seq: 0, selected: new Set() };
    state.devices = { query: '', state: '', limit: 50, offset: 0, list: [], total: 0, stats: null, seq: 0 };
    state.news = { query: '', state: '', limit: 50, offset: 0, list: [], total: 0 };
    state.quiz = {
      query: '', moduleId: '', published: '', limit: 50, offset: 0, list: [], total: 0, overview: null,
      attempts: { query: '', topicId: '', correct: '', limit: 50, offset: 0, list: [], total: 0, stats: null },
      sessions: { query: '', topicId: '', limit: 50, offset: 0, list: [], total: 0 },
    };
    state.ilias = null;
    state.logs = { query: '', service: '', level: '', offset: 0, limit: 100, list: [], total: 0, services: [], levels: [], auto: false };
    showLogin();
  });
  $('menu-button').addEventListener('click', () => {
    $('sidebar').classList.add('open');
    $('sidebar-backdrop').classList.add('show');
  });
  $('sidebar-backdrop').addEventListener('click', closeSidebar);
  $('skip-link').addEventListener('click', () => $('view').focus());
  $('refresh-page').addEventListener('click', async () => {
    const route = parseHash();
    if (route.name === 'user') {
      state.user.cache = {};
      state.user.detail = null;
    }
    if (route.name === 'overview') state.overview = null;
    await renderRoute();
    toast('Aktualisiert.', 'ok');
  });
  window.addEventListener('hashchange', () => renderRoute());
  document.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (event.key === '/' && !typing) {
      event.preventDefault();
      const search = $('f-query');
      if (search) search.focus();
    }
    if (event.key === 'Escape' && $('sidebar').classList.contains('open')) closeSidebar();
  });
  const loginInput = $('login-token');
  const submitIcon = $('login-submit-icon');
  if (submitIcon) submitIcon.replaceWith(icon('shield', 16));
  loginInput?.focus();
}

refresh.current = renderRoute;

wireEvents();
boot();
