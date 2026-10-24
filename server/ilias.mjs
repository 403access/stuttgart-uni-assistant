/**
 * ILIAS at Universität Stuttgart: the standard login form over plain HTTPS and
 * the dashboard blocks a signed-in browser would render.
 *
 * The portal has no public JSON API for students. The login is a normal form
 * post (`ilstartupgui` → `doStandardAuthentication`) that answers with a
 * redirect and the `PHPSESSID` cookie. After that, the app's hidden WebView
 * reads the authenticated HTML pages and posts them back; this module parses
 * and caches them. This module also owns the terminal probe, so the probe, the
 * app, and the tests exercise the same parsers.
 *
 * Credentials are never logged or stored. The login hands the cookie to the
 * authenticated app (which does the page reads) plus the parsed dashboard.
 *
 * The implementation lives in `./ilias/`; this file keeps the public surface
 * stable for the routes, the admin console, and the tests.
 */

export {
  ILIAS_BASE,
  ILIAS_CACHE_TTL_MS,
  ILIAS_CLIENT_ID,
  ILIAS_DASHBOARD_URL,
  ILIAS_LOGIN_URL,
  ILIAS_PAGE_MAX_BYTES,
  ILIAS_USER_AGENT,
  iliasFileUrl,
  iliasRepositoryUrl,
} from './ilias/constants.mjs';
export {
  cachedIliasContent,
  cachedIliasDashboard,
  cachedIliasMembers,
  cachedIliasProfile,
  ingestIliasPage,
} from './ilias/cache.mjs';
export { iliasMembersUrlFromHtml, parseIliasContent } from './ilias/content.mjs';
export { CookieJar, normalizeIliasCookie, setCookieValues } from './ilias/cookies.mjs';
export { parseIliasDashboard, parseIliasIdentity } from './ilias/dashboard.mjs';
export { iliasError } from './ilias/errors.mjs';
export { iliasLoginError, loginIlias, parseIliasLoginForm } from './ilias/login.mjs';
export { looksLikeIliasLogin, textOf } from './ilias/markup.mjs';
export { parseIliasMembers } from './ilias/members.mjs';
export { parseIliasProfile } from './ilias/profile.mjs';
export {
  fetchIliasContent,
  fetchIliasDashboard,
  fetchIliasFile,
  fetchIliasMembers,
  fetchIliasProfile,
} from './ilias/reads.mjs';
export {
  clearUserIliasSession,
  connectIlias,
  disconnectIlias,
  fetchIliasImage,
  getUserIliasSession,
  iliasCookieFor,
  listUserIliasSessions,
  publicIliasStatus,
  readIliasContent,
  readIliasDashboard,
  readIliasFile,
  readIliasMembers,
  readIliasProfile,
  resolveIliasSession,
  setUserIliasSession,
} from './ilias/session.mjs';
export { iliasLoginName, mask, resolveUrl } from './ilias/util.mjs';
