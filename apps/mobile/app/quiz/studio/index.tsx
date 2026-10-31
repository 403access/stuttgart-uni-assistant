import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Card, Pill, Screen, Section } from '@ua/ui';
import { QuizButton } from '@ua/feature-quiz/ui';
import { ArticulationPlayer } from '@ua/feature-articulation/ui';
import {
  articulationGroups,
  articulationSounds,
  findArticulationSound,
  studioSoundForTopic,
} from '@ua/feature-articulation';
import type { ArticulationManner, ArticulationSound } from '@ua/feature-articulation';
import { findQuizTopic } from '@ua/quiz-content';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import { firstParam } from '@/src/router-params';
import type { Locale } from '@ua/core/domain/types';

/**
 * The articulation studio: pick a sound and watch air, voice and articulators
 * produce it on the same head cross-section the diagram questions use.
 */
export default function ArticulationStudioScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{ sound?: string; topic?: string }>();
  const topicId = firstParam(params.topic);
  const topic = findQuizTopic(topicId);
  // The route decides what opens; tapping a sound only overrides that locally,
  // so no effect has to copy route params into state.
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const selected =
    findArticulationSound(picked) ??
    findArticulationSound(firstParam(params.sound) ?? studioSoundForTopic[topicId ?? '']) ??
    articulationSounds[0];
  const { width } = useWindowDimensions();
  const twoColumns = width >= 780;

  const player = (
    <Card>
      <ArticulationPlayer sound={selected} locale={locale} />
    </Card>
  );

  const picker = (
    <>
      <Section title={tx(locale, 'quiz.studio.sounds')} />
      <SoundPicker locale={locale} selected={selected} onSelect={(sound) => setPicked(sound.id)} />
    </>
  );

  const details = (
    <>
      <Card>
        <SoundHeader sound={selected} locale={locale} />
        <Text style={styles.summary}>{pick(selected.summary, locale)}</Text>
      </Card>

      {topic ? (
        <Card>
          <View style={styles.topicRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.topicLabel}>{tx(locale, 'quiz.studio.quiz_link')}</Text>
              <Text style={styles.topicTitle}>{pick(topic.title, locale)}</Text>
            </View>
            <MaterialIcons name="menu-book" size={22} color={colors.blue} />
          </View>
          <QuizButton
            label={tx(locale, 'quiz.start_named', [tx(locale, 'quiz.mode.all')])}
            onPress={() => router.push({ pathname: '/quiz/[topic]', params: { topic: topic.id } })}
            secondary
          />
        </Card>
      ) : null}
    </>
  );

  return (
    <Screen
      narrow
      kicker={tx(locale, 'quiz.studio.kicker')}
      title={tx(locale, 'quiz.studio.title')}
      subtitle={tx(locale, 'quiz.studio.intro')}
    >
      <Stack.Screen options={{ title: tx(locale, 'quiz.studio.title') }} />
      {twoColumns ? (
        <View style={styles.columns}>
          <View style={styles.columnMain}>{player}</View>
          <View style={styles.columnSide}>
            {picker}
            {details}
          </View>
        </View>
      ) : (
        <>
          {player}
          {picker}
          {details}
        </>
      )}
    </Screen>
  );
}

function SoundHeader({ sound, locale }: { sound: ArticulationSound; locale: Locale }) {
  return (
    <View style={styles.header}>
      <View style={styles.glyphBox}>
        <Text style={styles.glyph}>{sound.glyph}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.word}>{pick(sound.word, locale)}</Text>
        <View style={styles.tags}>
          <Pill label={tx(locale, `quiz.studio.manner.${sound.manner}`)} tone="blue" />
          {sound.place ? (
            <Pill label={tx(locale, `quiz.studio.place.${sound.place}`)} />
          ) : sound.shape ? (
            <Pill label={pick(sound.shape, locale)} />
          ) : null}
          <Pill
            label={tx(locale, sound.voiced ? 'quiz.studio.voiced' : 'quiz.studio.voiceless')}
            tone={sound.voiced ? 'ok' : 'neutral'}
          />
        </View>
      </View>
    </View>
  );
}

/** Manner tabs plus the sounds of that manner — the whole inventory stays one tap away. */
function SoundPicker({
  locale,
  selected,
  onSelect,
}: {
  locale: Locale;
  selected: ArticulationSound;
  onSelect: (sound: ArticulationSound) => void;
}) {
  // The active tab follows the selection until the learner opens another one.
  const [opened, setOpened] = useState<ArticulationManner | undefined>(undefined);
  const manner = opened ?? selected.manner;
  const group = articulationGroups.find((entry) => entry.manner === manner) ?? articulationGroups[0];

  return (
    <Card>
      <View style={styles.mannerRow}>
        {articulationGroups.map((entry) => {
          const active = entry.manner === manner;
          return (
            <Pressable
              key={entry.manner}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setOpened(entry.manner)}
              style={({ pressed }) => [styles.mannerTab, active && styles.mannerTabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.mannerLabel, active && styles.mannerLabelActive]}>
                {tx(locale, `quiz.studio.manner.${entry.manner}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.soundGrid}>
        {group.sounds.map((sound) => {
          const active = sound.id === selected.id;
          return (
            <Pressable
              key={sound.id}
              accessibilityRole="button"
              accessibilityLabel={`${sound.glyph} · ${pick(sound.word, locale)}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(sound)}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.chipGlyph, active && styles.chipGlyphActive]}>{sound.glyph}</Text>
              <Text style={styles.chipWord} numberOfLines={1}>
                {pick(sound.word, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = themedStyles((colors) => ({
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  columnMain: { flex: 1.25, minWidth: 0 },
  columnSide: { flex: 1, minWidth: 0, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyphBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { color: colors.blue, fontSize: 26, fontWeight: '800' },
  word: { color: colors.anthracite, fontSize: 18, fontWeight: '800' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  summary: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  mannerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mannerTab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mannerTabActive: { backgroundColor: colors.blueSoft, borderColor: colors.blue },
  mannerLabel: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  mannerLabelActive: { color: colors.blue },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexGrow: 1,
    flexBasis: 44,
    maxWidth: 68,
    alignItems: 'center',
    gap: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chipActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  chipGlyph: { color: colors.anthracite, fontSize: 20, fontWeight: '700' },
  chipGlyphActive: { color: colors.blue },
  chipWord: { color: colors.mute, fontSize: 10, fontWeight: '600' },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topicLabel: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  topicTitle: { color: colors.anthracite, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  pressed: { opacity: 0.7 },
}));
