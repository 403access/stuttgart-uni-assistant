/** Types for one observed C@MPUS (CAMPUSonline) study-chooser call. */

import { campusRestOrigin, type CampusLink, type LangData } from '@/src/campus/curriculum';

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
  return `${campusRestOrigin}/slc.cm.cs/student/myStudies/chooser?$ctx=design=ca;lang=${lang}&$filter=`;
}

/** Root curriculum element id from a `myStudyLink`, or null when the portal omits it. */
export function myStudyElementId(link: CampusLink | undefined): number | null {
  const match = link?.href.match(/\/myCurriculumElements\/(\d{1,10})(?:[/?]|$)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
