import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { universityUrls } from '@/src/auth/oidc';
import { assistantUrl } from '@/src/assistant/remote';
import { Button, Card, InfoRow, Screen, Section , useResponsive } from '@ua/ui';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

type SettingsSectionId = 'server' | 'device' | 'university' | 'local';

/**
 * Settings on the desktop become a master–detail page: the sections stay in a
 * left rail and the selected section is open beside it, starting with the first
 * one. The phone keeps the plain stacked page.
 */
export default function SettingsScreen() {
  const locale = useAppSelector((state) => state.locale);
  const authToken = useAppSelector((state) => state.authToken);
  const { reset } = appActions;
  const { isDesktop } = useResponsive();
  const [selected, setSelected] = useState<SettingsSectionId>('server');

  const sections: {
    id: SettingsSectionId;
    icon: ComponentProps<typeof MaterialIcons>['name'];
    title: string;
    subtitle: string;
    body: ReactNode;
  }[] = [
    {
      id: 'server',
      icon: 'dns',
      title: tx(locale, 'einstellungen.assistenz'),
      subtitle: assistantUrl,
      body: (
        <Card>
          <Text style={styles.muted}>{assistantUrl}</Text>
          <Text style={styles.muted}>{tx(locale, 'einstellungen.schluessel')}</Text>
        </Card>
      ),
    },
    {
      id: 'device',
      icon: 'devices',
      title: tx(locale, 'einstellungen.geraet_titel'),
      subtitle: tx(locale, authToken ? 'einstellungen.geraet_kurz' : 'einstellungen.geraet_offline'),
      body: (
        <InfoRow
          title={tx(locale, 'einstellungen.geraet_verknuepfen')}
          detail={tx(locale, authToken ? 'einstellungen.geraet_text' : 'einstellungen.geraet_offline')}
          onPress={() => router.push('/geraet-verknuepfen')}
        />
      ),
    },
    {
      id: 'university',
      icon: 'school',
      title: tx(locale, 'einstellungen.universitaetslogin'),
      subtitle: universityUrls.authorize,
      body: (
        <>
          <Card>
            <Text style={styles.muted}>{tx(locale, 'einstellungen.university')}</Text>
          </Card>
          <Card>
            <Text style={styles.muted}>{universityUrls.authorize}</Text>
            <Text style={styles.muted}>{tx(locale, 'einstellungen.client')}</Text>
          </Card>
        </>
      ),
    },
    {
      id: 'local',
      icon: 'delete-outline',
      title: tx(locale, 'einstellungen.lokale_daten'),
      subtitle: tx(locale, 'einstellungen.lokale'),
      body: <Button label={tx(locale, 'einstellungen.lokale')} onPress={reset} secondary />,
    },
  ];

  const active = sections.find((section) => section.id === selected) ?? sections[0];

  return (
    <Screen kicker={tx(locale, 'common.app')}>
      <Stack.Screen options={{ title: tx(locale, 'common.einstellungen') }} />
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.rail}>
            {sections.map((section) => {
              const isActive = section.id === selected;
              return (
                <Pressable
                  key={section.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setSelected(section.id)}
                  style={(state: { pressed: boolean; hovered?: boolean }) => [
                    styles.railItem,
                    isActive && styles.railItemActive,
                    state.hovered && !isActive && styles.railItemHover,
                    state.pressed && styles.pressed,
                  ]}>
                  <View style={[styles.railIcon, isActive && styles.railIconActive]}>
                    <MaterialIcons name={section.icon} size={20} color={isActive ? colors.blue : colors.inkSoft} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.railTitle, isActive && styles.railTitleActive]} numberOfLines={1}>
                      {section.title}
                    </Text>
                    <Text style={styles.railSubtitle} numberOfLines={1}>
                      {section.subtitle}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={isActive ? colors.blue : colors.mute} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.detail}>
            <Section title={active.title} />
            {active.body}
          </View>
        </View>
      ) : (
        <>
          {sections.map((section) => (
            <View key={section.id} style={styles.mobileSection}>
              <Section title={section.title} />
              {section.body}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  rail: {
    width: 320,
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 8,
    gap: 2,
  },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, minHeight: 58 },
  railItemActive: { backgroundColor: colors.blueSoft },
  railItemHover: { backgroundColor: colors.mist },
  railIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mist,
  },
  railIconActive: { backgroundColor: colors.paper },
  railTitle: { color: colors.anthracite, fontSize: 14, fontWeight: '700' },
  railTitleActive: { color: colors.blue },
  railSubtitle: { color: colors.mute, fontSize: 11, marginTop: 2 },
  detail: { flex: 1, minWidth: 0, gap: 14 },
  mobileSection: { gap: 10 },
  muted: { color: colors.inkSoft, lineHeight: 20 },
  pressed: { opacity: 0.72 },
}));
