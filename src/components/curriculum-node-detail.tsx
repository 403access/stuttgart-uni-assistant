import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { cacheCampusCourses, loadCampusCourses } from '@/src/auth/campus';
import { appendElementCourses, getCoursesSyncInfo, loadCachedCoursesByElement, type CoursesSyncInfo } from '@/src/campus/db';
import { Button, Card, InfoRow, Muted, Section } from '@/src/components/ui';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { CampusCourse, CampusStudy, CurriculumNode, Locale } from '@/src/types';

export interface CurriculumNodeDetailProps {
  node: CurriculumNode;
  study: CampusStudy;
  /** Every loaded node of the study — the parent and children are found here. */
  nodes: CurriculumNode[];
  locale: Locale;
  onSelect: (id: number) => void;
  onClose: () => void;
}

/**
 * Read-only detail of one curriculum node: designation, status, study, parent
 * and children, plus its courses. Cached courses show instantly; otherwise a
 * load button fetches them once for this element.
 */
export function CurriculumNodeDetail({ node, study, nodes, locale, onSelect, onClose }: CurriculumNodeDetailProps) {
  const [courses, setCourses] = useState<CampusCourse[] | null>(null);
  const [coursesBusy, setCoursesBusy] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [coursesSync, setCoursesSync] = useState<CoursesSyncInfo | null>(null);
  const parent = node.parentId !== null ? nodes.find((item) => item.id === node.parentId) ?? null : null;
  const kids = nodes.filter((item) => item.parentId === node.id);

  // Cache first: courses loaded via /kurse show up instantly, no refetch.
  useEffect(() => {
    let active = true;
    loadCachedCoursesByElement(study.studyId, node.id)
      .then((cached) => {
        if (active && cached.length > 0) {
          cacheCampusCourses(cached);
          setCourses(cached);
        }
      })
      .catch(() => undefined);
    getCoursesSyncInfo(study.studyId)
      .then((info) => {
        if (active) setCoursesSync(info);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [study.studyId, node.id]);

  async function loadNodeCourses(): Promise<void> {
    if (coursesBusy) return;
    setCoursesError('');
    setCoursesBusy(true);
    try {
      const loaded = await loadCampusCourses(node.id, study.studyId);
      setCourses(loaded.courses);
      await appendElementCourses(study.studyId, node.id, node.name, loaded.courses).catch(() => undefined);
      setCoursesSync(await getCoursesSyncInfo(study.studyId).catch(() => null));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setCoursesError(tx(locale, `Kurse nicht geladen (${code}).`, `Courses not loaded (${code}).`));
    } finally {
      setCoursesBusy(false);
    }
  }

  const rows: [string, string][] = [
    [tx(locale, 'Kennung', 'Code'), node.designation || '–'],
    [
      tx(locale, 'Stand', 'Status'),
      node.completed ? tx(locale, 'abgeschlossen', 'completed') : node.inProgress ? tx(locale, 'in Arbeit', 'in progress') : tx(locale, 'offen', 'open'),
    ],
    [tx(locale, 'Studiengang', 'Study'), study.name],
    [tx(locale, 'Element-ID', 'Element ID'), String(node.id)],
    [tx(locale, 'Überpunkt', 'Parent'), parent ? parent.name : tx(locale, 'Wurzel', 'Root')],
    [tx(locale, 'Unterpunkte', 'Children'), kids.length ? String(kids.length) : '–'],
  ];

  return (
    <View style={{ gap: 10 }}>
      <Section title={node.elementType || tx(locale, 'Knoten', 'Node')} action={tx(locale, 'Schließen', 'Close')} onAction={onClose} />
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 17, fontWeight: '700' }}>{node.name}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.inkSoft, fontSize: 14 }}>{label}</Text>
            <Text style={{ color: colors.anthracite, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>
        ))}
      </Card>
      {kids.length > 0 ? (
        <>
          <Section title={tx(locale, 'Unterpunkte', 'Children')} />
          {kids.map((kid) => (
            <Card key={kid.id} onPress={() => onSelect(kid.id)}>
              <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{kid.name}</Text>
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>{[kid.designation, kid.elementType].filter(Boolean).join(' · ')}</Text>
            </Card>
          ))}
        </>
      ) : null}
      <Section title={tx(locale, 'Kurse', 'Courses')} />
      {courses === null && !coursesError ? (
        <>
          {coursesSync ? (
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
              {tx(
                locale,
                `Kurs-Cache: ${coursesSync.courseCount} Kurse aus ${coursesSync.elementsFetched} Elementen — dieses Element fehlt noch.`,
                `Course cache: ${coursesSync.courseCount} courses from ${coursesSync.elementsFetched} elements — this element is still missing.`,
              )}
            </Text>
          ) : null}
          <Button secondary label={coursesBusy ? '…' : tx(locale, 'Kurse laden', 'Load courses')} onPress={loadNodeCourses} />
        </>
      ) : null}
      {coursesError ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{coursesError}</Text> : null}
      {courses && courses.length === 0 ? <Muted>{tx(locale, 'Keine Lehrveranstaltungen an diesem Knoten.', 'No courses on this node.')}</Muted> : null}
      {courses?.map((course) => (
        <InfoRow
          key={course.id}
          title={course.title}
          meta={[course.courseTypeShort || course.courseType, course.semester].filter(Boolean).join(' · ') || String(course.id)}
          detail={[course.lecturers.join(', '), course.registrationStatus].filter(Boolean).join(' · ')}
          onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}
        />
      ))}
    </View>
  );
}
