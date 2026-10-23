/**
 * Endpoint-level coverage for `/v1/admin/*`. The data-layer tests in
 * `admin.test.mjs` cover the queries; this file proves the routing, cookie
 * gate, JSON bodies, and status codes an operator actually hits.
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';
process.env.DASHBOARD_TOKEN = 'route-token';

const db = await import('./db.mjs');
const auth = await import('./auth.mjs');
const { handleAdmin } = await import('./routes/admin/index.mjs');

let server;
let base;
let cookie;
let userId;

before(async () => {
  const created = auth.createUserSession({ account: 'st123456', name: 'Route User', email: 'route@example.test', mode: 'campus' });
  userId = created.user.id;
  auth.linkPlatform(userId, { platform: 'campus', account: 'st123456', status: 'connected', source: 'campus' });
  db.saveCampusSource(userId, 'browser', 'st123456');
  db.saveStudiesSnapshot(userId, [{ studyId: 10, name: 'Informatik', intendedDegree: 'Bachelor of Science', lastAccessed: true, elementId: 1 }]);
  db.saveStructure(userId, 10, 1, [
    { id: 1, designation: 'R', elementType: 'ROOT', name: 'Informatik', parentId: null, completed: false, inProgress: false },
    { id: 2, designation: 'M', elementType: 'MODULE', name: 'Algorithmen', parentId: 1, completed: true, inProgress: false },
  ], [1], true);
  db.saveCourses(userId, 10, [{
    id: 7, courseNumber: '123', title: 'Algorithmen', courseType: 'Vorlesung', courseTypeShort: 'V',
    semester: '2026 W', semesterId: 1, duration: 1, lecturers: ['Prof. Test'], roomName: 'V 1',
    startTime: '', endTime: '', detailUrl: '', registrationStatus: 'angemeldet', registrationAction: '',
    registrationUrl: '', elementIds: [2], elementNames: ['Algorithmen'],
  }], [2], true);
  db.saveExportedEvents(userId, [{ uid: 'route@test', summary: 'Klausur', location: 'H1', description: '', dtstart: '20261020T100000Z', dtend: '20261020T110000Z' }]);
  db.logPortalCall({ userId, op: 'structure', studyId: 10, elementId: 1, ok: true, httpStatus: 200, elapsedMs: 3 });

  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    if (!(await handleAdmin(request, response, url))) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

function call(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  return fetch(base + path, { ...options, headers });
}

test('the admin HTTP surface gates, reads, mutates, audits, and deletes', async () => {
  // The shell and its browser modules are readable without a cookie.
  const page = await call('/admin');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /DASHBOARD_TOKEN/);
  assert.match(html, /\/admin\/assets\/styles\.css/);
  assert.match(html, /\/admin\/assets\/app\.mjs/);
  assert.match(html, /\/admin\/assets\/favicon\.png/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/);

  const favicon = await call('/admin/assets/favicon.png');
  assert.equal(favicon.status, 200);
  assert.match(favicon.headers.get('content-type'), /image\/png/);
  assert.equal((await favicon.arrayBuffer()).byteLength > 0, true);

  const styles = await call('/admin/assets/styles.css');
  assert.equal(styles.status, 200);
  assert.match(styles.headers.get('content-type'), /text\/css/);
  assert.match(await styles.text(), /:root/);

  const modules = await call('/admin/assets/app.mjs');
  assert.equal(modules.status, 200);
  assert.match(modules.headers.get('content-type'), /javascript/);
  assert.match(await modules.text(), /^import /m);

  const missingAsset = await call('/admin/assets/missing.mjs');
  assert.equal(missingAsset.status, 404);
  await missingAsset.text();

  // Everything behind /v1/admin/ needs the cookie.
  const denied = await call('/v1/admin/overview');
  assert.equal(denied.status, 401);

  const wrong = await call('/v1/admin/login', { method: 'POST', body: JSON.stringify({ token: 'wrong' }) });
  assert.equal(wrong.status, 401);

  const login = await call('/v1/admin/login', { method: 'POST', body: JSON.stringify({ token: 'route-token' }) });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie');
  assert.match(setCookie, /ua_admin=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  cookie = setCookie.split(';')[0];

  const overview = await call('/v1/admin/overview');
  assert.equal(overview.status, 200);
  const stats = await overview.json();
  assert.equal(stats.users, 1);
  assert.equal(stats.portalNodes, 2);
  assert.equal(stats.portalCourses, 1);

  db.writeServiceLog({ service: 'ilias', level: 'warn', message: 'route log probe' });
  const logs = await call('/v1/admin/logs?service=ilias&level=warn&query=probe');
  assert.equal(logs.status, 200);
  const logsBody = await logs.json();
  assert.equal(logsBody.total, 1);
  assert.equal(logsBody.entries[0].service, 'ilias');
  assert.equal(logsBody.entries[0].message, 'route log probe');
  const clearedLogs = await call('/v1/admin/logs?service=ilias&level=warn', { method: 'DELETE' });
  assert.equal(clearedLogs.status, 200);
  assert.equal((await clearedLogs.json()).removed, 1);
  assert.equal((await (await call('/v1/admin/logs?service=ilias')).json()).total, 0);

  const list = await call('/v1/admin/users?query=st123&sort=name&limit=5');
  const listBody = await list.json();
  assert.equal(listBody.total, 1);
  assert.equal(listBody.users[0].data.nodes, 2);
  assert.equal(listBody.users[0].platforms[0].id, 'campus');

  const detail = await call(`/v1/admin/users/${userId}`);
  assert.equal(detail.status, 200);
  const detailBody = await detail.json();
  assert.equal(detailBody.counts.studies, 1);
  assert.equal(detailBody.studies[0].name, 'Informatik');
  assert.equal(Array.isArray(detailBody.audit), true);

  const iliasContent = await call(`/v1/admin/users/${userId}/ilias/content?refId=4590579&kind=crs`);
  assert.equal(iliasContent.status, 409);
  assert.equal((await iliasContent.json()).error, 'ilias_credentials_missing');
  const iliasMembers = await call(`/v1/admin/users/${userId}/ilias/members?refId=4590579&kind=crs`);
  assert.equal(iliasMembers.status, 409);
  assert.equal((await iliasMembers.json()).error, 'ilias_credentials_missing');
  const iliasFile = await call(`/v1/admin/users/${userId}/ilias/file?refId=4665501`);
  assert.equal(iliasFile.status, 409);

  const create = await call('/v1/admin/users', { method: 'POST', body: JSON.stringify({ account: 'st999999', name: 'Created Route User', mode: 'local' }) });
  assert.equal(create.status, 200);
  const createdBody = await create.json();
  const createdUserId = createdBody.user.id;
  assert.equal(createdBody.user.account, 'st999999');
  assert.equal(createdBody.user.lastLoginAt, null);
  assert.deepEqual(createdBody.user.platforms, []);
  const duplicate = await call('/v1/admin/users', { method: 'POST', body: JSON.stringify({ account: 'ST999999' }) });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error, 'account_taken');

  for (const [path, expected] of [
    ['studies', (body) => body.studies[0].studyId === 10],
    ['courses?limit=1', (body) => body.total === 1 && body.courses[0].elements[0].elementId === 2],
    ['nodes?state=completed', (body) => body.total === 1 && body.nodes[0].name === 'Algorithmen'],
    ['events?query=Klausur', (body) => body.total === 1 && body.events[0].uid === 'route@test'],
    ['calls?failed=0', (body) => body.total === 1 && body.calls[0].op === 'structure'],
  ]) {
    const response = await call(`/v1/admin/users/${userId}/${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(expected(await response.json()), true, path);
  }

  const update = await call(`/v1/admin/users/${userId}`, { method: 'POST', body: JSON.stringify({ name: 'Route Updated', mode: 'ogni' }) });
  assert.equal(update.status, 400);

  const goodUpdate = await call(`/v1/admin/users/${userId}`, { method: 'POST', body: JSON.stringify({ name: 'Route Updated' }) });
  assert.equal(goodUpdate.status, 200);
  assert.equal((await goodUpdate.json()).user.name, 'Route Updated');
  const updatedDetail = await call(`/v1/admin/users/${userId}`);
  assert.equal((await updatedDetail.json()).audit[0].action, 'user.update');

  const link = await call(`/v1/admin/users/${userId}/platforms`, { method: 'POST', body: JSON.stringify({ platform: 'ilias', account: 'st123456', status: 'linked' }) });
  assert.equal(link.status, 200);
  assert.equal((await link.json()).user.platforms.some((item) => item.id === 'ilias'), true);

  const touch = await call(`/v1/admin/users/${userId}/platforms/ilias/touch`, { method: 'POST', body: '{}' });
  assert.equal(touch.status, 200);
  assert.equal(Boolean((await touch.json()).user.platforms.find((item) => item.id === 'ilias').lastSyncAt), true);

  const unlink = await call(`/v1/admin/users/${userId}/platforms/ilias`, { method: 'DELETE' });
  assert.equal(unlink.status, 200);
  assert.equal((await unlink.json()).user.platforms.some((item) => item.id === 'ilias'), false);

  const badClear = await call(`/v1/admin/users/${userId}/portal/clear`, { method: 'POST', body: JSON.stringify({ studyId: 'nope' }) });
  assert.equal(badClear.status, 400);
  assert.equal((await badClear.json()).error, 'bad_study_id');

  const sync = await call(`/v1/admin/users/${userId}/sync`, { method: 'POST', body: JSON.stringify({ studyId: 10 }) });
  assert.equal(sync.status, 409);
  assert.equal((await sync.json()).error, 'campus_credentials_missing');

  const clearCalls = await call(`/v1/admin/users/${userId}/portal/calls/clear`, { method: 'POST', body: '{}' });
  assert.equal(clearCalls.status, 200);
  assert.equal((await clearCalls.json()).counts.calls, 0);

  const audit = await call('/v1/admin/audit?limit=20');
  assert.equal(audit.status, 200);
  const auditBody = await audit.json();
  assert.equal(auditBody.total > 0, true);
  assert.equal(auditBody.entries.some((entry) => entry.action === 'user.update'), true);
  assert.equal(auditBody.entries.some((entry) => entry.action === 'calls.clear'), true);

  const system = await call('/v1/admin/system');
  assert.equal(system.status, 200);
  const systemBody = await system.json();
  assert.equal(systemBody.database.counts.users, 2);
  assert.equal(Array.isArray(systemBody.syncJobs), true);

  const jobs = await call('/v1/admin/sync-jobs');
  assert.equal(jobs.status, 200);
  assert.deepEqual(await jobs.json(), { jobs: [] });

  const missingJob = await call('/v1/admin/sync-jobs/999', { method: 'DELETE' });
  assert.equal(missingJob.status, 404);

  const pairing = auth.createDeviceLink({ name: 'Route Browser', userAgent: 'Route/1.0' });
  auth.approveDeviceLink(userId, pairing.token);
  auth.pollDeviceLink(pairing.token);
  const deviceList = await call('/v1/admin/devices?state=active');
  assert.equal(deviceList.status, 200);
  const deviceBody = await deviceList.json();
  assert.equal(deviceBody.total, 1);
  assert.equal(deviceBody.devices[0].name, 'Route Browser');
  assert.equal(deviceBody.devices[0].account, 'st123456');
  const deviceDetail = await call(`/v1/admin/users/${userId}`);
  assert.equal((await deviceDetail.json()).devices.length, 1);
  const revokeDevice = await call(`/v1/admin/devices/${pairing.id}`, { method: 'DELETE' });
  assert.equal(revokeDevice.status, 200);
  assert.equal((await revokeDevice.json()).ok, true);
  const missingDevice = await call('/v1/admin/devices/dev_missing', { method: 'DELETE' });
  assert.equal(missingDevice.status, 404);

  const logout = await call('/v1/admin/logout', { method: 'POST' });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);

  // Log back in to delete the account and prove the audit row survives it.
  const again = await call('/v1/admin/login', { method: 'POST', body: JSON.stringify({ token: 'route-token' }) });
  cookie = again.headers.get('set-cookie').split(';')[0];
  const removed = await call(`/v1/admin/users/${userId}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  const gone = await call(`/v1/admin/users/${userId}`);
  assert.equal(gone.status, 404);
  const survivingAudit = await call('/v1/admin/audit?query=user.delete');
  const survivingBody = await survivingAudit.json();
  assert.equal(survivingBody.entries[0].action, 'user.delete');
  assert.equal(survivingBody.entries[0].account, 'st123456');

  const removeCreated = await call(`/v1/admin/users/${createdUserId}`, { method: 'DELETE' });
  assert.equal(removeCreated.status, 200);
  const createAudit = await call('/v1/admin/audit?query=user.create');
  assert.equal((await createAudit.json()).entries[0].account, 'st999999');
});
