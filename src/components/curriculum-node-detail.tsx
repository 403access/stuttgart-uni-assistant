import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { getCoursesSyncInfo, type CoursesSyncInfo } from '@/src/campus/db';
import { useNodeCourses } from '@/src/campus/use-node-courses';
import { Button, Card, InfoRow, Muted, Section } from '@/src/components/ui';
import { useAsyncAction } from '@/src/hooks/use-async-action';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { CampusStudy, CurriculumNode, Locale } from '@/src/types';

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
  const [coursesSync, setCoursesSync] = useState<CoursesSyncInfo | null>(null);
  const parent = node.parentId !== null ? nodes.find((item) => item.id === node.parentId) ?? null : null;
  const kids = nodes.filter((item) => item.parentId === node.id);

  // Cache first: courses loaded via /kurse show up instantly, no refetch.
  const nodeCourses = useNodeCourses({
    studyId: study.studyId,
    elementId: node.id,
    elementName: node.name,
  });

  const load = useAsyncAction(nodeCourses.fetchRemote, {
    errorMessage: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      return tx(locale, 'curriculumNodeDetail.kurse_geladen', [code]);
    },
    onSuccess: async () => {
      setCoursesSync(await getCoursesSyncInfo(study.studyId).catch(() => null));
    },
  });

  useEffect(() => {
    let active = true;
    getCoursesSyncInfo(study.studyId)
      .then((info) => {
        if (active) setCoursesSync(info);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [study.studyId]);

  const rows: [string, string][] = [
    [tx(locale, 'common.kennung'), node.designation || '–'],
    [
      tx(locale, 'common.stand'),
      node.completed ? tx(locale, 'common.abgeschlossen') : node.inProgress ? tx(locale, 'common.arbeit') : tx(locale, 'curriculumNodeDetail.offen'),
    ],
    [tx(locale, 'curriculumNodeDetail.studiengang'), study.name],
    [tx(locale, 'curriculumNodeDetail.element'), String(node.id)],
    [tx(locale, 'curriculumNodeDetail.ueberpunkt'), parent ? parent.name : tx(locale, 'common.wurzel')],
    [tx(locale, 'curriculumNodeDetail.unterpunkte'), kids.length ? String(kids.length) : '–'],
  ];

  return (
    <View style={{ gap: 10 }}>
      <Section title={node.elementType || tx(locale, 'curriculumNodeDetail.knoten')} action={tx(locale, 'common.schliessen')} onAction={onClose} />
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
          <Section title={tx(locale, 'curriculumNodeDetail.unterpunkte')} />
          {kids.map((kid) => (
            <Card key={kid.id} onPress={() => onSelect(kid.id)}>
              <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{kid.name}</Text>
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>{[kid.designation, kid.elementType].filter(Boolean).join(' · ')}</Text>
            </Card>
          ))}
        </>
      ) : null}
      <Section title={tx(locale, 'common.kurse')} />
      {nodeCourses.courses === null && !load.error ? (
        <>
          {coursesSync ? (
            <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
              {tx(locale, 'curriculumNodeDetail.kurs', [coursesSync.courseCount, coursesSync.elementsFetched])}
            </Text>
          ) : null}
          <Button secondary label={load.busy ? '…' : tx(locale, 'curriculumNodeDetail.kurse')} onPress={() => void load.run()} />
        </>
      ) : null}
      {load.error ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{load.error}</Text> : null}
      {nodeCourses.courses && nodeCourses.courses.length === 0 ? <Muted>{tx(locale, 'common.lehrveranstaltungen')}</Muted> : null}
      {nodeCourses.courses?.map((course) => (
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
