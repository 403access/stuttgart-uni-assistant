import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { assistantUrl } from '@/src/assistant/remote';
import { campusDetail, fetchCampusStatus, signInWithCampusToken, submitBrowserCredentials } from '@/src/auth/campus';
import {
  CAMPUS_START_URL,
  DIAGNOSE_JS,
  HARVEST_JS,
  headlessAutofillScript,
  headlessDumpScript,
  mergeCookieStrings,
  NO_NATIVE_COOKIES,
  readNativeCampusCookies,
  type NativeCookies,
} from '@/src/auth/campus-browser';
import { biometricUnlockAvailable, clearLogin, readLogin, saveLogin, storedLoginHint } from '@/src/auth/vault';
import { fetchOidcStatus, openOfficialCampus, signInWithUniversity, universityRedirectUri, universityUrls, type OidcStatus } from '@/src/auth/oidc';
import { Button, Mark } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { student } from '@/src/data';
import { keys } from '@/src/query/keys';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale, signInCampus, signInDemo, signInLocal, signInOidc } = useApp();
  // The status probes resolve to null when the server is unreachable — the
  // screen renders unknown as disabled, not as an error toast.
  const status = useQuery({ queryKey: keys.oidcStatus(), queryFn: () => fetchOidcStatus() }).data ?? null;
  const campusStatus = useQuery({ queryKey: keys.campusStatus(), queryFn: () => fetchCampusStatus() }).data ?? null;
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [campusLog, setCampusLog] = useState('');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [harvestBusy, setHarvestBusy] = useState(false);
  const [browserError, setBrowserError] = useState('');
  const [browserUrl, setBrowserUrl] = useState('');
  const [browserDiag, setBrowserDiag] = useState('');
  const webview = useRef<WebView | null>(null);
  const nativeCookies = useRef<NativeCookies>(NO_NATIVE_COOKIES);
  const redirectUri = universityRedirectUri();

  // Automated sign-in: the credential is typed here, kept in the device vault,
  // and only ever used by the hidden WebView on this device.
  const [autoAccount, setAutoAccount] = useState('');
  const [autoPassword, setAutoPassword] = useState('');
  const [autoRemember, setAutoRemember] = useState(true);
  const [autoBiometrics, setAutoBiometrics] = useState(false);
  const [biometricsReady, setBiometricsReady] = useState(false);
  const [savedLogin, setSavedLogin] = useState<{ account: string; biometrics: boolean } | null>(null);
  const [headlessOpen, setHeadlessOpen] = useState(false);
  const [headlessStatus, setHeadlessStatus] = useState('');
  const [headlessError, setHeadlessError] = useState('');
  const [headlessDump, setHeadlessDump] = useState('');
  const [headlessAttempt, setHeadlessAttempt] = useState(0);
  const headless = useRef<WebView | null>(null);
  const headlessHarvesting = useRef(false);
  const headlessCreds = useRef({ account: '', password: '', runId: '' });
  const headlessTimers = useRef<{ timeout: ReturnType<typeof setTimeout> | null; poll: ReturnType<typeof setInterval> | null }>({
    timeout: null,
    poll: null,
  });

  useEffect(() => {
    let active = true;
    biometricUnlockAvailable()
      .then((available) => {
        if (active) setBiometricsReady(available);
      })
      .catch(() => undefined);
    storedLoginHint()
      .then((hint) => {
        if (active && hint) setSavedLogin(hint);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      stopHeadlessTimers();
    },
    [],
  );

  // Sign-ins as mutations: the retry toast targets `mutate`, pending states
  // come from `isPending`, and the message/toast handling lives in the hooks.
  const campusSignIn = useMutation({
    mutationKey: ['campus-sign-in'],
    mutationFn: signInWithCampusToken,
    onMutate: () => {
      setError('');
      setCampusLog(
        tx(
          locale,
          `Rufe ${assistantUrl}/v1/campus/login auf …`,
          `Calling ${assistantUrl}/v1/campus/login …`,
        ),
      );
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
      signInCampus(profile);
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const message = campusMessage(locale, code, campusDetail(caught));
      setCampusLog(message);
      setError(message);
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

  // Third sign-in path: adopt session/cookies harvested from the C@MPUS web
  // view, then complete the flow with the regular token sign-in.
  const browserHarvest = useMutation({
    mutationKey: ['campus-browser-harvest'],
    mutationFn: (harvest: { cookies: string; storage: Record<string, string> }) => submitBrowserCredentials(harvest),
    onMutate: () => setBrowserError(''),
    onSuccess: (result) => {
      setBrowserOpen(false);
      stopHeadless();
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
      setBrowserError(message);
      setCampusLog(message);
      setError(message);
    },
    onSettled: () => setHarvestBusy(false),
  });

  const busy = campusSignIn.isPending || siamSignIn.isPending;

  type HarvestMessage = {
    diagnostic?: boolean;
    headless?: boolean;
    step?: unknown;
    error?: unknown;
    url?: unknown;
    title?: unknown;
    cookies?: unknown;
    local?: unknown;
    session?: unknown;
    storage?: unknown;
    passwordInputs?: unknown;
    visiblePasswordInputs?: unknown;
    formCount?: unknown;
    readyState?: unknown;
    forms?: unknown;
    controls?: unknown;
  };

  function parseMessage(event: WebViewMessageEvent): HarvestMessage | null {
    try {
      return JSON.parse(event.nativeEvent.data) as HarvestMessage;
    } catch {
      return null;
    }
  }

  /** Send a harvest payload to the server; both browser modes end here. */
  function submitHarvest(parsed: HarvestMessage) {
    setHarvestBusy(true);
    const storage: Record<string, string> = {};
    if (parsed.storage && typeof parsed.storage === 'object') {
      for (const [key, value] of Object.entries(parsed.storage as Record<string, unknown>)) {
        if (typeof value === 'string' && value) storage[String(key).slice(0, 120)] = value.slice(0, 4000);
      }
    }
    const cookies = mergeCookieStrings(
      typeof parsed.cookies === 'string' ? parsed.cookies : '',
      nativeCookies.current.header,
    );
    browserHarvest.mutate({ cookies, storage });
  }

  async function onBrowserMessage(event: WebViewMessageEvent) {
    if (harvestBusy) return;
    const parsed = parseMessage(event);
    if (!parsed) return;
    if (parsed.diagnostic) {
      const names = (value: unknown): string => (Array.isArray(value) ? value.map(String).join(', ') : '–');
      const native = nativeCookies.current.names;
      const lines = [
        `${tx(locale, 'Seite', 'Page')}: ${typeof parsed.url === 'string' ? parsed.url.slice(0, 120) : '–'}`,
        `${tx(locale, 'Cookies (JavaScript)', 'Cookies (JavaScript)')}: ${names(parsed.cookies)}`,
        `${tx(locale, 'Cookies (nativ, inkl. HttpOnly)', 'Cookies (native, incl. HttpOnly)')}: ${native.length ? native.join(', ') : '–'}`,
        `localStorage: ${names(parsed.local)}`,
        `sessionStorage: ${names(parsed.session)}`,
      ];
      console.info(`[campus-diagnose]\n${lines.join('\n')}`);
      setBrowserDiag(lines.join('\n'));
      return;
    }
    submitHarvest(parsed);
  }

  // Read the WebView's HttpOnly cookies first, then run the in-page harvest.
  async function adoptSignIn() {
    setBrowserError('');
    nativeCookies.current = await readNativeCampusCookies();
    webview.current?.injectJavaScript(HARVEST_JS);
  }

  async function diagnoseStorage() {
    nativeCookies.current = await readNativeCampusCookies();
    webview.current?.injectJavaScript(DIAGNOSE_JS);
  }

  function stopHeadlessTimers() {
    if (headlessTimers.current.timeout) clearTimeout(headlessTimers.current.timeout);
    if (headlessTimers.current.poll) clearInterval(headlessTimers.current.poll);
    headlessTimers.current = { timeout: null, poll: null };
  }

  function stopHeadless() {
    stopHeadlessTimers();
    headlessHarvesting.current = false;
    setHeadlessOpen(false);
    setHeadlessStatus('');
  }

  /** Messages from the automated WebView: autofill progress, then the harvest. */
  async function onHeadlessMessage(event: WebViewMessageEvent) {
    const parsed = parseMessage(event);
    if (!parsed) return;
    if (!parsed.headless) {
      submitHarvest(parsed);
      return;
    }
    const step = typeof parsed.step === 'string' ? parsed.step : '';
    console.info('[campus-headless]', step, typeof parsed.url === 'string' ? parsed.url.slice(0, 140) : '');
    if (step === 'no-form') {
      console.info(
        '[campus-headless]',
        `passwordInputs=${String(parsed.passwordInputs ?? '?')} visible=${String(parsed.visiblePasswordInputs ?? '?')} forms=${String(parsed.formCount ?? '?')} readyState=${String(parsed.readyState ?? '?')}`,
      );
    }
    if (step === 'dump') {
      const text = formatDump(parsed);
      setHeadlessDump(text);
      console.info(`[campus-headless-dump]\n${text}`);
      return;
    }
    if (step === 'signed-in') {
      if (headlessHarvesting.current) return;
      headlessHarvesting.current = true;
      setHeadlessStatus(tx(locale, 'Anmeldung erkannt, Sitzung wird übernommen …', 'Sign-in detected, adopting the session …'));
      nativeCookies.current = await readNativeCampusCookies();
      headless.current?.injectJavaScript(HARVEST_JS);
      return;
    }
    if (step === 'filled' || step === 'cta-click') {
      setHeadlessStatus(tx(locale, 'Anmeldedaten werden eingetragen …', 'Filling in the sign-in form …'));
      return;
    }
    if (step === 'too-many-attempts' || step === 'submit-failed' || step === 'error') {
      setHeadlessStatus('');
      setHeadlessError(
        tx(
          locale,
          'Die automatische Anmeldung kam nicht durch. Prüfe Kennung und Passwort oder melde dich im sichtbaren Browser an.',
          'The automated sign-in did not get through. Check the account id and password, or sign in in the visible browser.',
        ),
      );
    }
  }

  /**
   * Run the credential sign-in: the hidden WebView opens C@MPUS, fills the
   * university form, and the harvest above adopts the session. The credential
   * stays on this device; the assistant server only sees the session.
   */
  async function runHeadless(account: string, password: string, remember: { enabled: boolean; biometrics: boolean }) {
    setError('');
    setHeadlessError('');
    headlessHarvesting.current = false;
    headlessCreds.current = { account, password, runId: String(Date.now()) };
    setHeadlessStatus(tx(locale, 'Verbindung zu C@MPUS …', 'Connecting to C@MPUS …'));
    if (remember.enabled) {
      const ok = await saveLogin(
        { account, password, biometrics: remember.biometrics },
        tx(locale, 'C@MPUS-Anmeldung entsperren', 'Unlock the C@MPUS sign-in'),
      ).catch(() => false);
      if (ok) setSavedLogin({ account: account.trim(), biometrics: remember.biometrics });
      else setError(tx(locale, 'Der Gerätespeicher nimmt die Anmeldung nicht an.', 'The device vault refused the entry.'));
    }
    setHeadlessOpen(true);
    setHeadlessAttempt((value) => value + 1);
    stopHeadlessTimers();
    headlessTimers.current.poll = setInterval(() => {
      const current = headlessCreds.current;
      headless.current?.injectJavaScript(headlessAutofillScript(current.account, current.password, current.runId));
    }, 3000);
    headlessTimers.current.timeout = setTimeout(() => {
      stopHeadlessTimers();
      setHeadlessStatus('');
      setHeadlessError(tx(locale, 'Zeitüberschreitung der automatischen Anmeldung.', 'The automated sign-in timed out.'));
    }, 90_000);
  }

  function startHeadless() {
    const account = autoAccount.trim();
    if (account.length < 3 || !autoPassword) {
      setError(tx(locale, 'Bitte Kennung und Passwort eintragen.', 'Enter the account id and the password.'));
      return;
    }
    return runHeadless(account, autoPassword, {
      enabled: autoRemember,
      biometrics: autoBiometrics && biometricsReady,
    });
  }

  async function openSavedLogin() {
    setError('');
    setHeadlessError('');
    const stored = await readLogin(
      tx(locale, 'C@MPUS-Anmeldung entsperren', 'Unlock the C@MPUS sign-in'),
      savedLogin?.biometrics ?? false,
    );
    if (!stored) {
      setSavedLogin(null);
      setError(tx(locale, 'Die gespeicherte Anmeldung ist nicht mehr verfügbar.', 'The stored sign-in is no longer available.'));
      return;
    }
    setAutoAccount(stored.account);
    setAutoPassword(stored.password);
    setAutoBiometrics(stored.biometrics);
    await runHeadless(stored.account, stored.password, { enabled: false, biometrics: false });
  }

  async function forgetSavedLogin() {
    await clearLogin();
    setSavedLogin(null);
    setAutoPassword('');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Mark size={48} />
        <Text style={styles.brand}>University Assistant</Text>
        <Text style={styles.heroText}>{tx(locale, 'Studienassistenz für den Campusalltag', 'A study assistant for campus life')}</Text>
      </View>
      <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.lang}>
          <Pressable onPress={() => setLocale('de')} style={[styles.langButton, locale === 'de' && styles.langOn]}>
            <Text style={[styles.langText, locale === 'de' && styles.langTextOn]}>Deutsch</Text>
          </Pressable>
          <Pressable onPress={() => setLocale('en')} style={[styles.langButton, locale === 'en' && styles.langOn]}>
            <Text style={[styles.langText, locale === 'en' && styles.langTextOn]}>English</Text>
          </Pressable>
        </View>
        <Text style={styles.section}>{tx(locale, 'Automatische C@MPUS-Anmeldung (Beta)', 'Automated C@MPUS sign-in (Beta)')}</Text>
        <Text style={styles.notice}>
          {tx(
            locale,
            'Die Anmeldung läuft auf diesem Gerät in einem unsichtbaren Browser gegen die offizielle C@MPUS-Seite. Kennung und Passwort bleiben auf dem Gerät und werden nie an den Assistent-Server gesendet; der Server erhält nur die Sitzung.',
            'Sign-in runs on this device in an invisible browser against the official C@MPUS page. The account id and password stay on the device and are never sent to the assistant server; the server only receives the session.',
          )}
        </Text>
        <Text style={styles.label}>{tx(locale, 'Nutzerkennung', 'Account id')}</Text>
        <TextInput
          value={autoAccount}
          onChangeText={setAutoAccount}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          style={styles.input}
          placeholder="st123456"
          placeholderTextColor={colors.mute}
        />
        <Text style={styles.label}>{tx(locale, 'Passwort', 'Password')}</Text>
        <TextInput
          value={autoPassword}
          onChangeText={setAutoPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          textContentType="password"
          style={styles.input}
          placeholder={tx(locale, 'Passwort des st-Kontos', 'st-account password')}
          placeholderTextColor={colors.mute}
        />
        <View style={styles.toggleRow}>
          <Pressable onPress={() => setAutoRemember((value) => !value)} style={[styles.langButton, autoRemember && styles.langOn]}>
            <Text style={[styles.langText, autoRemember && styles.langTextOn]}>
              {tx(locale, 'Auf diesem Gerät speichern', 'Store on this device')}
            </Text>
          </Pressable>
          {biometricsReady ? (
            <Pressable
              onPress={() => setAutoBiometrics((value) => !value)}
              style={[styles.langButton, autoBiometrics && styles.langOn]}>
              <Text style={[styles.langText, autoBiometrics && styles.langTextOn]}>
                {tx(locale, 'Mit Biometrie schützen', 'Protect with biometrics')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Button
          label={headlessOpen ? tx(locale, 'Anmeldung läuft …', 'Signing in …') : tx(locale, 'Automatisch anmelden', 'Sign in automatically')}
          onPress={() => void startHeadless()}
        />
        {savedLogin ? (
          <Button
            secondary
            label={tx(locale, `Gespeicherte Anmeldung für ${savedLogin.account} verwenden`, `Use the stored sign-in for ${savedLogin.account}`)}
            onPress={() => void openSavedLogin()}
          />
        ) : null}
        {savedLogin ? (
          <Button secondary label={tx(locale, 'Gespeicherte Anmeldung löschen', 'Delete the stored sign-in')} onPress={() => void forgetSavedLogin()} />
        ) : null}
        {headlessError ? <Text style={styles.error}>{headlessError}</Text> : null}
        <Text style={styles.section}>{tx(locale, 'Bestehendes Konto, ohne Registrierung', 'Existing account, no registration')}</Text>
        <Text style={styles.notice}>
          {tx(
            locale,
            'Dein st-Konto und dein Passwort gelten auf der Anmeldeseite von C@MPUS. Die App muss dafür nicht beim TIK registriert sein. Der Identity Provider nimmt ein Passwort von einer unregistrierten App nicht entgegen.',
            'Your st-account and password work on the C@MPUS sign-in page. This app does not need to be registered with TIK for that. The identity provider does not accept a password from an unregistered app.',
          )}
        </Text>
        <Button
          label={busy ? tx(locale, 'Anmeldung läuft …', 'Signing in …') : tx(locale, 'Mit C@MPUS-Token anmelden', 'Sign in with C@MPUS token')}
          onPress={() => campusSignIn.mutate()}
        />
        <Button
          secondary
          label={tx(locale, 'Im C@MPUS-Browser anmelden (Beta)', 'Sign in with the C@MPUS browser (Beta)')}
          onPress={() => {
            setError('');
            setBrowserError('');
            setBrowserOpen(true);
          }}
        />
        {campusLog ? <Text style={error ? styles.error : styles.footer}>{campusLog}</Text> : null}
        <Text style={styles.footer}>
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
        </Text>
        <Button label={tx(locale, 'C@MPUS öffnen und anmelden', 'Open C@MPUS and sign in')} onPress={() => openOfficialCampus().catch(() => undefined)} secondary />
        <Text style={styles.label}>{tx(locale, 'Nutzerkennung für diese App', 'Account id for this app')}</Text>
        <TextInput
          value={account}
          onChangeText={setAccount}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholder="st123456"
          placeholderTextColor={colors.mute}
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
        <Text style={styles.footer}>
          {tx(
            locale,
            `Die Nutzerkennung steht dann im Profil. Stundenplan und Noten bleiben der Demonstrationsstand von ${student.name}, bis ein registrierter Client C@MPUS lesen darf.`,
            `The account id then shows on the profile. The timetable and grades stay the demonstration record of ${student.name}, until a registered client is allowed to read C@MPUS.`,
          )}
        </Text>
        <Text style={styles.section}>{tx(locale, 'Registrierter SIAM-Client', 'Registered SIAM client')}</Text>
        <Text style={styles.notice}>
          {tx(
            locale,
            'Wenn das TIK eine Client-ID vergeben hat, läuft die Anmeldung über den Identity Provider. Das Passwort bleibt auch dann auf der Seite der Universität.',
            'Once TIK has issued a client id, sign-in runs through the identity provider. The password still stays on the university page.',
          )}
        </Text>
        <Text style={styles.meta}>{universityUrls.campus}</Text>
        <Text style={styles.meta}>{universityUrls.authorize}</Text>
        <Button
          label={
            busy
              ? tx(locale, 'Anmeldung läuft …', 'Signing in …')
              : tx(locale, 'Mit SIAM anmelden', 'Sign in with SIAM')
          }
          onPress={() => siamSignIn.mutate()}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.footer}>
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
        </Text>
        <Text style={styles.redirect}>{redirectUri}</Text>
        <Button
          secondary
          label={tx(locale, 'Demonstrationsprofil öffnen', 'Open demonstration profile')}
          onPress={() => signInDemo(student.account)}
        />
        <Text style={styles.footer}>
          {tx(
            locale,
            `Ohne IdP wird der Datensatz von ${student.name} geladen. Stundenplan und Noten bleiben auch nach einer SIAM-Anmeldung dieser Demonstrationsstand, bis C@MPUS angebunden ist.`,
            `Without the IdP, the record of ${student.name} is loaded. The timetable and grades stay on that demonstration record after a SIAM sign-in, until C@MPUS is connected.`,
          )}
        </Text>
      </ScrollView>
      <Modal visible={browserOpen} animationType="slide" onRequestClose={() => setBrowserOpen(false)}>
        <View style={[styles.browserShell, { paddingTop: insets.top }]}>
          <View style={styles.browserBar}>
            <Text style={styles.browserTitle}>{tx(locale, 'C@MPUS-Anmeldung (Beta)', 'C@MPUS sign-in (Beta)')}</Text>
            <Pressable onPress={() => setBrowserOpen(false)} hitSlop={8}>
              <Text style={styles.browserClose}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.browserHint}>
            {tx(
              locale,
              'Melde dich auf der C@MPUS-Seite mit st-Konto und Passwort an und tippe dann auf Übernehmen. Das Passwort bleibt auf der Seite der Universität; übernommen werden nur Sitzung und Token.',
              'Sign in on the C@MPUS page with your st-account and password, then tap Adopt. The password stays on the university page; only the session and token are adopted.',
            )}
          </Text>
          <WebView
            ref={webview}
            source={{ uri: 'https://campus.uni-stuttgart.de/cusonline/' }}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            onNavigationStateChange={(state) => setBrowserUrl(state.url)}
            onMessage={onBrowserMessage}
            style={{ flex: 1 }}
          />
          <View style={{ padding: 12, paddingBottom: Math.max(insets.bottom, 12) }}>
            {browserUrl ? (
              <Text style={styles.browserHint} numberOfLines={2}>
                {browserUrl.slice(0, 120)}
              </Text>
            ) : null}
            {browserDiag ? <Text style={styles.browserDiag}>{browserDiag}</Text> : null}
            {harvestBusy ? (
              <Text style={styles.browserHint}>
                {tx(
                  locale,
                  'Prüfe Anmeldedaten gegen C@MPUS … das kann bis zu einer Minute dauern.',
                  'Checking credentials against C@MPUS … this can take up to a minute.',
                )}
              </Text>
            ) : null}
            {browserError ? <Text style={styles.error}>{browserError}</Text> : null}
            <Button
              label={harvestBusy ? tx(locale, 'Übernahme läuft …', 'Adopting …') : tx(locale, 'Anmeldung übernehmen', 'Adopt sign-in')}
              onPress={() => void adoptSignIn()}
            />
            <Button
              secondary
              label={tx(locale, 'Speicher diagnostizieren', 'Diagnose storage')}
              onPress={() => void diagnoseStorage()}
            />
          </View>
        </View>
      </Modal>
      <Modal
        visible={headlessOpen}
        animationType="fade"
        onRequestClose={() => {
          stopHeadless();
        }}>
        <View style={[styles.browserShell, { paddingTop: insets.top }]}>
          <WebView
            key={headlessAttempt}
            ref={headless}
            source={{ uri: CAMPUS_START_URL }}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            injectedJavaScript={headlessAutofillScript(
              headlessCreds.current.account,
              headlessCreds.current.password,
              headlessCreds.current.runId,
            )}
            onMessage={onHeadlessMessage}
            onLoadEnd={() => {
              // Re-run after a load: a late-rendered SPA form may not exist yet.
              const current = headlessCreds.current;
              headless.current?.injectJavaScript(headlessAutofillScript(current.account, current.password, current.runId));
            }}
            style={styles.hiddenWebView}
            pointerEvents="none"
          />
          <View style={styles.browserBar}>
            <Text style={styles.browserTitle}>{tx(locale, 'Automatische Anmeldung', 'Automated sign-in')}</Text>
            <Pressable
              onPress={() => {
                stopHeadless();
              }}
              hitSlop={8}>
              <Text style={styles.browserClose}>✕</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
            <Text style={styles.browserHint}>
              {headlessStatus || tx(locale, 'Anmeldung wird vorbereitet …', 'Preparing the sign-in …')}
            </Text>
            {harvestBusy ? (
              <Text style={styles.browserHint}>
                {tx(
                  locale,
                  'Prüfe Anmeldedaten gegen C@MPUS … das kann bis zu einer Minute dauern.',
                  'Checking credentials against C@MPUS … this can take up to a minute.',
                )}
              </Text>
            ) : null}
            {headlessError ? <Text style={styles.error}>{headlessError}</Text> : null}
            {headlessDump ? (
              <ScrollView style={{ maxHeight: 260 }}>
                <Text style={styles.browserDiag}>{headlessDump}</Text>
              </ScrollView>
            ) : null}
            <Button
              secondary
              label={tx(locale, 'Seite ausgeben', 'Dump page')}
              onPress={() => headless.current?.injectJavaScript(headlessDumpScript())}
            />
            {headlessError ? (
              <Button
                secondary
                label={tx(locale, 'Im sichtbaren Browser anmelden', 'Sign in in the visible browser')}
                onPress={() => {
                  stopHeadless();
                  setBrowserError('');
                  setBrowserOpen(true);
                }}
              />
            ) : null}
            <Button secondary label={tx(locale, 'Abbrechen', 'Cancel')} onPress={() => stopHeadless()} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Human-readable form of the identity-provider page dump for the log and the modal. */
function formatDump(parsed: { url?: unknown; title?: unknown; forms?: unknown; controls?: unknown; error?: unknown }): string {
  const forms = Array.isArray(parsed.forms) ? (parsed.forms as { action?: unknown; method?: unknown; html?: unknown }[]) : [];
  const controls = Array.isArray(parsed.controls) ? parsed.controls.map(String) : [];
  const lines = [
    `URL: ${typeof parsed.url === 'string' ? parsed.url : '–'}`,
    `TITLE: ${typeof parsed.title === 'string' ? parsed.title : '–'}`,
    `ERROR: ${typeof parsed.error === 'string' ? parsed.error : '–'}`,
    `CONTROLS:\n  ${controls.join('\n  ') || '–'}`,
  ];
  forms.forEach((form, index) => {
    lines.push(
      `FORM ${index + 1} method=${typeof form.method === 'string' ? form.method : '?'} action=${typeof form.action === 'string' ? form.action : '?'}`,
      typeof form.html === 'string' ? form.html : '–',
    );
  });
  return lines.join('\n');
}

function campusMessage(locale: 'de' | 'en', code: string, detail = ''): string {
  const suffix = detail ? ` ${detail}` : '';
  if (code === 'server_unreachable') {
    return tx(
      locale,
      'Der Assistenz-Server auf http://127.0.0.1:8787 antwortet nicht. Port 8081 ist nur die App. Starte im Projektordner: npm run assistant',
      'The assistant server at http://127.0.0.1:8787 is not answering. Port 8081 is only the app. In the project directory run: npm run assistant',
    );
  }
  if (code === 'token_missing') {
    return tx(locale, 'In der .env fehlt CAMPUS_BEARER_TOKEN. Server neu starten, nachdem der Wert gesetzt ist.', 'CAMPUS_BEARER_TOKEN is missing from .env. Restart the server after setting it.');
  }
  if (code === 'missing_session_cookie') {
    return tx(
      locale,
      'C@MPUS hat den Token erhalten und verlangt zusätzlich das Cookie PSESSIONID derselben Anmeldung. Setze nur diesen Wert als CAMPUS_SESSION_COOKIE in der .env und starte den Server neu.',
      'C@MPUS received the token and also requires the PSESSIONID cookie from that same login. Set only that value as CAMPUS_SESSION_COOKIE in .env and restart the server.',
    );
  }
  if (code === 'invalid_token') {
    return tx(
      locale,
      'C@MPUS meldet invalid_token. CAMPUS_BEARER_TOKEN ist abgelaufen oder gehört nicht zu diesem PSESSIONID. Setze einen neuen Token aus derselben Anmeldung und starte den Server neu.',
      'C@MPUS reports invalid_token. CAMPUS_BEARER_TOKEN has expired or does not belong to this PSESSIONID. Set a new token from the same login and restart the server.',
    );
  }
  if (code === 'no_credentials_found') {
    return tx(
      locale,
      'Aus dem Browser kam nichts Verwertbares an (Sitzungs-Cookie oft HttpOnly, kein Token im Speicher). Nutze den Token-Ablauf: C@MPUS im Browser öffnen, Token aus den Entwicklerwerkzeugen kopieren, per npm run campus:token setzen.',
      'Nothing usable came from the browser (the session cookie is often HttpOnly, no token in storage). Use the token flow instead: open C@MPUS in the browser, copy the token from devtools, set it with npm run campus:token.',
    );
  }
  if (code === 'campus_unauthorized') {
    return tx(locale, `C@MPUS hat den Token abgelehnt.${suffix}`, `C@MPUS rejected the token.${suffix}`);
  }
  return tx(locale, `C@MPUS-Anmeldung nicht abgeschlossen (${code}).${suffix}`, `C@MPUS sign-in did not finish (${code}).${suffix}`);
}

function messageFor(locale: 'de' | 'en', code: string, status: OidcStatus | null): string {
  if (code === 'cancelled') return tx(locale, 'Anmeldung abgebrochen.', 'Sign-in cancelled.');
  if (code === 'oidc_unconfigured') {
    return tx(
      locale,
      'Im Server fehlt OIDC_CLIENT_ID oder OIDC_CLIENT_SECRET. Beides trägt das TIK ein, nachdem der Dienst registriert wurde.',
      'The server is missing OIDC_CLIENT_ID or OIDC_CLIENT_SECRET. TIK issues both after the service is registered.',
    );
  }
  if (code === 'redirect_rejected') {
    return tx(locale, 'Diese Redirect-Adresse lässt der lokale Server nicht zu.', 'The local server rejected this redirect address.');
  }
  if (!status) {
    return tx(locale, 'Der Anmeldungs-Server ist nicht erreichbar. Läuft npm run assistant?', 'The sign-in server is unreachable. Is npm run assistant running?');
  }
  return tx(locale, `Anmeldung nicht abgeschlossen (${code}).`, `Sign-in did not finish (${code}).`);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue },
  hero: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, gap: 8 },
  brand: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
  heroText: { color: '#D6E4F5', fontSize: 16, lineHeight: 22 },
  sheet: { flex: 1, backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetContent: { padding: 24, gap: 10 },
  lang: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  langButton: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6 },
  langOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  langText: { color: colors.anthracite, fontWeight: '700' },
  langTextOn: { color: '#FFFFFF' },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  hiddenWebView: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 0 },
  section: { color: colors.anthracite, fontSize: 18, fontWeight: '700', marginTop: 8 },
  notice: { backgroundColor: colors.lightSoft, color: colors.anthracite, borderRadius: 14, padding: 12, lineHeight: 20 },
  label: { color: colors.inkSoft, fontSize: 13, fontWeight: '700', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.anthracite,
  },
  meta: { color: colors.inkSoft, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  footer: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  redirect: { color: colors.anthracite, fontSize: 13, lineHeight: 18 },
  browserShell: { flex: 1, backgroundColor: colors.paper },
  browserBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  browserTitle: { color: colors.anthracite, fontSize: 17, fontWeight: '700' },
  browserClose: { color: colors.blue, fontSize: 20, fontWeight: '700' },
  browserHint: { color: colors.inkSoft, fontSize: 13, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 8 },
  browserDiag: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo', paddingHorizontal: 12, paddingBottom: 8 },
});
