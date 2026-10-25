#!/usr/bin/env node
/** Enforce the package dependency direction described in docs/engineering/modularization/02-target-modules.md. */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const FILES = [];
const EXT = /\.(ts|tsx|js|mjs)$/;
const IGNORE = new Set(['node_modules', 'dist', 'build', '.expo', '.docusaurus', 'ios', 'android']);

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXT.test(entry.name)) FILES.push(full);
  }
}
for (const dir of ['apps', 'packages', 'tools']) walk(join(ROOT, dir));

const importRe = /(?:import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?|export\s+(?:type\s+)?[^'"]*?\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
const violations = [];

function isNeutralPackage(rel) {
  return /^packages\/(core|contracts|format|design-tokens|quiz-content)\//.test(rel);
}
function isNodePackage(rel) {
  return /^packages\/server-kit\//.test(rel);
}
function isReactNativePackage(rel) {
  return /^packages\/(ui|features\/[^/]+\/src\/ui)\//.test(rel);
}
function isAdminApp(rel) {
  return rel.startsWith('apps/admin/');
}
function isServerApp(rel) {
  return rel.startsWith('apps/server/');
}
function isMobileApp(rel) {
  return rel.startsWith('apps/mobile/');
}

for (const file of FILES) {
  const rel = relative(ROOT, file).split('\\').join('/');
  const text = readFileSync(file, 'utf8');
  let match;
  while ((match = importRe.exec(text))) {
    const spec = match[1];
    const report = (message) => violations.push(`${rel}: ${message} (${spec})`);

    if (rel.startsWith('packages/')) {
      if (spec.startsWith('@/') || spec.startsWith('apps/')) report('package imports an app alias');
      if (spec.startsWith('.')) {
        const target = resolve(file, '..', spec);
        if (relative(ROOT, target).startsWith('apps/')) report('package reaches into an app');
      }
    }
    if (isAdminApp(rel)) {
      if (/^(react-native|expo|@expo\/|@react-native|react-native-)/.test(spec)) report('admin imports React Native or Expo');
      if (spec === '@ua/ui' || spec.startsWith('@ua/ui/')) report('admin imports the React Native UI package');
      if (spec.startsWith('@ua/feature-')) report('admin imports a mobile feature package');
    }
    if (isServerApp(rel)) {
      if (/^@ua\/(core|ui|ui-react|feature-)/.test(spec) || spec === '@ua/quiz-content') report('server imports an app/UI/feature package');
      if (spec.startsWith('apps/') || spec.startsWith('@/')) report('server imports an app');
    }
    if (isMobileApp(rel)) {
      if (/^@ua\/(server-kit|ui-react)/.test(spec)) report('mobile imports a server or DOM package');
      if (spec.startsWith('apps/') || spec.startsWith('@/src/server')) report('mobile imports another app');
    }
    if (isNeutralPackage(rel)) {
      if (/^(react|react-dom|react-native|expo|@expo\/|@react-native|react-native-)/.test(spec)) report('neutral package imports a UI runtime');
      if (spec.startsWith('node:') && !rel.includes('/test/')) report('neutral package imports a Node built-in');
    }
    if (isNodePackage(rel)) {
      if (/^(react|react-dom|react-native|expo|@expo\/|@react-native|react-native-)/.test(spec)) report('server-kit imports a UI runtime');
    }
    if (isReactNativePackage(rel)) {
      if (spec.startsWith('node:')) report('React Native package imports a Node built-in');
    }
  }
}

if (violations.length) {
  console.error(`Boundary violations (${violations.length}):`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
console.log(`boundaries ok (${FILES.length} files)`);
