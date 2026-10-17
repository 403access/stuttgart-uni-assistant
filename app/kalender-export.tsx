import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Platform, Pressable, Text, View } from 'react-native';

import { exportCampusCalendar, syncExportedCalendar, type CalendarExportFormat } from '@/src/auth/campus';
import { Button, Card, Pill, Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

function germanDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

/** Official calendar export on its own page: download as ICS/CSV or sync into the local database. */
export default function CalendarExportScreen() {
  const { locale } = useApp();
  const [format, setFormat] = useState<CalendarExportFormat>(99);
  const [error, setError] = useState('');
  const [syncNote, setSyncNote] = useState('');

  function exportRange(): { dateFrom: string; dateTo: string } {
    const from = new Date();
    const to = new Date(from);
    to.setFullYear(to.getFullYear() + 1);
    return { dateFrom: germanDate(from), dateTo: germanDate(to) };
  }

  // Export and database sync as mutations: pending flags come from the hooks.
  const downloadMutation = useMutation({
    mutationKey: ['calendar-export'],
    mutationFn: async () => {
      const { dateFrom, dateTo } = exportRange();
      const result = await exportCampusCalendar({
        dateFrom,
        dateTo,
        format,
        charset: format === 99 ? 'UTF8' : 'WE8ISO8859P1',
      });
      const safeName = result.filename.replace(/[^\w.\-]+/g, '_');
      if (Platform.OS === 'web') {
        const documentRef = globalThis.document;
        if (!documentRef) throw new Error('download_unavailable');
        const binary = Uint8Array.from(globalThis.atob(result.base64), (char) => char.charCodeAt(0));
        const blob = new Blob([binary], { type: result.contentType });
        const url = URL.createObjectURL(blob);
        const link = documentRef.createElement('a');
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
      const { File, Paths } = await import('expo-file-system');
      const file = new File(Paths.cache, safeName);
      if (file.exists) file.delete();
      file.create();
      file.write(result.base64, { encoding: 'base64' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('share_unavailable');
      await Sharing.shareAsync(file.uri, { mimeType: result.contentType, dialogTitle: result.filename });
    },
    onMutate: () => setError(''),
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setError(tx(locale, `Import fehlgeschlagen (${code}).`, `Import failed (${code}).`));
    },
  });

  const syncMutation = useMutation({
    mutationKey: ['calendar-sync'],
    mutationFn: () => syncExportedCalendar(exportRange()),
    onMutate: () => {
      setError('');
      setSyncNote('');
    },
    onSuccess: (result) => {
      setSyncNote(
        tx(
          locale,
          `${result.imported} neu · ${result.skipped} Duplikate übersprungen (${result.total} Termine).`,
          `${result.imported} new · ${result.skipped} duplicates skipped (${result.total} events).`,
        ),
      );
    },
    onError: (caught) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setError(tx(locale, `Sync fehlgeschlagen (${code}).`, `Sync failed (${code}).`));
    },
  });

  return (
    <Screen
      kicker="C@MPUS"
      subtitle={tx(
        locale,
        'Lädt den persönlichen Kalender über die Exportmaske von C@MPUS (ein Jahr ab heute).',
        'Downloads the personal calendar through the C@MPUS export mask (one year from today).',
      )}>
      <Stack.Screen options={{ title: tx(locale, 'Kalender-Import', 'Calendar import') }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'Format', 'Format')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([99, 2] as CalendarExportFormat[]).map((item) => (
            <Pressable key={item} onPress={() => setFormat(item)}>
              <Pill label={item === 99 ? 'ICS' : 'CSV'} active={format === item} />
            </Pressable>
          ))}
        </View>
        <Button label={downloadMutation.isPending ? '…' : tx(locale, 'Importieren', 'Import')} onPress={() => downloadMutation.mutate()} />
        <Button secondary label={syncMutation.isPending ? '…' : tx(locale, 'In Datenbank syncen', 'Sync into database')} onPress={() => syncMutation.mutate()} />
        {syncNote ? <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>{syncNote}</Text> : null}
        {error ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{error}</Text> : null}
      </Card>
    </Screen>
  );
}
