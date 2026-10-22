import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';
process.env.DASHBOARD_TOKEN = 'test-admin-token';

const db = await import('./db.mjs');
const auth = await import('./auth.mjs');
const admin = await import('./admin/index.mjs');

beforeEach(() => {
  db.resetDbForTests();
});

function user(account, mode = 'campus') {
  const created = auth.createUserSession({ account, name: `Name ${account}`, email: `${account}@example.test`, mode });
  return created;
}

test('the admin token matches exactly and stays out of the cookie name', () => {
  assert.equal(admin.adminConfigured(), true);
  assert.equal(admin.adminTokenMatches('test-admin-token'), true);
  assert.equal(admin.adminTokenMatches('  test-admin-token  '), true);
  assert.equal(admin.adminTokenMatches('wrong'), false);
  assert.equal(admin.adminTokenMatches(''), false);
  const cookie = admin.adminCookie('test-admin-token', true);
  assert.match(cookie, /^ua_admin=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.equal(admin.parseCookies('a=1; ua_admin=test-admin-token; b=2').ua_admin, 'test-admin-token');
});

test('overview and user list count accounts, sessions, and filters', () => {
  const alice = user('st111111');
  const bob = user('st222222', 'oidc');
  auth.linkPlatform(alice.user.id, { platform: 'campus', account: 'st111111', status: 'connected', source: 'campus' });
  auth.linkPlatform(bob.user.id, { platform: 'siam', account: 'st222222', status: 'connected', source: 'oidc' });
  db.saveCampusSource(alice.user.id, 'browser', 'st111111');

  const stats = admin.adminStats();
  assert.equal(stats.users, 2);
  assert.equal(stats.activeSessions, 2);
  assert.equal(stats.usersWithSessions, 2);

  const all = admin.listUsers({});
  assert.equal(all.total, 2);
  assert.equal(all.users.length, 2);
  assert.ok(all.users.find((item) => item.id === alice.user.id).campusSource === 'browser');

  const filtered = admin.listUsers({ query: 'st222222' });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.users[0].id, bob.user.id);

  assert.equal(admin.listUsers({ mode: 'oidc' }).total, 1);
  assert.equal(admin.listUsers({ platform: 'campus' }).total, 1);
  assert.equal(admin.listUsers({ credential: 'browser' }).total, 1);
  assert.equal(admin.listUsers({ credential: 'env' }).total, 0);
});

test('user detail includes sessions, platforms, campus source, and portal counts', () => {
  const alice = user('st111111');
  auth.linkPlatform(alice.user.id, { platform: 'campus', account: 'st111111', status: 'connected', source: 'campus' });
  db.saveCampusSource(alice.user.id, 'browser', 'st111111');
  db.saveStructure(alice.user.id, 10, 1, [{ id: 1, designation: 'R', elementType: 'ROOT', name: 'Informatik', parentId: null, completed: false, inProgress: false }], [1], false);
  db.logPortalCall({ userId: alice.user.id, op: 'structure', studyId: 10, elementId: 1, ok: true, elapsedMs: 3 });

  const detail = admin.adminUserDetail(alice.user.id);
  assert.equal(detail.user.account, 'st111111');
  assert.equal(detail.sessions.length, 1);
  assert.equal(detail.sessions[0].state, 'active');
  assert.equal(detail.user.platforms[0].id, 'campus');
  assert.equal(detail.campus.source, 'browser');
  assert.equal(detail.counts.nodes, 1);
  assert.equal(detail.counts.studies, 1);
  assert.equal(detail.counts.calls, 1);
  assert.equal(detail.calls[0].op, 'structure');
  assert.equal(admin.adminUserDetail('usr_missing'), null);
});

test('profile edits, session revoke, and platform management', () => {
  const alice = user('st111111');
  auth.linkPlatform(alice.user.id, { platform: 'campus', account: 'st111111', status: 'connected', source: 'campus' });
  const updated = admin.updateAdminUser(alice.user.id, { name: 'Alice Example', email: 'alice@example.test', matriculation: '1234567' });
  assert.equal(updated.name, 'Alice Example');
  assert.equal(updated.matriculation, '1234567');

  const detail = admin.adminUserDetail(alice.user.id);
  const sessionId = detail.sessions[0].id;
  assert.equal(admin.revokeAdminSession(alice.user.id, sessionId), true);
  assert.equal(admin.revokeAdminSession(alice.user.id, sessionId), false);
  assert.equal(admin.adminUserDetail(alice.user.id).sessions[0].state, 'revoked');
  assert.equal(auth.authenticateToken(alice.token), null);

  const linked = admin.linkAdminPlatform(alice.user.id, { platform: 'ilias', account: 'st111111', status: 'linked' });
  assert.equal(linked.user.platforms.some((item) => item.id === 'ilias'), true);
  const unlinked = admin.unlinkAdminPlatform(alice.user.id, 'ilias');
  assert.equal(unlinked.user.platforms.some((item) => item.id === 'ilias'), false);
  assert.throws(() => admin.linkAdminPlatform(alice.user.id, { platform: 'dropbox' }), /bad_platform/);
});

