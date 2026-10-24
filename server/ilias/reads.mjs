import {
  DASHBOARD_HEADERS,
  ILIAS_BASE,
  ILIAS_DASHBOARD_URL,
  iliasFileUrl,
  iliasRepositoryUrl,
} from './constants.mjs';
import { iliasMembersUrlFromHtml, parseIliasContent } from './content.mjs';
import { normalizeIliasCookie } from './cookies.mjs';
import { parseIliasDashboard } from './dashboard.mjs';
import { iliasError } from './errors.mjs';
import { decodeEntities, looksLikeIliasLogin } from './markup.mjs';
import { parseIliasMembers } from './members.mjs';
import { parseIliasProfile } from './profile.mjs';
import { isIliasUrl, resolveUrl } from './util.mjs';

/* --------------------------------------------------------------- reads -- */

/** Read and parse the dashboard for an existing `PHPSESSID`. */
export async function fetchIliasDashboard({ cookie, fetchImpl = fetch, dashboardUrl = ILIAS_DASHBOARD_URL }) {
  const value = normalizeIliasCookie(cookie);
  if (!value) throw iliasError(409, 'ilias_credentials_missing');
  let response;
  try {
    response = await fetchImpl(dashboardUrl, { redirect: 'manual', headers: { ...DASHBOARD_HEADERS, Cookie: value } });
  } catch (error) {
    throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') ?? '';
    if (looksLikeIliasLogin(location)) throw iliasError(401, 'ilias_session_expired');
    return fetchIliasDashboard({ cookie: value, fetchImpl, dashboardUrl: resolveUrl(dashboardUrl, location) });
  }
  if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
  const html = await response.text();
  if (looksLikeIliasLogin(html)) throw iliasError(401, 'ilias_session_expired');
  if (!/block_|il-mainbar|il-page-content-header/i.test(html)) throw iliasError(502, 'ilias_dashboard_missing');
  return parseIliasDashboard(html);
}

/** Fetch an authenticated HTML page, following redirects and detecting a lost session. */
async function fetchIliasHtml({ cookie, url, fetchImpl = fetch, referer = ILIAS_DASHBOARD_URL, maxHops = 5 }) {
  const value = normalizeIliasCookie(cookie);
  if (!value) throw iliasError(409, 'ilias_credentials_missing');
  let current = url;
  for (let hop = 0; hop <= maxHops; hop += 1) {
    let response;
    try {
      response = await fetchImpl(current, {
        redirect: 'manual',
        headers: { ...DASHBOARD_HEADERS, Referer: referer, Cookie: value },
      });
    } catch (error) {
      throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      if (!location) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
      const next = resolveUrl(current, location);
      if (looksLikeIliasLogin(next)) throw iliasError(401, 'ilias_session_expired');
      current = next;
      continue;
    }
    if (response.status === 401 || response.status === 403) throw iliasError(401, 'ilias_session_expired');
    if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
    const html = await response.text();
    if (looksLikeIliasLogin(html)) throw iliasError(401, 'ilias_session_expired');
    return { html, url: current };
  }
  throw iliasError(502, 'ilias_redirect_loop');
}

