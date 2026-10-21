/** App news: create, edit, publish, and delete operator-managed messages. */

import { api, errorText } from '../assets/api.mjs';
import { setPage } from '../assets/auth-ui.mjs';
import { $, h } from '../assets/dom.mjs';
import { date, dateOnly, number, relative } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { refresh, state } from '../assets/runtime.mjs';
import { badge, confirmAction, emptyState, loading, toast } from '../assets/ui.mjs';

let editingId = null;

function newsHash() {
  const params = new URLSearchParams();
  if (state.news.query) params.set('query', state.news.query);
  if (state.news.state) params.set('state', state.news.state);
  if (state.news.offset) params.set('offset', String(state.news.offset));
  const text = params.toString();
  return '#/news' + (text ? '?' + text : '');
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function queryPath() {
  const params = new URLSearchParams();
  params.set('limit', String(state.news.limit));
  params.set('offset', String(state.news.offset));
  if (state.news.query) params.set('query', state.news.query);
  if (state.news.state) params.set('state', state.news.state);
  return '/v1/admin/news?' + params.toString();
}

export async function renderNewsPage(route) {
  setPage('News', 'Meldungen für den Feed der App veröffentlichen');
  const params = route.params;
  state.news.query = params.get('query') || '';
  state.news.state = ['published', 'draft'].includes(params.get('state')) ? params.get('state') : '';
  state.news.offset = Math.max(0, Number(params.get('offset')) || 0);
  const view = $('view');
  view.replaceChildren(loading('Meldungen werden geladen …'));
  const data = await api(queryPath());
  state.news.list = data.items || [];
  state.news.total = data.total || 0;
  renderShell(data);
}

function renderShell(data) {
  const view = $('view');
  const search = h('input', { type: 'search', value: state.news.query, placeholder: 'Titel, Kurzfassung oder Text', autocomplete: 'off' });
  const stateSelect = h('select', null,
    h('option', { value: '', selected: !state.news.state, text: 'Alle Meldungen' }),
    h('option', { value: 'published', selected: state.news.state === 'published', text: 'Veröffentlicht' }),
    h('option', { value: 'draft', selected: state.news.state === 'draft', text: 'Entwürfe' }),
  );
  const reload = () => {
    state.news.query = search.value.trim();
    state.news.state = stateSelect.value;
    state.news.offset = 0;
    history.replaceState(null, '', newsHash());
    loadNews();
  };
  let timer = null;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 280); });
  search.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); reload(); } });
  stateSelect.addEventListener('change', reload);

  const tbody = h('tbody', { id: 'news-body' });
  const pageInfo = h('p', { id: 'news-page-info', className: 'hint', text: 'Lade …' });
  const pager = h('div', { className: 'pager' },
    pageInfo,
    h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', id: 'news-prev', onClick: () => { state.news.offset = Math.max(0, state.news.offset - state.news.limit); history.replaceState(null, '', newsHash()); loadNews(); } }, icon('chevron-left'), 'Zurück'),
      h('button', { className: 'btn secondary small', type: 'button', id: 'news-next', onClick: () => { state.news.offset += state.news.limit; history.replaceState(null, '', newsHash()); loadNews(); } }, 'Weiter', icon('chevron-right')),
    ),
  );

  view.replaceChildren(
    h('div', { className: 'view-stack' },
      h('div', { className: 'page-intro' },
        h('div', null, h('div', { className: 'eyebrow' }, 'Redaktion'), h('h2', { text: 'News' }), h('p', { text: 'Nur veröffentlichte Meldungen erscheinen im Feed der App. Entwürfe bleiben hier sichtbar.' })),
        h('div', { className: 'row' },
          h('button', { className: 'btn', type: 'button', onClick: () => openNewsEditor(null) }, icon('plus'), 'Meldung anlegen'),
          h('a', { className: 'btn secondary', href: '#/audit' }, icon('activity'), 'Aktivität'),
        ),
      ),
      h('section', { className: 'card toolbar' },
        h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
        h('label', { className: 'field' }, 'Status', stateSelect),
      ),
      h('section', { className: 'card table-card' },
        h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
          h('caption', { className: 'sr-only' }, 'Meldungen'),
          h('thead', null, h('tr', null,
            h('th', null, 'Meldung'),
            h('th', null, 'Quelle'),
            h('th', null, 'Status'),
            h('th', null, 'Datum'),
            h('th', null, 'Zuletzt geändert'),
            h('th', null, ''),
          )),
          tbody,
        )),
        pager,
      ),
    ),
  );
  renderRows(data);
}

