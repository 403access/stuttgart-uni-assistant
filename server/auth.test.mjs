import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';

const db = await import('./db.mjs');
const auth = await import('./auth.mjs');
const campus = await import('./campus.mjs');

beforeEach(() => {
  db.resetDbForTests();
  delete process.env.AUTH_SESSION_HOURS;
  campus.clearUserCampusCredential('alice');
  campus.clearUserCampusCredential('bob');
  campus.clearUserCampusCredential('envuser');
});

test('upsertUser keeps one user per account id, case-insensitively', () => {
  const first = auth.upsertUser({ account: 'st123456', name: 'Lena Hartmann', mode: 'campus' });
  const second = auth.upsertUser({ account: 'ST123456', email: 'lena@demo.uni-stuttgart.test', mode: 'oidc' });
  assert.equal(first.id, second.id);
  assert.equal(second.account, 'st123456');
  assert.equal(second.name, 'Lena Hartmann');
  assert.equal(second.email, 'lena@demo.uni-stuttgart.test');
  assert.equal(second.mode, 'oidc');
  assert.equal(auth.upsertUser({ account: 'st999999' }).account, 'st999999');
  assert.throws(() => auth.upsertUser({ account: '   ' }), /account_missing/);
});

test('platform links are per user, ordered, and removable', () => {
  const user = auth.upsertUser({ account: 'st123456', mode: 'campus' });
  auth.linkPlatform(user.id, { platform: 'ilias', account: 'st123456', status: 'linked', source: 'campus-sso' });
  auth.linkPlatform(user.id, { platform: 'campus', account: 'st123456', status: 'connected', source: 'campus' });
  const loaded = auth.getUser(user.id);
  assert.deepEqual(
    loaded.platforms.map((item) => item.id),
    ['campus', 'ilias'],
  );
  assert.equal(loaded.platforms[0].status, 'connected');

  auth.touchPlatform(user.id, 'ilias', '2026-10-19T10:00:00.000Z');
  const synced = auth.getUser(user.id).platforms.find((item) => item.id === 'ilias');
  assert.equal(synced.status, 'connected');
  assert.equal(synced.lastSyncAt, '2026-10-19T10:00:00.000Z');

  auth.unlinkPlatform(user.id, 'ilias');
  assert.equal(auth.getUser(user.id).platforms.some((item) => item.id === 'ilias'), false);
  assert.throws(() => auth.linkPlatform(user.id, { platform: 'dropbox' }), /bad_platform/);
});

test('a session token authenticates, then stops after revoke', () => {
  const user = auth.upsertUser({ account: 'st123456', mode: 'campus' });
  const { token, expiresAt } = auth.issueSession(user.id);
  assert.ok(expiresAt > new Date().toISOString());
  const auth1 = auth.authenticateToken(token);
  assert.equal(auth1.user.id, user.id);
  assert.equal(auth.revokeSession(token), true);
  assert.equal(auth.authenticateToken(token), null);
  assert.equal(auth.revokeSession('not-a-session'), false);
});

test('an expired session is rejected and pruned', () => {
  const user = auth.upsertUser({ account: 'st123456', mode: 'local' });
  const { token } = auth.issueSession(user.id);
  db.getDb()
    .prepare('UPDATE user_sessions SET expires_at = ? WHERE token_hash = ?')
    .run('2000-01-01T00:00:00.000Z', auth.hashToken(token));
  assert.equal(auth.authenticateToken(token), null);
  // A new issue prunes the expired row.
  auth.issueSession(user.id);
  const rows = db.getDb().prepare('SELECT COUNT(*) AS n FROM user_sessions').get();
  assert.equal(rows.n, 1);
});

test('only a hash of the token reaches the database', () => {
  const user = auth.upsertUser({ account: 'st123456', mode: 'local' });
  const { token } = auth.issueSession(user.id);
  const row = db.getDb().prepare('SELECT token_hash FROM user_sessions LIMIT 1').get();
  assert.notEqual(row.token_hash, token);
  assert.equal(row.token_hash, auth.hashToken(token));
  assert.equal(row.token_hash.length, 64);
});

test('createUserSession links the platforms a campus sign-in proves', () => {
  const created = auth.createUserSession({
    account: 'st123456',
    name: 'Lena Hartmann',
    mode: 'campus',
    platforms: auth.campusPlatformLinks({ account: 'st123456' }),
  });
  assert.equal(created.user.mode, 'campus');
  assert.deepEqual(
    created.user.platforms.map((item) => item.id),
    ['campus', 'ilias', 'sdg', 'siam'],
  );
  assert.equal(created.user.platforms[0].status, 'connected');
  assert.equal(created.user.platforms[1].status, 'linked');
  const resolved = auth.authenticateToken(created.token);
  assert.equal(resolved.user.account, 'st123456');
});

