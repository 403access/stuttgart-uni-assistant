import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, Screen } from '@/src/components/ui';
import { news } from '@/src/data';
import { newsSource } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDate, pick, tx } from '@/src/text';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function NewsDetailScreen() {
  const { locale } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = news.find((entry) => entry.id === one(id));
  if (!item) {
    return (
      <Screen kicker={tx(locale, 'meldung.meldung')} subtitle={tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'meldung.meldung') }} />
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
