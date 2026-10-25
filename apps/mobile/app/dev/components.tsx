import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import {
  COMPONENT_CATALOG,
  type ComponentCatalogCategory,
  type ComponentCatalogEntry,
  type ComponentCatalogExportKind,
  type ComponentCatalogOccurrence,
  type ComponentCatalogUsageKind,
} from '@/src/components/catalog.generated';
import { COMPONENT_PREVIEWS } from '@/src/components/component-previews';
import { Card, Muted, Pill, Screen, SearchField, Section, Strong } from '@/src/components/ui';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx, type TranslationKey } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

type CategoryFilter = 'all' | ComponentCatalogCategory;
type PlatformFilter = 'all' | 'native' | 'web';

const CATEGORIES: ComponentCatalogCategory[] = ['shared', 'feature', 'provider'];

const CATEGORY_KEY: Record<ComponentCatalogCategory, TranslationKey> = {
  shared: 'dev.components.kategorie.shared',
  feature: 'dev.components.kategorie.feature',
  provider: 'dev.components.kategorie.provider',
};

const EXPORT_KIND_KEY: Record<ComponentCatalogExportKind, TranslationKey> = {
  component: 'dev.components.export_art.component',
  hook: 'dev.components.export_art.hook',
  helper: 'dev.components.export_art.helper',
  constant: 'dev.components.export_art.constant',
};

const USAGE_KIND_KEY: Record<ComponentCatalogUsageKind, TranslationKey> = {
  import: 'dev.components.import',
  type: 'dev.components.typen',
  render: 'dev.components.render',
  call: 'dev.components.aufruf',
  reference: 'dev.components.referenz',
  're-export': 'dev.components.re_export',
};

