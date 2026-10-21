import { buildQuizPrompt, quizTopicSchema, type DraftTopic, type GeneratableKind } from './schema';

const ENDPOINT = 'https://api.x.ai/v1/responses';
const MAX_ATTEMPTS = 3;

export interface GenerateInput {
  apiKey: string;
  model: string;
  fileName: string;
  pages: number;
  text: string;
  moduleTitle: string;
  questionCount: number;
  kinds: GeneratableKind[];
  sourceLanguage: 'de' | 'en';
  feedback?: string;
}

export class GenerationError extends Error {}

/** Pulls the assistant message out of a Responses API payload. */
function outputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const body = payload as {
    output_text?: unknown;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  if (typeof body.output_text === 'string' && body.output_text.trim()) return body.output_text.trim();
  const parts: string[] = [];
  for (const item of body.output ?? []) {
    if (item.type !== 'message') continue;
    for (const block of item.content ?? []) {
      if (block.type === 'output_text' && block.text) parts.push(block.text);
    }
  }
  return parts.join('\n').trim();
}

/** Removes a Markdown code fence if the model wrapped the JSON. */
export function parseJsonBody(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new GenerationError('the model did not return JSON');
  }
}

async function requestOnce(input: GenerateInput): Promise<DraftTopic> {
  const prompt = buildQuizPrompt({
    fileName: input.fileName,
    pages: input.pages,
    text: input.text,
    moduleTitle: input.moduleTitle,
    questionCount: input.questionCount,
    kinds: input.kinds,
    sourceLanguage: input.sourceLanguage,
    feedback: input.feedback,
  });

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        store: false,
        max_output_tokens: 20_000,
        input: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'quiz_topic',
            schema: quizTopicSchema(input.questionCount),
            strict: true,
          },
        },
      }),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new GenerationError(`could not reach xAI: ${message}`);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 400);
    const suffix = detail ? `: ${detail}` : '';
    throw new GenerationError(`xAI answered ${response.status}${suffix}`);
  }

  const payload = (await response.json().catch(() => ({}))) as unknown;
  const text = outputText(payload);
  if (!text) throw new GenerationError('xAI returned an empty answer');

  const parsed = parseJsonBody(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new GenerationError('the model answer is not an object');
  }
  return parsed as DraftTopic;
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof GenerationError)) return false;
  return /\b(429|500|502|503|504)\b/.test(error.message);
}

export async function generateDraftTopic(input: GenerateInput): Promise<DraftTopic> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestOnce(input);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) break;
      const wait = attempt * 2_000;
      console.warn(`  xAI is busy (${(error as Error).message}); retrying in ${wait / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError instanceof Error ? lastError : new GenerationError(String(lastError));
}
