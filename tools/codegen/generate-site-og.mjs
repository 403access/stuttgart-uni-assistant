#!/usr/bin/env node
/**
 * Regenerate `site/assets/og.jpg` (1200 × 630) from the dashboard screenshot.
 *
 * Usage: node tools/codegen/generate-site-og.mjs
 */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../../apps/site/assets/shots/dashboard.jpg', import.meta.url));
const image = dashboard.toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
       background:radial-gradient(120% 140% at 85% 0%, #00539e 0%, #00306b 55%, #002a5e 100%);
       color:#fff;display:flex;align-items:center;padding:64px 72px;position:relative}
  body:before,body:after{content:"";position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(0,190,255,.5),transparent 68%);}
  body:before{width:520px;height:520px;top:-220px;right:-100px;opacity:.55}
  body:after{width:420px;height:420px;bottom:-240px;left:-130px;opacity:.35}
  .copy{position:relative;z-index:2;max-width:650px}
  .brand{display:flex;align-items:center;gap:14px;font-size:24px;font-weight:800;letter-spacing:-.01em;margin-bottom:34px}
  .mark{width:48px;height:48px}
  h1{font-size:66px;line-height:1.02;letter-spacing:-.035em;margin:0 0 22px;font-weight:800}
  p{font-size:24px;line-height:1.4;margin:0;color:rgba(255,255,255,.82);max-width:600px}
  .tag{display:inline-block;margin-top:34px;padding:10px 18px;border:1px solid rgba(255,255,255,.3);border-radius:999px;font-size:18px;font-weight:700;color:#fff}
  .phone{position:absolute;right:70px;bottom:-90px;width:330px;border-radius:48px;padding:12px;background:#0b1220;border:1px solid rgba(255,255,255,.18);box-shadow:0 40px 100px rgba(0,0,0,.45);transform:rotate(4deg);z-index:1}
  .phone img{width:100%;display:block;border-radius:38px}
  .light{color:#00beff}
</style></head><body>
  <div class="copy">
    <div class="brand"><svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="14.4" cy="20.8" r="14.4" fill="#00beff"/><circle cx="30.8" cy="9.2" r="9.2" fill="#ffffff"/></svg>University Assistant</div>
    <h1>Dein Studium,<br><span class="light">an einem Ort.</span></h1>
    <p>Stundenplan, Module, Fristen, Campus und ein Assistent — in einer App.</p>
    <span class="tag">Studentisches Projekt · Open Source</span>
  </div>
  <div class="phone"><img src="data:image/jpeg;base64,${image}" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({
    path: new URL('../../apps/site/assets/og.jpg', import.meta.url).pathname,
    type: 'jpeg',
    quality: 85,
  });
  console.log('Wrote site/assets/og.jpg (1200 × 630).');
} finally {
  await browser.close();
}
