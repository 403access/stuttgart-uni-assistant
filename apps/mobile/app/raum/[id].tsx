import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, InfoRow, Screen } from '@/src/components/ui';
import { modules, places } from '@ua/core/data';
import { campusName, placeKind, sessionKind } from '@ua/core/labels';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@ua/ui/theme';
import { pick, tx, weekdays } from '@ua/core/format';
import { firstParam } from '@/src/router-params';

export default function RoomScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{ id: string }>();
  const place = places.find((item) => item.id === firstParam(params.id));
  if (!place) {
    return (
      <Screen narrow kicker={tx(locale, 'raum.ort_fehlt')} subtitle={tx(locale, 'raum.ort')}>
        <Stack.Screen options={{ title: tx(locale, 'raum.ort_fehlt') }} />
      </Screen>
    );
  }
  const sessions = modules.flatMap((module) =>
    module.sessions.filter((session) => session.roomId === place.id).map((session) => ({ module, session })),
  );
  return (
    <Screen narrow kicker={campusName(place.campus, locale)} subtitle={placeKind(place.kind, locale)}>
      <Stack.Screen options={{ title: place.name }} />
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{place.address}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 21 }}>{pick(place.note, locale)}</Text>
        <Text style={{ color: colors.inkSoft }}>
          {place.campus === 'vaihingen'
            ? tx(locale, 'raum.stadtbahn')
            : tx(locale, 'raum.stadtbahn_stadtmitte')}
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
