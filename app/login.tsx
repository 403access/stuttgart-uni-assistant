import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { student } from '@/src/data';
import { keys } from '@/src/query/keys';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale, signInCampus, signInDemo, signInLocal, signInOidc } = useApp();
  // The status probes resolve to null when the server is unreachable — the
  // screen renders unknown, not an error toast.
  const status = useQuery({ queryKey: keys.oidcStatus(), queryFn: () => fetchOidcStatus() }).data ?? null;
  const campusStatus = useQuery({ queryKey: keys.campusStatus(), queryFn: () => fetchCampusStatus() }).data ?? null;
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [campusLog, setCampusLog] = useState('');
  // One flag for both browser surfaces: they share the harvest mutation.
  const [harvestBusy, setHarvestBusy] = useState(false);
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
      setCampusLog(
        tx(
          locale,
          `Browser-Anmeldung übernommen (${result.studies} Studiengänge). Lade Profil …`,
          `Browser sign-in adopted (${result.studies} studies). Loading profile …`,
        ),
      );
      campusSignIn.mutate();
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
    mutationFn: signInWithCampusToken,
    onMutate: () => {
      setError('');
      setCampusLog(tx(locale, `Rufe ${assistantUrl}/v1/campus/login auf …`, `Calling ${assistantUrl}/v1/campus/login …`));
    },
    onSuccess: (profile) => {
      const names = profile.studies.map((item) => item.name).join(', ');
      setCampusLog(
        tx(
          locale,
          `Angemeldet als ${profile.name} (${profile.account}). ${profile.nodes.length} Knoten, ${profile.studies.length} ${profile.studies.length === 1 ? 'Studiengang' : 'Studiengänge'}: ${names}.`,
          `Signed in as ${profile.name} (${profile.account}). ${profile.nodes.length} nodes, ${profile.studies.length} ${profile.studies.length === 1 ? 'study' : 'studies'}: ${names}.`,
        ),
      );
      // Deliberately no close() here: the session update and the navigation land
      // in the same tick, so hiding the waiting view now would render one frame
      // of the bare login screen. It stays up and disappears with this screen
      // when the gate swaps in the tabs.
      signInCampus(profile);
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const message = campusMessage(locale, code, campusDetail(caught));
      setCampusLog(message);
      setError(message);
      // A failed profile load has no session to move to, so the waiting views
      // give way to the screen with the retry.
      headless.close();
      browser.close();
      showFetchAlert(locale, {
        title: tx(locale, 'C@MPUS-Anmeldung fehlgeschlagen', 'C@MPUS sign-in failed'),
        code,
        detail: campusDetail(caught) || undefined,
        onRetry: () => campusSignIn.mutate(),
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
        <Text style={styles.heroText}>{tx(locale, 'Studienassistenz für den Campusalltag', 'A study assistant for campus life')}</Text>
      </View>
      <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
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
        <SectionTitle>{tx(locale, 'Bestehendes Konto, ohne Registrierung', 'Existing account, no registration')}</SectionTitle>
        <Notice>
          {tx(
            locale,
            'Dein st-Konto und dein Passwort gelten auf der Anmeldeseite von C@MPUS. Die App muss dafür nicht beim TIK registriert sein. Der Identity Provider nimmt ein Passwort von einer unregistrierten App nicht entgegen.',
            'Your st-account and password work on the C@MPUS sign-in page. This app does not need to be registered with TIK for that. The identity provider does not accept a password from an unregistered app.',
          )}
        </Notice>
        <Button
          label={busy ? tx(locale, 'Anmeldung läuft …', 'Signing in …') : tx(locale, 'Mit C@MPUS-Token anmelden', 'Sign in with C@MPUS token')}
          onPress={() => campusSignIn.mutate()}
        />
        {campusSignIn.isPending ? (
          <SigningIn
            compact
            locale={locale}
            phase="profile"
            detail={tx(locale, 'Studien und Curriculum werden geladen …', 'Loading your studies and curriculum …')}
          />
        ) : null}
        <Button secondary label={tx(locale, 'Im C@MPUS-Browser anmelden (Beta)', 'Sign in with the C@MPUS browser (Beta)')} onPress={browser.openBrowser} />
        {campusLog ? <Text style={error ? styles.error : styles.footer}>{campusLog}</Text> : null}
        <Footer>
          {campusStatus === null
            ? tx(locale, 'Der lokale Server antwortet noch nicht. Starte npm run assistant.', 'The local server is not answering yet. Start npm run assistant.')
            : campusStatus.tokenConfigured
              ? tx(
                  locale,
                  `Token ist gesetzt${campusStatus.sessionCookieConfigured ? ', Sitzungs-Cookie auch' : ''}. Der Server liest CAMPUS_BEARER_TOKEN und fragt die Curriculum-Struktur ab.`,
                  `Token is set${campusStatus.sessionCookieConfigured ? ', and so is the session cookie' : ''}. The server reads CAMPUS_BEARER_TOKEN and requests the curriculum structure.`,
                )
              : tx(
                  locale,
                  'CAMPUS_BEARER_TOKEN fehlt in der .env des Servers.',
                  'CAMPUS_BEARER_TOKEN is missing from the server .env.',
                )}
        </Footer>
        <Button label={tx(locale, 'C@MPUS öffnen und anmelden', 'Open C@MPUS and sign in')} onPress={() => openOfficialCampus().catch(() => undefined)} secondary />
        <Field
          label={tx(locale, 'Nutzerkennung für diese App', 'Account id for this app')}
          value={account}
          onChangeText={setAccount}
          placeholder="st123456"
        />
        <Button
          secondary
          label={tx(locale, 'Mit dieser Nutzerkennung weiter', 'Continue with this account')}
          onPress={() => {
            if (account.trim().length < 3) {
              setError(tx(locale, 'Bitte die Nutzerkennung eintragen, zum Beispiel st123456.', 'Enter the account id, for example st123456.'));
              return;
            }
            signInLocal(account);
          }}
        />
        <Footer>
          {tx(
            locale,
            `Die Nutzerkennung steht dann im Profil. Stundenplan und Noten bleiben der Demonstrationsstand von ${student.name}, bis ein registrierter Client C@MPUS lesen darf.`,
            `The account id then shows on the profile. The timetable and grades stay the demonstration record of ${student.name}, until a registered client is allowed to read C@MPUS.`,
          )}
        </Footer>
        <SectionTitle>{tx(locale, 'Registrierter SIAM-Client', 'Registered SIAM client')}</SectionTitle>
        <Notice>
          {tx(
            locale,
            'Wenn das TIK eine Client-ID vergeben hat, läuft die Anmeldung über den Identity Provider. Das Passwort bleibt auch dann auf der Seite der Universität.',
            'Once TIK has issued a client id, sign-in runs through the identity provider. The password still stays on the university page.',
          )}
        </Notice>
        <Meta>{universityUrls.campus}</Meta>
        <Meta>{universityUrls.authorize}</Meta>
        <Button
          label={busy ? tx(locale, 'Anmeldung läuft …', 'Signing in …') : tx(locale, 'Mit SIAM anmelden', 'Sign in with SIAM')}
          onPress={() => siamSignIn.mutate()}
        />
        {siamSignIn.isPending ? (
          <SigningIn
            compact
            locale={locale}
            phase="identify"
            detail={tx(locale, 'Warte auf die Universität …', 'Waiting for the university …')}
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Footer>
          {status === null
            ? tx(
                locale,
                'Der lokale Server antwortet noch nicht. Starte ihn mit npm run assistant, damit die App den IdP öffnen kann.',
                'The local server is not answering yet. Start it with npm run assistant so the app can open the IdP.',
              )
            : status.configured
              ? tx(
                  locale,
                  `Client ist konfiguriert${status.loginHintSet ? ', die Nutzerkennung wird auf der IdP-Seite vorausgefüllt' : ''}. Redirect, der beim TIK eingetragen sein muss:`,
                  `Client is configured${status.loginHintSet ? ', the account id is prefilled on the IdP page' : ''}. Redirect that must be registered with TIK:`,
                )
              : tx(
                  locale,
                  `Noch kein OIDC-Client. OIDC_CLIENT_ID und OIDC_CLIENT_SECRET kommen vom TIK (${universityUrls.support}), nicht das Passwort. Redirect für die Anfrage:`,
                  `No OIDC client yet. OIDC_CLIENT_ID and OIDC_CLIENT_SECRET come from TIK (${universityUrls.support}), not the password. Redirect to include in that request:`,
                )}
        </Footer>
        <Text style={styles.redirect}>{redirectUri}</Text>
        <Button secondary label={tx(locale, 'Demonstrationsprofil öffnen', 'Open demonstration profile')} onPress={() => signInDemo(student.account)} />
        <Footer>
          {tx(
            locale,
            `Ohne IdP wird der Datensatz von ${student.name} geladen. Stundenplan und Noten bleiben auch nach einer SIAM-Anmeldung dieser Demonstrationsstand, bis C@MPUS angebunden ist.`,
            `Without the IdP, the record of ${student.name} is loaded. The timetable and grades stay on that demonstration record after a SIAM sign-in, until C@MPUS is connected.`,
          )}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue },
  hero: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, gap: 8 },
  brand: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
  heroText: { color: '#D6E4F5', fontSize: 16, lineHeight: 22 },
  sheet: { flex: 1, backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: 24, gap: 10 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  footer: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  redirect: { color: colors.anthracite, fontSize: 13, lineHeight: 18 },
});
