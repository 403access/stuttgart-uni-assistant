import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Screen, Section } from '@ua/ui';
import { PROFILE_FIELDS } from '@ua/core/profile/privacy';
import { ProfilePreview } from '@/src/profile/profile-preview';
import { ProfileSummary } from '@/src/profile/profile-summary';
import { shareText } from '@/src/profile/share';
import { profileLine, useProfileData } from '@/src/profile/use-profile-data';
import { appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { ProfileVisibility } from '@ua/core/domain/types';

/** Per-detail visibility plus the share actions that use it. */
export default function ProfileVisibilityScreen() {
  const data = useProfileData();
  const { locale, privacy, values } = data;
  const { setProfileVisibility } = appActions;

  function shareProfile(): void {
    const body = data.publicFields.map((field) => profileLine(data, field.id)).join('\n');
    const title = tx(locale, 'profil.profil_teilen');
    void shareText(body ? `${title}\n${body}` : title, title, locale);
  }

  return (
    <Screen narrow kicker={tx(locale, 'profil.kicker')} subtitle={tx(locale, 'profil.sichtbarkeit_text')}>
      <Stack.Screen options={{ title: tx(locale, 'profil.sichtbarkeit_titel') }} />

      <ProfileSummary data={data} />

      <Card>
        <Button label={tx(locale, 'profil.profil_teilen')} onPress={shareProfile} />
        <Text style={styles.hint}>{tx(locale, 'profil.teilen_detail', [data.publicCount, PROFILE_FIELDS.length])}</Text>
        <Text style={styles.hint}>{tx(locale, 'profil.teilen_hinweis')}</Text>
      </Card>

      <Section title={tx(locale, 'profil.sichtbarkeit')} />
      {PROFILE_FIELDS.map((field) => {
        const label = tx(locale, field.label);
        return (
          <Card key={field.id}>
            <View style={styles.fieldHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.strong}>{label}</Text>
                <Text style={styles.muted}>{values[field.id]}</Text>
              </View>
              <Pressable
                onPress={() => void shareText(profileLine(data, field.id), label, locale)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={tx(locale, 'profil.feld_teilen', [label])}
                style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
                <MaterialIcons name="ios-share" size={18} color={colors.blue} />
              </Pressable>
            </View>
            <View
              style={styles.choices}
              accessibilityRole="radiogroup"
              accessibilityLabel={tx(locale, 'profil.feld_sichtbarkeit', [label])}>
              {(['private', 'public'] as ProfileVisibility[]).map((option) => {
                const active = privacy.fields[field.id] === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setProfileVisibility(field.id, option)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [styles.choice, active && styles.choiceOn, pressed && styles.pressed]}>
                    <MaterialIcons
                      name={option === 'public' ? 'public' : 'lock-outline'}
                      size={15}
                      color={active ? colors.blue : colors.mute}
                    />
                    <Text style={[styles.choiceText, active && styles.choiceTextOn]}>
                      {tx(locale, option === 'public' ? 'profil.public' : 'profil.privat')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        );
      })}

      <Section title={tx(locale, 'profil.vorschau')} />
      <ProfilePreview data={data} />
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  strong: { color: colors.anthracite, fontSize: 16, fontWeight: '700' as const },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.mute, fontSize: 12, lineHeight: 18 },
  fieldHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 },
  shareButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.blueSoft,
  },
  choices: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  choice: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  choiceOn: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  choiceText: { color: colors.mute, fontSize: 13, fontWeight: '600' as const },
  choiceTextOn: { color: colors.blue },
  pressed: { opacity: 0.72 },
}));
