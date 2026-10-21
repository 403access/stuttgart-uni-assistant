import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { documents, modules, reviews as seedReviews } from '@/src/data';
import { PROFILE_FIELDS, publicProfileFieldCount } from '@/src/profile/privacy';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';

export default function PeersScreen() {
  const locale = useAppSelector((state) => state.locale);
  const reviews = useAppSelector((state) => state.reviews);
  const imports = useAppSelector((state) => state.imports);
  const privacy = useAppSelector((state) => state.profilePrivacy);
  const publicCount = publicProfileFieldCount(privacy);
  const all = [...reviews, ...seedReviews];
  const sharedNotes = [
    ...documents.filter((item) => item.source === 'peer').map((item) => ({ id: item.id, title: pick(item.title, locale), detail: item.author })),
    ...imports.filter((item) => item.shared).map((item) => ({ id: item.id, title: item.title, detail: tx(locale, 'kommilitonen.notiz') })),
  ];
  return (
    <Screen kicker={tx(locale, 'common.kommilitonen')} subtitle={tx(locale, 'kommilitonen.bewertungen')}>
      <Stack.Screen options={{ title: tx(locale, 'common.austausch') }} />
      <Section title={tx(locale, 'kommilitonen.profil_titel')} />
      <Card onPress={() => router.push('/profil/auffindbarkeit')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <MaterialIcons name={privacy.searchable ? 'public' : 'visibility-off'} size={22} color={colors.blue} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'profil.suche_status')}</Text>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
              {tx(locale, privacy.searchable ? 'kommilitonen.profil_auffindbar' : 'kommilitonen.profil_privat')}
            </Text>
            <Text style={{ color: colors.blue, fontSize: 13, fontWeight: '700' }}>
              {tx(locale, 'kommilitonen.profil_oeffentlich', [publicCount, PROFILE_FIELDS.length])}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.blue} />
        </View>
      </Card>
      <Section title={tx(locale, 'kommilitonen.empfehlungen')} />
      {all.map((review) => {
        const module = modules.find((item) => item.id === review.moduleId);
        return (
          <Card key={review.id} onPress={() => router.push({ pathname: '/modul/[id]', params: { id: review.moduleId } })}>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{module ? pick(module.title, locale) : review.moduleId}</Text>
            <Text style={{ color: colors.blue, fontWeight: '700' }}>
              {review.rating.toFixed(1)} · {review.workload} h/{tx(locale, 'kommilitonen.woche')} · {tx(locale, 'kommilitonen.schwierigkeit')} {review.difficulty}/5
            </Text>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{pick(review.comment, locale)}</Text>
          </Card>
        );
      })}
      <Section title={tx(locale, 'kommilitonen.geteilte')} />
      {sharedNotes.map((note) => (
        <InfoRow key={note.id} title={note.title} detail={note.detail} onPress={() => router.push({ pathname: '/dokument/[id]', params: { id: note.id } })} />
      ))}
    </Screen>
  );
}
