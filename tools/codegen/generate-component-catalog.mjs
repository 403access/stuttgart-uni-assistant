#!/usr/bin/env node
/**
 * Build the component catalog from the TypeScript AST.
 *
 * The app cannot scan its own source at runtime (and should not on a phone), so
 * this script writes the inventory once and the dev screen reads the generated
 * data. The same data is rendered as an engineering docs page.
 *
 * Run `bun run catalog:components` after changing a component or a usage.
 * `bun run check:components` verifies that both generated files are current.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'apps', 'mobile', 'app');
const SRC_DIR = path.join(ROOT, 'apps', 'mobile', 'src');
const UI_DIR = path.join(ROOT, 'packages', 'ui', 'src');
const FEATURES_DIR = path.join(ROOT, 'packages', 'features');
const FEATURE_UI_DIRS = fs.readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(FEATURES_DIR, entry.name, 'src', 'ui'))
  .filter((dir) => fs.existsSync(dir));
const FEATURE_UI_INDEXES = FEATURE_UI_DIRS.map((dir) => path.relative(ROOT, path.join(dir, '..', 'ui.ts')).split(path.sep).join('/'));
const TS_OUT = path.join(SRC_DIR, 'components', 'catalog.generated.ts');
const MD_OUT = path.join(ROOT, 'docs', 'engineering', 'component-catalog.md');
const ADMIN_JSON_OUT = path.join(ROOT, 'apps', 'admin', 'src', 'generated', 'component-catalog.json');
const CHECK = process.argv.includes('--check');

/** Sources that describe the catalog itself must not inflate the usage counts. */
const IGNORED_USAGE_FILES = new Set([
  'apps/mobile/src/components/catalog.generated.ts',
  'apps/mobile/src/components/component-previews.tsx',
  'apps/mobile/app/dev/components.tsx',
]);

const CATEGORY_ORDER = ['shared', 'feature', 'provider'];
const CATEGORY_LABEL = {
  shared: 'Shared UI',
  feature: 'Feature components',
  provider: 'App-wide providers',
};

function toRel(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

function baseFromRel(rel) {
  return rel.replace(/\.(web|native)\.(tsx|ts)$/, '').replace(/\.(tsx|ts)$/, '');
}

function lineOf(node) {
  const source = node.getSourceFile();
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function hasModifier(node, kind) {
  return Boolean(
    ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind),
  );
}

const hasExport = (node) => hasModifier(node, ts.SyntaxKind.ExportKeyword);
const hasDefault = (node) => hasModifier(node, ts.SyntaxKind.DefaultKeyword);

function kindForName(name) {
  if (/^[A-Z][A-Z0-9_]+$/.test(name)) return 'constant';
  if (/^use[A-Z0-9]/.test(name)) return 'hook';
  if (/^[A-Z]/.test(name)) return 'component';
  return 'helper';
}

function pascalFromBase(base) {
  return (base.split('/').pop() ?? 'Component')
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function collectExports(file) {
  const exports = [];

  function add(name, kind, isDefault = false, isReExport = false) {
    if (!name) return;
    const existing = exports.find((item) => item.name === name);
    if (existing) {
      // A local declaration wins over a barrel re-export of the same name.
      if (!isReExport) existing.isReExport = false;
      existing.isDefault ||= isDefault;
      return;
    }
    exports.push({ name, kind, isDefault, isReExport });
  }

  for (const statement of file.source.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      if (!hasExport(statement) && !hasDefault(statement)) continue;
      const name = statement.name?.text ?? pascalFromBase(baseFromRel(file.rel));
      add(name, kindForName(name), hasDefault(statement));
      continue;
    }

    if (ts.isClassDeclaration(statement)) {
      if (!hasExport(statement) && !hasDefault(statement)) continue;
      const name = statement.name?.text ?? pascalFromBase(baseFromRel(file.rel));
      add(name, kindForName(name), hasDefault(statement));
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExport(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const name = declaration.name.text;
        const initializer = declaration.initializer;
        const callable =
          initializer &&
          (ts.isArrowFunction(initializer) ||
            ts.isFunctionExpression(initializer) ||
            ts.isClassExpression(initializer));
        if (!callable && !/^[A-Z]/.test(name) && !/^use[A-Z0-9]/.test(name)) continue;
        add(name, kindForName(name));
      }
      continue;
    }

    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      const name = ts.isIdentifier(statement.expression)
        ? statement.expression.text
        : pascalFromBase(baseFromRel(file.rel));
      add(name, kindForName(name), true);
      continue;
    }

    // `export { Foo } from './bar'` (and `export { default } from './bar'`).
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (element.isTypeOnly) continue;
        const exported = element.name.text;
        const name = exported === 'default' ? pascalFromBase(baseFromRel(file.rel)) : exported;
        add(name, kindForName(name), exported === 'default', true);
      }
    }
  }

  return exports;
}

