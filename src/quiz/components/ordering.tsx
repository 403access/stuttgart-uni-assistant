import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

import type { OrderingQuestion } from '../types';

export function OrderingView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: OrderingQuestion;
  locale: Locale;
  value: string[] | undefined;
  revealed: boolean;
  onChange: (value: string[]) => void;
}) {
  const order = value ?? question.items.map((item) => item.id);
  const byId = new Map(question.items.map((item) => [item.id, item]));
  const correctOrder = question.items.map((item) => item.id);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.hint}>{tx(locale, 'quiz.ordering_hint')}</Text>
      {order.map((id, index) => {
        const item = byId.get(id);
        const positionCorrect = revealed && correctOrder[index] === id;
        return (
          <View
            key={id}
            style={[
              styles.row,
              revealed && (positionCorrect ? styles.correct : styles.wrong),
            ]}
          >
            <View style={styles.index}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <Text style={styles.label}>{item ? pick(item.label, locale) : id}</Text>
            {revealed ? (
              <MaterialIcons
                name={positionCorrect ? 'check' : 'close'}
                size={18}
                color={positionCorrect ? colors.success : colors.danger}
              />
            ) : (
              <View style={styles.arrows}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tx(locale, 'quiz.ordering_up')}
                  disabled={index === 0}
                  hitSlop={6}
                  onPress={() => move(index, -1)}
                  style={index === 0 && styles.disabled}
                >
                  <MaterialIcons name="keyboard-arrow-up" size={22} color={colors.blue} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tx(locale, 'quiz.ordering_down')}
                  disabled={index === order.length - 1}
                  hitSlop={6}
                  onPress={() => move(index, 1)}
                  style={index === order.length - 1 && styles.disabled}
                >
                  <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.blue} />
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  index: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  label: { flex: 1, color: colors.anthracite, fontSize: 15, lineHeight: 21 },
  arrows: { flexDirection: 'row', gap: 2 },
  disabled: { opacity: 0.25 },
}));
