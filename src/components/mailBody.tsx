import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/** One run of ordinary text or one run of quoted ("> " prefixed) lines. */
type BodySegment = { kind: 'text'; lines: string[] } | { kind: 'quote'; lines: string[] };

const QUOTE_LINE = /^\s*>/;

/** Fold the body into text and quote runs so quotes can collapse as one unit. */
export function segmentQuotedText(text: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const lines = String(text ?? '').split('\n');
  while (lines.length > 1 && !lines[lines.length - 1].trim()) lines.pop();
  for (const line of lines) {
    const kind = QUOTE_LINE.test(line) ? 'quote' : 'text';
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) last.lines.push(line);
    else segments.push({ kind, lines: [line] });
  }
  return segments;
}

/** One quoted run: hidden behind a one-line toggle, shown with the ">" markers peeled off. */
function QuoteBlock({ lines, locale }: { lines: string[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const body = useMemo(() => lines.map((line) => line.replace(QUOTE_LINE, '').replace(/^ /, '')).join('\n'), [lines]);
  return (
    <View style={styles.quote}>
      <Pressable
        hitSlop={6}
        onPress={() => setOpen((value) => !value)}
        accessibilityLabel={open ? tx(locale, 'Zitat ausblenden', 'Hide quote') : tx(locale, `Zitat anzeigen (${lines.length} Zeilen)`, `Show quote (${lines.length} lines)`)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.quoteToggle, pressed && styles.pressed]}
      >
        <Text style={styles.quoteToggleText}>{open ? tx(locale, 'Zitat ausblenden', 'Hide quote') : tx(locale, `Zitat anzeigen (${lines.length} Zeilen)`, `Show quote (${lines.length} lines)`)}</Text>
      </Pressable>
      {open ? (
        <Text style={styles.quoteBody} selectable>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The read view for a plain mail body: selectable text, folded reply quotes as separate,
 * indented blocks. Long mails stay performant because every run renders as one Text.
 */
export function MailBody({ text, locale }: { text: string; locale: Locale }) {
  const segments = useMemo(() => segmentQuotedText(text), [text]);
  return (
    <View style={styles.body}>
      {segments.map((segment, index) =>
        segment.kind === 'quote' ? (
          <QuoteBlock key={index} lines={segment.lines} locale={locale} />
        ) : (
          <Text key={index} style={styles.bodyText} selectable>
            {segment.lines.join('\n')}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8 },
  bodyText: { color: colors.anthracite, fontSize: 15, lineHeight: 22 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.line,
    paddingLeft: 10,
  },
  quoteToggle: { paddingVertical: 2, alignSelf: 'flex-start' },
  quoteToggleText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  quoteBody: { color: colors.inkSoft, fontSize: 14, lineHeight: 21, marginTop: 4 },
  pressed: { opacity: 0.72 },
});