function resolveModule(fromRel, specifier) {
  const featureUi = specifier.match(/^@ua\/feature-([^/]+)\/ui$/);
  if (featureUi) {
    const rel = `packages/features/${featureUi[1]}/src/ui.ts`;
    if (fs.existsSync(path.join(ROOT, rel))) return { base: baseFromRel(rel), file: rel };
    return null;
  }
  if (specifier === '@ua/ui') {
    const rel = 'packages/ui/src/index.ts';
    return { base: baseFromRel(rel), file: rel };
  }
  if (specifier.startsWith('@ua/ui/')) {
    const name = specifier.slice('@ua/ui/'.length);
    for (const ext of ['.tsx', '.ts']) {
      const rel = `packages/ui/src/${name}${ext}`;
      if (fs.existsSync(path.join(ROOT, rel))) return { base: baseFromRel(rel), file: rel };
    }
    return null;
  }
  if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return null;
  const absolute = specifier.startsWith('@/')
    ? path.join(ROOT, 'apps', 'mobile', specifier.slice(2))
    : path.resolve(ROOT, path.dirname(fromRel), specifier);
  const rel = toRel(absolute);
  const withoutExtension = rel.replace(/\.(web|native)?\.(tsx?|jsx?)$/, '');
  const candidates = [
    `${withoutExtension}.tsx`,
    `${withoutExtension}.web.tsx`,
    `${withoutExtension}.native.tsx`,
    `${withoutExtension}.ts`,
    `${withoutExtension}.web.ts`,
    `${withoutExtension}.native.ts`,
    `${withoutExtension}/index.tsx`,
    `${withoutExtension}/index.ts`,
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(ROOT, candidate))) {
      return { base: baseFromRel(candidate.replace(/\.ts$/, '.tsx')), file: candidate };
    }
  }
  if (fs.existsSync(path.join(ROOT, rel))) {
    return { base: baseFromRel(rel), file: rel };
  }
  return null;
}

function collectPreviewNames() {
  const previewFile = path.join(ROOT, 'apps', 'mobile', 'src', 'components', 'component-previews.tsx');
  if (!fs.existsSync(previewFile)) return new Set();
  const text = fs.readFileSync(previewFile, 'utf8');
  const source = ts.createSourceFile('component-previews.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'COMPONENT_PREVIEWS') continue;
      if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) continue;
      for (const property of declaration.initializer.properties) {
        if (
          (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
          (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ) {
          names.add(property.name.text);
        }
      }
    }
  }
  return names;
}

