import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { activeStudy, loadServerCourses } from '@/src/auth/campus';
import { loadCachedCourses } from '@/src/campus/db';
import { Button, Card, Muted, Pill, Screen } from '@/src/components/ui';
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

const palettes = [
  { bg: colors.blueSoft, fg: colors.blue, bar: colors.blue },
  { bg: colors.successSoft, fg: colors.success, bar: colors.success },
  { bg: colors.warningSoft, fg: colors.warning, bar: colors.warning },
  { bg: colors.dangerSoft, fg: colors.danger, bar: colors.danger },
  { bg: colors.lightSoft, fg: colors.blue, bar: colors.light },
];

/** Deterministic color per course type. */
function paletteFor(type: string): { bg: string; fg: string; bar: string } {
  let hash = 0;
  for (let index = 0; index < type.length; index += 1) hash = (hash * 31 + type.charCodeAt(index)) >>> 0;
  return palettes[hash % palettes.length];
}

function minutesOf(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
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

  const today = todayLocal();
  const upcomingCount = visible.filter((course) => course.startTime.slice(0, 10) >= today).length;

  return (
    <Screen
      kicker="C@MPUS"
      title={tx(locale, 'Kalender', 'Calendar')}
      subtitle={study ? study.name : tx(locale, 'Termine aus zwischengespeicherten Kursen.', 'Appointments from cached courses.')}>
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
          <View style={styles.hero}>
            <View style={styles.heroCircle} />
            <View style={styles.heroCircleSmall} />
            <View style={{ gap: 2 }}>
              <Text style={styles.heroKicker}>{weekdayOf(today, locale)}</Text>
              <Text style={styles.heroDate}>
                {Number(today.slice(8, 10))}. {monthShort(today, locale)}
              </Text>
              <Text style={styles.heroSub}>
                {tx(locale, `${upcomingCount} anstehende Termine`, `${upcomingCount} upcoming appointments`)}
              </Text>
            </View>
          </View>
          <View style={styles.segment}>
            {(['agenda', 'week', 'day', 'month'] as CalView[]).map((item) => (
              <Pressable key={item} onPress={() => setView(item)} style={[styles.segmentItem, view === item && styles.segmentOn]}>
                <Text style={[styles.segmentText, view === item && styles.segmentTextOn]}>
                  {item === 'agenda'
                    ? tx(locale, 'Agenda', 'Agenda')
                    : item === 'week'
                      ? tx(locale, 'Woche', 'Week')
                      : item === 'day'
                        ? tx(locale, 'Tag', 'Day')
                        : tx(locale, 'Monat', 'Month')}
                </Text>
              </Pressable>
            ))}
          </View>
          <CalToolbar
            locale={locale}
            query={query}
            setQuery={setQuery}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            types={types}
            assignFilter={assignFilter}
            setAssignFilter={setAssignFilter}
            sort={sort}
            setSort={setSort}
          />
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

const shortMonths = {
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;

function monthShort(iso: string, locale: 'de' | 'en'): string {
  const index = Number(iso.slice(5, 7)) - 1;
  return shortMonths[locale][index] ?? '';
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

function CalToolbar({
  locale,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  types,
  assignFilter,
  setAssignFilter,
  sort,
  setSort,
}: {
  locale: 'de' | 'en';
  query: string;
  setQuery: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  types: string[];
  assignFilter: AssignFilter;
  setAssignFilter: (value: AssignFilter) => void;
  sort: CalSort;
  setSort: (value: CalSort) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState<'type' | 'place' | null>(null);
  const typeActive = typeFilter !== 'all';
  const placeActive = assignFilter !== 'all';
  const toggle = (panel: 'type' | 'place'): void => setFiltersOpen((open) => (open === panel ? null : panel));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tx(locale, 'Suchen …', 'Search …')}
          placeholderTextColor={colors.mute}
          style={[inputStyle, { flex: 1, minWidth: 140, paddingVertical: 8 }]}
        />
        <Pressable onPress={() => setSort(sort === 'time' ? 'title' : 'time')}>
          <Pill label={`${sort === 'time' ? tx(locale, 'Termin', 'Date') : tx(locale, 'Titel', 'Title')} ▾`} active />
        </Pressable>
        <Pressable onPress={() => toggle('type')}>
          <Pill label={typeActive ? `${tx(locale, 'Typ', 'Type')} · ${typeFilter}` : `${tx(locale, 'Typ', 'Type')} ▾`} active={filtersOpen === 'type' || typeActive} />
        </Pressable>
        <Pressable onPress={() => toggle('place')}>
          <Pill
            label={
              placeActive
                ? `${tx(locale, 'Platz', 'Place')} · ${assignFilter === 'fixed' ? tx(locale, 'Fixplatz', 'Fixed place') : tx(locale, 'Kein Fixplatz', 'No fixed place')}`
                : `${tx(locale, 'Platz', 'Place')} ▾`
            }
            active={filtersOpen === 'place' || placeActive}
          />
        </Pressable>
      </View>
      {filtersOpen === 'type' ? (
        <View style={toolbarStyles.filterPanel}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pressable onPress={() => setTypeFilter('all')}>
              <Pill label={tx(locale, 'Alle', 'All')} active={typeFilter === 'all'} />
            </Pressable>
            {types.map((type) => (
              <Pressable key={type} onPress={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
                <Pill label={type} active={typeFilter === type} />
              </Pressable>
            ))}
          </View>
          {typeActive ? (
            <Pressable onPress={() => setTypeFilter('all')}>
              <Text style={toolbarStyles.filterReset}>{tx(locale, 'Zurücksetzen', 'Reset')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {filtersOpen === 'place' ? (
        <View style={toolbarStyles.filterPanel}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
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
          {placeActive ? (
            <Pressable onPress={() => setAssignFilter('all')}>
              <Text style={toolbarStyles.filterReset}>{tx(locale, 'Zurücksetzen', 'Reset')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CourseRow({ course, locale }: { course: BulkCourse; locale: 'de' | 'en' }) {
  const palette = paletteFor(course.courseType || '?');
  return (
    <Pressable onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}>
      <View style={[rowCard, { borderLeftColor: palette.bar }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={rowTitle} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={rowMeta}>
            {[course.courseTypeShort || course.courseType, course.roomName, course.lecturers.join(', ')].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={rowTime}>
            {course.startTime && course.endTime ? `${formatTime(course.startTime)}–${formatTime(course.endTime)}` : formatTime(course.startTime)}
          </Text>
          {isAssigned(course.registrationStatus) ? (
            <View style={[rowBadge, { backgroundColor: palette.bg }]}>
              <Text style={[rowBadgeText, { color: palette.fg }]}>Fixplatz</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function AgendaView({ days, locale }: { days: Map<string, BulkCourse[]>; locale: 'de' | 'en' }) {
  const entries = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 60);
  if (!entries.length) return <Muted>{tx(locale, 'Keine Termine für diese Auswahl.', 'No appointments for this selection.')}</Muted>;
  return (
    <>
      {entries.map(([day, items]) => (
        <View key={day} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={dateBadge}>
            <Text style={dateDay}>{Number(day.slice(8, 10))}</Text>
            <Text style={dateMonth}>{monthShort(day, locale)}</Text>
            <Text style={dateWeek}>{weekdayOf(day, locale).slice(0, 2)}</Text>
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            {items.map((course) => (
              <CourseRow key={`${day}-${course.id}`} course={course} locale={locale} />
            ))}
          </View>
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
      <DayNav anchor={week[0]} setAnchor={setAnchor} step={7} locale={locale} range={`${formatDay(week[0], locale)} – ${formatDay(week[6], locale)}`} />
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {week.map((day) => {
          const items = days.get(day) ?? [];
          const isToday = day === today;
          return (
            <Pressable
              key={day}
              style={{ flex: 1, minWidth: 0 }}
              onPress={() => {
                setAnchor(day);
                setView('day');
              }}>
              <View style={[weekCell, isToday && weekToday, day === anchor && weekAnchor]}>
                <Text style={weekDay} numberOfLines={1}>
                  {weekdayOf(day, locale).slice(0, 2)}
                </Text>
                <Text style={[weekDate, isToday && weekDateToday]}>{Number(day.slice(8, 10))}</Text>
                {items.slice(0, 3).map((course) => {
                  const palette = paletteFor(course.courseType || '?');
                  return (
                    <View key={course.id} style={[weekBlock, { backgroundColor: palette.bg }]}>
                      <Text style={[weekItem, { color: palette.fg }]} numberOfLines={1}>
                        {formatTime(course.startTime)} {course.title}
                      </Text>
                    </View>
                  );
                })}
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

function DayNav({ anchor, setAnchor, step = 1, locale, range }: { anchor: string; setAnchor: (day: string) => void; step?: number; locale: 'de' | 'en'; range?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Pressable onPress={() => setAnchor(shiftDay(anchor, -step))}>
        <Pill label="‹" />
      </Pressable>
      <Pressable onPress={() => setAnchor(todayLocal())}>
        <Pill label={tx(locale, 'Heute', 'Today')} />
      </Pressable>
      <Pressable onPress={() => setAnchor(shiftDay(anchor, step))}>
        <Pill label="›" />
      </Pressable>
      {range ? (
        <Text style={{ color: colors.inkSoft, fontSize: 13 }}>{range}</Text>
      ) : (
        <Text style={{ color: colors.anthracite, fontSize: 16, fontWeight: '700' }}>
          {weekdayOf(anchor, locale)} · {formatDay(anchor, locale)}
        </Text>
      )}
    </View>
  );
}

const DAY_START = 7 * 60;
const DAY_END = 21 * 60;
const PX_PER_MIN = 1;

function DayView({ days, anchor, setAnchor, locale }: { days: Map<string, BulkCourse[]>; anchor: string; setAnchor: (day: string) => void; locale: 'de' | 'en' }) {
  const items = (days.get(anchor) ?? []).filter((course) => minutesOf(course.startTime) !== null);
  const timeless = (days.get(anchor) ?? []).filter((course) => minutesOf(course.startTime) === null);
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, index) => DAY_START + index * 60);
  return (
    <View style={{ gap: 8 }}>
      <DayNav anchor={anchor} setAnchor={setAnchor} locale={locale} />
      {items.length === 0 && timeless.length === 0 ? (
        <Muted>{tx(locale, 'Keine Termine an diesem Tag.', 'No appointments this day.')}</Muted>
      ) : null}
      {items.length > 0 ? (
        <View style={timeline}>
          <View style={gutter}>
            {hours.map((hour) => (
              <Text key={hour} style={gutterText}>
                {`${String(Math.floor(hour / 60)).padStart(2, '0')}:00`}
              </Text>
            ))}
          </View>
          <View style={track}>
            {hours.map((hour) => (
              <View key={hour} style={gridLine} />
            ))}
            {items.map((course) => {
              const start = minutesOf(course.startTime) ?? DAY_START;
              const end = course.endTime ? (minutesOf(course.endTime) ?? start + 60) : start + 60;
              const top = Math.max(0, (start - DAY_START) * PX_PER_MIN);
              const height = Math.max(44, (Math.min(end, DAY_END) - Math.max(start, DAY_START)) * PX_PER_MIN);
              const palette = paletteFor(course.courseType || '?');
              return (
                <Pressable
                  key={course.id}
                  style={[block, { top, height, backgroundColor: palette.bg, borderLeftColor: palette.bar }]}
                  onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })}>
                  <Text style={[blockTime, { color: palette.fg }]} numberOfLines={1}>
                    {formatTime(course.startTime)}
                    {course.endTime ? `–${formatTime(course.endTime)}` : ''} · {course.title}
                  </Text>
                  {height > 60 ? (
                    <Text style={[blockMeta, { color: palette.fg }]} numberOfLines={2}>
                      {[course.courseTypeShort || course.courseType, course.roomName].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {timeless.map((course) => (
        <CourseRow key={course.id} course={course} locale={locale} />
      ))}
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
  const prevMonth = `${shiftDay(`${year}-${String(month).padStart(2, '0')}-15`, -20).slice(0, 7)}-15`;
  const nextMonth = `${shiftDay(`${year}-${String(month).padStart(2, '0')}-15`, 20).slice(0, 7)}-15`;
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
          <View key={key} style={monthCol} />
        ))}
        {dates.map((day) => {
          const items = days.get(day) ?? [];
          const palettes = [...new Set(items.map((course) => paletteFor(course.courseType || '?').bar))].slice(0, 3);
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
              <View style={[monthCell, isToday && monthToday, isAnchor && monthAnchor]}>
                <Text style={[weekDate, isToday && monthDateToday]}>{Number(day.slice(8, 10))}</Text>
                <View style={{ flexDirection: 'row', gap: 2, minHeight: 6 }}>
                  {palettes.map((color) => (
                    <View key={color} style={[monthDot, { backgroundColor: color }]} />
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

const toolbarStyles = StyleSheet.create({
  filterPanel: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, gap: 8 },
  filterTitle: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  filterReset: { color: colors.blue, fontSize: 13, fontWeight: '700' },
});

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
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segmentItem: { flex: 1, borderRadius: 999, paddingVertical: 7, alignItems: 'center' },
  segmentOn: { backgroundColor: colors.blue },
  segmentText: { color: colors.inkSoft, fontSize: 13, fontWeight: '700' },
  segmentTextOn: { color: '#FFFFFF' },
});

const rowCard = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderLeftWidth: 4,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
};

const rowTitle = { color: colors.anthracite, fontSize: 15, fontWeight: '700' as const, lineHeight: 20 };
const rowMeta = { color: colors.inkSoft, fontSize: 13, lineHeight: 18 };
const rowTime = { color: colors.blue, fontSize: 14, fontWeight: '700' as const };
const rowBadge = { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-end' as const };
const rowBadgeText = { fontSize: 11, fontWeight: '700' as const };

const dateBadge = {
  width: 52,
  alignItems: 'center' as const,
  backgroundColor: colors.blue,
  borderRadius: 14,
  paddingVertical: 8,
  gap: 0,
  alignSelf: 'flex-start' as const,
};

const dateDay = { color: '#FFFFFF', fontSize: 22, fontWeight: '700' as const, lineHeight: 24 };
const dateMonth = { color: '#D7DBDE', fontSize: 12, fontWeight: '700' as const };
const dateWeek = { color: '#9FC0E8', fontSize: 11, fontWeight: '700' as const };

const weekCell = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 10,
  padding: 4,
  gap: 2,
  minHeight: 90,
};

const weekToday = { borderColor: colors.blue, borderWidth: 2 };
const weekAnchor = { backgroundColor: colors.blueSoft };
const weekDateToday = { color: colors.blue };

const weekDay = { color: colors.inkSoft, fontSize: 11, fontWeight: '700' as const };
const weekDate = { color: colors.anthracite, fontSize: 14, fontWeight: '700' as const };
const weekItem = { fontSize: 10, lineHeight: 13 };
const weekBlock = { borderRadius: 6, paddingHorizontal: 3, paddingVertical: 2 };
const weekMore = { color: colors.inkSoft, fontSize: 10, fontWeight: '700' as const };

const gutter = { width: 40, gap: 0 };
const gutterText = { color: colors.mute, fontSize: 10, height: 60, textAlign: 'right' as const, paddingRight: 6 };
const timeline = { flexDirection: 'row' as const, gap: 0, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 8, overflow: 'hidden' as const };
const track = { flex: 1, position: 'relative' as const };
const gridLine = { height: 60, borderTopWidth: 1, borderTopColor: colors.line };
const block = {
  position: 'absolute' as const,
  left: 0,
  right: 6,
  borderRadius: 10,
  borderLeftWidth: 4,
  paddingHorizontal: 8,
  paddingVertical: 6,
  gap: 2,
  overflow: 'hidden' as const,
};

const blockTime = { fontSize: 12, fontWeight: '700' as const };
const blockMeta = { fontSize: 11, lineHeight: 14 };

const monthCol = { width: '13%' as const };
const monthCellEmpty = monthCol;

const monthCell = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 10,
  padding: 4,
  gap: 2,
  alignItems: 'center' as const,
};

const monthToday = { backgroundColor: colors.blue, borderColor: colors.blue };
const monthDateToday = { color: '#FFFFFF' };
const monthAnchor = { borderColor: colors.blue, borderWidth: 2 };
const monthDot = { width: 5, height: 5, borderRadius: 99 };
