import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { cacheCampusCourses, getCachedCourse } from '@/src/auth/campus';
import { findCachedCourse } from '@/src/campus/db';
import { Button, Card, InfoRow, Muted, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDay, formatTime, tx } from '@/src/text';
import type { CampusCourse } from '@/src/types';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

/** One C@MPUS course: session cache first, persisted course cache after a restart. */
export default function CourseScreen() {
  const { locale } = useApp();
  const id = Number(one(useLocalSearchParams<{ id: string }>().id));
  const [course, setCourse] = useState<CampusCourse | null>(() => getCachedCourse(id));
  useEffect(() => {
    if (getCachedCourse(id)) return;
    let active = true;
    findCachedCourse(id)
      .then((found) => {
        if (active && found) {
          cacheCampusCourses([found]);
          setCourse(found);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id]);
  if (!course) {
    return (
      <Screen back kicker="C@MPUS" title={tx(locale, 'Kurs fehlt', 'Course missing')}>
        <Muted>
          {tx(
            locale,
            'Dieser Kurs ist nicht im Zwischenspeicher. Öffne ihn über die Kurse eines Strukturknotens im C@MPUS-Tab.',
            'This course is not cached. Open it from the courses of a structure node in the C@MPUS tab.',
          )}
        </Muted>
      </Screen>
    );
  }
  const when =
    course.startTime && course.endTime
      ? `${formatDay(course.startTime, locale)}, ${formatTime(course.startTime)}–${formatTime(course.endTime)} ${tx(locale, 'Uhr', "o'clock")}`
      : course.startTime
        ? `${formatDay(course.startTime, locale)}, ${formatTime(course.startTime)} ${tx(locale, 'Uhr', "o'clock")}`
        : '';
  return (
    <Screen back kicker={course.courseType || 'C@MPUS'} title={course.title} subtitle={course.semester}>
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 20, fontWeight: '700' }}>
          {course.courseNumber || tx(locale, 'Ohne Nummer', 'No number')}
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
          meta={tx(locale, course.lecturers.length === 1 ? 'Dozent*in' : 'Dozierende', course.lecturers.length === 1 ? 'Lecturer' : 'Lecturers')}
        />
      ) : null}
      {course.registrationStatus ? (
        <InfoRow
          title={course.registrationStatus}
          meta={tx(locale, 'Anmeldung', 'Registration')}
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
          meta={tx(locale, 'Nächster Termin', 'Next appointment')}
          detail={course.roomName || undefined}
        />
      ) : course.roomName ? (
        <InfoRow title={course.roomName} meta={tx(locale, 'Raum', 'Room')} />
      ) : null}
      {course.detailUrl ? (
        <Button
          secondary
          label={tx(locale, 'Detailseite in C@MPUS öffnen', 'Open detail page in C@MPUS')}
          onPress={() => WebBrowser.openBrowserAsync(course.detailUrl).catch(() => undefined)}
        />
      ) : null}
    </Screen>
  );
}