test('all sessions can be revoked at once', () => {
  const alice = user('st111111');
  auth.issueSession(alice.user.id);
  assert.equal(admin.adminUserDetail(alice.user.id).sessions.filter((item) => item.state === 'active').length, 2);
  const detail = admin.revokeAdminSessions(alice.user.id);
  assert.equal(detail.sessions.every((item) => item.state !== 'active'), true);
});

test('disconnecting C@MPUS clears the source and demotes the link', () => {
  const alice = user('st111111');
  auth.linkPlatform(alice.user.id, { platform: 'campus', account: 'st111111', status: 'connected', source: 'campus' });
  db.saveCampusSource(alice.user.id, 'browser', 'st111111');
  const detail = admin.disconnectAdminCampus(alice.user.id);
  assert.equal(detail.campus.source, null);
  assert.equal(detail.campus.active, false);
  assert.equal(detail.user.platforms.find((item) => item.id === 'campus').status, 'linked');
});

test('device links are listed, counted, attached to sessions, and revocable', () => {
  const alice = user('st111111');
  const link = auth.createDeviceLink({ name: 'Chrome · macOS', userAgent: 'Mozilla/5.0 Chrome' });
  auth.approveDeviceLink(alice.user.id, link.token);
  const redeemed = auth.pollDeviceLink(link.token);
  assert.equal(redeemed.status, 'approved');

  const stats = admin.adminDeviceStats();
  assert.equal(stats.devices, 1);
  assert.equal(stats.devicesActive, 1);
  assert.equal(stats.devicesPending, 0);
  assert.equal(admin.adminStats().devicesActive, 1);

  const listed = admin.listAdminDevices({});
  assert.equal(listed.total, 1);
  assert.equal(listed.devices[0].name, 'Chrome · macOS');
  assert.equal(listed.devices[0].state, 'active');
  assert.equal(listed.devices[0].account, 'st111111');
  assert.equal(admin.listAdminDevices({ state: 'revoked' }).total, 0);
  assert.equal(admin.listAdminDevices({ query: 'chrome' }).total, 1);

  const detail = admin.adminUserDetail(alice.user.id);
  assert.equal(detail.devices.length, 1);
  assert.equal(detail.sessions[0].device.name, 'Chrome · macOS');
  assert.equal(admin.listUsers({}).users[0].deviceCount, 1);

  const revoked = admin.revokeAdminDevice(link.id);
  assert.equal(revoked.ok, true);
  assert.equal(admin.listAdminDevices({ state: 'revoked' }).total, 1);
  assert.equal(auth.authenticateToken(redeemed.session.token), null);
  const audit = admin.listAdminAudit({ action: 'device.revoke' });
  assert.equal(audit.entries[0].detail.deviceId, link.id);
  assert.equal(admin.revokeAdminDevice('bad-id'), null);
});

test('portal data can be cleared for one user without touching another', () => {
  const alice = user('st111111');
  const bob = user('st222222');
  for (const [created, name] of [[alice, 'Alice'], [bob, 'Bob']]) {
    db.saveStructure(created.user.id, 10, 1, [{ id: 1, designation: 'R', elementType: 'ROOT', name, parentId: null, completed: false, inProgress: false }], [1], false);
    db.saveStudiesSnapshot(created.user.id, [{ studyId: 10, name }]);
    db.logPortalCall({ userId: created.user.id, op: 'structure', studyId: 10, elementId: 1, ok: true });
  }
  const cleared = admin.clearAdminPortalData(alice.user.id);
  assert.equal(cleared.counts.nodes, 0);
  assert.equal(cleared.counts.studies, 0);
  assert.equal(cleared.counts.calls, 0);
  assert.equal(db.loadStructure(bob.user.id, 10).nodes.length, 1);
  assert.throws(() => admin.clearAdminPortalData(bob.user.id, 'not-a-study'), /bad_study_id/);
  assert.equal(db.loadStructure(bob.user.id, 10).nodes.length, 1);
});

