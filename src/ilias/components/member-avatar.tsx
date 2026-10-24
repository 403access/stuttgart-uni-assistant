import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { authHeaders } from '@/src/auth/session';
import { iliasImageUrl } from '@/src/ilias/api';
import { themedStyles } from '@/src/theme';
function initials(name: string): string {
  const parts = String(name ?? '')
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/[\s,-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

/**
 * Round ILIAS profile image. The bytes are fetched through the assistant server
 * because the ILIAS `deliver.php` link needs the session cookie; a data URI
 * (the generated avatar for a non-public profile) is used as-is.
 */
export function MemberAvatar({ imageUrl, name, size = 40 }: { imageUrl: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const remote = imageUrl.startsWith('data:') ? imageUrl : iliasImageUrl(imageUrl);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (!remote || failed) {
    return (
      <View style={[styles.fallback, shape]}>
        <Text style={[styles.initials, { fontSize: Math.max(11, size * 0.36) }]}>{initials(name)}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: remote, headers: imageUrl.startsWith('data:') ? undefined : authHeaders() }}
      style={shape}
      onError={() => setFailed(true)}
    />
  );
}

const styles = themedStyles((colors) => ({
  fallback: { backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.blue, fontWeight: '700' },
}));
