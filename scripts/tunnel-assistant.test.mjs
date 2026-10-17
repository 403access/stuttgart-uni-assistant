import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractHostname, parseArgs } from './tunnel-assistant.mjs';

const scriptPath = fileURLToPath(new URL('./tunnel-assistant.mjs', import.meta.url));
const dependencyPath = fileURLToPath(new URL('./set-campus-secret.mjs', import.meta.url));
const sandboxes = [];

async function sandbox() {
  const dir = await mkdtemp(join(tmpdir(), 'assistant-tunnel-'));
  sandboxes.push(dir);
  await mkdir(join(dir, 'scripts'), { recursive: true });
  await copyFile(scriptPath, join(dir, 'scripts', 'tunnel-assistant.mjs'));
  await copyFile(dependencyPath, join(dir, 'scripts', 'set-campus-secret.mjs'));
  return dir;
}

// spawn with an explicitly closed stdin, like the secrets-CLI test.
function run(dir, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(dir, 'scripts', 'tunnel-assistant.mjs'), ...args], {
      cwd: dir,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
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
    }, 20_000);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

// The box cloudflared prints on a quick tunnel. The hostname is the only line
// the script needs; everything else is forwarded to stderr unchanged.
const quickTunnelBox = [
  '2026-10-17T12:53:32Z INF +--------------------------------------------------------------------------------------------+',
  '2026-10-17T12:53:32Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |',
  '2026-10-17T12:53:32Z INF |  https://announces-grill-edge-ventures.trycloudflare.com                                   |',
  '2026-10-17T12:53:32Z INF +--------------------------------------------------------------------------------------------+',
].join('\n');

test('extractHostname reads the hostname out of the cloudflared box', () => {
  assert.equal(extractHostname(quickTunnelBox), 'https://announces-grill-edge-ventures.trycloudflare.com');
});

test('extractHostname finds a hostname that arrived in two chunks', () => {
  const half = Math.floor(quickTunnelBox.length / 2);
  const buffer = `${quickTunnelBox.slice(0, half)}${quickTunnelBox.slice(half)}`;
  assert.equal(extractHostname(buffer), 'https://announces-grill-edge-ventures.trycloudflare.com');
  // Neither half alone carries the whole name, so the caller has to keep a buffer.
  assert.equal(extractHostname(quickTunnelBox.slice(0, 200)), '');
});

test('extractHostname ignores named tunnels and unrelated URLs', () => {
  assert.equal(extractHostname('INF |  https://assistant.example.uni-stuttgart.de  |'), '');
  assert.equal(extractHostname('INF Registered tunnel connection connIndex=0'), '');
  assert.equal(extractHostname(''), '');
});

test('parseArgs defaults to port 8787 and accepts --port', () => {
  assert.equal(parseArgs([]).port, 8787);
  assert.equal(parseArgs(['--port', '9000']).port, 9000);
  assert.equal(parseArgs(['-p', '9000']).port, 9000);
  assert.equal(parseArgs(['--clear']).clear, true);
  assert.equal(parseArgs(['--local']).clear, true);
  assert.equal(parseArgs(['--help']).help, true);
});

test('parseArgs refuses an unknown option and a bad port without changing anything', () => {
  assert.throws(() => parseArgs(['--url', 'http://example.com']), /Unknown option "--url"/);
  assert.throws(() => parseArgs(['--port', 'nope']), /between 1 and 65535/);
  assert.throws(() => parseArgs(['--port', '0']), /between 1 and 65535/);
});

test('--help prints the commands and both env keys', async () => {
  const result = await run(await sandbox(), ['--help']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /npm run assistant:tunnel/);
  assert.match(result.stdout, /npm run tunnel/);
  assert.match(result.stdout, /EXPO_PUBLIC_ASSISTANT_TUNNEL_URL/);
  assert.match(result.stdout, /EXPO_PUBLIC_ASSISTANT_URL/);
});

test('--clear blanks the tunnel URL and leaves the base URL alone', async () => {
  const dir = await sandbox();
  await writeFile(
    join(dir, '.env'),
    'EXPO_PUBLIC_ASSISTANT_URL=http://127.0.0.1:8787\nEXPO_PUBLIC_ASSISTANT_TUNNEL_URL=https://old-words.trycloudflare.com\n',
    'utf8',
  );
  const result = await run(dir, ['--clear']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /EXPO_PUBLIC_ASSISTANT_TUNNEL_URL: https:\/\/old-words\.trycloudflare\.com -> \(cleared\)/);
  const text = await readFile(join(dir, '.env'), 'utf8');
  assert.match(text, /^EXPO_PUBLIC_ASSISTANT_URL=http:\/\/127\.0\.0\.1:8787$/m);
  assert.match(text, /^EXPO_PUBLIC_ASSISTANT_TUNNEL_URL=$/m);
  assert.doesNotMatch(text, /trycloudflare/);
});

test('--clear on an empty tunnel URL changes nothing', async () => {
  const dir = await sandbox();
  const before = 'EXPO_PUBLIC_ASSISTANT_URL=http://127.0.0.1:8787\nEXPO_PUBLIC_ASSISTANT_TUNNEL_URL=\n';
  await writeFile(join(dir, '.env'), before, 'utf8');
  const result = await run(dir, ['--clear']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /already empty\. Nothing changed\./);
  assert.equal(await readFile(join(dir, '.env'), 'utf8'), before);
});

test('an unknown option exits non-zero and says nothing changed', async () => {
  const result = await run(await sandbox(), ['--wat']);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Unknown option "--wat". Nothing changed\./);
});

test('a missing cloudflared exits 1 with the install hint and leaves .env alone', async () => {
  const dir = await sandbox();
  const result = await run(dir, [], { PATH: '' });
  assert.equal(result.code, 1, result.stdout);
  assert.match(result.stderr, /cloudflared was not found on PATH/);
  assert.match(result.stderr, /brew install cloudflared/);
  // No hostname was ever stored, so the exit path must not create or edit .env.
  await assert.rejects(readFile(join(dir, '.env'), 'utf8'), /ENOENT/);
});
