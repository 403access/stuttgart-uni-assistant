#!/usr/bin/env tsx
/**
 * Build quiz topics from PDFs.
 *
 *   bun run quiz:from-pdf --module prag ./sitzung-2.pdf
 *   bun run quiz:from-pdf --module phil ./pdfs/ --questions 12
 *
 * The PDF is embedded text only; scanned pages need OCR first. Text and the
 * generated topic never leave the machine except for the xAI request. Generated
 * topics are committed source under `src/quiz/content/generated/` and attached
 * to an existing module by `src/quiz/content/index.ts`.
 */

import { basename, extname, relative, resolve } from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { quizModules, quizTopics } from '../src/quiz/content/index';
import { assertUsableText, capSource, extractPdf } from './quiz-pipeline/extract';
import { generateDraftTopic, GenerationError } from './quiz-pipeline/generate';
import { InvalidDraftError, normalizeTopic, topicIdFor } from './quiz-pipeline/normalize';
import {
  GENERATED_DIR,
  readRegistry,
  REPO_ROOT,
  topicFileExists,
  uniqueExportName,
  writeRegistry,
  writeTopicFile,
  type GeneratedEntry,
} from './quiz-pipeline/registry';
import {
  DEFAULT_KINDS,
  GENERATABLE_KINDS,
  type GeneratableKind,
} from './quiz-pipeline/schema';
import { serializeTopicFile } from './quiz-pipeline/serialize';

const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 30;
const DEFAULT_MAX_CHARS = 120_000;
const DEFAULT_MODEL = 'grok-4.7';

interface Options {
  moduleId: string;
  questions: number;
  kinds: GeneratableKind[];
  title?: string;
  meeting?: string;
  sourceLanguage: 'de' | 'en';
  maxChars: number;
  model: string;
  force: boolean;
  dryRun: boolean;
  help: boolean;
  inputs: string[];
}

function usage(): string {
  return [
    'Build quiz topics from PDFs and attach them to an existing module.',
    '',
    'Usage:',
    '  bun run quiz:from-pdf --module <id> [options] <pdf-or-directory...>',
    '',
    'Options:',
    '  -m, --module <id>       target module id (required)',
    `  -n, --questions <n>     questions per PDF (default ${DEFAULT_QUESTION_COUNT}, ${MIN_QUESTIONS}–${MAX_QUESTIONS})`,
    '  -k, --kinds <list>      comma-separated question kinds',
    `                          (default ${DEFAULT_KINDS.join(',')})`,
    '      --title <title>     override the topic title (one PDF only)',
    '      --meeting <label>   optional meeting label, e.g. "2. Sitzung"',
    '      --source-lang <de|en>  language of the PDF (default de)',
    `      --max-chars <n>     source characters sent to the model (default ${DEFAULT_MAX_CHARS})`,
    `      --model <id>        xAI model (default $QUIZ_MODEL or ${DEFAULT_MODEL})`,
    '      --force             overwrite a generated topic with the same id',
    '      --dry-run           print the topic JSON and write nothing',
    '  -h, --help              show this help',
    '',
    'Environment:',
    '  XAI_API_KEY             required; read from .env or the environment',
    '  QUIZ_MODEL              optional model override',
    '',
    'Examples:',
    '  bun run quiz:from-pdf --module prag ./sitzung-2.pdf',
    '  bun run quiz:from-pdf --module phil ./pdfs/ --questions 12',
    '  bun run quiz:from-pdf --module prag ./sitzung-2.pdf --dry-run',
  ].join('\n');
}

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function valueAfter(args: string[], index: number, name: string): string {
  const value = args[index];
  if (!value || value.startsWith('-')) fail(`--${name} needs a value`);
  return value;
}

