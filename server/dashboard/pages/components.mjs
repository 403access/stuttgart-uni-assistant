/** Component catalog: generated inventory, platform files, and every usage. */

import { setPage } from '../assets/auth-ui.mjs';
import { $, h } from '../assets/dom.mjs';
import { number } from '../assets/format.mjs';
import { icon } from '../assets/icons.mjs';
import { badge, copyButton, emptyState, fieldBox, loading } from '../assets/ui.mjs';

const CATEGORY_LABEL = { shared: 'Geteilt', feature: 'Funktionen', provider: 'App-weit' };
const EXPORT_KIND_LABEL = { component: 'Komponente', hook: 'Hook', helper: 'Helfer', constant: 'Konstante' };
const USAGE_KIND_LABEL = {
  import: 'Import',
  type: 'Typ',
  render: 'Render',
  call: 'Aufruf',
  reference: 'Referenz',
  're-export': 'Re-Export',
};

let catalogPromise = null;

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = import('../assets/component-catalog.mjs').then((module) => module.COMPONENT_CATALOG);
  }
  return catalogPromise;
}

let filters = { query: '', category: 'all', platform: 'all', unused: false, preview: false };
let catalog = null;

/** The Expo web app is normally on the same host at the dev-server port. */
function previewUrl(name) {
  const host = location.hostname || '127.0.0.1';
  const url = new URL(`http://${host}:8081/dev/components`);
  if (name) url.searchParams.set('q', name);
  return url.toString();
}

export async function renderComponentsPage(route) {
  setPage('Komponenten', 'Katalog, Plattformdateien und Fundstellen aus dem TypeScript-AST');
  filters = {
    query: route.params.get('query') || '',
    category: ['shared', 'feature', 'provider'].includes(route.params.get('category'))
      ? route.params.get('category')
      : 'all',
    platform: ['native', 'web'].includes(route.params.get('platform'))
      ? route.params.get('platform')
      : 'all',
    unused: route.params.get('unused') === '1',
    preview: route.params.get('preview') === '1',
  };
  const view = $('view');
  view.replaceChildren(loading('Komponentenkatalog wird geladen …'));
  try {
    catalog = await loadCatalog();
  } catch {
    view.replaceChildren(
      emptyState(
        'alert',
        'Katalog konnte nicht geladen werden',
        'Die generierte Datei server/dashboard/assets/component-catalog.mjs fehlt oder ist beschädigt. Führe „bun run catalog:components“ aus.',
        h('button', { className: 'btn secondary', type: 'button', onClick: () => renderComponentsPage(route) }, icon('refresh'), 'Erneut versuchen'),
      ),
    );
    return;
  }
  renderShell(route);
}

function hashForFilters() {
  const params = new URLSearchParams();
  if (filters.query) params.set('query', filters.query);
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.platform !== 'all') params.set('platform', filters.platform);
  if (filters.unused) params.set('unused', '1');
  if (filters.preview) params.set('preview', '1');
  const text = params.toString();
  return '#/components' + (text ? '?' + text : '');
}

function catalogStats() {
  return catalog.stats;
}

