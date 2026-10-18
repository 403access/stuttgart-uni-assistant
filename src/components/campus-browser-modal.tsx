import type { RefObject } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMPUS_START_URL } from '@/src/auth/campus-browser';
import { ErrorText } from '@/src/components/login-blocks';
import { SigningIn } from '@/src/components/signing-in';
import { Button } from '@/src/components/ui';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/**
 * The visible "adopt sign-in" browser: the user signs in on the real C@MPUS
 * page, then the session and token are read out of the WebView.
 */
export function CampusBrowserModal({
  visible,
  locale,
  webview,
  url,
  diag,
  busy,
  profileLoading,
  error,
  onClose,
  onNavigation,
  onMessage,
  onAdopt,
  onDiagnose,
}: {
  visible: boolean;
  locale: Locale;
  webview: RefObject<WebView | null>;
  url: string;
  diag: string;
  busy: boolean;
  profileLoading: boolean;
  error: string;
  onClose: () => void;
  onNavigation: (url: string) => void;
  onMessage: (event: WebViewMessageEvent) => void;
  onAdopt: () => void;
  onDiagnose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Text style={styles.title}>{tx(locale, 'C@MPUS-Anmeldung (Beta)', 'C@MPUS sign-in (Beta)')}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {tx(
            locale,
            'Melde dich auf der C@MPUS-Seite mit st-Konto und Passwort an und tippe dann auf Übernehmen. Das Passwort bleibt auf der Seite der Universität; übernommen werden nur Sitzung und Token.',
            'Sign in on the C@MPUS page with your st-account and password, then tap Adopt. The password stays on the university page; only the session and token are adopted.',
          )}
        </Text>
        <WebView
          ref={webview}
          source={{ uri: CAMPUS_START_URL }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          onNavigationStateChange={(state) => onNavigation(state.url)}
          onMessage={onMessage}
          style={{ flex: 1 }}
        />
        <View style={{ padding: 12, paddingBottom: Math.max(insets.bottom, 12) }}>
          {url ? (
            <Text style={styles.hint} numberOfLines={2}>
              {url.slice(0, 120)}
            </Text>
          ) : null}
          {diag ? <Text style={styles.diag}>{diag}</Text> : null}
          {busy || profileLoading ? (
            <SigningIn
              compact
              locale={locale}
              phase={profileLoading ? 'profile' : 'adopt'}
              detail={
                profileLoading
                  ? tx(locale, 'Studien und Curriculum werden geladen …', 'Loading your studies and curriculum …')
                  : tx(
                      locale,
                      'Prüfe Anmeldedaten gegen C@MPUS … das kann bis zu einer Minute dauern.',
                      'Checking credentials against C@MPUS … this can take up to a minute.',
                    )
              }
            />
          ) : null}
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button
            label={busy ? tx(locale, 'Übernahme läuft …', 'Adopting …') : tx(locale, 'Anmeldung übernehmen', 'Adopt sign-in')}
            onPress={onAdopt}
          />
          <Button secondary label={tx(locale, 'Speicher diagnostizieren', 'Diagnose storage')} onPress={onDiagnose} />
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
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 8 },
  diag: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo', paddingBottom: 8 },
});
