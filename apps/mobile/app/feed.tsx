import { Stack, router } from 'expo-router';
import { RefreshControl } from 'react-native';

import { ResponsiveGrid } from '@ua/ui';
import { InfoRow, Screen } from '@/src/components/ui';
import { newsSource } from '@/src/labels';
import { useNewsItems } from '@/src/news/use-news';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDate, pick, tx } from '@/src/text';

export default function FeedScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { items, query } = useNewsItems();
  return (
    <Screen
      kicker={tx(locale, 'feed.kommunikationsquellen')}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => {
            query.refetch();
          }}
          tintColor={colors.blue}
          colors={[colors.blue]}
          progressBackgroundColor={colors.paper}
        />
      }>
      <Stack.Screen options={{ title: tx(locale, 'common.meldungen') }} />
      <ResponsiveGrid minColumnWidth={360}>
        {items.map((item) => (
          <InfoRow
            key={item.id}
            title={pick(item.title, locale)}
            meta={newsSource(item.source, locale)}
            detail={`${formatDate(item.date, locale)} · ${pick(item.summary, locale)}`}
            onPress={() => router.push({ pathname: '/meldung/[id]', params: { id: item.id } })}
          />
        ))}
      </ResponsiveGrid>
    </Screen>
  );
}
