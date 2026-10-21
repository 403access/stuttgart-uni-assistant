/**
 * Minimal SMTP submission client for `smtp.uni-stuttgart.de:587` (STARTTLS),
 * the interface TIK publishes for mail clients. Node has no SMTP module, so the
 * few commands needed for one message live here: EHLO, STARTTLS, AUTH, MAIL,
 * RCPT, DATA. Credentials never leave this process.
 */

import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

import { dotStuff } from './mail-mime.mjs';

export const SMTP_HOST = 'smtp.uni-stuttgart.de';
export const SMTP_PORT = 587;
const TIMEOUT_MS = 45_000;

function smtpFailure(code, detail) {
  const error = new Error(code);
  if (detail) error.detail = String(detail).slice(0, 300);
  return error;
}

class SmtpSession {
  constructor() {
    this.closed = false;
    this.buffer = '';
    this.response = null;
    this.socket = netConnect({ host: SMTP_HOST, port: SMTP_PORT });
    this.bind(this.socket);
  }

  bind(socket) {
    socket.setTimeout(TIMEOUT_MS, () => this.fail(smtpFailure('mail_smtp_timeout')));
    socket.on('data', (chunk) => this.consume(chunk));
    socket.on('error', (error) => {
      if (!this.closed) this.fail(smtpFailure('mail_network', error.message));
    });
    socket.on('close', () => {
      if (!this.closed) this.fail(smtpFailure('mail_disconnected'));
    });
  }

  /** Accumulate lines; a line with `250 ` (not `250-`) closes the response. */
  consume(chunk) {
    this.buffer += chunk.toString('utf8');
    for (;;) {
      const end = this.buffer.indexOf('\r\n');
      if (end === -1) return;
      const line = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      const pending = this.response;
      if (!pending) continue;
      pending.lines.push(line);
      if (/^\d{3} /.test(line)) {
        this.response = null;
        pending.resolve({ code: Number(line.slice(0, 3)), lines: pending.lines });
      }
    }
  }

  read() {
    return new Promise((resolve, reject) => {
      this.response = { lines: [], resolve, reject };
    });
  }

  async command(text) {
    this.socket.write(`${text}\r\n`);
    return this.read();
  }

  expect(response, codes, code) {
    if (!codes.includes(response.code)) throw smtpFailure(code, response.lines.join(' '));
    return response;
  }

  /** STARTTLS: keep the TCP socket, wrap it in TLS and continue on the secure socket. */
  async startTls() {
    const plain = this.socket;
    plain.removeAllListeners('data');
    plain.removeAllListeners('error');
    plain.removeAllListeners('close');
    plain.removeAllListeners('timeout');
    plain.setTimeout(0);
    const secure = tlsConnect({ socket: plain, servername: SMTP_HOST });
    this.socket = secure;
    this.buffer = '';
    this.response = null;
    this.bind(secure);
    await new Promise((resolve, reject) => {
      const onSecure = () => {
        cleanup();
        resolve();
      };
      const onError = (error) => {
        cleanup();
        reject(smtpFailure('mail_network', error.message));
      };
      const cleanup = () => {
        secure.off('secureConnect', onSecure);
        secure.off('error', onError);
      };
      secure.on('secureConnect', onSecure);
      secure.on('error', onError);
    });
  }

  /** AUTH PLAIN with a LOGIN fallback, because Exchange deployments differ. */
  async auth(username, password) {
    const plain = Buffer.from(`\u0000${username}\u0000${password}`, 'utf8').toString('base64');
    let response = await this.command(`AUTH PLAIN ${plain}`);
    if (response.code === 334) {
      response = await this.command(plain);
    }
    if (response.code === 235) return;
    if (response.code === 504) {
      response = await this.command('AUTH LOGIN');
      if (response.code !== 334) throw smtpFailure('mail_auth_failed', response.lines.join(' '));
      response = await this.command(Buffer.from(username, 'utf8').toString('base64'));
      if (response.code !== 334) throw smtpFailure('mail_auth_failed', response.lines.join(' '));
      response = await this.command(Buffer.from(password, 'utf8').toString('base64'));
      if (response.code === 235) return;
    }
    throw smtpFailure('mail_auth_failed', response.lines.join(' '));
  }

  fail(error) {
    if (this.closed) return;
    this.closed = true;
    if (this.response) {
      this.response.reject(error);
      this.response = null;
    }
    this.socket.destroy();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket.destroy();
  }
}

/**
 * Submit one already-built message. Throws `mail_auth_failed` when the pair is
 * rejected and `mail_recipients_rejected` when no recipient survives RCPT.
 */
export async function sendSmtpMail({ username, password, from, envelope, raw }) {
  const session = new SmtpSession();
  try {
    session.expect(await session.read(), [220], 'mail_smtp_failed');
    let hello = session.expect(await session.command(`EHLO ${SMTP_HOST}`), [250], 'mail_smtp_failed');
    if (!hello.lines.some((line) => /\bSTARTTLS\b/i.test(line))) throw smtpFailure('mail_smtp_failed', 'STARTTLS fehlt');
    session.expect(await session.command('STARTTLS'), [220], 'mail_smtp_failed');
    await session.startTls();
    hello = session.expect(await session.command(`EHLO ${SMTP_HOST}`), [250], 'mail_smtp_failed');
    if (!hello.lines.some((line) => /\bAUTH\b/i.test(line))) throw smtpFailure('mail_smtp_failed', 'AUTH fehlt');
    await session.auth(username, password);
    session.expect(await session.command(`MAIL FROM:<${from}>`), [250], 'mail_smtp_failed');

    const accepted = [];
    const rejected = [];
    for (const address of envelope) {
      const response = await session.command(`RCPT TO:<${address}>`);
      if (response.code === 250 || response.code === 251) accepted.push(address);
      else rejected.push(address);
    }
    if (accepted.length === 0) throw smtpFailure('mail_recipients_rejected', rejected.join(', '));

    session.expect(await session.command('DATA'), [354], 'mail_smtp_failed');
    session.socket.write(`${dotStuff(raw).replace(/(?:\r\n)?$/, '\r\n')}.\r\n`);
    session.expect(await session.read(), [250], 'mail_smtp_failed');
    await session.command('QUIT').catch(() => undefined);
    return { accepted, rejected };
  } finally {
    session.close();
  }
}
