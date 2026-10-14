/** Types for one observed C@MPUS (CAMPUSonline) curriculum call. */

export const campusRestOrigin = 'https://campus.uni-stuttgart.de/cusonline/ee/rest';

export interface CampusLink {
  rel: string;
  href: string;
  name?: string;
}

export interface LangValue {
  lang: string;
  value?: string;
}

export interface LangData {
  coType: string;
  value?: string;
  translations?: {
    translation: LangValue[];
  };
}

export interface EnabledInfo {
  enabled: boolean;
  active: boolean;
  partOfCurriculum: boolean;
  validInTime: boolean;
  completed: boolean;
}

export interface TagReplacement {
  key: string;
  value: string;
}

export interface CurriculumTag {
  text: string;
  tagType: string;
  replacementData?: TagReplacement[];
}

/** `ROOT` is the study node. `DEFAULT` is a group under it. Other values may appear. */
export type CurriculumElementType = 'ROOT' | 'DEFAULT' | (string & {});

export interface CurriculumStructureElementDto {
  designation: string;
  elementType: CurriculumElementType;
  enabledInfo: EnabledInfo;
  iconName: string;
  id: number;
  name: LangData;
  tags: CurriculumTag[];
  isActive: boolean;
  sortPriority?: number;
  parentId?: number;
}

export interface CurriculumStructureResource {
  link: CampusLink[];
  content: {
    type: string;
    curriculumStructureElementDto: CurriculumStructureElementDto;
  };
}

/** Body of `.../myCurriculumElements/{elementId}/structure`. */
export interface CurriculumStructureResponse {
  link: CampusLink[];
  resource: CurriculumStructureResource[];
}

export interface CurriculumStructureRequest {
  studyId: number;
  elementId: number;
  lang?: 'de' | 'en';
  active?: boolean;
  currentlyValid?: boolean;
  partOfCurriculum?: boolean;
}

function flag(value: boolean | undefined, fallback: boolean): string {
  return String(value ?? fallback);
}

export function curriculumStructureUrl(request: CurriculumStructureRequest): string {
  const lang = request.lang ?? 'de';
  const filter = [
    `active-eq=${flag(request.active, true)}`,
    `currentlyValid-eq=${flag(request.currentlyValid, true)}`,
    `partOfCurriculum-eq=${flag(request.partOfCurriculum, true)}`,
  ].join(';');
  return `${campusRestOrigin}/slc.cm.cs/student/myStudies/${request.studyId}/myCurriculumElements/${request.elementId}/structure?$ctx=design=ca;lang=${lang}&$filter=${filter}`;
}

export function langText(data: LangData, lang: string): string {
  const translated = data.translations?.translation.find((item) => item.lang === lang && item.value)?.value;
  return translated || data.value || '';
}
