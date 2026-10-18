import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { activeStudy } from '@/src/auth/campus';
import { deviceCoursesQuery, serverCoursesQuery } from '@/src/query/queries';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDay, formatTime, shortMonths, tx, weekdays } from '@/src/text';
import type { BulkCourse } from '@/src/types';

/** Assigned to the student: the portal marks it with a fixed place (`Fixplatz zugewiesen`). */
function isAssigned(status: string): boolean {
  return /fixplatz/i.test(status);
}

function monthShort(iso: string, locale: 'de' | 'en'): string {
  const index = Number(iso.slice(5, 7)) - 1;
  return shortMonths[locale][index] ?? '';
}

function todayLocal(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekdayOf(iso: string, locale: 'de' | 'en'): string {
  return weekdays[locale][new Date(`${iso}T12:00:00`).getDay()] ?? '';
}

/**
 * Date card with today's date, the number of upcoming appointments and the
 * next appointment. Reads the cached courses of the active study — a plain
 * view-read, nothing is written back.
 */
export function CalendarHero() {
  const { locale, sessionMode, campusStudies, activeStudyId } = useApp();
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;
  const localQ = useQuery(deviceCoursesQuery(study?.studyId ?? null, { enabled: Boolean(study) }));
  const snapshotQ = useQuery(serverCoursesQuery(study?.studyId ?? null, { enabled: Boolean(study) }));
  const courses = useMemo(() => {
    const map = new Map((localQ.data ?? []).map((course) => [course.id, course]));
    for (const course of snapshotQ.data?.courses ?? []) {
      if (!map.has(course.id)) map.set(course.id, { ...course });
    }
    return [...map.values()];
  }, [localQ.data, snapshotQ.data]);

  const today = todayLocal();
  const dated = useMemo(() => courses.filter((course) => Boolean(course.startTime)), [courses]);
  const upcomingCount = dated.filter((course) => course.startTime.slice(0, 10) >= today).length;
  const nowStamp = (() => {
    const now = new Date();
    return `${today}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  })();
  const nextUp = [...dated].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).find((course) => course.startTime >= nowStamp) ?? null;
  const fixedCount = dated.filter((course) => isAssigned(course.registrationStatus)).length;

  if (!study || dated.length === 0) return null;

  function handleCoursePress(course: BulkCourse): void {
    router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } });
  }

  return (
    <View style={styles.hero}>
      <View style={styles.heroCircle} />
      <View style={styles.heroCircleSmall} />
      <View style={styles.heroRow}>
        <View style={{ gap: 2, flex: 1, minWidth: 160 }}>
          <Text style={styles.heroKicker}>{weekdayOf(today, locale)}</Text>
          <Text style={styles.heroDate}>
            {Number(today.slice(8, 10))}. {monthShort(today, locale)}
          </Text>
          <Text style={styles.heroSub}>
            {tx(locale, 'calendarHero.anstehende', [upcomingCount])}
          </Text>
        </View>
        {nextUp ? (
          <Pressable style={styles.heroNext} onPress={() => handleCoursePress(nextUp)}>
            <Text style={styles.heroNextKicker}>{tx(locale, 'calendarHero.naechstes')}</Text>
            <Text style={styles.heroNextTitle} numberOfLines={2}>
              {nextUp.title}
            </Text>
            <Text style={styles.heroNextMeta} numberOfLines={1}>
              {`${formatDay(nextUp.startTime.slice(0, 10), locale)}, ${formatTime(nextUp.startTime)}${nextUp.endTime ? `–${formatTime(nextUp.endTime)}` : ''}${nextUp.roomName ? ` · ${nextUp.roomName}` : ''}`}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.heroNext}>
            <Text style={styles.heroNextKicker}>{tx(locale, 'common.stand')}</Text>
            <Text style={styles.heroNextTitle}>
              {tx(locale, 'calendarHero.fixplaetze', [fixedCount])}
            </Text>
            <Text style={styles.heroNextMeta} numberOfLines={1}>
              {tx(locale, 'calendarHero.termine', [dated.length])}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.anthracite,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 99,
    backgroundColor: colors.blue,
    right: -40,
    top: -50,
    opacity: 0.85,
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 99,
    backgroundColor: colors.light,
    right: 70,
    bottom: -30,
    opacity: 0.7,
  },
  heroKicker: { color: '#9FC0E8', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroDate: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  heroSub: { color: '#D7DBDE', fontSize: 14 },
  heroRow: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  heroNext: {
    flex: 1,
    minWidth: 200,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  heroNextKicker: { color: '#9FC0E8', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroNextTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', lineHeight: 22 },
  heroNextMeta: { color: '#D7DBDE', fontSize: 13 },
});