export function parseArgs(args: string[]): Options {
  const options: Options = {
    moduleId: '',
    questions: DEFAULT_QUESTION_COUNT,
    kinds: [...DEFAULT_KINDS],
    sourceLanguage: 'de',
    maxChars: DEFAULT_MAX_CHARS,
    model: process.env.QUIZ_MODEL || DEFAULT_MODEL,
    force: false,
    dryRun: false,
    help: false,
    inputs: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      options.inputs.push(...args.slice(index + 1));
      break;
    }

    const equals = arg.startsWith('--') ? arg.indexOf('=') : -1;
    const name = equals >= 0 ? arg.slice(0, equals) : arg;
    const inline = equals >= 0 ? arg.slice(equals + 1) : undefined;

    switch (name) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-m':
      case '--module':
        options.moduleId = inline ?? valueAfter(args, (index += 1), 'module');
        break;
      case '-n':
      case '--questions': {
        const raw = inline ?? valueAfter(args, (index += 1), 'questions');
        const value = Number(raw);
        if (!Number.isInteger(value) || value < MIN_QUESTIONS || value > MAX_QUESTIONS) {
          fail(`--questions must be an integer between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}`);
        }
        options.questions = value;
        break;
      }
      case '-k':
      case '--kinds': {
        const raw = inline ?? valueAfter(args, (index += 1), 'kinds');
        const kinds = raw
          .split(',')
          .map((kind) => kind.trim())
          .filter(Boolean);
        const unknown = kinds.filter(
          (kind) => !(GENERATABLE_KINDS as readonly string[]).includes(kind),
        );
        if (unknown.length) {
          fail(
            `unknown question kind ${unknown.map((kind) => `"${kind}"`).join(', ')}; ` +
              `choose from ${GENERATABLE_KINDS.join(', ')}`,
          );
        }
        if (kinds.length === 0) fail('--kinds needs at least one question kind');
        options.kinds = [...new Set(kinds)] as GeneratableKind[];
        break;
      }
      case '--title':
        options.title = inline ?? valueAfter(args, (index += 1), 'title');
        break;
      case '--meeting':
        options.meeting = inline ?? valueAfter(args, (index += 1), 'meeting');
        break;
      case '--source-lang': {
        const raw = inline ?? valueAfter(args, (index += 1), 'source-lang');
        if (raw !== 'de' && raw !== 'en') fail('--source-lang must be de or en');
        options.sourceLanguage = raw;
        break;
      }
      case '--max-chars': {
        const raw = inline ?? valueAfter(args, (index += 1), 'max-chars');
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 5_000 || value > 500_000) {
          fail('--max-chars must be an integer between 5000 and 500000');
        }
        options.maxChars = value;
        break;
      }
      case '--model':
        options.model = inline ?? valueAfter(args, (index += 1), 'model');
        break;
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        if (arg.startsWith('-')) fail(`unknown option ${arg}`);
        options.inputs.push(arg);
    }
  }

  return options;
}

async function walk(directory: string, files: Set<string>): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path, files);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.pdf') {
      files.add(path);
    }
  }
}

export async function collectPdfs(inputs: string[]): Promise<string[]> {
  const files = new Set<string>();
  for (const input of inputs) {
    const path = resolve(input);
    const info = await stat(path).catch(() => null);
    if (!info) fail(`not found: ${input}`);
    if (info.isDirectory()) {
      await walk(path, files);
      continue;
    }
    if (!info.isFile()) fail(`not a file or directory: ${input}`);
    if (extname(path).toLowerCase() !== '.pdf') {
      fail(`only PDFs are supported: ${input}`);
    }
    files.add(path);
  }
  return [...files].sort((left, right) => left.localeCompare(right));
}

function loadEnv(): void {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  } catch {
    // The key may already be in the environment.
  }
}

function sourceLabel(fileName: string, pages: number) {
  return {
    de: `PDF: ${fileName} · ${pages} Seiten`,
    en: `PDF: ${fileName} · ${pages} pages`,
  };
}

