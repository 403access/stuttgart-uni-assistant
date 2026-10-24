import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { t } from '../i18n/index.mjs';

let bundle = '';

/** The self-contained pptx-preview browser build, read once per process. */
export function pptxViewerBundle() {
  if (!bundle) {
    const require = createRequire(import.meta.url);
    const manifest = require.resolve('pptx-preview/package.json');
    bundle = readFileSync(join(dirname(manifest), 'dist', 'pptx-preview.umd.js'), 'utf8');
  }
  return bundle;
}

function inlineScript(source) {
  // A literal `</script>` would close the tag before the bundle ends.
  return source.replace(/<\/script/gi, '<\\/script');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * A self-contained page for one ILIAS presentation. The file bytes and the
 * renderer travel inside the document, so the app's WebView needs no further
 * network access and the file never reaches a third-party viewer. Slides are
 * stacked in a scrollable list; the library scales each one to the viewport.
 */
export function renderIliasPptxViewer({ bytes, locale = 'de' }) {
  const data = Buffer.from(bytes).toString('base64');
  const language = locale === 'en' ? 'en' : 'de';
  const error = escapeHtml(t(language, 'ilias.viewerError'));
  const loading = escapeHtml(t(language, 'ilias.viewerLoading'));
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<style>
  html, body { margin: 0; padding: 0; background: #f2f4f6; }
  body { -webkit-text-size-adjust: 100%; }
  #viewer { box-sizing: border-box; padding: 8px 8px 24px; }
  .pptx-preview-wrapper { margin: 0 auto !important; background: transparent !important; }
  .pptx-preview-slide-wrapper {
    margin-bottom: 12px !important;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  }
  #loading, #error {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    background: #f2f4f6;
    color: #5b6570;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: center;
  }
  #loading .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #d7dbde;
    border-top-color: #004191;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  #error { display: none; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div id="viewer"></div>
<div id="loading"><div class="spinner"></div><span>${loading}</span></div>
<div id="error">${error}</div>
<script>${inlineScript(pptxViewerBundle())}</script>
<script>
(function () {
  var data = "${data}";
  function send(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
    else if (window.parent && window.parent !== window) window.parent.postMessage(message, '*');
  }
  function finish() {
    var loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }
  function fail() {
    finish();
    var viewer = document.getElementById('viewer');
    if (viewer) viewer.style.display = 'none';
    var error = document.getElementById('error');
    if (error) error.style.display = 'block';
    send({ type: 'error' });
  }
  try {
    var binary = atob(data);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    var width = Math.min(960, Math.max(240, document.documentElement.clientWidth - 16));
    var viewer = pptxPreview.init(document.getElementById('viewer'), { width: width, mode: 'list' });
    viewer.preview(bytes.buffer).then(function () {
      if (!viewer.slideCount) {
        fail();
        return;
      }
      finish();
      send({ type: 'slides', count: viewer.slideCount });
    }).catch(fail);
  } catch (caught) {
    fail();
  }
})();
</script>
</body>
</html>`;
}
