import { StatusBar } from 'expo-status-bar';
import type { RefObject } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMPUS_START_URL } from '@/src/auth/campus-browser';
import type { CampusLoginPhase } from '@/src/auth/campus-progress';
import { ErrorText } from '@/src/components/login-blocks';
import { SigningIn } from '@/src/components/signing-in';
import { Button, Mark } from '@ua/ui';
import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

/**
 * The automated sign-in: a hidden WebView drives the real C@MPUS pages, and the
 * screen shows the phases of that work instead of a blank wait. It is a
 * full-screen surface of its own — a blue hero and white sheet like the login
 * screen, with the progress taking the sheet and the escape actions in a footer
 * — rather than a dialog over the login form.
 */
export function CampusHeadlessModal({
  visible,
  locale,
  attempt,
  webview,
  injectedScript,
  phase,
  detail,
  error,
  dump,
  profileLoading,
  busy,
  onMessage,
  onLoadEnd,
  onDump,
  onCancel,
  onFallback,
}: {
  visible: boolean;
  locale: Locale;
  /** Remounting on a new attempt reloads the start URL. */
  attempt: number;
  webview: RefObject<WebView | null>;
  injectedScript: string;
  phase: CampusLoginPhase;
  detail: string;
  error: string;
  dump: string;
  profileLoading: boolean;
  busy: boolean;
  onMessage: (event: WebViewMessageEvent) => void;
  onLoadEnd: () => void;
  onDump: () => void;
  onCancel: () => void;
  onFallback: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} presentationStyle="fullScreen" animationType="fade" onRequestClose={onCancel}>
      <View style={styles.screen}>
        <StatusBar style={visible ? 'light' : 'dark'} />
        {/* The waiting WebView stays mounted (it drives the sign-in), but it must
            not take layout space. `style` only reaches the inner native view;
            `containerStyle` is the flex-1 wrapper, so the hidden frame goes
            there — otherwise it splits the height with the progress. */}
        <WebView
          key={attempt}
          ref={webview}
          source={{ uri: CAMPUS_START_URL }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          injectedJavaScript={injectedScript}
          onMessage={onMessage}
          onLoadEnd={onLoadEnd}
          style={styles.hidden}
          containerStyle={styles.hidden}
          pointerEvents="none"
        />

        <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          <View style={styles.blobOne} pointerEvents="none" />
          <View style={styles.blobTwo} pointerEvents="none" />
          <View style={styles.markTile}>
            <Mark size={34} />
          </View>
          <Text style={styles.brand}>University Assistant</Text>
          <Text style={styles.heroTitle}>{tx(locale, 'campusHeadlessModal.automatische')}</Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <SigningIn
            locale={locale}
            phase={phase}
            detail={
              profileLoading
                ? tx(locale, 'common.studien')
                : busy
                  ? tx(locale, 'common.pruefe')
                  : detail || undefined
            }
          />
          {error ? <ErrorText>{error}</ErrorText> : null}
          {dump ? (
            <ScrollView style={styles.dump}>
              <Text style={styles.dumpText}>{dump}</Text>
            </ScrollView>
          ) : null}
          <View style={styles.footer}>
            {/* The page dump is a debugging aid, so its trigger stays in dev builds. */}
            {__DEV__ ? <Button secondary label={tx(locale, 'campusHeadlessModal.seite')} onPress={onDump} /> : null}
            {error ? (
              <Button secondary label={tx(locale, 'campusHeadlessModal.sichtbaren')} onPress={onFallback} />
            ) : null}
            <Button secondary label={tx(locale, 'common.abbrechen')} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.brand },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 26,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  blobOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(0,190,255,0.16)',
    top: -70,
    right: -50,
  },
  blobTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -30,
    left: -40,
  },
  markTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001A3A',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  brand: { color: '#CFE0F2', fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  heroTitle: { color: '#FFFFFF', fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  dump: { maxHeight: 160 },
  dumpText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' },
  footer: { gap: 10 },
  hidden: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 0 },
}));
