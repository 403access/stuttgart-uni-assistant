import type { Localized } from '@ua/core/domain/types';

/**
 * Question kinds. Each kind has its own reusable view under
 * `src/quiz/components` and its own answer shape in `QuizAnswer`.
 */
export type QuizQuestionKind =
  | 'single'
  | 'multiple'
  | 'true-false'
  | 'free-text'
  | 'matching'
  | 'ordering'
  | 'cloze'
  | 'map'
  | 'diagram'
  | 'flashcard';

export type QuizDifficulty = 1 | 2 | 3;

export interface QuizOption {
  id: string;
  label: Localized;
}

/** Fields every question shares. */
export interface QuizQuestionBase {
  id: string;
  kind: QuizQuestionKind;
  prompt: Localized;
  /** Shown after checking, right or wrong. */
  explanation?: Localized;
  /** Optional nudge shown before answering. */
  hint?: Localized;
  difficulty?: QuizDifficulty;
}

export interface SingleChoiceQuestion extends QuizQuestionBase {
  kind: 'single';
  options: QuizOption[];
  correctId: string;
}

export interface MultipleChoiceQuestion extends QuizQuestionBase {
  kind: 'multiple';
  options: QuizOption[];
  correctIds: string[];
}

export interface TrueFalseQuestion extends QuizQuestionBase {
  kind: 'true-false';
  correct: boolean;
}

export interface FreeTextQuestion extends QuizQuestionBase {
  kind: 'free-text';
  /** Accepted answers, all languages mixed. Matching is case/umlaut tolerant. */
  accepted: string[];
  /**
   * For longer answers: every inner array is one required fact; one of its
   * keywords has to appear. The answer is also accepted when it exactly matches
   * one of `accepted`.
   */
  keywords?: string[][];
}

export interface MatchingPair {
  id: string;
  left: Localized;
  right: Localized;
}

export interface MatchingQuestion extends QuizQuestionBase {
  kind: 'matching';
  pairs: MatchingPair[];
}

export interface OrderingItem {
  id: string;
  label: Localized;
}

export interface OrderingQuestion extends QuizQuestionBase {
  kind: 'ordering';
  /** Authored in the correct order; the view shuffles them for the attempt. */
  items: OrderingItem[];
}

export type ClozeSegment =
  | { type: 'text'; value: Localized }
  | { type: 'blank'; accepted: string[]; width?: number };

export interface ClozeQuestion extends QuizQuestionBase {
  kind: 'cloze';
  segments: ClozeSegment[];
}

export type MapTone = 'blue' | 'ok' | 'wait' | 'stop' | 'neutral' | 'light';

export interface MapZone {
  id: string;
  label: Localized;
  tone: MapTone;
}

export interface MapRegion {
  id: string;
  label: Localized;
  /** Short marker label, e.g. `DE`. */
  short: string;
  /** Country outline in the map's viewBox coordinate system. */
  path: string;
  /** Label anchor in the map's viewBox coordinate system. */
  labelX: number;
  labelY: number;
  /** Optional offset of the label from the anchor, in viewBox units. */
  labelDx?: number;
  labelDy?: number;
  /** Draw a dot at the anchor. Useful for regions too small to label directly. */
  marker?: boolean;
  /** Invisible tap target around the anchor, in viewBox units. */
  hitRadius?: number;
}

export interface MapQuestion extends QuizQuestionBase {
  kind: 'map';
  /** SVG viewBox for the map, e.g. `0 0 1000 839`. */
  viewBox: string;
  /** Non-interactive outlines drawn under the regions for geographic context. */
  backdrop?: string[];
  zones: MapZone[];
  regions: MapRegion[];
  /** Region id → zone id. */
  correct: Record<string, string>;
}

/** Colour families for illustrated anatomical/linguistic figures. */
export type DiagramTone =
  | 'blue'
  | 'violet'
  | 'rose'
  | 'tongue'
  | 'sand'
  | 'bone'
  | 'teeth'
  | 'larynx'
  | 'cords'
  | 'trachea'
  | 'lip'
  | 'mouth';

export interface DiagramRegion {
  id: string;
  label: Localized;
  /** Outline of the structure, in the figure's viewBox coordinates. */
  path?: string;
  /** Circular outline for dot-like structures (IPA positions, callouts). */
  circle?: { cx: number; cy: number; r: number };
  /** Where the number badge / revealed name is drawn. */
  labelX: number;
  labelY: number;
  /** Invisible tap target around the label anchor, in viewBox units. */
  hitRadius?: number;
  /** Always-visible glyph at the anchor, e.g. an IPA symbol. */
  glyph?: string;
  /** Stable badge number in the reference legend. Defaults to the array position. */
  number?: number;
  tone?: DiagramTone;
}

/**
 * A visual question answered by tapping structures in an SVG figure. The
 * figure is shared with the topic's reference card, so learners can study the
 * labelled version before answering.
 */
