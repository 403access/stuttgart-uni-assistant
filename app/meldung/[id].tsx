import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, Screen } from '@/src/components/ui';
import { newsSource } from '@/src/labels';
import { useNewsItem } from '@/src/news/use-news';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { firstParam, formatDate, pick, tx } from '@/src/text';

export default function NewsDetailScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { item, isLoading } = useNewsItem(firstParam(id));
  if (!item) {
    return (
      <Screen
        kicker={isLoading ? tx(locale, 'common.meldungen') : tx(locale, 'meldung.meldung')}
        subtitle={isLoading ? undefined : tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'common.meldungen') }} />
      </Screen>
    );
  }
  return (
    <Screen kicker={newsSource(item.source, locale)} subtitle={formatDate(item.date, locale)}>
      <Stack.Screen options={{ title: pick(item.title, locale) }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 16, lineHeight: 24 }}>{pick(item.body, locale)}</Text>
      </Card>
    </Screen>
  );
}
