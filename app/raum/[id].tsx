import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, InfoRow, Screen } from '@/src/components/ui';
import { modules, places } from '@/src/data';
import { campusName, placeKind, sessionKind } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx, weekdays } from '@/src/text';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function RoomScreen() {
  const { locale } = useApp();
  const place = places.find((item) => item.id === one(useLocalSearchParams<{ id: string }>().id));
  if (!place) return <Screen back title={tx(locale, 'Ort fehlt', 'Place missing')}><Text /></Screen>;
  const sessions = modules.flatMap((module) =>
    module.sessions.filter((session) => session.roomId === place.id).map((session) => ({ module, session })),
  );
  return (
    <Screen back kicker={campusName(place.campus, locale)} title={place.name} subtitle={placeKind(place.kind, locale)}>
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{place.address}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 21 }}>{pick(place.note, locale)}</Text>
        <Text style={{ color: colors.inkSoft }}>
          {place.campus === 'vaihingen'
            ? tx(locale, 'Stadtbahn bis Haltestelle Universität, dann zu Fuß über den Campus.', 'Stadtbahn to Universität, then walk across campus.')
            : tx(locale, 'Stadtbahn Stadtmitte, dann Richtung Keplerstraße oder Holzgartenstraße.', 'Stadtbahn to Stadtmitte, then toward Keplerstraße or Holzgartenstraße.')}
        </Text>
      </Card>
      {sessions.map(({ module, session }) => (
        <InfoRow
          key={`${module.id}-${session.start}`}
          title={pick(module.title, locale)}
          meta={sessionKind(session.kind, locale)}
          detail={`${weekdays[locale][session.day]} ${session.start}–${session.end}`}
          onPress={() => router.push({ pathname: '/modul/[id]', params: { id: module.id } })}
        />
      ))}
    </Screen>
  );
}
