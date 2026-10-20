import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

/** Dedicated appearance screen reached from the App group on the Campus tab. */
export default function AppearanceScreen() {
  const { locale, theme, setTheme } = useApp();
  return (
    <Screen
      kicker={tx(locale, 'common.app')}
      title={tx(locale, 'einstellungen.design')}
      subtitle={tx(locale, 'einstellungen.design_hinweis')}>
      <Stack.Screen options={{ title: tx(locale, 'einstellungen.design') }} />
      <ThemeOption
        icon="light-mode"
        label={tx(locale, 'einstellungen.hell')}
        active={theme === 'light'}
        onPress={() => setTheme('light')}
      />
      <ThemeOption
        icon="dark-mode"
        label={tx(locale, 'einstellungen.dunkel')}
        active={theme === 'dark'}
        onPress={() => setTheme('dark')}
      />
    </Screen>
  );
}

function ThemeOption({
  icon,
  label,
  active,
  onPress,
}: {
  icon: 'light-mode' | 'dark-mode';
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MaterialIcons name={icon} size={24} color={active ? colors.blue : colors.mute} />
        <Text style={{ flex: 1, color: colors.anthracite, fontSize: 16, fontWeight: '700' }}>{label}</Text>
        <MaterialIcons
          name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
          size={22}
          color={active ? colors.blue : colors.mute}
        />
      </View>
    </Card>
  );
}
