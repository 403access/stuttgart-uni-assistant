import { router } from 'expo-router';

import { InfoRow, Screen } from '@/src/components/ui';
import { modules, places, tutorials } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { pick, tx, weekdays } from '@/src/text';

export default function TutorialsScreen() {
  const { locale } = useApp();
  return (
    <Screen back kicker={tx(locale, 'Gruppen', 'Groups')} title={tx(locale, 'Tutorien', 'Tutorials')}>
      {tutorials.map((item) => {
        const module = modules.find((entry) => entry.id === item.moduleId);
        const room = places.find((entry) => entry.id === item.roomId);
        return (
          <InfoRow
            key={item.id}
            title={`${module ? pick(module.title, locale) : item.moduleId} · ${item.group}`}
            meta={item.enrolled ? tx(locale, 'belegt', 'enrolled') : `${item.taken}/${item.seats}`}
            detail={`${weekdays[locale][item.day]} ${item.start}–${item.end} · ${room?.name ?? ''} · ${item.tutor}`}
            onPress={() => router.push({ pathname: '/modul/[id]', params: { id: item.moduleId } })}
          />
        );
      })}
    </Screen>
  );
}
