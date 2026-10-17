import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform, Pressable, Text, View } from 'react-native';

import { exportCampusCalendar, syncExportedCalendar, type CalendarExportFormat } from '@/src/auth/campus';
import { useCampusLog, type CampusLogEntry } from '@/src/auth/campus-log';
import { Button, Card, InfoRow, Pill, Screen, Section, listPosition } from '@/src/components/ui';
import { keys } from '@/src/query/keys';
import { apiLogQuery } from '@/src/query/queries';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

function germanDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

/** The two kinds of calendar import the portal export supports. */
function importKind(entry: CampusLogEntry, locale: Locale): string {
  return entry.request?.startsWith('sync') ? tx(locale, 'Datenbank-Sync', 'Database sync') : tx(locale, 'Download', 'Download');
}

/** `2026-10-17T14:30:00.000Z` → `17.10.2026 · 16:30` (local time). */
function importWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `export 17.10.2026–17.10.2027 format=99` → `17.10.2026–17.10.2027`. */
function importRange(request: string): string {
  const match = request.match(/^(?:export|sync)\s+(\S+)/);
  return match ? match[1] : '';
}

function importDetail(entry: CampusLogEntry): string {
  return [importRange(entry.request ?? ''), entry.response].filter(Boolean).join(' · ');
}

/** Import screen: pull the personal calendar through the C@MPUS export mask, or sync it into the local database. */
export default function CalendarExportScreen() {
  const { locale, sessionMode } = useApp();
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<CalendarExportFormat>(99);
  const [error, setError] = useState('');
  const [syncNote, setSyncNote] = useState('');

  // Persisted import log (device store) merged with this session's live calls,
  // so a fresh import shows before the fire-and-forget write lands.
  const logQ = useQuery(apiLogQuery(500, { enabled: sessionMode === 'campus' }));
  const sessionLog = useCampusLog();
  const imports = useMemo(() => {
    const byUid = new Map<string, CampusLogEntry>();
    for (const entry of logQ.data ?? []) if (entry.op === 'export') byUid.set(entry.uid, entry);
    for (const entry of sessionLog) if (entry.op === 'export') byUid.set(entry.uid, entry);
    return [...byUid.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
  }, [logQ.data, sessionLog]);

  const refreshHistory = (): void => {
    queryClient.invalidateQueries({ queryKey: keys.apiLog(500) }).catch(() => undefined);
  };

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
    onSuccess: refreshHistory,
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
      refreshHistory();
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
      <Section title={tx(locale, 'Verlauf', 'History')} />
      {imports.length === 0 ? (
        <Card>
          <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>
            {tx(locale, 'Noch keine Importe aufgezeichnet.', 'No imports recorded yet.')}
          </Text>
        </Card>
      ) : (
        <View>
          {imports.map((entry, index) => (
            <InfoRow
              key={entry.uid}
              title={importKind(entry, locale)}
              meta={importWhen(entry.createdAt)}
              detail={importDetail(entry)}
              position={listPosition(index, imports.length)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
