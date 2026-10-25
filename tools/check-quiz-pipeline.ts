import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { capSource, cleanPdfText } from './quiz-pipeline/extract';
import { generateDraftTopic } from './quiz-pipeline/generate';
import {
  InvalidDraftError,
  normalizeTopic,
  slugify,
  topicIdFor,
} from './quiz-pipeline/normalize';
import {
  readRegistry,
  topicExportName,
  uniqueExportName,
  writeRegistry,
  type GeneratedEntry,
} from './quiz-pipeline/registry';
import type { DraftQuestion, DraftTopic } from './quiz-pipeline/schema';
import { serializeTopicFile } from './quiz-pipeline/serialize';
import { parseArgs } from './quiz-from-pdf';

const failures: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
    console.error('FAIL', message);
  } else {
    console.log('ok', message);
  }
}

function expectInvalid(run: () => unknown, label: string) {
  try {
    run();
    expect(false, label);
  } catch (error) {
    expect(error instanceof InvalidDraftError, label);
  }
}

function question(index: number, overrides: Partial<DraftQuestion> = {}): DraftQuestion {
  return {
    kind: 'single',
    difficulty: 2,
    prompt: { de: `Frage ${index}?`, en: `Question ${index}?` },
    explanation: { de: `Erklärung ${index}.`, en: `Explanation ${index}.` },
    hint: null,
    options: [
      { label: { de: 'Antwort A', en: 'Answer A' } },
      { label: { de: 'Antwort B', en: 'Answer B' } },
      { label: { de: 'Antwort C', en: 'Answer C' } },
      { label: { de: 'Antwort D', en: 'Answer D' } },
    ],
    correctOption: 0,
    correctOptions: null,
    correct: null,
    accepted: null,
    keywords: null,
    pairs: null,
    items: null,
    segments: null,
    back: null,
    ...overrides,
  };
}

function draft(questions: DraftQuestion[], overrides: Partial<DraftTopic> = {}): DraftTopic {
  return {
    title: { de: 'Testthema', en: 'Test topic' },
    summary: { de: 'Zusammenfassung.', en: 'Summary.' },
    meeting: { de: '1. Sitzung', en: 'Session 1' },
    questions,
    ...overrides,
  };
}

function topic(draftValue: DraftTopic, overrides: Record<string, unknown> = {}) {
  return normalizeTopic(draftValue, {
    topicId: 'prag-test',
    source: { de: 'PDF: test.pdf', en: 'PDF: test.pdf' },
    ...overrides,
  });
}

// Slugs stay ASCII and stable, and the module prefix is only added once.
expect(slugify('Sitzung 2: Phonem & Morphem (Übung)') === 'sitzung-2-phonem-morphem-uebung', 'slugify transliterates umlauts');
expect(topicIdFor('prag', 'Sitzung 2.pdf') === 'prag-sitzung-2', 'topic id uses the module and file name');
expect(topicIdFor('prag', 'prag-sitzung-2.pdf') === 'prag-sitzung-2', 'topic id does not repeat the module prefix');
expect(topicExportName('prag-sitzung-2') === 'pragSitzung2', 'export name is camel case');
expect(uniqueExportName('prag-sitzung-2', new Set(['pragSitzung2'])) === 'pragSitzung22', 'export names can be disambiguated');

const text = cleanPdfText('Zeile 1\r\nZeile   2\n\n\n\nZeile 3');
expect(text === 'Zeile 1\nZeile 2\n\nZeile 3', 'PDF text collapses line noise');
const capped = capSource('abcdefghij', 4);
expect(capped.truncated && capped.text.startsWith('abcd'), 'source cap truncates and marks the result');

