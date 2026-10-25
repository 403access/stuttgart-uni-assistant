/**
 * @deprecated Superseded by `app/login.tsx`, which is the entry point the gate
 * redirects to. This screen keeps every sign-in path in one long form for
 * reference and is still reachable from the new screen's “Weitere
 * Anmeldemethoden” section, but it is no longer the screen a user sees first.
 * Do not add features here; put them in the new login screen.
 */
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assistantUrl } from '@/src/assistant/remote';
import { campusDetail, fetchCampusStatus, signInWithCampusToken, submitBrowserCredentials } from '@/src/auth/campus';
import { campusMessage, messageFor } from '@/src/auth/login-messages';
import { fetchOidcStatus, openOfficialCampus, signInWithUniversity, universityRedirectUri, universityUrls } from '@/src/auth/oidc';
import { useCampusBrowserLogin } from '@/src/auth/use-campus-browser-login';
import { useCampusHeadlessLogin } from '@/src/auth/use-campus-headless-login';
import { CampusBrowserModal } from '@/src/components/campus-browser-modal';
import { CampusCredentialsForm } from '@/src/components/campus-credentials-form';
import { CampusHeadlessModal } from '@/src/components/campus-headless-modal';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { Footer, Field, LanguagePicker, Meta, Notice, SectionTitle } from '@/src/components/login-blocks';
import { SigningIn } from '@/src/components/signing-in';
import { Button, Mark } from '@/src/components/ui';
import { student } from '@ua/core/data';
import { keys } from '@ua/core/query/keys';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

export default function LoginScreen() {
  // The web build has exactly one door: the QR pairing on /login.
  if (Platform.OS === 'web') return <Redirect href="/login" />;
  return <LegacyLoginScreen />;
}

