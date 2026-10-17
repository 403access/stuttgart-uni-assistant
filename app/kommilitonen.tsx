import { Stack, router } from 'expo-router';

import { Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { documents, modules, reviews as seedReviews } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';
import { Text } from 'react-native';

export default function PeersScreen() {
  const { locale, reviews, imports } = useApp();
  const all = [...reviews, ...seedReviews];
  const sharedNotes = [
    ...documents.filter((item) => item.source === 'peer').map((item) => ({ id: item.id, title: pick(item.title, locale), detail: item.author })),
    ...imports.filter((item) => item.shared).map((item) => ({ id: item.id, title: item.title, detail: tx(locale, 'Deine Notiz', 'Your note') })),
  ];
  return (
    <Screen kicker={tx(locale, 'Kommilitonen', 'Peers')} subtitle={tx(locale, 'Bewertungen und Notizen aus dem Demonstrationskreis plus dem, was du auf diesem Gerät teilst.', 'Reviews and notes from the demonstration cohort, plus what you share from this device.')}>
      <Stack.Screen options={{ title: tx(locale, 'Austausch', 'Exchange') }} />
      <Section title={tx(locale, 'Empfehlungen', 'Recommendations')} />
      {all.map((review) => {
        const module = modules.find((item) => item.id === review.moduleId);
        return (
          <Card key={review.id} onPress={() => router.push({ pathname: '/modul/[id]', params: { id: review.moduleId } })}>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{module ? pick(module.title, locale) : review.moduleId}</Text>
            <Text style={{ color: colors.blue, fontWeight: '700' }}>
              {review.rating.toFixed(1)} · {review.workload} h/{tx(locale, 'Woche', 'week')} · {tx(locale, 'Schwierigkeit', 'difficulty')} {review.difficulty}/5
            </Text>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{pick(review.comment, locale)}</Text>
          </Card>
        );
      })}
      <Section title={tx(locale, 'Geteilte Notizen', 'Shared notes')} />
      {sharedNotes.map((note) => (
        <InfoRow key={note.id} title={note.title} detail={note.detail} onPress={() => router.push({ pathname: '/dokument/[id]', params: { id: note.id } })} />
      ))}
    </Screen>
  );
}
