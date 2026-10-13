import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppStateProvider, useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <Gate />
    </AppStateProvider>
  );
}

function Gate() {
  const { ready, sessionAccount } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === 'login';
    if (!sessionAccount && !onLogin) {
      router.replace('/login');
      return;
    }
    if (sessionAccount && onLogin) {
      router.replace('/');
      return;
    }
    setSettled(true);
  }, [ready, sessionAccount, segments, router]);

  useEffect(() => {
    if (settled) SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

  return (
    <View style={{ flex: 1, opacity: settled ? 1 : 0 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.mist } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
      </Stack>
    </View>
  );
}
