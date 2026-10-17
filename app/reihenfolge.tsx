import { Stack, router } from 'expo-router';
import { Text } from 'react-native';

import { Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { modules, program } from '@/src/data';
import { lockReason, suggestNextSemester } from '@/src/domain/plan';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';

export default function SequenceScreen() {
  const { locale } = useApp();
  const suggestion = suggestNextSemester(modules, program.areas);
  const sum = suggestion.reduce((count, item) => count + item.ects, 0);
  const semesters = [1, 2, 3, 4, 5, 6];
  return (
    <Screen
      kicker={tx(locale, 'Abhängigkeiten', 'Dependencies')}
      subtitle={tx(locale, 'Zuerst werden fast volle Bereiche geschlossen, dann die größten Lücken.', 'Nearly finished areas close first, then the largest gaps.')}>
      <Stack.Screen options={{ title: tx(locale, 'Reihenfolge', 'Sequence') }} />
      <Card>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>
          {tx(locale, `Vorschlag nächstes Semester · ${sum} ECTS`, `Suggested next semester · ${sum} ECTS`)}
        </Text>
        {suggestion.map((item) => (
          <Text key={item.id} style={{ color: colors.anthracite }}>
            {item.code} · {pick(item.title, locale)} · {item.ects}
          </Text>
        ))}
      </Card>
      <Section title={tx(locale, 'Noch gesperrt', 'Still locked')} />
      {modules
        .filter((item) => item.status === 'open' && lockReason(item, modules))
        .map((item) => (
          <InfoRow
            key={item.id}
            title={pick(item.title, locale)}
            meta={item.code}
            detail={
              lockReason(item, modules)?.startsWith('min:')
                ? tx(locale, `Ab ${item.minEarned} bestandenen ECTS`, `From ${item.minEarned} passed ECTS`)
                : tx(locale, 'Voraussetzung noch nicht bestanden', 'Prerequisite not passed yet')
            }
            onPress={() => router.push({ pathname: '/modul/[id]', params: { id: item.id } })}
          />
        ))}
      {semesters.map((semester) => (
        <Card key={semester}>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>
            {semester}. {tx(locale, 'Semester', 'semester')}
            {semester === 5 ? tx(locale, ' · jetzt', ' · now') : ''}
          </Text>
          {modules
            .filter((item) => item.recommendedSemester === semester)
            .map((item) => (
              <Text key={item.id} style={{ color: colors.anthracite }} onPress={() => router.push({ pathname: '/modul/[id]', params: { id: item.id } })}>
                {item.code} · {pick(item.title, locale)}
              </Text>
            ))}
        </Card>
      ))}
    </Screen>
  );
}
