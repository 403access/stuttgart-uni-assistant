import { Stack, router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { PROFILE_FIELDS } from '@/src/profile/privacy';
import { ProfileSummary } from '@/src/profile/profile-summary';
import { shareText } from '@/src/profile/share';
import { profileLine, useProfileData } from '@/src/profile/use-profile-data';
import { themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

export default function ProfileOverviewScreen() {
  const data = useProfileData();
  const { locale, privacy } = data;

  function shareProfile(): void {
    const body = data.publicFields.map((field) => profileLine(data, field.id)).join('\n');
    const title = tx(locale, 'profil.profil_teilen');
    void shareText(body ? `${title}\n${body}` : title, title, locale);
  }

  return (
    <Screen kicker={tx(locale, 'profil.kicker')} subtitle={tx(locale, 'profil.uebersicht_detail')}>
      <Stack.Screen options={{ title: tx(locale, 'profil.titel') }} />

      <ProfileSummary data={data} />

      <Card>
        <Button label={tx(locale, 'profil.profil_teilen')} onPress={shareProfile} />
        <Text style={styles.hint}>{tx(locale, 'profil.teilen_hinweis')}</Text>
      </Card>

      <Section title={tx(locale, 'profil.kategorie')} />
      <View>
        <InfoRow
          title={tx(locale, 'profil.daten')}
          detail={tx(locale, 'profil.daten_detail')}
          position="first"
          onPress={() => router.push('/profil/daten')}
        />
        <InfoRow
          title={tx(locale, 'profil.sichtbarkeit_titel')}
          detail={tx(locale, 'profil.sichtbarkeit_detail', [data.publicCount, PROFILE_FIELDS.length])}
          position="middle"
          onPress={() => router.push('/profil/sichtbarkeit')}
        />
        <InfoRow
          title={tx(locale, 'profil.auffindbarkeit')}
          detail={privacy.searchable ? tx(locale, 'profil.auffindbar_an') : tx(locale, 'profil.auffindbar_aus')}
          position="last"
          onPress={() => router.push('/profil/auffindbarkeit')}
        />
      </View>
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  hint: { color: colors.mute, fontSize: 12, lineHeight: 18 },
}));
