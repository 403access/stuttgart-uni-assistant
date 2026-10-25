import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

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

/** The map's width/height ratio, so the SVG keeps the viewBox proportions. */
function viewBoxAspect(viewBox: string): number {
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

const LABEL_SIZE = 28;
const LABEL_HALO = 6;
const LABEL_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});

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
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const activeZone =
    selectedZone && question.zones.some((zone) => zone.id === selectedZone)
      ? selectedZone
      : (question.zones[0]?.id ?? null);
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
            const isActive = !revealed && activeZone === zone.id;
            return (
              <Pressable
                key={zone.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                disabled={revealed}
                onPress={() => setSelectedZone(zone.id)}
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

      <View style={[styles.canvas, { aspectRatio: viewBoxAspect(question.viewBox) }]}>
        <Svg width="100%" height="100%" viewBox={question.viewBox}>
          {question.backdrop?.map((path, index) => (
            <Path
              key={index}
              d={path}
              fill={colors.paper}
              stroke={colors.line}
              strokeWidth={1}
              fillRule="evenodd"
            />
          ))}

          {question.regions.map((region) => {
            const zoneId = assignments[region.id];
            const zone = zoneId ? zoneById.get(zoneId) : undefined;
            const palette = zone ? zoneColors(zone.tone) : null;
            const isCorrect = revealed && zoneId === question.correct[region.id];
            const isWrong = revealed && Boolean(zoneId) && zoneId !== question.correct[region.id];
            const labelX = region.labelX + (region.labelDx ?? 0);
            const labelY = region.labelY + (region.labelDy ?? 0);
            const labelTone = palette?.fg ?? colors.inkSoft;
            // Labels over water need the water colour as their halo, not the land colour.
            const halo = region.marker ? colors.blueSoft : colors.paper;
            // react-native-svg attaches pointer responders for onPress, which React
            // DOM warns about on web. Use a plain click there instead.
            const pressProps = revealed
              ? {}
              : Platform.OS === 'web'
                ? ({ onPress: null, onClick: () => assign(region.id) } as unknown as {
                    onPress?: () => void;
                  })
                : { onPress: () => assign(region.id) };

            return (
              <G key={region.id} {...pressProps}>
                <Path
                  d={region.path}
                  fill={palette?.bg ?? colors.paper}
                  stroke={isCorrect ? colors.success : isWrong ? colors.danger : palette?.fg ?? colors.mute}
                  strokeWidth={isCorrect || isWrong ? 2.5 : 1.5}
                  fillRule="evenodd"
                />

                {region.marker ? (
                  <>
                    {region.labelDx || region.labelDy ? (
                      <Line
                        x1={region.labelX}
                        y1={region.labelY}
                        x2={labelX}
                        y2={labelY}
                        stroke={labelTone}
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                      />
                    ) : null}
                    <Circle
                      cx={region.labelX}
                      cy={region.labelY}
                      r={7}
                      fill={isCorrect ? colors.success : isWrong ? colors.danger : labelTone}
                      stroke={halo}
                      strokeWidth={3}
                    />
                  </>
                ) : null}

                {region.hitRadius ? (
                  <Circle cx={region.labelX} cy={region.labelY} r={region.hitRadius} fill="transparent" />
                ) : null}

                <SvgText
                  x={labelX}
                  y={labelY}
                  dy={LABEL_SIZE * 0.35}
                  fontFamily={LABEL_FONT}
                  fontSize={LABEL_SIZE}
                  fontWeight="700"
                  textAnchor="middle"
                  fill="none"
                  stroke={halo}
                  strokeWidth={LABEL_HALO}
                  strokeLinejoin="round"
                >
                  {region.short}
                </SvgText>
                <SvgText
                  x={labelX}
                  y={labelY}
                  dy={LABEL_SIZE * 0.35}
                  fontFamily={LABEL_FONT}
                  fontSize={LABEL_SIZE}
                  fontWeight="700"
                  textAnchor="middle"
                  fill={labelTone}
                >
                  {region.short}
                </SvgText>
              </G>
            );
          })}
        </Svg>
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.blueSoft,
    overflow: 'hidden',
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
