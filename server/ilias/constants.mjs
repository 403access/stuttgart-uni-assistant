export const ILIAS_BASE = 'https://ilias3.uni-stuttgart.de';
export const ILIAS_LOGIN_URL = `${ILIAS_BASE}/ilias.php?baseClass=ilstartupgui&cmd=post&fallbackCmd=doStandardAuthentication`;
export const ILIAS_DASHBOARD_URL = `${ILIAS_BASE}/ilias.php?baseClass=ilDashboardGUI&cmd=jumpToSelectedItems`;
export const ILIAS_CLIENT_ID = 'Uni_Stuttgart';

/** Repository pages are reachable by object kind and ref id, e.g. `/go/crs/4590579`. */
export function iliasRepositoryUrl(kind, refId) {
  return `${ILIAS_BASE}/go/${kind}/${refId}`;
}

/** The file download command behind a course material row. */
export function iliasFileUrl(refId) {
  return `${ILIAS_BASE}/ilias.php?baseClass=ilrepositorygui&cmdClass=ilObjFileGUI&cmd=sendfile&ref_id=${refId}`;
}
export const ILIAS_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';

export const DASHBOARD_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
  'User-Agent': ILIAS_USER_AGENT,
  Referer: ILIAS_DASHBOARD_URL,
};

export const ILIAS_CACHE_TTL_MS = 15 * 60 * 1000;
export const ILIAS_PAGE_MAX_BYTES = 4_000_000;