/** Read a course, group, folder, or category page for an existing `PHPSESSID`. */
export async function fetchIliasContent({ cookie, refId, kind = 'crs', fetchImpl = fetch, contentUrl }) {
  const id = Number(refId);
  if (!Number.isInteger(id) || id <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const safeKind = /^[a-z]{2,8}$/i.test(String(kind)) ? String(kind).toLowerCase() : 'crs';
  const url = contentUrl || iliasRepositoryUrl(safeKind, id);
  const { html } = await fetchIliasHtml({ cookie, url, fetchImpl, referer: ILIAS_DASHBOARD_URL });
  if (!/il-page-content-header|ilContentContainer|\bilHeader\b/i.test(html)) throw iliasError(502, 'ilias_content_missing');
  return parseIliasContent(html, { refId: id, kind: safeKind });
}

/**
 * Read the members tab for a course or group. The members GUI needs the
 * object-specific `cmdNode`, which only the object page carries, so without a
 * known `membersUrl` the content page is read once to discover it.
 */
export async function fetchIliasMembers({ cookie, refId, kind = 'crs', fetchImpl = fetch, membersUrl }) {
  const id = Number(refId);
  if (!Number.isInteger(id) || id <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const safeKind = /^[a-z]{2,8}$/i.test(String(kind)) ? String(kind).toLowerCase() : 'crs';
  let url = String(membersUrl ?? '').trim();
  if (url && !isIliasUrl(url)) throw iliasError(400, 'ilias_url_invalid');
  if (!url) {
    const content = await fetchIliasHtml({ cookie, url: iliasRepositoryUrl(safeKind, id), fetchImpl, referer: ILIAS_DASHBOARD_URL });
    url = iliasMembersUrlFromHtml(content.html);
    if (!url) throw iliasError(404, 'ilias_members_missing');
  }
  const { html } = await fetchIliasHtml({ cookie, url, fetchImpl, referer: iliasRepositoryUrl(safeKind, id) });
  if (!/\bil-card\b/i.test(html)) throw iliasError(502, 'ilias_members_missing');
  return parseIliasMembers(html, { refId: id, kind: safeKind });
}

/** Read one public profile page. The link comes from a member card. */
export async function fetchIliasProfile({ cookie, userId, profileUrl, fetchImpl = fetch }) {
  const url = String(profileUrl ?? '').trim();
  if (!url) throw iliasError(400, 'ilias_profile_url_missing');
  if (!isIliasUrl(url)) throw iliasError(400, 'ilias_url_invalid');
  const { html } = await fetchIliasHtml({ cookie, url, fetchImpl, referer: ILIAS_DASHBOARD_URL });
  if (!/\bilProfile\b/i.test(html)) throw iliasError(502, 'ilias_profile_missing');
  return parseIliasProfile(html, { userId: Number(userId) || null, url });
}

/**
 * Fetch a profile image (or another image the signed-in profile page points to)
 * with the given cookie. The bytes stay out of the parsed JSON cache.
 */
export async function fetchIliasImageBytes({ cookie, imageUrl, fetchImpl = fetch }) {
  const url = String(imageUrl ?? '').trim();
  if (!url) throw iliasError(400, 'ilias_image_url_missing');
  if (!isIliasUrl(url)) throw iliasError(400, 'ilias_url_invalid');
  if (!cookie) throw iliasError(409, 'ilias_credentials_missing');
  let current = url;
  for (let hop = 0; hop <= 5; hop += 1) {
    let response;
    try {
      response = await fetchImpl(current, {
        redirect: 'manual',
        headers: { ...DASHBOARD_HEADERS, Referer: ILIAS_BASE, Cookie: cookie },
      });
    } catch (error) {
      throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      if (!location) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
      current = resolveUrl(current, location);
      if (!isIliasUrl(current)) throw iliasError(400, 'ilias_url_invalid');
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      throw iliasError(401, 'ilias_session_expired');
    }
    if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
    const contentType = String(response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) throw iliasError(502, 'ilias_image_invalid');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 3_000_000) throw iliasError(413, 'ilias_image_too_large');
    return { bytes, contentType };
  }
  throw iliasError(502, 'ilias_redirect_loop');
}

function filenameFromDisposition(value) {
  const text = String(value ?? '');
  const encoded = text.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
    } catch {
      return encoded.trim().replace(/^"|"$/g, '');
    }
  }
  return text.match(/filename\s*=\s*"([^"]*)"/i)?.[1] ?? text.match(/filename\s*=\s*([^;]+)/i)?.[1]?.trim() ?? '';
}

async function fileFromResponse(response, url, fetchImpl, headers) {
  if (response.status === 401 || response.status === 403) throw iliasError(401, 'ilias_session_expired');
  if (!response.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${response.status}`);
  const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
  const disposition = response.headers.get('content-disposition') ?? '';

  if (contentType.includes('text/html')) {
    const html = await response.text();
    if (looksLikeIliasLogin(html)) throw iliasError(401, 'ilias_session_expired');
    // Some installations answer the plain command with the file screen first;
    // follow its download link once instead of handing HTML to the app.
    const link = html.match(/href\s*=\s*["']([^"']*cmd=sendfile[^"']*ref_id=\d+[^"']*)["']/i)?.[1];
    if (!link) throw iliasError(502, 'ilias_file_missing');
    let next;
    try {
      next = await fetchImpl(resolveUrl(url, decodeEntities(link)), { redirect: 'follow', headers });
    } catch (error) {
      throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
    }
    if (next.status === 401 || next.status === 403) throw iliasError(401, 'ilias_session_expired');
    if (!next.ok) throw iliasError(502, 'ilias_http_error', `HTTP ${next.status}`);
    const nextType = String(next.headers.get('content-type') ?? '').toLowerCase();
    if (nextType.includes('text/html')) throw iliasError(502, 'ilias_file_missing');
    return {
      bytes: Buffer.from(await next.arrayBuffer()),
      contentType: nextType.split(';')[0] || 'application/octet-stream',
      filename: filenameFromDisposition(next.headers.get('content-disposition') ?? ''),
    };
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: contentType.split(';')[0] || 'application/octet-stream',
    filename: filenameFromDisposition(disposition),
  };
}

/** Download a file of the repository for an existing `PHPSESSID`. */
export async function fetchIliasFile({ cookie, refId, fetchImpl = fetch, fileUrl }) {
  const id = Number(refId);
  if (!Number.isInteger(id) || id <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const value = normalizeIliasCookie(cookie);
  if (!value) throw iliasError(409, 'ilias_credentials_missing');
  const url = fileUrl || iliasFileUrl(id);
  const headers = {
    ...DASHBOARD_HEADERS,
    Accept: '*/*',
    Referer: iliasRepositoryUrl('file', id),
    Cookie: value,
  };
  let response;
  try {
    response = await fetchImpl(url, { redirect: 'follow', headers });
  } catch (error) {
    throw iliasError(502, 'ilias_unreachable', String(error?.message ?? error));
  }
  return fileFromResponse(response, url, fetchImpl, headers);
}
