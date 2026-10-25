import { ILIAS_BASE } from './constants.mjs';
import { attributesOf, decodeEntities, textOf } from './markup.mjs';
import { resolveUrl } from './util.mjs';

/* ---------------------------------------------------------------- profile -- */

const PROFILE_SECTION = /<div[^>]*class\s*=\s*["'][^"']*\bilProfileSection\b[^"']*["'][^>]*>/gi;

/** Keep the line structure of a profile section, which plain `textOf` drops. */
function profileText(html) {
  return decodeEntities(
    String(html ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|dd)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function profileLinks(html) {
  const links = [];
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = textOf(match[2]);
    if (!label) continue;
    links.push({ label, url: resolveUrl(ILIAS_BASE, decodeEntities(match[1])) });
  }
  return links;
}

/** Course and group links a profile may carry in a section. */
function profileCourses(links) {
  const courses = [];
  const seen = new Set();
  for (const link of links) {
    const go = link.url.match(/\/go\/(crs|grp)\/(\d+)(?:[?#]|$)/i);
    const command = link.url.match(/cmdClass\s*=\s*ilObj(Course|Group)GUI/i);
    const refId = Number(link.url.match(/[?&]ref_id=(\d+)/i)?.[1] ?? go?.[2] ?? 0);
    const kind = go?.[1]?.toLowerCase() ?? (command ? (command[1].toLowerCase() === 'course' ? 'crs' : 'grp') : '');
    if (!kind || !Number.isInteger(refId) || refId <= 0) continue;
    const key = `${kind}-${refId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    courses.push({ refId, kind, title: link.label, url: link.url });
  }
  return courses;
}

function profileAvatar(block) {
  const tag = block.match(/<img\b[^>]*class\s*=\s*["'][^"']*\bilProfileImage\b[^"']*["'][^>]*>/i)?.[0];
  return tag ? attributesOf(tag).src ?? '' : '';
}

function profileSection(segment) {
  const headTag = segment.match(
    /<h3[^>]*class\s*=\s*["'][^"']*\bilProfileSectionHead\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i,
  );
  const title = headTag ? textOf(headTag[1]) : '';
  const actionLink =
    /<a\b[^>]*href\s*=\s*["'][^"']*(?:ilMailGUI|deliverVCard)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
  const body = (headTag ? segment.replace(headTag[0], '') : segment).replace(actionLink, ' ');
  const text = profileText(body);
  const links = profileLinks(segment).filter(
    (link) => !/baseClass\s*=\s*ilMailGUI/i.test(link.url) && !/\bcmd\s*=\s*deliverVCard\b/i.test(link.url),
  );
  return { title, text, links };
}

/**
 * Parse the public profile ILIAS opens from a member card. The page is small:
 * the profile name, an optional avatar, and one or more `ilProfileSection`
 * blocks (institution, contact, and whatever else the user published). The
 * header keeps the course context and the h1 form of the name.
 */
export function parseIliasProfile(html, { userId = null, url = '', fetchedAt = new Date().toISOString() } = {}) {
  const source = String(html ?? '');
  const start = source.search(/<div[^>]*class\s*=\s*["'][^"']*\bilProfile\b[^"']*["'][^>]*>/i);
  const end = start >= 0 ? source.indexOf('<footer', start) : -1;
  const block = start >= 0 ? source.slice(start, end >= 0 ? end : source.length) : source;

  const id = Number(
    userId ||
      url.match(/[?&]user=(\d+)/i)?.[1] ||
      url.match(/\/go\/usr\/(\d+)/i)?.[1] ||
      0,
  ) || null;
  const name =
    textOf(block.match(/<h3[^>]*class\s*=\s*["'][^"']*\bilProfileName\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '') ||
    textOf(source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bil-page-content-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const title = textOf(source.match(/<h1[^>]*class\s*=\s*["'][^"']*\bil-page-content-header\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '') || name;
  const context = textOf(source.match(/<div[^>]*class\s*=\s*["'][^"']*\bilHeaderDesc\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '');
  const avatar = profileAvatar(block);
  const allLinks = profileLinks(block);

  const markers = [...block.matchAll(PROFILE_SECTION)];
  const sections = [];
  for (const [index, marker] of markers.entries()) {
    const segment = block.slice(marker.index ?? 0, markers[index + 1]?.index ?? block.length);
    const section = profileSection(segment);
    if (section.title || section.text || section.links.length) sections.push(section);
  }

  const emailFromText = sections.map((section) => section.text).join('\n').match(/E-?Mail\s*:\s*([^\s\n]+@[^\s\n]+)/i)?.[1] ?? '';
  const emailFromLink = allLinks.map((link) => link.url.match(/mailto:([^?&\s]+)/i)?.[1] ?? '').find(Boolean) ?? '';
  const mailLink = allLinks.find((link) => /baseClass\s*=\s*ilMailGUI/i.test(link.url));
  const vcardLink = allLinks.find((link) => /\bcmd\s*=\s*deliverVCard\b/i.test(link.url));

  return {
    userId: id,
    name,
    title,
    context,
    avatarUrl: avatar ? resolveUrl(ILIAS_BASE, avatar) : '',
    email: emailFromText || emailFromLink,
    mailUrl: mailLink?.url ?? '',
    vcardUrl: vcardLink?.url ?? '',
    profileUrl: id ? `${ILIAS_BASE}/go/usr/${id}` : url,
    sections,
    courses: profileCourses(allLinks),
    fetchedAt,
  };
}
