import { router } from 'expo-router';

import { InfoRow, Screen } from '@/src/components/ui';
import { exams, modules } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { pick, tx } from '@/src/text';

export default function ExamsScreen() {
  const { locale } = useApp();
  return (
    <Screen
      back
      kicker={tx(locale, 'Index', 'Index')}
      title={tx(locale, 'Altklausuren', 'Past exams')}
      subtitle={tx(locale, 'Themen und Schwerpunkte aus dem Demonstrationskreis. Keine Prüfungs-PDFs.', 'Topics and focus from the demonstration cohort. No exam PDFs.')}>
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
