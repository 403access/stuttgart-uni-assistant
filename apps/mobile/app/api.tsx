import { useState } from 'react';
import { Stack } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Text, TextInput } from 'react-native';

import { fetchApiCatalog, sendApiOperation, type ApiCallResult, type ApiOperation } from '@/src/auth/api';
import { asCampusCourses, asCampusStudies, asCurriculumNodes, type CampusLogin } from '@/src/auth/campus';
import { asAuthSession } from '@/src/auth/session';
import type { CampusCourse } from '@/src/types';
import { Button, Card, InfoRow, Muted, Screen, Section } from '@/src/components/ui';
import { keys } from '@/src/query/keys';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

function summary(locale: 'de' | 'en', id: string): string {
  if (id === 'health') return tx(locale, 'api.serverstatus');
  if (id === 'campus-config') return tx(locale, 'api.ob_token');
  if (id === 'oidc-config') return tx(locale, 'api.ob');
  if (id === 'campus-login') return tx(locale, 'api.laedt');
  if (id === 'campus-structure') return tx(locale, 'api.dieselbe');
  if (id === 'campus-studies') return tx(locale, 'api.listet');
  if (id === 'campus-courses') return tx(locale, 'api.lehrveranstaltungen_curriculum');
  if (id === 'campus-course-groups') return tx(locale, 'api.gruppen');
  if (id === 'assist') return tx(locale, 'api.kurze');
  if (id === 'oidc-start') return tx(locale, 'api.startet');
  if (id === 'oidc-exchange') return tx(locale, 'api.tauscht');
  if (id === 'oidc-logout') return tx(locale, 'api.beendet');
  return id;
}

function preview(value: unknown): string {
  const text = JSON.stringify(value, null, 2) ?? '';
  return text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
}

