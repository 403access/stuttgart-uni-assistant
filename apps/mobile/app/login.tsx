import { MaterialIcons } from '@expo/vector-icons';
import { Platform, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoginFlow } from '@/src/auth/use-login-flow';
import { CampusBrowserModal } from '@/src/components/campus-browser-modal';
import { CampusHeadlessModal } from '@/src/components/campus-headless-modal';
import { Field, Checkbox, LanguagePicker } from '@/src/components/login-blocks';
import { SigningIn } from '@/src/components/signing-in';
import { Button, Mark } from '@/src/components/ui';
import { WebDeviceLogin } from '@/src/components/web-device-login';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

/**
 * The sign-in screen the gate redirects to once the splash screen lifts. On the
 * web the only way in is a QR code approved by an already signed-in phone. The
 * native screen leads with the automated C@MPUS sign-in. The remaining paths —
 * SIAM, the visible browser, the demonstration profile, the token — still live
 * on the deprecated `/login-legacy` screen.
 */

export default function LoginScreen() {
  if (Platform.OS === 'web') return <WebDeviceLogin />;
  return <NativeLoginScreen />;
}

/** What the app is for, one line each, shown under the brand. */
const HIGHLIGHTS = [
  { icon: 'event-note' as const, label: (locale: 'de' | 'en') => tx(locale, 'login.stundenplan') },
  { icon: 'school' as const, label: (locale: 'de' | 'en') => tx(locale, 'login.module') },
  { icon: 'mail-outline' as const, label: (locale: 'de' | 'en') => tx(locale, 'login.unimail') },
];

function NativeLoginScreen() {
  const insets = useSafeAreaInsets();
  const locale = useAppSelector((state) => state.locale);
  const { setLocale } = appActions;
  const { status, campusStatus, harvestBusy, browser, headless, campusSignIn } = useLoginFlow();
  // Both status probes fall back to null when the assistant server is down.
  const serverDown = status === null && campusStatus === null;

  return (
    <View style={styles.screen}>
      {/* KeyboardAwareScrollView scrolls the focused field above the
          keyboard and animates the shift natively, iOS and Android. */}
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <View style={styles.blobOne} pointerEvents="none" />
          <View style={styles.blobTwo} pointerEvents="none" />
          <View style={styles.markTile}>
            <Mark size={38} />
          </View>
          <Text style={styles.brand}>University Assistant</Text>
          <Text style={styles.tagline}>
            {tx(locale, 'login.studienalltag')}
          </Text>
          <View style={styles.highlights}>
            {HIGHLIGHTS.map((item) => (
              <View key={item.icon} style={styles.highlight}>
                <MaterialIcons name={item.icon} size={14} color="#FFFFFF" />
                <Text style={styles.highlightText}>{item.label(locale)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetTop}>
            <Text style={styles.eyebrow}>{tx(locale, 'common.anmeldung_2')}</Text>
            <LanguagePicker locale={locale} setLocale={setLocale} />
          </View>
          <Text style={styles.welcome}>{tx(locale, 'login.willkommen')}</Text>
          <Text style={styles.lead}>
            {tx(locale, 'login.melde')}
          </Text>

          {serverDown ? (
            <View style={styles.warning}>
              <MaterialIcons name="wifi-off" size={18} color={colors.warning} />
              <Text style={styles.warningText}>
                {tx(locale, 'login.lokale')}
              </Text>
            </View>
          ) : null}

          <View style={styles.primary}>
            <Field
              label={tx(locale, 'common.nutzerkennung')}
              value={headless.account}
              onChangeText={headless.setAccount}
              textContentType="username"
              autoCapitalize="none"
              placeholder="st123456@stud.uni-stuttgart.de"
            />
            <Field
              label={tx(locale, 'common.passwort')}
              value={headless.password}
              onChangeText={headless.setPassword}
              secureTextEntry
              textContentType="password"
              placeholder={tx(locale, 'common.passwort_st')}
            />
            <Checkbox
              label={tx(locale, 'login.merken')}
              hint={tx(locale, headless.biometricGate ? 'login.merken_biometrie' : 'login.merken_hinweis')}
              checked={headless.rememberLogin}
              disabled={headless.biometricGate}
              onPress={() => headless.setRemember((value) => !value)}
            />
            <Button
              label={
                headless.open || campusSignIn.isPending
                  ? tx(locale, 'common.anmeldung_laeuft')
                  : tx(locale, 'login.anmelden')
              }
              onPress={() => void headless.start()}
            />
            {headless.savedLogin ? (
              <Button
                secondary
                label={tx(locale, 'common.gespeicherte', [headless.savedLogin.account])}
                onPress={() => void headless.startStoredLogin()}
              />
            ) : null}
            {headless.savedLogin ? (
              <Button
                secondary
                label={tx(locale, 'common.gespeicherte_anmeldung')}
                onPress={() => void headless.forgetStoredLogin()}
              />
            ) : null}
            {campusSignIn.isPending ? (
              <SigningIn
                compact
                locale={locale}
                phase="profile"
                detail={tx(locale, 'common.studien')}
              />
            ) : null}
            {headless.error ? <Text style={styles.error}>{headless.error}</Text> : null}
          </View>
        </View>
      </KeyboardAwareScrollView>

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
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 30, gap: 10, overflow: 'hidden' },
  blobOne: { position: 'absolute', width: 220, height: 220, borderRadius: 220, backgroundColor: 'rgba(0,190,255,0.16)', top: -70, right: -50 },
  blobTwo: { position: 'absolute', width: 150, height: 150, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.07)', bottom: -30, left: -40 },
  markTile: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001A3A',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  brand: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 4 },
  tagline: { color: '#CFE0F2', fontSize: 16, lineHeight: 22 },
  highlights: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  highlightText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  sheet: { flex: 1, backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  welcome: { color: colors.anthracite, fontSize: 28, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  lead: { color: colors.inkSoft, fontSize: 15, lineHeight: 21, marginTop: -6 },
  warning: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: 14, padding: 12 },
  warningText: { flex: 1, color: colors.anthracite, fontSize: 13, lineHeight: 19 },
  primary: { borderRadius: 18, padding: 16, gap: 10, backgroundColor: colors.paper },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
