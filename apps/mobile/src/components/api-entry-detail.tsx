import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { loadCampusCourses, loadCampusCurriculum, loadCampusStudies } from '@/src/auth/campus';
import type { CampusLogEntry } from '@/src/auth/campus-log';
import { JsonTree , Button, Card, Muted, Pill, Section } from '@ua/ui';
import { colors, themedStyles } from '@ua/ui/theme';
import { breakable, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

type ResponseView = 'text' | 'json' | 'pretty';

function responseToggleLabel(view: ResponseView, locale: Locale): string {
  if (view === 'text') return tx(locale, 'apiEntryDetail.text');
  if (view === 'json') return 'JSON';
  return 'Pretty';
}

function ResponseToggle({ locale, view, onChange }: { locale: Locale; view: ResponseView; onChange: (view: ResponseView) => void }) {
  const views: ResponseView[] = ['text', 'json', 'pretty'];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {views.map((item) => (
        <Pressable key={item} onPress={() => onChange(item)}>
          <Pill label={responseToggleLabel(item, locale)} active={view === item} />
        </Pressable>
      ))}
    </View>
  );
}

function responseItems(responseJson?: string): { count: number; names: string[] } | null {
  if (!responseJson) return null;
  try {
    const parsed: unknown = JSON.parse(responseJson);
    const lists: unknown[] = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null
        ? ['nodes', 'studies', 'courses'].flatMap((key) => {
            const list = (parsed as Record<string, unknown>)[key];
            return Array.isArray(list) ? list : [];
          })
        : [];
    if (!lists.length) return null;
    const names = lists.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name : typeof record.title === 'string' ? record.title : '';
      return name ? [name] : [];
    });
    return { count: lists.length, names: names.slice(0, 10) };
  } catch {
    return null;
  }
}

function rawResponse(entry: CampusLogEntry): string {
  if (entry.responseJson) return entry.responseJson;
  return JSON.stringify({ code: entry.code ?? null, detail: entry.detail ?? null, httpStatus: entry.httpStatus ?? null });
}

/** `JSON.parse` that reports failure as `undefined` instead of throwing (JSON never parses to undefined). */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function PrettyJson({ entry }: { entry: CampusLogEntry }) {
  if (!entry.responseJson) {
    return <JsonTree value={{ code: entry.code ?? null, detail: entry.detail ?? null, httpStatus: entry.httpStatus ?? null }} />;
  }
  const parsed = parseJson(entry.responseJson);
  if (parsed === undefined) {
    return (
      <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' }}>
        {breakable(entry.responseJson)}
      </Text>
    );
  }
  return <JsonTree value={parsed} />;
}

function ResponseRendered({ entry, locale }: { entry: CampusLogEntry; locale: Locale }) {
  const preview = responseItems(entry.responseJson);
  if (!preview) {
    return entry.response ? <Text style={{ color: colors.anthracite, fontSize: 14, lineHeight: 20 }}>{entry.response}</Text> : null;
  }
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.anthracite, fontSize: 16, fontWeight: '700' }}>
        {tx(locale, 'apiEntryDetail.eintraege', [preview.count])}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {preview.names.map((name, index) => (
          <Pill key={`${name}-${index}`} label={name} />
        ))}
      </View>
      {preview.count > preview.names.length ? (
        <Muted>{tx(locale, 'apiEntryDetail.weitere', [preview.count - preview.names.length])}</Muted>
      ) : null}
    </View>
  );
}

export interface ApiEntryDetailProps {
  entry: CampusLogEntry | null;
  locale: Locale;
  onClose: () => void;
}

/**
 * Full data of one C@MPUS call: status rows, the request, the response in
 * text / raw JSON / syntax-tree form, and a reload button for that exact call.
 */