test('deleting a user removes the account, sessions, links, and portal rows', () => {
  const alice = user('st111111');
  auth.linkPlatform(alice.user.id, { platform: 'campus', account: 'st111111', status: 'connected' });
  db.saveCampusSource(alice.user.id, 'browser', 'st111111');
  db.saveStructure(alice.user.id, 10, 1, [{ id: 1, designation: 'R', elementType: 'ROOT', name: 'Informatik', parentId: null, completed: false, inProgress: false }], [1], false);
  db.logPortalCall({ userId: alice.user.id, op: 'structure' });
  db.saveIliasSource(alice.user.id, 'browser', 'st111111');
  db.saveIliasSnapshot(alice.user.id, { counts: { courses: 1 }, fetchedAt: '2026-10-20T20:00:00.000Z' });
  db.saveIliasContent(alice.user.id, { refId: 4590579, kind: 'crs', title: 'Logik', items: [], fetchedAt: '2026-10-20T20:00:00.000Z' });
  db.saveIliasPage(alice.user.id, { key: 'dashboard', html: '<html></html>' });
  assert.equal(admin.deleteAdminUser(alice.user.id), true);
  assert.equal(auth.getUser(alice.user.id), null);
  assert.equal(admin.adminUserDetail(alice.user.id), null);
  assert.equal(auth.authenticateToken(alice.token), null);
  assert.equal(db.loadStructure(alice.user.id, 10).nodes.length, 0);
  assert.equal(db.loadIliasSnapshot(alice.user.id), null);
  assert.equal(db.loadIliasSource(alice.user.id), null);
  assert.equal(db.loadIliasContent(alice.user.id, 4590579, 'crs'), null);
  assert.equal(db.loadIliasPage(alice.user.id, 'dashboard'), null);
  assert.equal(admin.deleteAdminUser('legacy'), false);
});

test('overview breaks users down by mode, platform, source, and stored data', () => {
  const alice = user('st111111');
  const bob = user('st222222', 'oidc');
  auth.linkPlatform(alice.user.id, { platform: 'campus', account: 'st111111', status: 'connected', source: 'campus' });
  auth.linkPlatform(bob.user.id, { platform: 'siam', account: 'st222222', status: 'connected', source: 'oidc' });
  db.saveCampusSource(alice.user.id, 'browser', 'st111111');
  db.saveStructure(alice.user.id, 10, 1, [
    { id: 1, designation: 'R', elementType: 'ROOT', name: 'Informatik', parentId: null, completed: true, inProgress: false },
    { id: 2, designation: 'M', elementType: 'MODULE', name: 'Algorithmen', parentId: 1, completed: false, inProgress: true },
  ], [1], true);
  db.saveCourses(alice.user.id, 10, [{ id: 7, courseNumber: '123', title: 'Algorithmen', courseType: 'Vorlesung', courseTypeShort: 'V', semester: '2026 W', semesterId: 1, duration: 1, lecturers: ['Prof. Test'], roomName: 'V 1', startTime: '', endTime: '', detailUrl: '', registrationStatus: '', registrationAction: '', registrationUrl: '', elementIds: [1], elementNames: ['Algorithmen'] }], [1], true);
  db.saveExportedEvents(alice.user.id, [{ uid: 'a@test', summary: 'Termin', location: '', description: '', dtstart: '20261020T100000Z', dtend: '20261020T110000Z' }]);
  db.logPortalCall({ userId: alice.user.id, op: 'courses', studyId: 10, ok: false, httpStatus: 500, elapsedMs: 12 });

  const stats = admin.adminStats();
  assert.equal(stats.users, 2);
  assert.equal(stats.portalNodes, 2);
  assert.equal(stats.completedNodes, 1);
  assert.equal(stats.inProgressNodes, 1);
  assert.equal(stats.portalCourses, 1);
  assert.equal(stats.calendarEvents, 1);
  assert.equal(stats.portalCalls, 1);
  assert.deepEqual(stats.modes.map((item) => item.mode).sort(), ['campus', 'oidc']);
  assert.equal(stats.campus.find((item) => item.source === 'browser').count, 1);
  assert.equal(stats.platforms.find((item) => item.platform === 'campus').count, 1);
  assert.equal(stats.data.nodes, 2);
  assert.equal(typeof stats.config.admin.configured, 'boolean');
  assert.equal(typeof stats.config.campus.tokenConfigured, 'boolean');
});

