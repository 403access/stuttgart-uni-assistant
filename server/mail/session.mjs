/**
 * Minimal IMAP session over TLS. The reader keeps the pieces of each response
 * line apart: text chunks plus inline `{n}` literal byte blocks, so mail bytes
 * never shift the byte-accurate literal counting.
 */

import { connect as tlsConnect } from 'node:tls';

import { COMMAND_TIMEOUT_MS, IMAP_HOST, IMAP_PORT, MAX_RESPONSE_BYTES, imapQuoted, mailFailure } from './config.mjs';

class ImapSession {
  constructor() {
    this.closed = false;
    this.tagSeq = 0;
    this.buffer = Buffer.alloc(0);
    this.literalRemain = null; // bytes still expected for the inline literal
    this.pieces = []; // { kind: 'text', text } | { kind: 'bytes', bytes }
    this.pending = null; // { tag, lines, resolve, reject, timer }
    this.queue = Promise.resolve();
    this.socket = tlsConnect({ host: IMAP_HOST, port: IMAP_PORT, servername: IMAP_HOST });
    this.socket.setTimeout(COMMAND_TIMEOUT_MS, () => this.fail(mailFailure('imap_timeout')));
    this.socket.on('data', (chunk) => this.consume(chunk));
    this.socket.on('error', (error) => {
      if (this.closed) return;
      this.fail(mailFailure('mail_network', error.message));
    });
    this.socket.on('close', () => {
      if (this.closed) return;
      this.fail(mailFailure('mail_disconnected'));
    });
  }

  /** Resolves once the TLS handshake is done; the greeting itself needs no handling. */
  ready() {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState === 'open') {
        resolve();
        return;
      }
      const onSecure = () => {
        cleanup();
        resolve();
      };
      const onError = (error) => {
        cleanup();
        reject(mailFailure('mail_network', error.message));
      };
      const cleanup = () => {
        this.socket.off('secureConnect', onSecure);
        this.socket.removeListener('error', onError);
      };
      this.socket.on('secureConnect', onSecure);
      this.socket.on('error', onError);
    });
  }

  command(text) {
    return this.enqueue(text);
  }

  /** Command with a trailing `{n}` literal, e.g. `APPEND "Sent" (\\Seen)`. */
  commandWithLiteral(text, bytes) {
    return this.enqueue(text, Buffer.from(bytes));
  }

  enqueue(text, literal = null) {
    const run = () =>
      new Promise((resolve, reject) => {
        if (this.pending) {
          reject(mailFailure('imap_busy'));
          return;
        }
        if (this.closed) {
          reject(mailFailure('mail_disconnected'));
          return;
        }
        const tag = `A${++this.tagSeq}`;
        const timer = setTimeout(() => this.fail(mailFailure('imap_timeout')), COMMAND_TIMEOUT_MS);
        this.pending = { tag, lines: [], resolve, reject, timer, literal };
        this.socket.write(literal ? `${tag} ${text} {${literal.length}}\r\n` : `${tag} ${text}\r\n`);
      });
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  consume(chunk) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let guard = 0;
    while (guard++ < 100000) {
      if (this.literalRemain !== null) {
        if (this.buffer.length < this.literalRemain) return;
        const bytes = this.buffer.subarray(0, this.literalRemain);
        this.buffer = this.buffer.subarray(this.literalRemain);
        this.pieces.push({ kind: 'bytes', bytes });
        this.literalRemain = null;
        continue;
      }
      const eol = this.buffer.indexOf('\r\n');
      if (eol === -1) {
        if (this.buffer.length > MAX_RESPONSE_BYTES) this.fail(mailFailure('imap_too_large'));
        return;
      }
      const text = this.buffer.subarray(0, eol).toString('latin1');
      this.buffer = this.buffer.subarray(eol + 2);
      const literal = /\{(\d+)\}$/.exec(text);
      this.pieces.push({ kind: 'text', text });
      if (literal) {
        this.literalRemain = Number(literal[1]);
        if (this.literalRemain > MAX_RESPONSE_BYTES) {
          this.fail(mailFailure('imap_too_large'));
          return;
        }
        continue;
      }
      this.finishLine();
    }
  }

  finishLine() {
    const joined = this.pieces
      .filter((piece) => piece.kind === 'text')
      .map((piece) => piece.text)
      .join('');
    const line = this.pieces;
    this.pieces = [];
    if (!this.pending) return; // greeting or a server update without a pending command
    this.pending.lines.push(line);
    // A `+` continuation asks for the literal of an APPEND command.
    if (this.pending.literal && joined.startsWith('+')) {
      const bytes = this.pending.literal;
      this.pending.literal = null;
      this.socket.write(bytes);
      this.socket.write('\r\n');
      return;
    }
    if (joined.startsWith(`${this.pending.tag} `)) {
      const rest = joined.slice(this.pending.tag.length + 1);
      const status = rest.split(' ', 1)[0]?.toUpperCase() ?? '';
      const finished = this.pending;
      this.pending = null;
      clearTimeout(finished.timer);
      finished.resolve({ status, text: rest.slice(status.length).trim(), lines: finished.lines });
    }
  }

  fail(error) {
    if (this.closed) return;
    this.closed = true;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
    this.socket.destroy();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket.destroy();
  }
}

/** One TLS IMAP session: connect, LOGIN, run `work`, always LOGOUT. */
export async function withSession(username, password, work) {
  const session = new ImapSession();
  try {
    await session.ready();
    const login = await session.command(`LOGIN ${imapQuoted(username)} ${imapQuoted(password)}`);
    if (login.status !== 'OK') throw mailFailure('mail_auth_failed', login.text);
    return await work(session);
  } finally {
    if (!session.closed) session.command('LOGOUT').catch(() => undefined);
    session.close();
  }
}
