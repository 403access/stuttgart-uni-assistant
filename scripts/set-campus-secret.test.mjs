import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { mask, normalize, readValue, writeKey } from './set-campus-secret.mjs';

const scriptPath = fileURLToPath(new URL('./set-campus-secret.mjs', import.meta.url));
const sandboxes = [];

async function sandbox(files = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'campus-secret-'));
  sandboxes.push(dir);
  await mkdir(join(dir, 'scripts'), { recursive: true });
  await copyFile(scriptPath, join(dir, 'scripts', 'set-campus-secret.mjs'));
  for (const [name, content] of Object.entries(files)) await writeFile(join(dir, name), content);
  return dir;
}

// spawn with an explicitly closed stdin: execFile's `input` never delivers
// EOF to a stdin-reading child in this environment, so the CLI would hang.
function run(dir, args, input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(dir, 'scripts', 'set-campus-secret.mjs'), ...args], {
      cwd: dir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 124, stdout, stderr: `${stderr}\n(timed out)` });
    }, 15_000);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.stdin.end(input ?? '');
  });
}

async function readDotenv(dir) {
  return readFile(join(dir, '.env'), 'utf8');
}

test.afterEach(async () => {
  while (sandboxes.length) await rm(sandboxes.pop(), { recursive: true, force: true });
});

test('a bare token passes through, a header is stripped', () => {
  assert.equal(normalize('token', 'abc123tokenvalue'), 'abc123tokenvalue');
  assert.equal(normalize('token', 'Bearer abc123tokenvalue'), 'abc123tokenvalue');
  assert.equal(normalize('token', 'bearer abc123tokenvalue'), 'abc123tokenvalue');
  assert.equal(normalize('token', 'Authorization: Bearer abc123tokenvalue'), 'abc123tokenvalue');
  assert.equal(normalize('token', '"abc123tokenvalue"'), 'abc123tokenvalue');
  assert.equal(normalize('token', '  abc123tokenvalue\n'), 'abc123tokenvalue');
  assert.equal(normalize('token', ''), '');
});

test('a session value is extracted from a pasted cookie string', () => {
  assert.equal(normalize('cookie', '8A0D71sessionvalue'), '8A0D71sessionvalue');
  assert.equal(normalize('cookie', 'PSESSIONID=8A0D71sessionvalue'), '8A0D71sessionvalue');
  assert.equal(
    normalize('cookie', 'CO_LANG=de; PSESSIONID=8A0D71sessionvalue; CO_PROFILE=student'),
    '8A0D71sessionvalue',
  );
  assert.equal(normalize('cookie', 'Cookie: PSESSIONID=8A0D71sessionvalue'), '8A0D71sessionvalue');
  assert.equal(normalize('cookie', ''), '');
});

test('the mask shows a fragment and never the whole value', () => {
  assert.equal(mask(''), '(empty)');
  assert.equal(mask('short'), '…(5 chars)');
  assert.equal(mask('abcdefgh'), '…(8 chars)');
  assert.equal(mask('abcdefghi'), 'abcd…hi (9 chars)');
});

test('writing a key replaces the line and keeps the neighbors', () => {
  const next = writeKey('# comment\nCAMPUS_BEARER_TOKEN=old-value\nCAMPUS_STUDY_ID=339485\n', 'CAMPUS_BEARER_TOKEN', 'new-value');
  assert.equal(next, '# comment\nCAMPUS_BEARER_TOKEN=new-value\nCAMPUS_STUDY_ID=339485\n');
});

test('writing a missing key appends it after a blank line', () => {
  assert.equal(writeKey('XAI_API_KEY=keepme\n', 'CAMPUS_BEARER_TOKEN', 'new-value'), 'XAI_API_KEY=keepme\n\nCAMPUS_BEARER_TOKEN=new-value\n');
  assert.equal(writeKey('', 'CAMPUS_BEARER_TOKEN', 'new-value'), 'CAMPUS_BEARER_TOKEN=new-value\n');
});

test('writing a key keeps CRLF line endings', () => {
  const next = writeKey('A=1\r\nCAMPUS_BEARER_TOKEN=old\r\n', 'CAMPUS_BEARER_TOKEN', 'new');
  assert.equal(next, 'A=1\r\nCAMPUS_BEARER_TOKEN=new\r\n');
  assert.ok(!/[^\r]\n/.test(next));
});

test('reading a value strips quotes and reports a missing key as empty', () => {
  assert.equal(readValue('CAMPUS_BEARER_TOKEN="abc123"\n', 'CAMPUS_BEARER_TOKEN'), 'abc123');
  assert.equal(readValue('XAI_API_KEY=\n', 'CAMPUS_BEARER_TOKEN'), '');
});

