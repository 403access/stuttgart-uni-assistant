import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { SavedCampusCredentials } from '@/src/auth/use-saved-campus-credentials';
import { Button } from '@ua/ui';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

/**
 * The saved C@MPUS credential, shown without its secret. The password only
 * appears after `reveal`, which the hook gates on the vault: Face ID or the
 * fingerprint when the entry (or the App Lock) uses biometrics, no prompt when
 * neither does. It hides itself again after half a minute.
 */
export function SavedCredentialPanel({
  locale,
  saved,
  showEmpty = false,
  onUse,
  onForget,
}: {
  locale: Locale;
  saved: SavedCampusCredentials;
  /** Render a quiet "nothing stored" line instead of nothing at all. */
  showEmpty?: boolean;
  /** "Use the stored sign-in": only offered on the sign-in screen. */
  onUse?: () => void;
  onForget?: () => void;
}) {
  const { hint, revealed, busy, error } = saved;
  if (!hint) {
    if (!showEmpty) return null;
    return (
      <View style={styles.empty}>
        <MaterialIcons name="vpn-key" size={18} color={colors.mute} />
        <Text style={styles.emptyText}>{tx(locale, 'savedCredentials.leer')}</Text>
      </View>
    );
  }
  const visible = revealed !== null;
  const revealLabel = tx(locale, visible ? 'savedCredentials.ausblenden' : 'savedCredentials.anzeigen');
  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <MaterialIcons name="vpn-key" size={18} color={colors.blue} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.account} numberOfLines={1}>
            {hint.account}
          </Text>
          <Text style={styles.meta}>
            {tx(locale, hint.biometrics ? 'savedCredentials.biometrie' : 'savedCredentials.code')}
          </Text>
        </View>
        <Pressable
          onPress={() => (visible ? saved.hide() : void saved.reveal())}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={revealLabel}
          accessibilityState={{ busy, expanded: visible }}
          style={({ pressed }) => [styles.reveal, (pressed || busy) && styles.pressed]}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.blue} />
          ) : (
            <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={18} color={colors.blue} />
          )}
          <Text style={styles.revealText}>{revealLabel}</Text>
        </Pressable>
      </View>
      {visible ? (
        <View style={styles.secret}>
          <Text style={styles.secretLabel}>{tx(locale, 'common.passwort')}</Text>
          <Text selectable style={styles.secretValue}>
            {revealed.password}
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {onUse ? <Button label={tx(locale, 'common.gespeicherte', [hint.account])} onPress={onUse} /> : null}
      {onForget ? (
        <Button secondary label={tx(locale, 'common.gespeicherte_anmeldung')} onPress={onForget} />
      ) : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  panel: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    padding: 12,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueSoft,
  },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  account: { color: colors.anthracite, fontSize: 14, fontWeight: '700' },
  meta: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  reveal: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  revealText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  secret: {
    gap: 2,
    borderRadius: 10,
    backgroundColor: colors.mist,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secretLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  secretValue: { color: colors.anthracite, fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  emptyText: { flex: 1, color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
}));
