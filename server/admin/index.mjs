/**
 * Public API of the admin data layer. Route modules and tests import from here;
 * the implementation is split by concern in this directory.
 */

export { listAdminAudit, recordAdminAudit } from './audit.mjs';
export { adminDeviceStats, listAdminDevices, revokeAdminDevice } from './devices.mjs';
export {
  adminIlias,
  adminUserIlias,
  disconnectAdminIlias,
  readAdminUserIliasContent,
  readAdminUserIliasFile,
} from './ilias.mjs';
export { createAdminNews, deleteAdminNews, getAdminNews, listAdminNews, updateAdminNews } from './news.mjs';
export { adminUserCalls, adminUserCourses, adminUserEvents, adminUserNodes, adminUserStudies } from './explorers.mjs';
export { clearAdminLogs, listAdminLogs } from './logs.mjs';
export {
  clearAdminCalls,
  clearAdminEvents,
  clearAdminPortalData,
  createAdminUser,
  deleteAdminUser,
  disconnectAdminCampus,
  linkAdminPlatform,
  revokeAdminSession,
  revokeAdminSessions,
  setAdminCampusSource,
  touchAdminPlatform,
  unlinkAdminPlatform,
  updateAdminUser,
} from './mutations.mjs';
export { adminStats } from './overview.mjs';
export {
  ADMIN_COOKIE,
  adminAuthorized,
  adminConfigured,
  adminCookie,
  adminToken,
  adminTokenMatches,
  clearAdminCookie,
  parseCookies,
} from './session.mjs';
export { cancelAdminSyncJob, startAdminSyncJob } from './sync.mjs';
export { adminSystem, disconnectAdminMail } from './system.mjs';
export { adminUserDetail, listUsers } from './users.mjs';
