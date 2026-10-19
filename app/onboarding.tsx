import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Mark } from '@/src/components/ui';
import { showToast } from '@/src/components/toast';
import { useOnboarding } from '@/src/onboarding/OnboardingState';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * First-run flow after a successful sign-in. Today it has one page: opt in to
 * the device biometrics. The gate normally lands here only when the hardware
 * and an enrolled fingerprint/face exist; a development override can also open
 * it with a sensor that is not enrolled yet.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { locale } = useApp();
  const { enableBiometrics, completeOnboarding } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const finishing = useRef(false);

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    await completeOnboarding();
    router.replace('/');
  }, [completeOnboarding]);

  async function enable() {
    if (busy) return;
    setBusy(true);
    const enabled = await enableBiometrics(
      tx(locale, 'onboarding.systemgrund'),
      tx(locale, 'common.abbrechen'),
    );
    setBusy(false);
    if (!enabled) {
      // Cancelling the system prompt, or denying Face ID permission, is a
      // decline. It must complete the flow like "Nicht jetzt"; otherwise the
      // page greets the user again on every launch.
      showToast({
        tone: 'info',
        title: tx(locale, 'onboarding.nicht_aktiviert'),
        message: tx(locale, 'onboarding.hinweis'),
      });
      await finish();
      return;
    }
    await finish();
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <View style={styles.blobOne} pointerEvents="none" />
          <View style={styles.blobTwo} pointerEvents="none" />
          <View style={styles.markTile}>
            <Mark size={38} />
          </View>
          <Text style={styles.brand}>University Assistant</Text>
          <View style={styles.kickerPill}>
            <MaterialIcons name="auto-awesome" size={13} color="#FFFFFF" />
            <Text style={styles.kicker}>{tx(locale, 'onboarding.kicker')}</Text>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="fingerprint" size={42} color={colors.blue} />
          </View>
          <Text style={styles.title}>{tx(locale, 'onboarding.titel')}</Text>
          <Text style={styles.lead}>{tx(locale, 'onboarding.text')}</Text>

          <View style={styles.points}>
            <Point text={tx(locale, 'onboarding.punkt1')} />
            <Point text={tx(locale, 'onboarding.punkt2')} />
          </View>

          <View style={styles.actions}>
            <Button
              label={busy ? tx(locale, 'onboarding.aktivieren_laeuft') : tx(locale, 'onboarding.aktivieren')}
              onPress={() => void enable()}
            />
            <Button secondary label={tx(locale, 'onboarding.nicht_jetzt')} onPress={() => void finish()} />
          </View>
          <Text style={styles.hint}>{tx(locale, 'onboarding.hinweis')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Point({ text }: { text: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <MaterialIcons name="check" size={14} color={colors.blue} />
      </View>
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 30, gap: 10, overflow: 'hidden' },
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
  brand: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 4 },
  kickerPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  kicker: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    gap: 12,
  },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 999,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.anthracite, fontSize: 28, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5 },
  lead: { color: colors.inkSoft, fontSize: 15, lineHeight: 22 },
  points: { gap: 12, marginVertical: 4 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pointIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pointText: { flex: 1, color: colors.anthracite, fontSize: 14, lineHeight: 21 },
  actions: { gap: 10, marginTop: 4 },
  hint: { color: colors.mute, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