test('user list supports activity, data, source, search, sorting, and pagination filters', () => {
  const alice = user('st111111');
  const bob = user('st222222');
  auth.issueSession(alice.user.id);
  db.saveCampusSource(bob.user.id, 'env', 'st222222');
  db.saveStructure(bob.user.id, 10, 1, [{ id: 1, designation: 'R', elementType: 'ROOT', name: 'Mathe', parentId: null, completed: false, inProgress: false }], [], false);
  db.saveExportedEvents(bob.user.id, [{ uid: 'b@test', summary: 'Klausur', location: 'H1', description: '', dtstart: '20261021T100000Z', dtend: '' }]);
  auth.revokeAllSessions(bob.user.id);

  assert.equal(admin.listUsers({ activity: 'active' }).total, 1);
  assert.equal(admin.listUsers({ activity: 'inactive' }).total, 1);
  assert.equal(admin.listUsers({ data: 'portal' }).total, 1);
  assert.equal(admin.listUsers({ data: 'events' }).total, 1);
  assert.equal(admin.listUsers({ data: 'courses' }).total, 0);
  assert.equal(admin.listUsers({ credential: 'env' }).total, 1);
  assert.equal(admin.listUsers({ credential: 'none' }).total, 1);
  assert.equal(admin.listUsers({ query: 'st222' }).total, 1);
  assert.equal(admin.listUsers({ sort: 'name' }).users[0].account, 'st111111');
  const page = admin.listUsers({ limit: 1, offset: 1 });
  assert.equal(page.total, 2);
  assert.equal(page.users.length, 1);
  assert.equal(page.limit, 1);
  assert.equal(page.offset, 1);
  const byData = admin.listUsers({ sort: 'data' });
  assert.equal(byData.users[0].id, bob.user.id);
  assert.equal(byData.users[0].data.nodes, 1);
  assert.equal(byData.users[0].data.events, 1);
  assert.ok(byData.users[0].platforms.length === 0);
});

test('detail carries per-study summaries, calendar counts, and the user audit trail', () => {
  const alice = user('st111111');
  db.saveStudiesSnapshot(alice.user.id, [
    { studyId: 10, name: 'Informatik', intendedDegree: 'Bachelor of Science', versionIdentifier: 'v1', identifier: 'I-1', lastAccessed: true, elementId: 1 },
    { studyId: 20, name: 'Mathe', intendedDegree: 'Bachelor of Science', lastAccessed: false, elementId: 2 },
  ]);
  db.saveStructure(alice.user.id, 10, 1, [
    { id: 1, designation: 'R', elementType: 'ROOT', name: 'Informatik', parentId: null, completed: false, inProgress: false },
    { id: 2, designation: 'M', elementType: 'MODULE', name: 'Algorithmen', parentId: 1, completed: true, inProgress: false },
  ], [1], true);
  db.saveCourses(alice.user.id, 10, [{ id: 1, courseNumber: '1', title: 'Algorithmen', courseType: 'V', courseTypeShort: 'V', semester: '2026 W', semesterId: 1, duration: 1, lecturers: ['A'], roomName: '', startTime: '', endTime: '', detailUrl: '', registrationStatus: '', registrationAction: '', registrationUrl: '', elementIds: [2], elementNames: ['Algorithmen'] }], [2], true);
  db.saveExportedEvents(alice.user.id, [{ uid: 'a@test', summary: 'Termin', location: '', description: '', dtstart: '20261020T100000Z', dtend: '' }]);
  admin.updateAdminUser(alice.user.id, { name: 'Alice' });

  const detail = admin.adminUserDetail(alice.user.id);
  assert.equal(detail.counts.studies, 1);
  assert.equal(detail.counts.completedNodes, 1);
  assert.equal(detail.counts.events, 1);
  assert.equal(detail.studies.length, 2);
  assert.equal(detail.studies[0].studyId, 10);
  assert.equal(detail.studies[0].name, 'Informatik');
  assert.equal(detail.studies[0].nodeCount, 2);
  assert.equal(detail.studies[0].courseCount, 1);
  assert.equal(detail.studies[0].nodesComplete, true);
  assert.equal(detail.studies[1].nodeCount, 0);
  assert.equal(detail.audit[0].action, 'user.update');
  assert.equal(detail.audit[0].detail.fields.includes('name'), true);
});

