/**
 * The shape of the build product: what the `.ipa` is called, the export options
 * that produce it, and how it is fingerprinted afterwards.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** `2026-10-19T14:03:07Z` -> `20261019-1403`, for a filename that sorts. */
export function timestamp(at) {
  const pad = (value) => String(value).padStart(2, '0');
  const date = at instanceof Date ? at : new Date(at);
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '-',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
  ].join('');
}

/** A filename that carries the version actually shipped, not the one requested. */
export function ipaFileName({ slug, version, build, at }) {
  const safe = (value) => String(value || '0').replace(/[^A-Za-z0-9._-]/g, '-');
  return `${safe(slug)}-${safe(version)}-${safe(build)}-${timestamp(at)}.ipa`;
}

/**
 * Export options for a development-signed archive. `method: development` is the
 * strongest signature a Personal Team can produce; `app-store` and `ad-hoc` both
 * need a paid membership. See docs/engineering/ios-distribution.md.
 */
export function exportOptionsPlist(teamId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>development</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>teamID</key>
	<string>${teamId}</string>
	<key>compileBitcode</key>
	<false/>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>uploadSymbols</key>
	<false/>
	<key>destination</key>
	<string>export</string>
</dict>
</plist>
`;
}

/** The SHA-256 of a file, for the line that lets a tester verify what they got. */
export function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
