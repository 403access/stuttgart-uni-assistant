import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, InfoRow, Screen } from '@/src/components/ui';
import { modules, people, places } from '@ua/core/data';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import { firstParam } from '@/src/router-params';

export default function PersonScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{ id: string }>();
  const person = people.find((item) => item.id === firstParam(params.id));
  if (!person) {
    return (
      <Screen narrow kicker={tx(locale, 'dozent.profil')} subtitle={tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'dozent.profil') }} />
      </Screen>
    );
  }
  const room = places.find((place) => place.id === person.roomId);
  const taught = modules.filter((item) => item.lecturerId === person.id);
  return (
    <Screen narrow kicker={pick(person.title, locale)} subtitle={pick(person.institute, locale)}>
      <Stack.Screen options={{ title: person.name }} />
      <Card>
        <Text style={{ color: colors.anthracite, lineHeight: 22 }}>{pick(person.research, locale)}</Text>
        <Text style={{ color: colors.inkSoft }}>{person.email}</Text>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>{pick(person.hours, locale)}</Text>
      </Card>
      {room ? (
        <InfoRow title={room.name} detail={room.address} onPress={() => router.push({ pathname: '/raum/[id]', params: { id: room.id } })} />
      ) : null}
      {taught.map((item) => (
        <InfoRow key={item.id} title={pick(item.title, locale)} meta={item.code} onPress={() => router.push({ pathname: '/modul/[id]', params: { id: item.id } })} />
      ))}
    </Screen>
  );
}
