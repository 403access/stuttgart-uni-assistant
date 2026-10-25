import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { fetchMailBody, folderKind, getMailSnapshot, mailDetail, mailMessage, sendMail } from '@/src/auth/mail';
import { showToast , Button, Card, Pill, Screen } from '@ua/ui';
import { people } from '@ua/core/data/people';
import { useMailSnapshot } from '@/src/mail/use-mail-snapshot';
import { getAppState } from '@ua/core/state/app-store';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { MailAttachment, MailRecipient } from '@ua/core/domain/types';

import { AttachmentList , RecipientField , TemplateSheet , pickMailAttachments } from '@ua/feature-mail/ui';
import { buildComposeDraft, buildSignature, forwardSubject, replySubject, type ComposeMode , MailTemplate } from '@ua/feature-mail';
import { clearMailDraft, loadMailDraft, saveMailDraft } from '@/src/mail/draft-storage';
import { loadRecentRecipients, rememberRecipients } from '@/src/mail/recent-recipients';
import { buildContactRegistry, parseRecipient, parseRecipientHeader } from '@ua/feature-mail';

/**
 * Compose, reply and forward in one screen. The address field doubles as the
 * address book (lecturers, mailbox contacts, recent recipients with badges),
 * drafts save themselves, and templates/attachments are one tap away.
 */
function currentSignature(): string {
  const state = getAppState();
  return buildSignature(state.sessionName, getMailSnapshot().status?.address ?? state.sessionEmail);
}