function renderShell(route) {
  const search = h('input', {
    id: 'component-query',
    type: 'search',
    value: filters.query,
    autocomplete: 'off',
    placeholder: 'Name, Datei, Export oder Fundstelle',
  });
  const category = h('select', { id: 'component-category' },
    h('option', { value: 'all', selected: filters.category === 'all', text: 'Alle Kategorien' }),
    h('option', { value: 'shared', selected: filters.category === 'shared', text: 'Geteilt' }),
    h('option', { value: 'feature', selected: filters.category === 'feature', text: 'Funktionen' }),
    h('option', { value: 'provider', selected: filters.category === 'provider', text: 'App-weit' }),
  );
  const platform = h('select', { id: 'component-platform' },
    h('option', { value: 'all', selected: filters.platform === 'all', text: 'Alle Plattformen' }),
    h('option', { value: 'native', selected: filters.platform === 'native', text: 'Native' }),
    h('option', { value: 'web', selected: filters.platform === 'web', text: 'Web' }),
  );
  const unused = h('input', { id: 'component-unused', type: 'checkbox', className: 'checkbox', checked: filters.unused });
  const preview = h('input', { id: 'component-preview', type: 'checkbox', className: 'checkbox', checked: filters.preview });
  const tbody = h('tbody', { id: 'components-body' });
  const count = h('p', { id: 'components-count', className: 'hint', text: 'Lade …' });

  const apply = () => {
    filters.query = search.value.trim();
    filters.category = category.value;
    filters.platform = platform.value;
    filters.unused = unused.checked;
    filters.preview = preview.checked;
    history.replaceState(null, '', hashForFilters());
    renderRows(tbody, count);
  };

  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 240);
  });
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    clearTimeout(timer);
    apply();
  });
  category.addEventListener('change', apply);
  platform.addEventListener('change', apply);
  unused.addEventListener('change', apply);
  preview.addEventListener('change', apply);

  const stats = catalogStats();
  $('view').replaceChildren(
    h('div', { className: 'view-stack' },
      h('section', { className: 'card section-card' },
        h('div', { className: 'section-head' },
          h('div', null,
            h('h2', { text: 'Komponentenkatalog' }),
            h('p', { text: 'Dieselbe Inventur wie Dev → Komponenten in der App und die Engineering-Doku. Der Katalog wird aus dem TypeScript-AST erzeugt. Die Live-Vorschau ist eine React-Ansicht und öffnet deshalb die Expo-Web-App auf Port 8081.' }),
          ),
          h('div', { className: 'actions' },
            h('a', {
              className: 'btn small',
              href: previewUrl(),
              target: '_blank',
              rel: 'noreferrer',
            }, icon('external'), 'Live-Vorschau öffnen'),
            h('a', {
              className: 'btn secondary small',
              href: 'https://github.com/403access/stuttgart-uni-assistant/blob/main/docs/engineering/component-catalog.md',
              target: '_blank',
              rel: 'noreferrer',
            }, icon('external'), 'Dokumentation'),
            h('button', { className: 'btn secondary small', type: 'button', onClick: () => location.reload() }, icon('refresh'), 'Neu laden'),
          ),
        ),
        h('div', { className: 'field-grid' },
          fieldBox('Komponenten', number(stats.components)),
          fieldBox('Exporte', number(stats.exports)),
          fieldBox('Fundstellen', number(stats.occurrences)),
          fieldBox('Verwendungen', number(stats.usageCount)),
          fieldBox('Dateien', number(stats.files)),
          fieldBox('Unbenutzt', number(stats.unused)),
          fieldBox('Nur importiert', number(stats.onlyImported)),
          fieldBox('Plattformdateien', number(stats.platformVariants)),
        ),
      ),
      h('section', { className: 'card toolbar', 'aria-label': 'Komponentenfilter' },
        h('label', { className: 'field grow' }, 'Suche', h('div', { className: 'search-field' }, icon('search'), search)),
        h('label', { className: 'field' }, 'Kategorie', category),
        h('label', { className: 'field' }, 'Plattform', platform),
        h('label', { className: 'check-row', style: { alignSelf: 'center', whiteSpace: 'nowrap' } }, unused, 'Nur unbenutzte'),
        h('label', { className: 'check-row', style: { alignSelf: 'center', whiteSpace: 'nowrap' } }, preview, 'Nur mit Vorschau'),
      ),
      h('section', { className: 'card table-card' },
        h('div', { className: 'table-wrap' },
          h('table', { className: 'data' },
            h('caption', { className: 'sr-only' }, 'Komponentenkatalog'),
            h('thead', null, h('tr', null,
              h('th', null, 'Komponente'),
              h('th', null, 'Kategorie'),
              h('th', null, 'Plattform'),
              h('th', null, 'Vorschau'),
              h('th', null, 'Exporte'),
              h('th', null, 'Verwendungen'),
              h('th', null, 'Importe'),
              h('th', null, 'Dateien'),
              h('th', null, ''),
            )),
            tbody,
          ),
        ),
        h('div', { className: 'pager' }, count),
      ),
    ),
  );

  renderRows(tbody, count);
}

function matches(entry) {
  if (filters.category !== 'all' && entry.category !== filters.category) return false;
  if (filters.platform !== 'all' && !entry.platforms.includes(filters.platform)) return false;
  if (filters.unused && !entry.unused) return false;
  if (filters.preview && entry.previews.length === 0) return false;
  if (!filters.query) return true;
  const needle = filters.query.toLowerCase();
  return [
    entry.name,
    entry.file,
    ...entry.exports.map((item) => item.name),
    ...entry.occurrences.map((occurrence) => occurrence.file + ' ' + occurrence.exportName),
  ].join(' ').toLowerCase().includes(needle);
}

