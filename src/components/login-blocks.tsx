import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import type { Locale } from '@/src/types';

/**
 * The building blocks the login screen repeats: a section title, a notice, a
 * labelled input, and the small print. Kept here so the screen states the flow
 * rather than re-declaring styles, and the two sign-in forms stay identical.
 */

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <Text style={styles.notice}>{children}</Text>;
}

export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.mute}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

export function Meta({ children }: { children: ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

export function Footer({ children }: { children: ReactNode }) {
  return <Text style={styles.footer}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <Text style={styles.error}>{children}</Text>;
}

/** A toggle chip, used for the language pair and the vault switches. */
export function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

/**
 * A labelled checkbox with an optional explanation below. Used for the
 * "remember sign-in" opt-in where the security consequence needs one line of
 * context (biometric gate vs. device-passcode-only vault).
 */
export function Checkbox({
  label,
  hint,
  checked,
  disabled = false,
  onPress,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.checkRow, disabled && styles.checkRowDisabled, pressed && !disabled && styles.pressed]}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}
      </View>
      <View style={styles.checkCopy}>
        <Text style={styles.checkLabel}>{label}</Text>
        {hint ? <Text style={styles.checkHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

export function LanguagePicker({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <View style={styles.row}>
      <Chip label="Deutsch" on={locale === 'de'} onPress={() => setLocale('de')} />
      <Chip label="English" on={locale === 'en'} onPress={() => setLocale('en')} />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  section: { color: colors.anthracite, fontSize: 18, fontWeight: '700', marginTop: 8 },
  notice: { backgroundColor: colors.lightSoft, color: colors.anthracite, borderRadius: 14, padding: 12, lineHeight: 20 },
  field: { gap: 4 },
  label: { color: colors.inkSoft, fontSize: 13, fontWeight: '700', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.anthracite,
  },
  meta: { color: colors.inkSoft, fontSize: 12, lineHeight: 18 },
  footer: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.paper },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.anthracite, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: '#FFFFFF' },
  pressed: { opacity: 0.72 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
  checkRowDisabled: { opacity: 0.72 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkCopy: { flex: 1, gap: 2 },
  checkLabel: { color: colors.anthracite, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  checkHint: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
}));
