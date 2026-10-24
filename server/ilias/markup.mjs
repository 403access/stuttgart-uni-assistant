/* ---------------------------------------------------------------- markup -- */

export function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
    euro: '€', ndash: '–', mdash: '—', hellip: '…', middot: '·', times: '×',
    bdquo: '„', ldquo: '“', rdquo: '”', sbquo: '‚', lsquo: '‘', rsquo: '’',
    laquo: '«', raquo: '»', copy: '©', reg: '®', trade: '™', deg: '°', plusmn: '±', sup2: '²', sup3: '³',
  };
  return String(value ?? '').replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity] ?? named[entity.toLowerCase()] ?? match;
  });
}

/** Visible text of a fragment: tags stripped, entities decoded, whitespace collapsed. */
export function textOf(value) {
  return decodeEntities(
    String(value ?? '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function attributesOf(tag) {
  const attributes = {};
  for (const match of String(tag).matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? '');
  }
  return attributes;
}

/** True for the page a signed-out visitor sees instead of the dashboard. */
export function looksLikeIliasLogin(html) {
  const text = String(html ?? '');
  return /name\s*=\s*["']login_form["']/i.test(text) || /doStandardAuthentication/i.test(text);
}
