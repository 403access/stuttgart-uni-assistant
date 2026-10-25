import { Pressable, Text, View } from 'react-native';

import { Button, Card } from '@/src/components/ui';
import type { CurriculumSyncInfo } from '@/src/campus/db';
import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { CampusStudy, Locale } from '@ua/core/domain/types';

export interface StudyFetchProgress {
  fetched: number;
  nodeCount: number;
  retries: number;
}

export interface StudyCacheCardProps {
  study: CampusStudy;
  /** Cached sync metadata for the study, when present. */
  info: CurriculumSyncInfo | null;
  /** Node count from the loaded tree (0 when nothing is cached). */
  count: number;
  /** Live progress while this study syncs; absent when idle. */
  busy?: StudyFetchProgress;
  /** Highlight the card and prefix the name, marking the browsed study. */
  active: boolean;
  locale: Locale;
  onSelect: () => void;
  onLoad: () => void;
  onCancel: () => void;
  onClear: () => void;
}

/** One enrolled study: cache summary plus load/continue/cancel/clear controls. */
export function StudyCacheCard({ study, info, count, busy, active, locale, onSelect, onLoad, onCancel, onClear }: StudyCacheCardProps) {
  const cached = `${tx(locale, 'studyCacheCard.knoten')}`;
  const meta = [
    study.intendedDegree,
    info && info.nodeCount > 0 ? `${info.nodeCount} ${cached}` : count > 0 ? `${count} ${cached}` : tx(locale, 'studyCacheCard.cache'),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card>
      <Pressable onPress={onSelect}>
        <Text style={styles.name}>
          {active ? '● ' : ''}
          {study.name}
        </Text>
        <Text style={styles.meta}>{meta}</Text>
      </Pressable>
      {busy ? (
        <View style={styles.actions}>
          <Text style={styles.busy}>
            {tx(locale, 'common.abfragen', [busy.fetched, busy.nodeCount, busy.retries > 0 ? ` · ${busy.retries} Wiederholungen` : ''])}
          </Text>
          <Button secondary label={tx(locale, 'common.abbrechen')} onPress={onCancel} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button
            secondary={count > 0}
            label={count > 0 ? tx(locale, 'common.weiter') : tx(locale, 'common.struktur')}
            onPress={onLoad}
          />
          {count > 0 ? <Button secondary label={tx(locale, 'common.cache')} onPress={onClear} /> : null}
        </View>
      )}
    </Card>
  );
}

const styles = themedStyles((colors) => ({
  name: { color: colors.anthracite, fontSize: 17, fontWeight: '700' as const },
  meta: { color: colors.inkSoft, fontSize: 13 },
  actions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, alignItems: 'center' as const },
  busy: { color: colors.blue, fontWeight: '700' as const },
}));
