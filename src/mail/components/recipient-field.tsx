import { useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale, MailContact, MailRecipient } from '@/src/types';

import { contactInitials, addRecipient, parseRecipient, sameRecipient, searchContacts } from '../recipients';
import { ContactBadge } from './contact-badge';

const AVATAR_KEYS = ['blue', 'success', 'warning', 'light'] as const;

function avatarColor(email: string): string {
  let hash = 0;
  for (const char of email.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return colors[AVATAR_KEYS[hash % AVATAR_KEYS.length]];
}

/**
 * Recipient input with chips, an address-book dropdown, source badges and
 * comma-separated paste support. Typing an address that is not in the registry
 * still works — the last row offers it as a new, external recipient.
 */
export function RecipientField({
  label,
  value,
  onChange,
  contacts,
  locale,
  placeholder,
  autoFocus = false,
  invalid = false,
}: {
  label: string;
  value: MailRecipient[];
  onChange: (next: MailRecipient[]) => void;
  contacts: MailContact[];
  locale: Locale;
  placeholder: string;
  autoFocus?: boolean;
  invalid?: boolean;
}) {
  const input = useRef<ComponentRef<typeof TextInput> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(autoFocus);

  const suggestions = useMemo(
    () =>
      searchContacts(contacts, query, query.trim() ? 7 : 4)
        .filter((contact) => !value.some((recipient) => sameRecipient(recipient, contact)))
        .slice(0, query.trim() ? 6 : 3),
    [contacts, query, value],
  );
  const typed = parseRecipient(query);
  const typedIsNew = Boolean(typed && !value.some((recipient) => sameRecipient(recipient, typed)));

  function commit(recipient: MailRecipient) {
    onChange(addRecipient(value, recipient));
    setQuery('');
    input.current?.focus();
  }

  function commitQuery() {
    if (typedIsNew && typed) {
      commit(typed);
      return;
    }
    const first = suggestions[0];
    if (first) commit(first);
  }

  function handleChange(next: string) {
    // Pasted or typed separator: commit every complete address, keep the tail.
    if (/[,;]/.test(next)) {
      const parts = next.split(/[,;]/);
      const tail = parts.pop() ?? '';
      let working = value;
      for (const part of parts) {
        const recipient = parseRecipient(part);
        if (recipient) working = addRecipient(working, recipient);
      }
      if (working !== value) onChange(working);
      setQuery(tail);
      return;
    }
    setQuery(next);
  }

  function remove(recipient: MailRecipient) {
    onChange(value.filter((entry) => !sameRecipient(entry, recipient)));
  }

  const showSuggestions = focused && suggestions.length + (typedIsNew ? 1 : 0) > 0;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.box, focused && styles.boxFocused, invalid && styles.boxInvalid]}
        onPress={() => input.current?.focus()}
        accessibilityRole="none"
      >
        <View style={styles.chips}>
          {value.map((recipient) => (
            <View key={recipient.email.toLowerCase()} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {recipient.name || recipient.email}
              </Text>
              <Pressable
                onPress={() => remove(recipient)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={tx(locale, 'mailVerfassen.empfaenger_entfernen', [recipient.email])}
                style={({ pressed }) => [styles.chipRemove, pressed && styles.pressed]}
              >
                <Text style={styles.chipRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}
          <TextInput
            ref={input}
            value={query}
            onChangeText={handleChange}
            onFocus={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              setFocused(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setFocused(false), 160);
            }}
            onSubmitEditing={commitQuery}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !query && value.length > 0) remove(value[value.length - 1]);
            }}
            autoFocus={autoFocus}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            blurOnSubmit={false}
            placeholder={value.length ? tx(locale, 'mailVerfassen.weitere') : placeholder}
            placeholderTextColor={colors.mute}
            style={styles.input}
            accessibilityLabel={label}
          />
        </View>
      </Pressable>

      {showSuggestions ? (
        <View style={styles.suggestions}>
          {typedIsNew && typed ? (
            <Pressable
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              onPress={() => commit(typed)}
              accessibilityRole="button"
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor(typed.email) }]}>
                <Text style={styles.avatarText}>{contactInitials(typed)}</Text>
              </View>
              <View style={styles.suggestionBody}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {typed.name || typed.email}
                </Text>
                {typed.name ? (
                  <Text style={styles.suggestionMail} numberOfLines={1}>
                    {typed.email}
                  </Text>
                ) : null}
              </View>
              <ContactBadge source="manual" locale={locale} />
            </Pressable>
          ) : null}
          {suggestions.map((contact, index) => (
            <Pressable
              key={contact.id}
              style={({ pressed }) => [styles.suggestion, (typedIsNew || index > 0) && styles.suggestionLine, pressed && styles.pressed]}
              onPress={() => commit({ name: contact.name, email: contact.email })}
              accessibilityRole="button"
              accessibilityLabel={tx(locale, 'mailVerfassen.empfaenger_waehlen', [contact.name, contact.email])}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColor(contact.email) }]}>
                <Text style={styles.avatarText}>{contactInitials(contact)}</Text>
              </View>
              <View style={styles.suggestionBody}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {contact.name}
                </Text>
                <Text style={styles.suggestionMail} numberOfLines={1}>
                  {contact.email}
                </Text>
              </View>
              <View style={styles.badges}>
                {contact.sources.slice(0, 2).map((source) => (
                  <ContactBadge key={source} source={source} locale={locale} />
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  field: { gap: 6 },
  label: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  box: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  boxFocused: { borderColor: colors.blue },
  boxInvalid: { borderColor: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.mist,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  chipText: { color: colors.anthracite, fontSize: 14, fontWeight: '600', maxWidth: 190 },
  chipRemove: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  chipRemoveText: { color: colors.mute, fontSize: 11, fontWeight: '700' },
  input: {
    flexGrow: 1,
    minWidth: 130,
    fontSize: 15,
    color: colors.anthracite,
    backgroundColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  suggestions: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9 },
  suggestionLine: { borderTopWidth: 1, borderTopColor: colors.line },
  avatar: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  suggestionBody: { flex: 1, minWidth: 0, gap: 1 },
  suggestionName: { color: colors.anthracite, fontSize: 14, fontWeight: '700' },
  suggestionMail: { color: colors.inkSoft, fontSize: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, maxWidth: 116 },
  pressed: { opacity: 0.7 },
}));
