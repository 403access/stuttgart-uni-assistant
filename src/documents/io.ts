import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface PickedStudyFile {
  title: string;
  text: string;
  uri?: string;
  mimeType?: string;
}

export async function pickStudyFile(): Promise<PickedStudyFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: ['application/pdf', 'text/plain', 'text/markdown', 'text/*', 'application/json'],
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const textual = (asset.mimeType ?? '').startsWith('text/') || /\.(txt|md|csv|json)$/i.test(asset.name);
  let text = '';
  if (textual) {
    try {
      if (asset.file && typeof asset.file.text === 'function') {
        text = await asset.file.text();
      } else if (Platform.OS !== 'web') {
        const { File } = await import('expo-file-system');
        text = new File(asset.uri).textSync();
      }
    } catch {
      text = '';
    }
  }
  return {
    title: asset.name,
    text: text.slice(0, 200_000),
    uri: asset.uri,
    mimeType: asset.mimeType,
  };
}

export async function exportText(title: string, text: string): Promise<'shared' | 'downloaded' | 'unavailable'> {
  const safe = title.replace(/[^\w.-]+/g, '_').slice(0, 60) || 'note';
  if (Platform.OS === 'web') {
    const documentRef = globalThis.document;
    if (!documentRef) return 'unavailable';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = url;
    link.download = `${safe}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, `${safe}.txt`);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: title });
  return 'shared';
}
