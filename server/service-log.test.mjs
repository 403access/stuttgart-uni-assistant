import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';

const db = await import('./db.mjs');
const admin = await import('./admin/index.mjs');
const { logService } = await import('./service-log.mjs');

beforeEach(() => {
  db.resetDbForTests();
});

function quiet(t) {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});
}

test('service logs persist, filter, facet, and clear', (t) => {
  quiet(t);
  logService('campus', 'info', 'structure ok study=10', { userId: 'usr_test1234', studyId: 10 });
  logService('campus', 'warn', 'structure failed upstream 401');
  logService('ilias', 'info', 'dashboard ok memberships=4', { userId: 'usr_test1234' });
  logService('mail', 'error', 'send failed mail_auth_failed');

  const all = db.readServiceLogs({});
  assert.equal(all.total, 4);
  assert.equal(all.entries[0].service, 'mail');
  assert.equal(all.entries[0].level, 'error');
  assert.equal(all.entries.at(-1).service, 'campus');
  assert.equal(all.entries.at(-1).userId, 'usr_test1234');
  assert.deepEqual(all.entries.at(-1).detail, { studyId: 10 });
  assert.deepEqual(all.services.map((item) => item.service), ['campus', 'ilias', 'mail']);
  assert.equal(all.levels.find((item) => item.level === 'warn').count, 1);

  const campus = db.readServiceLogs({ service: 'campus' });
  assert.equal(campus.total, 2);
  assert.equal(db.readServiceLogs({ service: 'campus', level: 'warn' }).total, 1);
  assert.equal(db.readServiceLogs({ query: 'memberships' }).total, 1);
  assert.equal(db.readServiceLogs({ query: 'usr_test1234' }).total, 2);
  assert.equal(db.readServiceLogs({ limit: 1 }).entries.length, 1);

  assert.equal(db.clearServiceLogs({ level: 'error' }), 1);
  assert.equal(db.readServiceLogs({}).total, 3);
  assert.equal(db.clearServiceLogs(), 3);
  assert.equal(db.readServiceLogs({}).total, 0);
});

test('the admin data layer lists and audits a clear', (t) => {
  quiet(t);
  logService('sync', 'warn', '#1 structure element=2 failed campus_failed', { userId: 'usr_test1234' });
  logService('sync', 'info', '#1 done fetched=3 nodes=2 failed=0');

  const listed = admin.listAdminLogs({ service: 'sync', level: 'warn' });
  assert.equal(listed.total, 1);
  assert.equal(listed.entries[0].service, 'sync');
  assert.equal(listed.entries[0].userId, 'usr_test1234');

  const cleared = admin.clearAdminLogs({ service: 'sync' });
  assert.equal(cleared.removed, 2);
  assert.equal(admin.listAdminLogs({}).total, 0);
  const audit = admin.listAdminAudit({ action: 'logs.clear' });
  assert.equal(audit.total, 1);
  assert.equal(audit.entries[0].detail.removed, 2);
});
