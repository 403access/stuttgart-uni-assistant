import { Platform, Text, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { themedStyles } from '@ua/ui/theme';
import { pick, tx } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { DiagramQuestion, DiagramRegion, DiagramTone } from '@ua/quiz-content/types';

/**
 * Fixed illustration palette. The figure keeps its paper look in both themes,
 * so the anatomy stays readable on a dark screen as well.
 */
const TONES: Record<DiagramTone, { fill: string; stroke: string }> = {
  blue: { fill: '#DBE8F5', stroke: '#7C9BB8' },
  violet: { fill: '#E7DDF3', stroke: '#9C86C0' },
  rose: { fill: '#F7DDE3', stroke: '#C98698' },
  tongue: { fill: '#EF9AA6', stroke: '#B95B6B' },
  sand: { fill: '#F3D8AD', stroke: '#B98B47' },
  bone: { fill: '#F6E3C4', stroke: '#B98B47' },
  teeth: { fill: '#FFFFFF', stroke: '#9AA7B4' },
  larynx: { fill: '#CFDCE8', stroke: '#5E7F9C' },
  cords: { fill: '#5E7F9C', stroke: '#243447' },
  trachea: { fill: '#E3EDF6', stroke: '#5E7F9C' },
  lip: { fill: '#E98A9B', stroke: '#B95B6B' },
  mouth: { fill: '#7D3F4A', stroke: '#7D3F4A' },
};

/** Fixed illustration palette, shared with the animated articulation figure. */
export function diagramTone(tone: DiagramTone): { fill: string; stroke: string } {
  return TONES[tone];
}

const INK = '#243447';
const PAPER = '#FFFDF9';
const CANVAS = '#F4F7FB';
const CORRECT = '#1C6B45';
const WRONG = '#8E2F2F';
const SELECTED = '#004191';

const LABEL_SIZE = 24;
const LABEL_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
});

