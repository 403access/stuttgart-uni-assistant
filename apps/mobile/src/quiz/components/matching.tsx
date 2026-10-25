import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

import { shuffle } from '../session';
import type { MatchingQuestion } from '../types';

type Side = 'left' | 'right';

export function MatchingView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: MatchingQuestion;
  locale: Locale;
  value: Record<string, string> | undefined;
  revealed: boolean;
  onChange: (value: Record<string, string>) => void;
}) {
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  const rightOptions = useMemo(() => shuffle(question.pairs), [question.pairs]);
  const pairsById = useMemo(
    () => new Map(question.pairs.map((pair) => [pair.id, pair])),
    [question.pairs],
  );
  const assignments = value ?? {};
  const assignedCount = Object.keys(assignments).length;

  const assign = (leftId: string, rightId: string) => {
    const next: Record<string, string> = { ...assignments };
    for (const [key, entry] of Object.entries(next)) {
      if (entry === rightId && key !== leftId) delete next[key];
    }
    next[leftId] = rightId;
    onChange(next);
  };

  const clear = (leftId: string) => {
    const next = { ...assignments };
    delete next[leftId];
    onChange(next);
  };

  const tapLeft = (id: string) => {
    if (revealed) return;
    if (selected?.side === 'right') {
      assign(id, selected.id);
      setSelected(null);
      return;
    }
    setSelected(selected?.side === 'left' && selected.id === id ? null : { side: 'left', id });
  };

  const tapRight = (id: string) => {
    if (revealed) return;
    if (selected?.side === 'left') {
      assign(selected.id, id);
      setSelected(null);
      return;
    }
    setSelected(selected?.side === 'right' && selected.id === id ? null : { side: 'right', id });
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.hint}>{tx(locale, 'quiz.matching_hint')}</Text>
      <View style={styles.columns}>
        <View style={[styles.column, styles.leftColumn]}>
          <Text style={styles.columnTitle}>{tx(locale, 'quiz.matching_left')}</Text>
          {question.pairs.map((pair) => {
            const assignedRight = assignments[pair.id];
            const isSelected = selected?.side === 'left' && selected.id === pair.id;
            const status = revealed
              ? assignedRight === pair.id
                ? 'correct'
                : 'wrong'
              : isSelected
                ? 'selected'
                : 'idle';
            return (
              <View key={pair.id} style={[styles.row, styles[status], styles.leftRow]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  disabled={revealed}
                  onPress={() => tapLeft(pair.id)}
                  style={styles.leftBody}
                >
                  <Text style={styles.rowLabel}>{pick(pair.left, locale)}</Text>
                  {assignedRight ? (
                    <Text style={styles.assigned}>
                      {pairsById.get(assignedRight) ? pick(pairsById.get(assignedRight)!.right, locale) : ''}
                    </Text>
                  ) : null}
                </Pressable>
                {assignedRight && !revealed ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tx(locale, 'quiz.matching_clear')}
                    hitSlop={8}
                    onPress={() => clear(pair.id)}
                  >
                    <MaterialIcons name="close" size={16} color={colors.mute} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        <View style={[styles.column, styles.rightColumn]}>
          <Text style={styles.columnTitle}>{tx(locale, 'quiz.matching_right')}</Text>
          {rightOptions.map((pair) => {
            const isSelected = selected?.side === 'right' && selected.id === pair.id;
            const isAssigned = Object.values(assignments).includes(pair.id);
            const mappedLeft = Object.entries(assignments).find(([, right]) => right === pair.id)?.[0];
            const isCorrect = revealed && mappedLeft === pair.id;
            const isWrong = revealed && Boolean(mappedLeft) && mappedLeft !== pair.id;
            const status = isCorrect
              ? 'correct'
              : isWrong
                ? 'wrong'
                : isSelected
                  ? 'selected'
                  : 'idle';
            return (
              <Pressable
                key={pair.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                disabled={revealed}
                onPress={() => tapRight(pair.id)}
                style={[styles.row, styles[status], !revealed && isAssigned && styles.assignedRow]}
              >
                <Text style={styles.rowLabel}>{pick(pair.right, locale)}</Text>
                {isCorrect ? <MaterialIcons name="check" size={16} color={colors.success} /> : null}
                {isWrong ? <MaterialIcons name="close" size={16} color={colors.danger} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.count}>
        {assignedCount} / {question.pairs.length} {tx(locale, 'quiz.matching_assigned')}
      </Text>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  columns: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  column: { gap: 6, minWidth: 0 },
  leftColumn: { flex: 0.75 },
  rightColumn: { flex: 1.25 },
  columnTitle: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    minWidth: 0,
  },
  leftRow: { paddingRight: 6 },
  leftBody: { flex: 1, gap: 2, minWidth: 0 },
  assignedRow: { borderStyle: 'dashed' },
  idle: {},
  selected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  rowLabel: { flexShrink: 1, color: colors.anthracite, fontSize: 12, lineHeight: 17 },
  assigned: { color: colors.blue, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  count: { color: colors.mute, fontSize: 12, alignSelf: 'flex-end' },
}));
