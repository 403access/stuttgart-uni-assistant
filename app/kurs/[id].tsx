import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';

import { cacheCampusCourses, getCachedCourse } from '@/src/auth/campus';
import { findCachedCourse } from '@/src/campus/db';
import { Button, Card, InfoRow, Muted, Screen } from '@/src/components/ui';
import { deviceCourseQuery } from '@/src/query/queries';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { firstParam, formatDay, formatTime, tx } from '@/src/text';
import type { CampusCourse } from '@/src/types';

/** One C@MPUS course: session cache first, persisted course cache after a restart. */
export default function CourseScreen() {
  const { locale } = useApp();
  const id = Number(firstParam(useLocalSearchParams<{ id: string }>().id));
  // The session memory map answers instantly; the device-cache query fills
  // the gap after a restart (the query back-fills the session map too).
  const persisted = useQuery({
    ...deviceCourseQuery(id),
    queryFn: async () => {
      const found = await findCachedCourse(id);
      if (found) cacheCampusCourses([found]);
      return found;
    },
  });
  const course: CampusCourse | null = getCachedCourse(id) ?? persisted.data ?? null;
  if (!course) {
    return (
      <Screen kicker="C@MPUS">
        <Stack.Screen options={{ title: tx(locale, 'kurs.kurs_fehlt') }} />
        <Muted>
          {tx(locale, 'kurs.kurs')}
        </Muted>
      </Screen>
    );
  }
  const when =
    course.startTime && course.endTime
      ? `${formatDay(course.startTime, locale)}, ${formatTime(course.startTime)}–${formatTime(course.endTime)} ${tx(locale, 'common.uhr')}`
      : course.startTime
        ? `${formatDay(course.startTime, locale)}, ${formatTime(course.startTime)} ${tx(locale, 'common.uhr')}`
        : '';
  return (
    <Screen kicker={course.courseType || 'C@MPUS'} subtitle={course.semester}>
      <Stack.Screen options={{ title: course.title }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 20, fontWeight: '700' }}>
          {course.courseNumber || tx(locale, 'kurs.ohne')}
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {[course.courseTypeShort || course.courseType, course.duration !== null ? `${course.duration} SWS` : '', course.semester]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </Card>
      {course.lecturers.length ? (
        <InfoRow
          title={course.lecturers.join(', ')}
          meta={course.lecturers.length === 1 ? tx(locale, 'common.dozent') : tx(locale, 'common.dozierende')}
        />
      ) : null}
      {course.registrationStatus ? (
        <InfoRow
          title={course.registrationStatus}
          meta={tx(locale, 'common.anmeldung')}
          detail={course.registrationAction || undefined}
          onPress={
            course.registrationUrl
              ? () => WebBrowser.openBrowserAsync(course.registrationUrl).catch(() => undefined)
              : undefined
          }
        />
      ) : null}
      {when ? (
        <InfoRow
          title={when}
          meta={tx(locale, 'kurs.naechster')}
          detail={course.roomName || undefined}
        />
      ) : course.roomName ? (
        <InfoRow title={course.roomName} meta={tx(locale, 'kurs.raum')} />
      ) : null}
      {course.detailUrl ? (
        <Button
          secondary
          label={tx(locale, 'kurs.detailseite')}
          onPress={() => WebBrowser.openBrowserAsync(course.detailUrl).catch(() => undefined)}
        />
      ) : null}
    </Screen>
  );
}
