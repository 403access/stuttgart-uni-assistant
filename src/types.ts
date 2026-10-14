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

export interface PersistedState {
  locale: Locale;
  sessionAccount: string | null;
  sessionMode: SessionMode | null;
  sessionName: string | null;
  sessionEmail: string | null;
  sessionSubject: string | null;
  oidcSessionId: string | null;
  curriculumNodes: CurriculumNode[];
  campusStudies: CampusStudy[];
  syncAt: Partial<Record<PlatformId, string>>;
  downloadedIds: string[];
  imports: ImportedDocument[];
  reviews: Review[];
  transfers: TransferDraft[];
  messages: ChatMessage[];
  plannedIds: string[];
}
