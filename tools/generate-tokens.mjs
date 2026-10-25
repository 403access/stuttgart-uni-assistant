#!/usr/bin/env node
/** Generate the shared theme module and CSS custom properties from tokens.json. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'packages', 'design-tokens', 'tokens.json');
const OUT = path.join(ROOT, 'packages', 'design-tokens', 'generated');
const CHECK = process.argv.includes('--check');
const tokens = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

function themeSource() {
  const keys = Object.keys(tokens.colors.light);
  const type = keys.map((key) => `  ${key}: string;`).join('\n');
  const value = (palette) => keys.map((key) => `  ${key}: ${JSON.stringify(palette[key])},`).join('\n');
  return `/** GENERATED FILE — run \`bun run tokens\` after editing tokens.json. */
export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
${type}
};

export const lightColors: ThemeColors = {
${value(tokens.colors.light)}
};

export const darkColors: ThemeColors = {
${value(tokens.colors.dark)}
};

export const themes: Record<ThemeMode, ThemeColors> = { light: lightColors, dark: darkColors };

export const space = ${JSON.stringify(tokens.space, null, 2)} as const;
export const radius = ${JSON.stringify(tokens.radius, null, 2)} as const;
`;
}

function cssBlock(palette) {
  return Object.entries(palette)
    .map(([key, value]) => `  --color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`)
    .join('\n');
}

const aliases = `  --brand: var(--color-brand);
  --brand-strong: var(--color-blue);
  --brand-soft: var(--color-blue-soft);
  --accent: var(--color-light);
  --accent-soft: var(--color-light-soft);
  --bg: var(--color-mist);
  --surface: var(--color-paper);
  --surface-2: var(--color-mist);
  --surface-3: var(--color-line);
  --text: var(--color-anthracite);
  --text-muted: var(--color-ink-soft);
  --text-subtle: var(--color-mute);
  --line: var(--color-line);
  --ok: var(--color-success);
  --ok-bg: var(--color-success-soft);
  --warn: var(--color-warning);
  --warn-bg: var(--color-warning-soft);
  --danger: var(--color-danger);
  --danger-bg: var(--color-danger-soft);
  --info: var(--color-blue);
  --info-bg: var(--color-blue-soft);`;

function cssSource() {
  return `/* GENERATED FILE — run \`bun run tokens\` after editing tokens.json. */
:root {
${cssBlock(tokens.colors.light)}
${aliases}
  color-scheme: light;
}

[data-theme="dark"] {
${cssBlock(tokens.colors.dark)}
  color-scheme: dark;
}
`;
}

function jsSource(css) {
  return `/** GENERATED FILE — run \`bun run tokens\` after editing tokens.json. */
export const tokens = ${JSON.stringify(tokens, null, 2)};
export const tokensCss = ${JSON.stringify(css)};
`;
}

const theme = themeSource();
const css = cssSource();
const js = jsSource(css);
const declaration = `/** GENERATED FILE — run \`bun run tokens\` after editing tokens.json. */
export interface Tokens {
  colors: { light: Record<string, string>; dark: Record<string, string> };
  space: Record<string, number>;
  radius: Record<string, number>;
}
export declare const tokens: Tokens;
export declare const tokensCss: string;
`;

const outputs = [
  [path.join(OUT, 'theme.ts'), theme],
  [path.join(OUT, 'tokens.css'), css],
  [path.join(OUT, 'tokens.js'), js],
  [path.join(OUT, 'tokens.d.ts'), declaration],
];

fs.mkdirSync(OUT, { recursive: true });
let stale = false;
for (const [file, content] of outputs) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current !== content) {
    stale = true;
    if (!CHECK) fs.writeFileSync(file, content);
  }
}
if (CHECK) {
  if (stale) {
    console.error('Design tokens are stale. Run `bun run tokens`.');
    process.exit(1);
  }
  console.log('design tokens are current');
} else {
  console.log('wrote design tokens');
}
