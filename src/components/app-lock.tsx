import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authenticateWithBiometrics } from '@/src/auth/biometrics';
import { biometricMessage, isBiometricCancel } from '@/src/auth/biometric-messages';
import { Button, Mark } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * Full-screen lock shown while biometrics are enabled. It covers the app (the
 * navigator stays mounted underneath) and asks the system prompt immediately.
 */
export function AppLock({ onUnlock, onSignOut }: { onUnlock: () => void; onSignOut: () => void }) {
  const { locale } = useApp();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const prompting = useRef(false);
  const started = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setBusy(true);
    setError('');
    const result = await authenticateWithBiometrics(
      tx(locale, 'appLock.grund'),
      tx(locale, 'common.abbrechen'),
    );
    prompting.current = false;
    setBusy(false);
    if (result.success) {
      onUnlock();
      return;
    }
    if (__DEV__) console.info('[app-lock] biometric result', result);
    setError(isBiometricCancel(result.error) ? '' : biometricMessage(locale, result.error));
  }, [locale, onUnlock]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void unlock();
  }, [unlock]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.hero}>
        <View style={styles.markTile}>
          <Mark size={38} />
        </View>
        <Text style={styles.brand}>University Assistant</Text>
        <Text style={styles.tagline}>{tx(locale, 'appLock.kicker')}</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="fingerprint" size={40} color={colors.blue} />
        </View>
        <Text style={styles.title}>{tx(locale, 'appLock.titel')}</Text>
        <Text style={styles.text}>{tx(locale, 'appLock.text')}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button
            label={busy ? tx(locale, 'appLock.entsperren_laeuft') : tx(locale, 'appLock.entsperren')}
            onPress={() => void unlock()}
          />
          <Button secondary label={tx(locale, 'appLock.abmelden')} onPress={onSignOut} />
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.brand, justifyContent: 'center', paddingHorizontal: 24, gap: 24 },
  hero: { alignItems: 'center', gap: 10 },
  markTile: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001A3A',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  brand: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  tagline: { color: '#CFE0F2', fontSize: 14, fontWeight: '600' },
  panel: { backgroundColor: colors.paper, borderRadius: 26, padding: 22, gap: 12 },
  iconCircle: { width: 68, height: 68, borderRadius: 999, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.anthracite, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.4 },
  text: { color: colors.inkSoft, fontSize: 15, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  actions: { gap: 10, marginTop: 4 },
}));
