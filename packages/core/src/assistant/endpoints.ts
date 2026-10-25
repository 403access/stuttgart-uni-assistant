/**
 * Where the assistant server is reached from. Pure: no React Native or Expo
 * import, so the resolution rules are unit-testable
 * (`scripts/assistant-endpoints.test.mjs`).
 *
 * Order, highest first:
 *
 * 1. `off` in `EXPO_PUBLIC_ASSISTANT_URL` disables the remote engine.
 * 2. `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL` (written by `npm run assistant:tunnel`)
 *    while a public route is up — the phone may be off the LAN.
 * 3. an explicit `EXPO_PUBLIC_ASSISTANT_URL` that is not loopback.
 * 4. the host of the Metro dev server (`hostUri`) on the assistant port. This is
 *    the machine the app just loaded its bundle from, so the simulator and a
 *    phone on the same Wi-Fi both reach the server without editing `.env`.
 * 5. loopback on this machine.
 */

/** `server/index.mjs` listens here unless `PORT` changes it. */
export const ASSISTANT_PORT = 8787;

/** Host part of a `host:port` value or a full URL: no scheme, path, or port. */
export function hostFromUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const withoutScheme = uri.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const host = withoutScheme.split(/[/?#]/)[0].split(':')[0].trim();
  return host || null;
}

/** A host that only resolves to the machine running the app itself. */
export function isLoopbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const value = host.toLowerCase().replace(/^\[|\]$/g, '');
  return value === 'localhost' || value === '127.0.0.1' || value === '::1';
}

export interface AssistantUrlInput {
  /** Raw `EXPO_PUBLIC_ASSISTANT_URL`; `off` disables the remote engine. */
  envUrl?: string | null;
  /** Raw `EXPO_PUBLIC_ASSISTANT_TUNNEL_URL`, set by the tunnel script. */
  tunnelUrl?: string | null;
  /** `Constants.expoConfig.hostUri`, for example `192.168.1.23:8081`. */
  hostUri?: string | null;
}

export function resolveAssistantBaseUrl({ envUrl, tunnelUrl, hostUri }: AssistantUrlInput): string {
  const base = (envUrl ?? '').trim();
  if (base.toLowerCase() === 'off') return 'off';

  const tunnel = (tunnelUrl ?? '').trim();
  if (tunnel) return tunnel;

  if (base && !isLoopbackHost(hostFromUri(base))) return base;

  const host = hostFromUri(hostUri);
  if (host && !isLoopbackHost(host)) return `http://${host}:${ASSISTANT_PORT}`;

  return base || `http://127.0.0.1:${ASSISTANT_PORT}`;
}
