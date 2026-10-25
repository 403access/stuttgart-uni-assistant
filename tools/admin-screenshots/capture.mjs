#!/usr/bin/env node
/**
 * Capture the same admin screens from the pre-migration dashboard and the
 * current React admin, then compose side-by-side comparisons.
 *
 * Usage:
 *   node tools/admin-screenshots/capture.mjs
 *
 * The script boots its own assistant server with a temporary database, seeds a
 * deterministic fixture set, serves the old dashboard from `cae1bcb` through a
 * small same-origin proxy, and writes PNGs below
 * `docs/engineering/admin-parity/`.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { chromium } from 'playwright';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const OUT = join(REPO, 'docs/engineering/admin-parity');
const PREVIOUS = join(OUT, 'previous');
const CURRENT = join(OUT, 'current');
const PREVIOUS_COMMIT = 'cae1bcb';
const TOKEN = 'test-token';
const API_PORT = 19210;
const PROXY_PORT = 19211;
const BASE = `http://127.0.0.1:${API_PORT}`;
const OLD_BASE = `http://127.0.0.1:${PROXY_PORT}`;
const VIEWPORT = { width: 1440, height: 1000 };

const now = Date.now();
const iso = (daysAgo = 0, hoursAgo = 0) => new Date(now - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();
const day = (daysAgo = 0) => iso(daysAgo).slice(0, 10);

const USERS = [
  {
    id: 'usr_erika',
    account: 'st123456',
    name: 'Erika Mustermann',
    email: 'erika.mustermann@uni-stuttgart.de',
    matriculation: '1234567',
    subject: 'Informatik B.Sc.',
    mode: 'campus',
    created: iso(64),
    login: iso(0, 2),
  },
  {
    id: 'usr_max',
    account: 'st234567',
    name: 'Max Schneider',
    email: 'max.schneider@uni-stuttgart.de',
    matriculation: '2345678',
    subject: 'Maschinenbau B.Sc.',
    mode: 'oidc',
    created: iso(31),
    login: iso(1, 3),
  },
  {
    id: 'usr_lena',
    account: 'st345678',
    name: 'Lena Weber',
    email: 'lena.weber@uni-stuttgart.de',
    matriculation: '3456789',
    subject: 'Lehramt Englisch',
    mode: 'local',
    created: iso(12),
    login: null,
  },
  {
    id: 'usr_tom',
    account: 'st456789',
    name: 'Tom Becker',
    email: 'tom.becker@uni-stuttgart.de',
    matriculation: '4567890',
    subject: 'Philosophie B.A.',
    mode: 'demo',
    created: iso(4),
    login: iso(0, 5),
  },
  {
    id: 'usr_aylin',
    account: 'st567890',
    name: 'Aylin Kaya',
    email: 'aylin.kaya@uni-stuttgart.de',
    matriculation: '5678901',
    subject: 'Elektrotechnik B.Sc.',
    mode: 'local',
    created: iso(2),
    login: null,
  },
];

async function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Server did not become ready: ${url}`);
}

function extractPreviousDashboard(target) {
  const archive = spawnSync('git', ['archive', PREVIOUS_COMMIT, 'server/dashboard'], { cwd: REPO, maxBuffer: 50 * 1024 * 1024 });
  if (archive.status !== 0) throw new Error(archive.stderr.toString());
  const tar = spawnSync('tar', ['-x', '-C', target], { input: archive.stdout });
  if (tar.status !== 0) throw new Error(tar.stderr.toString());
  return join(target, 'server/dashboard');
}

function contentType(file) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
  }[extname(file)] ?? 'application/octet-stream';
}

function startOldProxy(root) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname.startsWith('/v1/')) {
      const proxy = httpRequest(
        { host: '127.0.0.1', port: API_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${API_PORT}` } },
        (upstream) => {
          res.writeHead(upstream.statusCode ?? 502, upstream.headers);
          upstream.pipe(res);
        },
      );
      proxy.on('error', (error) => {
        res.writeHead(502);
        res.end(String(error));
      });
      req.pipe(proxy);
      return;
    }
    const relativePath = url.pathname === '/admin' ? 'index.html' : url.pathname.replace(/^\/admin\/?/, '');
    const file = normalize(join(root, relativePath));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    try {
      const info = await stat(file);
      const target = info.isDirectory() ? join(file, 'index.html') : file;
      const body = await readFile(target);
      res.writeHead(200, { 'Content-Type': contentType(target), 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolveListen) => server.listen(PROXY_PORT, '127.0.0.1', () => resolveListen(server)));
}

function insertFixtures(db) {
  db.exec('PRAGMA busy_timeout = 8000');

  for (const user of USERS) {
    db.prepare(
      `INSERT OR REPLACE INTO users (id, account, account_key, name, email, matriculation, subject, primary_mode, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(user.id, user.account, user.account.toLowerCase(), user.name, user.email, user.matriculation, user.subject, user.mode, user.created, user.login ?? user.created, user.login);
    db.prepare(
      `INSERT OR REPLACE INTO admin_audit (action, user_id, account, detail, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run('user.create', user.id, user.account, JSON.stringify({ mode: user.mode }), user.created);
  }

  const platforms = [
    ['usr_erika', 'campus', 'st123456', 'connected', 'cookie', iso(3)],
    ['usr_erika', 'ilias', 'st123456', 'connected', 'browser', iso(2)],
    ['usr_erika', 'mail', 'erika.mustermann@uni-stuttgart.de', 'connected', 'imap', iso(1)],
    ['usr_erika', 'sdg', 'st123456', 'linked', 'sso', iso(20)],
    ['usr_max', 'campus', 'st234567', 'linked', 'sso', iso(9)],
    ['usr_max', 'siam', 'max.schneider', 'connected', 'oidc', iso(1)],
    ['usr_max', 'ilias', 'st234567', 'linked', 'env', iso(8)],
    ['usr_lena', 'mail', 'lena.weber@uni-stuttgart.de', 'connected', 'imap', iso(4)],
    ['usr_tom', 'campus', 'st456789', 'connected', 'cookie', iso(0, 5)],
  ];
  for (const [userId, platform, account, status, source, linkedAt] of platforms) {
    db.prepare(
      `INSERT OR REPLACE INTO user_platforms (user_id, platform, account, status, source, linked_at, last_sync_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, platform, account, status, source, linkedAt, linkedAt);
  }

  const sessions = [
    ['ses_parity_erika_pc', 'usr_erika', iso(0, 2), iso(0, -10), iso(0, 0.4), null],
    ['ses_parity_erika_old', 'usr_erika', iso(12), iso(-12), iso(10), iso(9)],
    ['ses_parity_max_pc', 'usr_max', iso(1, 3), iso(1, -11), iso(0, 8), null],
    ['ses_parity_tom_pc', 'usr_tom', iso(0, 5), iso(0, -9), iso(0, 1), null],
  ];
  for (const [id, userId, created, expires, seen, revoked] of sessions) {
    db.prepare(
      `INSERT OR REPLACE INTO user_sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, `hash_${id}`, created, expires, seen, revoked);
  }

  const ua = {
    macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    android: 'Mozilla/5.0 (Linux; Android 15; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  };
  const devices = [
    ['dev_parity_mac', 'usr_erika', 'ses_parity_erika_pc', 'MacBook Pro · Erika', ua.macChrome, '192.168.1.42', iso(0, 2), iso(0, -10), iso(0, 1), iso(0, 0.4), null, iso(0, 0.2)],
    ['dev_parity_iphone', 'usr_max', 'ses_parity_max_pc', 'iPhone 15 · Max', ua.iphone, '10.0.0.17', iso(1, 3), iso(1, -9), iso(1, -2), iso(0, 8), null, iso(0, 7)],
    ['dev_parity_windows', null, null, 'Windows-PC · Bibliothek', ua.winFirefox, '192.168.7.11', iso(0, 1), iso(0, -0.7), null, null, null, null],
    ['dev_parity_lena', 'usr_lena', null, 'Surface · Lena', ua.winEdge, '172.16.0.5', iso(4), iso(4, -9), iso(3, 20), iso(3), null, iso(2)],
    ['dev_parity_tom', 'usr_tom', 'ses_parity_tom_pc', 'Linux-Notebook · Tom', ua.linux, '192.168.3.9', iso(5), iso(4), iso(5, -1), iso(4, 22), iso(10), iso(2)],
    ['dev_parity_expired', null, null, 'Android · Praktikum', ua.android, '203.0.113.9', iso(9), iso(8), null, null, null, null],
  ];
  for (const [id, userId, sessionId, name, userAgent, ip, created, expires, approved, consumed, revoked, seen] of devices) {
    db.prepare(
      `INSERT OR REPLACE INTO device_links (id, user_id, token_hash, name, user_agent, ip_address, last_ip_address, kind, created_at, expires_at, approved_at, consumed_at, revoked_at, last_seen_at, session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'web', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, `hash_${id}`, name, userAgent, ip, ip, created, expires, approved, consumed, revoked, seen, sessionId);
  }

  db.prepare(`INSERT OR REPLACE INTO user_campus (user_id, source, account, updated_at) VALUES (?, ?, ?, ?)`).run('usr_erika', 'env', 'st123456', iso(0, 2));
  db.prepare(`INSERT OR REPLACE INTO user_campus (user_id, source, account, updated_at) VALUES (?, ?, ?, ?)`).run('usr_tom', 'browser', 'st456789', iso(0, 5));
  db.prepare(`INSERT OR REPLACE INTO user_ilias (user_id, source, account, updated_at) VALUES (?, ?, ?, ?)`).run('usr_erika', 'browser', 'st123456', iso(2));
  db.prepare(`INSERT OR REPLACE INTO user_ilias (user_id, source, account, updated_at) VALUES (?, ?, ?, ?)`).run('usr_max', 'env', 'st234567', iso(8));

  const iliasDashboard = {
    name: 'Erika Mustermann',
    account: 'st123456',
    counts: { memberships: 8, courses: 5, groups: 3, news: 4, mails: 12, unreadMails: 3, tasks: 2 },
    memberships: [
      { kind: 'crs', refId: 145201, title: 'Programmierung I', type: 'Kurs', semester: 'WS 2026/27', url: 'https://ilias.uni-stuttgart.de/ilias.php?ref_id=145201' },
      { kind: 'crs', refId: 145202, title: 'Algorithmen und Datenstrukturen', type: 'Kurs', semester: 'WS 2026/27' },
      { kind: 'crs', refId: 145203, title: 'Datenbanksysteme', type: 'Kurs', semester: 'WS 2026/27' },
      { kind: 'crs', refId: 145204, title: 'Softwaretechnik', type: 'Kurs', semester: 'WS 2026/27' },
      { kind: 'crs', refId: 145205, title: 'Rechnernetze', type: 'Kurs', semester: 'WS 2026/27' },
      { kind: 'grp', refId: 145301, title: 'Übungsgruppe G3 – Programmierung I', type: 'Gruppe' },
      { kind: 'grp', refId: 145302, title: 'Praktikum Datenbanken', type: 'Gruppe' },
      { kind: 'grp', refId: 145303, title: 'Projektteam Softwaretechnik', type: 'Gruppe' },
    ],
    news: [],
    mails: [],
    tasks: [],
  };
  db.prepare(`INSERT OR REPLACE INTO user_ilias_snapshot (user_id, payload, fetched_at) VALUES (?, ?, ?)`).run('usr_erika', JSON.stringify(iliasDashboard), iso(2));
  db.prepare(`INSERT OR REPLACE INTO user_ilias_snapshot (user_id, payload, fetched_at) VALUES (?, ?, ?)`).run(
    'usr_max',
    JSON.stringify({
      name: 'Max Schneider',
      account: 'st234567',
      counts: { memberships: 4, courses: 3, groups: 1, news: 2, mails: 5, unreadMails: 1, tasks: 1 },
      memberships: [
        { kind: 'crs', refId: 146101, title: 'Technische Mechanik I', type: 'Kurs', semester: 'WS 2026/27' },
        { kind: 'crs', refId: 146102, title: 'Werkstoffkunde', type: 'Kurs', semester: 'WS 2026/27' },
        { kind: 'crs', refId: 146103, title: 'Maschinenkonstruktion', type: 'Kurs', semester: 'WS 2026/27' },
        { kind: 'grp', refId: 146201, title: 'Übungsgruppe Mechanik', type: 'Gruppe' },
      ],
      news: [],
      mails: [],
      tasks: [],
    }),
    iso(8),
  );

  const studies = [
    { studyId: 339485, name: 'Informatik B.Sc.', intendedDegree: 'Bachelor', versionIdentifier: '2023', identifier: 'INF-B-2023', studyStatus: 'aktiv', lastAccessed: true },
    { studyId: 278343, name: 'Mathematik B.Sc.', intendedDegree: 'Bachelor', versionIdentifier: '2021', identifier: 'MAT-B-2021', studyStatus: 'aktiv', lastAccessed: false },
  ];
  db.prepare(`INSERT OR REPLACE INTO user_studies_snapshot (user_id, payload, fetched_at) VALUES (?, ?, ?)`).run('usr_erika', JSON.stringify(studies), iso(0, 2));

  const nodeNames = [
    ['Pflichtmodule', 'Knoten'],
    ['Programmierung I', 'Modul'],
    ['Algorithmen und Datenstrukturen', 'Modul'],
    ['Datenbanksysteme', 'Modul'],
    ['Softwaretechnik', 'Modul'],
    ['Rechnernetze', 'Modul'],
    ['Theoretische Informatik', 'Modul'],
    ['Mathematik für Informatiker I', 'Modul'],
    ['Mathematik für Informatiker II', 'Modul'],
    ['Wahlpflichtbereich', 'Knoten'],
    ['Web Engineering', 'Modul'],
    ['Maschinelles Lernen', 'Modul'],
    ['Bachelorarbeit', 'Modul'],
    ['Studienprojekt', 'Modul'],
    ['Schlüsselqualifikationen', 'Knoten'],
    ['Präsentationstechnik', 'Modul'],
    ['Wissenschaftliches Schreiben', 'Modul'],
  ];
  let nodeId = 1000;
  for (const [studyId, count] of [[339485, nodeNames.length], [278343, 9]]) {
    for (let index = 0; index < count; index += 1) {
      const [name, type] = nodeNames[index] ?? [`Wahlmodul ${index}`, 'Modul'];
      const completed = index < Math.round(count * 0.55) ? 1 : 0;
      const inProgress = !completed && index < Math.round(count * 0.75) ? 1 : 0;
      db.prepare(
        `INSERT OR REPLACE INTO user_curriculum_nodes (user_id, study_id, id, designation, element_type, name, parent_id, completed, in_progress, fetched_at, expanded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      ).run('usr_erika', studyId, nodeId, `${studyId}-${nodeId}`, type, name, null, completed, inProgress, iso(0, 3));
      nodeId += 1;
    }
    db.prepare(
      `INSERT OR REPLACE INTO user_curriculum_sync (user_id, study_id, root_element_id, node_count, finished_at, complete) VALUES (?, ?, ?, ?, ?, 1)`,
    ).run('usr_erika', studyId, nodeId, count, iso(0, 3));
  }

  const courses = [
    [145201, 'Programmierung I', 'Vorlesung', 'V', 'WS 2026/27', 'Prof. Dr. Martin', 'V38.01'],
    [145202, 'Algorithmen und Datenstrukturen', 'Vorlesung', 'V', 'WS 2026/27', 'Prof. Dr. Schmidt', 'V47.03'],
    [145203, 'Datenbanksysteme', 'Vorlesung', 'V', 'WS 2026/27', 'Prof. Dr. Wagner', 'V38.02'],
    [145204, 'Softwaretechnik', 'Vorlesung', 'V', 'WS 2026/27', 'Prof. Dr. Becker', 'V47.01'],
    [145205, 'Rechnernetze', 'Vorlesung', 'V', 'WS 2026/27', 'Prof. Dr. Hoffmann', 'V38.04'],
    [145301, 'Übungsgruppe Programmierung I', 'Übung', 'Ü', 'WS 2026/27', 'M.Sc. Fischer', 'V38.11'],
  ];
  for (const [id, title, type, short, semester, lecturers, room] of courses) {
    db.prepare(
      `INSERT OR REPLACE INTO user_courses (user_id, study_id, id, course_number, title, course_type, course_type_short, semester, lecturers, room_name, fetched_at)
       VALUES ('usr_erika', 339485, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, String(id), title, type, short, semester, JSON.stringify([lecturers]), room, iso(1));
  }
  db.prepare(
    `INSERT OR REPLACE INTO user_courses_sync (user_id, study_id, fetched_elements, course_count, finished_at, complete) VALUES ('usr_erika', 339485, '[]', ?, ?, 1)`,
  ).run(courses.length, iso(1));

  const events = [
    ['evt_1', 'Programmierung I – Vorlesung', 'V38.01', iso(0, -2), iso(0, -4)],
    ['evt_2', 'Übung Datenbanksysteme', 'V38.11', iso(1, -3), iso(1, -5)],
    ['evt_3', 'Projektmeeting Softwaretechnik', 'V47.01', iso(3, -6), iso(3, -8)],
    ['evt_4', 'Klausur Algorithmen', 'Hörsaal 17.01', iso(9, -9), iso(9, -11)],
  ];
  for (const [uid, summary, location, start, end] of events) {
    db.prepare(
      `INSERT OR REPLACE INTO user_exported_events (user_id, uid, summary, location, description, dtstart, dtend, fetched_at) VALUES ('usr_erika', ?, ?, ?, '', ?, ?, ?)`,
    ).run(uid, summary, location, start, end, iso(1));
  }

  const callOps = ['campus.studies', 'campus.curriculum', 'campus.courses', 'campus.events', 'campus.element', 'campus.registration'];
  for (let index = 0; index < 16; index += 1) {
    db.prepare(
      `INSERT INTO user_portal_calls (user_id, time, op, study_id, element_id, ok, http_status, message, elapsed_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'usr_erika',
      iso(0, index / 3),
      callOps[index % callOps.length],
      339485,
      index % 4 === 0 ? 145201 : null,
      index % 7 === 0 ? 0 : 1,
      index % 7 === 0 ? 504 : 200,
      index % 7 === 0 ? 'upstream timeout' : null,
      80 + index * 13,
      iso(0, index / 3),
    );
  }

  const news = [
    ['news_parity_1', 'university', 'Semesterstart am 14. Oktober', 'Semester start on 14 October', 'Die Universität Stuttgart begrüßt alle Studienanfängerinnen und Studienanfänger.', 'The University of Stuttgart welcomes all new students.', 'Der Vorlesungsbetrieb beginnt am 14. Oktober. Die Erstitage finden in der ersten Woche statt.', 'Lectures start on 14 October.', day(2), 1],
    ['news_parity_2', 'faculty', 'Neue Öffnungszeiten der Bibliothek', 'New library opening hours', 'Die Universitätsbibliothek öffnet werktags ab 8 Uhr.', 'The library opens at 8 a.m. on weekdays.', 'Ab November gelten erweiterte Öffnungszeiten bis 22 Uhr. Am Wochenende ist von 10 bis 18 Uhr geöffnet.', 'From November the library is open until 10 p.m.', day(5), 1],
    ['news_parity_3', 'institute', 'ILIAS-Wartung am Sonntag', 'ILIAS maintenance on Sunday', 'Das ILIAS-System ist am Sonntag von 8 bis 12 Uhr nicht erreichbar.', 'ILIAS will be unavailable on Sunday from 8 a.m. to noon.', 'Die Wartung betrifft alle Kurse und Lernmodule. Bitte planen Sie Ihre Abgaben entsprechend.', 'The maintenance affects all courses and learning modules.', day(8), 1],
    ['news_parity_4', 'stuvus', 'Erstsemesterwoche – Programm online', 'First-semester week – programme online', 'Das Programm der Erstsemesterwoche ist veröffentlicht.', 'The first-semester week programme is online.', 'Alle Veranstaltungen und Anmeldungen finden Sie auf der stuvus-Seite.', 'All events and registrations are listed on the stuvus site.', day(1), 0],
  ];
  for (const [id, source, titleDe, titleEn, summaryDe, summaryEn, bodyDe, bodyEn, date, published] of news) {
    db.prepare(
      `INSERT OR REPLACE INTO news_items (id, source, title_de, title_en, summary_de, summary_en, body_de, body_en, date, published, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, source, titleDe, titleEn, summaryDe, summaryEn, bodyDe, bodyEn, date, published, published ? iso(2) : null, iso(3), iso(1));
  }

  const topics = db.prepare('SELECT id, title_de, title_en FROM quiz_topics ORDER BY sort_order, id LIMIT 6').all();
  const usersForQuiz = USERS.map((user) => user.id);
  let attemptIndex = 0;
  for (const topic of topics) {
    const questions = db.prepare('SELECT id, kind, prompt_de, prompt_en FROM quiz_questions WHERE topic_id = ? ORDER BY sort_order, id LIMIT 6').all(topic.id);
    for (const question of questions) {
      for (const userId of usersForQuiz.slice(0, 3)) {
        const correct = attemptIndex % 4 !== 0 ? 1 : 0;
        const answeredAt = iso(attemptIndex % 9, attemptIndex % 11);
        db.prepare(
          `INSERT OR REPLACE INTO quiz_attempts (client_id, user_id, topic_id, topic_title_de, topic_title_en, question_id, kind, prompt_de, prompt_en, answer_json, answer_text, correct, answered_at, round_id, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          `parity_attempt_${attemptIndex}`,
          userId,
          topic.id,
          topic.title_de,
          topic.title_en,
          question.id,
          question.kind,
          question.prompt_de,
          question.prompt_en,
          JSON.stringify('Nürnberg'),
          'Nürnberg',
          correct,
          answeredAt,
          `parity_round_${attemptIndex % 4}`,
          answeredAt,
        );
        attemptIndex += 1;
      }
    }
  }

  for (let index = 0; index < 6; index += 1) {
    const topic = topics[index % topics.length];
    db.prepare(
      `INSERT OR REPLACE INTO quiz_sessions (client_id, user_id, topic_id, topic_title_de, topic_title_en, mode, correct, total, duration_seconds, started_at, finished_at, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `parity_session_${index}`,
      usersForQuiz[index % 3],
      topic.id,
      topic.title_de,
      topic.title_en,
      index % 2 === 0 ? 'learn' : 'exam',
      7 + (index % 3),
      10,
      320 + index * 47,
      iso(index + 1, 1),
      iso(index, index),
      iso(index, index),
    );
  }

  for (const [action, userId, account, detail, days] of [
    ['user.update', 'usr_erika', 'st123456', { fields: ['email'] }, 0],
    ['platform.link', 'usr_erika', 'st123456', { platform: 'ilias' }, 1],
    ['session.revoke', 'usr_erika', 'st123456', { label: 'Alte Sitzung' }, 3],
    ['news.create', null, null, { title: 'Semesterstart am 14. Oktober' }, 2],
    ['user.create', 'usr_aylin', 'st567890', { mode: 'local' }, 2],
    ['device.revoke', 'usr_tom', 'st456789', { label: 'Linux-Notebook · Tom' }, 4],
    ['quiz.catalog.seed', null, null, { topics: 15, questions: 347 }, 6],
  ]) {
    db.prepare(
      `INSERT INTO admin_audit (action, user_id, account, detail, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(action, userId, account, JSON.stringify(detail), iso(days, 1));
  }

  const logRows = [
    ['server', 'info', 'assistant server on http://127.0.0.1:8787', null, iso(0, 20)],
    ['admin', 'info', 'operator signed in', null, iso(0, 18)],
    ['campus', 'warn', 'proactive token refresh failed refresh_failed', null, iso(0, 16)],
    ['quiz', 'info', 'catalog seeded topics=15 questions=347', null, iso(0, 14)],
    ['ilias', 'info', 'dashboard snapshot stored', 'usr_erika', iso(0, 12)],
    ['mail', 'info', 'imap session established', 'usr_erika', iso(0, 10)],
    ['campus', 'info', 'curriculum sync finished study=339485 nodes=17', 'usr_erika', iso(0, 8)],
    ['campus', 'error', 'registration request returned 503 upstream_unavailable', 'usr_erika', iso(0, 6)],
    ['server', 'warn', 'slow request GET /v1/admin/users took 1840ms', null, iso(0, 4)],
    ['audit', 'info', 'user.update fields=email', 'usr_erika', iso(0, 2)],
    ['quiz', 'info', 'answer batch received attempts=10', 'usr_erika', iso(0, 1)],
  ];
  for (const [service, level, message, userId, createdAt] of logRows) {
    db.prepare(
      `INSERT INTO service_logs (service, level, message, user_id, detail, created_at) VALUES (?, ?, ?, ?, '', ?)`,
    ).run(service, level, message, userId, createdAt);
  }
}

async function capture(page, directory, name, fullPage = true) {
  const target = join(directory, name);
  await mkdir(dirname(target), { recursive: true });
  await page.waitForTimeout(350);
  await page.screenshot({ path: target, fullPage });
  return target;
}

async function loginOld(page) {
  await page.getByLabel('Dashboard-Token').fill(TOKEN);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForSelector('.kpi-grid', { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function goOld(page, hash, selector = '#view .view-stack, #view .kpi-grid') {
  await page.goto(`${OLD_BASE}/admin/${hash}`, { waitUntil: 'domcontentloaded' });
  if (selector) await page.waitForSelector(selector, { timeout: 15000 });
  await page.waitForTimeout(450);
}

async function loginCurrent(page) {
  await page.getByLabel('Dashboard-Token').fill(TOKEN);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.getByText('Konten').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
}

async function goCurrent(page, path, selector = '.main') {
  await page.goto(`${BASE}/admin${path}`, { waitUntil: 'networkidle' });
  if (selector) await page.waitForSelector(selector, { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  await rm(PREVIOUS, { recursive: true, force: true });
  await rm(CURRENT, { recursive: true, force: true });
  await rm(join(OUT, 'side-by-side'), { recursive: true, force: true });

  const work = await mkdtemp(join(tmpdir(), 'ua-admin-parity-'));
  const dbPath = join(work, 'admin-parity.db');
  const oldRoot = extractPreviousDashboard(work);

  const serverLog = await import('node:fs').then(({ openSync }) => openSync(join(work, 'server.log'), 'w'));
  const server = spawn(process.execPath, ['apps/server/index.mjs'], {
    cwd: REPO,
    env: { ...process.env, DASHBOARD_TOKEN: TOKEN, PORT: String(API_PORT), CAMPUS_DB_PATH: dbPath },
    stdio: ['ignore', serverLog, serverLog],
  });
  let proxy;
  let browser;
  try {
    await waitForServer(`${BASE}/v1/admin/overview`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    const db = new DatabaseSync(dbPath);
    insertFixtures(db);
    dbTopicId = db.prepare('SELECT id FROM quiz_topics ORDER BY sort_order, id LIMIT 1').get()?.id ?? '';
    db.close();

    proxy = await startOldProxy(oldRoot);

    browser = await chromium.launch({ headless: true });

    // ------------------------------------------------------------- previous
    const previous = await browser.newPage({ viewport: VIEWPORT });
    await previous.goto(`${OLD_BASE}/admin/`, { waitUntil: 'networkidle' });
    await capture(previous, PREVIOUS, 'login.png');
    await loginOld(previous);

    await goOld(previous, '#/overview');
    await capture(previous, PREVIOUS, 'overview.png');

    await goOld(previous, '#/news');
    await capture(previous, PREVIOUS, 'news.png');

    await goOld(previous, '#/users');
    await capture(previous, PREVIOUS, 'users/01-list.png');
    await previous.getByRole('button', { name: 'Konto anlegen' }).click();
    await previous.waitForSelector('dialog#create-user[open]');
    await capture(previous, PREVIOUS, 'users/02-create-dialog.png', false);
    await previous.locator('#create-cancel').click();

    const erika = USERS[0];
    for (const [index, tab] of ['overview', 'sessions', 'devices', 'platforms', 'campus', 'ilias', 'data', 'calendar', 'calls', 'quiz', 'audit'].entries()) {
      await goOld(previous, `#/users/${erika.id}/${tab}`, '#user-tab-content');
      await capture(previous, PREVIOUS, `users/detail/${String(index + 1).padStart(2, '0')}-${tab}.png`);
    }

    const topic = dbTopicId;
    await goOld(previous, '#/quiz');
    await capture(previous, PREVIOUS, 'quiz/01-catalog.png');
    await goOld(previous, `#/quiz/topics/${topic}`, '#view .view-stack');
    await capture(previous, PREVIOUS, 'quiz/02-topic.png');
    await goOld(previous, '#/quiz/attempts');
    await capture(previous, PREVIOUS, 'quiz/03-attempts.png');
    await goOld(previous, '#/quiz/sessions');
    await capture(previous, PREVIOUS, 'quiz/04-sessions.png');

    await goOld(previous, '#/ilias');
    await capture(previous, PREVIOUS, 'ilias.png');
    await goOld(previous, '#/devices');
    await capture(previous, PREVIOUS, 'devices/01-list.png');
    await goOld(previous, '#/devices/dev_parity_mac', '#view .view-stack');
    await capture(previous, PREVIOUS, 'devices/02-detail.png');

    await goOld(previous, '#/audit');
    await capture(previous, PREVIOUS, 'audit.png');
    await goOld(previous, '#/logs');
    await capture(previous, PREVIOUS, 'logs.png');
    await goOld(previous, '#/components');
    await capture(previous, PREVIOUS, 'components.png');
    await goOld(previous, '#/system');
    await capture(previous, PREVIOUS, 'system.png');
    await previous.close();

    // -------------------------------------------------------------- current
    const current = await browser.newPage({ viewport: VIEWPORT });
    await current.goto(`${BASE}/admin/`, { waitUntil: 'networkidle' });
    await capture(current, CURRENT, 'login.png');
    await loginCurrent(current);

    await goCurrent(current, '/', '.kpi-grid');
    await capture(current, CURRENT, 'overview.png');

    await goCurrent(current, '/news', '.view-stack');
    await capture(current, CURRENT, 'news.png');

    await goCurrent(current, '/users', '.view-stack');
    await capture(current, CURRENT, 'users/01-list.png');
    await current.getByRole('button', { name: 'Konto anlegen' }).click();
    await current.getByRole('dialog').waitFor();
    await capture(current, CURRENT, 'users/02-create-dialog.png', false);
    await current.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();

    for (const [index, tab] of ['overview', 'sessions', 'devices', 'platforms', 'campus', 'ilias', 'data', 'calendar', 'calls', 'quiz', 'audit'].entries()) {
      await goCurrent(current, `/users/${erika.id}?tab=${tab}`, '.profile-card');
      await current.waitForSelector('.detail-content');
      await capture(current, CURRENT, `users/detail/${String(index + 1).padStart(2, '0')}-${tab}.png`);
    }

    await goCurrent(current, '/quiz', '.kpi-grid');
    await capture(current, CURRENT, 'quiz/01-catalog.png');
    await current.getByRole('button', { name: 'Öffnen' }).first().click();
    await current.getByRole('dialog').waitFor();
    await current.waitForTimeout(600);
    await capture(current, CURRENT, 'quiz/02-topic.png', false);
    await current.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();
    await goCurrent(current, '/quiz', '.kpi-grid');
    await current.getByRole('button', { name: 'Alle Antworten' }).click();
    await current.waitForTimeout(700);
    await capture(current, CURRENT, 'quiz/03-attempts.png');
    await goCurrent(current, '/quiz', '.kpi-grid');
    await current.getByRole('button', { name: 'Runden' }).click();
    await current.waitForTimeout(700);
    await capture(current, CURRENT, 'quiz/04-sessions.png');

    await goCurrent(current, '/ilias', '.view-stack');
    await capture(current, CURRENT, 'ilias.png');
    await goCurrent(current, '/devices', '.view-stack');
    await capture(current, CURRENT, 'devices/01-list.png');
    await current.locator('table.data tbody tr').first().click();
    await current.getByRole('dialog').waitFor();
    await current.waitForTimeout(400);
    await capture(current, CURRENT, 'devices/02-detail.png', false);
    await current.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();

    await goCurrent(current, '/audit', '.view-stack');
    await capture(current, CURRENT, 'audit.png');
    await goCurrent(current, '/logs', '.view-stack');
    await capture(current, CURRENT, 'logs.png');
    await goCurrent(current, '/components', '.view-stack');
    await capture(current, CURRENT, 'components.png');
    await goCurrent(current, '/system', '.view-stack');
    await capture(current, CURRENT, 'system.png');
    await current.close();
  } finally {
    if (browser) await browser.close();
    if (proxy) await new Promise((resolveClose) => proxy.close(resolveClose));
    server.kill('SIGTERM');
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    await rm(work, { recursive: true, force: true });
  }

  await composeComparisons();
  await writeReadme();
  console.log(`Screenshots written to ${relative(REPO, OUT)}`);
}

let dbTopicId = '';

async function composeComparisons() {
  const script = join(dirname(new URL(import.meta.url).pathname), 'compose.py');
  const result = spawnSync('python3', [script, OUT], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('compose.py failed');
}

async function writeReadme() {
  const groups = [
    ['Betrieb', [
      ['Login', 'login.png'],
      ['Übersicht', 'overview.png'],
      ['News', 'news.png'],
      ['ILIAS', 'ilias.png'],
      ['Geräte – Liste', 'devices/01-list.png'],
      ['Geräte – Detail', 'devices/02-detail.png'],
      ['Aktivität', 'audit.png'],
    ]],
    ['Lernquiz', [
      ['Katalog', 'quiz/01-catalog.png'],
      ['Thema', 'quiz/02-topic.png'],
      ['Antworten', 'quiz/03-attempts.png'],
      ['Runden', 'quiz/04-sessions.png'],
    ]],
    ['Nutzer', [
      ['Liste', 'users/01-list.png'],
      ['Anlegen-Dialog', 'users/02-create-dialog.png'],
      ['Detail – Übersicht', 'users/detail/01-overview.png'],
      ['Detail – Sitzungen', 'users/detail/02-sessions.png'],
      ['Detail – Geräte', 'users/detail/03-devices.png'],
      ['Detail – Plattformen', 'users/detail/04-platforms.png'],
      ['Detail – C@MPUS', 'users/detail/05-campus.png'],
      ['Detail – ILIAS', 'users/detail/06-ilias.png'],
      ['Detail – Studiengänge', 'users/detail/07-data.png'],
      ['Detail – Kalender', 'users/detail/08-calendar.png'],
      ['Detail – Aufrufe', 'users/detail/09-calls.png'],
      ['Detail – Lernquiz', 'users/detail/10-quiz.png'],
      ['Detail – Aktivität', 'users/detail/11-audit.png'],
    ]],
    ['System', [
      ['Logs', 'logs.png'],
      ['Komponenten', 'components.png'],
      ['System', 'system.png'],
    ]],
  ];
  const sections = groups.map(([name, entries]) => {
    const rows = entries.map(([label, file]) => {
      const composite = file.replace(/\.png$/, '.jpg');
      return `| ${label} | [vorher](previous/${file}) | [nachher](current/${file}) | [direkt](side-by-side/${composite}) |`;
    });
    return `### ${name}\n\n| Screen | Previous | Current | Side by side |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`;
  });
  const content = `# Admin UI parity screenshots

These screenshots compare the pre-migration dashboard at commit \`${PREVIOUS_COMMIT}\`
with the current React/Vite admin. Both sides use the same seeded fixture database,
so layout, tables, dialogs and empty states are comparable.

- \`side-by-side/\` – direct before/after images, labelled and grouped by route.
- \`previous/\` – full-resolution screenshots of the old dashboard.
- \`current/\` – full-resolution screenshots of the React admin.

The folder structure mirrors the admin routes, for example
\`users/detail/05-campus.png\`.

## Key comparisons

### Übersicht
[![Übersicht](side-by-side/overview.jpg)](side-by-side/overview.jpg)

### Nutzer
[![Nutzer](side-by-side/users/01-list.jpg)](side-by-side/users/01-list.jpg)

### Lernquiz
[![Lernquiz](side-by-side/quiz/01-catalog.jpg)](side-by-side/quiz/01-catalog.jpg)

### Nutzerdetail
[![Nutzerdetail](side-by-side/users/detail/01-overview.jpg)](side-by-side/users/detail/01-overview.jpg)

## All screens

${sections.join('\n')}
## Notes

- Previous screenshots are served from \`git archive ${PREVIOUS_COMMIT} server/dashboard\`
  through a same-origin proxy, so the old frontend talks to the current API.
- Current screenshots are the React admin at \`apps/admin\`.
- Interactive differences are kept visible: the old quiz opens a topic as a
  dedicated page and devices have a detail page, while the React admin uses
  dialogs for both.
- Regenerate with \`node tools/admin-screenshots/capture.mjs\`. It boots a
  temporary server and database with deterministic fixtures and does not touch
  your local data.
`;
  await writeFile(join(OUT, 'README.md'), content);
}

if (process.argv.includes('--readme-only')) {
  writeReadme().then(() => console.log(`Wrote ${relative(REPO, join(OUT, 'README.md'))}`)).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
