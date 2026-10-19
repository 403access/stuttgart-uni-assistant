/**
 * Reading a `.ovpn` file: pure string handling, so it is testable without a
 * device and the picker stays a separate concern from the parser.
 */

/** Directives that mark a file as a client configuration rather than a server one. */
const CLIENT_DIRECTIVE = /^\s*(client|dev\s+(tun|tap)|pull)\b/m;
const REMOTE_DIRECTIVE = /^\s*remote\s+(\S+)(?:\s+(\d+))?/m;

/**
 * True when the text names a `remote` and at least one client directive.
 * `.ovpn` and `.conf` files carry no reliable MIME type, so the content is the
 * only honest check.
 */
export function looksLikeOpenVpn(config: string): boolean {
  return REMOTE_DIRECTIVE.test(config) && CLIENT_DIRECTIVE.test(config);
}

/** The `host` or `host:port` the configuration points at, `null` when there is no `remote`. */
export function openVpnRemote(config: string): string | null {
  const match = config.match(REMOTE_DIRECTIVE);
  if (!match) return null;
  return match[2] ? `${match[1]}:${match[2]}` : match[1];
}

/** Just the host, without the port, for APIs that take an address and a port separately. */
export function openVpnHost(config: string): string | null {
  const match = config.match(REMOTE_DIRECTIVE);
  return match ? match[1] : null;
}
