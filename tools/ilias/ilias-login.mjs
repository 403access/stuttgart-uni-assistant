#!/usr/bin/env node
/**
 * Terminal probe for ILIAS at Universität Stuttgart.
 *
 * It speaks the same HTTPS flow the assistant server uses: fetch the standard
 * login form, post Anmeldename and Passwort, keep `PHPSESSID`, then parse the
 * dashboard blocks. Nothing is written to disk and no credential is printed.
 *
 *   npm run ilias:login -- --user st206509 --password-stdin
 *   npm run ilias:login -- --cookie "$ILIAS_SESSION_COOKIE"
 *   npm run ilias:login -- --probe
 */
import { pathToFileURL } from 'node:url';

import { ILIAS_LOGIN_URL, fetchIliasDashboard, iliasLoginError, loginIlias, looksLikeIliasLogin, mask, normalizeIliasCookie, parseIliasLoginForm } from '../../apps/server/ilias.mjs';

export { mask } from '../../apps/server/ilias.mjs';

export function parseArgs(argv) {
  const options = { user: '', password: '', passwordStdin: false, cookie: '', probe: false, json: false, url: ILIAS_LOGIN_URL, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--user' || arg === '-u') options.user = argv[++index] ?? '';
    else if (arg.startsWith('--user=')) options.user = arg.slice('--user='.length);
    else if (arg === '--password' || arg === '-p') options.password = argv[++index] ?? '';
    else if (arg.startsWith('--password=')) options.password = arg.slice('--password='.length);
    else if (arg === '--password-stdin') options.passwordStdin = true;
    else if (arg === '--cookie') options.cookie = argv[++index] ?? '';
    else if (arg.startsWith('--cookie=')) options.cookie = arg.slice('--cookie='.length);
    else if (arg === '--probe') options.probe = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--url') options.url = argv[++index] ?? options.url;
    else if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

const HELP = `Terminal probe for ILIAS at Universität Stuttgart.

Usage:
  npm run ilias:login -- --user <id> [--password-stdin]
  npm run ilias:login -- --cookie <PHPSESSID or full cookie>
  npm run ilias:login -- --probe

Options:
  -u, --user <id>        ILIAS login name, usually the st-account (st206509).
                         A full mail address is reduced to the part before @.
  -p, --password <text>  password (lands in the shell history; prefer stdin)
      --password-stdin   read the password from stdin
      --cookie <value>   reuse an existing PHPSESSID instead of logging in
      --probe            only inspect the public login form, no credentials
      --url <url>        override the login URL
      --json             print a JSON summary
  -h, --help             this text

The password is never stored or printed. The probe prints only counts and the
form field names, so it is safe to paste the output into an issue.
`;

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(String(chunk));
  return chunks.join('').replace(/\r?\n$/, '');
}

async function promptPassword() {
  if (!process.stdin.isTTY) return readStdin();
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
    };
    const onData = (chunk) => {
      for (const char of String(chunk)) {
        if (char === '\r' || char === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new Error('cancelled'));
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        value += char;
        process.stdout.write('*');
      }
    };
    process.stdout.write('Password: ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

function summary(dashboard) {
  return {
    account: dashboard.account,
    name: dashboard.name,
    counts: dashboard.counts,
    memberships: dashboard.memberships.slice(0, 12).map((item) => ({ group: item.group, type: item.type, title: item.title, refId: item.refId })),
    news: dashboard.news.slice(0, 5).map((item) => ({ title: item.title, date: item.date })),
    mails: dashboard.mails.slice(0, 5).map((item) => ({ title: item.title, date: item.date })),
    tasks: dashboard.tasks.map((item) => item.title),
    fetchedAt: dashboard.fetchedAt,
  };
}

export async function probe(url) {
  const response = await fetch(url, { redirect: 'manual', headers: { Accept: 'text/html' } });
  const html = await response.text();
  const form = parseIliasLoginForm(html);
  return {
    ok: Boolean(form) || looksLikeIliasLogin(html),
    status: response.status,
    loginPage: looksLikeIliasLogin(html),
    action: form?.action ?? null,
    method: form?.method ?? null,
    enctype: form?.enctype ?? null,
    usernameField: form?.usernameField ?? null,
    passwordField: form?.passwordField ?? null,
    rejection: form ? '' : iliasLoginError(html),
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(String(error.message));
    console.error('\nRun with --help for usage.');
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (options.probe) {
    const result = await probe(options.url);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`probe: ${result.ok ? 'login page reachable' : 'no login form'} (HTTP ${result.status})`);
      if (result.action) console.log(`form: ${result.method} ${result.action} (${result.enctype || 'no enctype'})`);
      if (result.usernameField) console.log(`fields: user=${result.usernameField} password=${result.passwordField}`);
      if (result.rejection) console.log(`notice: ${result.rejection}`);
    }
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (options.passwordStdin) options.password = await promptPassword();
  if (!options.cookie && (!options.user || !options.password)) {
    console.error('Provide --user and a password, or --cookie. Run with --help for usage.');
    process.exitCode = 2;
    return;
  }

  const log = (line) => {
    if (!options.json) console.log(line);
  };

  let result;
  if (options.cookie) {
    log(`probe dashboard cookie=${mask(options.cookie)}`);
    try {
      const dashboard = await fetchIliasDashboard({ cookie: options.cookie });
      result = { ok: true, reason: 'signed-in', cookie: normalizeIliasCookie(options.cookie), account: dashboard.account, dashboard };
    } catch (error) {
      result = { ok: false, reason: error.message || 'ilias_failed', detail: error.detail };
    }
  } else {
    log(`probe login url=${options.url} user=${mask(options.user)} password=${mask(options.password)}`);
    result = await loginIlias({ account: options.user, password: options.password, loginUrl: options.url, log });
  }

  const payload = {
    ok: result.ok,
    reason: result.reason,
    rejection: result.rejection ?? null,
    sessionCookie: result.cookie ? `present(${result.cookie.length})` : 'missing',
    steps: result.steps ?? [],
    dashboard: result.dashboard ? summary(result.dashboard) : null,
    detail: result.detail ?? null,
  };
  if (options.json) console.log(JSON.stringify(payload, null, 2));
  else {
    if (result.steps?.length) log(`steps: ${result.steps.join(' → ')}`);
    if (result.dashboard) {
      const counts = result.dashboard.counts;
      log(`account: ${result.dashboard.account ?? '(unknown)'}${result.dashboard.name ? ` · ${result.dashboard.name}` : ''}`);
      log(`courses=${counts.courses} groups=${counts.groups} news=${counts.news} mails=${counts.mails} unread=${counts.unreadMails} tasks=${counts.tasks}`);
      for (const item of result.dashboard.memberships.slice(0, 10)) log(`  [${item.type || item.kind}] ${item.title}${item.group ? ` · ${item.group}` : ''}`);
      if (result.dashboard.news.length) log(`  news: ${result.dashboard.news[0].title}`);
    }
    if (result.rejection) log(`rejected: ${result.rejection}`);
    log(`result: ${result.ok ? 'OK' : `FAILED (${payload.reason})`}`);
  }
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`probe failed: ${error?.message ?? error}`);
    process.exitCode = 1;
  });
}
