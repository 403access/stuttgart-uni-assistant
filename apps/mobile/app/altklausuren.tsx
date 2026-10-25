import { Stack, router } from 'expo-router';

import { InfoRow, Screen } from '@/src/components/ui';
import { exams, modules } from '@/src/data';
import { useAppSelector } from '@/src/state/AppState';
import { pick, tx } from '@/src/text';

export default function ExamsScreen() {
  const locale = useAppSelector((state) => state.locale);
  return (
    <Screen
      narrow
      kicker={tx(locale, 'altklausuren.index')}
      subtitle={tx(locale, 'altklausuren.themen')}>
      <Stack.Screen options={{ title: tx(locale, 'common.altklausuren') }} />
      {exams.map((exam) => {
        const module = modules.find((item) => item.id === exam.moduleId);
        return (
          <InfoRow
            key={exam.id}
            title={module ? pick(module.title, locale) : exam.moduleId}
            meta={exam.term}
            detail={pick(exam.focus, locale)}
            onPress={() => router.push({ pathname: '/pruefung/[id]', params: { id: exam.id } })}
          />
        );
      })}
    </Screen>
  );
}