test('an OIDC sign-in makes SIAM connected and the C@MPUS family linked', () => {
  const created = auth.createUserSession({
    account: 'st123456@stud.uni-stuttgart.de',
    mode: 'oidc',
    platforms: auth.oidcPlatformLinks({ account: 'st123456@stud.uni-stuttgart.de', mailAccount: 'st123456' }),
  });
  const byId = Object.fromEntries(created.user.platforms.map((item) => [item.id, item]));
  assert.equal(byId.siam.status, 'connected');
  assert.equal(byId.campus.status, 'linked');
  assert.equal(byId.mail.status, 'connected');
});

test('readBearer accepts only a well-formed bearer header', () => {
  assert.equal(auth.readBearer({ headers: { authorization: `Bearer ${'a'.repeat(32)}` } }), 'a'.repeat(32));
  assert.equal(auth.readBearer({ headers: { authorization: 'Basic abc' } }), null);
  assert.equal(auth.readBearer({ headers: {} }), null);
});

test('a QR pairing is authenticated by the phone and redeemed once by the browser', () => {
  const user = auth.upsertUser({ account: 'st123456', mode: 'campus' });
  const link = auth.createDeviceLink({ name: 'Chrome · macOS', userAgent: 'Mozilla/5.0' });
  assert.equal(link.state, 'pending');
  assert.equal(link.pairingUrl, `universityassistant://device-link?token=${link.token}`);
  assert.equal(auth.pollDeviceLink(link.token).status, 'pending');

  const approved = auth.approveDeviceLink(user.id, link.token);
  assert.equal(approved.state, 'approved');
  assert.equal(approved.userId, user.id);
  assert.equal(approved.name, 'Chrome · macOS');

  const redeemed = auth.pollDeviceLink(link.token);
  assert.equal(redeemed.status, 'approved');
  assert.equal(redeemed.session.user.id, user.id);
  assert.equal(auth.authenticateToken(redeemed.session.token).user.id, user.id);

  const devices = auth.listUserDevices(user.id);
  assert.equal(devices.length, 1);
  assert.equal(devices[0].state, 'active');
  assert.equal(devices[0].sessionId !== null, true);

  assert.throws(() => auth.pollDeviceLink(link.token), /device_link_consumed/);
  assert.equal(auth.revokeDeviceLink(user.id, link.id), true);
  assert.equal(auth.authenticateToken(redeemed.session.token), null);
  assert.throws(() => auth.approveDeviceLink(user.id, link.token), /device_link_revoked/);
  assert.throws(() => auth.pollDeviceLink('not-a-device-token'), /device_link_missing/);
  assert.throws(() => auth.pollDeviceLink(`${'x'.repeat(32)}`), /device_link_unknown/);
});

test('an expired QR pairing cannot be approved', () => {
  const user = auth.upsertUser({ account: 'st123456', mode: 'local' });
  const link = auth.createDeviceLink({ name: 'Firefox' });
  db.getDb().prepare('UPDATE device_links SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', link.id);
  assert.throws(() => auth.approveDeviceLink(user.id, link.token), /device_link_expired/);
  assert.throws(() => auth.pollDeviceLink(link.token), /device_link_expired/);
});

test('cross-device preferences merge partial updates', () => {
  const user = auth.upsertUser({ account: 'st123456', mode: 'campus' });
  assert.deepEqual(auth.getUserPreferences(user.id), {
    onboardingCompletedAt: null,
    theme: null,
    design: null,
    locale: null,
    updatedAt: null,
  });

  const saved = auth.saveUserPreferences(user.id, {
    onboardingCompletedAt: '2026-10-20T08:00:00.000Z',
    theme: 'dark',
    design: 'playful',
    locale: 'en',
  });
  assert.equal(saved.onboardingCompletedAt, '2026-10-20T08:00:00.000Z');
  assert.equal(saved.theme, 'dark');

  const partial = auth.saveUserPreferences(user.id, { theme: 'light', locale: 'de' });
  assert.equal(partial.theme, 'light');
  assert.equal(partial.locale, 'de');
  assert.equal(partial.design, 'playful');
  assert.equal(partial.onboardingCompletedAt, '2026-10-20T08:00:00.000Z');
  assert.equal(auth.getUserPreferences(user.id).theme, 'light');
});

