import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, InfoRow, Screen } from '@/src/components/ui';
import { exams, modules } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function ExamScreen() {
  const { locale } = useApp();
  const exam = exams.find((item) => item.id === one(useLocalSearchParams<{ id: string }>().id));
  if (!exam) {
    return (
      <Screen kicker={tx(locale, 'Eintrag fehlt', 'Entry missing')} subtitle={tx(locale, 'Kein Eintrag mit dieser Kennung.', 'No entry with this id.')}>
        <Stack.Screen options={{ title: tx(locale, 'Eintrag fehlt', 'Entry missing') }} />
      </Screen>
    );
  }
  const module = modules.find((item) => item.id === exam.moduleId);
  return (
    <Screen kicker={exam.term}>
      <Stack.Screen options={{ title: module ? pick(module.title, locale) : exam.moduleId }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{pick(exam.focus, locale)}</Text>
        {exam.topics[locale].map((topic) => (
          <Text key={topic} style={{ color: colors.inkSoft }}>
            • {topic}
          </Text>
        ))}
        <Text style={{ color: colors.anthracite, marginTop: 8 }}>{pick(exam.hint, locale)}</Text>
      </Card>
      {module ? <InfoRow title={pick(module.title, locale)} meta={module.code} onPress={() => router.push({ pathname: '/modul/[id]', params: { id: module.id } })} /> : null}
    </Screen>
  );
}