function categoryFor(base) {
  if (base.startsWith('apps/mobile/src/components/') || base.startsWith('packages/ui/src/')) return 'shared';
  if (base.startsWith('packages/features/')) return 'feature';
  if (/^apps\/mobile\/src\/[^/]+\/components\//.test(base)) return 'feature';
  if (/provider|state|client|progress|refresh|auto-connect|headless/i.test(base)) return 'provider';
  return 'feature';
}

function isTypePosition(node) {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (
      ts.isTypeQueryNode(parent) ||
      ts.isTypeReferenceNode(parent) ||
      ts.isExpressionWithTypeArguments(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeParameterDeclaration(parent)
    ) {
      return true;
    }
    if (
      ts.isStatement(parent) ||
      ts.isExpression(parent) ||
      ts.isJsxExpression(parent) ||
      ts.isBlock(parent)
    ) {
      return false;
    }
    current = parent;
  }
  return false;
}

function occurrenceKey(file, line, kind, exportName) {
  return `${file}\u0000${line}\u0000${kind}\u0000${exportName}`;
}

function addOccurrence(entry, file, line, kind, exportName, count = 1) {
  const key = occurrenceKey(file, line, kind, exportName);
  const existing = entry.occurrenceMap.get(key);
  if (existing) existing.count += count;
  else entry.occurrenceMap.set(key, { file, line, kind, exportName, count });
}

function finalizeEntry(entry) {
  const occurrences = [...entry.occurrenceMap.values()].sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.exportName.localeCompare(b.exportName);
  });
  const sum = (predicate) =>
    occurrences.filter(predicate).reduce((total, occurrence) => total + occurrence.count, 0);
  const importCount = sum((o) => o.kind === 'import' || o.kind === 'type');
  const renderCount = sum((o) => o.kind === 'render');
  const callCount = sum((o) => o.kind === 'call');
  const referenceCount = sum((o) => o.kind === 'reference');
  const usageCount = renderCount + callCount + referenceCount;
  const usedBy = [...new Set(occurrences.map((occurrence) => occurrence.file))].sort();
  delete entry.occurrenceMap;
  return {
    ...entry,
    occurrences,
    usedBy,
    usageCount,
    importCount,
    renderCount,
    callCount,
    referenceCount,
    onlyImported: usageCount === 0 && importCount > 0,
    unused: usageCount === 0 && importCount === 0,
  };
}

// ---------------------------------------------------------------------------
// Parse every TSX file once.
// ---------------------------------------------------------------------------

const allFiles = [...walk(APP_DIR), ...walk(SRC_DIR), ...walk(UI_DIR), ...FEATURE_UI_DIRS.flatMap((dir) => walk(dir)), 'packages/ui/src/index.ts', ...FEATURE_UI_INDEXES]
  .map(toRel)
  .filter((rel) => !IGNORED_USAGE_FILES.has(rel))
  .sort();

const parsed = new Map();
for (const rel of allFiles) {
  const abs = path.join(ROOT, rel);
  const text = fs.readFileSync(abs, 'utf8');
  parsed.set(rel, {
    rel,
    text,
    source: ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
  });
}

// ---------------------------------------------------------------------------
// Build entries from src/**/*.tsx. Route files in app/ are usage sites, not
// catalog entries: their imports come from the router, not from other code.
// ---------------------------------------------------------------------------

const previewNames = collectPreviewNames();

const groups = new Map();
for (const file of parsed.values()) {
  if (!file.rel.startsWith('apps/mobile/src/') && !file.rel.startsWith('packages/ui/src/') && !file.rel.startsWith('packages/features/')) continue;
  const exports = collectExports(file);
  // A barrel such as src/state/AppState.tsx only re-exports. The component
  // belongs to the file that declares it, so the barrel is not an entry.
  if (!exports.some((entry) => entry.kind === 'component' && !entry.isReExport)) continue;
  const base = baseFromRel(file.rel);
  if (!groups.has(base)) groups.set(base, []);
  groups.get(base).push({ file, exports, variant: file.rel.match(/\.(web|native)\.tsx$/)?.[1] ?? 'base' });
}