test('course, node, event, and call explorers paginate, filter, and search', () => {
  const alice = user('st111111');
  db.saveStructure(alice.user.id, 10, 1, [
    { id: 1, designation: 'R', elementType: 'ROOT', name: 'Informatik', parentId: null, completed: false, inProgress: false },
    { id: 2, designation: 'M1', elementType: 'MODULE', name: 'Algorithmen', parentId: 1, completed: true, inProgress: false },
    { id: 3, designation: 'M2', elementType: 'MODULE', name: 'Datenbanken', parentId: 1, completed: false, inProgress: true },
  ], [], false);
  const course = (id, title) => ({ id, courseNumber: String(id), title, courseType: 'V', courseTypeShort: 'V', semester: '2026 W', semesterId: 1, duration: 1, lecturers: ['Prof. Test'], roomName: 'V 1', startTime: '', endTime: '', detailUrl: '', registrationStatus: 'angemeldet', registrationAction: '', registrationUrl: '', elementIds: [2], elementNames: ['Algorithmen'] });
  db.saveCourses(alice.user.id, 10, [course(1, 'Algorithmen'), course(2, 'Datenbanken')], [2], true);
  db.saveExportedEvents(alice.user.id, [
    { uid: 'a@test', summary: 'Klausur Algorithmen', location: 'H1', description: '', dtstart: '20261020T100000Z', dtend: '' },
    { uid: 'b@test', summary: 'Vorlesung', location: 'V 1', description: '', dtstart: '20261021T100000Z', dtend: '' },
  ]);
  db.logPortalCall({ userId: alice.user.id, op: 'structure', studyId: 10, ok: true, elapsedMs: 2 });
  db.logPortalCall({ userId: alice.user.id, op: 'courses', studyId: 10, ok: false, httpStatus: 500, message: 'kaputt', elapsedMs: 9 });

  const nodes = admin.adminUserNodes(alice.user.id, { studyId: 10, state: 'in_progress' });
  assert.equal(nodes.total, 1);
  assert.equal(nodes.nodes[0].name, 'Datenbanken');
  assert.equal(admin.adminUserNodes(alice.user.id, { query: 'Algorithmen' }).total, 1);
  assert.equal(admin.adminUserNodes(alice.user.id, { state: 'completed' }).total, 1);

  const courses = admin.adminUserCourses(alice.user.id, { studyId: 10, query: 'Daten', limit: 1 });
  assert.equal(courses.total, 1);
  assert.equal(courses.courses[0].title, 'Datenbanken');
  assert.equal(courses.courses[0].elements[0].elementId, 2);
  assert.equal(admin.adminUserCourses(alice.user.id, { limit: 1, offset: 1 }).total, 2);

  const events = admin.adminUserEvents(alice.user.id, { query: 'Klausur' });
  assert.equal(events.total, 1);
  assert.equal(events.events[0].uid, 'a@test');
  assert.equal(admin.adminUserEvents(alice.user.id, { limit: 1 }).events.length, 1);

  const calls = admin.adminUserCalls(alice.user.id, { failed: '1' });
  assert.equal(calls.total, 1);
  assert.equal(calls.calls[0].op, 'courses');
  assert.equal(admin.adminUserCalls(alice.user.id, { query: 'structure' }).total, 1);
  assert.equal(admin.adminUserCalls(alice.user.id, {}).total, 2);
});

test('profile edits validate the account and mode and write an audit entry', () => {
  const alice = user('st111111');
  const bob = user('st222222');
  const updated = admin.updateAdminUser(alice.user.id, { account: 'st999999', mode: 'local', name: 'Alice' });
  assert.equal(updated.account, 'st999999');
  assert.equal(updated.mode, 'local');
  assert.throws(() => admin.updateAdminUser(alice.user.id, { account: 'st222222' }), /account_taken/);
  assert.throws(() => admin.updateAdminUser(alice.user.id, { account: '   ' }), /account_missing/);
  assert.throws(() => admin.updateAdminUser(alice.user.id, { mode: 'root' }), /bad_mode/);
  assert.equal(admin.updateAdminUser(bob.user.id, { name: 'Bob' }).name, 'Bob');
  const audit = admin.listAdminAudit({ action: 'user.update' });
  assert.equal(audit.total, 2);
  assert.equal(audit.entries[0].account, 'st222222');
  assert.equal(audit.entries[0].detail.fields.includes('name'), true);
  const filtered = admin.listAdminAudit({ userId: alice.user.id });
  assert.equal(filtered.total, 1);
});

