import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

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
  const { locale } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: tx(locale, 'Heute', 'Today'),
          tabBarIcon: ({ color }) => <BarIcon symbol="house.fill" material="home" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="studium"
        options={{
          title: tx(locale, 'Studium', 'Study'),
          tabBarIcon: ({ color }) => <BarIcon symbol="graduationcap.fill" material="school" color={color as string} />,
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
        name="kalender"
        options={{
          title: tx(locale, 'Kalender', 'Calendar'),
          tabBarIcon: ({ color }) => <BarIcon symbol="calendar" material="calendar-today" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="mehr"
        options={{
          title: tx(locale, 'Campus', 'Campus'),
          tabBarIcon: ({ color }) => <BarIcon symbol="ellipsis.circle.fill" material="more-horiz" color={color as string} />,
        }}
      />
    </Tabs>
  );
}