export default function MailComposeScreen() {
  const locale = useAppSelector((state) => state.locale);
  const authToken = useAppSelector((state) => state.authToken);
  const ready = useAppSelector((state) => state.ready);
  const snapshot = useMailSnapshot();
  const params = useLocalSearchParams<{ mode?: string | string[]; uid?: string | string[]; folder?: string | string[] }>();
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode: ComposeMode = rawMode === 'reply' || rawMode === 'forward' ? rawMode : 'new';
  const uid = Number(Array.isArray(params.uid) ? params.uid[0] : params.uid);
  const folder = (Array.isArray(params.folder) ? params.folder[0] : params.folder) ?? 'INBOX';
  /** Snapshot of the original message at mount; the reply prefill never depends on later polls. */
  const [initialOriginal] = useState(() =>
    mode === 'new'
      ? null
      : (getMailSnapshot().messages?.find((row) => row.uid === uid) ?? snapshot.messages?.find((row) => row.uid === uid) ?? null),
  );

  const [to, setTo] = useState<MailRecipient[]>(() =>
    initialOriginal && mode === 'reply' ? parseRecipientHeader(initialOriginal.from) : [],
  );
  const [cc, setCc] = useState<MailRecipient[]>([]);
  const [bcc, setBcc] = useState<MailRecipient[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(() =>
    initialOriginal ? (mode === 'reply' ? replySubject(initialOriginal.subject, locale) : forwardSubject(initialOriginal.subject, locale)) : '',
  );
  const [text, setText] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>({ start: 0, end: 0 });
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [recent, setRecent] = useState<MailRecipient[]>([]);
  const [draftReady, setDraftReady] = useState(mode === 'new' ? false : true);
  const [restored, setRestored] = useState(false);
  const [attachmentsDropped, setAttachmentsDropped] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [prefillPending, setPrefillPending] = useState(mode !== 'new');
  const prefilled = useRef(false);
  const touched = useRef(false);

  const contacts = useMemo(
    () => buildContactRegistry({ people, messages: snapshot.messages ?? [], recent, locale }),
    [snapshot.messages, recent, locale],
  );
  const recipients = useMemo(() => [...to, ...cc, ...bcc], [to, cc, bcc]);

  useEffect(() => {
    let active = true;
    loadRecentRecipients()
      .then((rows) => {
        if (active) setRecent(rows);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  /** A saved draft wins for a fresh message; otherwise it starts with the signature. */
  useEffect(() => {
    if (mode !== 'new' || !ready) return undefined;
    let active = true;
    loadMailDraft()
      .then((draft) => {
        if (!active || touched.current) return;
        if (draft) {
          setTo(draft.to);
          setCc(draft.cc);
          setBcc(draft.bcc);
          setShowCc(draft.cc.length > 0);
          setShowBcc(draft.bcc.length > 0);
          setSubject(draft.subject);
          setText(draft.text);
          setAttachments(draft.attachments);
          setAttachmentsDropped(draft.attachmentsDropped);
          setRestored(true);
          if (draft.text) setSelection({ start: 0, end: 0 });
          return;
        }
        const block = currentSignature();
        if (block && !touched.current) setText(block);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setDraftReady(true);
      });
    return () => {
      active = false;
    };
  }, [mode, ready]);

  /** Reply/forward: headers are already set at mount; the quoted body follows from the server cache. */
  useEffect(() => {
    if (mode === 'new' || prefilled.current || !initialOriginal || !Number.isInteger(uid) || uid < 1) return;
    prefilled.current = true;
    fetchMailBody(folder, uid)
      .then((body) => {
        const draft = buildComposeDraft({
          mode,
          message: initialOriginal,
          body,
          locale,
          signature: currentSignature(),
        });
        setTo(draft.to);
        setSubject(draft.subject);
        setText(draft.text);
        setSelection({ start: 0, end: 0 });
      })
      .catch((caught) => {
        setError(mailMessage(locale, caught instanceof Error ? caught.message : 'mail_failed', mailDetail(caught)));
      })
      .finally(() => setPrefillPending(false));
  }, [folder, initialOriginal, locale, mode, uid]);

  /** Autosave only after the first real edit, so a pristine compose never creates a draft. */
  useEffect(() => {
    if (mode !== 'new' || !draftReady || !touched.current) return undefined;
    const timer = setTimeout(() => {
      void saveMailDraft({ to, cc, bcc, subject, text, attachments });
      setSavedAt(new Date().toISOString());
    }, 650);
    return () => clearTimeout(timer);
  }, [attachments, bcc, cc, draftReady, mode, subject, text, to]);

  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      touched.current = true;
      setter(value);
    };
  }

  async function addAttachments() {
    if (attachBusy) return;
    setAttachBusy(true);
    setHint('');
    try {
      const result = await pickMailAttachments(attachments);
      if (result.attachments.length) {
        touched.current = true;
        setAttachments((current) => [...current, ...result.attachments]);
      }
      if (result.rejected.length) {
        const first = result.rejected[0];
        setHint(
          first.reason === 'count'
            ? tx(locale, 'mailVerfassen.anhang_limit')
            : first.reason === 'read'
              ? tx(locale, 'mailVerfassen.anhang_lesen', [first.name])
              : tx(locale, 'mailVerfassen.anhang_zu_gross_2', [first.name]),
        );
      }
    } catch {
      setError(tx(locale, 'mailVerfassen.anhang_fehler'));
    } finally {
      setAttachBusy(false);
    }
  }

  function applyTemplate(template: MailTemplate) {
    touched.current = true;
    if (!subject.trim()) setSubject(template.subject[locale]);
    setText((current) => (current.trim() ? `${current}\n\n${template.body[locale]}` : template.body[locale]));
  }

  function discardDraft() {
    touched.current = false;
    setTo([]);
    setCc([]);
    setBcc([]);
    setShowCc(false);
    setShowBcc(false);
    setSubject('');
    setAttachments([]);
    setAttachmentsDropped(false);
    setText(currentSignature());
    setRestored(false);
    setSavedAt('');
    setSelection({ start: 0, end: 0 });
    void clearMailDraft();
  }

  async function submit() {
    if (busy) return;
    if (recipients.length === 0) {
      setError(tx(locale, 'mailVerfassen.empfaenger_fehlt'));
      return;
    }
    const invalid = recipients.find((recipient) => !parseRecipient(recipient.email));
    if (invalid) {
      setError(tx(locale, 'mailVerfassen.empfaenger_ungueltig', [invalid.email]));
      return;
    }
    setBusy(true);
    setError('');
    setHint('');
    try {
      const sentFolder = snapshot.folders?.find((entry) => folderKind(entry.name) === 'sent')?.name ?? null;
      const result = await sendMail(
        {
          to,
          cc,
          bcc,
          subject,
          text,
          attachments,
          sentFolder,
          inReplyTo: mode === 'reply' ? initialOriginal?.messageId : undefined,
          references: mode === 'reply' ? initialOriginal?.messageId : undefined,
        },
        authToken,
      );
      await clearMailDraft();
      await rememberRecipients(recipients);
      showToast({
        tone: 'success',
        title: tx(locale, 'mailVerfassen.gesendet'),
        message: result.rejected.length
          ? tx(locale, 'mailVerfassen.gesendet_teil', [result.rejected.join(', ')])
          : tx(locale, 'mailVerfassen.gesendet_an', [recipients.map((entry) => entry.name || entry.email).join(', ')]),
      });
      router.back();
    } catch (caught) {
      setError(mailMessage(locale, caught instanceof Error ? caught.message : 'mail_failed', mailDetail(caught)));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'reply'
      ? tx(locale, 'mailVerfassen.antworten')
      : mode === 'forward'
        ? tx(locale, 'mailVerfassen.weiterleiten')
        : tx(locale, 'mailVerfassen.neu');

  return (
    <Screen
      narrow
      scroll={false}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerMeta}>
            <Text style={styles.footerText}>
              {tx(locale, recipients.length === 1 ? 'mailVerfassen.empfaenger_eins' : 'mailVerfassen.empfaenger_anzahl', [
                recipients.length,
                attachments.length
                  ? tx(locale, attachments.length === 1 ? 'mailVerfassen.anhang_eins' : 'mailVerfassen.anhang_viele', [attachments.length])
                  : '',
              ])}
            </Text>
            {savedAt ? <Text style={styles.saved}>{tx(locale, 'mailVerfassen.entwurf_gespeichert')}</Text> : null}
          </View>
          <Button label={busy ? tx(locale, 'mailVerfassen.sendet') : tx(locale, 'mailVerfassen.senden')} onPress={() => void submit()} />
        </View>
      }>
      <Stack.Screen options={{ title }} />
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bottomOffset={28}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {restored ? (
          <View style={styles.restored}>
            <Pill tone="blue" label={tx(locale, 'mailVerfassen.entwurf_wiederhergestellt')} />
            <Pressable onPress={discardDraft} hitSlop={8} accessibilityRole="button">
              <Text style={styles.restoredAction}>{tx(locale, 'mailVerfassen.entwurf_verwerfen')}</Text>
            </Pressable>
          </View>
        ) : null}

        {mode !== 'new' && !initialOriginal ? <Text style={styles.error}>{tx(locale, 'mailVerfassen.original_fehlt')}</Text> : null}

        <Card>
          <RecipientField
            label={tx(locale, 'mailVerfassen.an')}
            value={to}
            onChange={edit(setTo)}
            contacts={contacts}
            locale={locale}
            placeholder={tx(locale, 'mailVerfassen.empfaenger_platzhalter')}
            autoFocus={mode === 'new'}
          />

          <View style={styles.ccRow}>
            {['cc', 'bcc'].map((kind) => {
              const shown = kind === 'cc' ? showCc : showBcc;
              return (
                <Pressable
                  key={kind}
                  onPress={() => (kind === 'cc' ? setShowCc((value) => !value) : setShowBcc((value) => !value))}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={tx(locale, shown ? 'mailVerfassen.verbergen' : 'mailVerfassen.hinzufuegen', [kind.toUpperCase()])}
                >
                  <Text style={styles.ccToggle}>{`${shown ? '−' : '+'} ${kind.toUpperCase()}`}</Text>
                </Pressable>
              );
            })}
          </View>

          {showCc ? (
            <RecipientField
              label={tx(locale, 'mailVerfassen.cc')}
              value={cc}
              onChange={edit(setCc)}
              contacts={contacts}
              locale={locale}
              placeholder={tx(locale, 'mailVerfassen.empfaenger_platzhalter')}
            />
          ) : null}
          {showBcc ? (
            <RecipientField
              label={tx(locale, 'mailVerfassen.bcc')}
              value={bcc}
              onChange={edit(setBcc)}
              contacts={contacts}
              locale={locale}
              placeholder={tx(locale, 'mailVerfassen.empfaenger_platzhalter')}
            />
          ) : null}

          <TextInput
            value={subject}
            onChangeText={edit(setSubject)}
            placeholder={tx(locale, 'mailVerfassen.betreff')}
            placeholderTextColor={colors.mute}
            style={styles.subject}
            accessibilityLabel={tx(locale, 'mailVerfassen.betreff')}
          />
        </Card>

        <View style={styles.tools}>
          <Pressable
            style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
            onPress={() => setTemplatesOpen(true)}
            accessibilityRole="button"
          >
            <Text style={styles.toolText}>{tx(locale, 'mailVerfassen.vorlagen')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
            onPress={() => void addAttachments()}
            accessibilityRole="button"
          >
            {attachBusy ? <ActivityIndicator size="small" color={colors.blue} /> : null}
            <Text style={styles.toolText}>{tx(locale, 'mailVerfassen.anhang')}</Text>
          </Pressable>
          <View style={styles.toolSpacer} />
          <Text style={styles.counter}>
            {tx(locale, 'mailVerfassen.zeichen', [text.length])}
          </Text>
        </View>

        <View style={styles.bodyShell}>
          <TextInput
            value={text}
            onChangeText={edit(setText)}
            selection={selection}
            onSelectionChange={() => {
              if (selection) setSelection(undefined);
            }}
            multiline
            autoFocus={mode !== 'new'}
            placeholder={tx(locale, 'mailVerfassen.nachricht_platzhalter')}
            placeholderTextColor={colors.mute}
            style={styles.body}
            textAlignVertical="top"
            accessibilityLabel={tx(locale, 'mailVerfassen.nachricht')}
          />
          {prefillPending && initialOriginal ? (
            <View style={styles.prefill}>
              <ActivityIndicator size="small" color={colors.mute} />
              <Text style={styles.hintText}>{tx(locale, 'mailVerfassen.original_laedt')}</Text>
            </View>
          ) : null}
        </View>

        <AttachmentList
          attachments={attachments}
          locale={locale}
          onRemove={(_, index) => {
            touched.current = true;
            setAttachments((current) => current.filter((__, position) => position !== index));
          }}
        />

        {attachmentsDropped ? <Text style={styles.hintText}>{tx(locale, 'mailVerfassen.anhang_nicht_gespeichert')}</Text> : null}
        {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </KeyboardAwareScrollView>

      <TemplateSheet visible={templatesOpen} locale={locale} onClose={() => setTemplatesOpen(false)} onSelect={applyTemplate} />
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 },
  restored: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  restoredAction: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  ccRow: { flexDirection: 'row', gap: 16, paddingTop: 2 },
  ccToggle: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  subject: {
    color: colors.anthracite,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 34,
  },
  toolText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  toolSpacer: { flex: 1 },
  counter: { color: colors.mute, fontSize: 11, fontWeight: '600' },
  bodyShell: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    minHeight: 240,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  body: { minHeight: 216, color: colors.anthracite, fontSize: 15, lineHeight: 22, backgroundColor: 'transparent' },
  prefill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  hintText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 6 },
  footerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  footerText: { color: colors.inkSoft, fontSize: 12, flex: 1 },
  saved: { color: colors.success, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.72 },
}));
