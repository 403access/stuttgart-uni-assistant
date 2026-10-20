import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { exportCampusCalendar, loadCalendarEvents, loadServerCourses, loadServerTree, syncExportedCalendar, type CalendarSync } from '@/src/auth/campus';
import { fetchMailFolders, fetchMailStatus, getMailSnapshot, hydrateMailSnapshot, loadMailMessages, mailDetail, mailMessage } from '@/src/auth/mail';
import { runServerSync } from '@/src/campus/server-sync';
import {
  getCoursesSyncInfo,
  loadCachedCourses,
  loadCoursesFetchedIds,
  saveCourses,
  saveFullStructure,
} from '@/src/campus/db';
import { decodeBase64Utf8, parseIcsEvents } from '@/src/onboarding/ics';
import { keys } from '@/src/query/keys';
import { useApp } from '@/src/state/AppState';
import type { BulkCourse, CampusCalendarEvent, CampusStudy, MailFolder, MailMessage, MailStatus } from '@/src/types';

/** A cached course tagged with the study it belongs to (the timetable spans all studies). */
export interface OnboardingCalendarCourse extends BulkCourse {
  studyId: number;
}

export interface CalendarImportState {
  ready: boolean;
  busy: boolean;
  events: CampusCalendarEvent[];
  result: CalendarSync | null;
  error: string;
}

export interface MailImportState {
  ready: boolean;
  busy: boolean;
  status: MailStatus | null;
  messages: MailMessage[];
  folders: MailFolder[];
  error: string;
}

export type TimetableImportPhase = 'cache' | 'snapshot' | 'sync' | 'done';

export interface TimetableImportState {
  /** At least one cache/snapshot read has finished; the overview may render. */
  ready: boolean;
  /** The background pipeline is still importing or refreshing entries. */
  busy: boolean;
  courses: OnboardingCalendarCourse[];
  phase: TimetableImportPhase;
  /** The study currently being imported, for the progress label. */
  studyName: string | null;
  /** Portal calls already answered and courses seen by the running sync. */
  progress: { fetched: number; courseCount: number };
  /** Non-fatal failure summary; cached entries stay visible. */
  error: string;
}

function messageOf(caught: unknown): string {
  if (caught instanceof Error) return caught.message || 'import_failed';
  return 'import_failed';
}

function germanDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

/** The same one-year range the Kalender-Import screen requests. */
function calendarRange(): { dateFrom: string; dateTo: string } {
  const from = new Date();
  const to = new Date(from);
  to.setFullYear(to.getFullYear() + 1);
  return { dateFrom: germanDate(from), dateTo: germanDate(to) };
}

/** C@MPUS personal calendar (ICS) -> server store -> the rows the overview renders. */
export function useCalendarImport() {
  const { sessionMode } = useApp();
  const queryClient = useQueryClient();
  const [state, setState] = useState<CalendarImportState>({ ready: false, busy: true, events: [], result: null, error: '' });
  const session = useRef({ sessionMode });
  const started = useRef(false);
  const mounted = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    session.current = { sessionMode };
  }, [sessionMode]);

  const run = useCallback(async () => {
    const id = ++runId.current;
    const current = () => runId.current === id;
    const publish = (update: Partial<CalendarImportState>) => {
      if (mounted.current && current()) setState((previous) => ({ ...previous, ...update }));
    };

    const isCampus = session.current.sessionMode === 'campus';
    publish({ busy: isCampus, error: '', result: null });
    if (!isCampus) {
      publish({ ready: true, busy: false, events: [] });
      return;
    }

    // Kick off the C@MPUS calendar import before any other pipeline work. The
    // persisted read below reuses a previous result while that request runs.
    const sync = syncExportedCalendar(calendarRange()).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    const cached = await loadCalendarEvents().catch(() => [] as CampusCalendarEvent[]);
    if (!current()) return;
    if (mounted.current) {
      setState((previous) => ({ ...previous, events: cached, ready: previous.ready || cached.length > 0 }));
    }

    const outcome = await sync;
    if (!current()) return;
    if (!outcome.ok) {
      publish({ ready: true, busy: false, error: messageOf(outcome.error) });
      return;
    }
    const result = outcome.value;
    // The sync response already carries this run's events. For an older
    // assistant server that only returns counts, read the store and finally
    // parse the export attachment itself. Only exported appointments enter
    // this list, never timetable courses.
    let events =
      result.events.length > 0 ? result.events : await loadCalendarEvents().catch(() => cached);
    if (events.length === 0 && result.total > 0) {
      const exported = await exportCampusCalendar({
        ...calendarRange(),
        format: 99,
        charset: 'UTF8',
      }).catch(() => null);
      if (exported) events = parseIcsEvents(decodeBase64Utf8(exported.base64));
    }
    if (!current()) return;
    publish({ ready: true, busy: false, events, result });
    void queryClient.invalidateQueries({ queryKey: keys.apiLog(500) });
  }, [queryClient]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const retry = useCallback(() => {
    setState((previous) => ({
      ...previous,
      ready: previous.ready && previous.events.length > 0,
      busy: true,
      error: '',
    }));
    void run();
  }, [run]);

  return { ...state, retry };
}

