import { asUserAccount, findPlatform } from '@/src/auth/user';
import type { CampusStudy, CurriculumNode, PersistedState, UserAccount } from '@/src/types';

export const APP_STATE_STORAGE_KEY = 'university-assistant/v1';

export const emptyState: PersistedState = {
  locale: 'de',
  theme: 'light',
  design: 'clean',
  user: null,
  sessionAccount: null,
  sessionMode: null,
  sessionName: null,
  sessionEmail: null,
  sessionSubject: null,
  mailAccount: null,
  oidcSessionId: null,
  curriculumNodes: [],
  curriculumStudyId: null,
  campusStudies: [],
  activeStudyId: null,
  syncAt: {},
  downloadedIds: [],
  imports: [],
  reviews: [],
  transfers: [],
  messages: [],
  plannedIds: [],
};

function sanitizeNodes(value: unknown): CurriculumNode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const node = item as Partial<CurriculumNode>;
    if (typeof node.id !== 'number' || typeof node.name !== 'string') return [];
    return [
      {
        id: node.id,
        designation: typeof node.designation === 'string' ? node.designation : '',
        elementType: typeof node.elementType === 'string' ? node.elementType : '',
        name: node.name,
        parentId: typeof node.parentId === 'number' ? node.parentId : null,
        completed: Boolean(node.completed),
        inProgress: Boolean(node.inProgress),
      },
    ];
  });
}

function sanitizeStudies(value: unknown): CampusStudy[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const study = item as Partial<CampusStudy>;
    if (typeof study.studyId !== 'number' || typeof study.name !== 'string') return [];
    return [
      {
        studyId: study.studyId,
        name: study.name,
        intendedDegree: typeof study.intendedDegree === 'string' ? study.intendedDegree : '',
        versionIdentifier: typeof study.versionIdentifier === 'string' ? study.versionIdentifier : '',
        studyStatus: typeof study.studyStatus === 'string' ? study.studyStatus : '',
        identifier: typeof study.identifier === 'string' ? study.identifier : '',
        curriculumVersionId: typeof study.curriculumVersionId === 'number' ? study.curriculumVersionId : null,
        curriculumId: typeof study.curriculumId === 'number' ? study.curriculumId : null,
        color: typeof study.color === 'string' ? study.color : '',
        lastAccessed: Boolean(study.lastAccessed),
        elementId: typeof study.elementId === 'number' ? study.elementId : null,
      },
    ];
  });
}

/** Single study is auto-selected. Otherwise prefer lastAccessed, then the stored choice, then the first row. */
export function pickActiveStudyId(studies: CampusStudy[], current: number | null = null): number | null {
  if (!studies.length) return null;
  if (studies.length === 1) return studies[0].studyId;
  if (current !== null && studies.some((item) => item.studyId === current)) return current;
  return studies.find((item) => item.lastAccessed)?.studyId ?? studies[0].studyId;
}

/** Turn an untrusted AsyncStorage payload into the shape the app renders. */
export function sanitize(value: Partial<PersistedState> | null): PersistedState {
  if (!value) return emptyState;
  const campusStudies = sanitizeStudies(value.campusStudies);
  const activeStudyId =
    typeof value.activeStudyId === 'number' && campusStudies.some((item) => item.studyId === value.activeStudyId)
      ? value.activeStudyId
      : pickActiveStudyId(campusStudies, null);
  const user = asUserAccount(value.user);
  return {
    locale: value.locale === 'en' ? 'en' : 'de',
    theme: value.theme === 'dark' ? 'dark' : 'light',
    design: value.design === 'playful' ? 'playful' : 'clean',
    user,
    // The flat session fields predate the account record. A stored user fills them in
    // when an older payload did not carry them yet.
    sessionAccount: typeof value.sessionAccount === 'string' ? value.sessionAccount : user?.account ?? null,
    sessionMode:
      value.sessionMode === 'oidc' || value.sessionMode === 'demo' || value.sessionMode === 'local' || value.sessionMode === 'campus'
        ? value.sessionMode
        : user?.mode ?? null,
    sessionName: typeof value.sessionName === 'string' ? value.sessionName : user?.name ?? null,
    sessionEmail: typeof value.sessionEmail === 'string' ? value.sessionEmail : user?.email ?? null,
    sessionSubject: typeof value.sessionSubject === 'string' ? value.sessionSubject : user?.subject ?? null,
    mailAccount: typeof value.mailAccount === 'string' ? value.mailAccount : findPlatform(user, 'mail')?.account ?? null,
    oidcSessionId: typeof value.oidcSessionId === 'string' ? value.oidcSessionId : null,
    curriculumNodes: sanitizeNodes(value.curriculumNodes),
    curriculumStudyId: typeof value.curriculumStudyId === 'number' ? value.curriculumStudyId : null,
    campusStudies,
    activeStudyId,
    syncAt: value.syncAt ?? {},
    downloadedIds: Array.isArray(value.downloadedIds) ? value.downloadedIds.filter((id) => typeof id === 'string') : [],
    imports: Array.isArray(value.imports) ? value.imports : [],
    reviews: Array.isArray(value.reviews) ? value.reviews : [],
    transfers: Array.isArray(value.transfers) ? value.transfers : [],
    messages: Array.isArray(value.messages) ? value.messages.slice(-40) : [],
    plannedIds: Array.isArray(value.plannedIds) ? value.plannedIds.filter((id) => typeof id === 'string') : [],
  };
}

/** The session fields every signed-in account mirrors, so older screens keep working. */
export function sessionFields(user: UserAccount) {
  return {
    user,
    sessionAccount: user.account,
    sessionMode: user.mode,
    sessionName: user.name,
    sessionEmail: user.email,
    sessionSubject: user.subject,
    mailAccount: findPlatform(user, 'mail')?.account ?? null,
  };
}
