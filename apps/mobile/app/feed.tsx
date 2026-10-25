import { Stack, router } from 'expo-router';
import { RefreshControl } from 'react-native';

import { ResponsiveGrid , InfoRow, Screen } from '@ua/ui';
import { newsSource } from '@ua/core/labels';
import { useNewsItems } from '@/src/news/use-news';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@ua/ui/theme';
import { formatDate, pick, tx } from '@ua/core/format';

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
