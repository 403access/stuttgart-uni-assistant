import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

function Dot({ color, filled = false }: { color: ColorValue; filled?: boolean }) {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 99,
        backgroundColor: filled ? color : 'transparent',
        borderWidth: 1.5,
        borderColor: color,
      }}
    />
  );
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
          tabBarIcon: ({ color }) => <Dot color={color} filled />,
        }}
      />
      <Tabs.Screen
        name="studium"
        options={{
          title: tx(locale, 'Studium', 'Study'),
          tabBarIcon: ({ color }) => (
            <View style={{ width: 14, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: color }} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <Dot color={color} filled />
              <Dot color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="campus"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <View style={{ width: 10, height: 10, borderWidth: 1.5, borderColor: color, transform: [{ rotate: '45deg' }] }} />
          ),
        }}
      />
      <Tabs.Screen
        name="mehr"
        options={{
          title: tx(locale, 'Mehr', 'More'),
          tabBarIcon: ({ color }) => (
            <View style={{ width: 14, height: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
              <Dot color={color} filled />
              <Dot color={color} filled />
              <Dot color={color} filled />
              <Dot color={color} filled />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
