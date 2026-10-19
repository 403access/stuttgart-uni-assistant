export type Locale = 'de' | 'en';

export type Localized = { de: string; en: string };

export type Campus = 'vaihingen' | 'stadtmitte';

export type ModuleStatus = 'passed' | 'enrolled' | 'open';

export type AreaId =
  | 'math'
  | 'theory'
  | 'practical'
  | 'systems'
  | 'core'
  | 'elective'
  | 'sq'
  | 'project'
  | 'thesis';

export type SessionKind = 'lecture' | 'exercise' | 'seminar';

export type PlaceKind =
  | 'lecture'
  | 'exercise'
  | 'seminar'
  | 'office'
  | 'library'
  | 'mensa'
  | 'study'
  | 'transit';

export type PlatformId = 'campus' | 'ilias' | 'sdg' | 'siam';

/** Platforms a signed-in user can have linked to the one account. */
export type AccountPlatformId = PlatformId | 'mail';

/** `connected` means a working session or credential exists; `linked` means the same identity is known. */
export type PlatformLinkStatus = 'connected' | 'linked';

export interface PlatformLink {
  id: AccountPlatformId;
  account: string | null;
  status: PlatformLinkStatus;
  source: string;
  linkedAt: string;
  lastSyncAt: string | null;
}

/** The server-side user, mirrored on the device for display and offline use. */
export interface UserAccount {
  id: string;
  account: string;
  name: string | null;
  email: string | null;
  matriculation: string | null;
  subject: string | null;
  mode: SessionMode;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  platforms: PlatformLink[];
}

export type DeadlineSource = 'campus' | 'ilias' | 'sdg' | 'faculty';

export type NewsSource = 'stuvus' | 'faculty' | 'institute' | 'university' | 'sdg';

export interface ProgramArea {
  id: AreaId;
  ects: number;
  title: Localized;
}

export interface Program {
  id: string;
  title: Localized;
  degree: Localized;
  totalEcts: number;
  standardSemesterEcts: number;
  areas: ProgramArea[];
}

export interface StudentProfile {
  name: string;
  account: string;
  matriculation: string;
  semester: number;
  email: string;
  faculty: Localized;
  campusHome: Campus;
}

export interface Person {
  id: string;
  name: string;
  title: Localized;
  institute: Localized;
  email: string;
  campus: Campus;
  roomId: string;
  hours: Localized;
  research: Localized;
}

export interface TeachingSession {
  day: number;
  start: string;
  end: string;
  kind: SessionKind;
  roomId: string;
}

export interface ModuleItem {
  id: string;
  code: string;
  title: Localized;
  ects: number;
  area: AreaId;
  status: ModuleStatus;
  grade?: number;
  recommendedSemester: number;
  prerequisites: string[];
  minEarned?: number;
  summary: Localized;
  topics: { de: string[]; en: string[] };
  aliases: string[];
  lecturerId: string;
  campus: Campus;
  sessions: TeachingSession[];
}

export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  campus: Campus;
  building: string;
  address: string;
  x: number;
  y: number;
  note: Localized;
  aliases: string[];
}

export interface Deadline {
  id: string;
  title: Localized;
  detail: Localized;
  date: string;
  source: DeadlineSource;
  moduleId?: string;
}

export interface NewsItem {
  id: string;
  source: NewsSource;
  title: Localized;
  summary: Localized;
  body: Localized;
  date: string;
}

export interface StudyDocument {
  id: string;
  title: Localized;
  courseId?: string;
  source: 'ilias' | 'peer';
  folder: Localized;
  updated: string;
  pages: { de: string[]; en: string[] };
  author: string;
}

export interface Review {
  id: string;
  moduleId: string;
  author: string;
  term: string;
  rating: number;
  workload: number;
  difficulty: number;
  comment: Localized;
}

export interface PastExam {
  id: string;
  moduleId: string;
  term: string;
  topics: { de: string[]; en: string[] };
  focus: Localized;
  hint: Localized;
}

export interface Tutorial {
  id: string;
  moduleId: string;
  group: string;
  day: number;
  start: string;
  end: string;
  roomId: string;
  seats: number;
  taken: number;
  enrolled: boolean;
  tutor: string;
}

export interface TransferDraft {
  id: string;
  origin: 'abroad' | 'previous';
  institution: string;
  courseTitle: string;
  ects: string;
  grade: string;
  targetModuleId: string;
  note: string;
  createdAt: string;
}

export interface ImportedDocument {
  id: string;
  title: string;
  text: string;
  folder: string;
  source: 'device' | 'note';
  createdAt: string;
  shared: boolean;
  uri?: string;
  mimeType?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources: string[];
  engine: 'campus' | 'grok';
  createdAt: string;
}

export type SessionMode = 'oidc' | 'demo' | 'local' | 'campus';

export interface CurriculumNode {
  id: number;
  designation: string;
  elementType: string;
  name: string;
  parentId: number | null;
  completed: boolean;
  inProgress: boolean;
}

export interface CampusStudy {
  studyId: number;
  name: string;
  intendedDegree: string;
  versionIdentifier: string;
  studyStatus: string;
  identifier: string;
  curriculumVersionId: number | null;
  curriculumId: number | null;
  color: string;
  lastAccessed: boolean;
  elementId: number | null;
}

export interface CampusCourse {
  id: number;
  courseNumber: string;
  title: string;
  courseType: string;
  courseTypeShort: string;
  semester: string;
  semesterId: number | null;
  duration: number | null;
  lecturers: string[];
  roomName: string;
  startTime: string;
  endTime: string;
  detailUrl: string;
  registrationStatus: string;
  registrationAction: string;
  registrationUrl: string;
}

/** UniMail status of the assistant server: connection flag, never the secret. */
export interface MailStatus {
  configured: boolean;
  account: string | null;
  address: string | null;
  webmail: string;
  imap: string;
}

/** One mailbox folder as listed by the IMAP server (INBOX, sent, drafts, …). */
export interface MailFolder {
  /** Raw modified-UTF-7 name, sent back to the server for `SELECT`. */
  name: string;
  /** Decoded human-readable name (`&APY-` → `ö`); falls back to `name`. */
  display?: string;
  selectable: boolean;
}

/** One INBOX row as fetched through the assistant server over IMAP. */
export interface MailMessage {
  uid: number;
  seen: boolean;
  date: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
}

/**
 * Full body of one message. Plain text always; `html` holds the *sanitized* markup and is
 * only rendered when the user explicitly asks for the HTML view.
 */
export interface MailBody {
  text: string;
  html: string | null;
  truncated: boolean;
}

export interface BulkCourse extends CampusCourse {
  elementIds: number[];
  elementNames: string[];
}

export interface PersistedState {
  locale: Locale;
  user: UserAccount | null;
  sessionAccount: string | null;
  sessionMode: SessionMode | null;
  sessionName: string | null;
  sessionEmail: string | null;
  sessionSubject: string | null;
  mailAccount: string | null;
  oidcSessionId: string | null;
  curriculumNodes: CurriculumNode[];
  curriculumStudyId: number | null;
  campusStudies: CampusStudy[];
  activeStudyId: number | null;
  syncAt: Partial<Record<PlatformId, string>>;
  downloadedIds: string[];
  imports: ImportedDocument[];
  reviews: Review[];
  transfers: TransferDraft[];
  messages: ChatMessage[];
  plannedIds: string[];
}
