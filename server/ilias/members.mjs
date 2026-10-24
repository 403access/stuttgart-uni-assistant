import { ILIAS_BASE } from './constants.mjs';
import { attributesOf, decodeEntities, textOf } from './markup.mjs';
import { resolveUrl } from './util.mjs';

/* ---------------------------------------------------------------- members -- */

const MEMBER_CARD = /<div[^>]*class\s*=\s*["'][^"']*\bil-card\b[^"']*\bthumbnail\b[^"']*["'][^>]*>/gi;
const MEMBER_HIDDEN_NAME = /^(?:nicht freigegeben|not released|not available)$/i;
const MEMBER_TUTOR_ROLE = /(kontaktperson|tutor|lehrende|dozent|administrator|owner|besitzer|teacher)/i;

/** The name ILIAS renders when a user opted out of a public profile. */
function memberProperty(segment, pattern) {
  for (const match of String(segment).matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) {
    if (pattern.test(textOf(match[1]))) return textOf(match[2]);
  }
  return '';
}

/**
 * ILIAS login names concatenate first and last names ("VivianEichholz"). When
 * the profile name is hidden, the login is all the page gives us, so space the
 * camel-case parts for readability.
 */
function memberNameFromLogin(value) {
  return String(value ?? '')
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function memberCard(segment, index) {
  const titleHtml = segment.match(/<div[^>]*class\s*=\s*["'][^"']*\bcard-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';
  const title = textOf(titleHtml);
  const username = memberProperty(segment, /^(anmeldename|benutzername|login|login name)$/i);
  const role = memberProperty(segment, /^(zuständigkeit|zustaendigkeit|rolle|funktion|role|function)$/i);
  let profileHref = titleHtml.match(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  profileHref = decodeEntities(profileHref);
  if (!profileHref) {
    for (const match of segment.matchAll(/<a\b[^>]*>/gi)) {
      const href = attributesOf(match[0]).href ?? '';
      if (/\bcmdClass\s*=\s*["']?ilpublicuserprofilegui\b/i.test(href)) {
        profileHref = href;
        break;
      }
    }
  }
  const hidden = MEMBER_HIDDEN_NAME.test(title) || !title;
  const name = hidden ? memberNameFromLogin(username) || title : title;
  if (!name) return null;

  const userId = Number(
    profileHref.match(/[?&]user=(\d+)/i)?.[1] ?? profileHref.match(/\/go\/usr\/(\d+)/i)?.[1] ?? 0,
  ) || null;
  const avatarTag = segment.match(/<img\b[^>]*>/i)?.[0] ?? '';
  const avatarSrc = avatarTag ? attributesOf(avatarTag).src ?? '' : '';

  return {
    id: `member-${username || name || index}`,
    name,
    username,
    role,
    roleKind: MEMBER_TUTOR_ROLE.test(role) ? 'tutor' : 'participant',
    hidden: hidden && Boolean(username),
    userId,
    avatarUrl: avatarSrc ? resolveUrl(ILIAS_BASE, avatarSrc) : '',
    profileUrl: profileHref ? resolveUrl(ILIAS_BASE, profileHref) : '',
  };
}

/**
 * Parse the members tab (`ilUsersGalleryGUI`). Each member is an `il-card
 * thumbnail` with the display name in `card-title`, the login in the
 * `Anmeldename` definition list, and a `Zuständigkeit` value for the tutor or
 * contact person. Users without a public profile show "Nicht freigegeben", so
 * the login name becomes the visible row.
 */
export function parseIliasMembers(html, { refId = null, kind = 'crs', fetchedAt = new Date().toISOString() } = {}) {
  const source = String(html ?? '');
  const headerHtml =
    source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bil-page-content-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bilHeader\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    '';
  const title = textOf(headerHtml) || textOf(source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');

  const markers = [...source.matchAll(MEMBER_CARD)];
  const members = [];
  const seen = new Set();
  for (const [index, marker] of markers.entries()) {
    const segment = source.slice(marker.index ?? 0, markers[index + 1]?.index ?? source.length);
    const member = memberCard(segment, index);
    if (!member) continue;
    const key = member.username || member.name;
    if (seen.has(key)) continue;
    seen.add(key);
    members.push(member);
  }
  // The tutor belongs at the top; everybody else keeps the portal order.
  members.sort((left, right) => Number(right.roleKind === 'tutor') - Number(left.roleKind === 'tutor'));

  return {
    refId: Number(refId) || null,
    kind,
    title,
    members,
    fetchedAt,
  };
}