function renderRows(tbody, count) {
  if (!tbody) return;
  tbody.replaceChildren();
  const entries = catalog.entries.filter(matches);
  count.textContent = entries.length === 1
    ? '1 Komponente entspricht den Filtern.'
    : number(entries.length) + ' Komponenten entsprechen den Filtern.';

  if (!entries.length) {
    tbody.append(h('tr', null, h('td', { colspan: '9' }, emptyState('grid', 'Keine Komponente', 'Für diese Filter wurde kein Eintrag gefunden.'))));
    return;
  }

  for (const entry of entries) {
    const detailCell = h('td', { colspan: '9' });
    const detailRow = h('tr', { hidden: true }, detailCell);
    const detailButton = h('button', {
      className: 'btn secondary small',
      type: 'button',
      'aria-expanded': 'false',
      onClick: () => {
        const open = detailRow.hidden;
        detailRow.hidden = !open;
        detailButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        detailButton.replaceChildren(icon(open ? 'close' : 'chevron-right'), open ? 'Schließen' : 'Details');
        if (open && !detailCell.firstChild) detailCell.append(renderDetail(entry));
      },
    }, icon('chevron-right'), 'Details');

    tbody.append(
      h('tr', null,
        h('td', null,
          h('div', { className: 'who-text' },
            h('strong', { text: entry.name }),
            h('span', { className: 'mono', text: entry.file }),
          ),
          entry.unused ? badge('unbenutzt', 'danger') : null,
          entry.onlyImported ? badge('nur importiert', 'warn') : null,
        ),
        h('td', null, badge(CATEGORY_LABEL[entry.category] || entry.category, entry.category === 'shared' ? 'blue' : '')),
        h('td', null,
          h('div', { className: 'row tight' },
            ...entry.platforms.map((item) => badge(item === 'native' ? 'Native' : 'Web', item === 'web' ? 'blue' : '')),
            entry.hasPlatformVariants ? badge('getrennt', 'warn') : null,
          ),
        ),
        h('td', null,
          entry.previews.length
            ? h('a', {
                href: previewUrl(entry.name),
                target: '_blank',
                rel: 'noreferrer',
                title: entry.previews.join(', '),
                style: { textDecoration: 'none' },
              }, badge(entry.previews.length + ' Live', 'ok'))
            : h('span', { className: 'muted', text: '–' }),
        ),
        h('td', null, h('span', { text: number(entry.exports.length) }), h('div', { className: 'hint', text: entry.exports.slice(0, 3).map((item) => item.name).join(', ') + (entry.exports.length > 3 ? ' …' : '') })),
        h('td', null, h('strong', { text: number(entry.usageCount) })),
        h('td', null, number(entry.importCount)),
        h('td', null, number(entry.usedBy.length)),
        h('td', null, detailButton),
      ),
      detailRow,
    );
  }
}

function renderDetail(entry) {
  const byFile = new Map();
  for (const occurrence of entry.occurrences) {
    if (!byFile.has(occurrence.file)) byFile.set(occurrence.file, []);
    byFile.get(occurrence.file).push(occurrence);
  }

  const variants = entry.variants.length > 1
    ? h('div', null,
        h('h3', { className: 'card-title' }, 'Plattformdateien'),
        h('div', { className: 'row tight' },
          ...entry.variants.map((variant) => h('span', { className: 'badge ' + (variant.platform === 'web' ? 'blue' : '') },
            h('span', { className: 'mono', text: variant.platform + ': ' + variant.file }),
            copyButton(variant.file, 'Pfad'),
          )),
        ),
      )
    : null;

  const files = [...byFile.entries()].map(([file, occurrences]) => h('tr', null,
    h('td', null, h('div', { className: 'row tight' }, h('code', { text: file }), copyButton(file, 'Pfad'))),
    h('td', null, ...occurrences.map((occurrence) => h('div', { className: 'mono tiny', text:
      occurrence.line + ' · ' + (USAGE_KIND_LABEL[occurrence.kind] || occurrence.kind) + ' · ' + occurrence.exportName + (occurrence.count > 1 ? ' ×' + occurrence.count : ''),
    }))),
  ));

  return h('div', { className: 'view-stack', style: { gap: '14px' } },
    h('div', { className: 'field-grid' },
      fieldBox('Datei', h('div', { className: 'row tight' }, h('code', { text: entry.file }), copyButton(entry.file, 'Pfad'))),
      fieldBox('Kategorie', CATEGORY_LABEL[entry.category] || entry.category),
      fieldBox('Verwendungen', number(entry.usageCount)),
      fieldBox('Importe', number(entry.importCount)),
      fieldBox('Dateien', number(entry.usedBy.length)),
      fieldBox('Standard-Export', entry.defaultExport || '–'),
      fieldBox('Vorschau', entry.previews.length
        ? h('div', { className: 'row tight' },
            ...entry.previews.map((name) => h('a', {
              className: 'badge ok',
              href: previewUrl(name),
              target: '_blank',
              rel: 'noreferrer',
              style: { textDecoration: 'none' },
            }, name)),
          )
        : '–'),
    ),
    h('div', null,
      h('h3', { className: 'card-title' }, 'Exporte'),
      h('div', { className: 'row tight' },
        ...entry.exports.map((item) => badge(item.name + ' · ' + (EXPORT_KIND_LABEL[item.kind] || item.kind), item.kind === 'component' ? 'blue' : '')),
      ),
    ),
    variants,
    h('div', null,
      h('h3', { className: 'card-title' }, 'Fundstellen'),
      byFile.size
        ? h('div', { className: 'table-wrap' }, h('table', { className: 'data' },
            h('thead', null, h('tr', null, h('th', null, 'Datei'), h('th', null, 'Zeile · Art · Export'))),
            h('tbody', null, ...files),
          ))
        : h('p', { className: 'hint', text: 'Keine Importe oder Verwendungen gefunden.' }),
    ),
  );
}