const entries = [...groups.entries()].map(([base, members]) => {
  const baseMember = members.find((member) => member.variant === 'base') ?? null;
  const webMember = members.find((member) => member.variant === 'web') ?? null;
  const nativeMember = members.find((member) => member.variant === 'native') ?? null;
  const variants = [];

  if (baseMember) {
    const platform = webMember && !nativeMember ? 'native' : nativeMember && !webMember ? 'web' : 'shared';
    variants.push({ platform, file: baseMember.file.rel });
  }
  if (webMember) variants.push({ platform: 'web', file: webMember.file.rel });
  if (nativeMember) variants.push({ platform: 'native', file: nativeMember.file.rel });

  const exportMap = new Map();
  for (const member of members) {
    for (const item of member.exports) {
      const existing = exportMap.get(item.name);
      if (existing) {
        existing.isDefault ||= item.isDefault;
        existing.isReExport &&= item.isReExport;
      } else {
        exportMap.set(item.name, { ...item });
      }
    }
  }
  const exports = [...exportMap.values()].sort((a, b) => {
    const order = { component: 0, hook: 1, constant: 2, helper: 3 };
    return order[a.kind] - order[b.kind] || a.name.localeCompare(b.name);
  });
  const componentExports = exports.filter((entry) => entry.kind === 'component' && !entry.isReExport);
  const defaultExport =
    exports.find((entry) => entry.isDefault && !entry.isReExport)?.name ?? null;
  const previews = exports
    .filter((entry) => previewNames.has(entry.name))
    .map((entry) => entry.name);
  const platforms = [];
  for (const variant of variants) {
    if (variant.platform === 'shared') {
      platforms.push('native', 'web');
    } else {
      platforms.push(variant.platform);
    }
  }

  return {
    id: base,
    name: componentExports.length === 1 && exports.length === 1 ? componentExports[0].name : base.split('/').pop(),
    category: categoryFor(base),
    file: baseMember?.file.rel ?? variants[0].file,
    variants,
    platforms: [...new Set(platforms)].sort((a, b) => (a === 'native' ? -1 : b === 'native' ? 1 : 0)),
    hasPlatformVariants: variants.length > 1 || new Set(platforms).size < 2,
    exports,
    previews,
    defaultExport,
    occurrenceMap: new Map(),
  };
});

const entryByBase = new Map(entries.map((entry) => [entry.id, entry]));

// ---------------------------------------------------------------------------
// Re-export barrels (for example src/state/AppState.tsx) so an import through
// a barrel still points at the file that defines the component.
// ---------------------------------------------------------------------------

const reExports = new Map();
for (const file of parsed.values()) {
  const sourceBase = baseFromRel(file.rel);
  const map = new Map();
  for (const statement of file.source.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.isTypeOnly ||
      !statement.moduleSpecifier ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      continue;
    }
    const resolved = resolveModule(file.rel, statement.moduleSpecifier.text);
    if (!resolved) continue;
    for (const element of statement.exportClause.elements) {
      if (element.isTypeOnly) continue;
      const exported = element.name.text;
      const imported = element.propertyName?.text ?? element.name.text;
      map.set(exported, {
        targetBase: resolved.base,
        importedName: imported,
        sourceRel: file.rel,
        line: lineOf(element),
      });
    }
  }
  if (map.size > 0) reExports.set(sourceBase, map);
}

function lookupExport(entry, name) {
  if (!entry) return null;
  const direct = entry.exports.find((item) => item.name === name);
  if (direct) return direct;
  if (name === 'default' && entry.defaultExport) {
    return entry.exports.find((item) => item.name === entry.defaultExport) ?? null;
  }
  return null;
}

function resolveImport(base, importedName, depth = 0) {
  if (depth > 4) return null;
  const direct = lookupExport(entryByBase.get(base), importedName);
  if (direct) return { entry: entryByBase.get(base), exportName: direct.name };
  const redirected = reExports.get(base)?.get(importedName);
  if (!redirected) return null;
  const target = lookupExport(entryByBase.get(redirected.targetBase), redirected.importedName);
  if (target) return { entry: entryByBase.get(redirected.targetBase), exportName: target.name };
  if (redirected.importedName === 'default') {
    const targetEntry = entryByBase.get(redirected.targetBase);
    if (targetEntry?.defaultExport) {
      return { entry: targetEntry, exportName: targetEntry.defaultExport };
    }
  }
  return resolveImport(redirected.targetBase, redirected.importedName, depth + 1);
}

