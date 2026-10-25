import { Text, View } from 'react-native';

import { Card } from '@/src/components/ui';
import type { ProfileData } from '@/src/profile/use-profile-data';
import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

/** What other students see, derived from discoverability and the public fields. */
export function ProfilePreview({ data }: { data: ProfileData }) {
  const { locale, privacy, publicFields, values } = data;
  if (!privacy.searchable) {
    return (
      <Card>
        <Text style={styles.muted}>{tx(locale, 'profil.vorschau_aus')}</Text>
      </Card>
    );
  }
  if (publicFields.length === 0) {
    return (
      <Card>
        <Text style={styles.muted}>{tx(locale, 'profil.vorschau_leer')}</Text>
      </Card>
    );
  }
  return (
    <Card>
      {publicFields.map((field) => (
        <View key={field.id} style={styles.row}>
          <Text style={styles.label}>{tx(locale, field.label)}</Text>
          <Text style={styles.value}>{values[field.id]}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = themedStyles((colors) => ({
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 12 },
  label: { color: colors.inkSoft, fontSize: 14 },
  value: { color: colors.anthracite, fontSize: 14, fontWeight: '600' as const, flexShrink: 1, textAlign: 'right' as const },
}));
