import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { JsonTree , Button, Card, Screen, Section } from '@ua/ui';
import { useRefreshOnFocus } from '@/src/hooks/use-refresh-on-focus';
import { APP_STATE_STORAGE_KEY, useAppState } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

/**
 * Development-only read-only snapshot of the session and the AsyncStorage
 * payload. Secrets are not printed: the bearer token is shown as present or
 * absent, not by value.
 */
export default function DevStateScreen() {
  const { locale, ...app } = useAppState();
  const [raw, setRaw] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const value = await AsyncStorage.getItem(APP_STATE_STORAGE_KEY);
      setRaw(value ? (JSON.parse(value) as unknown) : null);
      setLoaded(true);
    } catch {
      setError(tx(locale, 'dev.state.error'));
    }
  }, [locale]);

  useRefreshOnFocus(reload);

  const syncKeys = Object.keys(app.syncAt);

  return (
    <Screen kicker={tx(locale, 'tabsMehr.dev')}>
      <Stack.Screen options={{ title: tx(locale, 'dev.state.titel') }} />
      <Text style={styles.warning}>{tx(locale, 'dev.hinweis')}</Text>

      <Section title={tx(locale, 'dev.state.session')} />
      <Card>
        <Row label="ready" value={app.ready} />
        <Row label="sessionAccount" value={app.sessionAccount ?? 'null'} />
        <Row label="sessionMode" value={app.sessionMode ?? 'null'} />
        <Row label="sessionName" value={app.sessionName ?? 'null'} />
        <Row label="sessionEmail" value={app.sessionEmail ?? 'null'} />
        <Row label="user.id" value={app.user?.id ?? 'null'} />
        <Row label="user.platforms" value={app.user?.platforms.length ?? 0} />
        <Row label="authToken" value={app.authToken ? 'present' : 'absent'} />
        <Row label="oidcSessionId" value={app.oidcSessionId ?? 'null'} />
        <Row label="mailAccount" value={app.mailAccount ?? 'null'} />
      </Card>

      <Section title={tx(locale, 'dev.state.counts')} />
      <Card>
        <Row label="curriculumNodes" value={app.curriculumNodes.length} />
        <Row label="campusStudies" value={app.campusStudies.length} />
        <Row label="activeStudyId" value={app.activeStudyId ?? 'null'} />
        <Row label="syncAt" value={syncKeys.length ? syncKeys.join(', ') : 'empty'} />
        <Row label="downloadedIds" value={app.downloadedIds.length} />
        <Row label="imports" value={app.imports.length} />
        <Row label="reviews" value={app.reviews.length} />
        <Row label="transfers" value={app.transfers.length} />
        <Row label="messages" value={app.messages.length} />
        <Row label="plannedIds" value={app.plannedIds.length} />
      </Card>

      <Button secondary label={tx(locale, 'dev.state.reload')} onPress={() => void reload()} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Section title={tx(locale, 'dev.state.raw')} />
      <Card>
        <Text style={styles.key}>{APP_STATE_STORAGE_KEY}</Text>
        {raw ? (
          <JsonTree value={raw} />
        ) : (
          <Text style={styles.muted}>
            {loaded ? tx(locale, 'dev.state.empty') : tx(locale, 'dev.state.loading')}
          </Text>
        )}
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string | number | boolean }) {
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
  key: { color: colors.mute, fontSize: 12, fontFamily: mono, marginBottom: 4 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
}));
