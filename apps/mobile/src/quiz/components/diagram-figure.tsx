import { Text, View } from 'react-native';

import { Card, Section } from '@/src/components/ui';
import { themedStyles } from '@ua/ui/theme';
import { pick } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

import type { QuizFigure } from '@ua/quiz-content/types';
import { DiagramCanvas, diagramAspect } from './diagram';

/**
 * The labelled study figure that sits above a topic's round options. It uses
 * the same SVG geometry as the diagram questions, so the reference card and
 * the quiz always stay in sync.
 */
export function DiagramFigureCard({
  figure,
  locale,
}: {
  figure: QuizFigure;
  locale: Locale;
}) {
  const numbered = figure.numbered ?? true;

  return (
    <>
      <Section title={pick(figure.title, locale)} />
      <Card>
        <View style={[styles.canvas, { aspectRatio: diagramAspect(figure.viewBox) }]}>
          <DiagramCanvas
            mode="figure"
            viewBox={figure.viewBox}
            backdrop={figure.backdrop}
            regions={figure.regions}
            locale={locale}
          />
        </View>

        {figure.caption ? (
          <Text style={styles.caption}>{pick(figure.caption, locale)}</Text>
        ) : null}

        {numbered ? (
          <View style={styles.legend}>
            {figure.regions
              .map((region, index) => ({ region, number: region.number ?? index + 1 }))
              .sort((left, right) => left.number - right.number)
              .map(({ region, number }) => (
                <View key={region.id} style={styles.legendItem}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{region.glyph ?? number}</Text>
                  </View>
                  <Text style={styles.legendLabel}>{pick(region.label, locale)}</Text>
                </View>
              ))}
          </View>
        ) : null}
      </Card>
    </>
  );
}

const styles = themedStyles((colors) => ({
  canvas: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F4F7FB',
    overflow: 'hidden',
  },
  caption: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  legendItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badgeText: {
    color: colors.anthracite,
    fontSize: 11,
    fontWeight: '700',
  },
  legendLabel: {
    color: colors.anthracite,
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
}));
