#!/usr/bin/env node
/**
 * Generates the app icon and splash assets from the app's own mark.
 *
 * The mark is the two overlapping discs from `src/components/ui.tsx` (`Mark`):
 * a large disc and a smaller one filling the unit square corner to corner. On
 * the brand-blue ground the large disc is drawn white so it stays legible,
 * while the small disc keeps the light-blue accent (`colors.light`).
 *
 *   node tools/codegen/generate-icons.mjs
 *
 * Outputs (assets/images): icon.png, splash-icon.png, android-icon-foreground.png,
 * android-icon-background.png, android-icon-monochrome.png, favicon.png.
 *
 * Pure Node — no image libraries — so the assets can be regenerated anywhere.
 */
import { deflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'mobile', 'assets', 'images');

// Brand colors, from src/theme.ts.
const BLUE = [0x00, 0x41, 0x91]; // colors.blue   — icon ground, splash ground
const LIGHT = [0x00, 0xbe, 0xff]; // colors.light  — the small disc in the mark
const WHITE = [0xff, 0xff, 0xff];

// The mark, in a unit square. Values mirror `Mark` in src/components/ui.tsx:
// big disc = 0.72 wide at (left 0, top 0.16); small disc = 0.46 wide at (right 0, top 0).
const BIG = { cx: 0.36, cy: 0.52, r: 0.36 };
const SMALL = { cx: 0.77, cy: 0.23, r: 0.23 };

const SS = 4; // supersample factor used for anti-aliasing

/** Each target renders the mark at `scale` of the canvas, centered. */
const TARGETS = [
  // iOS/legacy Android icon: opaque, no alpha channel, fills the square.
  { file: 'icon.png', size: 1024, background: BLUE, discs: [WHITE, LIGHT], scale: 0.68, alpha: false },
  // Splash: transparent, sits on the blue splash background (see app.json imageWidth).
  { file: 'splash-icon.png', size: 1024, background: null, discs: [WHITE, LIGHT], scale: 0.66, alpha: true },
  // Adaptive foreground: transparent, kept inside Android's center safe zone.
  { file: 'android-icon-foreground.png', size: 1024, background: null, discs: [WHITE, LIGHT], scale: 0.5, alpha: true },
  // Adaptive background: solid brand blue, matching the foreground dimensions.
  { file: 'android-icon-background.png', size: 1024, background: BLUE, discs: [], scale: 0, alpha: false },
  // Themed icon: a single-color silhouette the OS tints.
  { file: 'android-icon-monochrome.png', size: 1024, background: null, discs: [WHITE, WHITE], scale: 0.5, alpha: true },
  // Web favicon.
  { file: 'favicon.png', size: 64, background: BLUE, discs: [WHITE, LIGHT], scale: 0.68, alpha: false },
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba, alpha) {
  const channels = alpha ? 4 : 3;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = rowStart + 1 + x * channels;
      raw[d] = rgba[s];
      raw[d + 1] = rgba[s + 1];
      raw[d + 2] = rgba[s + 2];
      if (alpha) raw[d + 3] = rgba[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = alpha ? 6 : 2; // color type: RGBA or RGB (no alpha channel)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function paintDisc(buf, hi, disc, color, content, offset) {
  const cx = offset + disc.cx * content;
  const cy = offset + disc.cy * content;
  const r = disc.r * content;
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(hi - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(hi - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      if (dx * dx + dy * dy <= r2) {
        const i = (y * hi + x) * 4;
        buf[i] = color[0];
        buf[i + 1] = color[1];
        buf[i + 2] = color[2];
        buf[i + 3] = 255;
      }
    }
  }
}

function render({ size, background, discs, scale }) {
  const hi = size * SS;
  const buf = new Uint8Array(hi * hi * 4);
  if (background) {
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = background[0];
      buf[i + 1] = background[1];
      buf[i + 2] = background[2];
      buf[i + 3] = 255;
    }
  }
  if (discs.length) {
    const content = scale * hi;
    const offset = (hi - content) / 2;
    if (discs[0]) paintDisc(buf, hi, BIG, discs[0], content, offset);
    if (discs[1]) paintDisc(buf, hi, SMALL, discs[1], content, offset);
  }

  // Box-downsample, averaging premultiplied color so transparent edges stay clean.
  const out = new Uint8Array(size * size * 4);
  const samples = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        const row = (y * SS + sy) * hi;
        for (let sx = 0; sx < SS; sx++) {
          const i = (row + x * SS + sx) * 4;
          const pa = buf[i + 3];
          if (pa) {
            r += buf[i] * pa;
            g += buf[i + 1] * pa;
            b += buf[i + 2] * pa;
            a += pa;
          }
        }
      }
      const o = (y * size + x) * 4;
      if (a) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round(a / samples);
      }
    }
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const target of TARGETS) {
  const rgba = render(target);
  const png = encodePng(target.size, target.size, rgba, target.alpha);
  writeFileSync(join(OUT_DIR, target.file), png);
  console.log(`${target.file}  ${target.size}x${target.size}  ${(png.length / 1024).toFixed(1)} KB`);
}
