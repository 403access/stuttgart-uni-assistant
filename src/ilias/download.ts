import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { fetchIliasFile } from './api';

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
};

function safeFileName(input: string, fallbackExtension: string, contentType: string): string {
  const cleaned = input
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  const base = cleaned || 'ilias-datei';
  if (/\.[a-z0-9]{2,5}$/i.test(base)) return base;
  const mimeExtension =
    contentType === 'application/octet-stream' ? '' : (contentType.split('/')[1] ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 5);
  const extension =
    fallbackExtension.replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() ||
    MIME_EXTENSIONS[contentType] ||
    mimeExtension ||
    'bin';
  return `${base}.${extension}`;
}

/**
 * Download a course file through the assistant server and hand it to the
 * platform: a browser download on web, the share sheet on iOS/Android.
 */
export async function saveIliasFile(
  refId: number,
  title: string,
  extension = '',
): Promise<'shared' | 'downloaded' | 'unavailable'> {
  const file = await fetchIliasFile(refId);
  const name = safeFileName(file.filename || title, extension, file.contentType);

  if (Platform.OS === 'web') {
    const documentRef = globalThis.document;
    if (!documentRef) return 'unavailable';
    const blob = new Blob([file.data], { type: file.contentType });
    const url = URL.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }

  const { File, Paths } = await import('expo-file-system');
  const target = new File(Paths.cache, name);
  if (target.exists) target.delete();
  target.create();
  target.write(file.data);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(target.uri, { mimeType: file.contentType, dialogTitle: title });
  return 'shared';
}
