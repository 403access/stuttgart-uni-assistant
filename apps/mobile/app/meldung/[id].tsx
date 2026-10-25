import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, Screen } from '@/src/components/ui';
import { newsSource } from '@ua/core/labels';
import { useNewsItem } from '@/src/news/use-news';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@ua/ui/theme';
import { formatDate, pick, tx } from '@ua/core/format';
import { firstParam } from '@/src/router-params';

export default function NewsDetailScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, isLoading } = useNewsItem(firstParam(id));
  if (!item) {
    return (
      <Screen
        narrow
        kicker={isLoading ? tx(locale, 'common.meldungen') : tx(locale, 'meldung.meldung')}
        subtitle={isLoading ? undefined : tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'common.meldungen') }} />
      </Screen>
    );
  }
  return (
    <Screen narrow kicker={newsSource(item.source, locale)} subtitle={formatDate(item.date, locale)}>
      <Stack.Screen options={{ title: pick(item.title, locale) }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 16, lineHeight: 24 }}>{pick(item.body, locale)}</Text>
      </Card>
    </Screen>
  );
}