export interface DiagramQuestion extends QuizQuestionBase {
  kind: 'diagram';
  /** SVG viewBox, e.g. `160 40 760 960`. */
  viewBox: string;
  /** Non-interactive outlines drawn under the regions. */
  backdrop: string[];
  regions: DiagramRegion[];
  /** Region ids that make up the answer. */
  correctIds: string[];
  /** Draw the names of the correct structures once the answer is checked. */
  revealNames?: boolean;
}

export interface QuizFigure {
  title: Localized;
  caption?: Localized;
  viewBox: string;
  backdrop: string[];
  regions: DiagramRegion[];
  /** Show a numbered legend under the figure. Defaults to true. */
  numbered?: boolean;
}

/** Tongue body positions used by the articulation studio. */
export type TonguePose =
  | 'rest'
  | 'dental'
  | 'alveolar'
  | 'postalveolar'
  | 'palatal'
  | 'velar'
  | 'high-front'
  | 'near-high-front'
  | 'low-front'
  | 'mid-central'
  | 'high-back'
  | 'low-back'
  | 'low';

/** Lip shapes: distance, protrusion and height of the two lip pads. */
export type LipPose = 'open' | 'closed' | 'round' | 'spread' | 'labiodental';

/** Raised velum closes the nasal cavity; a lowered velum opens it. */
export type VelumPose = 'raised' | 'lowered';

export type AirflowLane = 'oral' | 'nasal';

export type ArticulationManner = 'stop' | 'nasal' | 'fricative' | 'approximant' | 'vowel';

export type ArticulationPlace =
  | 'bilabial'
  | 'labiodental'
  | 'dental'
  | 'alveolar'
  | 'postalveolar'
  | 'palatal'
  | 'velar'
  | 'glottal';

export interface ArticulationPose {
  tongue: TonguePose;
  lips: LipPose;
  velum: VelumPose;
  airflow: AirflowLane;
}

/**
 * One playable sound for the articulation studio. The studio animates the
 * pose: where the airstream starts, whether the vocal cords vibrate, and which
 * articulators shape the sound.
 */
export interface ArticulationSound {
  id: string;
  /** IPA symbol shown on the chip and in the figure. */
  glyph: string;
  /** Example word that contains the sound. */
  word: Localized;
  manner: ArticulationManner;
  /** Where the stricture is. Omitted for vowels, which `shape` describes. */
  place?: ArticulationPlace;
  /** Vowel description, e.g. “high · front · unrounded”. */
  shape?: Localized;
  voiced: boolean;
  pose: ArticulationPose;
  /** One sentence on how this sound is produced. */
  summary: Localized;
}

export interface FlashcardQuestion extends QuizQuestionBase {
  kind: 'flashcard';
  back: Localized;
}

export type QuizQuestion =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FreeTextQuestion
  | MatchingQuestion
  | OrderingQuestion
  | ClozeQuestion
  | MapQuestion
  | DiagramQuestion
  | FlashcardQuestion;

/** Answer values, keyed by question kind. */
export type QuizAnswer =
  | string
  | string[]
  | boolean
  | Record<string, string>
  | 'known'
  | 'unknown';

export interface QuizTopic {
  id: string;
  title: Localized;
  summary: Localized;
  /** Meeting, lecture or chapter label, e.g. `1. Sitzung`. */
  meeting?: Localized;
  /** Where the content came from. */
  source?: Localized;
  /** Optional labelled reference figure shown above the round options. */
  figure?: QuizFigure;
  questions: QuizQuestion[];
}

export interface QuizStudy {
  id: string;
  title: Localized;
  /** Degree the study belongs to, e.g. `Bachelor of Arts`. */
  degree: Localized;
  /** Accent used for the study marker and tile edge. */
  color: string;
}

export interface QuizModule {
  id: string;
  code?: string;
  /** Study this module is taught in. See `quizStudies`. */
  studyId: string;
  /** Recommended semester in the degree program. */
  semester: number;
  title: Localized;
  subtitle: Localized;
  /** Shown in the module header, e.g. the professor's name. */
  lecturer?: string;
  email?: string;
  topics: QuizTopic[];
}

export type QuizMode = 'all' | 'quick' | 'review' | 'mixed';

/** Persisted per-question progress. */
export interface QuestionProgress {
  attempts: number;
  correct: number;
  lastCorrect: boolean | null;
  lastAt: string | null;
}

export interface QuizSessionRecord {
  id: string;
  topicId: string;
  mode: QuizMode;
  correct: number;
  total: number;
  at: string;
}

/**
 * A round that was left before the last question. It is persisted so the topic
 * overview can offer "continue" or "restart" instead of silently starting over.
 */
export interface ActiveQuizSession {
  topicId: string;
  mode: QuizMode;
  questionIds: string[];
  /** Current question, 0-based. */
  index: number;
  /** Draft answer of the current question, if any. */
  value: QuizAnswer | undefined;
  /** Whether the current question was already checked. */
  checked: boolean | null;
  results: { questionId: string; correct: boolean }[];
  startedAt: string;
  updatedAt: string;
}
