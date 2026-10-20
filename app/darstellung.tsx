import { Stack } from 'expo-router';
import { View } from 'react-native';

import { ChoiceCard } from '@/src/components/choice-card';
import { Muted, Screen, Section } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { tx } from '@/src/text';

/** Dedicated appearance screen reached from the App group on the Campus tab. */
export default function AppearanceScreen() {
  const { locale, theme, setTheme, design, setDesign } = useApp();
  return (
    <Screen
      kicker={tx(locale, 'common.app')}
      title={tx(locale, 'einstellungen.design')}
      subtitle={tx(locale, 'einstellungen.design_hinweis')}>
      <Stack.Screen options={{ title: tx(locale, 'einstellungen.design') }} />
      <ChoiceCard
        icon="light-mode"
        label={tx(locale, 'einstellungen.hell')}
        active={theme === 'light'}
        onPress={() => setTheme('light')}
      />
      <ChoiceCard
        icon="dark-mode"
        label={tx(locale, 'einstellungen.dunkel')}
        active={theme === 'dark'}
        onPress={() => setTheme('dark')}
      />

      <View style={{ gap: 4 }}>
        <Section title={tx(locale, 'einstellungen.stil')} />
        <Muted>{tx(locale, 'einstellungen.stil_hinweis')}</Muted>
      </View>
      <ChoiceCard
        icon="grid-view"
        label={tx(locale, 'einstellungen.clean')}
        active={design === 'clean'}
        onPress={() => setDesign('clean')}
      />
      <ChoiceCard
        icon="auto-awesome"
        label={tx(locale, 'einstellungen.playful')}
        active={design === 'playful'}
        onPress={() => setDesign('playful')}
      />
    </Screen>
  );
}
