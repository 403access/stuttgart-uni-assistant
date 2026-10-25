import { router } from 'expo-router';
import { View } from 'react-native';

import { InfoRow, Muted } from '@ua/ui';
import { modules, places, tutorials } from '@ua/core/data';
import { useAppSelector } from '@/src/state/AppState';
import { pick, tx, weekdays } from '@ua/core/format';

export function TutorialsList() {
  const locale = useAppSelector((state) => state.locale);
  if (tutorials.length === 0) {
    return (
      <Muted>{tx(locale, 'tutorialsList.tutorien')}</Muted>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {tutorials.map((item) => {
        const module = modules.find((entry) => entry.id === item.moduleId);
        const room = places.find((entry) => entry.id === item.roomId);
        const meta = item.enrolled ? tx(locale, 'common.belegt') : `${item.taken}/${item.seats}`;
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
