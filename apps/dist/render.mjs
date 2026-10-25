/**
 * The service's HTML and the iOS over-the-air install manifest.
 *
 * Plain template strings. The palette comes from the shared design tokens; the
 * service is bundled before deployment, so the package is inlined.
 */

import { tokensCss } from '@ua/design-tokens/css-string';

/** Escape anything that came from a build's metadata before putting it in HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBytes(bytes) {
  const mb = Number(bytes) / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function formatDate(iso) {
  return String(iso ?? '').replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

/** Days until the embedded profile expires, or `null` when there is no date. */
export function daysUntil(iso, now = new Date()) {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return Math.floor((at - now.getTime()) / 86_400_000);
}

const style = `
${tokensCss}
  * { box-sizing: border-box; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         color: var(--text); background: var(--bg); }
  header { background: var(--brand); color: var(--surface); padding: 20px 24px; }
  header a { color: var(--surface); text-decoration: none; }
  header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  main { max-width: 880px; margin: 0 auto; padding: 24px; }
  table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 10px;
          overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--line); }
  th { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); }
  tr:last-child td { border-bottom: 0; }
  a { color: var(--brand); }
  .muted { color: var(--text-muted); }
  .install { display: inline-block; background: var(--brand); color: var(--surface); padding: 12px 20px;
             border-radius: 10px; text-decoration: none; font-weight: 600; }
  .card { background: var(--surface); border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .warn { background: var(--warn-bg); border-left: 4px solid var(--warn); padding: 12px 16px; border-radius: 6px; }
  code { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; font-size: 14px; }
  dl { display: grid; grid-template-columns: 150px 1fr; gap: 6px 16px; margin: 0; }
  dt { color: var(--text-muted); }
  dd { margin: 0; }
  .empty { color: var(--text-muted); padding: 24px 0; }
`;

function layout({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${style}</style>
</head>
<body>
<header><h1><a href="/">Builds</a></h1></header>
<main>${body}</main>
</body>
</html>`;
}

export function indexPage(builds, { deviceCount = 0 } = {}) {
  const rows = builds
    .map(
      (build) => `<tr>
        <td><a href="/b/${escapeHtml(build.id)}">${escapeHtml(build.version)} (${escapeHtml(build.build)})</a></td>
        <td>${escapeHtml(formatDate(build.createdAt))}</td>
        <td class="muted">${escapeHtml(formatBytes(build.bytes))}</td>
        <td class="muted"><code>${escapeHtml(build.sha256.slice(0, 12))}</code></td>
      </tr>`,
    )
    .join('\n');

  const body = builds.length
    ? `<table>
        <thead><tr><th>Version</th><th>Published</th><th>Size</th><th>SHA-256</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted">${builds.length} build(s). ${deviceCount} device(s) registered for the next profile.</p>`
    : '<p class="empty">No builds yet. Publish one with <code>npm run dist:publish</code>.</p>';

  return layout({ title: 'Builds', body });
}

export function buildPage(build, { base, deviceCount = 0, now = new Date() } = {}) {
  const manifest = `${base}/b/${build.id}/manifest.plist`;
  const install = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifest)}`;
  const expiry = daysUntil(build.expiresAt, now);
  const expiring = expiry !== null && expiry < 14;

  const warnings = [];
  if (expiry !== null && expiry < 0) {
    warnings.push('This build\'s provisioning profile has expired. Registered devices cannot install it.');
  } else if (expiring) {
    warnings.push(`The provisioning profile expires in ${expiry} day(s). Rebuild before then.`);
  }
  if (build.provisionedDevices > 0 && deviceCount > build.provisionedDevices) {
    warnings.push(
      `The profile covers ${build.provisionedDevices} device(s), but ${deviceCount} are registered. Rebuild so the newer ones install.`,
    );
  }

  const body = `
    <p><a href="/">&larr; All builds</a></p>
    <div class="card">
      <h2>${escapeHtml(build.title)} ${escapeHtml(build.version)} (${escapeHtml(build.build)})</h2>
      <p><a class="install" href="${escapeHtml(install)}">Install on this iPhone</a></p>
      <p class="muted">The device must be in this build's provisioning profile. Installing over the air
      needs Safari; a plain download link saves the file but does not install it.</p>
      ${warnings.map((warning) => `<p class="warn">${escapeHtml(warning)}</p>`).join('\n')}
      <dl>
        <dt>Bundle</dt><dd><code>${escapeHtml(build.bundleId)}</code></dd>
        <dt>Published</dt><dd>${escapeHtml(formatDate(build.createdAt))}</dd>
        <dt>Size</dt><dd>${escapeHtml(formatBytes(build.bytes))}</dd>
        <dt>SHA-256</dt><dd><code>${escapeHtml(build.sha256)}</code></dd>
        <dt>Team</dt><dd>${escapeHtml(build.teamId || 'unknown')}</dd>
        <dt>Profile expires</dt><dd>${escapeHtml(build.expiresAt || 'unknown')}</dd>
        <dt>Profile devices</dt><dd>${escapeHtml(String(build.provisionedDevices))}</dd>
        <dt>Registered devices</dt><dd>${escapeHtml(String(deviceCount))}</dd>
        ${build.notes ? `<dt>Notes</dt><dd>${escapeHtml(build.notes)}</dd>` : ''}
      </dl>
      <p class="muted">Download: <a href="/b/${escapeHtml(build.id)}/ipa">${escapeHtml(build.id)}.ipa</a></p>
    </div>`;

  return layout({ title: `${build.title} ${build.version}`, body });
}

/**
 * The `itms-services` manifest. `bundle-version` must be the build number, and
 * both URLs must be absolute and HTTPS for iOS to accept them.
 */
export function manifestPlist(build, { base }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${escapeHtml(`${base}/b/${build.id}/ipa`)}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${escapeHtml(build.bundleId)}</string>
        <key>bundle-version</key>
        <string>${escapeHtml(build.build)}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${escapeHtml(build.title)}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
`;
}
