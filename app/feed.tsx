import { Stack, router } from 'expo-router';

import { InfoRow, Screen } from '@/src/components/ui';
import { news } from '@/src/data';
import { newsSource } from '@/src/labels';
import { useAppSelector } from '@/src/state/AppState';
import { formatDate, pick, tx } from '@/src/text';

export default function FeedScreen() {
  const locale = useAppSelector((state) => state.locale);
  const rows = [...news].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Screen kicker={tx(locale, 'feed.kommunikationsquellen')}>
      <Stack.Screen options={{ title: tx(locale, 'common.meldungen') }} />
      {rows.map((item) => (
        <InfoRow
          key={item.id}
          title={pick(item.title, locale)}
          meta={newsSource(item.source, locale)}
          detail={`${formatDate(item.date, locale)} · ${pick(item.summary, locale)}`}
          onPress={() => router.push({ pathname: '/meldung/[id]', params: { id: item.id } })}
        />
      ))}
    </Screen>
  );
}
