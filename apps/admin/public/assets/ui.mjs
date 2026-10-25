/** Reusable cards, badges, fields, dialogs, and toasts. */

import { $, h } from './dom.mjs';
import { icon } from './icons.mjs';
import { number } from './format.mjs';

function initials(name, account) {
  const source = String(name || account || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || ''));
  return letters.toUpperCase().slice(0, 2);
}

function avatarTone(seed) {
  let hash = 0;
  for (const char of String(seed || '?')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 'a' + (hash % 6);
}

export function avatar(name, account, extra) {
  return h('span', { className: 'avatar ' + avatarTone(account || name) + (extra ? ' ' + extra : ''), text: initials(name, account), 'aria-hidden': 'true' });
}

export function badge(text, tone) {
  return h('span', { className: 'badge ' + (tone || ''), text });
}

export function statusBadge(state) {
  const map = { active: ['aktiv', 'ok'], revoked: ['widerrufen', 'danger'], expired: ['abgelaufen', 'warn'] };
  const [label, tone] = map[state] || [state, ''];
  return badge(label, tone);
}

export function sessionBadge(state) {
  const map = { running: ['läuft', 'info'], cancelling: ['bricht ab', 'warn'], done: ['fertig', 'ok'], cancelled: ['abgebrochen', 'warn'], failed: ['fehlgeschlagen', 'danger'] };
  const [label, tone] = map[state] || [state, ''];
  return badge(label, tone);
}

export function platformBadge(link) {
  if (!link) return badge('nicht verknüpft', '');
  return link.status === 'connected' ? badge('verbunden', 'ok') : badge('verknüpft', 'blue');
}

export function campusBadge(user) {
  if (user.campusActive) return badge('aktiv im Speicher', 'ok');
  if (user.campusSource) return badge(user.campusSource === 'env' ? '.env' : 'Browser', 'warn');
  return badge('kein Zugang', '');
}

export function copyButton(value, label) {
  return h('button', {
    className: 'copy-btn', type: 'button', title: label || 'Kopieren', 'aria-label': label || 'Kopieren',
    onClick: (event) => { event.stopPropagation(); copyText(value, label); },
  }, icon('copy'));
}

export async function copyText(value, label) {
  const text = String(value ?? '');
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast((label || 'Wert') + ' kopiert.', 'ok');
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    try { document.execCommand('copy'); toast((label || 'Wert') + ' kopiert.', 'ok'); }
    catch { toast('Kopieren nicht möglich.', 'error'); }
    area.remove();
  }
}

export function fieldBox(key, value, options) {
  const opts = options || {};
  const content = h('div', { className: 'v' }, value === null || value === undefined || value === '' ? '–' : value);
  if (opts.copy && value) content.append(copyButton(value, opts.copyLabel || key));
  return h('div', { className: 'field-box' }, h('div', { className: 'k', text: key }), content);
}

export function sectionHead(title, subtitle, actions) {
  return h('div', { className: 'section-head' },
    h('div', null, h('h2', { text: title }), subtitle ? h('p', { text: subtitle }) : null),
    actions ? h('div', { className: 'actions' }, ...(Array.isArray(actions) ? actions : [actions])) : null,
  );
}

export function emptyState(iconName, title, text, actions) {
  return h('div', { className: 'empty' },
    h('div', { className: 'empty-icon' }, icon(iconName, 24)),
    h('strong', { text: title }),
    text ? h('p', { text }) : null,
    actions ? h('div', { className: 'actions row' }, ...(Array.isArray(actions) ? actions : [actions])) : null,
  );
}

export function loading(label) {
  return h('div', { className: 'loading', role: 'status' }, h('span', { className: 'spinner' }), label || 'Lade …');
}

export function skeletonRows(colspan, rows) {
  return Array.from({ length: rows || 5 }, () => h('tr', { className: 'skeleton-row' },
    h('td', { colspan: String(colspan) }, h('div', { className: 'skeleton', style: { width: (45 + Math.random() * 45) + '%' } })),
  ));
}

export function progressBar(value, max, tone) {
  const total = Math.max(1, Number(max) || 0);
  const pct = Math.max(0, Math.min(100, Math.round((Number(value) || 0) / total * 100)));
  return h('div', { className: 'progress ' + (tone || ''), role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' },
    h('span', { style: { width: pct + '%' } }),
  );
}

export function barList(items) {
  const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));
  return h('div', { className: 'bar-list' }, ...items.map((item) => h('div', { className: 'bar-row' },
    h('div', { className: 'bar-label' }, h('strong', { text: item.label }), h('span', { text: number(item.count) })),
    h('div', { className: 'bar-track' }, h('div', { className: 'bar-fill', style: { width: Math.max(2, Math.round((Number(item.count) || 0) / max * 100)) + '%', background: item.color || '' } })),
  )));
}

export function callout(text, tone, iconName) {
  return h('div', { className: 'callout ' + (tone || '') }, icon(iconName || 'info', 18), h('div', { text }));
}

export function toast(message, tone) {
  const stack = $('toasts');
  const node = h('div', { className: 'toast ' + (tone || ''), role: tone === 'error' ? 'alert' : 'status' },
    icon(tone === 'error' ? 'alert' : tone === 'ok' ? 'check-circle' : 'info', 17),
    h('span', { text: message }),
  );
  stack.append(node);
  while (stack.children.length > 4) stack.firstElementChild.remove();
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 220);
  }, tone === 'error' ? 5200 : 3600);
}

export function confirmAction(options) {
  const opts = options || {};
  return new Promise((resolve) => {
    const dialog = $('confirm');
    dialog.returnValue = '';
    $('confirm-title').textContent = opts.title || 'Aktion bestätigen';
    $('confirm-message').textContent = opts.message || '';
    const iconWrap = $('confirm-icon');
    const tone = opts.tone || 'danger';
    iconWrap.className = 'modal-icon ' + (tone === 'danger' ? '' : 'warn');
    iconWrap.replaceChildren(icon(tone === 'danger' ? 'alert' : 'info', 22));
    const wrap = $('confirm-text-wrap');
    const input = $('confirm-text');
    const ok = $('confirm-ok');
    ok.className = 'btn ' + (tone === 'danger' ? 'danger' : 'primary');
    ok.textContent = opts.confirmLabel || 'Bestätigen';
    const required = typeof opts.requireText === 'string' && opts.requireText ? opts.requireText : null;
    wrap.hidden = !required;
    input.value = '';
    ok.disabled = Boolean(required);
    if (required) {
      $('confirm-text-label').textContent = 'Zur Bestätigung „' + required + '“ eingeben';
      input.placeholder = required;
    }
    const onInput = () => { ok.disabled = input.value.trim() !== required; };
    if (required) input.addEventListener('input', onInput);
    const onClose = () => {
      if (required) input.removeEventListener('input', onInput);
      dialog.removeEventListener('close', onClose);
      resolve(dialog.returnValue === 'confirm');
    };
    dialog.addEventListener('close', onClose);
    dialog.showModal();
    setTimeout(() => (required ? input : ok).focus(), 40);
  });
}
