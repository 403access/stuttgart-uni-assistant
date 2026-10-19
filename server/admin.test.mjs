import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';
process.env.DASHBOARD_TOKEN = 'test-admin-token';

const db = await import('./db.mjs');
const auth = await import('./auth.mjs');
const admin = await import('./admin.mjs');

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
});

test('deleting a user removes the account, sessions, links, and portal rows', () => {
  const alice = user('st111111');
  auth.linkPlatform(alice.user.id, { platform: 'campus', account: 'st111111', status: 'connected' });
  db.saveCampusSource(alice.user.id, 'browser', 'st111111');
  db.saveStructure(alice.user.id, 10, 1, [{ id: 1, designation: 'R', elementType: 'ROOT', name: 'Informatik', parentId: null, completed: false, inProgress: false }], [1], false);
  db.logPortalCall({ userId: alice.user.id, op: 'structure' });
  assert.equal(admin.deleteAdminUser(alice.user.id), true);
  assert.equal(auth.getUser(alice.user.id), null);
  assert.equal(admin.adminUserDetail(alice.user.id), null);
  assert.equal(auth.authenticateToken(alice.token), null);
  assert.equal(db.loadStructure(alice.user.id, 10).nodes.length, 0);
  assert.equal(admin.deleteAdminUser('legacy'), false);
});
