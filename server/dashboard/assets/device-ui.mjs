/** Shared labels and cells for browser device links. */

import { h } from './dom.mjs';
import { badge } from './ui.mjs';

const STATE_LABELS = {
  pending: ['wartet auf Scan', 'warn'],
  approved: ['genehmigt', 'blue'],
  active: ['aktiv', 'ok'],
  linked: ['verknüpft', 'ok'],
  expired: ['abgelaufen', ''],
  revoked: ['widerrufen', 'danger'],
};

const TYPE_LABELS = {
  desktop: ['Desktop', ''],
  mobile: ['Mobil', 'blue'],
  tablet: ['Tablet', 'info'],
  bot: ['Bot', 'warn'],
  unknown: ['Unbekannt', ''],
};

export function deviceStateBadge(state) {
  const [label, tone] = STATE_LABELS[state] || [state, ''];
  return badge(label, tone);
}

export function deviceTypeBadge(client) {
  const [label, tone] = TYPE_LABELS[client?.type] || TYPE_LABELS.unknown;
  return badge(label, tone);
}

export function deviceTypeLabel(client) {
  return (TYPE_LABELS[client?.type] || TYPE_LABELS.unknown)[0];
}

export function deviceClientCell(main, detail) {
  return h('div', { className: 'who-text' },
    h('strong', { text: main || 'Unbekannt', style: { fontSize: '12.5px' } }),
    detail ? h('span', { text: detail }) : null,
  );
}