/** UniMail inbox rows, read through the assistant server and mirrored into the device cache. */
export function useMailImport() {
  const { locale, setMailAccount } = useApp();
  const [state, setState] = useState<MailImportState>({
    ready: false,
    busy: true,
    status: null,
    messages: [],
    folders: [],
    error: '',
  });
  const session = useRef({ locale });
  const started = useRef(false);
  const mounted = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    session.current = { locale };
  }, [locale]);

  const run = useCallback(async () => {
    const id = ++runId.current;
    const current = () => runId.current === id;
    const publish = (update: Partial<MailImportState>) => {
      if (mounted.current && current()) setState((previous) => ({ ...previous, ...update }));
    };

    publish({ busy: true, error: '' });
    await hydrateMailSnapshot().catch(() => undefined);
    const cached = getMailSnapshot();
    const cachedMessages = cached.messages ?? [];
    if (!current()) return;
    if (mounted.current) {
      setState((previous) => ({
        ...previous,
        status: cached.status,
        messages: cachedMessages,
        folders: cached.folders ?? [],
        ready: previous.ready || cachedMessages.length > 0,
      }));
    }

    try {
      const status = await fetchMailStatus();
      if (!current()) return;
      if (!status) {
        publish({
          ready: true,
          busy: false,
          error: mailMessage(session.current.locale, 'server_unreachable'),
        });
        return;
      }
      if (status.account) setMailAccount(status.account);
      if (!status.configured) {
        publish({ ready: true, busy: false, status });
        return;
      }
      const [folders, messages] = await Promise.all([
        fetchMailFolders().catch(() => cached.folders ?? []),
        loadMailMessages(25),
      ]);
      if (!current()) return;
      publish({ ready: true, busy: false, status, folders, messages });
    } catch (caught) {
      if (!current()) return;
      const code = messageOf(caught);
      publish({
        ready: true,
        busy: false,
        error: mailMessage(session.current.locale, code, mailDetail(caught)),
      });
    }
  }, [setMailAccount]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const retry = useCallback(() => {
    setState((previous) => ({
      ...previous,
      ready: previous.ready && previous.messages.length > 0,
      busy: true,
      error: '',
    }));
    void run();
  }, [run]);

  return { ...state, retry };
}

function mergeCourses(stored: BulkCourse[], remote: BulkCourse[]): BulkCourse[] {
  const map = new Map(stored.map((course) => [course.id, course]));
  for (const course of remote) if (!map.has(course.id)) map.set(course.id, course);
  return [...map.values()];
}

/** Read the persisted course store of every enrolled study, deduplicated by study and course id. */
async function readAllCourses(studies: CampusStudy[]): Promise<OnboardingCalendarCourse[]> {
  const lists = await Promise.all(
    studies.map(async (study) => {
      const courses = await loadCachedCourses(study.studyId).catch(() => [] as BulkCourse[]);
      return courses.map((course) => ({ ...course, studyId: study.studyId }));
    }),
  );
  const map = new Map<string, OnboardingCalendarCourse>();
  for (const course of lists.flat()) map.set(`${course.studyId}-${course.id}`, course);
  return [...map.values()];
}

/**
 * Merge the assistant server's course snapshot into the device store. The
 * server keeps the cross-device copy of the last sync, so this is also the
 * catch-up read when the portal walk itself is not needed.
 */
async function hydrateSnapshot(studyId: number, complete: boolean): Promise<BulkCourse[]> {
  const [remote, stored, fetched] = await Promise.all([
    loadServerCourses(studyId).catch(() => null),
    loadCachedCourses(studyId).catch(() => [] as BulkCourse[]),
    loadCoursesFetchedIds(studyId).catch(() => [] as number[]),
  ]);
  if (!remote) return stored;
  const all = mergeCourses(stored, remote.courses);
  const allFetched = [...new Set([...fetched, ...remote.fetchedElementIds])];
  const nextComplete = complete || (remote.sync?.complete ?? false);
  if (all.length !== stored.length || allFetched.length !== fetched.length || nextComplete !== complete) {
    await saveCourses(studyId, all, allFetched, nextComplete).catch(() => undefined);
  }
  return all;
}

/**
 * Study structure + courses (the timetable data). Cached rows are published
 * immediately; the portal walk continues in the background and refreshes the
 * overview as rows arrive.
 */
