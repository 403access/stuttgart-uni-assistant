import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppStateProvider, useApp } from '@/src/state/AppState';
import { ToastHost } from '@/src/components/toast';
import { QueryProvider } from '@/src/query/client';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

WebBrowser.maybeCompleteAuthSession();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppStateProvider>
      <QueryProvider>
        <StatusBar style="dark" />
        <Gate />
        <ToastHost />
      </QueryProvider>
    </AppStateProvider>
  );
}

function Gate() {
  const { ready, sessionAccount, locale } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login' || segments[0] === 'oidc';
  // Settled once the route matches the session; the effect below only performs the redirect.
  const settled = ready && (sessionAccount ? !onLogin : onLogin);

  useEffect(() => {
    if (!ready) return;
    if (!sessionAccount && !onLogin) {
      router.replace('/login');
      return;
    }
    if (sessionAccount && onLogin) {
      router.replace('/');
      return;
    }
  }, [ready, sessionAccount, onLogin, router]);

  useEffect(() => {
    if (settled) SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

  return (
    <View style={{ flex: 1, opacity: settled ? 1 : 0 }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.mist },
          headerTintColor: colors.blue,
          headerTitleStyle: { color: colors.anthracite, fontWeight: '700', fontSize: 17 },
          headerBackTitle: tx(locale, 'Zurück', 'Back'),
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="oidc" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}
