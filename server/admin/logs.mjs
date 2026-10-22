/** Persisted service diagnostics for the admin logs view. */

import { clearServiceLogs, readServiceLogs } from '../db.mjs';
import { recordAdminAudit } from './audit.mjs';
import { pageOffset, pageSize } from './util.mjs';

export function listAdminLogs({ query = '', service = '', level = '', limit = 100, offset = 0 } = {}) {
  return readServiceLogs({
    query,
    service,
    level,
    limit: pageSize(limit, 100),
    offset: pageOffset(offset),
  });
}

/** Clearing is audited; the deleted lines themselves are gone. */
export function clearAdminLogs({ service = '', level = '' } = {}) {
  const removed = clearServiceLogs({ service, level });
  recordAdminAudit({
    action: 'logs.clear',
    detail: { service: service || null, level: level || null, removed },
  });
  return { removed };
}