export function useTimetableImport() {
  const { sessionMode, campusStudies, activeStudyId } = useApp();
  const queryClient = useQueryClient();
  const [state, setState] = useState<TimetableImportState>({
    ready: false,
    busy: true,
    courses: [],
    phase: 'cache',
    studyName: null,
    progress: { fetched: 0, courseCount: 0 },
    error: '',
  });
  const session = useRef({ sessionMode, campusStudies, activeStudyId });
  const started = useRef(false);
  const mounted = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    session.current = { sessionMode, campusStudies, activeStudyId };
  }, [sessionMode, campusStudies, activeStudyId]);

  const run = useCallback(async () => {
    const id = ++runId.current;
    // The pipeline itself outlives the screen: a user who skips ahead still gets
    // the imported rows on the Kalender tab. Only a newer run cancels this one.
    const current = () => runId.current === id;
    const publish = (update: Partial<TimetableImportState>) => {
      if (mounted.current && current()) setState((previous) => ({ ...previous, ...update }));
    };
    const publishCourses = async (studies: CampusStudy[]) => {
      const courses = await readAllCourses(studies);
      // A user who skips ahead mounts the tabs before the pipeline finishes.
      // Mark the device-store reads stale even when this screen is already gone,
      // so the Kalender and Heute tabs pick up the freshly written rows.
      for (const study of studies) {
        void queryClient.invalidateQueries({ queryKey: keys.deviceCourses(study.studyId) });
        void queryClient.invalidateQueries({ queryKey: keys.coursesSync(study.studyId) });
        void queryClient.invalidateQueries({ queryKey: keys.coursesFetchedIds(study.studyId) });
        void queryClient.invalidateQueries({ queryKey: keys.deviceNodes(study.studyId) });
        void queryClient.invalidateQueries({ queryKey: keys.syncInfo(study.studyId) });
      }
      if (!current() || !mounted.current) return;
      setState((previous) => ({
        ...previous,
        courses,
        // The first cached rows are enough to replace the loader with the overview.
        ready: previous.ready || courses.length > 0,
      }));
    };

    const { sessionMode: mode, campusStudies: studies, activeStudyId: activeId } = session.current;
    const isCampus = mode === 'campus' && studies.length > 0;
    publish({ busy: isCampus, phase: 'cache', error: '', progress: { fetched: 0, courseCount: 0 }, studyName: null });

    await publishCourses(isCampus ? studies : []);
    if (!isCampus) {
      publish({ ready: true, busy: false, phase: 'done' });
      return;
    }

    // Active study first: it is the one the user is most likely to look at.
    const ordered = [...studies].sort((a, b) => {
      if (a.studyId === activeId) return -1;
      if (b.studyId === activeId) return 1;
      return 0;
    });
    const failures: string[] = [];

    for (const study of ordered) {
      if (!current()) return;
      publish({ phase: 'snapshot', studyName: study.name, error: '' });
      try {
        // Fast path: the server already holds a snapshot from an earlier sync.
        const cached = await loadCachedCourses(study.studyId).catch(() => [] as BulkCourse[]);
        const info = await getCoursesSyncInfo(study.studyId).catch(() => null);
        const alreadyComplete = Boolean(info?.complete && cached.length > 0);
        if (!alreadyComplete) {
          await hydrateSnapshot(study.studyId, info?.complete ?? false);
          await publishCourses(studies);
        }
        // The portal walk needs the study's root element; a snapshot-only study
        // still contributes whatever the server already stored.
        if (alreadyComplete || study.elementId == null || !current()) continue;

        publish({ phase: 'sync', progress: { fetched: 0, courseCount: cached.length } });
        const job = await runServerSync(study.studyId, {
          elementId: study.elementId ?? undefined,
          includeCourses: true,
          onProgress: (update) => {
            publish({
              phase: 'sync',
              progress: { fetched: update.fetched, courseCount: update.courseCount },
            });
          },
          isCancelled: () => !current(),
        });
        if (!current()) return;

        // Hydrate tree and courses from the server's now-fresh snapshot.
        await hydrateSnapshot(study.studyId, job.state === 'done' && job.failedIds.length === 0);
        const tree = await loadServerTree(study.studyId).catch(() => null);
        if (tree && tree.nodes.length > 0) {
          await saveFullStructure(
            study.studyId,
            study.elementId ?? null,
            tree.nodes,
            tree.expandedIds,
            tree.sync?.complete ?? false,
          ).catch(() => undefined);
        }
        await publishCourses(studies);
        if (job.failedIds.length > 0) {
          failures.push(`${study.name}: ${job.failedIds.length} Bereiche übersprungen`);
        }
      } catch (caught) {
        failures.push(`${study.name}: ${messageOf(caught)}`);
        // Keep whatever the snapshot/cache produced and move to the next study.
        await publishCourses(studies);
      }
    }

    if (!current()) return;
    const courses = await readAllCourses(studies);
    if (!current() || !mounted.current) return;
    setState((previous) => ({
      ...previous,
      ready: true,
      busy: false,
      phase: 'done',
      studyName: null,
      courses,
      error: failures.join(' · '),
    }));
  }, [queryClient]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  /** Restart the pipeline after a failure, keeping the entries already read. */
  const retry = useCallback(() => {
    setState((previous) => ({
      ...previous,
      // Without rows the retry returns to the loader; with rows the overview
      // stays up and the progress row shows the new attempt.
      ready: previous.ready && previous.courses.length > 0,
      busy: true,
      error: '',
      phase: 'cache',
    }));
    void run();
  }, [run]);

  return { ...state, retry };
}

/**
 * All three first-run imports start together when the onboarding screen
 * mounts, so each page has the best chance of showing its overview without a
 * loader. The screens only control which result is visible.
 */
export function useOnboardingImport() {
  return {
    calendar: useCalendarImport(),
    mail: useMailImport(),
    timetable: useTimetableImport(),
  };
}
