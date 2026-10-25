/**
 * The contract between the PDF pipeline and the model.
 *
 * The model returns a draft with indexes instead of ids: `correctOption` points
 * into `options`, and the normalizer assigns stable option, pair, and item ids
 * afterwards. That keeps the model's job simple and makes duplicate ids
 * impossible.
 */

export const GENERATABLE_KINDS = [
  'single',
  'multiple',
  'true-false',
  'free-text',
  'matching',
  'ordering',
  'cloze',
  'flashcard',
] as const;

export type GeneratableKind = (typeof GENERATABLE_KINDS)[number];

/** Kinds that work without hand-authored structure in the source document. */
export const DEFAULT_KINDS: GeneratableKind[] = [
  'single',
  'multiple',
  'true-false',
  'free-text',
  'cloze',
  'flashcard',
];

export interface DraftLocalized {
  de: string;
  en: string;
}

export interface DraftOption {
  label: DraftLocalized;
}

export interface DraftPair {
  left: DraftLocalized;
  right: DraftLocalized;
}

export interface DraftSegment {
  type: 'text' | 'blank';
  text: DraftLocalized | null;
  accepted: string[] | null;
  width: number | null;
}

export interface DraftQuestion {
  kind: GeneratableKind;
  difficulty: number | null;
  prompt: DraftLocalized;
  explanation: DraftLocalized | null;
  hint: DraftLocalized | null;
  options: DraftOption[] | null;
  /** Zero-based index into `options`, for `single`. */
  correctOption: number | null;
  /** Zero-based indexes into `options`, for `multiple`. */
  correctOptions: number[] | null;
  /** Answer for `true-false`. */
  correct: boolean | null;
  /** Short accepted spellings for `free-text`. */
  accepted: string[] | null;
  /** Each inner array is one required fact; any entry satisfies it. */
  keywords: string[][] | null;
  /** Pairs for `matching`; ids are assigned during normalization. */
  pairs: DraftPair[] | null;
  /** Items for `ordering`, already in the correct order. */
  items: DraftLocalized[] | null;
  /** Inline sentence segments for `cloze`. */
  segments: DraftSegment[] | null;
  /** Back of a `flashcard`. */
  back: DraftLocalized | null;
}

export interface DraftTopic {
  title: DraftLocalized;
  summary: DraftLocalized;
  meeting: DraftLocalized | null;
  questions: DraftQuestion[];
}

function nullable(schema: Record<string, unknown>): Record<string, unknown> {
  return { anyOf: [schema, { type: 'null' }] };
}

const localized = {
  type: 'object',
  properties: {
    de: { type: 'string', minLength: 1 },
    en: { type: 'string', minLength: 1 },
  },
  required: ['de', 'en'],
  additionalProperties: false,
};

const questionSchema = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: [...GENERATABLE_KINDS] },
    difficulty: { anyOf: [{ type: 'integer', minimum: 1, maximum: 3 }, { type: 'null' }] },
    prompt: localized,
    explanation: nullable(localized),
    hint: nullable(localized),
    options: nullable({
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: {
        type: 'object',
        properties: { label: localized },
        required: ['label'],
        additionalProperties: false,
      },
    }),
    correctOption: nullable({ type: 'integer', minimum: 0, maximum: 7 }),
    correctOptions: nullable({
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: { type: 'integer', minimum: 0, maximum: 7 },
    }),
    correct: nullable({ type: 'boolean' }),
    accepted: nullable({
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: { type: 'string', minLength: 1 },
    }),
    keywords: nullable({
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 6,
        items: { type: 'string', minLength: 1 },
      },
    }),
    pairs: nullable({
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: {
        type: 'object',
        properties: { left: localized, right: localized },
        required: ['left', 'right'],
        additionalProperties: false,
      },
    }),
    items: nullable({
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: localized,
    }),
    segments: nullable({
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['text', 'blank'] },
          text: nullable(localized),
          accepted: nullable({
            type: 'array',
            minItems: 1,
            maxItems: 6,
            items: { type: 'string', minLength: 1 },
          }),
          width: nullable({ type: 'integer', minimum: 3, maximum: 32 }),
        },
        required: ['type', 'text', 'accepted', 'width'],
        additionalProperties: false,
      },
    }),
    back: nullable(localized),
  },
  required: [
    'kind',
    'difficulty',
    'prompt',
    'explanation',
    'hint',
    'options',
    'correctOption',
    'correctOptions',
    'correct',
    'accepted',
    'keywords',
    'pairs',
    'items',
    'segments',
    'back',
  ],
  additionalProperties: false,
};