interface Prepared {
  topic: ReturnType<typeof normalizeTopic>;
  path: string;
  exportName: string;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.moduleId) fail('--module is required. Run with --help for usage.');
  if (options.inputs.length === 0) fail('pass at least one PDF or a directory');

  loadEnv();
  const module = quizModules.find((entry) => entry.id === options.moduleId);
  if (!module) {
    fail(
      `unknown module "${options.moduleId}". Available modules: ` +
        quizModules.map((entry) => entry.id).join(', '),
    );
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    fail('XAI_API_KEY is not set. Add it to .env or export it before running.');
  }

  const files = await collectPdfs(options.inputs);
  if (files.length === 0) fail('no PDF files found');
  if (options.title && files.length > 1) {
    fail('--title only makes sense for a single PDF; run the command once per file');
  }

  const registry = await readRegistry();
  const registryById = new Map(registry.map((entry) => [entry.topicId, entry]));
  const existingIds = new Set(quizTopics.map((topic) => topic.id));
  const usedExports = new Set(registry.map((entry) => entry.exportName));

  console.log(
    `Generating ${options.questions} questions per PDF for module "${module.id}" ` +
      `(${module.title.de}) with ${options.model}`,
  );

  const prepared: Prepared[] = [];
  let failed = 0;

  for (const path of files) {
    const fileName = basename(path);
    console.log(`\n${fileName}`);

    try {
      const topicId = topicIdFor(module.id, fileName);
      if (prepared.some((entry) => entry.topic.id === topicId)) {
        throw new Error(
          `another PDF in this run also maps to topic "${topicId}"; rename one of the files`,
        );
      }
      const registered = registryById.get(topicId);
      const fileExists = await topicFileExists(topicId);

      if (!options.dryRun) {
        if (registered && !options.force) {
          throw new Error(`topic "${topicId}" already exists; pass --force to overwrite it`);
        }
        if (fileExists && !registered) {
          throw new Error(
            `src/quiz/content/generated/${topicId}.ts exists but is not registered; ` +
              'remove it or pass --force',
          );
        }
        if (existingIds.has(topicId) && !registered) {
          throw new Error(`topic id "${topicId}" collides with hand-authored content`);
        }
      }

      console.log('  reading PDF');
      const extracted = await extractPdf(path);
      assertUsableText(extracted.text);
      const capped = capSource(extracted.text, options.maxChars);
      console.log(
        `  ${extracted.pages} pages · ${capped.text.length.toLocaleString('en-US')} characters` +
          (capped.truncated ? ' (truncated)' : ''),
      );

      console.log('  asking the model');
      let topic: ReturnType<typeof normalizeTopic> | undefined;
      let feedback: string | undefined;
      for (let attempt = 1; attempt <= 2 && !topic; attempt += 1) {
        const draft = await generateDraftTopic({
          apiKey,
          model: options.model,
          fileName,
          pages: extracted.pages,
          text: capped.text,
          moduleTitle: module.title.de,
          questionCount: options.questions,
          kinds: options.kinds,
          sourceLanguage: options.sourceLanguage,
          feedback,
        });
        try {
          topic = normalizeTopic(draft, {
            topicId,
            source: sourceLabel(fileName, extracted.pages),
            meeting: options.meeting,
            titleOverride: options.title,
            allowedKinds: options.kinds,
          });
        } catch (error) {
          if (!(error instanceof InvalidDraftError) || attempt === 2) throw error;
          feedback = error.message;
          console.warn(`  rejected the first answer: ${error.message}`);
        }
      }
      if (!topic) throw new Error('the model produced no usable topic');

      const exportName =
        registered?.exportName ??
        uniqueExportName(topic.id, usedExports);
      usedExports.add(exportName);
      prepared.push({ topic, path, exportName });
      console.log(`  ok: ${topic.questions.length} questions, id "${topic.id}"`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  failed: ${message}`);
    }
  }

  if (options.dryRun) {
    for (const entry of prepared) {
      console.log(`\n// ${entry.path}`);
      console.log(JSON.stringify(entry.topic, null, 2));
    }
    console.log(`\nDry run: ${prepared.length} topic(s) would be written, ${failed} failed.`);
    if (failed > 0) process.exitCode = 1;
    return;
  }

  if (prepared.length > 0) {
    const entries: GeneratedEntry[] = [...registry];
    for (const entry of prepared) {
      const source = serializeTopicFile(entry.topic, entry.exportName);
      const path = await writeTopicFile(entry.topic.id, source);
      console.log(`wrote ${relative(REPO_ROOT, path)}`);
      const index = entries.findIndex((item) => item.topicId === entry.topic.id);
      const next: GeneratedEntry = {
        moduleId: module.id,
        topicId: entry.topic.id,
        exportName: entry.exportName,
      };
      if (index >= 0) entries[index] = next;
      else entries.push(next);
    }
    await writeRegistry(entries);
    console.log(`updated ${relative(REPO_ROOT, `${GENERATED_DIR}/index.ts`)}`);
  }

  console.log(
    `\n${prepared.length} topic(s) written, ${failed} failed. ` +
      'Run `bun run check` to validate the new content.',
  );
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    if (error instanceof GenerationError || error instanceof InvalidDraftError) {
      fail(error.message);
    }
    console.error(error);
    process.exit(1);
  });
}
