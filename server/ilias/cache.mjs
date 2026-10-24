import {
  loadIliasContent,
  loadIliasMembers,
  loadIliasPage,
  loadIliasProfile,
  loadIliasSnapshot,
  saveIliasContent,
  saveIliasMembers,
  saveIliasPage,
  saveIliasProfile,
  saveIliasSnapshot,
} from '../db.mjs';
import { ILIAS_CACHE_TTL_MS, ILIAS_PAGE_MAX_BYTES } from './constants.mjs';
import { iliasMembersUrlFromHtml, parseIliasContent } from './content.mjs';
import { parseIliasDashboard } from './dashboard.mjs';
import { iliasError } from './errors.mjs';
import { looksLikeIliasLogin } from './markup.mjs';
import { parseIliasMembers } from './members.mjs';
import { parseIliasProfile } from './profile.mjs';
import { clearUserIliasSession } from './session.mjs';
import { safeContentKind } from './util.mjs';

/* ------------------------------------------------------------- cache -- */

/**
 * Page reads are harvested by the app's hidden WebView and posted here. The
 * server only parses and stores them; it never walks ILIAS on behalf of a
 * signed-in user. A cached page is served until this TTL has passed, then the
 * client refreshes it.
 */

function cacheIso(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && !Number.isNaN(Date.parse(text)) ? text : new Date().toISOString();
}

function cacheMeta(fetchedAt, ttl = ILIAS_CACHE_TTL_MS) {
  const read = Date.parse(fetchedAt ?? '');
  const stale = !Number.isFinite(read) || Date.now() - read > ttl;
  return { fetchedAt: fetchedAt ?? null, cached: true, stale };
}

/**
 * Store a page the client fetched. Dashboard HTML refreshes the snapshot, and
 * content HTML refreshes the parsed rows for that object. The raw HTML is kept
 * as well, so a parser change can replay it without another device fetch.
 */
export function ingestIliasPage(userId, input = {}) {
  if (
    input.page !== 'dashboard' &&
    input.page !== 'content' &&
    input.page !== 'members' &&
    input.page !== 'profile'
  ) {
    throw iliasError(400, 'ilias_page_invalid');
  }
  const html = String(input.html ?? '');
  if (!html) throw iliasError(400, 'ilias_page_missing');
  if (html.length > ILIAS_PAGE_MAX_BYTES) throw iliasError(413, 'ilias_page_too_large');
  if (looksLikeIliasLogin(html)) {
    // Same evidence as a live read: the cookie the server handed out is dead.
    clearUserIliasSession(userId);
    throw iliasError(401, 'ilias_session_expired');
  }
  const fetchedAt = cacheIso(input.fetchedAt);
  const url = String(input.url ?? '').slice(0, 500);

  if (input.page === 'content') {
    const refId = Number(input.refId);
    if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
    const kind = safeContentKind(input.kind);
    const content = parseIliasContent(html, { refId, kind, fetchedAt });
    saveIliasContent(userId, content);
    saveIliasPage(userId, { key: `content-${kind}-${refId}`, kind, refId, url, html, fetchedAt });
    return { page: 'content', content, ...cacheMeta(fetchedAt) };
  }

  if (input.page === 'members') {
    const refId = Number(input.refId);
    if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
    const kind = safeContentKind(input.kind);
    const members = parseIliasMembers(html, { refId, kind, fetchedAt });
    saveIliasMembers(userId, members);
    saveIliasPage(userId, { key: `members-${kind}-${refId}`, kind, refId, url, html, fetchedAt });
    return { page: 'members', members, ...cacheMeta(fetchedAt) };
  }

  if (input.page === 'profile') {
    const profileUserId = Number(input.userId) || null;
    const profile = parseIliasProfile(html, { userId: profileUserId, url, fetchedAt });
    if (!profile.userId) throw iliasError(400, 'ilias_profile_user_invalid');
    saveIliasProfile(userId, profile);
    saveIliasPage(userId, {
      key: `profile-${profile.userId}`,
      kind: 'profile',
      refId: null,
      url,
      html,
      fetchedAt,
    });
    return { page: 'profile', profile, ...cacheMeta(fetchedAt) };
  }

  const dashboard = parseIliasDashboard(html, fetchedAt);
  saveIliasSnapshot(userId, dashboard);
  saveIliasPage(userId, { key: 'dashboard', kind: 'dashboard', refId: null, url, html, fetchedAt });
  return { page: 'dashboard', dashboard, ...cacheMeta(fetchedAt) };
}

/** The stored dashboard; no ILIAS request. Throws 404 when nothing was harvested yet. */
export function cachedIliasDashboard(userId, ttl = ILIAS_CACHE_TTL_MS) {
  const stored = loadIliasSnapshot(userId);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  return {
    dashboard: stored.dashboard,
    ...cacheMeta(stored.fetchedAt ?? stored.dashboard?.fetchedAt, ttl),
  };
}

/** The stored content page; no ILIAS request. Throws 404 when it was never harvested. */
export function cachedIliasContent(userId, input = {}, ttl = ILIAS_CACHE_TTL_MS) {
  const refId = Number(input.refId);
  if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const kind = safeContentKind(input.kind);
  const stored = loadIliasContent(userId, refId, kind);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  const content = stored.content;
  // Pages harvested before the members tab was parsed still have their raw
  // HTML; read the link from there instead of asking the device for a refetch.
  if (!content.membersUrl) {
    const page = loadIliasPage(userId, `content-${kind}-${refId}`);
    if (page?.html) content.membersUrl = iliasMembersUrlFromHtml(page.html);
  }
  return {
    content,
    ...cacheMeta(stored.fetchedAt ?? stored.content?.fetchedAt, ttl),
  };
}

/** The stored members tab; no ILIAS request. Throws 404 when it was never harvested. */
export function cachedIliasMembers(userId, input = {}, ttl = ILIAS_CACHE_TTL_MS) {
  const refId = Number(input.refId);
  if (!Number.isInteger(refId) || refId <= 0) throw iliasError(400, 'ilias_ref_id_invalid');
  const kind = safeContentKind(input.kind);
  const stored = loadIliasMembers(userId, refId, kind);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  return {
    members: stored.members,
    ...cacheMeta(stored.fetchedAt ?? stored.members?.fetchedAt, ttl),
  };
}

/** The stored public profile; no ILIAS request. Throws 404 when it was never harvested. */
export function cachedIliasProfile(userId, input = {}, ttl = ILIAS_CACHE_TTL_MS) {
  const profileUserId = Number(input.userId);
  if (!Number.isInteger(profileUserId) || profileUserId <= 0) throw iliasError(400, 'ilias_profile_user_invalid');
  const stored = loadIliasProfile(userId, profileUserId);
  if (!stored) throw iliasError(404, 'ilias_cache_miss');
  return {
    profile: stored.profile,
    ...cacheMeta(stored.fetchedAt ?? stored.profile?.fetchedAt, ttl),
  };
}