// Record the barrel line too: it is a real place where the component is used.
for (const map of reExports.values()) {
  for (const redirected of map.values()) {
    const target = lookupExport(entryByBase.get(redirected.targetBase), redirected.importedName);
    if (!target) continue;
    addOccurrence(
      entryByBase.get(redirected.targetBase),
      redirected.sourceRel,
      redirected.line,
      're-export',
      target.name,
    );
  }
}

// ---------------------------------------------------------------------------
// Find usages in app/ and src/.
// ---------------------------------------------------------------------------

for (const file of parsed.values()) {
  const localBindings = new Map();
  const namespaceBindings = new Map();
  const skipped = new Set();

  for (const statement of file.source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier.text;
    const resolved = resolveModule(file.rel, specifier);
    if (!resolved) continue;
    const clause = statement.importClause;
    if (!clause) continue;

    if (clause.name) {
      const target = resolveImport(resolved.base, 'default');
      if (target && target.entry) {
        const kind = clause.isTypeOnly ? 'type' : 'import';
        addOccurrence(target.entry, file.rel, lineOf(clause.name), kind, target.exportName);
        if (!clause.isTypeOnly) localBindings.set(clause.name.text, target);
      }
    }

    if (!clause.namedBindings) continue;

    if (ts.isNamespaceImport(clause.namedBindings)) {
      const entry = entryByBase.get(resolved.base);
      if (entry) {
        const kind = clause.isTypeOnly ? 'type' : 'import';
        addOccurrence(entry, file.rel, lineOf(clause.namedBindings), kind, '*');
        if (!clause.isTypeOnly) namespaceBindings.set(clause.namedBindings.name.text, entry);
      }
      continue;
    }

    for (const element of clause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      const target = resolveImport(resolved.base, imported);
      if (!target || !target.entry) continue;
      const typeOnly = clause.isTypeOnly || element.isTypeOnly;
      addOccurrence(
        target.entry,
        file.rel,
        lineOf(element),
        typeOnly ? 'type' : 'import',
        target.exportName,
      );
      if (!typeOnly) localBindings.set(element.name.text, target);
    }
  }

  function markTag(tagName) {
    if (ts.isIdentifier(tagName)) {
      skipped.add(tagName);
      return;
    }
    if (ts.isPropertyAccessExpression(tagName)) {
      skipped.add(tagName);
      if (ts.isIdentifier(tagName.expression)) skipped.add(tagName.expression);
      skipped.add(tagName.name);
    }
  }

  function recordTag(tagName) {
    if (ts.isIdentifier(tagName)) {
      const target = localBindings.get(tagName.text);
      if (target?.entry) {
        addOccurrence(target.entry, file.rel, lineOf(tagName), 'render', target.exportName);
      }
      return;
    }
    if (ts.isPropertyAccessExpression(tagName)) {
      const namespace = ts.isIdentifier(tagName.expression)
        ? namespaceBindings.get(tagName.expression.text)
        : null;
      if (!namespace) return;
      const target = lookupExport(namespace, tagName.name.text);
      if (target) addOccurrence(namespace, file.rel, lineOf(tagName.name), 'render', target.name);
    }
  }

  // Tag names are handled explicitly so a closing tag is not counted twice and
  // a JSX tag is not also counted as a plain identifier reference.
  function collectTags(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      recordTag(node.tagName);
      markTag(node.tagName);
    } else if (ts.isJsxClosingElement(node)) {
      markTag(node.tagName);
    }
    ts.forEachChild(node, collectTags);
  }

  collectTags(file.source);

  function handleIdentifier(node) {
    if (skipped.has(node) || isTypePosition(node)) return;
    const parent = node.parent;

    // Declarations, labels, and re-export/import clauses are not uses. A
    // shorthand property (`{ Card }`) still reaches this function through the
    // identifier itself, which is why this is a name check and not a blanket
    // parent check.
    if (
      ts.isImportSpecifier(parent) ||
      ts.isImportClause(parent) ||
      ts.isNamespaceImport(parent) ||
      ts.isImportDeclaration(parent) ||
      ts.isExportSpecifier(parent) ||
      ts.isExportAssignment(parent)
    ) {
      return;
    }
    if (
      (ts.isPropertyAssignment(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isJsxAttribute(parent) ||
        ts.isBindingElement(parent) ||
        ts.isVariableDeclaration(parent) ||
        ts.isParameter(parent) ||
        ts.isFunctionDeclaration(parent) ||
        ts.isFunctionExpression(parent) ||
        ts.isClassDeclaration(parent)) &&
      parent.name === node
    ) {
      return;
    }

    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return;

    if (ts.isIdentifier(node) && namespaceBindings.has(node.text)) {
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
        const namespace = namespaceBindings.get(node.text);
        const target = lookupExport(namespace, parent.name.text);
        if (!target) return;
        const call =
          (ts.isCallExpression(parent.parent) || ts.isNewExpression(parent.parent)) &&
          parent.parent.expression === parent;
        addOccurrence(namespace, file.rel, lineOf(parent.name), call ? 'call' : 'reference', target.name);
      }
      return;
    }

    const target = localBindings.get(node.text);
    if (!target || !target.entry) return;
    const call =
      (ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === node;
    addOccurrence(target.entry, file.rel, lineOf(node), call ? 'call' : 'reference', target.exportName);
  }

  function visit(node) {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node)) handleIdentifier(node);
    ts.forEachChild(node, visit);
  }

  visit(file.source);
}

