import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { fetchMailBody, folderLabel, getMailSnapshot, mailDetail, mailMessage, setMailSeen } from '@/src/auth/mail';
import { MailBody } from '@/src/components/mailBody';
import { Button, Card, Pill } from '@ua/ui';
import { useMailSnapshot } from '@/src/mail/use-mail-snapshot';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale, MailBody as MailBodyData, MailMessage } from '@ua/core/domain/types';

import { MailComposeActions } from '@ua/feature-mail/ui';

/** Fixed viewport: the WebView scrolls internally, the page keeps the normal app scroll. */
const WEBVIEW_HEIGHT = 480;

/**
 * One message, header, actions and body. Shared by the pushed read screen and
 * the desktop split view; the split view passes `onClose` so its pane can be
 * dismissed without leaving the inbox.
 */
export function MailReader({
  uid,
  folder,
  locale,
  onClose,
}: {
  uid: number;
  folder: string;
  locale: Locale;
  onClose?: () => void;
}) {
  /**
   * Header rows come from the loaded list (mirror-driven): no separate IMAP roundtrip.
   * The snapshot wins so the read flag follows every publish; the captured row is the
   * fallback while the list is being replaced (e.g. a folder refresh).
   */
  const [initial] = useState<MailMessage | null>(() => getMailSnapshot().messages?.find((row) => row.uid === uid) ?? null);
  const snapshot = useMailSnapshot();
  const live = snapshot.folder === folder ? snapshot.messages?.find((row) => row.uid === uid) : undefined;
  const message = live ?? initial;
  const [body, setBody] = useState<MailBodyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seenBusy, setSeenBusy] = useState(false);
  const [seenError, setSeenError] = useState('');
  const [showHtml, setShowHtml] = useState(false);
  /** Opening the view marks the mail read exactly once; the button below can undo it. */
  const markedOnOpen = useRef(false);

  /** Derived, not state: a malformed uid must not produce a setState-in-effect round. */
  const invalidUid = !Number.isInteger(uid) || uid < 1;

  const toggleSeen = useCallback(async () => {
    if (!message || seenBusy) return;
    setSeenBusy(true);
    setSeenError('');
    try {
      await setMailSeen(folder, uid, !message.seen);
    } catch (caught) {
      setSeenError(mailMessage(locale, caught instanceof Error ? caught.message : 'mail_failed', mailDetail(caught)));
    } finally {
      setSeenBusy(false);
    }
  }, [folder, locale, message, seenBusy, uid]);

  useEffect(() => {
    if (invalidUid || markedOnOpen.current || !message) return;
    markedOnOpen.current = true;
    if (message.seen) return;
    setMailSeen(folder, uid, true).catch((caught) => {
      setSeenError(mailMessage(locale, caught instanceof Error ? caught.message : 'mail_failed', mailDetail(caught)));
    });
  }, [folder, invalidUid, locale, message, uid]);

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
    <>
      {onClose ? (
        <View style={styles.paneHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.paneKicker}>{tx(locale, 'mailNachricht.nachricht')}</Text>
            <Text style={styles.paneFolder} numberOfLines={1}>
              {folderLabel(folder, locale)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx(locale, 'common.schliessen')}
            onPress={onClose}
            style={(state: { pressed: boolean; hovered?: boolean }) => [styles.closeButton, state.hovered && styles.closeHover, state.pressed && styles.pressed]}>
            <MaterialIcons name="close" size={20} color={colors.inkSoft} />
          </Pressable>
        </View>
      ) : null}
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

      {message && !invalidUid ? <MailComposeActions uid={uid} folder={folder} locale={locale} /> : null}

      {message && !invalidUid ? (
        <Button
          secondary
          label={message.seen ? tx(locale, 'mailNachricht.ungelesen_markieren') : tx(locale, 'mailNachricht.gelesen_markieren')}
          onPress={() => void toggleSeen()}
        />
      ) : null}
      {seenError ? <Text style={styles.error}>{seenError}</Text> : null}

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
            label={showHtml ? tx(locale, 'mailNachricht.html_ausblenden') : tx(locale, 'mailNachricht.html_anzeigen')}
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
    </>
  );
}

const styles = themedStyles((colors) => ({
  paneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  paneKicker: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  paneFolder: { color: colors.anthracite, fontSize: 15, fontWeight: '700', marginTop: 2 },
  closeButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist },
  closeHover: { backgroundColor: colors.blueSoft },
  pressed: { opacity: 0.72 },
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
}));
