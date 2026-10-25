import { Text, View } from 'react-native';

import { Card, Pill } from '@ua/ui';
import type { ProfileData } from '@/src/profile/use-profile-data';
import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

/** Identity block shared by the profile overview and its sub-views. */
export function ProfileSummary({ data }: { data: ProfileData }) {
  const { locale, privacy } = data;
  return (
    <Card>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{data.initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{data.displayName}</Text>
          <Text style={styles.muted}>{data.account}</Text>
          <Text style={styles.muted}>{data.email}</Text>
        </View>
      </View>
      <View style={styles.pills}>
        <Pill label={data.online ? tx(locale, 'konto.online') : tx(locale, 'konto.offline_kurz')} tone={data.online ? 'ok' : 'wait'} />
        <Pill
          label={privacy.searchable ? tx(locale, 'profil.auffindbar_kurz') : tx(locale, 'profil.nicht_auffindbar_kurz')}
          tone={privacy.searchable ? 'ok' : 'neutral'}
        />
        <Pill label={tx(locale, 'profil.oeffentliche_angaben', [data.publicCount])} tone="blue" />
      </View>
    </Card>
  );
}

const styles = themedStyles((colors) => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.blueSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: { color: colors.blue, fontSize: 20, fontWeight: '700' as const },
  name: { color: colors.anthracite, fontSize: 22, fontWeight: '700' as const },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  pills: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
}));
