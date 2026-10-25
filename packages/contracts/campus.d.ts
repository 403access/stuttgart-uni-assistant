export type CampusLocale = 'de' | 'en';

export interface LangValue {
  value?: string;
}

export interface LangData extends LangValue {
  translations?: {
    translation: Array<{ lang: string; value?: string }>;
  };
}

export interface CampusStructureOptions {
  studyId: number;
  elementId: number;
  lang?: CampusLocale;
  active?: boolean;
  currentlyValid?: boolean;
  partOfCurriculum?: boolean;
}

export const CAMPUS_REST_ORIGIN: string;
export function campusStructureUrl(options: CampusStructureOptions): string;
export function campusStudiesUrl(lang?: CampusLocale): string;
export function campusCoursesUrl(studyId: number, elementId: number, lang?: CampusLocale): string;
export function campusCourseGroupsUrl(courseId: number): string;
export function campusRefreshUrl(): string;
export function campusCalendarExportUrl(): string;
export function langText(data: LangData | undefined, lang?: string): string;
export function elementIdFromLink(href: string | undefined): number | null;
export function pickActiveStudyId<T extends { studyId: number; lastAccessed?: boolean }>(
  studies: T[] | undefined,
  current?: number | null,
): number | null;
