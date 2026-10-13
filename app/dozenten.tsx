import { router } from 'expo-router';

import { InfoRow, Screen } from '@/src/components/ui';
import { people, places } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { pick, tx } from '@/src/text';

export default function PeopleScreen() {
  const { locale } = useApp();
  return (
    <Screen back kicker={tx(locale, 'Fakultät', 'Faculty')} title={tx(locale, 'Dozierende', 'Lecturers')} subtitle={tx(locale, 'Erfundene Profile für die Demonstration.', 'Fictional profiles for the demonstration.')}>
      {people.map((person) => (
        <InfoRow
          key={person.id}
          title={`${pick(person.title, locale)} ${person.name}`}
          meta={places.find((place) => place.id === person.roomId)?.name}
          detail={pick(person.hours, locale)}
          onPress={() => router.push({ pathname: '/dozent/[id]', params: { id: person.id } })}
        />
      ))}
    </Screen>
  );
}