test('platform touch and clearing calendar or calls are audited and idempotent', () => {
  const alice = user('st111111');
  auth.linkPlatform(alice.user.id, { platform: 'ilias', account: 'st111111' });
  db.saveExportedEvents(alice.user.id, [{ uid: 'a@test', summary: 'Termin', location: '', description: '', dtstart: '20261020T100000Z', dtend: '' }]);
  db.logPortalCall({ userId: alice.user.id, op: 'structure', ok: true });
  const touched = admin.touchAdminPlatform(alice.user.id, 'ilias');
  assert.ok(touched.user.platforms.find((item) => item.id === 'ilias').lastSyncAt);
  assert.equal(admin.clearAdminEvents(alice.user.id).counts.events, 0);
  assert.equal(admin.clearAdminCalls(alice.user.id).counts.calls, 0);
  const actions = admin.listAdminAudit({}).entries.map((entry) => entry.action);
  assert.deepEqual(actions, ['calls.clear', 'calendar.clear', 'platform.touch']);
});

test('accounts can be pre-provisioned without a session and are audited', () => {
  const created = admin.createAdminUser({ account: 'st777777', name: 'New User', email: 'new@example.test', mode: 'local' });
  assert.equal(created.account, 'st777777');
  assert.equal(created.name, 'New User');
  assert.equal(created.mode, 'local');
  assert.equal(created.lastLoginAt, null);
  assert.deepEqual(created.platforms, []);
  assert.equal(auth.authenticateToken('not-a-token'), null);
  assert.throws(() => admin.createAdminUser({ account: 'st777777' }), /account_taken/);
  assert.throws(() => admin.createAdminUser({ account: '   ' }), /account_missing/);
  assert.throws(() => admin.createAdminUser({ account: 'st888888', mode: 'root' }), /bad_mode/);
  const audit = admin.listAdminAudit({ action: 'user.create' });
  assert.equal(audit.total, 1);
  assert.equal(audit.entries[0].userId, created.id);
  assert.equal(audit.entries[0].account, 'st777777');
  assert.equal(audit.entries[0].detail.mode, 'local');
});

test('the audit log filters by query and exposes its facets', () => {
  const alice = user('st111111');
  admin.updateAdminUser(alice.user.id, { name: 'Alice' });
  admin.revokeAdminSessions(alice.user.id);
  const all = admin.listAdminAudit({});
  assert.equal(all.total, 2);
  assert.equal(all.actions.length, 2);
  assert.equal(all.actions.find((item) => item.action === 'user.update').count, 1);
  const search = admin.listAdminAudit({ query: 'session' });
  assert.equal(search.total, 1);
  assert.equal(search.entries[0].action, 'session.revoke_all');
  const paged = admin.listAdminAudit({ limit: 1, offset: 1 });
  assert.equal(paged.total, 2);
  assert.equal(paged.entries.length, 1);
  assert.equal(admin.listAdminAudit({ action: 'user.update' }).entries[0].userId, alice.user.id);
});

test('system status reports runtime, configuration, database counts, and sync jobs', () => {
  const alice = user('st111111');
  const system = admin.adminSystem();
  assert.equal(system.runtime.node, process.version);
  assert.equal(system.runtime.pid, process.pid);
  assert.equal(typeof system.runtime.memory.rss, 'number');
  assert.equal(typeof system.config.admin.configured, 'boolean');
  assert.equal(system.database.counts.users, 1);
  assert.equal(system.database.counts.sessions >= 1, true);
  assert.equal(system.database.path.endsWith(':memory:') || system.database.path.includes('campus'), true);
  assert.equal(Array.isArray(system.syncJobs), true);
  assert.equal(system.stats.users, 1);
  assert.equal(admin.cancelAdminSyncJob(99999), null);
  assert.equal(alice.user.account, 'st111111');
});

test('starting a sync requires a real study and a live portal credential', async () => {
  const alice = user('st111111');
  assert.equal(await admin.startAdminSyncJob('usr_missing', { studyId: 10 }), null);
  await assert.rejects(() => admin.startAdminSyncJob(alice.user.id, { studyId: 0 }), /bad_study_id/);
  await assert.rejects(() => admin.startAdminSyncJob(alice.user.id, { studyId: 10 }), /campus_credentials_missing/);
  assert.equal(admin.listAdminAudit({ action: 'sync.start' }).total, 0);
});
