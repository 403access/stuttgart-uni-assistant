import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { studyCourseKey, useCoursesForStudies, type StudyCourse } from '@/src/campus/use-courses';
import { Button, Card, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { useResponsive } from '@ua/ui';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyle, themedStyles } from '@ua/ui/theme';
import { formatDay, formatTime, localDay, monthShort, shiftDay, tx, weekdayOf } from '@ua/core/format';
import type { CampusStudy } from '@ua/core/domain/types';

type CalView = 'agenda' | 'week' | 'day' | 'month';
type CalSort = 'time' | 'title';
type AssignFilter = 'all' | 'fixed' | 'notfixed';
type StudyFilter = number | 'all';

/** Assigned to the student: the portal marks it with a fixed place (`Fixplatz zugewiesen`). */
function isAssigned(status: string): boolean {
  return /fixplatz/i.test(status);
}

/** Deterministic color per course type. Reads the palette at render time so it follows the theme. */
function paletteFor(type: string): { bg: string; fg: string; bar: string } {
  // Rebuilt per call instead of at module load: the palette object is mutable
  // and switches with the active theme.
  const palettes = [
    { bg: colors.blueSoft, fg: colors.blue, bar: colors.blue },
    { bg: colors.successSoft, fg: colors.success, bar: colors.success },
    { bg: colors.warningSoft, fg: colors.warning, bar: colors.warning },
    { bg: colors.dangerSoft, fg: colors.danger, bar: colors.danger },
    { bg: colors.lightSoft, fg: colors.blue, bar: colors.light },
  ];
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
  const locale = useAppSelector((state) => state.locale);
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const campusStudies = useAppSelector((state) => state.campusStudies);
  const [view, setView] = useState<CalView>('agenda');
  const [anchor, setAnchor] = useState(localDay());
  const [query, setQuery] = useState('');
  const [studyFilter, setStudyFilter] = useState<StudyFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('fixed');
  const [sort, setSort] = useState<CalSort>('time');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isDesktop } = useResponsive();
  const isCampus = sessionMode === 'campus' && campusStudies.length > 0;
  // Device store first, server snapshot second — a plain view-read: nothing is
  // written back; the refetch on revisit comes from the queries. The course
  // hook spans every enrolled study and tags each row with its study.
  const allCourses = useCoursesForStudies(campusStudies, { enabled: isCampus });
  const courses = useMemo(
    () => (studyFilter === 'all' ? allCourses : allCourses.filter((course) => course.studyId === studyFilter)),
    [allCourses, studyFilter],
  );

  const types = useMemo(() => [...new Set(courses.map((course) => course.courseType || tx(locale, 'common.ohne_typ')))].sort(), [courses, locale]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = courses.filter((course) => {
      if (!course.startTime) return false;
      if (typeFilter !== 'all' && (course.courseType || tx(locale, 'common.ohne_typ')) !== typeFilter) return false;
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
    const map = new Map<string, StudyCourse[]>();
    for (const course of visible) {
      const day = course.startTime.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(course);
      map.set(day, list);
    }
    return map;
  }, [visible]);

  const selected = selectedKey !== null ? (courses.find((course) => studyCourseKey(course.studyId, course.id) === selectedKey) ?? null) : null;

  /** Changing the study filter can drop the open course; reset the selection in the handler. */
  function changeStudyFilter(value: StudyFilter): void {
    setStudyFilter(value);
    setSelectedKey(null);
  }

  function handleCoursePress(course: StudyCourse): void {
    // Desktop keeps the calendar visible and opens the course beside it. A
    // narrow browser window behaves like the phone and pushes the detail page.
    if (isDesktop) setSelectedKey(studyCourseKey(course.studyId, course.id));
    else router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } });
  }

  function closeSearch(): void {
    setQuery('');
    setSearchOpen(false);
  }

  return (
    <Screen topInset wide title={isDesktop ? tx(locale, 'tabsLayout.kalender') : undefined}>
      {!isCampus ? (
        <Card>
          <Muted>
            {tx(locale, 'tabsKalender.melden')}
          </Muted>
        </Card>
      ) : courses.length === 0 ? (
        <Card>
          <Muted>
            {tx(locale, 'tabsKalender.kurse')}
          </Muted>
          <Button secondary label={tx(locale, 'tabsKalender.kurse_oeffnen')} onPress={() => router.push('/kurse')} />
        </Card>
      ) : (
        <>
          <View style={styles.controlBar}>
            <View style={styles.segment}>
              {(['agenda', 'week', 'day', 'month'] as CalView[]).map((item) => (
                <Pressable key={item} onPress={() => setView(item)} style={[styles.segmentItem, view === item && styles.segmentOn]}>
                  <Text style={[styles.segmentText, view === item && styles.segmentTextOn]}>
                    {item === 'agenda'
                      ? tx(locale, 'tabsKalender.agenda')
                      : item === 'week'
                        ? tx(locale, 'tabsKalender.woche')
                        : item === 'day'
                          ? tx(locale, 'tabsKalender.tag')
                          : tx(locale, 'tabsKalender.monat')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: searchOpen }}
              accessibilityLabel={tx(locale, 'tabsKalender.suchen')}
              style={({ pressed }) => [styles.iconButton, searchOpen && styles.iconButtonOn, pressed && styles.pressed]}>
              {Platform.OS === 'ios' ? (
                <SymbolView name="magnifyingglass" size={18} tintColor={searchOpen ? '#FFFFFF' : colors.blue} />
              ) : (
                <MaterialIcons name="search" size={20} color={searchOpen ? '#FFFFFF' : colors.blue} />
              )}
            </Pressable>
          </View>
          {searchOpen ? (
            <View style={styles.searchRow}>
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={tx(locale, 'common.suchen')}
                placeholderTextColor={colors.mute}
                returnKeyType="search"
                style={[{ ...inputStyle }, styles.searchInput]}
              />
              <Pressable onPress={closeSearch} hitSlop={8} accessibilityRole="button">
                <Text style={styles.cancel}>{tx(locale, 'common.abbrechen')}</Text>
              </Pressable>
            </View>
          ) : null}
          <CalToolbar
            locale={locale}
            studies={campusStudies}
            studyFilter={studyFilter}
            setStudyFilter={changeStudyFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            types={types}
            assignFilter={assignFilter}
            setAssignFilter={setAssignFilter}
            sort={sort}
            setSort={setSort}
          />
          {isDesktop ? (
            <View style={styles.detailColumns}>
              <View style={styles.detailMain}>
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
              <View style={styles.detailSide}>
                {selected ? (
                  <CourseDetailPanel
                    key={selectedKey ?? selected.id}
                    course={selected}
                    locale={locale}
                    onClose={() => setSelectedKey(null)}
                  />
                ) : (
                  <>
                    <Section title={tx(locale, 'tabsKalender.detail_titel')} />
                    <Card>
                      <Muted>{tx(locale, 'tabsKalender.detail_hinweis')}</Muted>
                    </Card>
                  </>
                )}
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

function CalToolbar({
  locale,
  studies,
  studyFilter,
  setStudyFilter,
  typeFilter,
  setTypeFilter,
  types,
  assignFilter,
  setAssignFilter,
  sort,
  setSort,
}: {
  locale: 'de' | 'en';
  studies: CampusStudy[];
  studyFilter: StudyFilter;
  setStudyFilter: (value: StudyFilter) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  types: string[];
  assignFilter: AssignFilter;
  setAssignFilter: (value: AssignFilter) => void;
  sort: CalSort;
  setSort: (value: CalSort) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState<'study' | 'type' | 'place' | null>(null);
  const studyActive = studyFilter !== 'all';
  const typeActive = typeFilter !== 'all';
  const placeActive = assignFilter !== 'all';
  const toggle = (panel: 'study' | 'type' | 'place'): void => setFiltersOpen((open) => (open === panel ? null : panel));
  return (
    <View style={{ gap: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={toolbarStyles.row}>
        <Pressable onPress={() => setSort(sort === 'time' ? 'title' : 'time')}>
          <Pill label={`${sort === 'time' ? tx(locale, 'common.termin') : tx(locale, 'common.titel')} ▾`} active />
        </Pressable>
        {studies.length > 0 ? (
          <Pressable onPress={() => toggle('study')}>
            <Pill
              label={studyActive ? (studies.find((item) => item.studyId === studyFilter)?.name ?? tx(locale, 'common.studium')) : `${tx(locale, 'common.studium')} ▾`}
              active={filtersOpen === 'study' || studyActive}
            />
          </Pressable>
        ) : null}
        <Pressable onPress={() => toggle('type')}>
          <Pill label={typeActive ? typeFilter : `${tx(locale, 'common.typ')} ▾`} active={filtersOpen === 'type' || typeActive} />
        </Pressable>
        <Pressable onPress={() => toggle('place')}>
          <Pill
            label={
              placeActive
                ? assignFilter === 'fixed'
                  ? tx(locale, 'tabsKalender.fixplatz')
                  : tx(locale, 'tabsKalender.fixplatz_2')
                : `${tx(locale, 'tabsKalender.platz')} ▾`
            }
            active={filtersOpen === 'place' || placeActive}
          />
        </Pressable>
      </ScrollView>
      {filtersOpen === 'study' ? (
        <View style={toolbarStyles.filterPanel}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pressable onPress={() => setStudyFilter('all')}>
              <Pill label={tx(locale, 'common.alle')} active={studyFilter === 'all'} />
            </Pressable>
            {studies.map((study) => (
              <Pressable key={study.studyId} onPress={() => setStudyFilter(study.studyId)}>
                <Pill label={study.name} active={studyFilter === study.studyId} />
              </Pressable>
            ))}
          </View>
          {studyActive ? (
            <Pressable onPress={() => setStudyFilter('all')}>
              <Text style={toolbarStyles.filterReset}>{tx(locale, 'common.zuruecksetzen')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {filtersOpen === 'type' ? (
        <View style={toolbarStyles.filterPanel}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pressable onPress={() => setTypeFilter('all')}>
              <Pill label={tx(locale, 'common.alle')} active={typeFilter === 'all'} />
            </Pressable>
            {types.map((type) => (
              <Pressable key={type} onPress={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
                <Pill label={type} active={typeFilter === type} />
              </Pressable>
            ))}
          </View>
          {typeActive ? (
            <Pressable onPress={() => setTypeFilter('all')}>
              <Text style={toolbarStyles.filterReset}>{tx(locale, 'common.zuruecksetzen')}</Text>
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
                      ? tx(locale, 'tabsKalender.alle')
                      : item === 'fixed'
                        ? tx(locale, 'tabsKalender.fixplatz')
                        : tx(locale, 'tabsKalender.fixplatz_2')
                  }
                  active={assignFilter === item}
                />
              </Pressable>
            ))}
          </View>
          {placeActive ? (
            <Pressable onPress={() => setAssignFilter('all')}>
              <Text style={toolbarStyles.filterReset}>{tx(locale, 'common.zuruecksetzen')}</Text>
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
  byDay: Map<string, StudyCourse[]>;
  anchor: string;
  setAnchor: (day: string) => void;
  setView: (view: CalView) => void;
  locale: 'de' | 'en';
  onCoursePress: (course: StudyCourse) => void;
}) {
  if (view === 'agenda') return <AgendaView days={byDay} locale={locale} onCoursePress={onCoursePress} />;
  if (view === 'week') return <WeekView days={byDay} anchor={anchor} setAnchor={setAnchor} setView={setView} locale={locale} />;
  if (view === 'day') return <DayView days={byDay} anchor={anchor} setAnchor={setAnchor} locale={locale} onCoursePress={onCoursePress} />;
  return <MonthView days={byDay} anchor={anchor} setAnchor={setAnchor} setView={setView} locale={locale} />;
}

function CourseRow({ course, locale, onPress }: { course: StudyCourse; locale: 'de' | 'en'; onPress: (course: StudyCourse) => void }) {
  const palette = paletteFor(course.courseType || '?');
  return (
    <Pressable
      onPress={() => onPress(course)}
      style={(state: { pressed: boolean; hovered?: boolean }) => [state.hovered && styles.rowHover, state.pressed && styles.pressed]}>
      <View style={[{ ...rowCard }, { borderLeftColor: palette.bar }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...rowTitle }} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={{ ...rowMeta }}>
            {[course.courseTypeShort || course.courseType, course.roomName, course.lecturers.join(', ')].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ ...rowTime }}>
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

function AgendaView({ days, locale, onCoursePress }: { days: Map<string, StudyCourse[]>; locale: 'de' | 'en'; onCoursePress: (course: StudyCourse) => void }) {
  const entries = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 60);
  if (!entries.length) return <Muted>{tx(locale, 'tabsKalender.termine_auswahl')}</Muted>;
  return (
    <>
      {entries.map(([day, items]) => (
        <View key={day} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ ...dateBadge }}>
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

function WeekView({ days, anchor, setAnchor, setView, locale }: { days: Map<string, StudyCourse[]>; anchor: string; setAnchor: (day: string) => void; setView: (view: CalView) => void; locale: 'de' | 'en' }) {
  const week = weekDays(anchor);
  const today = localDay();
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
              <View style={[{ ...weekCell }, isToday && { ...weekToday }, day === anchor && { ...weekAnchor }]}>
                <Text style={{ ...weekDay }} numberOfLines={1}>
                  {weekdayOf(day, locale).slice(0, 2)}
                </Text>
                <Text style={[{ ...weekDate }, isToday && { ...weekDateToday }]}>{Number(day.slice(8, 10))}</Text>
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
                {items.length > 3 ? <Text style={{ ...weekMore }}>+{items.length - 3}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Muted>{tx(locale, 'tabsKalender.tag_antippen')}</Muted>
    </View>
  );
}

function DayNav({ anchor, setAnchor, step = 1, locale, range }: { anchor: string; setAnchor: (day: string) => void; step?: number; locale: 'de' | 'en'; range?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Pressable onPress={() => setAnchor(shiftDay(anchor, -step))}>
        <Pill label="‹" />
      </Pressable>
      <Pressable onPress={() => setAnchor(localDay())}>
        <Pill label={tx(locale, 'tabsKalender.heute')} />
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

function DayView({ days, anchor, setAnchor, locale, onCoursePress }: { days: Map<string, StudyCourse[]>; anchor: string; setAnchor: (day: string) => void; locale: 'de' | 'en'; onCoursePress: (course: StudyCourse) => void }) {
  const items = (days.get(anchor) ?? []).filter((course) => minutesOf(course.startTime) !== null);
  const timeless = (days.get(anchor) ?? []).filter((course) => minutesOf(course.startTime) === null);
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, index) => DAY_START + index * 60);
  return (
    <View style={{ gap: 8 }}>
      <DayNav anchor={anchor} setAnchor={setAnchor} locale={locale} />
      {items.length === 0 && timeless.length === 0 ? (
        <Muted>{tx(locale, 'tabsKalender.termine')}</Muted>
      ) : null}
      {items.length > 0 ? (
        <View style={{ ...timeline }}>
          <View style={gutter}>
            {hours.map((hour) => (
              <Text key={hour} style={{ ...gutterText }}>
                {`${String(Math.floor(hour / 60)).padStart(2, '0')}:00`}
              </Text>
            ))}
          </View>
          <View style={track}>
            {hours.map((hour) => (
              <View key={hour} style={{ ...gridLine }} />
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
  days: Map<string, StudyCourse[]>;
  anchor: string;
  setAnchor: (day: string) => void;
  setView: (view: CalView) => void;
  locale: 'de' | 'en';
}) {
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7));
  const firstOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = new Date(year, month, 0).getDate();
  const today = localDay();
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' });
  const weekdayShort = [
    tx(locale, 'tabsKalender.mo'),
    tx(locale, 'tabsKalender.di'),
    tx(locale, 'tabsKalender.mi'),
    tx(locale, 'tabsKalender.do'),
    tx(locale, 'tabsKalender.fr'),
    tx(locale, 'tabsKalender.sa'),
    tx(locale, 'tabsKalender.so'),
  ];
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
          <Pill label={tx(locale, 'tabsKalender.heute')} />
        </Pressable>
        <Pressable onPress={() => setAnchor(nextMonth)}>
          <Pill label="›" />
        </Pressable>
        <Text style={{ color: colors.anthracite, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }}>{monthName}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {weekdayShort.map((label) => (
          <Text key={label} style={[{ ...weekDay }, { flex: 1, textAlign: 'center' }]}>
            {label}
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
              <View style={[{ ...monthCell }, isToday && { ...monthToday }, isAnchor && { ...monthAnchor }]}>
                <Text style={[{ ...weekDate }, isToday && monthDateToday]}>{Number(day.slice(8, 10))}</Text>
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

const inputStyle = themedStyle((colors) => ({
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.anthracite,
}));

const toolbarStyles = themedStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 4 },
  filterPanel: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, gap: 8 },
  filterReset: { color: colors.blue, fontSize: 13, fontWeight: '700' },
}));

const styles = themedStyles((colors) => ({
  pressed: { opacity: 0.72 },
  rowHover: { opacity: 0.86 },
  detailColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  detailMain: { flex: 1, minWidth: 0, gap: 14 },
  detailSide: { width: 340, flexShrink: 0, gap: 10 },
  controlBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, paddingVertical: 10 },
  cancel: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconButtonOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  segment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segmentItem: { flex: 1, borderRadius: 999, paddingVertical: 7, alignItems: 'center' },
  segmentOn: { backgroundColor: colors.brand },
  segmentText: { color: colors.inkSoft, fontSize: 13, fontWeight: '700' },
  segmentTextOn: { color: '#FFFFFF' },
}));

const rowCard = themedStyle((colors) => ({
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
}));

const rowTitle = themedStyle((colors) => ({ color: colors.anthracite, fontSize: 15, fontWeight: '700' as const, lineHeight: 20 }));
const rowMeta = themedStyle((colors) => ({ color: colors.inkSoft, fontSize: 13, lineHeight: 18 }));
const rowTime = themedStyle((colors) => ({ color: colors.blue, fontSize: 14, fontWeight: '700' as const }));
const rowBadge = { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-end' as const };
const rowBadgeText = { fontSize: 11, fontWeight: '700' as const };

const dateBadge = themedStyle((colors) => ({
  width: 52,
  alignItems: 'center' as const,
  backgroundColor: colors.brand,
  borderRadius: 14,
  paddingVertical: 8,
  gap: 0,
  alignSelf: 'flex-start' as const,
}));

const dateDay = { color: '#FFFFFF', fontSize: 22, fontWeight: '700' as const, lineHeight: 24 };
const dateMonth = { color: '#D7DBDE', fontSize: 12, fontWeight: '700' as const };
const dateWeek = { color: '#9FC0E8', fontSize: 11, fontWeight: '700' as const };

const weekCell = themedStyle((colors) => ({
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 10,
  padding: 4,
  gap: 2,
  minHeight: 90,
}));

const weekToday = themedStyle((colors) => ({ borderColor: colors.blue, borderWidth: 2 }));
const weekAnchor = themedStyle((colors) => ({ backgroundColor: colors.blueSoft }));
const weekDateToday = themedStyle((colors) => ({ color: colors.blue }));

const weekDay = themedStyle((colors) => ({ color: colors.inkSoft, fontSize: 11, fontWeight: '700' as const }));
const weekDate = themedStyle((colors) => ({ color: colors.anthracite, fontSize: 14, fontWeight: '700' as const }));
const weekItem = { fontSize: 10, lineHeight: 13 };
const weekBlock = { borderRadius: 6, paddingHorizontal: 3, paddingVertical: 2 };
const weekMore = themedStyle((colors) => ({ color: colors.inkSoft, fontSize: 10, fontWeight: '700' as const }));

const gutter = { width: 40, gap: 0 };
const gutterText = themedStyle((colors) => ({ color: colors.mute, fontSize: 10, height: 60, textAlign: 'right' as const, paddingRight: 6 }));
const timeline = themedStyle((colors) => ({ flexDirection: 'row' as const, gap: 0, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 8, overflow: 'hidden' as const }));
const track = { flex: 1, position: 'relative' as const };
const gridLine = themedStyle((colors) => ({ height: 60, borderTopWidth: 1, borderTopColor: colors.line }));
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

const monthCell = themedStyle((colors) => ({
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 10,
  padding: 4,
  gap: 2,
  alignItems: 'center' as const,
}));

const monthToday = themedStyle((colors) => ({ backgroundColor: colors.brand, borderColor: colors.brand }));
const monthDateToday = { color: '#FFFFFF' };
const monthAnchor = themedStyle((colors) => ({ borderColor: colors.blue, borderWidth: 2 }));
const monthDot = { width: 5, height: 5, borderRadius: 99 };

function CourseDetailPanel({ course, locale, onClose }: { course: StudyCourse; locale: 'de' | 'en'; onClose: () => void }) {
  const palette = paletteFor(course.courseType || '?');
  const when =
    course.startTime && course.endTime
      ? `${formatDay(course.startTime.slice(0, 10), locale)}, ${formatTime(course.startTime)}–${formatTime(course.endTime)} ${tx(locale, 'common.uhr')}`
      : course.startTime
        ? `${formatDay(course.startTime.slice(0, 10), locale)}, ${formatTime(course.startTime)} ${tx(locale, 'common.uhr')}`
        : '';
  const rows: [string, string][] = [
    [tx(locale, 'tabsKalender.nummer'), course.courseNumber || '–'],
    [
      tx(locale, 'tabsKalender.umfang'),
      [course.courseTypeShort || course.courseType, course.duration !== null ? `${course.duration} SWS` : '', course.semester].filter(Boolean).join(' · ') || '–',
    ],
    [course.lecturers.length === 1 ? tx(locale, 'common.dozent') : tx(locale, 'common.dozierende'), course.lecturers.join(', ') || '–'],
    [tx(locale, 'common.anmeldung'), course.registrationStatus || '–'],
  ];
  return (
    <View style={{ gap: 10 }}>
      <Section
        title={course.courseType || tx(locale, 'common.kurs')}
        action={tx(locale, 'common.schliessen')}
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
          <Text style={[{ ...rowTime }, { color: palette.fg }]}>
            {tx(locale, 'tabsKalender.naechster')}
            {when}
          </Text>
        ) : null}
        {course.roomName ? <Text style={{ ...rowMeta }}>{course.roomName}</Text> : null}
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button secondary label={tx(locale, 'tabsKalender.vollansicht')} onPress={() => router.push({ pathname: '/kurs/[id]', params: { id: String(course.id) } })} />
        {course.registrationUrl ? (
          <Button
            secondary
            label={course.registrationAction || tx(locale, 'common.anmeldung')}
            onPress={() => WebBrowser.openBrowserAsync(course.registrationUrl).catch(() => undefined)}
          />
        ) : null}
      </View>
    </View>
  );
}
