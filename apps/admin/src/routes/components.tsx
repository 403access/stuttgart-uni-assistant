import { Badge, Callout, CopyButton, Field, Section, Select, Spinner } from '@ua/ui-react';
import { useEffect, useMemo, useState } from 'react';

interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  variants: { platform: string; file: string }[];
  platforms: string[];
  hasPlatformVariants: boolean;
  exports: { name: string; kind: string }[];
  previews: string[];
  defaultExport?: string | null;
  occurrences: { file: string; line: number; kind: string; exportName: string; count: number }[];
  usageCount: number;
  importCount: number;
  usedBy: string[];
  unused: boolean;
  onlyImported: boolean;
}

interface Stats {
  components: number;
  exports: number;
  occurrences: number;
  usageCount: number;
  files: number;
  unused: number;
  onlyImported: number;
  platformVariants: number;
  previewable: number;
  categories: Record<string, number>;
}

interface CatalogData { stats: Stats; entries: CatalogEntry[] }

const CATEGORY_LABEL: Record<string, string> = { shared: 'Geteilt', feature: 'Funktionen', provider: 'App-weit' };
const EXPORT_KIND_LABEL: Record<string, string> = {
  component: 'Komponente',
  hook: 'Hook',
  helper: 'Helfer',
  constant: 'Konstante',
};
const USAGE_KIND_LABEL: Record<string, string> = {
  import: 'Import',
  type: 'Typ',
  render: 'Render',
  call: 'Aufruf',
  reference: 'Referenz',
  're-export': 'Re-Export',
};

function previewUrl(name?: string) {
  const host = window.location.hostname || '127.0.0.1';
  const url = new URL(`http://${host}:8081/dev/components`);
  if (name) url.searchParams.set('q', name);
  return url.toString();
}

