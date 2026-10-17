import { Stack } from 'expo-router';

import { InfoRow, Screen } from '@/src/components/ui';
import { deadlines } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { formatDate, pick, tx } from '@/src/text';

export default function DeadlinesScreen() {
  const { locale } = useApp();
  const rows = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Screen kicker={tx(locale, 'Termine', 'Dates')} subtitle={tx(locale, 'Aus dem Demonstrationsstand von C@MPUS, ILIAS und SDG Campus.', 'From the demonstration record of C@MPUS, ILIAS, and SDG Campus.')}>
      <Stack.Screen options={{ title: tx(locale, 'Fristen', 'Deadlines') }} />
      {rows.map((item) => (
        <InfoRow key={item.id} title={pick(item.title, locale)} meta={formatDate(item.date, locale)} detail={`${item.source.toUpperCase()} · ${pick(item.detail, locale)}`} />
      ))}
    </Screen>
  );
}
