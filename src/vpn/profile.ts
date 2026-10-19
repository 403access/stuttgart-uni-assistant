import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import type { ImportedVpnProfile, VpnProviderId } from '@/src/vpn/types';

const PROFILE_FILE = 'vpn-profile.json';

export { looksLikeOpenVpn, openVpnHost, openVpnRemote } from '@/src/vpn/openvpn-config';

/**
 * Where the imported profile lives: a JSON file in the app's private document
 * directory. It can carry an inline certificate or key, so it stays inside the
 * sandbox and is never written to the shared AsyncStorage snapshot.
 */
export async function readVpnProfile(): Promise<ImportedVpnProfile | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.document, PROFILE_FILE);
    if (!file.exists) return null;
    const parsed = JSON.parse(file.textSync()) as ImportedVpnProfile;
    return typeof parsed?.config === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveVpnProfile(input: {
  name: string;
  config: string;
  provider: VpnProviderId;
}): Promise<ImportedVpnProfile> {
  const profile: ImportedVpnProfile = { ...input, importedAt: new Date().toISOString() };
  if (Platform.OS !== 'web') {
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.document, PROFILE_FILE);
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(profile));
  }
  return profile;
}

export async function clearVpnProfile(): Promise<void> {
  if (Platform.OS === 'web') return;
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.document, PROFILE_FILE);
  if (file.exists) file.delete();
}

/** Opens the system picker and reads the chosen file. Does not persist it. */
export async function pickOpenVpnProfile(): Promise<{ name: string; config: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['*/*'] });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  let config = '';
  try {
    if (asset.file && typeof asset.file.text === 'function') {
      config = await asset.file.text();
    } else if (Platform.OS !== 'web') {
      const { File } = await import('expo-file-system');
      config = new File(asset.uri).textSync();
    }
  } catch {
    config = '';
  }
  return { name: asset.name, config };
}
