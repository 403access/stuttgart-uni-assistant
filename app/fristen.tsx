import { Stack } from 'expo-router';

import { InfoRow, Screen } from '@/src/components/ui';
import { deadlines } from '@/src/data';
import { useAppSelector } from '@/src/state/AppState';
import { formatDate, pick, tx } from '@/src/text';

export default function DeadlinesScreen() {
  const locale = useAppSelector((state) => state.locale);
  const rows = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Screen kicker={tx(locale, 'fristen.termine')} subtitle={tx(locale, 'fristen.demonstrationsstand')}>
      <Stack.Screen options={{ title: tx(locale, 'common.fristen') }} />
      {rows.map((item) => (
        <InfoRow key={item.id} title={pick(item.title, locale)} meta={formatDate(item.date, locale)} detail={`${item.source.toUpperCase()} · ${pick(item.detail, locale)}`} />
      ))}
    </Screen>
  );
}
