import { Pressable, Text, TextInput, View } from 'react-native';

import { ControlIcon, ToolButton } from '@ua/ui';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

/**
 * Sticky ILIAS controls: the category drawer on the left and search. Mirrors
 * the quiz and messages tabs so the three list tabs feel alike.
 */
export function IliasToolbar({
  locale,
  query,
  onQueryChange,
  onOpenMenu,
  showMenu = true,
}: {
  locale: Locale;
  query: string;
  onQueryChange: (value: string) => void;
  onOpenMenu: () => void;
  /** False when the categories live in a permanent desktop side rail. */
  showMenu?: boolean;
}) {
  return (
    <View style={styles.stickyBar}>
      <View style={styles.controlsRow}>
        {showMenu ? (
          <ToolButton
            symbol="line.3.horizontal"
            material="menu"
            label={tx(locale, 'tabsIlias.drawer_menu')}
            onPress={onOpenMenu}
          />
        ) : null}
        <View style={styles.searchRow}>
          <ControlIcon symbol="magnifyingglass" material="search" color={colors.mute} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            style={styles.searchInput}
            placeholder={tx(locale, 'tabsIlias.suche')}
            placeholderTextColor={colors.mute}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              hitSlop={8}
              onPress={() => onQueryChange('')}
              accessibilityLabel={tx(locale, 'tabsIlias.suche_leeren')}
              accessibilityRole="button"
            >
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>
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
