import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { formatTimestamp } from '@ua/format';
import {
  Badge,
  BackLink,
  BarList,
  Button,
  Checkbox,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  Input,
  KpiGrid,
  Muted,
  Pagination,
  Section,
  Select,
  StatCard,
  TextArea,
  useToast,
} from '@ua/ui-react';
import { useState } from 'react';

import { api } from '../lib/api';

const PAGE_SIZE = 50;

interface Topic {
  id: string;
  moduleId: string;
  moduleTitle: { de: string };
  studyTitle: { de: string };
  title: { de: string; en: string };
  summary: { de: string; en: string };
  published: boolean;
  questionCount: number;
  publishedQuestions: number;
  attempts: number;
  accuracy: number;
  updatedAt: string;
}

const EMPTY_TOPIC = {
  id: '',
  moduleId: '',
  titleDe: '',
  titleEn: '',
  summaryDe: '',
  summaryEn: '',
  meetingDe: '',
  meetingEn: '',
  sourceDe: '',
  sourceEn: '',
  figureJson: '',
  published: false,
  sortOrder: 0,
};

export function QuizPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const routeSearch = useSearch({ strict: false }) as { view?: string };
  const tab = routeSearch.view === 'attempts' ? 'attempts' : routeSearch.view === 'sessions' ? 'sessions' : 'topics';
  const [search, setSearch] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [published, setPublished] = useState('');
  const [page, setPage] = useState(1);
  const [topicOpen, setTopicOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [form, setForm] = useState<any>(EMPTY_TOPIC);
  const [deleting, setDeleting] = useState<Topic | null>(null);
  const [questionsFor, setQuestionsFor] = useState<Topic | null>(null);
  const [moduleEditing, setModuleEditing] = useState<any | null>(null);
  const [moduleForm, setModuleForm] = useState<any>({});
  const [attemptSearch, setAttemptSearch] = useState('');
  const [attemptCorrect, setAttemptCorrect] = useState('');
  const [attemptPage, setAttemptPage] = useState(1);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionPage, setSessionPage] = useState(1);

  const overview = useQuery({ queryKey: ['quiz', 'overview'], queryFn: () => api.quizOverview() });
  const topics = useQuery({
    queryKey: ['quiz', 'topics', search, moduleId, published, page],
    queryFn: () => api.quizTopics({ query: search, moduleId, published, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const attempts = useQuery({
    queryKey: ['quiz', 'attempts', attemptSearch, attemptCorrect, attemptPage],
    queryFn: () => api.quizAttempts({ query: attemptSearch, correct: attemptCorrect, limit: PAGE_SIZE, offset: (attemptPage - 1) * PAGE_SIZE }),
    enabled: tab === 'attempts',
  });
  const sessions = useQuery({
    queryKey: ['quiz', 'sessions', sessionSearch, sessionPage],
    queryFn: () => api.quizSessions({ query: sessionSearch, limit: PAGE_SIZE, offset: (sessionPage - 1) * PAGE_SIZE }),
    enabled: tab === 'sessions',
  });

  function changeTab(next: 'topics' | 'attempts' | 'sessions') {
    navigate({ to: '/quiz', search: next === 'topics' ? {} : { view: next } });
  }

  const stats = (overview.data ?? {}) as any;
  const modules: any[] = stats.modulesList ?? [];
  const topicData = (topics.data ?? {}) as any;
  const topicRows: Topic[] = topicData.items ?? [];
  const attemptData = (attempts.data ?? {}) as any;
  const sessionData = (sessions.data ?? {}) as any;

  async function editTopic(topic?: Topic) {
    setEditing(topic ?? null);
    if (!topic) {
      setForm({ ...EMPTY_TOPIC, moduleId: modules[0]?.id ?? '' });
      setTopicOpen(true);
      return;
    }
    try {
      const detail = await api.quizTopic(topic.id) as any;
      const item = detail.topic ?? detail;
      setForm({
        id: item.id,
        moduleId: item.moduleId,
        titleDe: item.title?.de ?? '',
        titleEn: item.title?.en ?? '',
        summaryDe: item.summary?.de ?? '',
        summaryEn: item.summary?.en ?? '',
        meetingDe: item.meeting?.de ?? '',
        meetingEn: item.meeting?.en ?? '',
        sourceDe: item.source?.de ?? '',
        sourceEn: item.source?.en ?? '',
        figureJson: item.figureJson ?? (item.figure ? JSON.stringify(item.figure, null, 2) : ''),
        published: Boolean(item.published),
        sortOrder: Number(item.sortOrder) || 0,
      });
      setTopicOpen(true);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Thema konnte nicht geladen werden.', 'error');
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        moduleId: form.moduleId,
        titleDe: form.titleDe,
        titleEn: form.titleEn,
        summaryDe: form.summaryDe,
        summaryEn: form.summaryEn,
        meetingDe: form.meetingDe,
        meetingEn: form.meetingEn,
        sourceDe: form.sourceDe,
        sourceEn: form.sourceEn,
        published: form.published,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const figure = String(form.figureJson ?? '').trim();
      if (figure) payload.figure = figure;
      else if (editing) payload.figure = null;
      return editing ? api.quizUpdateTopic(editing.id, payload) : api.quizCreateTopic(payload);
    },
    onSuccess: () => {
      setTopicOpen(false);
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      toast.show(editing ? 'Thema gespeichert.' : 'Thema angelegt.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.', 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.quizDeleteTopic(id),
    onSuccess: () => {
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      toast.show('Thema gelöscht.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Löschen fehlgeschlagen.', 'error'),
  });
  const seed = useMutation({
    mutationFn: () => api.quizSeed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      toast.show('Katalog neu eingespielt.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Seed fehlgeschlagen.', 'error'),
  });
  const saveModule = useMutation({
    mutationFn: () => api.quizUpdateModule(moduleEditing.id, {
      titleDe: moduleForm.titleDe,
      titleEn: moduleForm.titleEn,
      subtitleDe: moduleForm.subtitleDe,
      subtitleEn: moduleForm.subtitleEn,
      semester: Number(moduleForm.semester) || 1,
      lecturer: moduleForm.lecturer,
      email: moduleForm.email,
      published: moduleForm.published,
    }),
    onSuccess: () => {
      setModuleEditing(null);
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      toast.show('Modul gespeichert.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Modul konnte nicht gespeichert werden.', 'error'),
  });

  function editModule(module: any) {
    setModuleEditing(module);
    setModuleForm({
      titleDe: module.title?.de ?? '',
      titleEn: module.title?.en ?? '',
      subtitleDe: module.subtitle?.de ?? '',
      subtitleEn: module.subtitle?.en ?? '',
      semester: module.semester ?? 1,
      lecturer: module.lecturer ?? '',
      email: module.email ?? '',
      published: Boolean(module.published),
    });
  }

  if (overview.error) {
    return <ErrorState message={overview.error instanceof Error ? overview.error.message : 'Lernquiz konnte nicht geladen werden.'} />;
  }

  const kpis = [
    { icon: 'grid', tone: 'blue', value: stats.modules ?? 0, label: 'Module', sub: `${stats.studies ?? 0} Studiengänge`, onClick: () => changeTab('topics') },
    { icon: 'list', tone: 'cyan', value: stats.topics ?? 0, label: 'Themen', sub: `${stats.publishedTopics ?? 0} veröffentlicht`, onClick: () => changeTab('topics') },
    { icon: 'info', tone: 'purple', value: stats.questions ?? 0, label: 'Fragen', sub: `${stats.publishedQuestions ?? 0} veröffentlicht`, onClick: () => changeTab('topics') },
    { icon: 'check-circle', tone: 'green', value: stats.attempts ?? 0, label: 'Antworten', sub: `${stats.today ?? 0} heute`, onClick: () => changeTab('attempts') },
    { icon: 'users', tone: 'amber', value: stats.users ?? 0, label: 'Nutzer mit Antworten', sub: `${stats.sessions ?? 0} Runden`, onClick: () => changeTab('attempts') },
    { icon: 'activity', tone: 'red', value: `${stats.accuracy ?? 0}%`, label: 'Trefferquote', sub: `${stats.correct ?? 0} richtig`, onClick: () => changeTab('attempts') },
  ];

  return (
    <div className="view-stack">
      <KpiGrid>
        {kpis.map((item) => (
          <StatCard
            key={item.label}
            icon={item.icon}
            tone={item.tone}
            value={item.value}
            label={item.label}
            sub={item.sub}
            href="/quiz"
            onNavigate={item.onClick}
          />
        ))}
      </KpiGrid>

      {tab === 'topics' ? (
        <>
          <section className="card toolbar" aria-label="Quizfilter">
            <label className="field grow">
              Suche
              <div className="search-field">
                <span className="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder="Thema, Modul oder Zusammenfassung"
                  autoComplete="off"
                />
              </div>
            </label>
            <Field label="Modul">
              <Select value={moduleId} onChange={(event) => { setModuleId(event.target.value); setPage(1); }}>
                <option value="">Alle Module</option>
                {modules.map((module: any) => (
                  <option key={module.id} value={module.id}>{module.title.de} · {module.studyTitle?.de}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={published} onChange={(event) => { setPublished(event.target.value); setPage(1); }}>
                <option value="">Alle Status</option>
                <option value="1">Veröffentlicht</option>
                <option value="0">Entwürfe</option>
              </Select>
            </Field>
            <Button onClick={() => editTopic()} disabled={!modules.length}>Thema anlegen</Button>
          </section>

          <section className="card table-card">
            <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">Quiz-Themen</caption>
                <thead>
                  <tr>
                    <th>Thema</th>
                    <th>Fragen</th>
                    <th>Antworten</th>
                    <th>Treffer</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {topics.isLoading ? (
                    <tr><td colSpan={6}><div className="loading">Lernquiz wird geladen …</div></td></tr>
                  ) : topicRows.length ? (
                    topicRows.map((topic) => (
                      <tr key={topic.id}>
                        <td>
                          <a
                            href={`/quiz/${topic.id}`}
                            style={{ color: 'inherit' }}
                            onClick={(event) => { event.preventDefault(); setQuestionsFor(topic); }}
                          >
                            <strong>{topic.title.de}</strong>
                          </a>
                          <div className="hint">{topic.moduleTitle?.de} · {topic.studyTitle?.de}</div>
                        </td>
                        <td>
                          <Badge tone={topic.published ? 'ok' : 'warn'}>
                            {topic.publishedQuestions}/{topic.questionCount} Fragen
                          </Badge>
                        </td>
                        <td>{topic.attempts}</td>
                        <td>{topic.attempts ? <Badge tone={topic.accuracy >= 70 ? 'ok' : 'warn'}>{topic.accuracy}%</Badge> : '–'}</td>
                        <td>{topic.published ? <Badge tone="ok">veröffentlicht</Badge> : <Badge tone="warn">Entwurf</Badge>}</td>
                        <td>
                          <div className="row tight">
                            <Button variant="secondary" size="small" onClick={() => setQuestionsFor(topic)}>Öffnen</Button>
                            <Button variant="secondary" size="small" onClick={() => editTopic(topic)}>Bearbeiten</Button>
                            <Button variant="danger" size="small" onClick={() => setDeleting(topic)}>Löschen</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">
                          <strong>Keine Themen</strong>
                          <p>Lege das erste Thema an oder ändere den Filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={topicData.total ?? 0} onPage={setPage} />
          </section>

          <Section
            title="Module"
            subtitle="Module sind aus dem App-Katalog importiert und lassen sich hier bearbeiten."
            actions={
              <Button variant="secondary" size="small" disabled={seed.isPending} onClick={() => seed.mutate()}>
                {seed.isPending ? 'Importiere …' : 'Katalog neu importieren'}
              </Button>
            }
          >
            <DataTable
              plain
              rows={modules}
              rowKey={(module: any) => module.id}
              empty="Keine Module"
              columns={[
                {
                  key: 'module',
                  header: 'Modul',
                  render: (module: any) => (
                    <div>
                      <strong>{module.title?.de}</strong>
                      <div className="hint">{module.studyTitle?.de} · {module.semester}. Semester</div>
                    </div>
                  ),
                },
                { key: 'topics', header: 'Themen', render: (module: any) => module.topics ?? 0 },
                { key: 'questions', header: 'Fragen', render: (module: any) => module.questions ?? 0 },
                { key: 'attempts', header: 'Antworten', render: (module: any) => module.attempts ?? 0 },
                {
                  key: 'accuracy',
                  header: 'Treffer',
                  render: (module: any) => (module.attempts ? <Badge tone={(module.accuracy ?? 0) >= 70 ? 'ok' : 'warn'}>{module.accuracy ?? 0}%</Badge> : '–'),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (module: any) => (
                    <div className="row tight">
                      <Button variant="secondary" size="small" onClick={() => { setModuleId(module.id); setPage(1); }}>Themen filtern</Button>
                      <Button variant="secondary" size="small" onClick={() => editModule(module)}>Bearbeiten</Button>
                    </div>
                  ),
                },
              ]}
            />
          </Section>

          <Section
            title="Antworten"
            subtitle="Jede geprüfte Antwort mit Nutzer, Frage und Ergebnis."
            actions={
              <div className="row tight">
                <Button variant="secondary" size="small" onClick={() => changeTab('attempts')}>Alle Antworten</Button>
                <Button variant="secondary" size="small" onClick={() => changeTab('sessions')}>Runden</Button>
              </div>
            }
          >
            {stats.lastAttemptAt ? (
              <p className="hint">
                Letzte Antwort: {formatTimestamp(stats.lastAttemptAt, 'de')} · {stats.today ?? 0} heute · {stats.users ?? 0} Nutzer
              </p>
            ) : (
              <p className="hint">Noch keine Antworten synchronisiert.</p>
            )}
            {stats.topTopics?.length ? (
              <BarList
                items={stats.topTopics.map((topic: any) => ({
                  label: `${topic.title?.de} · ${topic.accuracy ?? 0}%`,
                  count: topic.attempts ?? 0,
                }))}
              />
            ) : null}
          </Section>
        </>
      ) : null}

      {tab === 'attempts' ? (
        <>
          <BackLink href="/quiz" onNavigate={() => changeTab('topics')}>Zurück zum Katalog</BackLink>
          <section className="card toolbar" aria-label="Antwortfilter">
            <label className="field grow">
              Suche
              <div className="search-field">
                <span className="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
                </span>
                <input
                  type="search"
                  value={attemptSearch}
                  onChange={(event) => { setAttemptSearch(event.target.value); setAttemptPage(1); }}
                  placeholder="Konto, Thema, Frage"
                />
              </div>
            </label>
            <Field label="Ergebnis">
              <Select value={attemptCorrect} onChange={(event) => { setAttemptCorrect(event.target.value); setAttemptPage(1); }}>
                <option value="">Alle</option>
                <option value="1">Richtig</option>
                <option value="0">Falsch</option>
              </Select>
            </Field>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = `/v1/admin/quiz/attempts/export.csv?query=${encodeURIComponent(attemptSearch)}&correct=${attemptCorrect}`;
              }}
            >
              CSV exportieren
            </Button>
          </section>
          <DataTable
            rows={attemptData.items ?? []}
            rowKey={(attempt: any) => attempt.id}
            loading={attempts.isLoading}
            empty="Keine Antworten"
            footer={<Pagination page={attemptPage} pageSize={PAGE_SIZE} total={attemptData.total ?? 0} onPage={setAttemptPage} />}
            columns={[
              { key: 'time', header: 'Zeit', render: (attempt: any) => formatTimestamp(attempt.answeredAt, 'de') },
              { key: 'account', header: 'Konto', render: (attempt: any) => attempt.account || 'anonym' },
              { key: 'topic', header: 'Thema', render: (attempt: any) => attempt.topicTitle?.de ?? '—' },
              { key: 'question', header: 'Frage', render: (attempt: any) => attempt.prompt?.de ?? '—' },
              { key: 'answer', header: 'Antwort', render: (attempt: any) => attempt.answerText ?? '—' },
              { key: 'correct', header: 'Ergebnis', render: (attempt: any) => <Badge tone={attempt.correct ? 'ok' : 'danger'}>{attempt.correct ? 'richtig' : 'falsch'}</Badge> },
            ]}
          />
        </>
      ) : null}

      {tab === 'sessions' ? (
        <>
          <BackLink href="/quiz" onNavigate={() => changeTab('topics')}>Zurück zum Katalog</BackLink>
          <section className="card toolbar" aria-label="Rundenfilter">
            <label className="field grow">
              Suche
              <div className="search-field">
                <span className="icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
                </span>
                <input
                  type="search"
                  value={sessionSearch}
                  onChange={(event) => { setSessionSearch(event.target.value); setSessionPage(1); }}
                  placeholder="Konto, Thema"
                />
              </div>
            </label>
          </section>
          <DataTable
            rows={sessionData.items ?? []}
            rowKey={(session: any) => session.id}
            loading={sessions.isLoading}
            empty="Keine Runden"
            footer={<Pagination page={sessionPage} pageSize={PAGE_SIZE} total={sessionData.total ?? 0} onPage={setSessionPage} />}
            columns={[
              { key: 'time', header: 'Beendet', render: (session: any) => formatTimestamp(session.finishedAt, 'de') },
              { key: 'account', header: 'Konto', render: (session: any) => session.account || 'anonym' },
              { key: 'topic', header: 'Thema', render: (session: any) => session.topicTitle?.de ?? '—' },
              { key: 'mode', header: 'Modus', render: (session: any) => session.mode },
              { key: 'score', header: 'Ergebnis', render: (session: any) => `${session.correct}/${session.total} · ${session.accuracy}%` },
              { key: 'duration', header: 'Dauer', render: (session: any) => session.durationSeconds ? `${Math.round(session.durationSeconds / 60)} Min.` : '—' },
            ]}
          />
        </>
      ) : null}

      <Dialog
        open={topicOpen}
        title={editing ? 'Thema bearbeiten' : 'Neues Thema'}
        wide
        onClose={() => setTopicOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setTopicOpen(false)}>Abbrechen</Button>
            <Button
              disabled={!form.moduleId || !String(form.titleDe).trim() || !String(form.summaryDe).trim() || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Speichern …' : 'Speichern'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Modul">
            <Select value={form.moduleId} onChange={(event) => setForm({ ...form, moduleId: event.target.value })}>
              <option value="">Modul wählen</option>
              {modules.map((module: any) => <option key={module.id} value={module.id}>{module.title.de}</option>)}
            </Select>
          </Field>
          <Field label="Sortierung">
            <Input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
          </Field>
          <Field label="Titel (DE)"><Input value={form.titleDe} onChange={(event) => setForm({ ...form, titleDe: event.target.value })} /></Field>
          <Field label="Titel (EN)"><Input value={form.titleEn} onChange={(event) => setForm({ ...form, titleEn: event.target.value })} /></Field>
          <Field label="Zusammenfassung (DE)"><TextArea rows={3} value={form.summaryDe} onChange={(event) => setForm({ ...form, summaryDe: event.target.value })} /></Field>
          <Field label="Zusammenfassung (EN)"><TextArea rows={3} value={form.summaryEn} onChange={(event) => setForm({ ...form, summaryEn: event.target.value })} /></Field>
          <Field label="Sitzung (DE)"><Input value={form.meetingDe} onChange={(event) => setForm({ ...form, meetingDe: event.target.value })} /></Field>
          <Field label="Sitzung (EN)"><Input value={form.meetingEn} onChange={(event) => setForm({ ...form, meetingEn: event.target.value })} /></Field>
          <Field label="Quelle (DE)"><Input value={form.sourceDe} onChange={(event) => setForm({ ...form, sourceDe: event.target.value })} /></Field>
          <Field label="Quelle (EN)"><Input value={form.sourceEn} onChange={(event) => setForm({ ...form, sourceEn: event.target.value })} /></Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Abbildung (JSON, optional)">
              <TextArea rows={5} value={form.figureJson} onChange={(event) => setForm({ ...form, figureJson: event.target.value })} spellCheck={false} />
            </Field>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Checkbox label="Veröffentlicht" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
          </div>
        </div>
        {editing ? <Muted>Fragen werden über „Öffnen“ verwaltet.</Muted> : null}
      </Dialog>

      <Dialog
        open={Boolean(moduleEditing)}
        title="Modul bearbeiten"
        onClose={() => setModuleEditing(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setModuleEditing(null)}>Abbrechen</Button>
            <Button disabled={saveModule.isPending || !String(moduleForm.titleDe).trim()} onClick={() => saveModule.mutate()}>
              {saveModule.isPending ? 'Speichern …' : 'Speichern'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Titel (Deutsch)"><Input value={moduleForm.titleDe} onChange={(event) => setModuleForm({ ...moduleForm, titleDe: event.target.value })} /></Field>
          <Field label="Titel (Englisch)"><Input value={moduleForm.titleEn} onChange={(event) => setModuleForm({ ...moduleForm, titleEn: event.target.value })} /></Field>
          <Field label="Untertitel (Deutsch)"><TextArea rows={2} value={moduleForm.subtitleDe} onChange={(event) => setModuleForm({ ...moduleForm, subtitleDe: event.target.value })} /></Field>
          <Field label="Untertitel (Englisch)"><TextArea rows={2} value={moduleForm.subtitleEn} onChange={(event) => setModuleForm({ ...moduleForm, subtitleEn: event.target.value })} /></Field>
          <Field label="Semester"><Input type="number" min={1} max={20} value={moduleForm.semester} onChange={(event) => setModuleForm({ ...moduleForm, semester: Number(event.target.value) })} /></Field>
          <Field label="Dozent"><Input value={moduleForm.lecturer} onChange={(event) => setModuleForm({ ...moduleForm, lecturer: event.target.value })} /></Field>
          <Field label="E-Mail"><Input type="email" value={moduleForm.email} onChange={(event) => setModuleForm({ ...moduleForm, email: event.target.value })} /></Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Checkbox label="Im App-Katalog veröffentlichen" checked={moduleForm.published} onChange={(event) => setModuleForm({ ...moduleForm, published: event.target.checked })} />
          </div>
        </div>
      </Dialog>

      <QuestionManagerDialog topic={questionsFor} onClose={() => setQuestionsFor(null)} />

      <Dialog
        open={Boolean(deleting)}
        title="Thema löschen?"
        onClose={() => setDeleting(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Abbrechen</Button>
            <Button variant="danger" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Löschen</Button>
          </>
        }
      >
        <p>{deleting?.title.de} und alle zugehörigen Fragen werden entfernt.</p>
      </Dialog>
    </div>
  );
}

function QuestionManagerDialog({ topic, onClose }: { topic: Topic | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const detail = useQuery({
    queryKey: ['quiz', 'topic', topic?.id],
    queryFn: () => api.quizTopic(topic!.id),
    enabled: Boolean(topic),
  });
  const data = (detail.data ?? {}) as any;
  const questions = data.topic?.questions ?? data.questions ?? [];

  function open(question?: any) {
    setEditing(question ?? null);
    setForm(question ? {
      kind: question.kind,
      difficulty: question.difficulty ?? 2,
      promptDe: question.prompt?.de ?? '',
      promptEn: question.prompt?.en ?? '',
      hintDe: question.hint?.de ?? '',
      hintEn: question.hint?.en ?? '',
      explanationDe: question.explanation?.de ?? '',
      explanationEn: question.explanation?.en ?? '',
      payloadJson: JSON.stringify(question.payload ?? {}, null, 2),
      published: Boolean(question.published),
    } : {
      kind: 'single',
      difficulty: 2,
      promptDe: '',
      promptEn: '',
      hintDe: '',
      hintEn: '',
      explanationDe: '',
      explanationEn: '',
      payloadJson: '{\n  "options": [],\n  "correct": ""\n}',
      published: false,
    });
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = JSON.parse(form.payloadJson);
      const body = {
        topicId: topic!.id,
        kind: form.kind,
        difficulty: Number(form.difficulty),
        promptDe: form.promptDe,
        promptEn: form.promptEn,
        hintDe: form.hintDe,
        hintEn: form.hintEn,
        explanationDe: form.explanationDe,
        explanationEn: form.explanationEn,
        payload,
        published: form.published,
      };
      return editing ? api.quizUpdateQuestion(editing.id, body) : api.quizCreateQuestion(body);
    },
    onSuccess: () => {
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      toast.show(editing ? 'Frage gespeichert.' : 'Frage angelegt.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Frage konnte nicht gespeichert werden.', 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.quizDeleteQuestion(id),
    onSuccess: () => {
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      toast.show('Frage gelöscht.');
    },
  });

  if (!topic) return null;

  return (
    <>
      <Dialog
        open
        wide
        width="min(1040px, calc(100vw - 28px))"
        title={`Fragen · ${topic.title.de}`}
        onClose={onClose}
        actions={
          <>
            <Button variant="secondary" onClick={onClose}>Schließen</Button>
            <Button onClick={() => open()}>Neue Frage</Button>
          </>
        }
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Frage</th><th>Stufe</th><th>Status</th><th>Antworten</th><th /></tr>
            </thead>
            <tbody>
              {detail.isLoading ? (
                <tr><td colSpan={5}><div className="loading">Fragen werden geladen …</div></td></tr>
              ) : questions.length ? questions.map((question: any) => (
                <tr key={question.id}>
                  <td>
                    <strong>{question.prompt?.de ?? question.id}</strong>
                    <div className="hint">{question.kind} · {question.id}</div>
                  </td>
                  <td>{question.difficulty}</td>
                  <td>{question.published ? <Badge tone="ok">veröffentlicht</Badge> : <Badge tone="warn">Entwurf</Badge>}</td>
                  <td>{question.attempts ?? 0} · {question.accuracy ?? 0}%</td>
                  <td>
                    <div className="row tight">
                      <Button variant="secondary" size="small" onClick={() => open(question)}>Bearbeiten</Button>
                      <Button variant="danger" size="small" onClick={() => setDeleting(question)}>Löschen</Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}><div className="empty"><strong>Keine Fragen</strong><p>Lege die erste Frage für dieses Thema an.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(form)}
        wide
        title={editing ? 'Frage bearbeiten' : 'Neue Frage'}
        onClose={() => setForm(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>Abbrechen</Button>
            <Button disabled={!form?.promptDe?.trim() || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Speichern …' : 'Speichern'}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Field label="Typ">
              <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
                <option value="single">Single Choice</option>
                <option value="multiple">Multiple Choice</option>
                <option value="true-false">Wahr/Falsch</option>
                <option value="free-text">Freitext</option>
                <option value="matching">Zuordnen</option>
                <option value="ordering">Reihenfolge</option>
                <option value="cloze">Lückentext</option>
                <option value="map">Karte</option>
                <option value="diagram">Diagramm</option>
                <option value="flashcard">Karteikarte</option>
              </Select>
            </Field>
            <Field label="Schwierigkeit">
              <Select value={String(form.difficulty)} onChange={(event) => setForm({ ...form, difficulty: Number(event.target.value) })}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </Select>
            </Field>
            <Field label="Frage (DE)"><TextArea rows={2} value={form.promptDe} onChange={(event) => setForm({ ...form, promptDe: event.target.value })} /></Field>
            <Field label="Frage (EN)"><TextArea rows={2} value={form.promptEn} onChange={(event) => setForm({ ...form, promptEn: event.target.value })} /></Field>
            <Field label="Hinweis (DE)"><Input value={form.hintDe} onChange={(event) => setForm({ ...form, hintDe: event.target.value })} /></Field>
            <Field label="Hinweis (EN)"><Input value={form.hintEn} onChange={(event) => setForm({ ...form, hintEn: event.target.value })} /></Field>
            <Field label="Erklärung (DE)"><TextArea rows={2} value={form.explanationDe} onChange={(event) => setForm({ ...form, explanationDe: event.target.value })} /></Field>
            <Field label="Erklärung (EN)"><TextArea rows={2} value={form.explanationEn} onChange={(event) => setForm({ ...form, explanationEn: event.target.value })} /></Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Payload (JSON)">
                <TextArea rows={10} value={form.payloadJson} onChange={(event) => setForm({ ...form, payloadJson: event.target.value })} spellCheck={false} />
              </Field>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Checkbox label="Veröffentlicht" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            </div>
            <Muted>Der Payload folgt dem Schema der gewählten Frageart. Die App-Ansicht validiert ihn beim Speichern.</Muted>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        title="Frage löschen?"
        onClose={() => setDeleting(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Abbrechen</Button>
            <Button variant="danger" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Löschen</Button>
          </>
        }
      >
        <p>{deleting?.prompt?.de}</p>
      </Dialog>
    </>
  );
}
