import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { InfoRow, Pill, Screen } from '@/src/components/ui';
import { places } from '@/src/data';
import { campusName, placeKind } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { hay, pick, tx } from '@/src/text';
import type { Campus } from '@/src/types';

export default function CampusScreen() {
  const { locale } = useApp();
  const [campus, setCampus] = useState<Campus>('vaihingen');
  const [query, setQuery] = useState('');
  const onCampus = places.filter((place) => place.campus === campus);
  const needle = hay(query.trim());
  const visible = onCampus.filter((place) => {
    if (!needle) return true;
    return hay(`${place.name} ${place.building} ${place.address} ${place.aliases.join(' ')} ${pick(place.note, locale)}`).includes(needle);
  });

  return (
    <Screen
      kicker={tx(locale, 'Orientierung', 'Orientation')}
      title="Campus"
      subtitle={tx(locale, 'Schematischer Plan für Vaihingen und Stadtmitte. Kein vermessener Lageplan und kein Standort.', 'A schematic for Vaihingen and Stadtmitte. Not a surveyed map and not your location.')}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['vaihingen', 'stadtmitte'] as Campus[]).map((item) => (
          <Pressable key={item} onPress={() => setCampus(item)}>
            <Pill label={campusName(item, locale)} active={campus === item} />
          </Pressable>
        ))}
      </View>
      <View style={mapStyle}>
        <View style={pathStyle} />
        {onCampus.map((place) => (
          <Pressable
            key={place.id}
            onPress={() => router.push({ pathname: '/raum/[id]', params: { id: place.id } })}
            style={{ position: 'absolute', left: `${place.x}%`, top: `${place.y}%`, width: 92, marginLeft: -8, marginTop: -8 }}>
            <View style={[dot, place.kind === 'mensa' || place.kind === 'transit' ? dotLight : null]} />
            <Text style={label} numberOfLines={2}>
              {place.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={tx(locale, 'Raum, Mensa, Bibliothek, K1 …', 'Room, cafeteria, library, K1 …')}
        placeholderTextColor={colors.mute}
        style={input}
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
    </Screen>
  );
}

const mapStyle = {
  height: 280,
  borderRadius: 18,
  backgroundColor: '#E7EEF6',
  borderWidth: 1,
  borderColor: colors.line,
  overflow: 'hidden' as const,
};
const pathStyle = {
  position: 'absolute' as const,
  left: '18%' as const,
  right: '12%' as const,
  top: '46%' as const,
  height: 10,
  borderRadius: 99,
  backgroundColor: '#D5E2F2',
};
const dot = { width: 14, height: 14, borderRadius: 99, backgroundColor: colors.blue };
const dotLight = { backgroundColor: colors.light };
const label = { color: colors.anthracite, fontSize: 11, fontWeight: '700' as const, marginTop: 2 };
const input = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: colors.anthracite,
};
