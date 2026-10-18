import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, InfoRow, Screen } from '@/src/components/ui';
import { modules, people, places } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function PersonScreen() {
  const { locale } = useApp();
  const params = useLocalSearchParams<{ id: string }>();
  const person = people.find((item) => item.id === one(params.id));
  if (!person) {
    return (
      <Screen kicker={tx(locale, 'dozent.profil')} subtitle={tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'dozent.profil') }} />
      </Screen>
    );
  }
  const room = places.find((place) => place.id === person.roomId);
  const taught = modules.filter((item) => item.lecturerId === person.id);
  return (
    <Screen kicker={pick(person.title, locale)} subtitle={pick(person.institute, locale)}>
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