function LegacyLoginScreen() {
  const insets = useSafeAreaInsets();
  const locale = useAppSelector((state) => state.locale);
  const { setLocale, signInCampus, signInDemo, signInLocal, signInOidc } = appActions;
  // The status probes resolve to null when the server is unreachable — the
  // screen renders unknown, not an error toast.
  const status = useQuery({ queryKey: keys.oidcStatus(), queryFn: () => fetchOidcStatus() }).data ?? null;
  const campusStatus = useQuery({ queryKey: keys.campusStatus(), queryFn: () => fetchCampusStatus() }).data ?? null;
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [campusLog, setCampusLog] = useState('');
  // One flag for both browser surfaces: they share the harvest mutation.
  const [harvestBusy, setHarvestBusy] = useState(false);
  const ticketRef = useRef<string | null>(null);
  const redirectUri = universityRedirectUri();

  // Sign-ins as mutations: the retry toast targets `mutate`, pending states come
  // from `isPending`, and the message/toast handling lives in the hooks. Both
  // browser modes submit through `submitHarvest`, which raises the busy flag of
  // the surface that is waiting.
  const browserHarvest = useMutation({
    mutationKey: ['campus-browser-harvest'],
    mutationFn: (harvest: { cookies: string; storage: Record<string, string> }) => submitBrowserCredentials(harvest),
    onMutate: () => browser.setError(''),
    onSuccess: (result) => {
      // Deliberately do not close the waiting view here. The session is not set
      // until the profile loads, and hiding it now would flash the login screen
      // between the wait and the home tabs.
      headless.setPhase('profile');
      ticketRef.current = result.ticket ?? null;
      setCampusLog(
        tx(locale, 'common.browser', [result.studies]),
      );
      campusSignIn.mutate(result.ticket);
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const message = campusMessage(locale, code, campusDetail(caught));
      browser.setError(message);
      setCampusLog(message);
      setError(message);
    },
    onSettled: () => setHarvestBusy(false),
  });

  const browser = useCampusBrowserLogin({ locale, busy: harvestBusy, onHarvest: submitHarvest });
  const headless = useCampusHeadlessLogin({ locale, onHarvest: submitHarvest });

  const campusSignIn = useMutation({
    mutationKey: ['campus-sign-in'],
    mutationFn: (ticket?: string) => signInWithCampusToken(ticket),
    onMutate: () => {
      setError('');
      setCampusLog(tx(locale, 'common.rufe', [assistantUrl]));
    },
    onSuccess: (profile) => {
      const names = profile.studies.map((item) => item.name).join(', ');
      setCampusLog(
        tx(locale, 'common.angemeldet', [profile.name, profile.account, profile.nodes.length, profile.studies.length, profile.studies.length === 1 ? 'Studiengang' : 'Studiengänge', names]),
      );
      // Deliberately no close() here: the session update and the navigation land
      // in the same tick, so hiding the waiting view now would render one frame
      // of the bare login screen. It stays up and disappears with this screen
      // when the gate swaps in the tabs.
      signInCampus(profile);
      ticketRef.current = null;
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const message = campusMessage(locale, code, campusDetail(caught));
      setCampusLog(message);
      setError(message);
      ticketRef.current = null;
      // A failed profile load has no session to move to, so the waiting views
      // give way to the screen with the retry.
      headless.close();
      browser.close();
      showFetchAlert(locale, {
        title: tx(locale, 'common.c'),
        code,
        detail: campusDetail(caught) || undefined,
        onRetry: () => campusSignIn.mutate(ticketRef.current ?? undefined),
      });
    },
  });

  const siamSignIn = useMutation({
    mutationKey: ['siam-sign-in'],
    mutationFn: signInWithUniversity,
    onMutate: () => setError(''),
    onSuccess: (profile) => signInOidc(profile),
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'oidc_failed';
      setError(messageFor(locale, code, status));
    },
  });

  /** Both browser modes hand their harvest to the same mutation. */
  function submitHarvest(harvest: { cookies: string; storage: Record<string, string> }) {
    setHarvestBusy(true);
    browserHarvest.mutate(harvest);
  }

  const busy = campusSignIn.isPending || siamSignIn.isPending;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Mark size={48} />
        <Text style={styles.brand}>University Assistant</Text>
        <Text style={styles.heroText}>{tx(locale, 'loginLegacy.studienassistenz')}</Text>
      </View>
      <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.deprecated}>
          <Text style={styles.deprecatedText}>
            {tx(locale, 'loginLegacy.ansicht')}
          </Text>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} hitSlop={8}>
            <Text style={styles.deprecatedLink}>{tx(locale, 'loginLegacy.neuen')}</Text>
          </Pressable>
        </View>
        <LanguagePicker locale={locale} setLocale={setLocale} />
        <CampusCredentialsForm
          locale={locale}
          account={headless.account}
          password={headless.password}
          remember={headless.remember}
          biometrics={headless.biometrics}
          biometricsReady={headless.biometricsReady}
          busy={headless.open}
          savedLogin={headless.savedLogin}
          error={headless.error}
          onAccount={headless.setAccount}
          onPassword={headless.setPassword}
          onRemember={() => headless.setRemember((value) => !value)}
          onBiometrics={() => headless.setBiometrics((value) => !value)}
          onStart={() => void headless.start()}
          onStoredLogin={() => void headless.startStoredLogin()}
          onForget={() => void headless.forgetStoredLogin()}
        />
        <SectionTitle>{tx(locale, 'loginLegacy.bestehendes')}</SectionTitle>
        <Notice>
          {tx(locale, 'loginLegacy.st')}
        </Notice>
        <Button
          label={busy ? tx(locale, 'common.anmeldung_laeuft') : tx(locale, 'loginLegacy.c_mpus_token')}
          onPress={() => campusSignIn.mutate(ticketRef.current ?? undefined)}
        />
        {campusSignIn.isPending ? (
          <SigningIn
            compact
            locale={locale}
            phase="profile"
            detail={tx(locale, 'common.studien')}
          />
        ) : null}
        <Button secondary label={tx(locale, 'loginLegacy.c_mpus')} onPress={browser.openBrowser} />
        {campusLog ? <Text style={error ? styles.error : styles.footer}>{campusLog}</Text> : null}
        <Footer>
          {campusStatus === null
            ? tx(locale, 'loginLegacy.lokale_server')
            : campusStatus.tokenConfigured
              ? tx(locale, 'loginLegacy.token', [campusStatus.sessionCookieConfigured ? ', Sitzungs-Cookie auch' : ''])
              : tx(locale, 'loginLegacy.campus')}
        </Footer>
        <Button label={tx(locale, 'loginLegacy.c')} onPress={() => openOfficialCampus().catch(() => undefined)} secondary />
        <Field
          label={tx(locale, 'loginLegacy.nutzerkennung_app')}
          value={account}
          onChangeText={setAccount}
          placeholder="st123456"
        />
        <Button
          secondary
          label={tx(locale, 'loginLegacy.nutzerkennung_weiter')}
          onPress={() => {
            if (account.trim().length < 3) {
              setError(tx(locale, 'loginLegacy.bitte'));
              return;
            }
            void signInLocal(account);
          }}
        />
        <Footer>
          {tx(locale, 'loginLegacy.nutzerkennung', [student.name])}
        </Footer>
        <SectionTitle>{tx(locale, 'loginLegacy.registrierter')}</SectionTitle>
        <Notice>
          {tx(locale, 'loginLegacy.wenn')}
        </Notice>
        <Meta>{universityUrls.campus}</Meta>
        <Meta>{universityUrls.authorize}</Meta>
        <Button
          label={busy ? tx(locale, 'common.anmeldung_laeuft') : tx(locale, 'loginLegacy.siam')}
          onPress={() => siamSignIn.mutate()}
        />
        {siamSignIn.isPending ? (
          <SigningIn
            compact
            locale={locale}
            phase="identify"
            detail={tx(locale, 'loginLegacy.warte')}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Footer>
          {status === null
            ? tx(locale, 'loginLegacy.lokale')
            : status.configured
              ? tx(locale, 'loginLegacy.client', [status.loginHintSet ? ', die Nutzerkennung wird auf der IdP-Seite vorausgefüllt' : ''])
              : tx(locale, 'loginLegacy.oidc', [universityUrls.support])}
        </Footer>
        <Text style={styles.redirect}>{redirectUri}</Text>
        <Button secondary label={tx(locale, 'loginLegacy.demonstrationsprofil')} onPress={() => void signInDemo(student.account)} />
        <Footer>
          {tx(locale, 'loginLegacy.ohne', [student.name])}
        </Footer>
      </ScrollView>
      <CampusBrowserModal
        visible={browser.open}
        locale={locale}
        webview={browser.webview}
        url={browser.url}
        diag={browser.diag}
        busy={harvestBusy}
        profileLoading={campusSignIn.isPending}
        error={browser.error}
        onClose={browser.close}
        onNavigation={browser.setUrl}
        onMessage={(event) => void browser.onMessage(event)}
        onAdopt={() => void browser.adopt()}
        onDiagnose={() => void browser.diagnose()}
      />
      <CampusHeadlessModal
        visible={headless.open}
        locale={locale}
        attempt={headless.attempt}
        webview={headless.webview}
        injectedScript={headless.autofillScript()}
        phase={headless.phase}
        detail={headless.detail}
        error={headless.error}
        dump={headless.dump}
        profileLoading={campusSignIn.isPending}
        busy={harvestBusy}
        onMessage={(event) => void headless.onMessage(event)}
        onLoadEnd={headless.onLoadEnd}
        onDump={headless.dumpPage}
        onCancel={headless.close}
        onFallback={() => {
          headless.close();
          browser.openBrowser();
        }}
      />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.brand },
  hero: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, gap: 8 },
  brand: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
  heroText: { color: '#D6E4F5', fontSize: 16, lineHeight: 22 },
  sheet: { flex: 1, backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: 24, gap: 10 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  footer: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  redirect: { color: colors.anthracite, fontSize: 13, lineHeight: 18 },
  deprecated: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.mist, borderRadius: 14, padding: 12, gap: 6 },
  deprecatedText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  deprecatedLink: { color: colors.blue, fontSize: 14, fontWeight: '700' },
}));
