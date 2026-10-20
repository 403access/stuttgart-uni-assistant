import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, FieldLabel, Pill } from '@/src/components/ui';
import { iliasAccountFrom } from '@/src/ilias/account';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

import type { IliasStatus } from '../types';

/** The signed-out ILIAS tab: one-shot password login or an existing session cookie. */
export function IliasConnectionPanel({
  status,
  sessionAccount,
  account,
  password,
  cookie,
  busy,
  note,
  error,
  locale,
  savedLogin,
  onAccountChange,
  onPasswordChange,
  onCookieChange,
  onUseSaved,
  onConnect,
}: {
  status: IliasStatus | null;
  sessionAccount: string | null;
  account: string;
  password: string;
  cookie: string;
  busy: boolean;
  note: string;
  error: string;
  locale: Locale;
  savedLogin: { account: string; biometrics: boolean } | null;
  onAccountChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCookieChange: (value: string) => void;
  onUseSaved: () => void;
  onConnect: () => void;
}) {
  const [mode, setMode] = useState<'password' | 'cookie'>('password');
  const ready = mode === 'password' ? Boolean(account.trim() && password) : Boolean(cookie.trim());

  return (
    <>
      <Card>
        <View style={styles.head}>
          <Text style={styles.brand}>ILIAS</Text>
          <Pill tone="wait" label={status === null ? tx(locale, 'tabsIlias.unbekannt') : tx(locale, 'tabsIlias.nicht_verbunden')} />
        </View>
        <Text style={styles.hint}>{status === null ? tx(locale, 'common.assistenz') : tx(locale, 'tabsIlias.trage')}</Text>
        <Text style={styles.hint}>{tx(locale, 'tabsIlias.campus_gleich')}</Text>

        <View style={styles.segmented}>
          <Pressable onPress={() => setMode('password')} style={[styles.segment, mode === 'password' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'password' && styles.segmentTextActive]}>{tx(locale, 'tabsIlias.passwort')}</Text>
          </Pressable>
          <Pressable onPress={() => setMode('cookie')} style={[styles.segment, mode === 'cookie' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'cookie' && styles.segmentTextActive]}>{tx(locale, 'tabsIlias.sitzung')}</Text>
          </Pressable>
        </View>

        {mode === 'password' ? (
          <>
            <FieldLabel>{tx(locale, 'tabsIlias.anmeldename')}</FieldLabel>
            <TextInput
              value={account}
              onChangeText={onAccountChange}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholder={sessionAccount ?? 'st123456'}
              placeholderTextColor={colors.mute}
            />
            <Text style={styles.hint}>{tx(locale, 'tabsIlias.konto_hinweis')}</Text>
            <FieldLabel>{tx(locale, 'tabsIlias.passwort_uni')}</FieldLabel>
            <TextInput
              value={password}
              onChangeText={onPasswordChange}
              secureTextEntry
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.mute}
            />
          </>
        ) : (
          <>
            <FieldLabel>{tx(locale, 'tabsIlias.cookie')}</FieldLabel>
            <TextInput
              value={cookie}
              onChangeText={onCookieChange}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
              placeholder="PHPSESSID=…"
              placeholderTextColor={colors.mute}
            />
            <Text style={styles.hint}>{tx(locale, 'tabsIlias.cookie_hinweis')}</Text>
          </>
        )}

        <Button
          label={busy ? tx(locale, 'tabsIlias.verbindung') : tx(locale, 'tabsIlias.verbinden')}
          onPress={() => {
            if (ready) onConnect();
          }}
        />
        {savedLogin ? (
          <Button
            label={tx(locale, 'tabsIlias.gespeicherte_anmeldung', [iliasAccountFrom(savedLogin.account)])}
            onPress={onUseSaved}
            secondary
          />
        ) : null}
        <Text style={styles.hint}>{tx(locale, 'tabsIlias.schutz')}</Text>
      </Card>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <Text style={styles.hint}>{tx(locale, 'tabsIlias.erklaerung')}</Text>
      </Card>
    </>
  );
}

const styles = themedStyles((colors) => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  brand: { color: colors.anthracite, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  note: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.anthracite,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segmentActive: { backgroundColor: colors.paper },
  segmentText: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.anthracite },
}));