export function ApiEntryDetail({ entry, locale, onClose }: ApiEntryDetailProps) {
  const [refetching, setRefetching] = useState(false);
  const [note, setNote] = useState('');
  const [responseView, setResponseView] = useState<ResponseView>('text');

  if (!entry) {
    return <Muted>{tx(locale, 'apiEntryDetail.eintrag')}</Muted>;
  }

  const canRefetch = entry.op === 'structure' || entry.op === 'courses' || entry.op === 'studies';

  async function refetch(): Promise<void> {
    if (refetching) return;
    const current = entry;
    if (!current) return;
    setRefetching(true);
    setNote('');
    try {
      if (current.op === 'structure' && current.elementId !== undefined) {
        const loaded = await loadCampusCurriculum(current.elementId, current.studyId);
        setNote(tx(locale, 'apiEntryDetail.erneut_geladen', [loaded.nodes.length]));
      } else if (current.op === 'courses' && current.elementId !== undefined) {
        const loaded = await loadCampusCourses(current.elementId, current.studyId);
        setNote(tx(locale, 'apiEntryDetail.erneut_geladen_kurse', [loaded.courses.length]));
      } else if (current.op === 'studies') {
        const loaded = await loadCampusStudies();
        setNote(tx(locale, 'apiEntryDetail.erneut_geladen_studiengaenge', [loaded.studies.length]));
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      setNote(tx(locale, 'apiEntryDetail.erneut', [code]));
    } finally {
      setRefetching(false);
    }
  }

  const rows: [string, string][] = [
    [tx(locale, 'apiEntryDetail.status'), entry.ok ? 'OK' : (entry.code ?? '?')],
    [tx(locale, 'apiEntryDetail.operation'), entry.op],
    [tx(locale, 'apiEntryDetail.zeit'), entry.time],
    [tx(locale, 'apiEntryDetail.dauer'), `${entry.elapsedMs} ms`],
    [tx(locale, 'apiEntryDetail.http'), entry.httpStatus !== undefined ? String(entry.httpStatus) : '–'],
    [tx(locale, 'apiEntryDetail.studie'), entry.studyId !== undefined ? String(entry.studyId) : '–'],
    [tx(locale, 'apiEntryDetail.element'), entry.elementId !== undefined ? String(entry.elementId) : '–'],
  ];

  return (
    <View style={{ gap: 10 }}>
      <Section title={tx(locale, 'apiEntryDetail.details')} action={tx(locale, 'common.schliessen')} onAction={onClose} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 12, height: 12, borderRadius: 99, backgroundColor: entry.ok ? colors.success : colors.danger }} />
          <Text style={{ color: colors.anthracite, fontSize: 17, fontWeight: '700' }}>{entry.op}</Text>
        </View>
        {rows.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.inkSoft, fontSize: 14 }}>{label}</Text>
            <Text style={{ color: colors.anthracite, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>
        ))}
        {entry.detail ? (
          <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' }}>{breakable(entry.detail)}</Text>
        ) : null}
        {entry.request ? (
          <>
            <Text style={styles.label}>{tx(locale, 'apiEntryDetail.anfrage')}</Text>
            <Text style={{ color: colors.anthracite, fontSize: 14 }}>{entry.request}</Text>
          </>
        ) : null}
        {entry.response || entry.responseJson ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>{tx(locale, 'apiEntryDetail.antwort')}</Text>
              <ResponseToggle locale={locale} view={responseView} onChange={setResponseView} />
            </View>
            {responseView === 'json' ? (
              <Text style={{ color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: 'Menlo' }}>{breakable(rawResponse(entry))}</Text>
            ) : responseView === 'pretty' ? (
              <PrettyJson entry={entry} />
            ) : (
              <ResponseRendered entry={entry} locale={locale} />
            )}
          </>
        ) : null}
      </Card>
      {canRefetch ? <Button label={refetching ? '…' : tx(locale, 'apiEntryDetail.erneut_laden')} onPress={refetch} secondary /> : null}
      {note ? <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>{note}</Text> : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  label: { color: colors.blue, fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.1, textTransform: 'uppercase' as const },
}));
