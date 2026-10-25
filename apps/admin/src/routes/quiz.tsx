import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatTimestamp } from '@ua/format';
import { Badge, Button, Checkbox, DataTable, Dialog, ErrorState, Field, Input, Muted, PageHeader, Pagination, Select, StatCard, Tabs, TextArea, useToast } from '@ua/ui-react';
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
  published: false,
  sortOrder: 0,
};

export function QuizPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('topics');
  const [search, setSearch] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [published, setPublished] = useState('');
  const [page, setPage] = useState(1);
  const [topicOpen, setTopicOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [form, setForm] = useState<any>(EMPTY_TOPIC);
  const [deleting, setDeleting] = useState<Topic | null>(null);
  const [questionsFor, setQuestionsFor] = useState<Topic | null>(null);
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

  const stats = (overview.data ?? {}) as any;
  const modules = stats.modulesList ?? [];
  const topicData = (topics.data ?? {}) as any;
  const topicRows: Topic[] = topicData.items ?? [];
  const attemptData = (attempts.data ?? {}) as any;
  const sessionData = (sessions.data ?? {}) as any;

  function editTopic(topic?: Topic) {
    setEditing(topic ?? null);
    setForm(topic ? {
      id: topic.id,
      moduleId: topic.moduleId,
      titleDe: topic.title.de,
      titleEn: topic.title.en,
      summaryDe: topic.summary.de,
      summaryEn: topic.summary.en,
      meetingDe: '',
      meetingEn: '',
      sourceDe: '',
      sourceEn: '',
      published: topic.published,
      sortOrder: 0,
    } : { ...EMPTY_TOPIC, moduleId: modules[0]?.id ?? '' });
    setTopicOpen(true);
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      delete payload.id;
      if (editing && form.sortOrder === 0) delete payload.sortOrder;
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
    onSuccess: () => { setDeleting(null); queryClient.invalidateQueries({ queryKey: ['quiz'] }); toast.show('Thema gelöscht.'); },
  });
  const seed = useMutation({
    mutationFn: () => api.quizSeed(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quiz'] }); toast.show('Katalog neu eingespielt.'); },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Seed fehlgeschlagen.', 'error'),
  });

  if (overview.error) return <ErrorState message={overview.error instanceof Error ? overview.error.message : 'Lernquiz konnte nicht geladen werden.'} />;

  return (
    <>
      <PageHeader title="Lernquiz" subtitle="Themen, Fragen, Antworten und Runden" actions={<Button variant="secondary" disabled={seed.isPending} onClick={() => seed.mutate()}>{seed.isPending ? 'Seed …' : 'Katalog neu einspielen'}</Button>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard value={stats.modules ?? 0} label="Module" sub={`${stats.studies ?? 0} Studiengänge`} />
        <StatCard value={stats.topics ?? 0} label="Themen" sub={`${stats.publishedTopics ?? 0} veröffentlicht`} />
        <StatCard value={stats.questions ?? 0} label="Fragen" sub={`${stats.publishedQuestions ?? 0} veröffentlicht`} />
        <StatCard value={stats.attempts ?? 0} label="Antworten" sub={`${stats.today ?? 0} heute`} />
        <StatCard value={stats.users ?? 0} label="Nutzer mit Antworten" sub={`${stats.sessions ?? 0} Runden`} />
        <StatCard value={`${stats.accuracy ?? 0}%`} label="Trefferquote" sub={`${stats.correct ?? 0} richtig`} />
      </div>

      <div style={{ marginTop: 18 }}>
        <Tabs tabs={[{ id: 'topics', label: 'Themen' }, { id: 'attempts', label: 'Antworten' }, { id: 'sessions', label: 'Runden' }]} active={tab} onChange={setTab} />
      </div>

      {tab === 'topics' ? (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Thema, Modul, Zusammenfassung" /></Field></div>
            <Field label="Modul"><Select value={moduleId} onChange={(event) => { setModuleId(event.target.value); setPage(1); }}><option value="">Alle Module</option>{modules.map((module: any) => <option key={module.id} value={module.id}>{module.title.de} · {module.studyTitle.de}</option>)}</Select></Field>
            <Field label="Status"><Select value={published} onChange={(event) => { setPublished(event.target.value); setPage(1); }}><option value="">Alle</option><option value="1">Veröffentlicht</option><option value="0">Entwürfe</option></Select></Field>
            <div style={{ display: 'flex', alignItems: 'end' }}><Button onClick={() => editTopic()} disabled={!modules.length}>Neues Thema</Button></div>
          </div>
          <DataTable
            rows={topicRows}
            rowKey={(topic) => topic.id}
            loading={topics.isLoading}
            empty="Keine Themen"
            columns={[
              { key: 'title', header: 'Thema', render: (topic) => <div><strong>{topic.title.de}</strong><div><Muted>{topic.moduleTitle.de} · {topic.studyTitle.de}</Muted></div></div> },
              { key: 'state', header: 'Status', render: (topic) => <Badge tone={topic.published ? 'ok' : 'warn'}>{topic.published ? 'veröffentlicht' : 'Entwurf'}</Badge> },
              { key: 'questions', header: 'Fragen', render: (topic) => `${topic.publishedQuestions}/${topic.questionCount}` },
              { key: 'attempts', header: 'Antworten', render: (topic) => topic.attempts },
              { key: 'accuracy', header: 'Trefferquote', render: (topic) => `${topic.accuracy}%` },
              { key: 'updated', header: 'Aktualisiert', render: (topic) => formatTimestamp(topic.updatedAt, 'de') },
              { key: 'actions', header: '', render: (topic) => <div style={{ display: 'flex', gap: 6 }}><Button variant="secondary" size="small" onClick={() => setQuestionsFor(topic)}>Fragen</Button><Button variant="secondary" size="small" onClick={() => editTopic(topic)}>Bearbeiten</Button><Button variant="danger" size="small" onClick={() => setDeleting(topic)}>Löschen</Button></div> },
            ]}
          />
          <div style={{ marginTop: 12 }}><Pagination page={page} pageSize={PAGE_SIZE} total={topicData.total ?? 0} onPage={setPage} /></div>
        </>
      ) : null}

      {tab === 'attempts' ? (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={attemptSearch} onChange={(event) => { setAttemptSearch(event.target.value); setAttemptPage(1); }} placeholder="Konto, Thema, Frage" /></Field></div>
            <Field label="Ergebnis"><Select value={attemptCorrect} onChange={(event) => { setAttemptCorrect(event.target.value); setAttemptPage(1); }}><option value="">Alle</option><option value="1">Richtig</option><option value="0">Falsch</option></Select></Field>
            <div style={{ display: 'flex', alignItems: 'end' }}><a href={`/v1/admin/quiz/attempts/export.csv?query=${encodeURIComponent(attemptSearch)}&correct=${attemptCorrect}`}><Button variant="secondary">CSV exportieren</Button></a></div>
          </div>
          <DataTable
            rows={attemptData.items ?? []}
            rowKey={(attempt: any) => attempt.id}
            loading={attempts.isLoading}
            empty="Keine Antworten"
            columns={[
              { key: 'time', header: 'Zeit', render: (attempt: any) => formatTimestamp(attempt.answeredAt, 'de') },
              { key: 'account', header: 'Konto', render: (attempt: any) => attempt.account || 'anonym' },
              { key: 'topic', header: 'Thema', render: (attempt: any) => attempt.topicTitle?.de ?? '—' },
              { key: 'question', header: 'Frage', render: (attempt: any) => attempt.prompt?.de ?? '—' },
              { key: 'answer', header: 'Antwort', render: (attempt: any) => attempt.answerText ?? '—' },
              { key: 'correct', header: 'Ergebnis', render: (attempt: any) => <Badge tone={attempt.correct ? 'ok' : 'danger'}>{attempt.correct ? 'richtig' : 'falsch'}</Badge> },
            ]}
          />
          <div style={{ marginTop: 12 }}><Pagination page={attemptPage} pageSize={PAGE_SIZE} total={attemptData.total ?? 0} onPage={setAttemptPage} /></div>
        </>
      ) : null}

      {tab === 'sessions' ? (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: '1 1 240px' }}><Field label="Suche"><Input value={sessionSearch} onChange={(event) => { setSessionSearch(event.target.value); setSessionPage(1); }} placeholder="Konto, Thema" /></Field></div>
          </div>
          <DataTable
            rows={sessionData.items ?? []}
            rowKey={(session: any) => session.id}
            loading={sessions.isLoading}
            empty="Keine Runden"
            columns={[
              { key: 'time', header: 'Beendet', render: (session: any) => formatTimestamp(session.finishedAt, 'de') },
              { key: 'account', header: 'Konto', render: (session: any) => session.account || 'anonym' },
              { key: 'topic', header: 'Thema', render: (session: any) => session.topicTitle?.de ?? '—' },
              { key: 'mode', header: 'Modus', render: (session: any) => session.mode },
              { key: 'score', header: 'Ergebnis', render: (session: any) => `${session.correct}/${session.total} · ${session.accuracy}%` },
              { key: 'duration', header: 'Dauer', render: (session: any) => session.durationSeconds ? `${Math.round(session.durationSeconds / 60)} Min.` : '—' },
            ]}
          />
          <div style={{ marginTop: 12 }}><Pagination page={sessionPage} pageSize={PAGE_SIZE} total={sessionData.total ?? 0} onPage={setSessionPage} /></div>
        </>
      ) : null}

      <Dialog open={topicOpen} title={editing ? 'Thema bearbeiten' : 'Neues Thema'} onClose={() => setTopicOpen(false)} actions={<><Button variant="secondary" onClick={() => setTopicOpen(false)}>Abbrechen</Button><Button disabled={!form.moduleId || !form.titleDe.trim() || !form.summaryDe.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Speichern …' : 'Speichern'}</Button></>}>
        <div style={{ display: 'grid', gap: 10, maxHeight: '65vh', overflow: 'auto', paddingRight: 4 }}>
          <Field label="Modul"><Select value={form.moduleId} onChange={(event) => setForm({ ...form, moduleId: event.target.value })}><option value="">Modul wählen</option>{modules.map((module: any) => <option key={module.id} value={module.id}>{module.title.de}</option>)}</Select></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Titel (DE)"><Input value={form.titleDe} onChange={(event) => setForm({ ...form, titleDe: event.target.value })} /></Field>
            <Field label="Titel (EN)"><Input value={form.titleEn} onChange={(event) => setForm({ ...form, titleEn: event.target.value })} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Zusammenfassung (DE)"><TextArea rows={3} value={form.summaryDe} onChange={(event) => setForm({ ...form, summaryDe: event.target.value })} /></Field>
            <Field label="Zusammenfassung (EN)"><TextArea rows={3} value={form.summaryEn} onChange={(event) => setForm({ ...form, summaryEn: event.target.value })} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Sitzung (DE)"><Input value={form.meetingDe} onChange={(event) => setForm({ ...form, meetingDe: event.target.value })} /></Field>
            <Field label="Sitzung (EN)"><Input value={form.meetingEn} onChange={(event) => setForm({ ...form, meetingEn: event.target.value })} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Quelle (DE)"><Input value={form.sourceDe} onChange={(event) => setForm({ ...form, sourceDe: event.target.value })} /></Field>
            <Field label="Quelle (EN)"><Input value={form.sourceEn} onChange={(event) => setForm({ ...form, sourceEn: event.target.value })} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Checkbox label="Veröffentlicht" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            <Field label="Sortierung"><Input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} /></Field>
          </div>
          {editing ? <Muted>Fragen werden in der App gepflegt; diese Ansicht verwaltet das Thema und seine Sichtbarkeit.</Muted> : null}
        </div>
      </Dialog>

      <QuestionManagerDialog topic={questionsFor} onClose={() => setQuestionsFor(null)} />

      <Dialog open={Boolean(deleting)} title="Thema löschen?" onClose={() => setDeleting(null)} actions={<><Button variant="secondary" onClick={() => setDeleting(null)}>Abbrechen</Button><Button variant="danger" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Löschen</Button></>}>
        <p>{deleting?.title.de}</p>
      </Dialog>
    </>
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
  const questions = data.questions ?? [];

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
    onSuccess: () => { setDeleting(null); queryClient.invalidateQueries({ queryKey: ['quiz'] }); toast.show('Frage gelöscht.'); },
  });

  if (!topic) return null;

  return (
    <>
      <Dialog open title={`Fragen · ${topic.title.de}`} onClose={onClose} actions={<><Button variant="secondary" onClick={onClose}>Schließen</Button><Button onClick={() => open()}>Neue Frage</Button></>}>
        <div style={{ maxHeight: '65vh', overflow: 'auto' }}>
          <DataTable
            rows={questions}
            rowKey={(question: any) => question.id}
            loading={detail.isLoading}
            empty="Keine Fragen"
            columns={[
              { key: 'prompt', header: 'Frage', render: (question: any) => <div><strong>{question.prompt?.de ?? question.id}</strong><div><Muted>{question.kind} · {question.id}</Muted></div></div> },
              { key: 'difficulty', header: 'Stufe', render: (question: any) => question.difficulty },
              { key: 'published', header: 'Status', render: (question: any) => <Badge tone={question.published ? 'ok' : 'warn'}>{question.published ? 'veröffentlicht' : 'Entwurf'}</Badge> },
              { key: 'attempts', header: 'Antworten', render: (question: any) => `${question.attempts ?? 0} · ${question.accuracy ?? 0}%` },
              { key: 'actions', header: '', render: (question: any) => <div style={{ display: 'flex', gap: 6 }}><Button variant="secondary" size="small" onClick={() => open(question)}>Bearbeiten</Button><Button variant="danger" size="small" onClick={() => setDeleting(question)}>Löschen</Button></div> },
            ]}
          />
        </div>
      </Dialog>

      <Dialog open={Boolean(form)} title={editing ? 'Frage bearbeiten' : 'Neue Frage'} onClose={() => setForm(null)} actions={<><Button variant="secondary" onClick={() => setForm(null)}>Abbrechen</Button><Button disabled={!form?.promptDe?.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Speichern …' : 'Speichern'}</Button></>}>
        {form ? <div style={{ display: 'grid', gap: 10, maxHeight: '65vh', overflow: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Typ"><Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}><option value="single">Single Choice</option><option value="multiple">Multiple Choice</option><option value="true-false">Wahr/Falsch</option><option value="free-text">Freitext</option><option value="matching">Zuordnen</option><option value="ordering">Reihenfolge</option><option value="cloze">Lückentext</option><option value="map">Karte</option><option value="diagram">Diagramm</option><option value="flashcard">Karteikarte</option></Select></Field>
            <Field label="Schwierigkeit"><Select value={String(form.difficulty)} onChange={(event) => setForm({ ...form, difficulty: Number(event.target.value) })}><option value="1">1</option><option value="2">2</option><option value="3">3</option></Select></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Frage (DE)"><TextArea rows={2} value={form.promptDe} onChange={(event) => setForm({ ...form, promptDe: event.target.value })} /></Field>
            <Field label="Frage (EN)"><TextArea rows={2} value={form.promptEn} onChange={(event) => setForm({ ...form, promptEn: event.target.value })} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Hinweis (DE)"><Input value={form.hintDe} onChange={(event) => setForm({ ...form, hintDe: event.target.value })} /></Field>
            <Field label="Hinweis (EN)"><Input value={form.hintEn} onChange={(event) => setForm({ ...form, hintEn: event.target.value })} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Erklärung (DE)"><TextArea rows={2} value={form.explanationDe} onChange={(event) => setForm({ ...form, explanationDe: event.target.value })} /></Field>
            <Field label="Erklärung (EN)"><TextArea rows={2} value={form.explanationEn} onChange={(event) => setForm({ ...form, explanationEn: event.target.value })} /></Field>
          </div>
          <Field label="Payload (JSON)"><TextArea rows={10} value={form.payloadJson} onChange={(event) => setForm({ ...form, payloadJson: event.target.value })} /></Field>
          <Checkbox label="Veröffentlicht" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
          <Muted>Der Payload folgt dem Schema der gewählten Frageart. Die App-Ansicht validiert ihn beim Speichern.</Muted>
        </div> : null}
      </Dialog>

      <Dialog open={Boolean(deleting)} title="Frage löschen?" onClose={() => setDeleting(null)} actions={<><Button variant="secondary" onClick={() => setDeleting(null)}>Abbrechen</Button><Button variant="danger" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Löschen</Button></>}>
        <p>{deleting?.prompt?.de}</p>
      </Dialog>
    </>
  );
}
