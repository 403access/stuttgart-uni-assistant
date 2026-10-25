import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import type { MailAttachment } from '@/src/types';

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 6_000_000;
export const MAX_TOTAL_ATTACHMENT_BYTES = 8_000_000;

export interface RejectedAttachment {
  name: string;
  reason: 'size' | 'count' | 'read';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

async function readAssetBase64(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    if (typeof asset.base64 === 'string' && asset.base64) return asset.base64.replace(/^data:[^,]*,/, '');
    if (asset.file) return arrayBufferToBase64(await asset.file.arrayBuffer());
    const response = await fetch(asset.uri);
    return arrayBufferToBase64(await (await response.blob()).arrayBuffer());
  }
  const { File } = await import('expo-file-system');
  return new File(asset.uri).base64();
}

/**
 * Open the system picker and read the chosen files into base64. Respects the
 * server's limits before a single byte is sent; rejected files are reported so
 * the compose screen can explain why they did not appear.
 */
export async function pickMailAttachments(
  existing: MailAttachment[],
): Promise<{ attachments: MailAttachment[]; rejected: RejectedAttachment[] }> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
  if (result.canceled) return { attachments: [], rejected: [] };

  const attachments: MailAttachment[] = [];
  const rejected: RejectedAttachment[] = [];
  let count = existing.length;
  let total = existing.reduce((sum, attachment) => sum + (attachment.size || 0), 0);

  for (const asset of result.assets) {
    if (count >= MAX_ATTACHMENTS) {
      rejected.push({ name: asset.name, reason: 'count' });
      continue;
    }
    let data: string;
    try {
      data = await readAssetBase64(asset);
    } catch {
      rejected.push({ name: asset.name, reason: 'read' });
      continue;
    }
    const size = asset.size ?? Math.floor((data.length * 3) / 4);
    if (size > MAX_ATTACHMENT_BYTES || total + size > MAX_TOTAL_ATTACHMENT_BYTES) {
      rejected.push({ name: asset.name, reason: 'size' });
      continue;
    }
    attachments.push({
      name: asset.name || 'anhang',
      type: asset.mimeType || 'application/octet-stream',
      size,
      data,
    });
    count += 1;
    total += size;
  }
  return { attachments, rejected };
}

export { formatBytes } from '@ua/format';
