import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * The navigator defaults to an icon-and-label height (49pt) even when
 * `tabBarShowLabel` is off. The icon slot plus its 5pt padding is 38pt, so the
 * bar only needs that much above the safe-area inset.
 */
const TAB_BAR_CONTENT_HEIGHT = 38;

/** SF Symbols on iOS, Material Icons elsewhere (Android, web). */
function BarIcon({
  symbol,
  material,
  color,
}: {
  symbol: SymbolViewProps['name'];
  material: ComponentProps<typeof MaterialIcons>['name'];
  color: string;
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={symbol} size={22} tintColor={color} />;
  }
  return <MaterialIcons name={material} size={24} color={color as string} />;
}

export default function TabLayout() {
  const locale = useAppSelector((state) => state.locale);
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
        },
        tabBarItemStyle: { justifyContent: 'center' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: tx(locale, 'tabsLayout.dashboard'),
          tabBarIcon: ({ color }) => <BarIcon symbol="house.fill" material="home" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="kalender"
        options={{
          title: tx(locale, 'tabsLayout.kalender'),
          tabBarIcon: ({ color }) => <BarIcon symbol="calendar" material="calendar-today" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="ilias"
        options={{
          title: tx(locale, 'tabsLayout.ilias'),
          tabBarIcon: ({ color }) => <BarIcon symbol="graduationcap.fill" material="school" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: tx(locale, 'quiz.title'),
          tabBarAccessibilityLabel: tx(locale, 'quiz.title'),
          tabBarIcon: ({ color }) => <BarIcon symbol="questionmark.circle.fill" material="quiz" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <BarIcon symbol="bubble.left.and.bubble.right.fill" material="chat" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="mail"
        options={{
          title: tx(locale, 'tabsLayout.nachrichten'),
          tabBarIcon: ({ color }) => <BarIcon symbol="envelope.fill" material="mail" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="mehr"
        options={{
          title: tx(locale, 'common.campus'),
          tabBarIcon: ({ color }) => <BarIcon symbol="ellipsis.circle.fill" material="more-horiz" color={color as string} />,
        }}
      />
    </Tabs>
  );
}
