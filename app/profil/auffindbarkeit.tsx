import { Stack, router } from 'expo-router';
import { Switch, Text, View } from 'react-native';

import { Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { PROFILE_FIELDS } from '@/src/profile/privacy';
import { ProfilePreview } from '@/src/profile/profile-preview';
import { ProfileSummary } from '@/src/profile/profile-summary';
import { useProfileData } from '@/src/profile/use-profile-data';
import { appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

/** Whether other students can find the profile at all. */
export default function ProfileDiscoverabilityScreen() {
  const data = useProfileData();
  const { locale, privacy } = data;
  const { setProfileSearchable } = appActions;

  return (
    <Screen kicker={tx(locale, 'profil.kicker')} subtitle={tx(locale, 'profil.auffindbarkeit_detail')}>
      <Stack.Screen options={{ title: tx(locale, 'profil.auffindbarkeit') }} />

      <ProfileSummary data={data} />

      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.strong}>{tx(locale, 'profil.auffindbar')}</Text>
            <Text style={styles.muted}>{tx(locale, 'profil.auffindbar_text')}</Text>
          </View>
          <Switch
            value={privacy.searchable}
            onValueChange={setProfileSearchable}
            trackColor={{ false: colors.line, true: colors.blue }}
            thumbColor={colors.paper}
            accessibilityLabel={tx(locale, 'profil.auffindbar')}
          />
        </View>
        <Text style={[styles.hint, privacy.searchable ? styles.hintOn : null]}>
          {tx(locale, privacy.searchable ? 'profil.auffindbar_an' : 'profil.auffindbar_aus')}
        </Text>
      </Card>

      <Section title={tx(locale, 'profil.vorschau')} />
      <ProfilePreview data={data} />

      <Section title={tx(locale, 'profil.sichtbarkeit')} />
      <View>
        <InfoRow
          title={tx(locale, 'profil.sichtbarkeit_titel')}
          detail={tx(locale, 'profil.sichtbarkeit_detail', [data.publicCount, PROFILE_FIELDS.length])}
          onPress={() => router.push('/profil/sichtbarkeit')}
        />
      </View>
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  strong: { color: colors.anthracite, fontSize: 16, fontWeight: '700' as const },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.mute, fontSize: 12, lineHeight: 18 },
  hintOn: { color: colors.success },
  switchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
}));
