import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { activeStudy } from '@/src/auth/campus';
import { Button, Card, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { deviceCoursesQuery, serverCoursesQuery } from '@/src/query/queries';
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
  const [view, setView] = useState<CalView>('agenda');
  const [anchor, setAnchor] = useState(todayLocal());
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('fixed');
  const [sort, setSort] = useState<CalSort>('time');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const isWeb = Platform.OS === 'web';
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;
  // Device store first, server snapshot second — a plain view-read: nothing
  // is written back; the refetch on revisit comes from the queries.
  const localQ = useQuery(deviceCoursesQuery(study?.studyId ?? null, { enabled: Boolean(study) }));
  const snapshotQ = useQuery(serverCoursesQuery(study?.studyId ?? null, { enabled: Boolean(study) }));
  const courses = useMemo(() => {
    const map = new Map((localQ.data ?? []).map((course) => [course.id, course]));
    for (const course of snapshotQ.data?.courses ?? []) {
      if (!map.has(course.id)) map.set(course.id, { ...course });
    }
    return [...map.values()];
  }, [localQ.data, snapshotQ.data]);

  useEffect(() => {
    setSelectedId(null);
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

  const selected = selectedId !== null ? (courses.find((course) => course.id === selectedId) ?? null) : null;

  function handleCoursePress(course: BulkCourse): void {
    if (isWeb) setSelectedId(course.id);
    else router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } });
  }

  return (
    <Screen
      topInset
      kicker="C@MPUS"
      title={tx(locale, 'Kalender', 'Calendar')}
      subtitle={study ? study.name : tx(locale, 'Termine aus zwischengespeicherten Kursen.', 'Appointments from cached courses.')}
      action={
        study ? (
          <Pressable
            onPress={() => router.push('/kalender-export')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tx(locale, 'Kalender exportieren', 'Export calendar')}
            style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="square.and.arrow.up" size={18} tintColor={colors.blue} />
            ) : (
              <MaterialIcons name="share" size={20} color={colors.blue} />
            )}
          </Pressable>
        ) : undefined
      }>
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
          {isWeb && selected ? (
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <View style={{ flex: 2, minWidth: 280, gap: 14 }}>
                <CalViews
                  view={view}
                  byDay={byDay}
                  anchor={anchor}
                  setAnchor={setAnchor}
                  setView={setView}
                  locale={locale}
                  onCoursePress={handleCoursePress}
                />
              </View>
              <View style={{ flex: 1, minWidth: 280 }}>
                <CourseDetailPanel
                  key={selected.id}
                  course={selected}
                  locale={locale}
                  onClose={() => setSelectedId(null)}
                />
              </View>
            </View>
          ) : (
            <CalViews
              view={view}
              byDay={byDay}
              anchor={anchor}
              setAnchor={setAnchor}
              setView={setView}
              locale={locale}
              onCoursePress={handleCoursePress}
            />
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={toolbarStyles.row}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={tx(locale, 'Suchen …', 'Search …')}
          placeholderTextColor={colors.mute}
          style={[inputStyle, toolbarStyles.searchInput]}
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
      </ScrollView>
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

function CalViews({
  view,
  byDay,
  anchor,
  setAnchor,
  setView,
  locale,
  onCoursePress,
}: {
  view: CalView;
  byDay: Map<string, BulkCourse[]>;
  anchor: string;
  setAnchor: (day: string) => void;
  setView: (view: CalView) => void;
  locale: 'de' | 'en';
  onCoursePress: (course: BulkCourse) => void;
}) {
  if (view === 'agenda') return <AgendaView days={byDay} locale={locale} onCoursePress={onCoursePress} />;
  if (view === 'week') return <WeekView days={byDay} anchor={anchor} setAnchor={setAnchor} setView={setView} locale={locale} />;
  if (view === 'day') return <DayView days={byDay} anchor={anchor} setAnchor={setAnchor} locale={locale} onCoursePress={onCoursePress} />;
  return <MonthView days={byDay} anchor={anchor} setAnchor={setAnchor} setView={setView} locale={locale} />;
}

function CourseRow({ course, locale, onPress }: { course: BulkCourse; locale: 'de' | 'en'; onPress: (course: BulkCourse) => void }) {
  const palette = paletteFor(course.courseType || '?');
  return (
    <Pressable onPress={() => onPress(course)}>
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

function AgendaView({ days, locale, onCoursePress }: { days: Map<string, BulkCourse[]>; locale: 'de' | 'en'; onCoursePress: (course: BulkCourse) => void }) {
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
              <CourseRow key={`${day}-${course.id}`} course={course} locale={locale} onPress={onCoursePress} />
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

function DayView({ days, anchor, setAnchor, locale, onCoursePress }: { days: Map<string, BulkCourse[]>; anchor: string; setAnchor: (day: string) => void; locale: 'de' | 'en'; onCoursePress: (course: BulkCourse) => void }) {
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
                  onPress={() => onCoursePress(course)}>
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
        <CourseRow key={course.id} course={course} locale={locale} onPress={onCoursePress} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },
  searchInput: { width: 180, paddingVertical: 9 },
  filterPanel: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, gap: 8 },
  filterTitle: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  filterReset: { color: colors.blue, fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
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

function CourseDetailPanel({ course, locale, onClose }: { course: BulkCourse; locale: 'de' | 'en'; onClose: () => void }) {
  const palette = paletteFor(course.courseType || '?');
  const when =
    course.startTime && course.endTime
      ? `${formatDay(course.startTime.slice(0, 10), locale)}, ${formatTime(course.startTime)}–${formatTime(course.endTime)} ${tx(locale, 'Uhr', "o'clock")}`
      : course.startTime
        ? `${formatDay(course.startTime.slice(0, 10), locale)}, ${formatTime(course.startTime)} ${tx(locale, 'Uhr', "o'clock")}`
        : '';
  const rows: Array<[string, string]> = [
    [tx(locale, 'Nummer', 'Number'), course.courseNumber || '–'],
    [
      tx(locale, 'Umfang', 'Size'),
      [course.courseTypeShort || course.courseType, course.duration !== null ? `${course.duration} SWS` : '', course.semester].filter(Boolean).join(' · ') || '–',
    ],
    [tx(locale, course.lecturers.length === 1 ? 'Dozent*in' : 'Dozierende', course.lecturers.length === 1 ? 'Lecturer' : 'Lecturers'), course.lecturers.join(', ') || '–'],
    [tx(locale, 'Anmeldung', 'Registration'), course.registrationStatus || '–'],
  ];
  return (
    <View style={{ gap: 10 }}>
      <Section
        title={course.courseType || tx(locale, 'Kurs', 'Course')}
        action={tx(locale, 'Schließen', 'Close')}
        onAction={onClose}
      />
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 17, fontWeight: '700' }}>{course.title}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.inkSoft, fontSize: 14 }}>{label}</Text>
            <Text style={{ color: colors.anthracite, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>
        ))}
        {when ? (
          <Text style={[rowTime, { color: palette.fg }]}>
            {tx(locale, 'Nächster Termin: ', 'Next appointment: ')}
            {when}
          </Text>
        ) : null}
        {course.roomName ? <Text style={rowMeta}>{course.roomName}</Text> : null}
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button secondary label={tx(locale, 'Vollansicht', 'Full view')} onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })} />
        {course.registrationUrl ? (
          <Button
            secondary
            label={course.registrationAction || tx(locale, 'Anmeldung', 'Registration')}
            onPress={() => WebBrowser.openBrowserAsync(course.registrationUrl).catch(() => undefined)}
          />
        ) : null}
      </View>
    </View>
  );
}
