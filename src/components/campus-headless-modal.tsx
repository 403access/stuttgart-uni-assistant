import type { RefObject } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
 * screen shows the phases of that work instead of a blank wait.
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
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.shell, { paddingTop: insets.top }]}>
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
        <View style={styles.bar}>
          <Text style={styles.title}>{tx(locale, 'Automatische Anmeldung', 'Automated sign-in')}</Text>
          <Pressable onPress={onCancel} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          {error ? <ErrorText>{error}</ErrorText> : null}
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
          {dump ? (
            <ScrollView style={styles.dump}>
              <Text style={styles.dumpText}>{dump}</Text>
            </ScrollView>
          ) : null}
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
  shell: { flex: 1, backgroundColor: colors.paper },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: colors.anthracite, fontSize: 17, fontWeight: '700' },
  close: { color: colors.blue, fontSize: 20, fontWeight: '700' },
  body: { flex: 1, padding: 16, gap: 12, justifyContent: 'center' },
  dump: { maxHeight: 240 },
  dumpText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' },
  hidden: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 0 },
});
