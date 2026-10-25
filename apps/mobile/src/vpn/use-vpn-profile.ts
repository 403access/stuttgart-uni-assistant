import { useCallback, useEffect, useState } from 'react';

import {
  clearVpnProfile,
  looksLikeOpenVpn,
  pickOpenVpnProfile,
  readVpnProfile,
  saveVpnProfile,
} from '@/src/vpn/profile';
import type { ImportedVpnProfile } from '@/src/vpn/types';

export type ProfileImportResult = 'imported' | 'invalid' | 'cancelled' | 'failed';

/**
 * The imported `.ovpn` profile. The ZDI publishes its configuration files under
 * an internal path, so the student brings their own; see
 * docs/engineering/vpn-tunnel.md.
 */
export function useVpnProfile() {
  const [profile, setProfile] = useState<ImportedVpnProfile | null>(null);

  const reload = useCallback(async () => {
    setProfile(await readVpnProfile());
  }, []);

  useEffect(() => {
    let active = true;
    readVpnProfile().then((stored) => {
      if (active) setProfile(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const importFromPicker = useCallback(async (): Promise<ProfileImportResult> => {
    try {
      const picked = await pickOpenVpnProfile();
      if (!picked) return 'cancelled';
      if (!looksLikeOpenVpn(picked.config)) return 'invalid';
      setProfile(await saveVpnProfile({ name: picked.name, config: picked.config, provider: 'zdi-openvpn' }));
      return 'imported';
    } catch {
      return 'failed';
    }
  }, []);

  const remove = useCallback(async () => {
    await clearVpnProfile();
    setProfile(null);
  }, []);

  return { profile, importFromPicker, remove, reload };
}
