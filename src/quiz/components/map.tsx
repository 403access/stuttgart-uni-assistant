import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, themedStyles } from '@/src/theme';
import { pick, tx } from '@/src/text';
import type { Locale } from '@/src/types';

import type { MapQuestion, MapTone } from '../types';

function zoneColors(tone: MapTone): { bg: string; fg: string } {
  switch (tone) {
    case 'blue':
      return { bg: colors.blueSoft, fg: colors.blue };
    case 'ok':
      return { bg: colors.successSoft, fg: colors.success };
    case 'wait':
      return { bg: colors.warningSoft, fg: colors.warning };
    case 'stop':
      return { bg: colors.dangerSoft, fg: colors.danger };
    case 'light':
      return { bg: colors.lightSoft, fg: colors.blue };
    case 'neutral':
      return { bg: colors.mist, fg: colors.anthracite };
  }
}

export function MapView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: MapQuestion;
  locale: Locale;
  value: Record<string, string> | undefined;
  revealed: boolean;
  onChange: (value: Record<string, string>) => void;
}) {
  const [activeZone, setActiveZone] = useState<string | null>(question.zones[0]?.id ?? null);
  const assignments = value ?? {};
  const zoneById = new Map(question.zones.map((zone) => [zone.id, zone]));

  const assign = (regionId: string) => {
    if (revealed || !activeZone) return;
    const next = { ...assignments };
    if (next[regionId] === activeZone) delete next[regionId];
    else next[regionId] = activeZone;
    onChange(next);
  };

  const clearAll = () => {
    if (revealed) return;
    onChange({});
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Text style={styles.legendTitle}>{tx(locale, 'quiz.map_zones')}</Text>
        <View style={styles.zoneWrap}>
          {question.zones.map((zone) => {
            const palette = zoneColors(zone.tone);
            const isActive = activeZone === zone.id;
            return (
              <Pressable
                key={zone.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                disabled={revealed}
                onPress={() => setActiveZone(zone.id)}
                style={[
                  styles.zoneChip,
                  { backgroundColor: palette.bg, borderColor: isActive ? colors.blue : 'transparent' },
                ]}
              >
                <View style={[styles.zoneDot, { backgroundColor: palette.fg }]} />
                <Text style={[styles.zoneLabel, { color: palette.fg }]}>{pick(zone.label, locale)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.canvas}>
        <View style={[styles.gridLine, styles.gridVertical, { left: '25%' }]} />
        <View style={[styles.gridLine, styles.gridVertical, { left: '50%' }]} />
        <View style={[styles.gridLine, styles.gridVertical, { left: '75%' }]} />
        <View style={[styles.gridLine, styles.gridHorizontal, { top: '25%' }]} />
        <View style={[styles.gridLine, styles.gridHorizontal, { top: '50%' }]} />
        <View style={[styles.gridLine, styles.gridHorizontal, { top: '75%' }]} />

        <View style={[styles.land, { left: '8%', top: '57%', width: '22%', height: '19%', transform: [{ rotate: '-9deg' }] }]} />
        <View style={[styles.land, { left: '29%', top: '40%', width: '20%', height: '21%' }]} />
        <View style={[styles.land, { left: '28%', top: '20%', width: '9%', height: '15%' }]} />
        <View style={[styles.land, { left: '38%', top: '26%', width: '5%', height: '10%' }]} />
        <View style={[styles.land, { left: '55%', top: '4%', width: '13%', height: '25%', transform: [{ rotate: '9deg' }] }]} />
        <View style={[styles.land, { left: '45%', top: '34%', width: '29%', height: '25%' }]} />
        <View style={[styles.land, { left: '64%', top: '23%', width: '6%', height: '7%' }]} />
        <View style={[styles.land, { left: '46%', top: '57%', width: '8%', height: '17%', transform: [{ rotate: '-14deg' }] }]} />
        <View style={[styles.land, { left: '54%', top: '57%', width: '14%', height: '14%' }]} />
        <View style={[styles.land, { left: '68%', top: '62%', width: '23%', height: '10%' }]} />
        <View style={[styles.land, { left: '79%', top: '51%', width: '11%', height: '7%' }]} />
        <View style={[styles.land, { left: '49%', top: '80%', width: '4%', height: '3%' }]} />

        {question.regions.map((region) => {
          const zoneId = assignments[region.id];
          const zone = zoneId ? zoneById.get(zoneId) : undefined;
          const palette = zone ? zoneColors(zone.tone) : null;
          const isCorrect = revealed && zoneId === question.correct[region.id];
          const isWrong = revealed && Boolean(zoneId) && zoneId !== question.correct[region.id];
          return (
            <Pressable
              key={region.id}
              accessibilityRole="button"
              accessibilityLabel={`${pick(region.label, locale)}${zone ? `: ${pick(zone.label, locale)}` : ''}`}
              disabled={revealed}
              onPress={() => assign(region.id)}
              style={[
                styles.marker,
                {
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  backgroundColor: palette?.bg ?? colors.paper,
                  borderColor: isCorrect ? colors.success : isWrong ? colors.danger : palette?.fg ?? colors.line,
                },
              ]}
            >
              <Text style={[styles.markerText, { color: palette?.fg ?? colors.inkSoft }]}>{region.short}</Text>
              {isCorrect ? (
                <View style={[styles.badge, { backgroundColor: colors.success }]}>
                  <MaterialIcons name="check" size={9} color="#FFFFFF" />
                </View>
              ) : null}
              {isWrong ? (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <MaterialIcons name="close" size={9} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendHeader}>
          <Text style={styles.legendTitle}>{tx(locale, 'quiz.map_regions')}</Text>
          <Pressable accessibilityRole="button" disabled={revealed} hitSlop={8} onPress={clearAll}>
            <Text style={styles.clear}>{tx(locale, 'quiz.map_clear')}</Text>
          </Pressable>
        </View>
        {question.regions.map((region) => {
          const zoneId = assignments[region.id];
          const zone = zoneId ? zoneById.get(zoneId) : undefined;
          const palette = zone ? zoneColors(zone.tone) : null;
          const isCorrect = revealed && zoneId === question.correct[region.id];
          const isWrong = revealed && zoneId !== question.correct[region.id];
          return (
            <Pressable
              key={region.id}
              accessibilityRole="button"
              disabled={revealed}
              onPress={() => assign(region.id)}
              style={styles.regionRow}
            >
              <Text style={styles.regionName}>{pick(region.label, locale)}</Text>
              <View style={styles.regionValue}>
                {zone && palette ? (
                  <>
                    <View style={[styles.zoneDot, { backgroundColor: palette.fg }]} />
                    <Text style={[styles.regionZone, { color: palette.fg }]}>{pick(zone.label, locale)}</Text>
                  </>
                ) : (
                  <Text style={styles.regionUnassigned}>{tx(locale, 'quiz.map_unassigned')}</Text>
                )}
                {isCorrect ? <MaterialIcons name="check" size={15} color={colors.success} /> : null}
                {isWrong ? <MaterialIcons name="close" size={15} color={colors.danger} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  legendTitle: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  zoneWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneLabel: { fontSize: 12, fontWeight: '700' },
  canvas: {
    aspectRatio: 1.1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  gridLine: { position: 'absolute', backgroundColor: colors.line, opacity: 0.45 },
  gridVertical: { top: 0, bottom: 0, width: 1 },
  gridHorizontal: { left: 0, right: 0, height: 1 },
  land: { position: 'absolute', borderRadius: 999, backgroundColor: colors.line, opacity: 0.7 },
  marker: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: { fontSize: 10, fontWeight: '800' },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    padding: 12,
    gap: 2,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clear: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  regionName: { color: colors.anthracite, fontSize: 13, flexShrink: 1 },
  regionValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  regionZone: { fontSize: 12, fontWeight: '700' },
  regionUnassigned: { color: colors.mute, fontSize: 12 },
}));
