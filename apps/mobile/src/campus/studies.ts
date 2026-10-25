/** Types for one observed C@MPUS (CAMPUSonline) study-chooser call. */

import { campusStudiesUrl, elementIdFromLink } from '@ua/contracts/campus';
import type { CampusLink, LangData } from '@/src/campus/curriculum';

export interface CmStudyInfoDto {
  studyId: number;
  curriculumVersionId: number;
  curriculumId: number;
  name: LangData;
  intendedDegree: LangData;
  versionIdentifier: string;
  studyStatus: string;
  identifier: string;
  customizationDto: {
    color: string;
    icon: string;
  };
  customizationLink: CampusLink;
  myStudyLink: CampusLink;
  lastAccessed: boolean;
}

export interface StudyInfoResource {
  link: CampusLink[];
  content: {
    type: string;
    /** Capitalized in the observed body, unlike the structure DTO. */
    CmStudyInfoDto: CmStudyInfoDto;
  };
}

/** Body of `.../myStudies/chooser`. */
export interface StudiesChooserResponse {
  link: CampusLink[];
  resource: StudyInfoResource[];
}

export function studiesChooserUrl(lang: 'de' | 'en' = 'de'): string {
  return campusStudiesUrl(lang);
}

/** Root curriculum element id from a `myStudyLink`, or null when the portal omits it. */
export function myStudyElementId(link: CampusLink | undefined): number | null {
  return elementIdFromLink(link?.href);
}
