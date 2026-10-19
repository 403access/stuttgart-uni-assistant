import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState, StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { getActiveAuthToken } from '@/src/auth/session';
import { clearLogin } from '@/src/auth/vault';
import { AppLock } from '@/src/components/app-lock';
import { ToastHost } from '@/src/components/toast';
import { OnboardingProvider, useOnboarding } from '@/src/onboarding/OnboardingState';
import { QueryProvider } from '@/src/query/client';
import { AppStateProvider, useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

WebBrowser.maybeCompleteAuthSession();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppStateProvider>
      <OnboardingProvider>
        <QueryProvider>
          <KeyboardProvider>
            <StatusBar style="dark" />
            <Gate />
            <ToastHost />
          </KeyboardProvider>
        </QueryProvider>
      </OnboardingProvider>
    </AppStateProvider>
  );
}

function Gate() {
  const { ready, sessionAccount, authToken, locale, signOut } = useApp();
  const {
    ready: onboardingReady,
    completed: onboardingCompleted,
    forceOnboarding,
    biometricsEnabled,
    biometricsAvailable,
    biometricsJustEnabled,
    reloadPreferences,
  } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login' || segments[0] === 'login-legacy' || segments[0] === 'oidc';
  const onOnboarding = segments[0] === 'onboarding';
  const needsOnboarding =
    Boolean(sessionAccount) && onboardingReady && !onboardingCompleted && (biometricsAvailable || forceOnboarding);
  // Settled once the route matches the session and, while signed in, the
  // onboarding decision has been made. The effects below only perform redirects.
  const settled =
    ready &&
    onboardingReady &&
    (sessionAccount ? !onLogin && (!needsOnboarding || onOnboarding) : onLogin);

  useEffect(() => {
    if (!__DEV__) return;
    console.info('[gate]', {
      ready,
      onboardingReady,
      signedIn: Boolean(sessionAccount),
      onboardingCompleted,
      forceOnboarding,
      biometricsAvailable,
      needsOnboarding,
      onLogin,
      onOnboarding,
    });
  }, [ready, onboardingReady, sessionAccount, onboardingCompleted, forceOnboarding, biometricsAvailable, needsOnboarding, onLogin, onOnboarding]);

  // A device without an enrolled biometric has no first page to show, so the
  // flow is skipped without being marked complete. Enrolling later still works.
  useEffect(() => {
    if (!ready || !onboardingReady) return;
    if (!sessionAccount) {
      if (!onLogin) router.replace('/login');
      return;
    }
    if (onboardingCompleted) {
      if (onLogin || onOnboarding) router.replace('/');
      return;
    }
    if (needsOnboarding) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }
    if (onLogin) router.replace('/');
  }, [ready, onboardingReady, sessionAccount, onboardingCompleted, needsOnboarding, onOnboarding, onLogin, router]);

  // A dev-screen reset is written to storage while the running session still
  // looks completed. Apply it when the user signs out, so the next sign-in
  // shows onboarding without requiring a full app restart.
  const previousSession = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousSession.current;
    previousSession.current = sessionAccount;
    if (previous && !sessionAccount) void reloadPreferences();
  }, [sessionAccount, reloadPreferences]);

  // App Lock. The token (or offline account) that was unlocked identifies the
  // session, so a new sign-in or a cold launch starts locked again. A
  // background visit clears it.
  const sessionKey = authToken ?? sessionAccount;
  const [unlockedKey, setUnlockedKey] = useState<string | null>(null);
  const unlocked = Boolean(sessionKey) && unlockedKey === sessionKey;
  const lockable = Boolean(sessionAccount) && onboardingCompleted && biometricsEnabled && biometricsAvailable;

  useEffect(() => {
    if (!lockable) return;
    const subscription = NativeAppState.addEventListener('change', (state) => {
      if (state === 'background') setUnlockedKey(null);
    });
    return () => subscription.remove();
  }, [lockable]);

  const unlock = useCallback(() => setUnlockedKey(getActiveAuthToken() ?? sessionAccount), [sessionAccount]);
  const leave = useCallback(() => {
    void clearLogin();
    signOut();
    setUnlockedKey(null);
  }, [signOut]);

  useEffect(() => {
    if (settled) SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

  return (
    <View style={{ flex: 1, opacity: settled ? 1 : 0 }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.mist },
          // On iOS 26 a header without a background defaults to transparent (Liquid
          // Glass) and content is laid out underneath it. The opaque mist background
          // keeps every pushed screen below its header, matching the rest of the app.
          headerStyle: { backgroundColor: colors.mist },
          headerTintColor: colors.blue,
          headerTitleStyle: { color: colors.anthracite, fontWeight: '700', fontSize: 17 },
          headerBackTitle: tx(locale, 'layout.zurueck'),
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="login-legacy" options={{ headerShown: false }} />
        <Stack.Screen name="oidc" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
      {settled && lockable && !biometricsJustEnabled && !unlocked ? (
        <View style={StyleSheet.absoluteFill}>
          <AppLock onUnlock={unlock} onSignOut={leave} />
        </View>
      ) : null}
    </View>
  );
}