export function quizTopicSchema(questions: number) {
  return {
    type: 'object',
    properties: {
      title: localized,
      summary: localized,
      meeting: nullable(localized),
      questions: {
        type: 'array',
        minItems: questions,
        maxItems: questions,
        items: questionSchema,
      },
    },
    required: ['title', 'summary', 'meeting', 'questions'],
    additionalProperties: false,
  };
}

export interface PromptInput {
  fileName: string;
  pages: number;
  text: string;
  moduleTitle: string;
  questionCount: number;
  kinds: GeneratableKind[];
  sourceLanguage: 'de' | 'en';
  feedback?: string;
}

export function buildQuizPrompt(input: PromptInput): { system: string; user: string } {
  const system = [
    'You write retrieval-practice quizzes for university students.',
    'You receive the extracted text of one PDF from a course. Build a quiz from that document only.',
    '',
    'Hard rules:',
    '- Every question must be answerable from the supplied text. Never use outside knowledge.',
    '- Never ask about the document itself (page numbers, layout, file name, authors, or copyright).',
    '- Wrong answer options must be clearly wrong according to the document, not merely less precise.',
    '- Do not duplicate a question or test the same fact twice.',
    '- Every prompt, option, explanation, hint, pair, item, and flashcard back needs natural German and English.',
    '- Keep technical terms in both languages; translate only the surrounding sentence.',
    '- Use the document’s language for `de`; write natural English for `en`.',
    '- Explanations are 1–3 sentences and say why the answer is right, not just that it is.',
    '- Set every field that the chosen kind does not use to null.',
    '',
    'Question kinds you may use:',
    '- single: one correct option. Provide 4 options and `correctOption`.',
    '- multiple: two or more correct options. Provide 4–5 options and `correctOptions`.',
    '- true-false: a claim plus `correct`. Prefer claims that need understanding, not trivia.',
    '- free-text: a short answer. Provide 1–4 accepted spellings (German and English) and 1–3 keyword groups. Each keyword group is one required fact; any entry from a group satisfies it.',
    '- matching: 3–5 pairs of terms and definitions, causes and effects, or examples and concepts.',
    '- ordering: 3–5 steps or stages in `items`, already in the correct order.',
    '- cloze: one sentence split into `segments`. Text segments carry `text`; blanks carry `accepted` (German and English variants) and an optional `width`. Use 1–3 blanks and copy the wording faithfully.',
    '- flashcard: a prompt on the front and the answer in `back`.',
    '',
    'Indexes are zero-based. `correctOption` indexes `options`; `correctOptions` indexes `options`.',
    '`difficulty` is 1 (easy), 2 (medium), or 3 (hard). Aim for roughly 30% easy, 50% medium, 20% hard.',
    'Return exactly the requested number of questions.',
  ].join('\n');

  const user = [
    `MODULE: ${input.moduleTitle}`,
    `DOCUMENT: ${input.fileName}`,
    `PAGES: ${input.pages}`,
    `SOURCE LANGUAGE: ${input.sourceLanguage === 'de' ? 'German (write English translations)' : 'English (write German translations)'}`,
    `QUESTION COUNT: ${input.questionCount}`,
    `ALLOWED KINDS: ${input.kinds.join(', ')}`,
    '',
    'DOCUMENT TEXT:',
    input.text,
    '',
    input.feedback ? `The previous attempt was rejected: ${input.feedback}\nReturn a corrected quiz.` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { system, user };
}
