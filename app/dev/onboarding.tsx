import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { JsonTree } from '@/src/components/json-tree';
import { Button, Card, Screen, Section } from '@/src/components/ui';
import { useRefreshOnFocus } from '@/src/hooks/use-refresh-on-focus';
import {
  ONBOARDING_STORAGE_KEY,
  readStoredOnboardingPreferences,
  useOnboarding,
  type OnboardingPreferences,
} from '@/src/onboarding/OnboardingState';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * Development-only diagnostics for the first-run flow. It shows the live
 * provider state, the persisted onboarding record, and can schedule onboarding
 * for the next launch without re-opening it in the running session.
 */
export default function DevOnboardingScreen() {
  const { locale, sessionAccount } = useApp();
  const {
    ready,
    completed,
    completedAt,
    forceOnboarding,
    biometricsEnabled,
    biometricsHardware,
    biometricsEnrolled,
    biometricsAvailable,
    biometricsJustEnabled,
    refreshBiometrics,
    scheduleOnboardingForNextLaunch,
  } = useOnboarding();
  const [stored, setStored] = useState<OnboardingPreferences | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setStored(await readStoredOnboardingPreferences());
  }, []);

  useRefreshOnFocus(() => {
    void refreshBiometrics();
    void reload();
  });

  async function schedule(clearBiometrics: boolean) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const next = await scheduleOnboardingForNextLaunch(clearBiometrics);
    setBusy(false);
    if (!next) {
      setError(tx(locale, 'dev.onboarding.error'));
      return;
    }
    setStored(next);
    setNotice(tx(locale, 'dev.onboarding.scheduled'));
  }

  const storedCompletedAt = stored?.completedAt ?? null;
  const storedBiometrics = stored?.biometricsEnabled ?? false;
  const storedForce = stored?.forceOnboarding ?? false;
  const nextLaunch = Boolean(sessionAccount) && !storedCompletedAt;

  return (
    <Screen kicker={tx(locale, 'tabsMehr.dev')}>
      <Stack.Screen options={{ title: tx(locale, 'dev.onboarding.titel') }} />
      <Text style={styles.warning}>{tx(locale, 'dev.hinweis')}</Text>

      <Section title={tx(locale, 'dev.onboarding.status')} />
      <Card>
        <Row label="ready" value={ready} />
        <Row label="completed" value={completed} />
        <Row label="completedAt" value={completedAt ?? 'null'} />
        <Row label="forceOnboarding" value={forceOnboarding} />
        <Row label="biometricsEnabled" value={biometricsEnabled} />
        <Row label="biometricsHardware" value={biometricsHardware} />
        <Row label="biometricsEnrolled" value={biometricsEnrolled} />
        <Row label="biometricsAvailable" value={biometricsAvailable} />
        <Row label="biometricsJustEnabled" value={biometricsJustEnabled} />
      </Card>

      <Section title={tx(locale, 'dev.onboarding.stored')} />
      <Card>
        <Row label="completedAt" value={storedCompletedAt ?? 'null'} />
        <Row label="biometricsEnabled" value={storedBiometrics} />
        <Row label="forceOnboarding" value={storedForce} />
        <Row label={tx(locale, 'dev.onboarding.next_launch')} value={nextLaunch} />
        <Text style={styles.key}>{tx(locale, 'dev.onboarding.key')}</Text>
        <Text style={styles.keyValue}>{ONBOARDING_STORAGE_KEY}</Text>
      </Card>

      <Section title={tx(locale, 'dev.onboarding.actions')} />
      <View style={styles.actions}>
        <Button
          label={tx(locale, 'dev.onboarding.force')}
          onPress={() => void schedule(false)}
        />
        <Button
          secondary
          label={tx(locale, 'dev.onboarding.force_clear')}
          onPress={() => void schedule(true)}
        />
        <Button
          secondary
          label={tx(locale, 'dev.onboarding.reload')}
          onPress={() => {
            void refreshBiometrics();
            void reload();
          }}
        />
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Section title={tx(locale, 'dev.onboarding.raw')} />
      <Card>
        {stored ? (
          <JsonTree value={stored} />
        ) : (
          <Text style={styles.muted}>{tx(locale, 'dev.onboarding.empty')}</Text>
        )}
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string | boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          typeof value === 'boolean' && { color: value ? colors.success : colors.danger },
        ]}>
        {typeof value === 'boolean' ? String(value) : value}
      </Text>
    </View>
  );
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = themedStyles((colors) => ({
  warning: {
    color: colors.warning,
    backgroundColor: colors.warningSoft,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  label: { color: colors.inkSoft, fontSize: 13 },
  value: { color: colors.anthracite, fontSize: 13, fontWeight: '700', fontFamily: mono, textAlign: 'right', flexShrink: 1 },
  key: { color: colors.mute, fontSize: 12, marginTop: 4 },
  keyValue: { color: colors.inkSoft, fontSize: 12, fontFamily: mono },
  actions: { gap: 10 },
  notice: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
}));