const mixedQuestions: DraftQuestion[] = [
  question(1),
  question(2, {
    kind: 'multiple',
    correctOptions: [1, 2],
    correctOption: null,
  }),
  question(3, {
    kind: 'true-false',
    options: null,
    correctOption: null,
    correct: false,
  }),
  question(4, {
    kind: 'free-text',
    options: null,
    correctOption: null,
    accepted: ['Antwort', 'answer'],
    keywords: [['kern', 'core'], ['folge', 'consequence']],
  }),
  question(5, {
    kind: 'matching',
    options: null,
    correctOption: null,
    pairs: [
      { left: { de: 'A', en: 'A' }, right: { de: '1', en: '1' } },
      { left: { de: 'B', en: 'B' }, right: { de: '2', en: '2' } },
    ],
  }),
  question(6, {
    kind: 'ordering',
    options: null,
    correctOption: null,
    items: [
      { de: 'Erst', en: 'First' },
      { de: 'Dann', en: 'Then' },
    ],
  }),
  question(7, {
    kind: 'cloze',
    options: null,
    correctOption: null,
    segments: [
      { type: 'text', text: { de: 'Ein ', en: 'A ' }, accepted: null, width: null },
      { type: 'blank', text: null, accepted: ['Phonem', 'phoneme'], width: 12 },
      { type: 'text', text: { de: ' ist klein.', en: ' is small.' }, accepted: null, width: null },
    ],
  }),
  question(8, {
    kind: 'flashcard',
    options: null,
    correctOption: null,
    back: { de: 'Die Antwort.', en: 'The answer.' },
  }),
];

const normalized = topic(draft(mixedQuestions));
expect(normalized.id === 'prag-test', 'normalize keeps the topic id');
expect(normalized.questions.length === 8, 'normalize keeps every question');
expect(normalized.questions[0].id === 'prag-test-q1', 'question ids are sequential and scoped to the topic');
expect(
  normalized.questions[0].kind === 'single' &&
    normalized.questions[0].options.map((option) => option.id).join('') === 'abcd' &&
    normalized.questions[0].correctId === 'a',
  'single choice gets option ids and a correct id',
);
expect(
  normalized.questions[1].kind === 'multiple' &&
    normalized.questions[1].correctIds.join(',') === 'b,c',
  'multiple choice maps its correct indexes',
);
expect(
  normalized.questions[2].kind === 'true-false' && normalized.questions[2].correct === false,
  'true/false keeps the boolean',
);
expect(
  normalized.questions[3].kind === 'free-text' &&
    normalized.questions[3].accepted.length === 2 &&
    normalized.questions[3].keywords?.length === 2,
  'free text keeps accepted answers and keyword groups',
);
expect(
  normalized.questions[4].kind === 'matching' &&
    normalized.questions[4].pairs.map((pair) => pair.id).join(',') === 'p1,p2',
  'matching pairs get ids',
);
expect(
  normalized.questions[5].kind === 'ordering' &&
    normalized.questions[5].items.map((item) => item.id).join(',') === 'i1,i2',
  'ordering items keep their order and get ids',
);
expect(
  normalized.questions[6].kind === 'cloze' &&
    normalized.questions[6].segments.filter((segment) => segment.type === 'blank').length === 1,
  'cloze keeps one blank per source blank',
);
expect(
  normalized.questions[7].kind === 'flashcard' && normalized.questions[7].back.de === 'Die Antwort.',
  'flashcards keep their back',
);

expectInvalid(
  () => topic(draft(mixedQuestions.slice(0, 4))),
  'fewer than five questions is rejected',
);
expectInvalid(
  () =>
    topic(
      draft([
        ...mixedQuestions.slice(0, 7),
        question(8, { prompt: { de: 'Frage 1?', en: 'Question 1?' } }),
      ]),
    ),
  'duplicate prompts are rejected',
);
expectInvalid(
  () =>
    topic(
      draft([
        question(1, { correctOption: 9 }),
        ...mixedQuestions.slice(1),
      ]),
    ),
  'a correct option outside the option list is rejected',
);
expectInvalid(
  () =>
    topic(
      draft([
        question(1, { prompt: { de: 'Frage 1?', en: '   ' } }),
        ...mixedQuestions.slice(1),
      ]),
    ),
  'a missing English translation is rejected',
);
expectInvalid(
  () =>
    topic(
      draft([
        question(1, {
          options: [
            { label: { de: 'Gleich', en: 'Same' } },
            { label: { de: 'Gleich', en: 'Same' } },
          ],
        }),
        ...mixedQuestions.slice(1),
      ]),
    ),
  'duplicate options are rejected',
);
expectInvalid(
  () =>
    topic(
      draft([
        question(1, { kind: 'multiple', correctOptions: [0, 1, 2, 3], correctOption: null }),
        ...mixedQuestions.slice(1),
      ]),
    ),
  'multiple choice cannot mark every option correct',
);
expectInvalid(
  () => topic(draft(mixedQuestions), { allowedKinds: ['single'] }),
  'a kind outside --kinds is rejected',
);

