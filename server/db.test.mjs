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
  db.saveStructure(99, 10, TREE[10].map((node) => ({ ...node, parentId: node.parentId ?? null, completed: false, inProgress: false })), [10], false);
  const stored = db.loadStructure(99);
  assert.equal(stored.nodes.length, 3);
  assert.deepEqual(stored.expandedIds, [10]);
  assert.equal(stored.sync.complete, false);
  assert.equal(db.isExpanded(99, 10), true);
  assert.equal(db.isExpanded(99, 20), false);
});

test('server courses round-trip with element links and fetched ids', async () => {
  const courses = campus.coursesFromPayload(coursesPayload([{ id: 7, courseTitle: { value: 'Logik' } }]));
  db.saveCourses(99, [{ ...courses[0], elementIds: [20], elementNames: ['Basismodule'] }], [20], true);
  assert.equal(db.loadCourses(99).length, 1);
  assert.equal(db.loadCourses(99, 20).length, 1);
  assert.equal(db.loadCourses(99, 30).length, 0);
  assert.deepEqual(db.loadCoursesFetchedIds(99), [20]);
  assert.equal(db.getCoursesSync(99).complete, true);
});

test('server studies snapshot and portal-call log round-trip', async () => {
  db.saveStudiesSnapshot([{ studyId: 99, name: 'Philosophie' }]);
  assert.equal(db.loadStudiesSnapshot().studies.length, 1);
  db.logPortalCall({ op: 'structure', studyId: 99, elementId: 10, ok: true, httpStatus: 200, elapsedMs: 5 });
  db.logPortalCall({ op: 'structure', studyId: 99, elementId: 20, ok: false, httpStatus: 500, message: 'upstream 500', elapsedMs: 6 });
  const calls = db.readPortalCalls(500);
  assert.deepEqual(calls.map((item) => item.elementId), [20, 10]);
  assert.equal(calls[0].uid, `srv-${calls[0].id}`);
  assert.equal(db.readPortalCalls(1).length, 1);
});

test('live reads persist and offline reads fall back to the store', async () => {
  const loaded = await campus.loadCurriculumStructure(10, 99, fakePortal());
  assert.equal(loaded.nodes.length, 3);
  assert.equal(db.loadStructure(99).nodes.length, 3);
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
  assert.equal(db.loadStructure(99).sync.complete, true);
  assert.equal(db.getCoursesSync(99).courseCount, 1);
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
  const stored = db.loadStructure(98);
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
