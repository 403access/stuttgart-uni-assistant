import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@ua/format';
import { Badge, Button, Checkbox, DataTable, Dialog, ErrorState, Field, Input, Muted, PageHeader, Pagination, Select, TextArea, useToast } from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZE = 50;
const EMPTY = { source: 'university', titleDe: '', titleEn: '', summaryDe: '', summaryEn: '', bodyDe: '', bodyEn: '', date: new Date().toISOString().slice(0, 10), published: false };

interface NewsItem {
  id: string;
  source: string;
  title: { de: string; en: string };
  summary: { de: string; en: string };
  body: { de: string; en: string };
  date: string;
  published: boolean;
  updatedAt: string;
}

export function NewsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [deleting, setDeleting] = useState<NewsItem | null>(null);

  const news = useQuery({ queryKey: ['news', search, state, page], queryFn: () => api.news({ query: search, state, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }) });
  const data = (news.data ?? {}) as any;
  const items: NewsItem[] = data.items ?? [];

  function edit(item?: NewsItem) {
    setEditing(item ?? null);
    setForm(item ? {
      source: item.source,
      titleDe: item.title.de,
      titleEn: item.title.en,
      summaryDe: item.summary.de,
      summaryEn: item.summary.en,
      bodyDe: item.body.de,
      bodyEn: item.body.en,
      date: item.date,
      published: item.published,
    } : { ...EMPTY });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: () => editing ? api.updateNews(editing.id, form) : api.createNews(form),
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.show(editing ? 'Meldung gespeichert.' : 'Meldung angelegt.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.', 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteNews(id),
    onSuccess: () => { setDeleting(null); queryClient.invalidateQueries({ queryKey: ['news'] }); toast.show('Meldung gelöscht.'); },
  });

  return (
    <>
      <PageHeader title="News" subtitle="Meldungen für die App veröffentlichen und bearbeiten" actions={<Button onClick={() => edit()}>Neue Meldung</Button>} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Titel, Text" /></Field></div>
        <Field label="Status"><Select value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}><option value="">Alle</option><option value="published">Veröffentlicht</option><option value="draft">Entwurf</option></Select></Field>
      </div>
      {news.error ? <ErrorState message={news.error instanceof Error ? news.error.message : 'News konnten nicht geladen werden.'} /> : (
        <DataTable
          rows={items}
          rowKey={(item) => item.id}
          loading={news.isLoading}
          empty="Keine Meldungen"
          columns={[
            { key: 'title', header: 'Titel', render: (item) => <div><strong>{item.title.de}</strong><div><Muted>{item.title.en || item.summary.de}</Muted></div></div> },
            { key: 'source', header: 'Quelle', render: (item) => item.source },
            { key: 'date', header: 'Datum', render: (item) => formatDate(item.date, 'de') },
            { key: 'state', header: 'Status', render: (item) => <Badge tone={item.published ? 'ok' : 'warn'}>{item.published ? 'veröffentlicht' : 'Entwurf'}</Badge> },
            { key: 'actions', header: '', render: (item) => <div style={{ display: 'flex', gap: 6 }}><Button variant="secondary" size="small" onClick={() => edit(item)}>Bearbeiten</Button><Button variant="danger" size="small" onClick={() => setDeleting(item)}>Löschen</Button></div> },
          ]}
        />
      )}
      <div style={{ marginTop: 12 }}><Pagination page={page} pageSize={PAGE_SIZE} total={data.total ?? 0} onPage={setPage} /></div>

      <Dialog open={open} title={editing ? 'Meldung bearbeiten' : 'Neue Meldung'} onClose={() => setOpen(false)} actions={<><Button variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button><Button disabled={!form.titleDe.trim() || !form.bodyDe.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Speichern …' : 'Speichern'}</Button></>}>
        <div style={{ display: 'grid', gap: 10, maxHeight: '65vh', overflow: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Titel (DE)"><Input value={form.titleDe} onChange={(event) => setForm({ ...form, titleDe: event.target.value })} /></Field>
            <Field label="Titel (EN)"><Input value={form.titleEn} onChange={(event) => setForm({ ...form, titleEn: event.target.value })} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Zusammenfassung (DE)"><TextArea rows={2} value={form.summaryDe} onChange={(event) => setForm({ ...form, summaryDe: event.target.value })} /></Field>
            <Field label="Zusammenfassung (EN)"><TextArea rows={2} value={form.summaryEn} onChange={(event) => setForm({ ...form, summaryEn: event.target.value })} /></Field>
          </div>
          <Field label="Text (DE)"><TextArea rows={5} value={form.bodyDe} onChange={(event) => setForm({ ...form, bodyDe: event.target.value })} /></Field>
          <Field label="Text (EN)"><TextArea rows={5} value={form.bodyEn} onChange={(event) => setForm({ ...form, bodyEn: event.target.value })} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Quelle"><Select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}><option value="university">Universität</option><option value="faculty">Fakultät</option><option value="institute">Institut</option><option value="stuvus">stuvus</option><option value="sdg">SDG Campus</option></Select></Field>
            <Field label="Datum"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
            <div style={{ display: 'flex', alignItems: 'end', paddingBottom: 8 }}><Checkbox label="Veröffentlicht" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /></div>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(deleting)} title="Meldung löschen?" onClose={() => setDeleting(null)} actions={<><Button variant="secondary" onClick={() => setDeleting(null)}>Abbrechen</Button><Button variant="danger" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Löschen</Button></>}>
        <p>{deleting?.title.de}</p>
      </Dialog>
    </>
  );
}