/** The figure's width/height ratio, so the SVG keeps the viewBox proportions. */
export function diagramAspect(viewBox: string): number {
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

/**
 * One shared SVG renderer for the quiz (tap to select) and the reference
 * figure (numbered badges + legend). Keeping both on the same geometry is what
 * makes the labelled study card match the questions.
 */
export function DiagramCanvas({
  viewBox,
  backdrop,
  regions,
  locale,
  selected = [],
  revealed = false,
  correctIds = [],
  mode = 'quiz',
  onToggle,
}: {
  viewBox: string;
  backdrop: string[];
  regions: DiagramRegion[];
  locale: Locale;
  selected?: string[];
  revealed?: boolean;
  correctIds?: string[];
  /** `plain` draws the same illustration without badges, for animated overlays. */
  mode?: 'quiz' | 'figure' | 'plain';
  onToggle?: (regionId: string) => void;
}) {
  const selectedSet = new Set(selected);
  const correctSet = new Set(correctIds);
  const [minX, minY, boxWidth, boxHeight] = viewBox.split(/[\s,]+/).map(Number);

  return (
    <Svg width="100%" height="100%" viewBox={viewBox}>
      <Rect x={minX} y={minY} width={boxWidth} height={boxHeight} fill={CANVAS} />

      {backdrop.map((path, index) => (
        <Path
          key={`backdrop-${index}`}
          d={path}
          fill={PAPER}
          stroke={INK}
          strokeWidth={5}
          strokeLinejoin="round"
        />
      ))}

      {regions.map((region, index) => {
        const tone = TONES[region.tone ?? 'rose'];
        const isSelected = selectedSet.has(region.id);
        const isCorrect = revealed && correctSet.has(region.id);
        const isWrong = revealed && isSelected && !correctSet.has(region.id);
        const fill = isCorrect ? '#E5F4EC' : isWrong ? '#F8E8E8' : tone.fill;
        const stroke = isCorrect
          ? CORRECT
          : isWrong
            ? WRONG
            : isSelected
              ? SELECTED
              : tone.stroke;
        const strokeWidth = isCorrect || isWrong ? 7 : isSelected ? 6 : 3;

        // react-native-svg attaches pointer responders for onPress, which React
        // DOM warns about on web. Use a plain click there instead.
        const pressProps =
          mode !== 'quiz' || !onToggle
            ? {}
            : Platform.OS === 'web'
              ? ({ onPress: null, onClick: () => onToggle(region.id) } as unknown as {
                  onPress?: () => void;
                })
              : { onPress: () => onToggle(region.id) };

        return (
          <G key={region.id} {...pressProps}>
            {region.circle ? (
              <Circle
                cx={region.circle.cx}
                cy={region.circle.cy}
                r={region.circle.r}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                accessibilityLabel={pick(region.label, locale)}
              />
            ) : region.path ? (
              <Path
                d={region.path}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                accessibilityLabel={pick(region.label, locale)}
              />
            ) : null}

            {region.hitRadius ? (
              <Circle
                cx={region.labelX}
                cy={region.labelY}
                r={region.hitRadius}
                fill="transparent"
              />
            ) : null}

            {mode === 'figure' ? (
              <FigureBadge
                region={region}
                index={region.number ?? index + 1}
                isCorrect={isCorrect}
                isWrong={isWrong}
              />
            ) : mode === 'plain' ? null : (
              <QuizMarker
                region={region}
                isSelected={isSelected}
                isCorrect={isCorrect}
                isWrong={isWrong}
              />
            )}
          </G>
        );
      })}
    </Svg>
  );
}

/** Number badge (head) or IPA glyph (vowel chart) for the reference figure. */
function FigureBadge({
  region,
  index,
  isCorrect,
  isWrong,
}: {
  region: DiagramRegion;
  index: number;
  isCorrect: boolean;
  isWrong: boolean;
}) {
  if (region.glyph) {
    return (
      <SvgText
        x={region.labelX}
        y={region.labelY}
        dy={14}
        fontFamily={LABEL_FONT}
        fontSize={40}
        fontWeight="700"
        textAnchor="middle"
        fill={isCorrect ? CORRECT : isWrong ? WRONG : INK}
      >
        {region.glyph}
      </SvgText>
    );
  }

  return (
    <>
      <Circle
        cx={region.labelX}
        cy={region.labelY}
        r={22}
        fill={PAPER}
        stroke={INK}
        strokeWidth={2.5}
        opacity={0.96}
      />
      <SvgText
        x={region.labelX}
        y={region.labelY}
        dy={8}
        fontFamily={LABEL_FONT}
        fontSize={LABEL_SIZE}
        fontWeight="700"
        textAnchor="middle"
        fill={INK}
        pointerEvents="none"
      >
        {index}
      </SvgText>
    </>
  );
}

/** Selection halo during the quiz; correct/wrong ring after checking. */
function QuizMarker({
  region,
  isSelected,
  isCorrect,
  isWrong,
}: {
  region: DiagramRegion;
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
}) {
  if (region.glyph) {
    return (
      <SvgText
        x={region.labelX}
        y={region.labelY}
        dy={14}
        fontFamily={LABEL_FONT}
        fontSize={40}
        fontWeight="700"
        textAnchor="middle"
        fill={isCorrect ? CORRECT : isWrong ? WRONG : isSelected ? SELECTED : INK}
        pointerEvents="none"
      >
        {region.glyph}
      </SvgText>
    );
  }

  if (!isSelected && !isCorrect) return null;

  return (
    <Circle
      cx={region.labelX}
      cy={region.labelY}
      r={region.hitRadius ?? 18}
      fill="none"
      stroke={isCorrect ? CORRECT : isWrong ? WRONG : SELECTED}
      strokeWidth={5}
      strokeDasharray={isWrong ? '10 8' : undefined}
    />
  );
}

/**
 * Quiz view: tap a structure. A single-answer question replaces the selection;
 * a multi-answer question toggles regions on and off.
 */
export function DiagramView({
  question,
  locale,
  value,
  revealed,
  onChange,
}: {
  question: DiagramQuestion;
  locale: Locale;
  value: string[] | undefined;
  revealed: boolean;
  onChange: (value: string[]) => void;
}) {
  const selected = value ?? [];
  const multi = question.correctIds.length > 1;

  const toggle = (regionId: string) => {
    if (revealed) return;
    if (!multi) {
      onChange(selected.includes(regionId) ? [] : [regionId]);
      return;
    }
    onChange(
      selected.includes(regionId)
        ? selected.filter((id) => id !== regionId)
        : [...selected, regionId],
    );
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.hint}>
        {multi ? tx(locale, 'quiz.diagram_hint_multi') : tx(locale, 'quiz.diagram_hint')}
      </Text>
      <View style={[styles.canvas, { aspectRatio: diagramAspect(question.viewBox) }]}>
        <DiagramCanvas
          viewBox={question.viewBox}
          backdrop={question.backdrop}
          regions={question.regions}
          locale={locale}
          selected={selected}
          revealed={revealed}
          correctIds={question.correctIds}
          onToggle={toggle}
        />
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  hint: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  canvas: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: CANVAS,
    overflow: 'hidden',
  },
}));
