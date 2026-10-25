import { Stack, router } from 'expo-router';
import { Text } from 'react-native';

import { Card, InfoRow, Screen, Section } from '@ua/ui';
import { modules, program } from '@ua/core/data';
import { lockReason, suggestNextSemester } from '@ua/core/domain/plan';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';

export default function SequenceScreen() {
  const locale = useAppSelector((state) => state.locale);
  const suggestion = suggestNextSemester(modules, program.areas);
  const sum = suggestion.reduce((count, item) => count + item.ects, 0);
  const semesters = [1, 2, 3, 4, 5, 6];
  return (
    <Screen
      narrow
      kicker={tx(locale, 'reihenfolge.abhaengigkeiten')}
      subtitle={tx(locale, 'reihenfolge.zuerst')}>
      <Stack.Screen options={{ title: tx(locale, 'common.reihenfolge') }} />
      <Card>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>
          {tx(locale, 'reihenfolge.vorschlag', [sum])}
        </Text>
        {suggestion.map((item) => (
          <Text key={item.id} style={{ color: colors.anthracite }}>
            {item.code} · {pick(item.title, locale)} · {item.ects}
          </Text>
        ))}
      </Card>
      <Section title={tx(locale, 'reihenfolge.gesperrt')} />
      {modules
        .filter((item) => item.status === 'open' && lockReason(item, modules))
        .map((item) => (
          <InfoRow
            key={item.id}
            title={pick(item.title, locale)}
            meta={item.code}
            detail={
              lockReason(item, modules)?.startsWith('min:')
                ? tx(locale, 'reihenfolge.ab', [item.minEarned])
                : tx(locale, 'reihenfolge.voraussetzung')
            }
            onPress={() => router.push({ pathname: '/modul/[id]', params: { id: item.id } })}
          />
        ))}
      {semesters.map((semester) => (
        <Card key={semester}>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>
            {semester}. {tx(locale, 'common.semester')}
            {semester === 5 ? tx(locale, 'reihenfolge.jetzt') : ''}
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