const finalized = entries.map(finalizeEntry).sort((a, b) => {
  const category = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  if (category !== 0) return category;
  if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
  return a.name.localeCompare(b.name);
});

const stats = {
  components: finalized.length,
  exports: finalized.reduce((total, entry) => total + entry.exports.length, 0),
  occurrences: finalized.reduce((total, entry) => total + entry.occurrences.length, 0),
  usageCount: finalized.reduce((total, entry) => total + entry.usageCount, 0),
  files: new Set(finalized.flatMap((entry) => entry.usedBy)).size,
  unused: finalized.filter((entry) => entry.unused).length,
  onlyImported: finalized.filter((entry) => entry.onlyImported).length,
  platformVariants: finalized.filter((entry) => entry.hasPlatformVariants).length,
  previewable: finalized.filter((entry) => entry.previews.length > 0).length,
  categories: Object.fromEntries(
    CATEGORY_ORDER.map((category) => [
      category,
      finalized.filter((entry) => entry.category === category).length,
    ]),
  ),
};

const catalog = {
  generatedBy: 'tools/codegen/generate-component-catalog.mjs',
  stats,
  entries: finalized,
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const TS_HEADER = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Run \`bun run catalog:components\` after adding or moving a component or
 * changing where one is used. \`bun run check:components\` verifies this file.
 */
`;

const tsSource = `${TS_HEADER}\nexport type ComponentCatalogCategory = 'shared' | 'feature' | 'provider';
export type ComponentCatalogPlatform = 'native' | 'web';
export type ComponentCatalogExportKind = 'component' | 'hook' | 'helper' | 'constant';
export type ComponentCatalogUsageKind =
  | 'import'
  | 'type'
  | 'render'
  | 'call'
  | 'reference'
  | 're-export';

export type ComponentCatalogExport = {
  name: string;
  kind: ComponentCatalogExportKind;
  isDefault: boolean;
  isReExport: boolean;
};

export type ComponentCatalogVariant = {
  platform: 'shared' | 'native' | 'web';
  file: string;
};

export type ComponentCatalogOccurrence = {
  file: string;
  line: number;
  kind: ComponentCatalogUsageKind;
  exportName: string;
  count: number;
};

export type ComponentCatalogEntry = {
  id: string;
  name: string;
  category: ComponentCatalogCategory;
  file: string;
  variants: ComponentCatalogVariant[];
  platforms: ComponentCatalogPlatform[];
  hasPlatformVariants: boolean;
  exports: ComponentCatalogExport[];
  previews: string[];
  defaultExport: string | null;
  occurrences: ComponentCatalogOccurrence[];
  usedBy: string[];
  usageCount: number;
  importCount: number;
  renderCount: number;
  callCount: number;
  referenceCount: number;
  onlyImported: boolean;
  unused: boolean;
};

export type ComponentCatalog = {
  generatedBy: string;
  stats: {
    components: number;
    exports: number;
    occurrences: number;
    usageCount: number;
    files: number;
    unused: number;
    onlyImported: number;
    platformVariants: number;
    previewable: number;
    categories: Record<ComponentCatalogCategory, number>;
  };
  entries: ComponentCatalogEntry[];
};

export const COMPONENT_CATALOG: ComponentCatalog = ${JSON.stringify(catalog, null, 2)};
`;

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|');
}

