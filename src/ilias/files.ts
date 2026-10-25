import type { IliasContentItem } from './types';

/** A file format the in-app viewer understands. */
export type IliasPreviewKind = 'pdf' | 'pptx' | 'docx';

function extensionKind(value: string): IliasPreviewKind | null {
  const extension = value.trim().toLowerCase().replace(/^\./, '');
  if (extension === 'pdf') return 'pdf';
  if (extension === 'pptx') return 'pptx';
  if (extension === 'docx') return 'docx';
  return null;
}

/** The format carried by the file screen's route params. */
export function previewKindFromParams(type: string, title: string): IliasPreviewKind | null {
  const fromType = extensionKind(type);
  if (fromType) return fromType;
  if (/\.pdf$/i.test(title.trim())) return 'pdf';
  if (/\.pptx$/i.test(title.trim())) return 'pptx';
  if (/\.docx$/i.test(title.trim())) return 'docx';
  return null;
}

/**
 * Is this row a PDF, PPTX, or DOCX the app can render? The content parser
 * stores the file extension in `type`; older pages only expose it in a property
 * value or the title.
 */
export function iliasPreviewKind(item: IliasContentItem): IliasPreviewKind | null {
  if (item.kind !== 'file' || !item.refId) return null;
  const fromType = extensionKind(item.type);
  if (fromType) return fromType;
  if (/\.pdf$/i.test(item.title.trim())) return 'pdf';
  if (/\.pptx$/i.test(item.title.trim())) return 'pptx';
  if (/\.docx$/i.test(item.title.trim())) return 'docx';
  for (const property of item.properties) {
    const fromProperty = extensionKind(property.value);
    if (fromProperty) return fromProperty;
  }
  return null;
}
