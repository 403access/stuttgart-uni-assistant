import { MaterialIcons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import type { Href } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useActiveStudy } from '@/src/campus/use-active-study';
import { Mark } from '@/src/components/ui';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

type NavItem = {
  href: Href;
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  /** Paths that belong to this tab, including pushed detail screens. */
  matches: string[];
};

const SIDEBAR_WIDTH = 252;

/**
 * Desktop navigation rail. The web build renders this beside the router stack
 * so it stays put while detail pages are pushed, and the bottom tab bar is
 * hidden at the same breakpoint. On the phone this component is never mounted.
 */
export function WebSidebar() {
  const locale = useAppSelector((state) => state.locale);
  const theme = useAppSelector((state) => state.theme);
  const sessionName = useAppSelector((state) => state.sessionName);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);
  const sessionEmail = useAppSelector((state) => state.sessionEmail);
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const { study } = useActiveStudy();
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: '/' as Href,
      label: tx(locale, 'tabsLayout.dashboard'),
      icon: 'space-dashboard',
      matches: ['/', '/feed', '/meldung'],
    },
    {
      href: '/kalender' as Href,
      label: tx(locale, 'tabsLayout.kalender'),
      icon: 'calendar-today',
      matches: ['/kalender', '/kurs', '/modul', '/raum', '/dozent', '/pruefung', '/kurse', '/strukturen', '/studium', '/anforderungen', '/fristen'],
    },
    {
      href: '/ilias' as Href,
      label: tx(locale, 'tabsLayout.ilias'),
      icon: 'school',
      matches: ['/ilias'],
    },
    {
      href: '/quiz' as Href,
      label: tx(locale, 'quiz.title'),
      icon: 'quiz',
      matches: ['/quiz'],
    },
    {
      href: '/chat' as Href,
      label: 'Chat',
      icon: 'forum',
      matches: ['/chat'],
    },
    {
      href: '/mail' as Href,
      label: tx(locale, 'tabsLayout.nachrichten'),
      icon: 'mail',
      matches: ['/mail', '/mail-nachricht', '/mail-verfassen', '/mail-verbindung'],
    },
    {
      href: '/mehr' as Href,
      label: tx(locale, 'common.campus'),
      icon: 'apps',
      matches: [
        '/mehr',
        '/profil',
        '/konto',
        '/einstellungen',
        '/darstellung',
        '/sprache',
        '/sicherheit',
        '/vpn',
        '/drucker',
        '/dokumente',
        '/campus',
        '/campus-info',
        '/kommilitonen',
        '/anrechnung',
        '/altklausuren',
        '/kalender-export',
        '/geraet-verknuepfen',
        '/plattformen',
        '/api',
        '/dev',
      ],
    },
  ];

  const displayName = sessionName || sessionAccount || (sessionMode === 'local' ? tx(locale, 'tabsMehr.lokal') : 'University Assistant');
  const subtitle =
    sessionMode === 'campus'
      ? study?.name || tx(locale, 'tabsMehr.angemeldet')
      : sessionEmail || tx(locale, 'tabsMehr.profil');
  const initials = initialsOf(displayName);

  return (
    // The key remounts the rail after a palette change; themed style objects are
    // mutated in place, so a component that does not read the theme would keep
    // the previous colours until its next natural render.
    <View key={theme} style={styles.sidebar}>
      <SidebarLink href={'/' as Href} label="University Assistant" style={styles.brand}>
        <View style={styles.brandMark}>
          <Mark size={26} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName}>University Assistant</Text>
          <Text style={styles.brandTag}>Uni Stuttgart</Text>
        </View>
      </SidebarLink>

      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <SidebarLink
              key={item.label + item.href}
              href={item.href}
              label={item.label}
              active={active}
              style={[styles.navItem, active && styles.navItemActive]}>
              <MaterialIcons name={item.icon} size={20} color={active ? colors.blue : colors.inkSoft} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                {item.label}
              </Text>
              {active ? <View style={styles.activeDot} /> : null}
            </SidebarLink>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerActions}>
          <FooterButton icon="palette" label={tx(locale, 'einstellungen.design')} href={'/darstellung' as Href} />
          <FooterButton icon="settings" label={tx(locale, 'common.einstellungen')} href={'/einstellungen' as Href} />
        </View>
        <SidebarLink href={'/profil' as Href} label={displayName} style={styles.account}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.accountSub} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.mute} />
        </SidebarLink>
      </View>
    </View>
  );
}

/**
 * The router's `Link asChild` merges styles as plain objects, which drops a
 * Pressable style *function* (and with it every hover/pressed rule). Keep the
 * anchor's style as a plain full-width block and put the visual row inside it;
 * hover and press feedback then live in local state.
 */
function SidebarLink({
  href,
  label,
  active = false,
  style,
  children,
}: {
  href: Href;
  label: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={styles.link}>
        <View style={[style, hovered && !active && styles.rowHover, pressed && styles.pressed]}>{children}</View>
      </Pressable>
    </Link>
  );
}

/** Same pattern as the tab bar: a route matches its tab and everything below it. */
function isActive(pathname: string, item: NavItem): boolean {
  return item.matches.some((match) => pathname === match || (match !== '/' && pathname.startsWith(`${match}/`)));
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'UA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function FooterButton({ icon, label, href }: { icon: ComponentProps<typeof MaterialIcons>['name']; label: string; href: Href }) {
  return (
    <View style={styles.footerButton}>
      <SidebarLink href={href} label={label} style={styles.iconButton}>
        <MaterialIcons name={icon} size={19} color={colors.inkSoft} />
      </SidebarLink>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  sidebar: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    height: '100%',
    backgroundColor: colors.paper,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  link: { width: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 14 },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.anthracite, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  brandTag: { color: colors.mute, fontSize: 11, fontWeight: '600' },
  nav: { flex: 1 },
  navContent: { gap: 2, paddingTop: 2, paddingBottom: 8 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  navItemActive: { backgroundColor: colors.blueSoft },
  navLabel: { flex: 1, color: colors.inkSoft, fontSize: 14, fontWeight: '600' },
  navLabelActive: { color: colors.blue, fontWeight: '700' },
  activeDot: { width: 6, height: 6, borderRadius: 99, backgroundColor: colors.blue },
  rowHover: { backgroundColor: colors.mist },
  pressed: { opacity: 0.72 },
  footer: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  footerActions: { flexDirection: 'row', gap: 6 },
  footerButton: { flex: 1 },
  iconButton: {
    width: '100%',
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  account: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, cursor: Platform.OS === 'web' ? 'pointer' : undefined },
  avatar: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  accountName: { color: colors.anthracite, fontSize: 13, fontWeight: '700' },
  accountSub: { color: colors.mute, fontSize: 11, marginTop: 1 },
}));