function inlineCode(value) {
  return `\`${String(value).replace(/`/g, '\\`')}\``;
}

function platformLabel(entry) {
  if (entry.platforms.length === 2) {
    return entry.hasPlatformVariants ? 'Native + Web (split)' : 'Native + Web';
  }
  return entry.platforms[0] === 'web' ? 'Web only' : 'Native only';
}

function renderMarkdown() {
  const lines = [];
  lines.push('---');
  lines.push('title: Component catalog');
  lines.push('sidebar_label: Component catalog');
  lines.push('hide_table_of_contents: true');
  lines.push('---');
  lines.push('');
  lines.push('<!-- GENERATED FILE — do not edit by hand. Run `bun run catalog:components`. -->');
  lines.push('');
  lines.push('# Component catalog');
  lines.push('');
  lines.push(
    'Every component under `src/` with its exports, platform files, and every place it is imported, rendered, called, or referenced. The page is generated from the TypeScript AST by `tools/codegen/generate-component-catalog.mjs`. The in-app view with live previews is **Dev → Komponenten** (`/dev/components`); the operator inventory is **Komponenten** (`/admin#/components`). The **Preview** column names the exports with a live demo; the admin page links them to the Expo web app on port 8081.',
  );
  lines.push('');
  lines.push(
    '`render` is a JSX tag, `call` is a direct invocation, `reference` is an identifier passed as a value (for example `component={Screen}`), `import` and `type` are import statements, and `re-export` is a barrel line such as `src/state/AppState.tsx`. The catalog sources themselves are excluded so the counts do not include this page.',
  );
  lines.push('');
  lines.push('> Run `bun run catalog:components` after changing a component or a usage. `bun run check:components` fails when this page or `apps/mobile/src/components/catalog.generated.ts` is stale.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Components | ${stats.components} |`);
  lines.push(`| Exports | ${stats.exports} |`);
  lines.push(`| Usage references | ${stats.usageCount} |`);
  lines.push(`| Files with occurrences | ${stats.files} |`);
  lines.push(`| Unused components | ${stats.unused} |`);
  lines.push(`| Imported but never used | ${stats.onlyImported} |`);
  lines.push(`| Components with platform files | ${stats.platformVariants} |`);
  lines.push(`| Components with live previews | ${stats.previewable} |`);
  for (const category of CATEGORY_ORDER) {
    lines.push(`| ${CATEGORY_LABEL[category]} | ${stats.categories[category]} |`);
  }
  lines.push('');

  for (const category of CATEGORY_ORDER) {
    const group = finalized.filter((entry) => entry.category === category);
    if (group.length === 0) continue;
    lines.push(`## ${CATEGORY_LABEL[category]}`);
    lines.push('');
    lines.push('| Component | File | Platform | Preview | Exports | Usages | Files |');
    lines.push('| --- | --- | --- | --- | --- | ---: | ---: |');
    for (const entry of group) {
      lines.push(
        `| ${escapeTable(inlineCode(entry.name))} | ${escapeTable(inlineCode(entry.file))} | ${escapeTable(platformLabel(entry))} | ${escapeTable(
          entry.previews.length ? entry.previews.join(', ') : '–',
        )} | ${escapeTable(entry.exports.map((item) => item.name).join(', '))} | ${entry.usageCount} | ${entry.usedBy.length} |`,
      );
    }
    lines.push('');

    for (const entry of group) {
      lines.push(`### ${entry.name}`);
      lines.push('');
      lines.push(`- File: ${inlineCode(entry.file)}`);
      if (entry.variants.length > 1) {
        lines.push(
          `- Platform files: ${entry.variants
            .map((variant) => `${inlineCode(variant.file)} (${variant.platform})`)
            .join(', ')}`,
        );
      }
      lines.push(`- Category: ${CATEGORY_LABEL[entry.category]}`);
      lines.push(
        `- Exports: ${entry.exports
          .map((item) => `${inlineCode(item.name)} (${item.kind})`)
          .join(', ')}`,
      );
      if (entry.previews.length > 0) {
        lines.push(`- Live preview in the app: ${entry.previews.map(inlineCode).join(', ')}`);
      }
      const references = entry.usageCount === 1 ? 'reference' : 'references';
      const files = entry.usedBy.length === 1 ? 'file' : 'files';
      lines.push(`- Usages: ${entry.usageCount} ${references} in ${entry.usedBy.length} ${files}`);
      if (entry.unused) lines.push('- **Unused:** no import or reference was found.');
      else if (entry.onlyImported) lines.push('- **Only imported:** no render, call, or reference was found.');
      lines.push('');

      if (entry.occurrences.length === 0) {
        lines.push('_No occurrences found._');
        lines.push('');
        continue;
      }

      const byFile = new Map();
      for (const occurrence of entry.occurrences) {
        if (!byFile.has(occurrence.file)) byFile.set(occurrence.file, []);
        byFile.get(occurrence.file).push(occurrence);
      }
      for (const [file, occurrences] of byFile) {
        const parts = occurrences.map((occurrence) => {
          const count = occurrence.count > 1 ? ` ×${occurrence.count}` : '';
          return `${occurrence.line} ${occurrence.kind} ${inlineCode(occurrence.exportName)}${count}`;
        });
        lines.push(`- ${inlineCode(file)}: ${parts.join('; ')}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

const mdSource = renderMarkdown();

const adminJson = `${JSON.stringify(catalog, null, 2)}\n`;



if (CHECK) {
  const problems = [];
  for (const [file, expected] of [
    [TS_OUT, tsSource],
    [MD_OUT, mdSource],
    [ADMIN_JSON_OUT, adminJson],
  ]) {
    const actual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (actual !== expected) problems.push(toRel(file));
  }
  if (problems.length > 0) {
    console.error(`Component catalog is stale: ${problems.join(', ')}`);
    console.error('Run `bun run catalog:components` and commit the result.');
    process.exit(1);
  }
  console.log('component catalog is current');
  process.exit(0);
}

fs.mkdirSync(path.dirname(TS_OUT), { recursive: true });
fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
fs.mkdirSync(path.dirname(ADMIN_JSON_OUT), { recursive: true });
fs.writeFileSync(TS_OUT, tsSource);
fs.writeFileSync(MD_OUT, mdSource);
fs.writeFileSync(ADMIN_JSON_OUT, adminJson);
console.log(
  `catalog: ${stats.components} components, ${stats.exports} exports, ${stats.usageCount} usage references`,
);
console.log(`wrote ${toRel(TS_OUT)}`);
console.log(`wrote ${toRel(MD_OUT)}`);
console.log(`wrote ${toRel(ADMIN_JSON_OUT)}`);
