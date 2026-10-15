/** Types for one observed C@MPUS (CAMPUSonline) curriculum-element courses call. */

import { campusRestOrigin, type CampusLink, type LangData } from '@/src/campus/curriculum';

export interface CourseNumberDto {
  dotIndex?: number;
  databaseValue?: string;
  courseNumber?: string;
}

export interface LectureshipDto {
  id: number;
  courseId: number;
  identityLibDto?: {
    id?: number;
    personId?: number;
    firstName?: string;
    lastName?: string;
    gender?: string;
  };
  teachingFunction?: {
    id?: number;
    key?: string;
    name?: string;
  };
}

export interface CourseRegistrationActionDto {
  actionElementType?: string;
  text?: LangData;
  url?: CampusLink & { target?: string; key?: string };
}

export interface CourseRegistrationTextDto {
  icon?: string;
  importance?: string;
  textInfo?: LangData;
  linkTitle?: LangData;
}

export interface CourseListEntryDto {
  id: number;
  courseNumber?: CourseNumberDto;
  courseTitle?: LangData;
  courseTypeName?: LangData;
  courseTypeShortName?: LangData;
  courseTypeId?: number;
  semester?: LangData;
  duration?: number;
  lectureships?: LectureshipDto[];
  displayMoreLectureships?: boolean;
  roomLink?: CampusLink;
  roomName?: string;
  startTime?: string;
  endTime?: string;
  detailPageLink?: CampusLink & { type?: string; key?: string };
  bookmarkInfos?: {
    courseId?: number;
    bookmarkLinks?: CampusLink[];
  };
  semesterId?: number;
  examRegistrationData?: unknown[];
  courseRegistrationData?: {
    action?: CourseRegistrationActionDto;
    textAbove?: CourseRegistrationTextDto;
    textBelow?: CourseRegistrationTextDto;
  };
  showRegistrationLinks?: boolean;
  extendedList?: boolean;
}

export interface CourseGroupingDto {
  courseList?: CourseListEntryDto[];
}

export interface CmCurriculumElementCourseGroupingsListDto {
  courseGroupings?: CourseGroupingDto[];
  noElementMessage?: string;
  currentSemesterId?: number;
  displayAchievementList?: boolean;
  currentSort?: string;
  studentCanToggle?: boolean;
}

export interface CoursesResource {
  link: CampusLink[];
  content: {
    type: string;
    /** Capitalized in the observed body, like `CmStudyInfoDto`. */
    CmCurriculumElementCourseGroupingsListDto?: CmCurriculumElementCourseGroupingsListDto;
    cmCurriculumElementCourseGroupingsListDto?: CmCurriculumElementCourseGroupingsListDto;
  };
}

/** Body of `.../myCurriculumElements/{elementId}/courses`. */
export interface CoursesResponse {
  link: CampusLink[];
  resource: CoursesResource[];
}

export function coursesRequestUrl(studyId: number, elementId: number, lang: 'de' | 'en' = 'de'): string {
  return (
    `${campusRestOrigin}/slc.cm.cs/student/myStudies/${studyId}/myCurriculumElements/${elementId}/courses` +
    `?$ctx=design=ca;lang=${lang}&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true`
  );
}
