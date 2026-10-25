import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASSISTANT_PORT,
  hostFromUri,
  isLoopbackHost,
  resolveAssistantBaseUrl,
} from '../apps/mobile/src/assistant/endpoints.ts';

/**
 * The assistant base URL decides whether the simulator and a phone on the same
 * Wi-Fi reach the local server. The rules are pure so they are testable here,
 * away from Expo.
 */

test('hostFromUri strips scheme, path, and port', () => {
  assert.equal(hostFromUri('192.168.1.23:8081'), '192.168.1.23');
  assert.equal(hostFromUri('http://192.168.1.23:8081/index.bundle?platform=ios'), '192.168.1.23');
  assert.equal(hostFromUri('https://words.trycloudflare.com/health'), 'words.trycloudflare.com');
  assert.equal(hostFromUri('exp.direct'), 'exp.direct');
  assert.equal(hostFromUri(''), null);
  assert.equal(hostFromUri(null), null);
  assert.equal(hostFromUri(undefined), null);
});

test('isLoopbackHost recognises the local names only', () => {
  for (const host of ['localhost', '127.0.0.1', 'LOCALHOST', '[::1]']) {
    assert.equal(isLoopbackHost(host), true, host);
  }
  for (const host of ['192.168.1.23', 'exp.direct', '10.0.0.5', '', null]) {
    assert.equal(isLoopbackHost(host), false, String(host));
  }
});

test('the tunnel URL wins, and off disables the engine before it', () => {
  assert.equal(
    resolveAssistantBaseUrl({
      envUrl: 'http://192.168.1.23:8787',
      tunnelUrl: 'https://words.trycloudflare.com',
      hostUri: '10.0.0.5:8081',
    }),
    'https://words.trycloudflare.com',
  );
  assert.equal(resolveAssistantBaseUrl({ envUrl: 'off', tunnelUrl: 'https://words.trycloudflare.com' }), 'off');
});

test('a phone reuses the dev-server host instead of the loopback URL', () => {
  assert.equal(
    resolveAssistantBaseUrl({ envUrl: 'http://127.0.0.1:8787', tunnelUrl: '', hostUri: '192.168.1.23:8081' }),
    `http://192.168.1.23:${ASSISTANT_PORT}`,
  );
  assert.equal(
    resolveAssistantBaseUrl({ envUrl: 'http://localhost:8787', hostUri: '192.168.1.23:8081' }),
    `http://192.168.1.23:${ASSISTANT_PORT}`,
  );
});

test('the simulator keeps loopback when the dev server is loopback too', () => {
  assert.equal(
    resolveAssistantBaseUrl({ envUrl: 'http://127.0.0.1:8787', hostUri: '127.0.0.1:8081' }),
    'http://127.0.0.1:8787',
  );
  assert.equal(resolveAssistantBaseUrl({ hostUri: undefined }), `http://127.0.0.1:${ASSISTANT_PORT}`);
});

test('an explicit non-loopback URL is not overridden by the dev host', () => {
  assert.equal(
    resolveAssistantBaseUrl({ envUrl: 'http://192.168.1.50:9000', hostUri: '192.168.1.23:8081' }),
    'http://192.168.1.50:9000',
  );
});