function CatalogDetail({ entry }: { entry: CatalogEntry }) {
  const byFile = new Map<string, CatalogEntry['occurrences']>();
  for (const occurrence of entry.occurrences) {
    const list = byFile.get(occurrence.file) ?? [];
    list.push(occurrence);
    byFile.set(occurrence.file, list);
  }

  return (
    <div className="view-stack" style={{ gap: 14 }}>
      <div className="field-grid">
        <div className="field-box"><span className="k">Datei</span><span className="v"><code>{entry.file}</code><CopyButton value={entry.file} label="Pfad" /></span></div>
        <div className="field-box"><span className="k">Kategorie</span><span className="v">{CATEGORY_LABEL[entry.category] ?? entry.category}</span></div>
        <div className="field-box"><span className="k">Verwendungen</span><span className="v">{entry.usageCount}</span></div>
        <div className="field-box"><span className="k">Importe</span><span className="v">{entry.importCount}</span></div>
        <div className="field-box"><span className="k">Dateien</span><span className="v">{entry.usedBy.length}</span></div>
        <div className="field-box"><span className="k">Standard-Export</span><span className="v">{entry.defaultExport || '–'}</span></div>
        <div className="field-box">
          <span className="k">Vorschau</span>
          <span className="v">
            {entry.previews.length
              ? entry.previews.map((name) => (
                  <a key={name} className="badge ok" href={previewUrl(name)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    {name}
                  </a>
                ))
              : '–'}
          </span>
        </div>
      </div>

      <div>
        <h3 className="card-title">Exporte</h3>
        <div className="row tight">
          {entry.exports.map((item) => (
            <Badge key={item.name} tone={item.kind === 'component' ? 'blue' : ''}>
              {item.name} · {EXPORT_KIND_LABEL[item.kind] ?? item.kind}
            </Badge>
          ))}
        </div>
      </div>

      {entry.variants.length > 1 ? (
        <div>
          <h3 className="card-title">Plattformdateien</h3>
          <div className="row tight">
            {entry.variants.map((variant) => (
              <span key={variant.platform} className={`badge ${variant.platform === 'web' ? 'blue' : ''}`.trim()}>
                <span className="mono">{variant.platform}: {variant.file}</span>
                <CopyButton value={variant.file} label="Pfad" />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="card-title">Fundstellen</h3>
        {byFile.size ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Datei</th><th>Zeile · Art · Export</th></tr></thead>
              <tbody>
                {[...byFile.entries()].map(([file, occurrences]) => (
                  <tr key={file}>
                    <td><div className="row tight"><code>{file}</code><CopyButton value={file} label="Pfad" /></div></td>
                    <td>
                      {occurrences.map((occurrence, index) => (
                        <div key={`${occurrence.line}-${index}`} className="mono tiny">
                          {occurrence.line} · {USAGE_KIND_LABEL[occurrence.kind] ?? occurrence.kind} · {occurrence.exportName}
                          {occurrence.count > 1 ? ` ×${occurrence.count}` : ''}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="hint">Keine Importe oder Verwendungen gefunden.</p>}
      </div>
    </div>
  );
}

export function ComponentsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [data, setData] = useState<CatalogData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    import('../generated/component-catalog.json')
      .then((module) => setData(module.default as unknown as CatalogData))
      .catch(() => setFailed(true));
  }, []);

  const entries = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLowerCase();
    return data.entries.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (platform !== 'all' && !entry.platforms.includes(platform)) return false;
      if (unusedOnly && !entry.unused) return false;
      if (previewOnly && !entry.previews.length) return false;
      if (!needle) return true;
      return [entry.name, entry.file, ...entry.exports.map((item) => item.name), ...entry.occurrences.map((item) => `${item.file} ${item.exportName}`)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [data, search, category, platform, unusedOnly, previewOnly]);

  if (failed) return <Callout tone="warn">Der generierte Komponentenkatalog fehlt oder ist beschädigt. Führe „bun run catalog:components“ aus.</Callout>;
  if (!data) return <div className="loading"><Spinner /> Komponentenkatalog wird geladen …</div>;

  const stats = data.stats;

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="view-stack">
      <Section
        title="Komponentenkatalog"
        subtitle="Dieselbe Inventur wie Dev → Komponenten in der App und die Engineering-Doku. Der Katalog wird aus dem TypeScript-AST erzeugt. Die Live-Vorschau ist eine React-Ansicht und öffnet deshalb die Expo-Web-App auf Port 8081."
        actions={
          <>
            <a className="btn small" href={previewUrl()} target="_blank" rel="noreferrer">Live-Vorschau öffnen</a>
            <a
              className="btn secondary small"
              href="https://github.com/403access/stuttgart-uni-assistant/blob/main/docs/engineering/component-catalog.md"
              target="_blank"
              rel="noreferrer"
            >
              Dokumentation
            </a>
            <button className="btn secondary small" type="button" onClick={() => window.location.reload()}>Neu laden</button>
          </>
        }
      >
        <div className="field-grid">
          <div className="field-box"><span className="k">Komponenten</span><span className="v">{stats.components}</span></div>
          <div className="field-box"><span className="k">Exporte</span><span className="v">{stats.exports}</span></div>
          <div className="field-box"><span className="k">Fundstellen</span><span className="v">{stats.occurrences}</span></div>
          <div className="field-box"><span className="k">Verwendungen</span><span className="v">{stats.usageCount}</span></div>
          <div className="field-box"><span className="k">Dateien</span><span className="v">{stats.files}</span></div>
          <div className="field-box"><span className="k">Unbenutzt</span><span className="v">{stats.unused}</span></div>
          <div className="field-box"><span className="k">Nur importiert</span><span className="v">{stats.onlyImported}</span></div>
          <div className="field-box"><span className="k">Plattformdateien</span><span className="v">{stats.platformVariants}</span></div>
        </div>
      </Section>

      <section className="card toolbar" aria-label="Komponentenfilter">
        <label className="field grow">
          Suche
          <div className="search-field">
            <span className="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
            </span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, Datei, Export oder Fundstelle" autoComplete="off" />
          </div>
        </label>
        <Field label="Kategorie">
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Alle Kategorien</option>
            <option value="shared">Geteilt</option>
            <option value="feature">Funktionen</option>
            <option value="provider">App-weit</option>
          </Select>
        </Field>
        <Field label="Plattform">
          <Select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="all">Alle Plattformen</option>
            <option value="native">Native</option>
            <option value="web">Web</option>
          </Select>
        </Field>
        <label className="check-row" style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>
          <input type="checkbox" className="checkbox" checked={unusedOnly} onChange={(event) => setUnusedOnly(event.target.checked)} />
          Nur unbenutzte
        </label>
        <label className="check-row" style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>
          <input type="checkbox" className="checkbox" checked={previewOnly} onChange={(event) => setPreviewOnly(event.target.checked)} />
          Nur mit Vorschau
        </label>
      </section>

      <section className="card table-card">
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Komponentenkatalog</caption>
            <thead>
              <tr>
                <th>Komponente</th>
                <th>Kategorie</th>
                <th>Plattform</th>
                <th>Vorschau</th>
                <th>Exporte</th>
                <th>Verwendungen</th>
                <th>Importe</th>
                <th>Dateien</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.length ? entries.map((entry) => {
                const open = expanded.has(entry.id);
                return [
                  <tr key={entry.id}>
                    <td>
                      <div className="who-text">
                        <strong>{entry.name}</strong>
                        <span className="mono">{entry.file}</span>
                      </div>
                      {entry.unused ? <Badge tone="danger">unbenutzt</Badge> : null}
                      {entry.onlyImported ? <Badge tone="warn">nur importiert</Badge> : null}
                    </td>
                    <td><Badge tone={entry.category === 'shared' ? 'blue' : ''}>{CATEGORY_LABEL[entry.category] ?? entry.category}</Badge></td>
                    <td>
                      <div className="row tight">
                        {entry.platforms.map((item) => (
                          <Badge key={item} tone={item === 'web' ? 'blue' : ''}>{item === 'native' ? 'Native' : 'Web'}</Badge>
                        ))}
                        {entry.hasPlatformVariants ? <Badge tone="warn">getrennt</Badge> : null}
                      </div>
                    </td>
                    <td>
                      {entry.previews.length ? (
                        <a href={previewUrl(entry.name)} target="_blank" rel="noreferrer" title={entry.previews.join(', ')} style={{ textDecoration: 'none' }}>
                          <Badge tone="ok">{entry.previews.length} Live</Badge>
                        </a>
                      ) : <span className="muted">–</span>}
                    </td>
                    <td>
                      <span>{entry.exports.length}</span>
                      <div className="hint">{entry.exports.slice(0, 3).map((item) => item.name).join(', ')}{entry.exports.length > 3 ? ' …' : ''}</div>
                    </td>
                    <td><strong>{entry.usageCount}</strong></td>
                    <td>{entry.importCount}</td>
                    <td>{entry.usedBy.length}</td>
                    <td>
                      <button className="btn secondary small" type="button" aria-expanded={open} onClick={() => toggle(entry.id)}>
                        {open ? 'Schließen' : 'Details'}
                      </button>
                    </td>
                  </tr>,
                  open ? <tr key={`${entry.id}-detail`}><td colSpan={9}><CatalogDetail entry={entry} /></td></tr> : null,
                ];
              }) : (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      <strong>Keine Komponente</strong>
                      <p>Für diese Filter wurde kein Eintrag gefunden.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span className="hint">
            {entries.length === 1 ? '1 Komponente entspricht den Filtern.' : `${entries.length} Komponenten entsprechen den Filtern.`}
          </span>
        </div>
      </section>
    </div>
  );
}
