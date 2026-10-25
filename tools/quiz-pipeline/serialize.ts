import type { Localized } from '@ua/core/domain/types';
import type { QuizTopic } from '@ua/quiz-content/types';

function quote(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `'${escaped}'`;
}

function isLocalized(value: unknown): value is Localized {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('de') || !keys.includes('en')) return false;
  const candidate = value as Partial<Localized>;
  return typeof candidate.de === 'string' && typeof candidate.en === 'string';
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function serializePrimitive(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return quote(value);
  return String(value);
}

function serializeArray(value: unknown[], indent: number): string {
  if (value.length === 0) return '[]';
  const inner = ' '.repeat(indent + 2);

  if (value.every(isPrimitive)) {
    const inline = `[${value.map(serializePrimitive).join(', ')}]`;
    if (inline.length + indent <= 100) return inline;
  }

  if (value.every((entry) => Array.isArray(entry) && entry.every(isPrimitive))) {
    const inline = `[${value
      .map((entry) => `[${(entry as (string | number | boolean | null)[]).map(serializePrimitive).join(', ')}]`)
      .join(', ')}]`;
    if (inline.length + indent <= 100) return inline;
  }

  const lines = value.map((entry) => `${inner}${serialize(entry, indent + 2)},`);
  return `[\n${lines.join('\n')}\n${' '.repeat(indent)}]`;
}

function serializeObject(value: Record<string, unknown>, indent: number): string {
  if (isLocalized(value)) {
    return `l(${quote(value.de)}, ${quote(value.en)})`;
  }
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) return '{}';
  const inner = ' '.repeat(indent + 2);
  const lines = entries.map(([key, entry]) => {
    const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quote(key);
    return `${inner}${safeKey}: ${serialize(entry, indent + 2)},`;
  });
  return `{\n${lines.join('\n')}\n${' '.repeat(indent)}}`;
}

function serialize(value: unknown, indent: number): string {
  if (isPrimitive(value)) return serializePrimitive(value);
  if (Array.isArray(value)) return serializeArray(value, indent);
  if (value && typeof value === 'object') return serializeObject(value as Record<string, unknown>, indent);
  throw new Error(`cannot serialize ${typeof value}`);
}

/** Writes one generated topic as a source file the app can import. */
export function serializeTopicFile(topic: QuizTopic, exportName: string): string {
  return [
    "import type { QuizTopic } from '@ua/quiz-content/types';",
    '',
    "import { l } from '../helpers';",
    '',
    `export const ${exportName}: QuizTopic = ${serialize(topic, 0)};`,
    '',
  ].join('\n');
}
