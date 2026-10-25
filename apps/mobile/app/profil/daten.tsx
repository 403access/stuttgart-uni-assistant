import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Card, InfoRow, Pill, Screen, Section } from '@ua/ui';
import { formatStamp, modeLabel } from '@ua/core/profile/format';
import { PROFILE_FIELDS, isProfileFieldPublic } from '@ua/core/profile/privacy';
import { ProfileSummary } from '@/src/profile/profile-summary';
import { shareText } from '@/src/profile/share';
import { profileLine, useProfileData } from '@/src/profile/use-profile-data';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

/** All account data in one place, with a direct share action per detail. */
export default function ProfileDataScreen() {
  const data = useProfileData();
  const { locale, privacy, values } = data;

  return (
    <Screen narrow kicker={tx(locale, 'profil.kicker')} subtitle={tx(locale, 'profil.daten_subtitle')}>
      <Stack.Screen options={{ title: tx(locale, 'profil.daten') }} />

      <ProfileSummary data={data} />

      <Section title={tx(locale, 'profil.kontodaten')} />
      {PROFILE_FIELDS.map((field) => {
        const label = tx(locale, field.label);
        const visible = isProfileFieldPublic(privacy, field.id);
        return (
          <Card key={field.id}>
            <View style={styles.fieldHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.strong}>{label}</Text>
                <Text style={styles.muted}>{values[field.id]}</Text>
              </View>
              <Pill label={tx(locale, visible ? 'profil.public' : 'profil.privat')} tone={visible ? 'ok' : 'neutral'} />
              <Pressable
                onPress={() => void shareText(profileLine(data, field.id), label, locale)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={tx(locale, 'profil.feld_teilen', [label])}
                style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
                <MaterialIcons name="ios-share" size={18} color={colors.blue} />
              </Pressable>
            </View>
          </Card>
        );
      })}

      <Section title={tx(locale, 'profil.konto_sektion')} />
      <Card>
        <Text style={styles.muted}>{tx(locale, 'profil.konto_sektion_text')}</Text>
      </Card>
      <View>
        <InfoRow title={tx(locale, 'konto.angemeldet_ueber')} meta={modeLabel(data.mode, locale)} position="first" />
        <InfoRow title={tx(locale, 'konto.seit')} meta={formatStamp(data.createdAt, locale)} position="middle" />
        <InfoRow title={tx(locale, 'konto.letzte_anmeldung')} meta={formatStamp(data.lastLoginAt, locale)} position="middle" />
        <InfoRow
          title={tx(locale, 'tabsMehr.e')}
          meta={data.mailAccount ?? tx(locale, 'konto.nicht_verknuepft')}
          position="last"
        />
      </View>
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  strong: { color: colors.anthracite, fontSize: 16, fontWeight: '700' as const },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  fieldHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  shareButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.blueSoft,
  },
  pressed: { opacity: 0.72 },
}));
