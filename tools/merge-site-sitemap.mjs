#!/usr/bin/env node
/**
 * Add the static landing-page URLs to the Docusaurus sitemap.
 *
 * The Pages build composes `site/` over the Docusaurus output. Docusaurus owns
 * `sitemap.xml`, but it does not know about the landing page's legal pages.
 * This script adds them once, after the compose step.
 *
 * Usage: node tools/merge-site-sitemap.mjs public/sitemap.xml https://example.org/base/
 */
import { readFile, writeFile } from 'node:fs/promises';

const [, , file, rawBase] = process.argv;

if (!file || !rawBase) {
  console.error('Usage: node tools/merge-site-sitemap.mjs <sitemap.xml> <base-url>');
  process.exit(1);
}

const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
const today = new Date().toISOString().slice(0, 10);
const pages = [
  { path: '', changefreq: 'weekly', priority: '1.0' },
  { path: 'impressum/', changefreq: 'yearly', priority: '0.3' },
  { path: 'datenschutz/', changefreq: 'yearly', priority: '0.3' },
];

let xml;
try {
  xml = await readFile(file, 'utf8');
} catch (error) {
  console.error(`Could not read ${file}: ${error.message}`);
  process.exit(1);
}

const additions = pages
  .filter((page) => !xml.includes(`<loc>${base}${page.path}</loc>`))
  .map(
    (page) =>
      `  <url><loc>${base}${page.path}</loc><lastmod>${today}</lastmod>` +
      `<changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`,
  )
  .join('\n');

if (!additions) {
  console.log('Sitemap already contains the landing and legal pages.');
  process.exit(0);
}

if (!xml.includes('</urlset>')) {
  console.error(`${file} does not look like a sitemap (no </urlset>).`);
  process.exit(1);
}

await writeFile(file, xml.replace('</urlset>', `${additions}\n</urlset>`), 'utf8');
console.log(`Added ${additions.split('\n').length} URL(s) to ${file}.`);