function renderRows(data) {
  const tbody = $('news-body');
  if (!tbody) return;
  tbody.replaceChildren();
  if (!data.items.length) {
    tbody.append(h('tr', null, h('td', { colspan: '6' }, emptyState('inbox', 'Keine Meldungen', state.news.query || state.news.state ? 'Für diesen Filter wurden keine Meldungen gefunden.' : 'Lege die erste Meldung an und veröffentliche sie für die App.'))));
  }
  for (const item of data.items) {
    const actions = h('div', { className: 'row tight' },
      h('button', { className: 'btn secondary small', type: 'button', onClick: () => openNewsEditor(item) }, icon('edit'), 'Bearbeiten'),
      h('button', { className: 'btn secondary small', type: 'button', onClick: () => togglePublished(item) }, icon(item.published ? 'eye' : 'check-circle'), item.published ? 'Zurückziehen' : 'Veröffentlichen'),
      h('button', { className: 'btn danger-soft small', type: 'button', onClick: () => removeNews(item) }, icon('trash'), 'Löschen'),
    );
    tbody.append(h('tr', null,
      h('td', null,
        h('strong', { text: item.title.de }),
        item.title.en && item.title.en !== item.title.de ? h('div', { className: 'hint', text: item.title.en }) : null,
        item.summary.de ? h('div', { className: 'hint', text: item.summary.de }) : null,
      ),
      h('td', null, badge(sourceName(item.source), 'blue')),
      h('td', null, item.published ? badge('veröffentlicht', 'ok') : badge('Entwurf', 'warn'), item.publishedAt ? h('div', { className: 'hint', text: relative(item.publishedAt) }) : null),
      h('td', { style: { whiteSpace: 'nowrap' } }, dateOnly(item.date + 'T12:00:00')),
      h('td', { style: { whiteSpace: 'nowrap' } }, h('span', { className: 'tiny', text: date(item.updatedAt) })),
      h('td', null, actions),
    ));
  }
  const info = $('news-page-info');
  if (info) {
    const from = data.total === 0 ? 0 : data.offset + 1;
    const to = Math.min(data.offset + data.limit, data.total);
    info.textContent = from + '–' + to + ' von ' + number(data.total);
  }
  const prev = $('news-prev');
  const next = $('news-next');
  if (prev) prev.disabled = data.offset <= 0;
  if (next) next.disabled = data.offset + data.limit >= data.total;
}

function sourceName(source) {
  return { university: 'Universität', faculty: 'Fakultät', institute: 'Institut', stuvus: 'stuvus', sdg: 'SDG Campus' }[source] || source;
}

export function openNewsEditor(item) {
  editingId = item?.id ?? null;
  $('news-editor-title').textContent = item ? 'Meldung bearbeiten' : 'Meldung anlegen';
  $('news-editor-lead').textContent = item ? 'Änderungen sind nach dem Speichern sofort in der App sichtbar, wenn die Meldung veröffentlicht ist.' : 'Veröffentlichte Meldungen erscheinen im Feed der App.';
  $('news-title-de').value = item?.title.de ?? '';
  $('news-title-en').value = item?.title.en ?? '';
  $('news-summary-de').value = item?.summary.de ?? '';
  $('news-summary-en').value = item?.summary.en ?? '';
  $('news-body-de').value = item?.body.de ?? '';
  $('news-body-en').value = item?.body.en ?? '';
  $('news-source').value = item?.source ?? 'university';
  $('news-date').value = item?.date ?? today();
  $('news-published').checked = item?.published ?? false;
  $('news-error').textContent = '';
  $('news-editor').showModal();
  setTimeout(() => $('news-title-de').focus(), 40);
}

export async function submitNewsForm(event) {
  event.preventDefault();
  const titleDe = $('news-title-de').value.trim();
  const bodyDe = $('news-body-de').value.trim();
  const errorBox = $('news-error');
  if (!titleDe) { errorBox.textContent = 'Die Meldung braucht einen deutschen Titel.'; return; }
  if (!bodyDe) { errorBox.textContent = 'Die Meldung braucht einen deutschen Text.'; return; }
  errorBox.textContent = '';
  const body = {
    titleDe,
    titleEn: $('news-title-en').value,
    summaryDe: $('news-summary-de').value,
    summaryEn: $('news-summary-en').value,
    bodyDe,
    bodyEn: $('news-body-en').value,
    source: $('news-source').value,
    date: $('news-date').value,
    published: $('news-published').checked,
  };
  const submit = $('news-submit');
  submit.disabled = true;
  try {
    if (editingId) await api('/v1/admin/news/' + encodeURIComponent(editingId), { method: 'POST', body });
    else await api('/v1/admin/news', { method: 'POST', body });
    $('news-editor').close();
    toast(editingId ? 'Meldung gespeichert.' : 'Meldung angelegt.', 'ok');
    await refresh.current();
  } catch (error) {
    errorBox.textContent = errorText(error);
  } finally {
    submit.disabled = false;
  }
}

async function loadNews() {
  const tbody = $('news-body');
  if (!tbody) return;
  try {
    const data = await api(queryPath());
    state.news.list = data.items || [];
    state.news.total = data.total || 0;
    renderRows(data);
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function togglePublished(item) {
  const ok = await confirmAction({
    title: item.published ? 'Meldung zurückziehen?' : 'Meldung veröffentlichen?',
    message: '„' + item.title.de + '“ wird ' + (item.published ? 'aus dem Feed der App entfernt.' : 'sofort im Feed der App angezeigt.'),
    confirmLabel: item.published ? 'Zurückziehen' : 'Veröffentlichen',
    tone: item.published ? 'danger' : 'warn',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/news/' + encodeURIComponent(item.id), { method: 'POST', body: { published: !item.published } });
    toast('Meldung ' + (item.published ? 'zurückgezogen' : 'veröffentlicht') + '.', 'ok');
    await refresh.current();
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}

async function removeNews(item) {
  const ok = await confirmAction({
    title: 'Meldung löschen?',
    message: '„' + item.title.de + '“ wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.',
    confirmLabel: 'Löschen',
  });
  if (!ok) return;
  try {
    await api('/v1/admin/news/' + encodeURIComponent(item.id), { method: 'DELETE' });
    toast('Meldung gelöscht.', 'ok');
    await refresh.current();
  } catch (error) { if (error.code !== 'unauthorized') toast(errorText(error), 'error'); }
}
