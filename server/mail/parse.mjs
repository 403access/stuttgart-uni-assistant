/**
 * Pure MIME/IMAP text parsing shared by the inbox, body reader and tests:
 * headers, RFC 2047 words, BODYSTRUCTURE trees, quoted-printable, HTML
 * sanitizing and flat previews. No network and no state.
 */

/**
 * Quoted-printable at byte level: soft line breaks (`=\r\n`) vanish, `=XX` octets turn
 * back into bytes; everything else passes through so the charset decode sees the truth.
 */
export function decodeQuotedPrintable(bytes) {
  const raw = bytes.toString('latin1');
  const out = [];
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (char === '=') {
      const next = raw[index + 1];
      if (next === '\r' || next === '\n') {
        index += next === '\r' && raw[index + 2] === '\n' ? 2 : 1;
        continue;
      }
      const hex = raw.slice(index + 1, index + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        out.push(Number.parseInt(hex, 16));
        index += 2;
        continue;
      }
    }
    out.push(char.charCodeAt(0) & 0xff);
  }
  return Buffer.from(out);
}

/**
 * BODYSTRUCTURE into a JS tree: `(` lists, `"strings"` with backslash escapes, NIL and
 * bare atoms; one call consumes the leading value and stops (the rest is not needed).
 */
export function parseImapList(text) {
  const src = String(text ?? '');
  let at = 0;
  function readValue() {
    while (src[at] === ' ') at++;
    if (src[at] === '(') {
      at++;
      const list = [];
      for (;;) {
        while (src[at] === ' ') at++;
        if (src[at] === undefined) return list;
        if (src[at] === ')') {
          at++;
          return list;
        }
        list.push(readValue());
      }
    }
    if (src[at] === '"') {
      at++;
      let out = '';
      while (at < src.length && src[at] !== '"') {
        if (src[at] === '\\' && src[at + 1]) {
          out += src[at + 1];
          at += 2;
          continue;
        }
        out += src[at];
        at++;
      }
      at++;
      return out;
    }
    let atom = '';
    while (at < src.length && src[at] !== ' ' && src[at] !== ')') {
      atom += src[at];
      at++;
    }
    return /^NIL$/i.test(atom) ? null : atom;
  }
  return readValue();
}

/**
 * The text leaves of a structure with their IMAP section paths, charsets and transfer
 * encodings: `text/plain` wins for the default view, `text/html` feeds the opt-in HTML view.
 */
export function pickTextParts(node) {
  const found = { plain: null, html: null };
  function charsetOf(part) {
    const params = Array.isArray(part[2]) ? part[2] : [];
    for (let index = 0; index + 1 < params.length; index += 2) {
      if (String(params[index]).toUpperCase() === 'CHARSET') return String(params[index + 1]);
    }
    return null;
  }
  function walk(current, prefix) {
    if (!Array.isArray(current)) return;
    if (Array.isArray(current[0])) {
      // A multipart part: the children get the numbered sub-paths.
      let index = 0;
      for (const child of current) {
        if (!Array.isArray(child)) continue; // the trailing subtype string and the extension list
        index += 1;
        walk(child, prefix ? `${prefix}.${index}` : String(index));
      }
      return;
    }
    const type = String(current[0] ?? '').toUpperCase();
    if (type === 'MESSAGE' && String(current[1] ?? '').toUpperCase() === 'RFC822') {
      // A forwarded message rides inside its own structure (… envelope, body …).
      const inner = current[8];
      if (Array.isArray(inner)) walk(inner, prefix);
      return;
    }
    if (type !== 'TEXT') return;
    const subtype = String(current[1] ?? '').toUpperCase();
    const leaf = { path: prefix || '1', charset: charsetOf(current), encoding: String(current[5] ?? '').toUpperCase() };
    if (subtype === 'PLAIN' && !found.plain) found.plain = leaf;
    else if ((subtype === 'HTML' || subtype === 'ENRICHED') && !found.html) found.html = leaf;
  }
  walk(node, '');
  return found;
}

/**
 * Defense in depth before any HTML leaves the server: script blocks (even unterminated)
 * out, event handler attributes out, meta-refresh redirects out. The WebView adds its own
 * no-JavaScript and no-navigation rules on top.
 */
export function stripMailHtml(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, ' ')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ' ')
    .replace(/<meta\b[^>]*http-equiv=["']?refresh[^>]*>/gi, ' ');
}

/** RFC 822 header block with folded continuation lines folded back onto their name. */
export function parseHeaderBlock(buffer) {
  const raw = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
  const folded = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if ((line.startsWith(' ') || line.startsWith('\t')) && folded.length) folded[folded.length - 1] += ` ${line.trim()}`;
    else folded.push(line);
  }
  const headers = {};
  for (const line of folded) {
    const at = line.indexOf(':');
    if (at < 1) continue;
    const name = line.slice(0, at).trim().toLowerCase();
    if (!(name in headers)) headers[name] = line.slice(at + 1).trim();
  }
  return headers;
}

/** RFC 2047 encoded words (=?utf-8?B?…?= / =?utf-8?Q?…?=) into readable text. */
export function decodeMimeWords(value) {
  return String(value ?? '')
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (match, _charset, encoding, data) => {
      try {
        if (encoding.toLowerCase() === 'b') return Buffer.from(data, 'base64').toString('utf8');
        const bytes = [];
        for (const char of data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_all, hex) => String.fromCharCode(parseInt(hex, 16)))) {
          bytes.push(char.charCodeAt(0) & 0xff);
        }
        return Buffer.from(bytes).toString('utf8');
      } catch {
        return match;
      }
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Body excerpt as flat text: charset fallback, tags out, entities read back, whitespace folded. */
export function textPreview(buffer, max = 400) {
  const head = buffer.subarray(0, 512).toString('utf8');
  const latin = /charset=["']?(?:iso-8859-1|windows-1252|latin1)\b/i.test(head);
  let text = (latin ? buffer.toString('latin1') : buffer.toString('utf8')).replace(/<!--[\s\S]*?-->/g, ' ');
  text = text
    .replace(/\s*<style[\s\S]*?<\/style>\s*/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_all, code) => String.fromCodePoint(Number(code) || 65));
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Decoded body bytes → text with the part's charset. */
export function charsetDecode(buffer, charset) {
  const cs = String(charset ?? '').toLowerCase();
  if (/(8859|1252|latin1)/.test(cs)) return buffer.toString('latin1');
  if (/utf-?16/.test(cs)) return buffer.toString('utf16le');
  return buffer.toString('utf8');
}
