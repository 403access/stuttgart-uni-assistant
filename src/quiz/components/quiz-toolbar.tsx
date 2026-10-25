import { Pressable, Text, TextInput, View } from 'react-native';

import { ControlIcon, ToolButton } from '@/src/components/control-icon';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/**
 * Sticky quiz controls: the study drawer on the left, search, and the filter
 * drawer on the right. Mirrors the messages tab so both tabs feel alike.
 */
export function QuizToolbar({
  locale,
  query,
  onQueryChange,
  onOpenStudies,
  onOpenFilter,
  studyActive,
  filterActive,
  showMenus = true,
}: {
  locale: Locale;
  query: string;
  onQueryChange: (value: string) => void;
  onOpenStudies: () => void;
  onOpenFilter: () => void;
  studyActive: boolean;
  filterActive: boolean;
  /** False when studies and filters live in a permanent desktop side rail. */
  showMenus?: boolean;
}) {
  return (
    <View style={styles.stickyBar}>
      <View style={styles.controlsRow}>
        {showMenus ? (
          <ToolButton
            symbol="line.3.horizontal"
            material="menu"
            label={tx(locale, 'quiz.drawer_menu')}
            onPress={onOpenStudies}
            active={studyActive}
          />
        ) : null}
        <View style={styles.searchRow}>
          <ControlIcon symbol="magnifyingglass" material="search" color={colors.mute} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            style={styles.searchInput}
            placeholder={tx(locale, 'quiz.search_placeholder')}
            placeholderTextColor={colors.mute}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              hitSlop={8}
              onPress={() => onQueryChange('')}
              accessibilityLabel={tx(locale, 'common.zuruecksetzen')}
              accessibilityRole="button"
            >
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        {showMenus ? (
          <ToolButton
            symbol="line.3.horizontal.decrease"
            material="filter-alt"
            label={tx(locale, 'quiz.drawer_filter')}
            onPress={onOpenFilter}
            active={filterActive}
          />
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
