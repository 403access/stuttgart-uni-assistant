import { router } from 'expo-router';

import { Card, Meter, Screen } from '@/src/components/ui';
import { modules, program, student } from '@/src/data';
import { areaTotals, totals, weightedAverage } from '@/src/domain/plan';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatGrade, pick, tx } from '@/src/text';
import { Text } from 'react-native';

export default function RequirementsScreen() {
  const { locale } = useApp();
  const credit = totals(modules);
  const average = weightedAverage(modules);
  const expected = (student.semester - 1) * program.standardSemesterEcts;
  const gap = expected - credit.earned;
  return (
    <Screen
      back
      kicker={tx(locale, 'Prüfungsordnung', 'Examination regulations')}
      title={tx(locale, 'Anforderungen', 'Requirements')}
      subtitle={tx(
        locale,
        'Vereinfachter Demonstrationsplan, keine amtliche Prüfungsordnung.',
        'A simplified demonstration plan, not the official examination regulations.',
      )}>
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 22, fontWeight: '700' }}>
          {credit.earned} / {program.totalEcts} ECTS
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {tx(
            locale,
            `${credit.active} belegt · ${credit.open} offen · Schnitt ${average === null ? '–' : formatGrade(average, locale)}`,
            `${credit.active} enrolled · ${credit.open} open · average ${average === null ? '–' : formatGrade(average, locale)}`,
          )}
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {gap > 0
            ? tx(locale, `Richtwert nach ${student.semester - 1} Semestern: ${expected} ECTS. Abstand: ${gap}.`, `Guide value after ${student.semester - 1} semesters: ${expected} ECTS. Gap: ${gap}.`)
            : tx(locale, 'Der Richtwert der bisherigen Semester ist erreicht.', 'The guide value for the completed semesters is met.')}
        </Text>
      </Card>
      {program.areas.map((area) => {
        const progress = areaTotals(modules, area.id);
        return (
          <Card key={area.id} onPress={() => router.push('/studium')}>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{pick(area.title, locale)}</Text>
            <Text style={{ color: colors.inkSoft }}>
              {progress.earned} / {area.ects} ECTS
              {progress.active ? tx(locale, ` · ${progress.active} belegt`, ` · ${progress.active} enrolled`) : ''}
            </Text>
            <Meter value={progress.earned} max={area.ects} />
          </Card>
        );
      })}
    </Screen>
  );
}
