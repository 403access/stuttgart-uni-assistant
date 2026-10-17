import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, type ViewStyle } from 'react-native';

import { CampusInfoView } from '@/src/components/campus-info-view';
import { LecturersList } from '@/src/components/lecturers-list';
import { TutorialsList } from '@/src/components/tutorials-list';
import { Card, InfoRow, Meter, Pill, Screen, Section } from '@/src/components/ui';
import { modules, program } from '@/src/data';
import { searchModules, totals } from '@/src/domain/plan';
import { moduleStatus } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';
import type { ModuleStatus } from '@/src/types';

const filters: (ModuleStatus | 'all')[] = ['all', 'enrolled', 'open', 'passed'];

const segments = [
  { key: 'module', de: 'Module', en: 'Modules' },
  { key: 'structure', de: 'Struktur', en: 'Structure' },
  { key: 'tutorials', de: 'Tutorien', en: 'Tutorials' },
  { key: 'lecturers', de: 'Dozierende', en: 'Lecturers' },
] as const;

type SegmentKey = (typeof segments)[number]['key'];

export default function StudyScreen() {
  const { locale, plannedIds } = useApp();
  const [segment, setSegment] = useState<SegmentKey>('module');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ModuleStatus | 'all'>('all');
  const credit = totals(modules);
  const visible = useMemo(() => {
    const found = searchModules(modules, query);
    return found.filter((item) => (filter === 'all' ? true : item.status === filter));
  }, [filter, query]);

  return (
    <Screen kicker={tx(locale, 'Modulplan', 'Module plan')} title={tx(locale, 'Studium', 'Study')} subtitle={pick(program.title, locale)}>
      <View style={segmentRow}>
        {segments.map((item) => (
          <Pressable key={item.key} onPress={() => setSegment(item.key)}>
            <Pill label={tx(locale, item.de, item.en)} active={segment === item.key} />
          </Pressable>
        ))}
      </View>
      {segment === 'module' ? (
        <>
          <Card onPress={() => router.push('/anforderungen')}>
            <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>
              {credit.earned} / {program.totalEcts} ECTS
            </Text>
            <Meter value={credit.earned} max={program.totalEcts} />
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Shortcut label={tx(locale, 'Anforderungen', 'Requirements')} onPress={() => router.push('/anforderungen')} />
            <Shortcut label={tx(locale, 'Reihenfolge', 'Sequence')} onPress={() => router.push('/reihenfolge')} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={tx(locale, 'Modul, Thema oder Code', 'Module, topic, or code')}
            placeholderTextColor={colors.mute}
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {filters.map((item) => {
              const label = item === 'all' ? tx(locale, 'Alle', 'All') : moduleStatus(item, locale);
              return (
                <Pressable key={item} onPress={() => setFilter(item)}>
                  <Pill label={label} active={filter === item} />
                </Pressable>
              );
            })}
          </View>
          <Section title={`${visible.length}`} />
          {visible.map((item) => (
            <InfoRow
              key={item.id}
              title={pick(item.title, locale)}
              meta={`${item.ects} ECTS`}
              detail={`${item.code} · ${moduleStatus(item.status, locale)}${plannedIds.includes(item.id) ? ` · ${tx(locale, 'vorgemerkt', 'planned')}` : ''}`}
              onPress={() => router.push({ pathname: '/modul/[id]', params: { id: item.id } })}
            />
          ))}
        </>
      ) : null}
      {segment === 'structure' ? <CampusInfoView /> : null}
      {segment === 'tutorials' ? <TutorialsList /> : null}
      {segment === 'lecturers' ? <LecturersList /> : null}
    </Screen>
  );
}

function Shortcut({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={{ width: '48%' }}>
      <Card onPress={onPress}>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>{label}</Text>
      </Card>
    </View>
  );
}

const segmentRow: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 };

const inputStyle = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.anthracite,
};
