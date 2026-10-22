import type { IliasContentItem } from './types';

const PDF_TITLE = /\.pdf$/i;

/**
 * Is this row a PDF the app can render? The content parser stores the file
 * extension in `type`; older pages only expose it in a property value or the
 * title.
 */
export function isPdfItem(item: IliasContentItem): boolean {
  if (item.kind !== 'file' || !item.refId) return false;
  if (item.type.trim().toLowerCase() === 'pdf') return true;
  if (PDF_TITLE.test(item.title.trim())) return true;
  return item.properties.some((property) => property.value.trim().toLowerCase() === 'pdf');
}
