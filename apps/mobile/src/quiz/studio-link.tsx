import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@ua/ui';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

/**
 * Entry point to the articulation studio. It appears as a tool card on the quiz
 * hub and as a "see it animated" card on a phonetics topic, so the studio is
 * reachable from where the learner is — never only from a settings list.
 */
export function StudioLinkCard({
  locale,
  sound,
  topic,
  variant = 'tool',
}: {
  locale: Locale;
  sound?: string;
  topic?: string;
  variant?: 'tool' | 'topic';
}) {
  return (
    <Card
      onPress={() =>
        router.push({ pathname: '/quiz/studio', params: { ...(sound ? { sound } : {}), ...(topic ? { topic } : {}) } })
      }
    >
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialIcons name="graphic-eq" size={22} color={colors.blue} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>
            {tx(locale, variant === 'tool' ? 'quiz.studio.title' : 'quiz.studio.open')}
          </Text>
          <Text style={styles.detail}>
            {tx(locale, variant === 'tool' ? 'quiz.studio.tool_detail' : 'quiz.studio.open_detail')}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={colors.blue} />
      </View>
    </Card>
  );
}

const styles = themedStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 3 },
  title: { color: colors.anthracite, fontSize: 15, fontWeight: '800', lineHeight: 20 },
  detail: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
}));