export default function ApiScreen() {
  const locale = useAppSelector((state) => state.locale);
  const curriculumNodes = useAppSelector((state) => state.curriculumNodes);
  const campusStudies = useAppSelector((state) => state.campusStudies);
  const activeStudyId = useAppSelector((state) => state.activeStudyId);
  const { setCurriculum, setStudies, setActiveStudy, signInCampus } = appActions;
  // The catalog fetch never fails here: it answers the bundled fallback with
  // `live: false`, which the screen renders as the stale-list hint.
  const catalog = useQuery({ queryKey: keys.catalog(), queryFn: () => fetchApiCatalog() });
  const operations = catalog.data?.operations ?? [];
  const live = catalog.data?.live ?? false;
  const [elementId, setElementId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [result, setResult] = useState<ApiCallResult | null>(null);
  const [notice, setNotice] = useState('');
  const [coursesPreview, setCoursesPreview] = useState<CampusCourse[]>([]);

  // Replays as one mutation: the busy flag comes from `isPending`, and the
  // portal-result handling (adopting nodes, studies, courses) lives in the hook.
  const sendMutation = useMutation({
    mutationKey: ['api-replay'],
    mutationFn: (vars: { operation: ApiOperation; payload: number | { elementId?: number; studyId?: number } | undefined }) =>
      sendApiOperation(vars.operation, vars.payload, locale),
    onMutate: () => {
      setResult(null);
      setNotice('');
    },
    onSuccess: (next, vars) => {
      const operation = vars.operation;
      setResult(next);
      const failure = (next.body ?? {}) as { error?: unknown; detail?: unknown };
      const error = typeof failure.error === 'string' ? failure.error : '';
      const detail = typeof failure.detail === 'string' ? failure.detail : '';
      const withDetail = detail ? ` (${detail})` : '';
      if (error === 'invalid_token') {
        setNotice(
          tx(locale, 'api.c', [withDetail]),
        );
        return;
      }
      if (next.status !== 200 && error) {
        setNotice(`${error}${withDetail}`);
        return;
      }
      if (operation.id === 'campus-login' && next.status === 200) {
        const body = next.body as Partial<CampusLogin>;
        const nodes = asCurriculumNodes(body.nodes);
        const studies = asCampusStudies(body.studies);
        if (body.account && body.name)
          signInCampus({ account: body.account, name: body.name, nodes, studyId: typeof body.studyId === 'number' ? body.studyId : null, studies: studies.length ? studies : undefined, auth: asAuthSession(body) ?? undefined });
        setNotice(
          body.name
            ? studies.length
              ? tx(locale, 'api.knoten_studiengaenge', [body.name, nodes.length, studies.length])
              : tx(locale, 'api.knoten', [body.name, nodes.length])
            : tx(locale, 'api.anmeldung'),
        );
      }
      if (operation.id === 'campus-structure' && next.status === 200) {
        const nodes = asCurriculumNodes((next.body as { nodes?: unknown }).nodes);
        if (nodes.length) setCurriculum(nodes);
        setNotice(tx(locale, 'api.knoten_uebernommen', [nodes.length]));
      }
      if (operation.id === 'campus-studies' && next.status === 200) {
        const studies = asCampusStudies((next.body as { studies?: unknown }).studies);
        if (studies.length) setStudies(studies);
        setNotice(tx(locale, 'api.studiengaenge_uebernommen', [studies.length]));
      }
      if (operation.id === 'campus-courses' && next.status === 200) {
        const courses = asCampusCourses((next.body as { courses?: unknown }).courses);
        setCoursesPreview(courses);
        setNotice(
          courses.length
            ? tx(locale, 'api.lehrveranstaltungen_2', [courses.length])
            : tx(locale, 'common.lehrveranstaltungen'),
        );
      }
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setResult(null);
      setNotice(
        code === 'server_unreachable'
          ? tx(locale, 'api.server')
          : code,
      );
    },
  });
  const busyId = sendMutation.isPending ? (sendMutation.variables?.operation.id ?? '') : '';

  function send(operation: ApiOperation, requestedId?: number) {
    if (sendMutation.isPending) return;
    // Course groups take a course id instead of an element id.
    const typed = requestedId ?? (operation.acceptsCourseId ? Number(courseId) || undefined : elementId ? Number(elementId) : undefined);
    if (operation.acceptsElementId && elementId && !requestedId && !/^[1-9]\d{0,9}$/.test(elementId)) {
      setNotice(tx(locale, 'api.element'));
      return;
    }
    if (operation.acceptsCourseId && courseId && !requestedId && !/^[1-9]\d{0,9}$/.test(courseId)) {
      setNotice(tx(locale, 'api.kurs'));
      return;
    }
    // Courses belong to one study: replay with the selected study when set.
    const payload = operation.id === 'campus-courses' && typeof typed === 'number' && activeStudyId !== null ? { elementId: typed, studyId: activeStudyId } : typed;
    sendMutation.mutate({ operation, payload });
  }

  return (
    <Screen
      kicker="API"
      subtitle={tx(locale, 'api.token')}
    >
      <Stack.Screen options={{ title: tx(locale, 'common.schnittstelle') }} />
      {live ? null : (
        <Muted>
          {tx(locale, 'api.liste')}
        </Muted>
      )}
      <Section title={tx(locale, 'api.aufrufe')} />
      {operations.map((operation) => (
        <Card key={operation.id}>
          <Text style={styles.method}>
            {operation.method} {operation.path}
          </Text>
          <Muted>{summary(locale, operation.id)}</Muted>
          {operation.acceptsElementId ? (
            <TextInput
              value={elementId}
              onChangeText={setElementId}
              keyboardType="number-pad"
              placeholder={tx(locale, 'api.element_id')}
              placeholderTextColor={colors.mute}
              style={styles.input}
            />
          ) : operation.acceptsCourseId ? (
            <TextInput
              value={courseId}
              onChangeText={setCourseId}
              keyboardType="number-pad"
              placeholder={tx(locale, 'api.kurs_id')}
              placeholderTextColor={colors.mute}
              style={styles.input}
            />
          ) : null}
          {operation.replay ? (
            <Button
              label={busyId === operation.id ? tx(locale, 'api.sende') : tx(locale, 'common.senden')}
              onPress={() => send(operation)}
            />
          ) : (
            <Muted>{tx(locale, 'api.anmeldeablauf')}</Muted>
          )}
        </Card>
      ))}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {result ? (
        <Card>
          <Text style={styles.method}>
            {result.status} · {result.elapsedMs} ms
          </Text>
          <Text style={styles.preview}>{preview(result.body)}</Text>
        </Card>
      ) : null}
      <Section title={tx(locale, 'common.studiengaenge')} />
      {campusStudies.length === 0 ? (
        <Muted>{tx(locale, 'api.studiengaenge')}</Muted>
      ) : (
        campusStudies.map((study) => (
          <InfoRow
            key={study.studyId}
            title={`${study.studyId === activeStudyId ? '● ' : ''}${study.name}`}
            meta={study.intendedDegree || String(study.studyId)}
            detail={[
              study.studyStatus,
              study.versionIdentifier,
              study.lastAccessed ? tx(locale, 'api.zuletzt') : '',
              study.elementId ? `element ${study.elementId}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => setActiveStudy(study.studyId)}
          />
        ))
      )}
      <Section title={tx(locale, 'api.lehrveranstaltungen')} />
      {coursesPreview.length === 0 ? (
        <Muted>{tx(locale, 'api.kurse')}</Muted>
      ) : (
        coursesPreview.map((course) => (
          <InfoRow
            key={course.id}
            title={course.title}
            meta={[course.courseTypeShort || course.courseType, course.semester].filter(Boolean).join(' · ') || String(course.id)}
            detail={[course.lecturers.join(', '), course.roomName, course.registrationStatus].filter(Boolean).join(' · ')}
          />
        ))
      )}
      <Section title={tx(locale, 'api.curriculum')} />
      {curriculumNodes.length === 0 ? (
        <Muted>{tx(locale, 'api.knoten_sende')}</Muted>
      ) : (
        curriculumNodes.map((node) => (
          <InfoRow
            key={node.id}
            title={node.name}
            meta={node.designation || String(node.id)}
            detail={[
              node.elementType,
              node.parentId ? `parent ${node.parentId}` : tx(locale, 'common.wurzel'),
              node.completed ? tx(locale, 'common.abgeschlossen') : '',
              node.inProgress ? tx(locale, 'common.arbeit') : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => {
              const operation = operations.find((item) => item.id === 'campus-structure');
              if (operation) send(operation, node.id);
            }}
          />
        ))
      )}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  method: { color: colors.anthracite, fontSize: 15, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.anthracite,
    fontSize: 16,
  },
  notice: { color: colors.blue, fontSize: 15, lineHeight: 21 },
  preview: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' },
}));
