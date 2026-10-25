import { Badge, DataTable, Field, Input, Muted, PageHeader, Section, Spinner, StatCard } from '@ua/ui-react';
import { useEffect, useMemo, useState } from 'react';

interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  platforms: string[];
  exports: Array<{ name: string; kind: string }>;
  previews: string[];
  usageCount: number;
  usedBy: string[];
  unused: boolean;
  onlyImported: boolean;
}

interface Stats {
  components: number;
  exports: number;
  usageCount: number;
  files: number;
  previewable: number;
  unused: number;
  categories: Record<string, number>;
}

interface CatalogData { stats: Stats; entries: CatalogEntry[] }

export function ComponentsPage() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState<CatalogData | null>(null);
  useEffect(() => {
    import('../generated/component-catalog.json').then((module) => setData(module.default as unknown as CatalogData));
  }, []);
  const entries = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return data.entries;
    return data.entries.filter((entry) => [entry.name, entry.file, ...entry.exports.map((item) => item.name)].some((value) => value.toLowerCase().includes(needle)));
  }, [data, search]);
  if (!data) return <Spinner />;
  const stats = data.stats;
  const categories = stats.categories;

  return (
    <>
      <PageHeader title="Komponenten" subtitle="Generierte Übersicht aller App- und UI-Paket-Komponenten" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard value={stats.components} label="Komponenten" />
        <StatCard value={stats.exports} label="Exports" />
        <StatCard value={stats.usageCount} label="Verwendungen" sub={`${stats.files} Dateien`} />
        <StatCard value={stats.previewable} label="Mit Live-Preview" />
        <StatCard value={stats.unused} label="Unbenutzt" />
        <StatCard value={categories.shared} label="Shared UI" sub={`${categories.feature} Feature · ${categories.provider} Provider`} />
      </div>

      <Section title="Inventar">
        <div style={{ maxWidth: 360, marginBottom: 12 }}><Field label="Suche"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Komponente, Datei, Export" /></Field></div>
        <DataTable
          rows={entries}
          rowKey={(entry) => entry.id}
          empty="Keine Komponenten gefunden"
          columns={[
            { key: 'name', header: 'Komponente', render: (entry) => <div><strong>{entry.name}</strong><div><Muted>{entry.file}</Muted></div></div> },
            { key: 'category', header: 'Kategorie', render: (entry) => <Badge tone={entry.category === 'shared' ? 'blue' : entry.category === 'provider' ? 'warn' : ''}>{entry.category}</Badge> },
            { key: 'platforms', header: 'Plattform', render: (entry) => entry.platforms.join(' + ') },
            { key: 'exports', header: 'Exports', render: (entry) => entry.exports.map((item) => item.name).join(', ') },
            { key: 'previews', header: 'Preview', render: (entry) => entry.previews.length ? entry.previews.join(', ') : '—' },
            { key: 'usage', header: 'Verwendungen', render: (entry) => `${entry.usageCount} in ${entry.usedBy.length}` },
          ]}
        />
      </Section>
    </>
  );
}
