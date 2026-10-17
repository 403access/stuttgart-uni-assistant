import { router } from 'expo-router';
import { View } from 'react-native';

import { InfoRow, Muted } from '@/src/components/ui';
import { modules, places, tutorials } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { pick, tx, weekdays } from '@/src/text';

export function TutorialsList() {
  const { locale } = useApp();
  if (tutorials.length === 0) {
    return (
      <Muted>{tx(locale, 'Keine Tutorien im Demonstrationsstand.', 'No tutorials in the demonstration record.')}</Muted>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {tutorials.map((item) => {
        const module = modules.find((entry) => entry.id === item.moduleId);
        const room = places.find((entry) => entry.id === item.roomId);
        const meta = item.enrolled ? tx(locale, 'belegt', 'enrolled') : `${item.taken}/${item.seats}`;
        return (
          <InfoRow
            key={item.id}
            title={`${module ? pick(module.title, locale) : item.moduleId} · ${item.group}`}
            meta={meta}
            detail={`${weekdays[locale][item.day]} ${item.start}–${item.end} · ${room?.name ?? ''} · ${item.tutor}`}
            onPress={() => router.push({ pathname: '/modul/[id]', params: { id: item.moduleId } })}
          />
        );
      })}
    </View>
  );
}
