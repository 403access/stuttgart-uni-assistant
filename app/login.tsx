import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { assistantUrl } from '@/src/assistant/remote';
import { campusDetail, fetchCampusStatus, signInWithCampusToken, submitBrowserCredentials } from '@/src/auth/campus';
import { fetchOidcStatus, openOfficialCampus, signInWithUniversity, universityRedirectUri, universityUrls, type OidcStatus } from '@/src/auth/oidc';
import { Button, Mark } from '@/src/components/ui';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { student } from '@/src/data';
import { keys } from '@/src/query/keys';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

const HARVEST_JS =
  "(function(){var out={cookies:'',storage:{}};" +
  "try{out.cookies=document.cookie||'';}catch(e){}" +
  'try{var i,k;' +
  "for(i=0;i<localStorage.length;i++){k=localStorage.key(i);out.storage['local:'+k]=String(localStorage.getItem(k)).slice(0,4000);}" +
  "for(i=0;i<sessionStorage.length;i++){k=sessionStorage.key(i);out.storage['session:'+k]=String(sessionStorage.getItem(k)).slice(0,4000);}" +
  '}catch(e){out.error=String(e);}' +
  'window.ReactNativeWebView.postMessage(JSON.stringify(out));' +
  'return true;})();';

const DIAGNOSE_JS =
  '(function(){var out={diagnostic:true,url:location.href,cookies:[],local:[],session:[]};' +
  'try{out.cookies=document.cookie.split(";").map(function(c){return c.split("=")[0].trim();}).filter(Boolean);}catch(e){}' +
  'function keys(s){var r=[];try{for(var i=0;i<s.length;i++){var k=s.key(i);var v=String(s.getItem(k));r.push(k+"="+(v.length>200?v.slice(0,200)+"…(+"+(v.length-200)+")":v));}}catch(e){}return r;}' +
  'out.local=keys(localStorage);out.session=keys(sessionStorage);' +
  'window.ReactNativeWebView.postMessage(JSON.stringify(out));' +
  'return true;})();';

const CAMPUS_COOKIE_URL = 'https://campus.uni-stuttgart.de/cusonline/';

interface NativeCookies {
  header: string;
  names: string[];
}

const NO_NATIVE_COOKIES: NativeCookies = { header: '', names: [] };

/**
 * Read the cookie store of the WebView natively. `document.cookie` never shows
 * `HttpOnly` cookies, and C@MPUS needs `PSESSIONID` (HttpOnly) next to the
 * bearer token. On iOS that store is the WebKit one the WebView itself uses.
 */
async function readNativeCampusCookies(): Promise<NativeCookies> {
  if (Platform.OS === 'web') return NO_NATIVE_COOKIES;
  try {
    const { default: CookieManager } = await import('@preeternal/react-native-cookie-manager');
    const cookies = await CookieManager.getAsArray(
      CAMPUS_COOKIE_URL,
      Platform.OS === 'ios' ? { iosCookieStore: 'webKit' } : undefined,
    );
    return {
      header: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
      names: cookies.map((cookie) => cookie.name),
    };
  } catch (caught) {
    console.info('[campus-cookies] native read failed', caught instanceof Error ? caught.message : String(caught));
    return NO_NATIVE_COOKIES;
  }
}

/** Join cookie strings; the first value per name wins, so the native store fills the HttpOnly gaps. */
function mergeCookieStrings(...parts: string[]): string {
  const seen = new Set<string>();
  const pairs: string[] = [];
  for (const part of parts) {
    for (const pair of part.split(';')) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const separator = trimmed.indexOf('=');
      const name = (separator > 0 ? trimmed.slice(0, separator) : trimmed).trim().toLowerCase();
      if (seen.has(name)) continue;
      seen.add(name);
      pairs.push(trimmed);
    }
  }
  return pairs.join('; ');
}

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

  async function onBrowserMessage(event: WebViewMessageEvent) {
    if (harvestBusy) return;
    let parsed: { diagnostic?: boolean; url?: unknown; cookies?: unknown; local?: unknown; session?: unknown; cookiesRaw?: unknown; storage?: unknown } = {};
    try {
      parsed = JSON.parse(event.nativeEvent.data) as typeof parsed;
    } catch {
      return;
    }
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Mark size={48} />
        <Text style={styles.brand}>Stuttgart Uni</Text>
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
        <Text style={styles.section}>{tx(locale, 'Bestehendes Konto, ohne Registrierung', 'Existing account, no registration')}</Text>
        <Text style={styles.notice}>
          {tx(
            locale,
            'Dein st-Konto und dein Passwort gelten auf der Anmeldeseite von C@MPUS. Die App muss dafür nicht beim TIK registriert sein. Das Passwort wird dort eingegeben, nicht in dieses Formular. Der Identity Provider nimmt ein Passwort von einer unregistrierten App nicht entgegen.',
            'Your st-account and password work on the C@MPUS sign-in page. This app does not need to be registered with TIK for that. The password is entered there, not in this form. The identity provider does not accept a password from an unregistered app.',
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
    </View>
  );
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
