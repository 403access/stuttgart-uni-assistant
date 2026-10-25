import assert from 'node:assert/strict';
import { test } from 'node:test';

const { iliasPreviewKind, previewKindFromParams } = await import('../apps/mobile/src/ilias/files.ts');

function fileRow(overrides = {}) {
  return {
    id: 'file-1',
    kind: 'file',
    type: '',
    refId: 4665501,
    title: 'Folien',
    description: '',
    url: 'https://ilias3.uni-stuttgart.de/ilias.php?cmd=sendfile&ref_id=4665501',
    properties: [],
    date: '',
    size: '',
    pages: '',
    downloadable: true,
    ...overrides,
  };
}

test('PDF, PPTX, and DOCX repository rows open in the in-app reader', () => {
  assert.equal(iliasPreviewKind(fileRow({ type: 'pdf' })), 'pdf');
  assert.equal(iliasPreviewKind(fileRow({ type: 'PPTX' })), 'pptx');
  assert.equal(iliasPreviewKind(fileRow({ type: 'docx' })), 'docx');
  assert.equal(iliasPreviewKind(fileRow({ title: 'Vorlesung 1.PDF' })), 'pdf');
  assert.equal(iliasPreviewKind(fileRow({ title: 'Vorlesung 1.pptx' })), 'pptx');
  assert.equal(iliasPreviewKind(fileRow({ title: 'Notizen.docx' })), 'docx');
  assert.equal(
    iliasPreviewKind(fileRow({ properties: [{ name: 'Dateityp', value: 'pptx' }] })),
    'pptx',
  );
  assert.equal(
    iliasPreviewKind(fileRow({ properties: [{ name: 'Dateityp', value: 'docx' }] })),
    'docx',
  );
});

test('only files with a ref id are previewable', () => {
  assert.equal(iliasPreviewKind(fileRow({ kind: 'grp', type: 'pptx' })), null);
  assert.equal(iliasPreviewKind(fileRow({ refId: null, type: 'pptx' })), null);
  assert.equal(iliasPreviewKind(fileRow({ type: 'xlsx' })), null);
});

test('the file screen recovers the format from its route params', () => {
  assert.equal(previewKindFromParams('pptx', 'Folien'), 'pptx');
  assert.equal(previewKindFromParams('docx', 'Notizen'), 'docx');
  assert.equal(previewKindFromParams('', 'Skript.pdf'), 'pdf');
  assert.equal(previewKindFromParams('Datei', 'Skript.pdf'), 'pdf');
  assert.equal(previewKindFromParams('Datei', 'Notizen.docx'), 'docx');
  assert.equal(previewKindFromParams('Datei', 'Notizen'), null);
});
