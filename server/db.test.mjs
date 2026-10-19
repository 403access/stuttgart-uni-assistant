import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';
process.env.CAMPUS_BEARER_TOKEN = 'test-token';

const db = await import('./db.mjs');
const campus = await import('./campus.mjs');
const sync = await import('./sync.mjs');

beforeEach(() => {
  db.resetDbForTests();
});

function structurePayload(children) {
  return {
    resource: children.map((node) => ({
      content: {
        curriculumStructureElementDto: {
          id: node.id,
          designation: node.designation,
          elementType: node.elementType,
          parentId: node.parentId,
          name: { value: node.name },
        },
      },
    })),
  };
}

function coursesPayload(courses) {
  return {
    resource: [
      {
        content: {
          CmCurriculumElementCourseGroupingsListDto: {
            courseGroupings: [{ courseList: courses }],
          },
        },
      },
    ],
  };
}

const TREE = {
  10: [
    { id: 10, designation: 'R', elementType: 'ROOT', parentId: undefined, name: 'Philosophie' },
    { id: 20, designation: '100', elementType: 'DEFAULT', parentId: 10, name: 'Basismodule' },
    { id: 30, designation: '200', elementType: 'DEFAULT', parentId: 10, name: 'Kernmodule' },
  ],
  20: [{ id: 20, designation: '100', elementType: 'DEFAULT', parentId: 10, name: 'Basismodule' }],
  30: [{ id: 30, designation: '200', elementType: 'DEFAULT', parentId: 10, name: 'Kernmodule' }],
};