const serialized = serializeTopicFile(normalized, 'pragTest');
expect(serialized.includes("import type { QuizTopic } from '@ua/quiz-content/types';"), 'serializer emits the type import');
expect(serialized.includes("import { l } from '../helpers';"), 'serializer emits the localized helper import');
expect(serialized.includes('export const pragTest: QuizTopic = {'), 'serializer emits a typed export');
expect(serialized.includes("title: l('Testthema', 'Test topic'),"), 'serializer renders localized strings');
expect(!serialized.includes('undefined'), 'serializer never writes undefined');
expect(serialized.includes("id: 'prag-test-q1',"), 'serializer keeps ids');
expect(serialized.includes("correctIds: ['b', 'c'],"), 'serializer renders id arrays inline');

const quoted = topic(
  draft(mixedQuestions, {
    title: { de: 'Karls \'Zitat\'\nneu', en: 'Karl\'s \'quote\'\nnew' },
  }),
);
const quotedSource = serializeTopicFile(quoted, 'pragQuote');
expect(quotedSource.includes("l('Karls \\'Zitat\\'\\nneu', 'Karl\\'s \\'quote\\'\\nnew')"), 'serializer escapes quotes and newlines');

async function checkGeneration() {
  const originalFetch = globalThis.fetch;
  let request: { url: string; body: Record<string, unknown> } | undefined;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    request = {
      url: String(input),
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    };
    return new Response(JSON.stringify({ output_text: JSON.stringify(draft(mixedQuestions)) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const generated = await generateDraftTopic({
      apiKey: 'test-key',
      model: 'test-model',
      fileName: 'test.pdf',
      pages: 3,
      text: 'Test document text',
      moduleTitle: 'Pragmatik I',
      questionCount: mixedQuestions.length,
      kinds: ['single', 'multiple', 'true-false', 'free-text', 'matching', 'ordering', 'cloze', 'flashcard'],
      sourceLanguage: 'de',
    });
    expect(generated.questions.length === mixedQuestions.length, 'generation parses the structured answer');
    expect(Boolean(request?.url.endsWith('/v1/responses')), 'generation calls the Responses API');
    expect(request?.body.model === 'test-model', 'generation sends the model');
    const format = (request?.body.text as { format?: Record<string, unknown> } | undefined)?.format;
    expect(format?.type === 'json_schema' && format.strict === true, 'generation requests strict JSON schema output');
    const input = request?.body.input as { role: string; content: string }[] | undefined;
    expect(Boolean(input?.[1]?.content.includes('Test document text')), 'generation sends the document text');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function checkRegistryAndArgs() {
  await checkGeneration();
  const temporary = await mkdtemp(join(tmpdir(), 'quiz-registry-'));
  try {
    const path = join(temporary, 'index.ts');
    const entries: GeneratedEntry[] = [
      { moduleId: 'prag', topicId: 'prag-b', exportName: 'pragB' },
      { moduleId: 'phil', topicId: 'phil-a', exportName: 'philA' },
    ];
    await writeRegistry(entries, path);
    const read = await readRegistry(path);
    expect(
      read.length === 2 &&
        read[0].moduleId === 'phil' &&
        read[0].topicId === 'phil-a' &&
        read[1].moduleId === 'prag' &&
        read[1].exportName === 'pragB',
      'the generated registry round-trips',
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }

  const args = parseArgs([
    '--module',
    'prag',
    '--questions=12',
    '--kinds',
    'single,cloze,free-text',
    '--force',
    '--dry-run',
    'lecture.pdf',
  ]);
  expect(args.moduleId === 'prag' && args.questions === 12, 'the CLI parses module and question count');
  expect(args.kinds.join(',') === 'single,cloze,free-text', 'the CLI parses question kinds');
  expect(args.force && args.dryRun && args.inputs[0] === 'lecture.pdf', 'the CLI parses flags and inputs');

  if (failures.length) {
    console.error(`\n${failures.length} quiz pipeline check(s) failed.`);
    process.exit(1);
  }
  console.log('\nQuiz pipeline checks passed.');
}

checkRegistryAndArgs().catch((error) => {
  console.error(error);
  process.exit(1);
});
