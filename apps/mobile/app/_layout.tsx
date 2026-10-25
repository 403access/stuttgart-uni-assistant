import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { getActiveAuthToken } from '@/src/auth/session';
import { SessionRefresh } from '@/src/auth/session-refresh';
import { clearLogin } from '@/src/auth/vault';
import { AppLock } from '@/src/components/app-lock';
import { DesignModeProvider, ToastHost, useResponsive } from '@ua/ui';
import { WebHead } from '@/src/components/web-head';
import { WebSidebar } from '@/src/components/web-sidebar';
import { useAppStateChange } from '@/src/hooks/use-app-state-change';
import { IliasAutoConnect } from '@/src/ilias/ilias-auto-connect';
import { IliasHeadlessProvider } from '@/src/ilias/ilias-headless-provider';
import { OnboardingProvider, useOnboarding } from '@/src/onboarding/OnboardingState';
import { QuizCatalogProvider } from '@/src/quiz/catalog-provider';
import { QuizProgressProvider } from '@/src/quiz/progress';
import { QueryProvider } from '@/src/query/client';
import { AppStateProvider, useAppSelector, appActions } from '@/src/state/AppState';
import { colors } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

WebBrowser.maybeCompleteAuthSession();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppStateProvider>
      <DesignModeBridge>
      <IliasHeadlessProvider>
        <SessionRefresh />
        <IliasAutoConnect />
        <OnboardingProvider>
          <QueryProvider>
            <KeyboardProvider>
              <QuizProgressProvider>
                <QuizCatalogProvider>
                  <Gate />
                </QuizCatalogProvider>
              </QuizProgressProvider>
              <ToastHost />
            </KeyboardProvider>
          </QueryProvider>
        </OnboardingProvider>
      </IliasHeadlessProvider>
      </DesignModeBridge>
    </AppStateProvider>
  );
}

function DesignModeBridge({ children }: { children: React.ReactNode }) {
  const design = useAppSelector((state) => state.design);
  return <DesignModeProvider mode={design}>{children}</DesignModeProvider>;
}

function Gate() {
  const ready = useAppSelector((state) => state.ready);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);
  const authToken = useAppSelector((state) => state.authToken);
  const locale = useAppSelector((state) => state.locale);
  const theme = useAppSelector((state) => state.theme);
  const { signOut } = appActions;
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
  // The web build can only sign in through a phone that already completed the
  // first-run flow, so it never shows onboarding again.
  const isWeb = Platform.OS === 'web';
  const { isDesktop } = useResponsive();
  const needsOnboarding = Boolean(sessionAccount) && onboardingReady && (!onboardingCompleted || forceOnboarding) && !isWeb;
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

  // Onboarding always runs after sign-in until it is completed. Its first page
  // is biometrics when the device supports it; otherwise it starts with the
  // style step, so every device still gets the appearance choice.
  useEffect(() => {
    if (!ready || !onboardingReady) return;
    if (!sessionAccount) {
      if (!onLogin) router.replace('/login');
      return;
    }
    if (isWeb) {
      if (onLogin || onOnboarding) router.replace('/');
      return;
    }
    // A forced run wins over a stale completion, so it is checked first.
    if (needsOnboarding) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }
    if (onboardingCompleted) {
      if (onLogin || onOnboarding) router.replace('/');
      return;
    }
    if (onLogin) router.replace('/');
  }, [ready, onboardingReady, sessionAccount, onboardingCompleted, needsOnboarding, onOnboarding, onLogin, router, isWeb]);

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
  // The preference is the source of truth for the lock: a successful enable is
  // stronger evidence than a probe that can be stale right after launch. If the
  // sensor is gone, the system prompt can still fall back to the device
  // passcode, and the lock screen always offers sign-out.
  const lockable = Boolean(sessionAccount) && onboardingCompleted && biometricsEnabled;

  useEffect(() => {
    if (!__DEV__) return;
    console.info('[app-lock]', { lockable, unlocked, settled, biometricsEnabled });
  }, [lockable, unlocked, settled, biometricsEnabled]);

  useAppStateChange(
    (state) => {
      if (state === 'background') setUnlockedKey(null);
    },
    lockable,
  );

  const unlock = useCallback(() => setUnlockedKey(getActiveAuthToken() ?? sessionAccount), [sessionAccount]);
  const leave = useCallback(() => {
    void clearLogin();
    signOut();
    setUnlockedKey(null);
  }, [signOut]);

  useEffect(() => {
    if (settled) SplashScreen.hideAsync().catch(() => undefined);
  }, [settled]);

  // The web document sits behind the app shell; keep it on the active
  // background so overscroll and route transitions do not flash light.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = colors.mist;
    document.body.style.backgroundColor = colors.mist;
    // Native form controls (date pickers, scrollbars, caret) follow the app
    // theme instead of the OS setting.
    document.documentElement.style.colorScheme = theme;
    document.documentElement.lang = locale;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? colors.mist : colors.brand);
  }, [locale, theme]);

  // The desktop shell keeps the navigation rail outside the router stack, so
  // pushed detail screens keep their place while the sidebar stays put.
  const showSidebar = isDesktop && settled && Boolean(sessionAccount) && !onLogin && !onOnboarding;

  return (
    <View style={[styles.root, { opacity: settled ? 1 : 0 }]}>
      <WebHead />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.shell}>
        {showSidebar ? <WebSidebar /> : null}
        <View style={styles.content}>
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
        </View>
      </View>
      {settled && lockable && !biometricsJustEnabled && !unlocked ? (
        <View style={StyleSheet.absoluteFill}>
          <AppLock onUnlock={unlock} onSignOut={leave} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shell: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, minWidth: 0 },
});
