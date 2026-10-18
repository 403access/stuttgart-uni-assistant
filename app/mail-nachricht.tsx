import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { fetchMailBody, folderLabel, getMailSnapshot, mailDetail, mailMessage } from '@/src/auth/mail';
import { MailBody } from '@/src/components/mailBody';
import { Button, Card, Pill, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { MailBody as MailBodyData, MailMessage } from '@/src/types';

/** Fixed viewport: the WebView scrolls internally, the page keeps the normal app scroll. */
const WEBVIEW_HEIGHT = 480;

/**
 * The read view for one message, pushed from a row of the Messages tab. The plain text
 * body shows by default; the HTML view is an explicit choice behind a security note, and
 * the WebView itself runs no scripts and lets no navigation through.
 */
export default function MailMessageScreen() {
  const { locale } = useApp();
  const params = useLocalSearchParams<{ uid?: string | string[]; folder?: string | string[] }>();
  const uid = Number(Array.isArray(params.uid) ? params.uid[0] : params.uid);
  const folder = (Array.isArray(params.folder) ? params.folder[0] : params.folder) ?? 'INBOX';
  /** Header rows come from the loaded list (mirror-driven): no separate IMAP roundtrip. */
  const [message] = useState<MailMessage | null>(() => getMailSnapshot().messages?.find((row) => row.uid === uid) ?? null);
  const [body, setBody] = useState<MailBodyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHtml, setShowHtml] = useState(false);

  /** Derived, not state: a malformed uid must not produce a setState-in-effect round. */
  const invalidUid = !Number.isInteger(uid) || uid < 1;

  useEffect(() => {
    let active = true;
    if (invalidUid) return undefined;
    fetchMailBody(folder, uid)
      .then((next) => {
        if (active) setBody(next);
      })
      .catch((caught) => {
        if (active) setError(mailMessage(locale, caught instanceof Error ? caught.message : 'mail_failed', mailDetail(caught)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invalidUid, folder, locale, uid]);

  const html = body?.html ?? null;
  /**
   * Minimal document around the sanitized markup: viewport sized to the phone, plain
   * typography and visibly inset blockquotes (reply quotes). No scripts can execute here
   * anyway — the WebView runs without JavaScript.
   */
  const framedHtml = useMemo(
    () =>
      html
        ? `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:12px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:21px;color:#2b3038}blockquote{margin:10px 0;padding:2px 12px;border-left:3px solid #b8c4d0;color:#5b6673}</style></head><body>${html}</body></html>`
        : '',
    [html],
  );

  return (
    <Screen flush>
      <Stack.Screen options={{ title: tx(locale, 'mailNachricht.nachricht') }} />
      <Card square>
        <Text style={styles.subject}>{message?.subject || tx(locale, 'common.ohne')}</Text>
        <Text style={styles.line} selectable>
          {message?.from || '–'}
        </Text>
        {message?.to ? <Text style={styles.line}>{tx(locale, 'mailNachricht.an')}{message.to}</Text> : null}
        <Text style={styles.meta}>
          {message?.date ? new Date(message.date).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB') : '–'} · {folderLabel(folder, locale)}
        </Text>
        {message && !message.seen ? <Pill tone="wait" label={tx(locale, 'mailNachricht.neu')} /> : null}
      </Card>

      {invalidUid && !error ? <Text style={styles.error}>{mailMessage(locale, 'bad_uid')}</Text> : null}
      {loading && !invalidUid ? <Text style={styles.hint}>{tx(locale, 'mailNachricht.nachricht_laedt')}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !invalidUid && !error ? (
        <Card square>
          {body?.text ? (
            <MailBody text={body.text} locale={locale} />
          ) : (
            <Text style={styles.hint}>{tx(locale, 'mailNachricht.textteil')}</Text>
          )}
          {body?.truncated ? (
            <Text style={styles.hint}>
              {tx(locale, 'mailNachricht.anzeige')}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {html !== null ? (
        <>
          <Button
            secondary
            label={
              showHtml
                ? tx(locale, 'mailNachricht.html_ausblenden')
                : tx(locale, 'mailNachricht.html_anzeigen')
            }
            onPress={() => setShowHtml((value) => !value)}
          />
          <Card square>
            <Text style={styles.note}>
              {tx(locale, 'mailNachricht.html')}
            </Text>
          </Card>
          {showHtml ? (
            <View style={styles.webviewShell}>
              <View style={styles.webviewBar}>
                <Text style={styles.webviewLabel}>{tx(locale, 'mailNachricht.abgesicherte')}</Text>
                <Text style={styles.webviewFlag}>JS {tx(locale, 'mailNachricht.aus')} · {tx(locale, 'mailNachricht.link')}</Text>
              </View>
              <WebView
                source={{ html: framedHtml }}
                style={styles.webview}
                containerStyle={styles.webview}
                javaScriptEnabled={false}
                allowFileAccess={false}
                allowFileAccessFromFileURLs={false}
                allowUniversalAccessFromFileURLs={false}
                originWhitelist={['*']}
                onShouldStartLoadWithRequest={() => false}
                setSupportMultipleWindows={false}
                showsHorizontalScrollIndicator={false}
                accessibilityLabel={tx(locale, 'mailNachricht.html_ansicht')}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subject: { color: colors.anthracite, fontSize: 19, fontWeight: '700', lineHeight: 25 },
  line: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.inkSoft, fontSize: 12 },
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  note: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  webviewShell: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 0,
    backgroundColor: colors.paper,
  },
  webviewBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  webviewLabel: { color: colors.mute, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  webviewFlag: { color: colors.mute, fontSize: 12, fontWeight: '600' },
  webview: { height: WEBVIEW_HEIGHT, backgroundColor: colors.paper },
});
