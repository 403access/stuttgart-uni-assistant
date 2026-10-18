import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill, SearchField } from '@/src/components/ui';
import { curriculumSortOrder, type CurriculumSortKey, type CurriculumStatusFilter } from '@/src/domain/curriculum';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

function sortLabel(sort: CurriculumSortKey, locale: Locale): string {
  return sort === 'name' ? tx(locale, 'curriculumToolbar.name') : sort === 'designation' ? tx(locale, 'common.kennung') : 'ID';
}

function statusLabel(status: CurriculumStatusFilter, locale: Locale): string {
  if (status === 'all') return tx(locale, 'common.alle');
  if (status === 'open') return tx(locale, 'common.offen');
  if (status === 'progress') return tx(locale, 'curriculumToolbar.arbeit');
  return tx(locale, 'curriculumToolbar.abgeschlossen');
}

const statusOrder: CurriculumStatusFilter[] = ['all', 'open', 'progress', 'done'];

export interface CurriculumToolbarProps {
  locale: Locale;
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  types: string[];
  statusFilter: CurriculumStatusFilter;
  onStatusChange: (value: CurriculumStatusFilter) => void;
  sort: CurriculumSortKey;
  onSortChange: (value: CurriculumSortKey) => void;
  showRoot: boolean;
  onToggleRoot: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

/** Search, sort cycle, and a collapsible type/status filter panel for a curriculum tree. */
export function CurriculumToolbar({
  locale,
  query,
  onQueryChange,
  typeFilter,
  onTypeChange,
  types,
  statusFilter,
  onStatusChange,
  sort,
  onSortChange,
  showRoot,
  onToggleRoot,
  onExpandAll,
  onCollapseAll,
}: CurriculumToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <SearchField
          value={query}
          onChangeText={onQueryChange}
          placeholder={tx(locale, 'common.suchen')}
          compact
          style={styles.search}
        />
        <Pressable onPress={() => onSortChange(curriculumSortOrder[(curriculumSortOrder.indexOf(sort) + 1) % curriculumSortOrder.length])}>
          <Pill label={`${sortLabel(sort, locale)} ▾`} active />
        </Pressable>
        <Pressable onPress={() => setFiltersOpen((open) => !open)}>
          <Pill label={activeCount > 0 ? `${tx(locale, 'curriculumToolbar.filter')} · ${activeCount}` : `${tx(locale, 'curriculumToolbar.filter')} ▾`} active={filtersOpen || activeCount > 0} />
        </Pressable>
        <Pressable onPress={onExpandAll}>
          <Pill label={tx(locale, 'curriculumToolbar.alle')} />
        </Pressable>
        <Pressable onPress={onCollapseAll}>
          <Pill label={tx(locale, 'curriculumToolbar.alle_2')} />
        </Pressable>
        <Pressable onPress={onToggleRoot}>
          <Pill label={tx(locale, 'common.wurzel')} active={showRoot} />
        </Pressable>
      </View>
      {filtersOpen ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>{tx(locale, 'common.typ')}</Text>
          <View style={styles.pills}>
            <Pressable onPress={() => onTypeChange('all')}>
              <Pill label={tx(locale, 'common.alle')} active={typeFilter === 'all'} />
            </Pressable>
            {types.map((type) => (
              <Pressable key={type} onPress={() => onTypeChange(typeFilter === type ? 'all' : type)}>
                <Pill label={type} active={typeFilter === type} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterTitle}>{tx(locale, 'common.stand')}</Text>
          <View style={styles.pills}>
            {statusOrder.map((item) => (
              <Pressable key={item} onPress={() => onStatusChange(item)}>
                <Pill label={statusLabel(item, locale)} active={statusFilter === item} />
              </Pressable>
            ))}
          </View>
          {activeCount > 0 ? (
            <Pressable onPress={() => { onTypeChange('all'); onStatusChange('all'); }}>
              <Text style={styles.filterReset}>{tx(locale, 'common.zuruecksetzen')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flex: 1, minWidth: 160 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterPanel: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, gap: 8 },
  filterTitle: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  filterReset: { color: colors.blue, fontSize: 13, fontWeight: '700' },
});