test('portal rows are isolated per user', () => {
  const aliceNode = { id: 1, designation: 'A', elementType: 'ROOT', name: 'Alice tree', parentId: null, completed: false, inProgress: false };
  const bobNode = { id: 1, designation: 'B', elementType: 'ROOT', name: 'Bob tree', parentId: null, completed: false, inProgress: false };
  db.saveStructure('alice', 10, 1, [aliceNode], [1], false);
  db.saveStructure('bob', 10, 1, [bobNode], [1], false);
  assert.equal(db.loadStructure('alice', 10).nodes[0].name, 'Alice tree');
  assert.equal(db.loadStructure('bob', 10).nodes[0].name, 'Bob tree');
  assert.equal(db.loadStructure('carol', 10).nodes.length, 0);

  db.saveStudiesSnapshot('alice', [{ studyId: 1, name: 'Alice study' }]);
  assert.equal(db.loadStudiesSnapshot('alice').studies[0].name, 'Alice study');
  assert.equal(db.loadStudiesSnapshot('bob'), null);

  db.logPortalCall({ userId: 'alice', op: 'structure', studyId: 10, elementId: 1, ok: true });
  db.logPortalCall({ userId: 'bob', op: 'structure', studyId: 10, elementId: 1, ok: false });
  assert.equal(db.readPortalCalls('alice', 10).length, 1);
  assert.equal(db.readPortalCalls('alice', 10)[0].ok, true);
  assert.equal(db.readPortalCalls('bob', 10)[0].ok, false);
  assert.equal(db.readPortalCalls('carol', 10).length, 0);
});

test('one campus credential per user, and a missing one is a clear 409', () => {
  campus.setUserCampusCredential('alice', { bearer: 'alice-bearer', cookie: 'alice-cookie', source: 'browser' });
  campus.setUserCampusCredential('bob', { bearer: 'bob-bearer', cookie: 'bob-cookie', source: 'browser' });
  assert.equal(campus.resolveCampusCredential('alice').bearer, 'alice-bearer');
  assert.equal(campus.resolveCampusCredential('bob').bearer, 'bob-bearer');
  assert.throws(() => campus.resolveCampusCredential('carol'), (error) => error.message === 'campus_credentials_missing' && error.status === 409);
  campus.clearUserCampusCredential('alice');
  assert.throws(() => campus.resolveCampusCredential('alice'), /campus_credentials_missing/);
});

test('a harvest ticket is one-shot and carries its own credential', () => {
  const ticket = campus.issueCredentialTicket({ bearer: 'ticket-bearer', cookie: 'ticket-cookie', source: 'browser' });
  assert.equal(typeof ticket, 'string');
  const taken = campus.takeCredentialTicket(ticket);
  assert.equal(taken.bearer, 'ticket-bearer');
  assert.equal(taken.cookie, 'ticket-cookie');
  assert.throws(() => campus.takeCredentialTicket(ticket), /ticket_invalid/);
  assert.throws(() => campus.takeCredentialTicket(''), /ticket_missing/);
});

test('a ticket read stores the profile under that user and nowhere else', async () => {
  const structure = {
    resource: [
      {
        content: {
          curriculumStructureElementDto: {
            id: 278343,
            designation: 'st123456',
            elementType: 'ROOT',
            name: { value: 'Informatik' },
          },
        },
      },
    ],
  };
  const chooser = {
    resource: [
      {
        content: {
          CmStudyInfoDto: {
            studyId: 9,
            name: { value: 'Informatik B.Sc.' },
            myStudyLink: { href: 'https://x/myStudies/9/myCurriculumElements/278343' },
          },
        },
      },
    ],
  };
  const fetchImpl = async (url, options = {}) => {
    assert.match(options.headers.Authorization, /^Bearer ticket-bearer/);
    if (String(url).includes('/chooser')) return { ok: true, status: 200, json: async () => chooser };
    return { ok: true, status: 200, json: async () => structure };
  };
  const ticket = campus.issueCredentialTicket({ bearer: 'ticket-bearer', cookie: 'ticket-cookie', source: 'browser' });
  const credential = campus.resolveLoginCredential({ ticket });
  const profile = await campus.readCampusLogin(credential, fetchImpl, null, false);
  assert.equal(profile.account, 'st123456');
  assert.equal(profile.studies.length, 1);
  assert.equal(profile.credential.bearer, 'ticket-bearer');

  const alice = auth.createUserSession({ account: profile.account, name: profile.name, mode: 'campus' });
  campus.setUserCampusCredential(alice.user.id, profile.credential);
  campus.storeCampusLogin(alice.user.id, profile);
  assert.equal(db.loadStructure(alice.user.id, profile.studyId).nodes.length, 1);
  assert.equal(db.loadStudiesSnapshot(alice.user.id).studies[0].studyId, 9);
  assert.equal(db.loadStructure('someone-else', profile.studyId).nodes.length, 0);
});

test('the operator .env credential is bound to the account that signed in with it', () => {
  process.env.CAMPUS_BEARER_TOKEN = 'env-bearer';
  process.env.CAMPUS_SESSION_COOKIE = 'env-cookie';
  db.saveCampusSource('envuser', 'env', 'st123456');
  const credential = campus.resolveCampusCredential('envuser');
  assert.equal(credential.bearer, 'env-bearer');
  assert.equal(credential.cookie, 'env-cookie');
  assert.throws(() => campus.resolveCampusCredential('otheruser'), /campus_credentials_missing/);
  delete process.env.CAMPUS_BEARER_TOKEN;
  delete process.env.CAMPUS_SESSION_COOKIE;
});
