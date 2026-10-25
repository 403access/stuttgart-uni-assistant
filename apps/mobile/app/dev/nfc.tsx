import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { JsonTree } from '@ua/ui';
import { Button, Card, Screen, Section } from '@/src/components/ui';
import { useAsyncAction } from '@/src/hooks/use-async-action';
import { cancelCardScan, isNfcSupported, readStudentCard } from '@/src/nfc/card';
import type { CardReading } from '@/src/nfc/types';
import { useAppSelector } from '@/src/state/AppState';
import { themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * Development-only NFC reader for the student ID card. It shows the public
 * data a phone can read without keys: tag UID, technology, and NDEF records.
 * The card is only read; nothing is written or uploaded.
 */
export default function DevNfcScreen() {
  const locale = useAppSelector((state) => state.locale);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [reading, setReading] = useState<CardReading | null>(null);

  useEffect(() => {
    let alive = true;
    void isNfcSupported().then((value) => {
      if (alive) setSupported(value);
    });
    return () => {
      alive = false;
      void cancelCardScan();
    };
  }, []);

  const scan = useAsyncAction(
    async () => {
      setReading(null);
      return readStudentCard(tx(locale, 'dev.nfc.scannen'));
    },
    {
      errorMessage: (caught) => {
        const message = caught instanceof Error ? caught.message : String(caught);
        if (/entitlement|NFC Tag Reading|Personal Team|provisioning/i.test(message)) {
          return tx(locale, 'dev.nfc.ios_entitlement');
        }
        return message === 'no-tag' ? tx(locale, 'dev.nfc.no_tag') : tx(locale, 'dev.nfc.error', [message]);
      },
      onSuccess: (next) => setReading(next),
    },
  );

  async function cancel() {
    await cancelCardScan();
  }

  return (
    <Screen kicker={tx(locale, 'tabsMehr.dev')}>
      <Stack.Screen options={{ title: tx(locale, 'dev.nfc.titel') }} />
      <Text style={styles.warning}>{tx(locale, 'dev.hinweis')}</Text>

      <Section title={tx(locale, 'dev.nfc.titel')} />
      <Card>
        <Text style={styles.body}>{tx(locale, 'dev.nfc.intro')}</Text>
        {supported === false ? (
          <Text style={styles.error}>{tx(locale, 'dev.nfc.unsupported')}</Text>
        ) : (
          <Button label={scan.busy ? tx(locale, 'dev.nfc.scanning') : tx(locale, 'dev.nfc.scan')} onPress={() => void scan.run()} />
        )}
        {scan.busy ? <Button secondary label={tx(locale, 'common.abbrechen')} onPress={() => void cancel()} /> : null}
        {scan.error ? <Text style={styles.error}>{scan.error}</Text> : null}
      </Card>

      {reading ? (
        <>
          <Section title={tx(locale, 'dev.nfc.reading')} />
          <Card>
            <Text style={styles.label}>UID</Text>
            <Text selectable style={styles.uid}>
              {reading.uid ?? '—'}
            </Text>
            <Text style={styles.label}>{tx(locale, 'dev.nfc.uid_decimal')}</Text>
            <Text selectable style={styles.value}>
              {reading.uidDecimal ?? '—'}
            </Text>
            <Text style={styles.label}>{tx(locale, 'dev.nfc.tech')}</Text>
            <Text selectable style={styles.value}>
              {reading.tech ?? (reading.techTypes.length ? reading.techTypes.join(', ') : '—')}
            </Text>
            {reading.techTypes.length > 1 ? (
              <Text selectable style={styles.key}>
                {reading.techTypes.join(', ')}
              </Text>
            ) : null}
          </Card>

          <Section title={tx(locale, 'dev.nfc.ndef')} />
          <Card>
            {reading.records.length === 0 ? (
              <Text style={styles.body}>{tx(locale, 'dev.nfc.ndef_empty')}</Text>
            ) : (
              reading.records.map((record, index) => (
                <View key={`${record.tnf}-${record.type}-${index}`} style={styles.record}>
                  <Text style={styles.recordType}>{record.type || '—'} · TNF {record.tnf}</Text>
                  {record.text ? (
                    <Text selectable style={styles.recordText}>
                      {record.text}
                    </Text>
                  ) : null}
                  <Text selectable style={styles.key}>
                    {hex(record.payload)}
                  </Text>
                </View>
              ))
            )}
          </Card>

          <Section title={tx(locale, 'dev.nfc.raw')} />
          <Card>
            <JsonTree value={reading.raw} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function hex(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
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
  body: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  label: { color: colors.inkSoft, fontSize: 13 },
  uid: { color: colors.anthracite, fontSize: 20, fontWeight: '700', fontFamily: mono, letterSpacing: 1 },
  value: { color: colors.anthracite, fontSize: 14, fontWeight: '700', fontFamily: mono },
  key: { color: colors.mute, fontSize: 12, fontFamily: mono, lineHeight: 18 },
  record: { gap: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  recordType: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  recordText: { color: colors.anthracite, fontSize: 15, lineHeight: 21 },
}));