test('setting the token stores the bare value and masks the output', async () => {
  const dir = await sandbox({ '.env': '# lead\nXAI_API_KEY=keepme\nCAMPUS_BEARER_TOKEN=old-token-value\n' });
  const { code, stdout } = await run(dir, ['token', 'Bearer new-token-value']);
  assert.equal(code, 0);
  assert.equal(await readDotenv(dir), '# lead\nXAI_API_KEY=keepme\nCAMPUS_BEARER_TOKEN=new-token-value\n');
  assert.ok(!stdout.includes('new-token-value'));
  assert.ok(stdout.includes('CAMPUS_BEARER_TOKEN'));
  if (process.platform !== 'win32') assert.equal((await stat(join(dir, '.env'))).mode & 0o777, 0o600);
});

test('setting the session pulls PSESSIONID out of the cookie string', async () => {
  const dir = await sandbox({ '.env': 'CAMPUS_SESSION_COOKIE=\n' });
  const { code } = await run(dir, ['session', 'CO_LANG=de; PSESSIONID=8A0D71abcdef; CO_PROFILE=student']);
  assert.equal(code, 0);
  assert.equal(await readDotenv(dir), 'CAMPUS_SESSION_COOKIE=8A0D71abcdef\n');
});

test('a piped value is accepted without arguments', async () => {
  const dir = await sandbox({ '.env': 'CAMPUS_BEARER_TOKEN=\n' });
  const { code } = await run(dir, ['token'], 'piped-token-value\n');
  assert.equal(code, 0);
  assert.equal(await readDotenv(dir), 'CAMPUS_BEARER_TOKEN=piped-token-value\n');
});

test('an empty value changes nothing', async () => {
  const dir = await sandbox({ '.env': 'CAMPUS_BEARER_TOKEN=old-token-value\n' });
  const { code, stderr } = await run(dir, ['session'], '');
  assert.equal(code, 1);
  assert.match(stderr, /No value given/);
  assert.equal(await readDotenv(dir), 'CAMPUS_BEARER_TOKEN=old-token-value\n');
});

test('a value with whitespace is refused', async () => {
  const dir = await sandbox({ '.env': 'CAMPUS_BEARER_TOKEN=\n' });
  const { code, stderr } = await run(dir, ['token', 'two words']);
  assert.equal(code, 1);
  assert.match(stderr, /whitespace/);
});

test('--help after a command shows usage and never writes a value', async () => {
  const dir = await sandbox({ '.env': 'CAMPUS_BEARER_TOKEN=old-token-value\n' });
  const { code, stdout } = await run(dir, ['token', '--help']);
  assert.equal(code, 0);
  assert.match(stdout, /campus:token/);
  assert.equal(await readDotenv(dir), 'CAMPUS_BEARER_TOKEN=old-token-value\n');
});

test('an unknown option is refused without writing', async () => {
  const dir = await sandbox({ '.env': 'CAMPUS_BEARER_TOKEN=\n' });
  const { code, stderr } = await run(dir, ['token', '--nope']);
  assert.equal(code, 1);
  assert.match(stderr, /Unknown option/);
  assert.equal(await readDotenv(dir), 'CAMPUS_BEARER_TOKEN=\n');
});

test('an unknown command fails', async () => {
  const dir = await sandbox({ '.env': 'CAMPUS_BEARER_TOKEN=\n' });
  const { code, stderr } = await run(dir, ['banana', 'value']);
  assert.equal(code, 1);
  assert.match(stderr, /Unknown command/);
});

test('a missing .env is seeded from .env.example', async () => {
  const dir = await sandbox({ '.env.example': '# sample\nCAMPUS_BEARER_TOKEN=\n' });
  const { code, stdout } = await run(dir, ['token', 'fresh-token-value']);
  assert.equal(code, 0);
  assert.match(stdout, /Created \.env from \.env\.example/);
  assert.equal(await readDotenv(dir), '# sample\nCAMPUS_BEARER_TOKEN=fresh-token-value\n');
});

test('list shows masks and never the raw secret', async () => {
  const token = 'test-token-value-that-is-forty-chars-xxx';
  assert.equal(token.length, 40);
  const dir = await sandbox({ '.env': `CAMPUS_BEARER_TOKEN=${token}\n` });
  const { code, stdout } = await run(dir, ['list']);
  assert.equal(code, 0);
  assert.ok(stdout.includes(mask(token)));
  assert.ok(!stdout.includes(token));
});
