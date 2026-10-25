import { Stack, router } from 'expo-router';

import { Card, Meter, Screen } from '@/src/components/ui';
import { modules, program, student } from '@/src/data';
import { areaTotals, totals, weightedAverage } from '@/src/domain/plan';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatGrade, pick, tx } from '@/src/text';
import { Text } from 'react-native';

export default function RequirementsScreen() {
  const locale = useAppSelector((state) => state.locale);
  const credit = totals(modules);
  const average = weightedAverage(modules);
  const expected = (student.semester - 1) * program.standardSemesterEcts;
  const gap = expected - credit.earned;
  return (
    <Screen
      narrow
      kicker={tx(locale, 'anforderungen.pruefungsordnung')}
      subtitle={tx(locale, 'anforderungen.vereinfachter')}>
      <Stack.Screen options={{ title: tx(locale, 'common.anforderungen') }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 22, fontWeight: '700' }}>
          {credit.earned} / {program.totalEcts} ECTS
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {tx(locale, 'anforderungen.belegt_offen', [credit.active, credit.open, average === null ? '–' : formatGrade(average, locale)])}
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {gap > 0
            ? tx(locale, 'anforderungen.richtwert_semestern', [student.semester - 1, expected, gap])
            : tx(locale, 'anforderungen.richtwert')}
        </Text>
      </Card>
      {program.areas.map((area) => {
        const progress = areaTotals(modules, area.id);
        return (
          <Card key={area.id} onPress={() => router.push('/studium')}>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{pick(area.title, locale)}</Text>
            <Text style={{ color: colors.inkSoft }}>
              {progress.earned} / {area.ects} ECTS
              {progress.active ? tx(locale, 'anforderungen.belegt', [progress.active]) : ''}
            </Text>
            <Meter value={progress.earned} max={area.ects} />
          </Card>
        );
      })}
    </Screen>
  );
}