export default function DevComponentsScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] ?? '' : params.q ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [previewed, setPreviewed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return COMPONENT_CATALOG.entries.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (platform !== 'all' && !entry.platforms.includes(platform)) return false;
      if (unusedOnly && !entry.unused) return false;
      if (!needle) return true;
      const haystack = [
        entry.name,
        entry.file,
        ...entry.exports.map((item) => item.name),
        ...entry.occurrences.map((occurrence) => `${occurrence.file} ${occurrence.exportName}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [category, platform, query, unusedOnly]);

  const groups = CATEGORIES.map((key) => ({
    key,
    entries: filtered.filter((entry) => entry.category === key),
  })).filter((group) => group.entries.length > 0);

  function togglePreview(id: string): void {
    setPreviewed((current) => ({ ...current, [id]: !current[id] }));
  }

  function toggleExpanded(id: string): void {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <Screen
      kicker={tx(locale, 'tabsMehr.dev')}
      title={tx(locale, 'dev.components.titel')}
      subtitle={tx(locale, 'dev.components.detail')}
      narrow>
      <Stack.Screen options={{ title: tx(locale, 'dev.components.titel') }} />

      <Card>
        <Muted>{tx(locale, 'dev.components.einleitung')}</Muted>
        <Text style={styles.regenerate} selectable>
          {tx(locale, 'dev.components.regenerate')}
        </Text>
        <Muted>{tx(locale, 'dev.components.docs')}</Muted>
        <View style={styles.stats}>
          <Stat label={tx(locale, 'dev.components.gesamt')} value={COMPONENT_CATALOG.stats.components} />
          <Stat label={tx(locale, 'dev.components.exporte')} value={COMPONENT_CATALOG.stats.exports} />
          <Stat label={tx(locale, 'dev.components.fundstellen')} value={COMPONENT_CATALOG.stats.occurrences} />
          <Stat label={tx(locale, 'dev.components.dateien')} value={COMPONENT_CATALOG.stats.files} />
          <Stat label={tx(locale, 'dev.components.unbenutzt')} value={COMPONENT_CATALOG.stats.unused} tone={COMPONENT_CATALOG.stats.unused > 0 ? 'wait' : 'neutral'} />
          <Stat label={tx(locale, 'dev.components.nur_importiert')} value={COMPONENT_CATALOG.stats.onlyImported} tone={COMPONENT_CATALOG.stats.onlyImported > 0 ? 'wait' : 'neutral'} />
          <Stat label={tx(locale, 'dev.components.plattformdateien')} value={COMPONENT_CATALOG.stats.platformVariants} />
        </View>
      </Card>

      <SearchField value={query} onChangeText={setQuery} placeholder={tx(locale, 'dev.components.suche')} />

      <View style={styles.filterBlock}>
        <Text style={styles.filterLabel}>{tx(locale, 'dev.components.kategorie')}</Text>
        <View style={styles.filterGroup}>
          <FilterChip
            label={tx(locale, 'dev.components.alle')}
            active={category === 'all'}
            onPress={() => setCategory('all')}
          />
          {CATEGORIES.map((key) => (
            <FilterChip
              key={key}
              label={tx(locale, CATEGORY_KEY[key])}
              active={category === key}
              onPress={() => setCategory(key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.filterBlock}>
        <Text style={styles.filterLabel}>{tx(locale, 'dev.components.plattform')}</Text>
        <View style={styles.filterGroup}>
          <FilterChip label={tx(locale, 'dev.components.alle')} active={platform === 'all'} onPress={() => setPlatform('all')} />
          <FilterChip label={tx(locale, 'dev.components.native')} active={platform === 'native'} onPress={() => setPlatform('native')} />
          <FilterChip label={tx(locale, 'dev.components.web')} active={platform === 'web'} onPress={() => setPlatform('web')} />
          <FilterChip label={tx(locale, 'dev.components.nur_unbenutzt')} active={unusedOnly} onPress={() => setUnusedOnly((value) => !value)} />
        </View>
      </View>

      {groups.length === 0 ? (
        <Card>
          <Muted>{tx(locale, 'dev.components.leer')}</Muted>
        </Card>
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Section title={`${tx(locale, CATEGORY_KEY[group.key])} · ${group.entries.length}`} />
            {group.entries.map((entry) => (
              <ComponentCard
                key={entry.id}
                entry={entry}
                locale={locale}
                previewOpen={Boolean(previewed[entry.id])}
                occurrencesOpen={Boolean(expanded[entry.id])}
                onTogglePreview={() => togglePreview(entry.id)}
                onToggleOccurrences={() => toggleExpanded(entry.id)}
              />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

function ComponentCard({
  entry,
  locale,
  previewOpen,
  occurrencesOpen,
  onTogglePreview,
  onToggleOccurrences,
}: {
  entry: ComponentCatalogEntry;
  locale: Locale;
  previewOpen: boolean;
  occurrencesOpen: boolean;
  onTogglePreview: () => void;
  onToggleOccurrences: () => void;
}) {
  const previewable = entry.exports.filter((item) => Boolean(COMPONENT_PREVIEWS[item.name]));
  return (
    <Card>
      <View style={styles.entryHeader}>
        <View style={styles.entryTitleWrap}>
          <Strong>{entry.name}</Strong>
          <Text style={styles.file} selectable>
            {entry.file}
          </Text>
        </View>
        <Pill
          label={String(entry.usageCount)}
          tone={entry.unused ? 'stop' : entry.onlyImported ? 'wait' : 'blue'}
        />
      </View>

      <View style={styles.badgeRow}>
        {entry.platforms.map((item) => (
          <Pill
            key={item}
            label={item === 'native' ? tx(locale, 'dev.components.native') : tx(locale, 'dev.components.web')}
            tone={item === 'web' ? 'blue' : 'neutral'}
          />
        ))}
        {entry.hasPlatformVariants ? (
          <Pill label={tx(locale, 'dev.components.plattformdateien')} tone="wait" />
        ) : null}
        {entry.unused ? <Pill label={tx(locale, 'dev.components.unbenutzt')} tone="stop" /> : null}
        {entry.onlyImported ? <Pill label={tx(locale, 'dev.components.nur_importiert')} tone="wait" /> : null}
      </View>

      <View style={styles.badgeRow}>
        {entry.exports.map((item) => (
          <Pill
            key={item.name}
            label={`${item.name} · ${tx(locale, EXPORT_KIND_KEY[item.kind])}`}
            tone={item.kind === 'component' ? 'blue' : 'neutral'}
          />
        ))}
      </View>

      {entry.variants.length > 1 ? (
        <View style={styles.variantList}>
          {entry.variants.map((variant) => (
            <Text key={variant.file} style={styles.variant} selectable>
              {variant.platform}: {variant.file}
            </Text>
          ))}
        </View>
      ) : null}

      <Muted>
        {tx(locale, 'dev.components.verwendet_in', [entry.usedBy.length, entry.usageCount])}
        {entry.importCount > 0 ? ` · ${entry.importCount} ${tx(locale, 'dev.components.import')}` : ''}
      </Muted>

      <View style={styles.actions}>
        {previewable.length > 0 ? (
          <Action
            label={tx(locale, previewOpen ? 'dev.components.vorschau_aus' : 'dev.components.vorschau')}
            onPress={onTogglePreview}
          />
        ) : null}
        <Action
          label={tx(locale, occurrencesOpen ? 'dev.components.fundstellen_aus' : 'dev.components.fundstellen_an')}
          onPress={onToggleOccurrences}
        />
      </View>

      {previewOpen && previewable.length > 0 ? (
        <View style={styles.previewPanel}>
          {previewable.map((item) => {
            const Preview = COMPONENT_PREVIEWS[item.name];
            return (
              <View key={item.name} style={styles.previewBlock}>
                <Text style={styles.previewLabel}>{item.name}</Text>
                <Preview />
              </View>
            );
          })}
        </View>
      ) : null}

      {!previewOpen && previewable.length === 0 ? (
        <Muted>{tx(locale, 'dev.components.keine_vorschau')}</Muted>
      ) : null}

      {occurrencesOpen ? <OccurrenceList entry={entry} locale={locale} /> : null}
    </Card>
  );
}

function OccurrenceList({ entry, locale }: { entry: ComponentCatalogEntry; locale: Locale }) {
  const byFile = new Map<string, ComponentCatalogOccurrence[]>();
  for (const occurrence of entry.occurrences) {
    const list = byFile.get(occurrence.file) ?? [];
    list.push(occurrence);
    byFile.set(occurrence.file, list);
  }

  if (byFile.size === 0) {
    return <Muted>{tx(locale, 'dev.components.unbenutzt')}</Muted>;
  }

  return (
    <View style={styles.occurrences}>
      {[...byFile.entries()].map(([file, occurrences]) => (
        <View key={file} style={styles.occurrenceGroup}>
          <Text style={styles.occurrenceFile} selectable>
            {file}
          </Text>
          {occurrences.map((occurrence) => (
            <Text
              key={`${occurrence.line}-${occurrence.kind}-${occurrence.exportName}`}
              style={styles.occurrenceLine}
              selectable>
              {occurrence.line} · {tx(locale, USAGE_KIND_KEY[occurrence.kind])} · {occurrence.exportName}
              {occurrence.count > 1 ? ` ×${occurrence.count}` : ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'wait' }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone === 'wait' && { color: colors.warning }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = themedStyles((colors) => ({
  regenerate: {
    color: colors.inkSoft,
    fontSize: 12,
    fontFamily: mono,
    backgroundColor: colors.mist,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 2 },
  stat: { minWidth: 92, flexGrow: 1, gap: 1 },
  statValue: { color: colors.blue, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.inkSoft, fontSize: 11, lineHeight: 15 },
  filterBlock: { gap: 5 },
  filterLabel: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipPressed: { opacity: 0.72 },
  chipText: { color: colors.anthracite, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  group: { gap: 10 },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  entryTitleWrap: { flex: 1, gap: 2, minWidth: 0 },
  file: { color: colors.inkSoft, fontSize: 11, fontFamily: mono },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  variantList: { gap: 2 },
  variant: { color: colors.mute, fontSize: 11, fontFamily: mono },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center', paddingTop: 2 },
  action: { paddingVertical: 2 },
  actionPressed: { opacity: 0.6 },
  actionText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  previewPanel: {
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    backgroundColor: colors.mist,
    borderRadius: 14,
    padding: 12,
  },
  previewBlock: { gap: 8 },
  previewLabel: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  occurrences: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  occurrenceGroup: { gap: 2 },
  occurrenceFile: { color: colors.blue, fontSize: 11, fontWeight: '700', fontFamily: mono },
  occurrenceLine: { color: colors.inkSoft, fontSize: 11, fontFamily: mono, lineHeight: 16, paddingLeft: 8 },
}));
