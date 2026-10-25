/** C@MPUS REST URLs and the small normalisers shared by the app and server. */

export const CAMPUS_REST_ORIGIN = 'https://campus.uni-stuttgart.de/cusonline/ee/rest';

function flag(value, fallback) {
  return String(value ?? fallback);
}

/** `.../myCurriculumElements/{elementId}/structure`. */
export function campusStructureUrl({
  studyId,
  elementId,
  lang = 'de',
  active = true,
  currentlyValid = true,
  partOfCurriculum = true,
}) {
  const filter = [
    `active-eq=${flag(active, true)}`,
    `currentlyValid-eq=${flag(currentlyValid, true)}`,
    `partOfCurriculum-eq=${flag(partOfCurriculum, true)}`,
  ].join(';');
  return `${CAMPUS_REST_ORIGIN}/slc.cm.cs/student/myStudies/${studyId}/myCurriculumElements/${elementId}/structure?$ctx=design=ca;lang=${lang}&$filter=${filter}`;
}

/** `.../myStudies/chooser`. */
export function campusStudiesUrl(lang = 'de') {
  return `${CAMPUS_REST_ORIGIN}/slc.cm.cs/student/myStudies/chooser?$ctx=design=ca;lang=${lang}&$filter=`;
}

/** `.../myCurriculumElements/{elementId}/courses`. */
export function campusCoursesUrl(studyId, elementId, lang = 'de') {
  return (
    `${CAMPUS_REST_ORIGIN}/slc.cm.cs/student/myStudies/${studyId}/myCurriculumElements/${elementId}/courses` +
    `?$ctx=design=ca;lang=${lang}&$filter=active-eq=true;currentlyValid-eq=true;partOfCurriculum-eq=true`
  );
}

export function campusCourseGroupsUrl(courseId) {
  return `${CAMPUS_REST_ORIGIN}/slc.tm.cp/student/courseGroups/firstGroups/${courseId}`;
}

export function campusRefreshUrl() {
  return `${CAMPUS_REST_ORIGIN}/auth/token/refresh`;
}

export function campusCalendarExportUrl() {
  return 'https://campus.uni-stuttgart.de/cusonline/wbKalender.wbExport';
}

/** A translated `LangData` value, falling back to the untranslated value. */
export function langText(data, lang = 'de') {
  const translated = data?.translations?.translation?.find((item) => item.lang === lang && item.value)?.value;
  return translated || data?.value || '';
}

/** Root curriculum element id from a `myStudyLink` href, or null when the portal omits it. */
export function elementIdFromLink(href) {
  if (typeof href !== 'string') return null;
  const match = href.match(/\/myCurriculumElements\/(\d{1,10})(?:[/?]|$)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** The study to select in the chooser: the remembered one, else the last accessed, else the first. */
export function pickActiveStudyId(studies, current = null) {
  if (!Array.isArray(studies) || !studies.length) return null;
  if (studies.length === 1) return studies[0].studyId;
  if (current != null && studies.some((item) => item?.studyId === current)) return current;
  return studies.find((item) => item?.lastAccessed)?.studyId ?? studies[0].studyId;
}
