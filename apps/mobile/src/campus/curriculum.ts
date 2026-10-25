/** Types for one observed C@MPUS (CAMPUSonline) curriculum call. */

import { CAMPUS_REST_ORIGIN, campusStructureUrl, langText as contractLangText } from '@ua/contracts/campus';

export const campusRestOrigin = CAMPUS_REST_ORIGIN;

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

export function curriculumStructureUrl(request: CurriculumStructureRequest): string {
  return campusStructureUrl(request);
}

export function langText(data: LangData, lang: string): string {
  return contractLangText(data, lang);
}
