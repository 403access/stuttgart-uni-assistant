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
          pointerEvents="none"
        />
        <View style={styles.progress}>
          <Text style={styles.title}>{tx(locale, 'Automatische Anmeldung', 'Automated sign-in')}</Text>
          <SigningIn
            locale={locale}
            phase={phase}
            detail={
              profileLoading
                ? tx(locale, 'Studien und Curriculum werden geladen …', 'Loading your studies and curriculum …')
                : busy
                  ? tx(
                      locale,
                      'Prüfe Anmeldedaten gegen C@MPUS … das kann bis zu einer Minute dauern.',
                      'Checking credentials against C@MPUS … this can take up to a minute.',
                    )
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
          <Button secondary label={tx(locale, 'Seite ausgeben', 'Dump page')} onPress={onDump} />
          {error ? (
            <Button secondary label={tx(locale, 'Im sichtbaren Browser anmelden', 'Sign in in the visible browser')} onPress={onFallback} />
          ) : null}
          <Button secondary label={tx(locale, 'Abbrechen', 'Cancel')} onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  progress: { flex: 1, justifyContent: 'center', gap: 20, paddingHorizontal: 24 },
  title: { color: colors.anthracite, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  dump: { maxHeight: 200, marginHorizontal: 24 },
  dumpText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' },
  footer: { paddingHorizontal: 24, gap: 10 },
  hidden: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 0 },
});