function fakePortal({ delayMs = 0, failElements = [] } = {}) {
  return async (url) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (url.includes('/myStudies/chooser')) {
      return { ok: true, status: 200, json: async () => ({ resource: [{ content: { CmStudyInfoDto: { studyId: 1, name: { value: 'Anderes' }, myStudyLink: { href: 'https://x/myStudies/1/myCurriculumElements/11' }, lastAccessed: false } } }] }) };
    }
    const structure = url.match(/myStudies\/(\d+)\/myCurriculumElements\/(\d+)\/structure/);
    if (structure) {
      const elementId = Number(structure[2]);
      if (failElements.includes(elementId)) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => structurePayload(TREE[elementId] ?? []) };
    }
    const courses = url.match(/myCurriculumElements\/(\d+)\/courses/);
    if (courses) {
      const elementId = Number(courses[1]);
      if (elementId === 20) {
        return { ok: true, status: 200, json: async () => coursesPayload([{ id: 7, courseTitle: { value: 'Logik' } }]) };
      }
      return { ok: true, status: 200, json: async () => coursesPayload([]) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

test('server structures round-trip with expanded ids and sync info', async () => {
  db.saveStructure('legacy', 99, 10, TREE[10].map((node) => ({ ...node, parentId: node.parentId ?? null, completed: false, inProgress: false })), [10], false);
  const stored = db.loadStructure('legacy', 99);
  assert.equal(stored.nodes.length, 3);
  assert.deepEqual(stored.expandedIds, [10]);
  assert.equal(stored.sync.complete, false);
  assert.equal(db.isExpanded('legacy', 99, 10), true);
  assert.equal(db.isExpanded('legacy', 99, 20), false);
});

test('server courses round-trip with element links and fetched ids', async () => {
  const courses = campus.coursesFromPayload(coursesPayload([{ id: 7, courseTitle: { value: 'Logik' } }]));
  db.saveCourses('legacy', 99, [{ ...courses[0], elementIds: [20], elementNames: ['Basismodule'] }], [20], true);
  assert.equal(db.loadCourses('legacy', 99).length, 1);
  assert.equal(db.loadCourses('legacy', 99, 20).length, 1);
  assert.equal(db.loadCourses('legacy', 99, 30).length, 0);
  assert.deepEqual(db.loadCoursesFetchedIds('legacy', 99), [20]);
  assert.equal(db.getCoursesSync('legacy', 99).complete, true);
});

test('server studies snapshot and portal-call log round-trip', async () => {
  db.saveStudiesSnapshot('legacy', [{ studyId: 99, name: 'Philosophie' }]);
  assert.equal(db.loadStudiesSnapshot('legacy').studies.length, 1);
  db.logPortalCall({ op: 'structure', studyId: 99, elementId: 10, ok: true, httpStatus: 200, elapsedMs: 5 });
  db.logPortalCall({ op: 'structure', studyId: 99, elementId: 20, ok: false, httpStatus: 500, message: 'upstream 500', elapsedMs: 6 });
  const calls = db.readPortalCalls('legacy', 500);
  assert.deepEqual(calls.map((item) => item.elementId), [20, 10]);
  assert.equal(calls[0].uid, `srv-${calls[0].id}`);
  assert.equal(db.readPortalCalls('legacy', 1).length, 1);
});

test('live reads persist and offline reads fall back to the store', async () => {
  const loaded = await campus.loadCurriculumStructure(10, 99, fakePortal());
  assert.equal(loaded.nodes.length, 3);
  assert.equal(db.loadStructure('legacy', 99).nodes.length, 3);
  const offline = await campus.loadCurriculumStructure(10, 99, async () => {
    throw new Error('fetch failed');
  });
  assert.equal(offline.cached, true);
  assert.equal(offline.nodes.length, 3);
  await assert.rejects(() => campus.loadCurriculumStructure(77, 99, async () => ({ ok: false, status: 500, json: async () => ({}) })), (error) => error.message === 'campus_failed');
});

test('sync job walks the tree and courses into the store', async () => {
  const started = await sync.startSyncJob({ studyId: 99, elementId: 10, includeCourses: true, fetchImpl: fakePortal() });
  assert.equal(started.state, 'running');
  const done = await pollJob(started.jobId);
  assert.equal(done.state, 'done');
  assert.equal(done.nodeCount, 3);
  assert.deepEqual([...done.failedIds].sort(), []);
  assert.equal(db.loadStructure('legacy', 99).sync.complete, true);
  assert.equal(db.getCoursesSync('legacy', 99).courseCount, 1);
}, { timeout: 15000 });

test('sync job can be cancelled and keeps partial progress', async () => {
  const big = { 1: [{ id: 1, designation: 'R', elementType: 'ROOT', name: 'Root' }] };
  for (let id = 2; id <= 12; id += 1) big[1].push({ id, designation: `${id}`, elementType: 'DEFAULT', parentId: 1, name: `Node ${id}` });
  for (let id = 2; id <= 12; id += 1) big[id] = [{ id, designation: `${id}`, elementType: 'DEFAULT', parentId: 1, name: `Node ${id}` }];
  const slowPortal = async (url) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const structure = url.match(/myCurriculumElements\/(\d+)\/structure/);
    const nodes = big[Number(structure[1])] ?? [];
    return { ok: true, status: 200, json: async () => structurePayload(nodes.map((node) => ({ ...node, parentId: node.parentId ?? null }))) };
  };
  const started = await sync.startSyncJob({ studyId: 98, elementId: 1, includeCourses: false, fetchImpl: slowPortal });
  await new Promise((resolve) => setTimeout(resolve, 100));
  sync.cancelSyncJob(started.jobId);
  const done = await pollJob(started.jobId);
  assert.equal(done.state, 'cancelled');
  const stored = db.loadStructure('legacy', 98);
  // The root call lands with all its children, but only the root counts as expanded.
  assert.equal(stored.nodes.length, 12);
  assert.deepEqual(stored.expandedIds, [1]);
  assert.equal(stored.sync.complete, false);
}, { timeout: 15000 });

test('sync cancel aborts in-flight calls instead of waiting for timeouts', async () => {
  const hanging = (url, options = {}) =>
    new Promise((_, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
  const startedAt = Date.now();
  const started = await sync.startSyncJob({ studyId: 97, elementId: 10, includeCourses: false, fetchImpl: hanging });
  await new Promise((resolve) => setTimeout(resolve, 200));
  sync.cancelSyncJob(started.jobId);
  const done = await pollJob(started.jobId);
  assert.equal(done.state, 'cancelled');
  assert.deepEqual(done.failedIds, []);
  assert.ok(Date.now() - startedAt < 10000, 'cancelled promptly instead of waiting out timeouts');
}, { timeout: 15000 });

test('sync job rejects an unknown study', async () => {
  await assert.rejects(() => sync.startSyncJob({ studyId: 999999, fetchImpl: fakePortal() }), (error) => error.message === 'bad_study_id');
  assert.equal(sync.getSyncJob(123456789), null);
  assert.equal(sync.cancelSyncJob(123456789), null);
});

async function pollJob(jobId) {
  const deadline = Date.now() + 10000;
  for (;;) {
    const job = sync.getSyncJob(jobId);
    assert.ok(job, 'job exists');
    if (job.state === 'done' || job.state === 'cancelled' || job.state === 'failed') return job;
    if (Date.now() > deadline) throw new Error(`job ${jobId} did not finish`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

test('calendar export posts the mask fields and returns the attachment', async () => {
  process.env.CAMPUS_SESSION_COOKIE = 'session-value';
  let seen = null;
  const bytes = new Uint8Array([65, 66, 67]);
  const fetchImpl = async (url, options = {}) => {
    seen = { url, contentType: options.headers?.['Content-Type'], cookie: options.headers?.Cookie, body: options.body };
    return {
      ok: true,
      status: 200,
      headers: { get: (name) => (name === 'content-disposition' ? 'attachment;filename=personal_20261016.csv' : 'text/csv; charset=utf-8') },
      arrayBuffer: async () => bytes.buffer,
    };
  };
  const result = await campus.exportCampusCalendar({ dateFrom: '16.10.2026', dateTo: '16.10.2027', format: 2, charset: 'WE8ISO8859P1' }, fetchImpl);
  assert.equal(seen.url, 'https://campus.uni-stuttgart.de/cusonline/wbKalender.wbExport');
  assert.equal(seen.contentType, 'application/x-www-form-urlencoded');
  assert.equal(seen.cookie, 'PSESSIONID=session-value');
  assert.ok(seen.body.includes('pMaskAction=DOWNLOAD') && seen.body.includes('pOutputFormat=2'));
  assert.equal(result.filename, 'personal_20261016.csv');
  assert.equal(result.base64, Buffer.from(bytes).toString('base64'));
  delete process.env.CAMPUS_SESSION_COOKIE;
});

test('calendar export validates its inputs', async () => {
  const unreachable = async () => {
    throw new Error('must not be called');
  };
  await assert.rejects(() => campus.exportCampusCalendar({ dateFrom: '2026-10-16', dateTo: '16.10.2027' }, unreachable), (error) => error.message === 'bad_export_date');
  await assert.rejects(() => campus.exportCampusCalendar({ dateFrom: '16.10.2026', dateTo: '16.10.2027', format: 7 }, unreachable), (error) => error.message === 'bad_export_format');
  await assert.rejects(() => campus.exportCampusCalendar({ dateFrom: '16.10.2026', dateTo: '16.10.2027', charset: 'X' }, unreachable), (error) => error.message === 'bad_export_charset');
  assert.equal(campus.exportFilename("attachment;filename*=utf-8''kalender%202026.ics", 99), 'kalender 2026.ics');
  assert.equal(campus.exportFilename(null, 1), 'kalender-export.xml');
});

const SAMPLE_ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:evt-1@campus',
  'DTSTART:20261019T140000',
  'DTEND:20261019T153000',
  'SUMMARY:Einführung in die Geschichte der Philosophie',
  'LOCATION:Breitscheid 02A - M 2.00',
  'DESCRIPTION:Langbeschreibung\\, mit Komma und Fortsetzung',
  ' weiter im Text',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:evt-1@campus',
  'RECURRENCE-ID:20261026T140000',
  'DTSTART:20261026T140000',
  'DTEND:20261026T153000',
  'SUMMARY:Wiederholung',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:evt-2@campus',
  'DTSTART:20261022T113000',
  'SUMMARY:Ohne Ende',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:ohne-termin',
  'SUMMARY:Kein Termin',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

test('ics events unfold lines, unescape, and key recurrences separately', () => {
  const events = campus.parseIcsEvents(SAMPLE_ICS);
  assert.equal(events.length, 3);
  assert.equal(events[0].uid, 'evt-1@campus');
  assert.equal(events[0].description, 'Langbeschreibung, mit Komma und Fortsetzungweiter im Text');
  assert.equal(events[1].uid, 'evt-1@campus#20261026T140000');
  assert.equal(events[2].dtend, '');
});

test('calendar sync imports once and skips duplicates on repeat', async () => {
  process.env.CAMPUS_SESSION_COOKIE = 'session-value';
  const bytes = Buffer.from(Buffer.from(SAMPLE_ICS, 'utf-8').toString('base64'), 'base64');
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  const first = await campus.syncExportedCalendar({ dateFrom: '16.10.2026', dateTo: '16.10.2027' }, fetchImpl);
  assert.equal(first.total, 3);
  assert.equal(first.imported, 3);
  assert.equal(first.skipped, 0);
  const second = await campus.syncExportedCalendar({ dateFrom: '16.10.2026', dateTo: '16.10.2027' }, fetchImpl);
  assert.equal(second.imported, 0);
  assert.equal(second.skipped, 3);
  delete process.env.CAMPUS_SESSION_COOKIE;
});

test('browser harvest parsing reads the session cookie and token candidates', () => {
  assert.equal(campus.sessionCookieFromString('a=1; PSESSIONID=abc123; b=2'), 'abc123');
  assert.deepEqual(
    campus.bearerCandidatesFromStorage({ 'other': 'z'.repeat(80), 'local:cusonline_co.login.accessToken': 'eyJh.YmM.ZGVm' }),
    ['eyJh.YmM.ZGVm', 'z'.repeat(80)],
  );
  assert.deepEqual(
    campus.bearerCandidatesFromStorage({ 'local:cusonline_co.login.accessToken': 'k'.repeat(44) }),
    ['k'.repeat(44)],
  );
  assert.equal(campus.sessionCookieFromString('nope'), '');
  assert.equal(campus.sessionCookieFromString(undefined), '');
  const bears = campus.bearerCandidatesFromStorage({ 'local:x': 'short', 'session:access': 'eyJh.YmM.ZGVm', 'other': 'z'.repeat(80) });
  assert.deepEqual(bears, ['eyJh.YmM.ZGVm', 'z'.repeat(80)]);
  assert.deepEqual(campus.bearerCandidatesFromStorage(null), []);
  assert.deepEqual(campus.extractBrowserCredentials({ cookies: '', storage: {} }), { session: '', bearers: [] });
});

test('browser credentials validate cookie plus bearer and keep the pair', async () => {
  delete process.env.CAMPUS_BEARER_TOKEN;
  delete process.env.CAMPUS_SESSION_COOKIE;
  const goodBearer = 'good-jwt-value'.padEnd(70, '0');
  const chooser = { resource: [{ content: { CmStudyInfoDto: { studyId: 9, name: { value: 'S' }, myStudyLink: { href: 'https://x/myStudies/9/myCurriculumElements/3' } } } }] };
  const seen = [];
  const fetchImpl = async (url, options = {}) => {
    seen.push(options.headers);
    const auth = options.headers?.Authorization ?? '';
    const cookie = options.headers?.Cookie ?? '';
    if (auth === `Bearer ${goodBearer}` && cookie === 'PSESSIONID=good-cookie') {
      return { ok: true, status: 200, json: async () => chooser };
    }
    return { ok: false, status: 401, json: async () => ({ resource: [{ content: { coErrorDto: { message: 'invalid_token' } } }] }) };
  };
  const result = await campus.loginWithBrowserCredentials({ cookies: 'PSESSIONID=good-cookie', storage: { 'x': 'nope', 'session:at': goodBearer } }, fetchImpl);
  assert.equal(result.ok, true);
  assert.equal(result.studies, 1);
  assert.equal(campus.campusAuthorizationHeader(), `Bearer ${goodBearer}`);
  assert.ok(seen.some((headers) => headers.Cookie === 'PSESSIONID=good-cookie'));
  campus.clearRuntimeToken();
  campus.clearRuntimeSession();
});

test('a session cookie alone can mint the bearer and sign in', async () => {
  delete process.env.CAMPUS_BEARER_TOKEN;
  delete process.env.CAMPUS_SESSION_COOKIE;
  const minted = 'minted-bearer-value';
  const chooser = { resource: [{ content: { CmStudyInfoDto: { studyId: 9, name: { value: 'S' }, myStudyLink: { href: 'https://x/myStudies/9/myCurriculumElements/3' } } } }] };
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), headers: options.headers });
    if (String(url).includes('/auth/token/refresh')) {
      assert.equal(options.headers.Cookie, 'PSESSIONID=good-cookie');
      return { ok: true, status: 200, json: async () => ({ access_token: minted }) };
    }
    const auth = options.headers?.Authorization ?? '';
    const cookie = options.headers?.Cookie ?? '';
    if (auth === `Bearer ${minted}` && cookie === 'PSESSIONID=good-cookie') {
      return { ok: true, status: 200, json: async () => chooser };
    }
    return { ok: false, status: 401, json: async () => ({ resource: [{ content: { coErrorDto: { message: 'invalid_token' } } }] }) };
  };

  const result = await campus.loginWithBrowserCredentials({ cookies: 'PSESSIONID=good-cookie', storage: {} }, fetchImpl);
  assert.equal(result.ok, true);
  assert.equal(result.studies, 1);
  assert.equal(calls[0].url.includes('/auth/token/refresh'), true);
  assert.equal(campus.campusAuthorizationHeader(), `Bearer ${minted}`);
  campus.clearRuntimeToken();
  campus.clearRuntimeSession();
});

test('browser credentials reject an empty harvest and restore on failure', async () => {
  await assert.rejects(() => campus.loginWithBrowserCredentials({ cookies: '', storage: {} }), (error) => error.message === 'no_credentials_found');
  const failing = async () => ({ ok: false, status: 401, json: async () => ({ resource: [{ content: { coErrorDto: { message: 'invalid_token' } } }] }) });
  await assert.rejects(
    () => campus.loginWithBrowserCredentials({ cookies: 'PSESSIONID=bad', storage: { t: 'eyJh.YmM.ZGVm' } }, failing),
    (error) => error.message === 'invalid_token',
  );
  assert.equal(campus.campusAuthorizationHeader(), null);
  assert.equal(campus.publicCampusStatus().sessionCookieConfigured, false);
});
