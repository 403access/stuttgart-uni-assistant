import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { activeStudy, loadServerCourses } from '@/src/auth/campus';
import { loadCachedCourses } from '@/src/campus/db';
import { Button, Card, InfoRow, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { StudySelector } from '@/src/components/study-selector';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDay, formatTime, tx, weekdays } from '@/src/text';
import type { BulkCourse } from '@/src/types';

type CalView = 'agenda' | 'week' | 'day' | 'month';
type CalSort = 'time' | 'title';
type AssignFilter = 'all' | 'fixed' | 'notfixed';

/** Assigned to the student: the portal marks it with a fixed place (`Fixplatz zugewiesen`). */
function isAssigned(status: string): boolean {
  return /fixplatz/i.test(status);
}

function todayLocal(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftDay(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return todayLocal(date);
}

function weekdayOf(iso: string, locale: 'de' | 'en'): string {
  return weekdays[locale][new Date(`${iso}T12:00:00`).getDay()] ?? '';
}

/** Agenda, week, day, and month views over cached course appointments. No portal calls. */
export default function KalenderScreen() {
  const { locale, sessionMode, campusStudies, activeStudyId } = useApp();
  const [courses, setCourses] = useState<BulkCourse[]>([]);
  const [view, setView] = useState<CalView>('agenda');
  const [anchor, setAnchor] = useState(todayLocal());
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [sort, setSort] = useState<CalSort>('time');
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;

  useEffect(() => {
    if (!study) {
      setCourses([]);
      return;
    }
    const studyId = study.studyId;
    let active = true;
    (async () => {
      const local = await loadCachedCourses(studyId).catch(() => []);
      const remote = await loadServerCourses(studyId).catch(() => null);
      const map = new Map(local.map((course) => [course.id, course]));
      for (const course of remote?.courses ?? []) {
        if (!map.has(course.id)) map.set(course.id, { ...course });
      }
      if (active) setCourses([...map.values()]);
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [study?.studyId]);

  const types = useMemo(() => [...new Set(courses.map((course) => course.courseType || tx(locale, 'Ohne Typ', 'No type')))].sort(), [courses, locale]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = courses.filter((course) => {
      if (!course.startTime) return false;
      if (typeFilter !== 'all' && (course.courseType || tx(locale, 'Ohne Typ', 'No type')) !== typeFilter) return false;
      if (assignFilter === 'fixed' && !isAssigned(course.registrationStatus)) return false;
      if (assignFilter === 'notfixed' && isAssigned(course.registrationStatus)) return false;
      if (needle) {
        const haystack = `${course.title} ${course.courseNumber} ${course.lecturers.join(' ')} ${course.roomName}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    if (sort === 'time') sorted.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    else sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [courses, query, typeFilter, assignFilter, sort, locale]);

  const byDay = useMemo(() => {
    const map = new Map<string, BulkCourse[]>();
    for (const course of visible) {
      const day = course.startTime.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(course);
      map.set(day, list);
    }
    return map;
  }, [visible]);

  return (
    <Screen
      kicker="C@MPUS"
      title={tx(locale, 'Kalender', 'Calendar')}
      subtitle={study ? `${study.name} · ${visible.length} ${tx(locale, 'Termine', 'appointments')}` : tx(locale, 'Termine aus zwischengespeicherten Kursen.', 'Appointments from cached courses.')}>
      <StudySelector />
      {study === null ? (
        <Card>
          <Muted>
            {tx(locale, 'Melden Sie sich mit dem C@MPUS-Token an, um Termine zu sehen.', 'Sign in with the C@MPUS token to see appointments.')}
          </Muted>
        </Card>
      ) : courses.length === 0 ? (
        <Card>
          <Muted>
            {tx(locale, 'Keine Kurse zwischengespeichert. Lade sie über die Kurse-Seite, dann erscheinen hier die Termine.', 'No courses cached. Load them from the courses page, then appointments appear here.')}
          </Muted>
          <Button secondary label={tx(locale, 'Kurse öffnen', 'Open courses')} onPress={() => router.push('/kurse')} />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['agenda', 'week', 'day', 'month'] as CalView[]).map((item) => (
              <Pressable key={item} onPress={() => setView(item)}>
                <Pill
                  label={
                    item === 'agenda'
                      ? tx(locale, 'Agenda', 'Agenda')
                      : item === 'week'
                        ? tx(locale, 'Woche', 'Week')
                        : item === 'day'
                          ? tx(locale, 'Tag', 'Day')
                          : tx(locale, 'Monat', 'Month')
                  }
                  active={view === item}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={tx(locale, 'Suchen …', 'Search …')}
              placeholderTextColor={colors.mute}
              style={[inputStyle, { flex: 1, paddingVertical: 8 }]}
            />
            <Pressable onPress={() => setSort(sort === 'time' ? 'title' : 'time')}>
              <Pill label={`${sort === 'time' ? tx(locale, 'Termin', 'Date') : tx(locale, 'Titel', 'Title')} ▾`} active />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable onPress={() => setTypeFilter('all')}>
              <Pill label={tx(locale, 'Alle Typen', 'All types')} active={typeFilter === 'all'} />
            </Pressable>
            {types.map((type) => (
              <Pressable key={type} onPress={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
                <Pill label={type} active={typeFilter === type} />
              </Pressable>
            ))}
            {(['all', 'fixed', 'notfixed'] as AssignFilter[]).map((item) => (
              <Pressable key={`assign-${item}`} onPress={() => setAssignFilter(item)}>
                <Pill
                  label={
                    item === 'all'
                      ? tx(locale, 'Alle Plätze', 'All places')
                      : item === 'fixed'
                        ? tx(locale, 'Fixplatz', 'Fixed place')
                        : tx(locale, 'Kein Fixplatz', 'No fixed place')
                  }
                  active={assignFilter === item}
                />
              </Pressable>
            ))}
          </View>
          {view === 'agenda' ? (
            <AgendaView days={byDay} locale={locale} />
          ) : view === 'week' ? (
            <WeekView days={byDay} anchor={anchor} setAnchor={setAnchor} setView={setView} locale={locale} />
          ) : view === 'day' ? (
            <DayView days={byDay} anchor={anchor} setAnchor={setAnchor} locale={locale} />
          ) : (
            <MonthView days={byDay} anchor={anchor} setAnchor={setAnchor} setView={setView} locale={locale} />
          )}
        </>
      )}
    </Screen>
  );
}

function CourseRow({ course, locale }: { course: BulkCourse; locale: 'de' | 'en' }) {
  return (
    <InfoRow
      title={course.title}
      meta={course.startTime && course.endTime ? `${formatTime(course.startTime)}–${formatTime(course.endTime)}` : formatTime(course.startTime)}
      detail={[course.courseTypeShort || course.courseType, course.roomName, course.lecturers.join(', ')].filter(Boolean).join(' · ')}
      onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}
    />
  );
}

function AgendaView({ days, locale }: { days: Map<string, BulkCourse[]>; locale: 'de' | 'en' }) {
  const entries = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 60);
  if (!entries.length) return <Muted>{tx(locale, 'Keine Termine für diese Auswahl.', 'No appointments for this selection.')}</Muted>;
  return (
    <>
      {entries.map(([day, items]) => (
        <View key={day} style={{ gap: 8 }}>
          <Section title={`${weekdayOf(day, locale)} · ${formatDay(day, locale)}`} />
          {items.map((course) => (
            <CourseRow key={`${day}-${course.id}`} course={course} locale={locale} />
          ))}
        </View>
      ))}
    </>
  );
}

function weekDays(anchor: string): string[] {
  const mondayOffset = (new Date(`${anchor}T12:00:00`).getDay() + 6) % 7;
  const monday = shiftDay(anchor, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftDay(monday, index));
}

function WeekView({ days, anchor, setAnchor, setView, locale }: { days: Map<string, BulkCourse[]>; anchor: string; setAnchor: (day: string) => void; setView: (view: CalView) => void; locale: 'de' | 'en' }) {
  const week = weekDays(anchor);
  const today = todayLocal();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable onPress={() => setAnchor(shiftDay(week[0], -7))}>
          <Pill label="‹" />
        </Pressable>
        <Pressable onPress={() => setAnchor(today)}>
          <Pill label={tx(locale, 'Heute', 'Today')} />
        </Pressable>
        <Pressable onPress={() => setAnchor(shiftDay(week[0], 7))}>
          <Pill label="›" />
        </Pressable>
        <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
          {formatDay(week[0], locale)} – {formatDay(week[6], locale)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {week.map((day) => {
          const items = days.get(day) ?? [];
          const isToday = day === today;
          return (
            <Pressable key={day} style={{ flex: 1, minWidth: 0 }} onPress={() => { setAnchor(day); setView('day'); }}>
              <View style={[weekCell, isToday && weekToday, day === anchor && weekAnchor]}>
                <Text style={weekDay} numberOfLines={1}>
                  {weekdayOf(day, locale).slice(0, 2)}
                </Text>
                <Text style={[weekDate, isToday && weekDateToday]}>{Number(day.slice(8, 10))}</Text>
                {items.slice(0, 3).map((course) => (
                  <Text key={course.id} style={weekItem} numberOfLines={1}>
                    {formatTime(course.startTime)} {course.title}
                  </Text>
                ))}
                {items.length > 3 ? <Text style={weekMore}>+{items.length - 3}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Muted>{tx(locale, 'Tag antippen für die Tagesansicht.', 'Tap a day for the day view.')}</Muted>
    </View>
  );
}

function DayView({ days, anchor, setAnchor, locale }: { days: Map<string, BulkCourse[]>; anchor: string; setAnchor: (day: string) => void; locale: 'de' | 'en' }) {
  const items = days.get(anchor) ?? [];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable onPress={() => setAnchor(shiftDay(anchor, -1))}>
          <Pill label="‹" />
        </Pressable>
        <Pressable onPress={() => setAnchor(todayLocal())}>
          <Pill label={tx(locale, 'Heute', 'Today')} />
        </Pressable>
        <Pressable onPress={() => setAnchor(shiftDay(anchor, 1))}>
          <Pill label="›" />
        </Pressable>
        <Text style={{ color: colors.anthracite, fontSize: 16, fontWeight: '700' }}>
          {weekdayOf(anchor, locale)} · {formatDay(anchor, locale)}
        </Text>
      </View>
      {items.length === 0 ? (
        <Muted>{tx(locale, 'Keine Termine an diesem Tag.', 'No appointments this day.')}</Muted>
      ) : (
        items.map((course) => <CourseRow key={course.id} course={course} locale={locale} />)
      )}
    </View>
  );
}

function MonthView({
  days,
  anchor,
  setAnchor,
  setView,
  locale,
}: {
  days: Map<string, BulkCourse[]>;
  anchor: string;
  setAnchor: (day: string) => void;
  setView: (view: CalView) => void;
  locale: 'de' | 'en';
}) {
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7));
  const firstOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = new Date(year, month, 0).getDate();
  const today = todayLocal();
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' });
  const blanks = Array.from({ length: firstOffset }, (_, index) => `blank-${index}`);
  const dates = Array.from({ length: cells }, (_, index) => `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`);
  const prevMonth = shiftDay(`${year}-${String(month).padStart(2, '0')}-15`, -20).slice(0, 7) + '-15';
  const nextMonth = shiftDay(`${year}-${String(month).padStart(2, '0')}-15`, 20).slice(0, 7) + '-15';
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable onPress={() => setAnchor(prevMonth)}>
          <Pill label="‹" />
        </Pressable>
        <Pressable onPress={() => setAnchor(today)}>
          <Pill label={tx(locale, 'Heute', 'Today')} />
        </Pressable>
        <Pressable onPress={() => setAnchor(nextMonth)}>
          <Pill label="›" />
        </Pressable>
        <Text style={{ color: colors.anthracite, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }}>{monthName}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label, index) => (
          <Text key={label} style={[weekDay, { flex: 1, textAlign: 'center' }]}>
            {locale === 'de' ? label : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][index]}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {blanks.map((key) => (
          <View key={key} style={monthCellEmpty} />
        ))}
        {dates.map((day) => {
          const count = days.get(day)?.length ?? 0;
          const isToday = day === today;
          const isAnchor = day === anchor;
          return (
            <Pressable
              key={day}
              style={monthCol}
              onPress={() => {
                setAnchor(day);
                setView('day');
              }}>
              <View style={[monthCell, isToday && weekToday, isAnchor && weekAnchor]}>
                <Text style={[weekDate, isToday && weekDateToday]}>{Number(day.slice(8, 10))}</Text>
                <View style={{ flexDirection: 'row', gap: 2, minHeight: 6 }}>
                  {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
                    <View key={index} style={monthDot} />
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.anthracite,
};

const weekCell = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 10,
  padding: 4,
  gap: 2,
  minHeight: 90,
};

const weekToday = { borderColor: colors.blue };
const weekAnchor = { backgroundColor: colors.blueSoft };
const weekDateToday = { color: colors.blue };

const weekDay = { color: colors.inkSoft, fontSize: 11, fontWeight: '700' as const };
const weekDate = { color: colors.anthracite, fontSize: 14, fontWeight: '700' as const };
const weekItem = { color: colors.anthracite, fontSize: 10, lineHeight: 13 };
const weekMore = { color: colors.inkSoft, fontSize: 10, fontWeight: '700' as const };

const monthCell = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 10,
  padding: 4,
  gap: 2,
  alignItems: 'center' as const,
};

const monthCol = { width: '13%' as const };
const monthCellEmpty = monthCol;
const monthDot = { width: 5, height: 5, borderRadius: 99, backgroundColor: colors.blue };
