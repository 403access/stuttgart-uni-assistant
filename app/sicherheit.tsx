import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { biometricMessage, isBiometricCancel } from '@/src/auth/biometric-messages';
import { Button, Card } from '@/src/components/ui';
import { useOnboarding } from '@/src/onboarding/OnboardingState';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * Dedicated security screen reached from the App group on the Campus tab. The
 * biometric toggle lives here rather than inside the general settings screen so
 * the security boundary has its own explanation and can re-check the device.
 *
 * The palette follows the login screen: blue hero, white sheet, light-blue
 * accents, and the mark tile treatment.
 */
export default function SecurityScreen() {
  const { locale } = useApp();
  const insets = useSafeAreaInsets();
  const {
    biometricsEnabled,
    biometricsHardware,
    biometricsAvailable,
    enableBiometrics,
    disableBiometrics,
    refreshBiometrics,
  } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      void refreshBiometrics();
    }, [refreshBiometrics]),
  );

  async function toggleBiometrics(next: boolean) {
    if (busy) return;
    setError('');
    if (!next) {
      await disableBiometrics();
      return;
    }
    setBusy(true);
    const result = await enableBiometrics(
      tx(locale, 'appLock.grund'),
      tx(locale, 'common.abbrechen'),
    );
    setBusy(false);
    if (!result.success) {
      setError(isBiometricCancel(result.error) ? '' : biometricMessage(locale, result.error));
    }
  }

  const state = biometricsEnabled ? 'active' : !biometricsHardware ? 'unavailable' : !biometricsAvailable ? 'setup' : 'ready';
  const status = {
    active: {
      label: tx(locale, 'sicherheit.status_aktiv'),
      title: tx(locale, 'sicherheit.hero_aktiv'),
    },
    ready: {
      label: tx(locale, 'sicherheit.status_bereit'),
      title: tx(locale, 'sicherheit.hero_bereit'),
    },
    setup: {
      label: tx(locale, 'sicherheit.status_einrichten'),
      title: tx(locale, 'sicherheit.hero_einrichten'),
    },
    unavailable: {
      label: tx(locale, 'sicherheit.status_nicht_verfuegbar'),
      title: tx(locale, 'sicherheit.hero_nicht_verfuegbar'),
    },
  }[state];
  const intro = biometricsEnabled
    ? tx(locale, 'sicherheit.biometrie_aktiv')
    : biometricsAvailable
      ? tx(locale, 'sicherheit.biometrie_bereit')
      : biometricsHardware
        ? tx(locale, 'sicherheit.biometrie_nicht_eingerichtet')
        : tx(locale, 'sicherheit.biometrie_nicht_verfuegbar');
  const detail = !biometricsEnabled && biometricsHardware && !biometricsAvailable ? tx(locale, 'sicherheit.biometrie_einrichten') : '';
  // Green only while the lock is actually protecting the app; every other
  // state is a red callout so the unprotected state reads immediately.
  const callout = state === 'active'
    ? { backgroundColor: colors.successSoft, color: colors.success }
    : { backgroundColor: colors.dangerSoft, color: colors.danger };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          title: tx(locale, 'sicherheit.titel'),
          headerStyle: { backgroundColor: colors.brand },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: colors.brand },
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.hero}>
          <View style={styles.blobOne} pointerEvents="none" />
          <View style={styles.blobTwo} pointerEvents="none" />
          <View style={styles.heroGlyph}>
            <MaterialIcons name="verified-user" size={52} color="#FFFFFF" />
          </View>
          <View style={[styles.badge, { backgroundColor: callout.backgroundColor }]}>
            <View style={[styles.dot, { backgroundColor: callout.color }]} />
            <Text style={[styles.badgeText, { color: callout.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.heroTitle}>{status.title}</Text>
          <Text style={styles.heroText}>{intro}</Text>
        </View>

        <View style={styles.sheet}>
          <Card>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>{tx(locale, 'sicherheit.biometrie')}</Text>
                <Text style={styles.settingHint}>{tx(locale, 'sicherheit.methode')}</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={(next) => void toggleBiometrics(next)}
                disabled={busy || (!biometricsHardware && !biometricsEnabled)}
                trackColor={{ false: colors.line, true: colors.blue }}
                thumbColor={colors.paper}
                ios_backgroundColor={colors.line}
                accessibilityLabel={tx(locale, 'sicherheit.biometrie')}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {error ? (
              <Button
                secondary
                label={tx(locale, 'onboarding.systemeinstellungen')}
                onPress={() => void Linking.openSettings().catch(() => undefined)}
              />
            ) : null}
          </Card>

          {detail || (!biometricsEnabled && !biometricsAvailable) ? (
            <View style={styles.after}>
              {detail ? <Text style={styles.detail}>{detail}</Text> : null}
              {!biometricsEnabled && !biometricsAvailable ? (
                <Button secondary label={tx(locale, 'sicherheit.erneut_pruefen')} onPress={() => void refreshBiometrics()} />
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.brand },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  hero: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30, alignItems: 'center', gap: 10, overflow: 'hidden' },
  blobOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(0,190,255,0.16)',
    top: -70,
    right: -50,
  },
  blobTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -30,
    left: -40,
  },
  heroGlyph: { marginTop: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  heroTitle: { color: '#FFFFFF', fontSize: 28, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  heroText: { maxWidth: 330, color: '#CFE0F2', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 14,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingCopy: { flex: 1, gap: 3 },
  settingTitle: { color: colors.anthracite, fontSize: 16, fontWeight: '700' },
  settingHint: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  detail: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  after: { gap: 10 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
