import { router } from 'expo-router';
import { View } from 'react-native';

import { InfoRow, Muted } from '@/src/components/ui';
import { people, places } from '@ua/core/data';
import { useAppSelector } from '@/src/state/AppState';
import { pick, tx } from '@ua/core/format';

export function LecturersList() {
  const locale = useAppSelector((state) => state.locale);
  return (
    <View style={{ gap: 8 }}>
      <Muted>{tx(locale, 'lecturersList.erfundene')}</Muted>
      {people.map((person) => (
        <InfoRow
          key={person.id}
          title={`${pick(person.title, locale)} ${person.name}`}
          meta={places.find((place) => place.id === person.roomId)?.name}
          detail={pick(person.hours, locale)}
          onPress={() => router.push({ pathname: '/dozent/[id]', params: { id: person.id } })}
        />
      ))}
    </View>
  );
}
