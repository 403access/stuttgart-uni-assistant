import { Pressable, Text, TextInput, View } from 'react-native';

import { useReducedMotion } from '@/src/hooks/use-reduced-motion';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

import type { DropdownOption } from '../types';
import { ControlIcon, ToolButton } from '@/src/components/control-icon';
import { DropdownPicker } from '@/src/components/dropdown-picker';
import { ToolbarReveal, ToolbarSkeleton } from './mail-skeletons';

/**
 * Sticky controls: mailbox drawer (left), compose, full-width search, sort
 * sheet, and the filter drawer on the right edge. The search keeps the
 * remaining width.
 */
export function MailToolbar({
  locale,
  revealPending,
  hasMessages,
  query,
  onQueryChange,
  sortValueText,
  sortOptions,
  onSortSelect,
  onOpenMailbox,
  onOpenFilter,
  onCompose,
  loadingLabel,
}: {
  locale: Locale;
  revealPending: boolean;
  hasMessages: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  sortValueText: string;
  sortOptions: DropdownOption[];
  onSortSelect: (key: string) => void;
  onOpenMailbox: () => void;
  onOpenFilter: () => void;
  onCompose: () => void;
  loadingLabel: string;
}) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.stickyBar}>
      <View style={styles.controlsRow}>
        <ToolButton symbol="line.3.horizontal" material="menu" label={tx(locale, 'tabsMail.postfach')} onPress={onOpenMailbox} />
        <ToolButton symbol="square.and.pencil" material="edit" label={tx(locale, 'tabsMail.verfassen')} onPress={onCompose} />
        {revealPending ? (
          <ToolbarSkeleton label={loadingLabel} animate={!reduced} />
        ) : hasMessages ? (
          <ToolbarReveal>
            <View style={styles.searchRow}>
              <ControlIcon symbol="magnifyingglass" material="search" color={colors.mute} />
              <TextInput
                value={query}
                onChangeText={onQueryChange}
                style={styles.searchInput}
                placeholder={tx(locale, 'tabsMail.suche')}
                placeholderTextColor={colors.mute}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query ? (
                <Pressable hitSlop={8} onPress={() => onQueryChange('')} accessibilityLabel={tx(locale, 'tabsMail.suche_leeren')}>
                  <Text style={styles.clear}>✕</Text>
                </Pressable>
              ) : null}
            </View>
            <DropdownPicker hint={tx(locale, 'tabsMail.sortieren')} valueText={sortValueText} options={sortOptions} onSelect={onSortSelect} />
            <ToolButton symbol="line.3.horizontal.decrease" material="filter-alt" label={tx(locale, 'tabsMail.filter')} onPress={onOpenFilter} />
          </ToolbarReveal>
        ) : null}
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  stickyBar: {
    backgroundColor: colors.paper,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchRow: {
    flex: 1,
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mist,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, color: colors.anthracite, paddingVertical: 9 },
  clear: { color: colors.mute, fontSize: 13, fontWeight: '700' },
}));
