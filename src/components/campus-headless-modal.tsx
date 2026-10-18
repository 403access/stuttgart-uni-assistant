import type { RefObject } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMPUS_START_URL } from '@/src/auth/campus-browser';
import type { CampusLoginPhase } from '@/src/auth/campus-progress';
import { ErrorText } from '@/src/components/login-blocks';
import { SigningIn } from '@/src/components/signing-in';
import { Button } from '@/src/components/ui';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/**
 * The automated sign-in: a hidden WebView drives the real C@MPUS pages, and the
 * screen shows the phases of that work instead of a blank wait. It is a
 * full-screen surface of its own — the progress takes the display, the escape
 * actions sit in a footer — rather than a dialog over the login form.
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
      <View style={[styles.screen, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 16) }]}>
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
        <View style={styles.progress}>
          <Text style={styles.title}>{tx(locale, 'campusHeadlessModal.automatische')}</Text>
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
        </View>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  // The step list fills the whole surface: the title sits at the top and the
  // progress spreads down to the footer instead of hanging in the middle.
  progress: { flex: 1, gap: 16, paddingHorizontal: 24, paddingTop: 8 },
  title: { color: colors.anthracite, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  dump: { maxHeight: 200, marginHorizontal: 24 },
  dumpText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' },
  footer: { paddingHorizontal: 24, gap: 10 },
  hidden: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 0 },
});
