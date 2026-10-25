import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, InfoRow, Muted, Pill, Screen } from '@ua/ui';
import { UniMapView } from '@/src/components/uni-map-view';
import { places } from '@ua/core/data';
import { campusName, placeKind } from '@ua/core/labels';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyle } from '@ua/ui/theme';
import { hay, pick, tx } from '@ua/core/format';
import type { Campus } from '@ua/core/domain/types';

const UNI_MAPS_URL = 'https://maps.uni-stuttgart.de/';

type MapView = 'uni' | 'overview';

export default function CampusScreen() {
  const locale = useAppSelector((state) => state.locale);
  const [view, setView] = useState<MapView>('uni');
  const [campus, setCampus] = useState<Campus>('vaihingen');
  const [query, setQuery] = useState('');

  return (
    <Screen
      kicker={tx(locale, 'campus.orientierung')}
      subtitle={
        view === 'uni'
          ? tx(locale, 'campus.lageplan')
          : tx(locale, 'campus.schematischer')
      }
      scroll={view === 'overview'}>
      <Stack.Screen options={{ title: tx(locale, 'common.karte') }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setView('uni')}>
          <Pill label={tx(locale, 'campus.uni')} active={view === 'uni'} />
        </Pressable>
        <Pressable onPress={() => setView('overview')}>
          <Pill label={tx(locale, 'campus.uebersicht')} active={view === 'overview'} />
        </Pressable>
      </View>
      {view === 'uni' ? <UniMap locale={locale} /> : <Overview campus={campus} setCampus={setCampus} query={query} setQuery={setQuery} locale={locale} />}
    </Screen>
  );
}

function UniMap({ locale }: { locale: 'de' | 'en' }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <Card>
        <Muted>
          {tx(locale, 'campus.karte')}
        </Muted>
        <Button
          label={tx(locale, 'campus.maps')}
          onPress={() => WebBrowser.openBrowserAsync(UNI_MAPS_URL).catch(() => undefined)}
        />
      </Card>
    );
  }
  return <UniMapView url={UNI_MAPS_URL} onError={() => setFailed(true)} />;
}

function Overview({
  campus,
  setCampus,
  query,
  setQuery,
  locale,
}: {
  campus: Campus;
  setCampus: (value: Campus) => void;
  query: string;
  setQuery: (value: string) => void;
  locale: 'de' | 'en';
}) {
  const onCampus = places.filter((place) => place.campus === campus);
  const needle = hay(query.trim());
  const visible = onCampus.filter((place) => {
    if (!needle) return true;
    return hay(`${place.name} ${place.building} ${place.address} ${place.aliases.join(' ')} ${pick(place.note, locale)}`).includes(needle);
  });

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['vaihingen', 'stadtmitte'] as Campus[]).map((item) => (
          <Pressable key={item} onPress={() => setCampus(item)}>
            <Pill label={campusName(item, locale)} active={campus === item} />
          </Pressable>
        ))}
      </View>
      <View style={{ ...mapStyle }}>
        <View style={{ ...pathStyle }} />
        {onCampus.map((place) => (
          <Pressable
            key={place.id}
            onPress={() => router.push({ pathname: '/raum/[id]', params: { id: place.id } })}
            style={{ position: 'absolute', left: `${place.x}%`, top: `${place.y}%`, width: 92, marginLeft: -8, marginTop: -8 }}>
            <View style={[{ ...dot }, place.kind === 'mensa' || place.kind === 'transit' ? { ...dotLight } : null]} />
            <Text style={{ ...label }} numberOfLines={2}>
              {place.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={tx(locale, 'campus.raum')}
        placeholderTextColor={colors.mute}
        style={{ ...input }}
      />
      {visible.map((place) => (
        <InfoRow
          key={place.id}
          title={place.name}
          meta={placeKind(place.kind, locale)}
          detail={place.address}
          onPress={() => router.push({ pathname: '/raum/[id]', params: { id: place.id } })}
        />
      ))}
    </>
  );
}

const mapStyle = themedStyle((colors) => ({
  height: 280,
  borderRadius: 18,
  backgroundColor: colors.blueSoft,
  borderWidth: 1,
  borderColor: colors.line,
  overflow: 'hidden' as const,
}));
const pathStyle = themedStyle((colors) => ({
  position: 'absolute' as const,
  left: '18%' as const,
  right: '12%' as const,
  top: '46%' as const,
  height: 10,
  borderRadius: 99,
  backgroundColor: colors.line,
}));
const dot = themedStyle((colors) => ({ width: 14, height: 14, borderRadius: 99, backgroundColor: colors.blue }));
const dotLight = themedStyle((colors) => ({ backgroundColor: colors.light }));
const label = themedStyle((colors) => ({ color: colors.anthracite, fontSize: 11, fontWeight: '700' as const, marginTop: 2 }));
const input = themedStyle((colors) => ({
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.anthracite,
}));
