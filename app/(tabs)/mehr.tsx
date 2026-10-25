import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useLeaveSession } from '@/src/auth/use-leave-session';
import { useActiveStudy } from '@/src/campus/use-active-study';
import { PaneModeProvider } from '@/src/components/pane-mode';
import { ResponsiveGrid } from '@/src/components/responsive-grid';
import { Button, Card, InfoRow, Screen, Section, listPosition } from '@/src/components/ui';
import { SETTINGS_PANELS } from '@/src/settings/settings-panels';
import { StudySelector } from '@/src/components/study-selector';
import { program, student } from '@/src/data';
import { useResponsive } from '@/src/hooks/use-responsive';
import { PROFILE_FIELDS, publicProfileFieldCount } from '@/src/profile/privacy';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { pick, tx } from '@/src/text';

type CampusHref = '/api' | '/campus' | '/konto' | '/plattformen' | '/dokumente' | '/kommilitonen' | '/mail' | '/mail-verbindung' | '/altklausuren' | '/feed' | '/anrechnung' | '/fristen' | '/profil' | '/profil/daten' | '/profil/sichtbarkeit' | '/profil/auffindbarkeit' | '/einstellungen' | '/darstellung' | '/sprache' | '/sicherheit' | '/geraet-verknuepfen' | '/dev/onboarding' | '/dev/state' | '/dev/components' | '/dev/nfc' | '/kalender-export' | '/vpn' | '/drucker';
type CampusEntry = { title: string; detail: string; href?: CampusHref; onPress?: () => void; tone?: 'danger'; tags: string[] };
type CampusGroup = { title: string; entries: CampusEntry[] };

function entryKey(entry: CampusEntry): string {
  return entry.href ?? entry.title;
}

export default function MoreScreen() {
  const locale = useAppSelector((state) => state.locale);
  const theme = useAppSelector((state) => state.theme);
  const design = useAppSelector((state) => state.design);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const sessionName = useAppSelector((state) => state.sessionName);
  const sessionEmail = useAppSelector((state) => state.sessionEmail);
  const authToken = useAppSelector((state) => state.authToken);
  const privacy = useAppSelector((state) => state.profilePrivacy);
  const { study } = useActiveStudy();
  const leave = useLeaveSession();
  const { isDesktop } = useResponsive();
  const publicCount = publicProfileFieldCount(privacy);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  /** Desktop master–detail: the group whose rows are open beside the rail. */
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  /** Desktop master–detail: the entry whose actual screen is shown on the right. */
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const groups: CampusGroup[] = [
    {
      title: tx(locale, 'profil.kategorie'),
      entries: [
        {
          title: tx(locale, 'profil.uebersicht'),
          detail: tx(locale, 'profil.uebersicht_detail'),
          href: '/profil',
          tags: ['profil', 'profile', 'übersicht', 'overview', 'teilen', 'share', 'konto', 'account'],
        },
        {
          title: tx(locale, 'profil.daten'),
          detail: tx(locale, 'profil.daten_detail'),
          href: '/profil/daten',
          tags: ['profil', 'profile', 'daten', 'data', 'matrikelnummer', 'matriculation', 'name', 'email', 'studiengang', 'study', 'plattformen', 'platforms'],
        },
        {
          title: tx(locale, 'profil.sichtbarkeit_titel'),
          detail: tx(locale, 'profil.sichtbarkeit_detail', [publicCount, PROFILE_FIELDS.length]),
          href: '/profil/sichtbarkeit',
          tags: ['sichtbarkeit', 'visibility', 'teilen', 'share', 'öffentlich', 'privat', 'public', 'private', 'profil', 'profile'],
        },
        {
          title: tx(locale, 'profil.auffindbarkeit'),
          detail: privacy.searchable ? tx(locale, 'profil.auffindbar_an') : tx(locale, 'profil.auffindbar_aus'),
          href: '/profil/auffindbarkeit',
          tags: ['auffindbar', 'auffindbarkeit', 'discoverable', 'search', 'suche', 'kommilitonen', 'peers', 'profil', 'profile'],
        },
      ],
    },
    {
      title: tx(locale, 'common.campus'),
      entries: [
        { title: tx(locale, 'common.karte'), detail: tx(locale, 'tabsMehr.uni'), href: '/campus', tags: ['map', 'karte', 'lageplan', 'gebäude', 'gebaeude', 'building', 'standort', 'location', 'campus'] },
        { title: tx(locale, 'common.konto'), detail: 'C@MPUS · ILIAS · SDG · SIAM · UniMail', href: '/konto', tags: ['konto', 'account', 'plattformen', 'platforms', 'plattform', 'campus', 'ilias', 'sdg', 'siam', 'portal', 'anmeldung', 'sign-in', 'benutzer', 'user'] },
        { title: tx(locale, 'tabsMehr.e'), detail: tx(locale, 'tabsMehr.unimail'), href: '/mail-verbindung', tags: ['email', 'e-mail', 'mail', 'unimail', 'posteingang', 'inbox', 'nachrichten', 'verbindung', 'verbinden', 'connection', 'settings', 'einstellungen'] },
        { title: tx(locale, 'vpn.title'), detail: tx(locale, 'tabsMehr.vpn'), href: '/vpn', tags: ['vpn', 'netz', 'network', 'tik', 'cisco', 'anyconnect', 'openconnect', 'wlan', 'unterwegs', 'remote', 'zugang', 'access'] },
        { title: tx(locale, 'drucker.drucken'), detail: tx(locale, 'tabsMehr.drucker'), href: '/drucker', tags: ['drucken', 'printing', 'print', 'drucker', 'printer', 'papercut', 'kopieren', 'copy', 'scannen', 'scan', 'stuvus', 'guthaben', 'credit', 'mobility'] },
      ],
    },
    {
      title: tx(locale, 'tabsMehr.studium'),
      entries: [
        { title: tx(locale, 'common.kalender'), detail: tx(locale, 'tabsMehr.c'), href: '/kalender-export', tags: ['kalender', 'calendar', 'import', 'ics', 'csv', 'stundenplan', 'timetable', 'sync'] },
        { title: tx(locale, 'common.dokumente'), detail: tx(locale, 'tabsMehr.ilias'), href: '/dokumente', tags: ['dokumente', 'documents', 'dateien', 'files', 'ilias', 'notizen', 'notes', 'import'] },
        { title: tx(locale, 'common.altklausuren'), detail: tx(locale, 'tabsMehr.themen'), href: '/altklausuren', tags: ['altklausuren', 'past exams', 'klausuren', 'exams', 'prüfung', 'pruefung', 'themen', 'topics'] },
        { title: tx(locale, 'common.anrechnung'), detail: tx(locale, 'tabsMehr.anerkennung'), href: '/anrechnung', tags: ['anrechnung', 'anerkennung', 'recognition', 'credits', 'ects', 'leistungen'] },
        { title: tx(locale, 'common.fristen'), detail: tx(locale, 'tabsMehr.anmeldung'), href: '/fristen', tags: ['fristen', 'deadlines', 'deadline', 'anmeldung', 'abgabe', 'prüfung', 'pruefung', 'termine'] },
      ],
    },
    {
      title: tx(locale, 'common.austausch'),
      entries: [
        { title: tx(locale, 'common.kommilitonen'), detail: tx(locale, 'tabsMehr.bewertungen'), href: '/kommilitonen', tags: ['kommilitonen', 'peers', 'bewertungen', 'reviews', 'community', 'austausch', 'notizen', 'notes'] },
        { title: tx(locale, 'common.meldungen'), detail: tx(locale, 'tabsMehr.universitaet'), href: '/feed', tags: ['meldungen', 'notices', 'news', 'feed', 'universität', 'universitaet', 'fakultät', 'fakultaet', 'stuvus', 'nachrichten'] },
      ],
    },
    {
      title: tx(locale, 'common.app'),
      entries: [
        { title: tx(locale, 'einstellungen.design'), detail: `${theme === 'dark' ? tx(locale, 'einstellungen.dunkel') : tx(locale, 'einstellungen.hell')} · ${design === 'playful' ? tx(locale, 'einstellungen.playful') : tx(locale, 'einstellungen.clean')}`, href: '/darstellung', tags: ['design', 'darstellung', 'theme', 'appearance', 'dark', 'dunkel', 'hell', 'light', 'modus', 'mode', 'aussehen', 'clean', 'playful', 'stil', 'style', 'hintergrund', 'background'] },
        { title: tx(locale, 'sicherheit.titel'), detail: tx(locale, 'sicherheit.untertitel'), href: '/sicherheit', tags: ['sicherheit', 'security', 'biometrie', 'biometrics', 'face id', 'fingerabdruck', 'fingerprint', 'app lock', 'entsperren', 'unlock'] },
        { title: tx(locale, 'einstellungen.geraet_verknuepfen'), detail: tx(locale, authToken ? 'einstellungen.geraet_kurz' : 'einstellungen.geraet_offline'), href: '/geraet-verknuepfen', tags: ['gerät', 'geraet', 'device', 'web', 'browser', 'qr', 'qr-code', 'code', 'verknüpfen', 'verknuepfen', 'link', 'kamera', 'camera', 'scan', 'anmeldung', 'login', 'settings', 'einstellungen'] },
        { title: tx(locale, 'einstellungen.sprache'), detail: locale === 'de' ? 'Deutsch' : 'English', href: '/sprache', tags: ['sprache', 'language', 'sprache ändern', 'change language', 'deutsch', 'english', 'locale'] },
        { title: tx(locale, 'common.einstellungen'), detail: tx(locale, 'tabsMehr.daten'), href: '/einstellungen', tags: ['einstellungen', 'settings', 'daten', 'data', 'hinweis', 'notice'] },
        {
          title: tx(locale, 'tabsMehr.sitzung'),
          detail: tx(locale, 'tabsMehr.abmelden'),
          onPress: leave,
          tone: 'danger' as const,
          tags: ['abmelden', 'sign out', 'logout', 'sitzung', 'session', 'beenden', 'end session', 'anmeldung', 'sign-in'],
        },
      ],
    },
    ...(typeof __DEV__ !== 'undefined' && __DEV__
      ? [
          {
            title: tx(locale, 'tabsMehr.dev'),
            entries: [
              {
                title: tx(locale, 'dev.onboarding.titel'),
                detail: tx(locale, 'dev.onboarding.detail'),
                href: '/dev/onboarding' as CampusHref,
                tags: ['dev', 'onboarding', 'diagnose', 'debug', 'werte', 'values', 'biometrie', 'biometrics'],
              },
              {
                title: tx(locale, 'dev.state.titel'),
                detail: tx(locale, 'dev.state.detail'),
                href: '/dev/state' as CampusHref,
                tags: ['dev', 'zustand', 'state', 'storage', 'asyncstorage', 'sitzung', 'session', 'debug', 'diagnose'],
              },
              {
                title: tx(locale, 'dev.components.titel'),
                detail: tx(locale, 'dev.components.detail'),
                href: '/dev/components' as CampusHref,
                tags: ['dev', 'komponenten', 'components', 'catalog', 'katalog', 'vorschau', 'preview', 'ui', 'styles', 'stil', 'verwendung', 'usages', 'fundstellen'],
              },
              {
                title: tx(locale, 'dev.nfc.titel'),
                detail: tx(locale, 'dev.nfc.detail'),
                href: '/dev/nfc' as CampusHref,
                tags: ['dev', 'nfc', 'karte', 'card', 'ausweis', 'student id', 'studierendenausweis', 'chip', 'uid', 'ndef', 'scan', 'lesen', 'read'],
              },
              {
                title: tx(locale, 'common.schnittstelle'),
                detail: tx(locale, 'tabsMehr.aufrufe'),
                href: '/api' as CampusHref,
                tags: ['schnittstelle', 'interface', 'api', 'aufrufe', 'calls', 'curriculum', 'dev', 'debug'],
              },
            ],
          },
        ]
      : []),
  ];
  const needle = query.trim().toLowerCase();
  const visibleGroups = needle
    ? groups
        .map((group) =>
          group.title.toLowerCase().includes(needle)
            ? group
            : { ...group, entries: group.entries.filter((entry) => `${entry.title} ${entry.detail} ${entry.tags.join(' ')}`.toLowerCase().includes(needle)) },
        )
        .filter((group) => group.entries.length > 0)
    : groups;

  function closeSearch(): void {
    setQuery('');
    setSearchOpen(false);
  }

  // Jumping to a category leaves search mode; the old group may have no match.
  const currentGroup = visibleGroups.find((group) => group.title === activeGroup) ?? visibleGroups[0] ?? null;
  const searching = needle.length > 0;
  const activeEntries = searching
    ? visibleGroups.flatMap((group) => group.entries.map((entry) => ({ group: group.title, entry })))
    : currentGroup
      ? currentGroup.entries.map((entry) => ({ group: currentGroup.title, entry }))
      : [];
  const currentMatch =
    activeEntries.find(({ entry }) => entryKey(entry) === activeEntry) ?? activeEntries[0] ?? null;
  const currentEntry = currentMatch?.entry ?? null;
  const currentEntryGroup = currentMatch?.group ?? currentGroup?.title ?? '';
  const Pane = currentEntry?.href ? SETTINGS_PANELS[currentEntry.href] : undefined;

  function renderPaneEntries(entries: CampusEntry[]) {
    return entries.map((entry) => {
      const key = entryKey(entry);
      const active = currentEntry !== null && entryKey(currentEntry) === key;
      return (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          onPress={() => setActiveEntry(key)}
          style={(state: { pressed: boolean; hovered?: boolean }) => [
            styles.entryItem,
            active && styles.entryItemActive,
            state.hovered && !active && styles.railItemHover,
            state.pressed && styles.pressed,
          ]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.entryTitle, active && styles.entryTitleActive]} numberOfLines={1}>
              {entry.title}
            </Text>
            <Text style={styles.entryDetail} numberOfLines={2}>
              {entry.detail}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color={active ? colors.blue : colors.mute} />
        </Pressable>
      );
    });
  }

  function renderEntries(entries: CampusEntry[]) {
    return entries.map((entry, index) => (
      <InfoRow
        key={entry.href ?? entry.title}
        title={entry.title}
        detail={entry.detail}
        tone={entry.tone}
        position={listPosition(index, entries.length)}
        onPress={entry.href ? () => router.push(entry.href as CampusHref) : entry.onPress}
      />
    ));
  }

  function renderGroup(group: CampusGroup) {
    return (
      <View key={group.title} style={{ gap: 8 }}>
        <Section title={group.title} />
        <View>{renderEntries(group.entries)}</View>
      </View>
    );
  }

  return (
    <Screen
      topInset
      scroll={!isDesktop}
      kicker={tx(locale, 'tabsMehr.profil')}
      title={tx(locale, 'common.campus')}
      action={
        <Pressable
          onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: searchOpen }}
          accessibilityLabel={tx(locale, 'tabsMehr.einstellungen')}
          style={({ pressed }) => [styles.iconButton, searchOpen && styles.iconButtonOn, pressed && styles.pressed]}>
          {Platform.OS === 'ios' ? (
            <SymbolView name="magnifyingglass" size={18} tintColor={searchOpen ? '#FFFFFF' : colors.blue} />
          ) : (
            <MaterialIcons name="search" size={20} color={searchOpen ? '#FFFFFF' : colors.blue} />
          )}
        </Pressable>
      }>
      {searchOpen ? (
        <View style={styles.searchRow}>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={tx(locale, 'tabsMehr.einstellungen_durchsuchen')}
            placeholderTextColor={colors.mute}
            style={styles.searchInput}
          />
          <Pressable onPress={closeSearch} hitSlop={8} accessibilityRole="button">
            <Text style={styles.cancel}>{tx(locale, 'common.abbrechen')}</Text>
          </Pressable>
        </View>
      ) : null}
      {sessionMode === 'campus' ? <StudySelector /> : null}
      <Card onPress={() => router.push('/profil')}>
        <View style={styles.profileHead}>
          <Text style={{ color: colors.anthracite, fontSize: 20, fontWeight: '700', flex: 1 }}>
            {sessionMode === 'oidc' || sessionMode === 'campus' ? sessionName || sessionAccount : sessionMode === 'local' ? sessionAccount : student.name}
          </Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.blue} />
        </View>
        <Text style={{ color: colors.inkSoft }}>
          {sessionMode === 'local'
            ? tx(locale, 'tabsMehr.lokal')
            : sessionMode === 'campus'
              ? sessionAccount
              : `${sessionAccount ?? ''}${sessionEmail ? ` · ${sessionEmail}` : ''}`}
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {sessionMode === 'oidc'
            ? tx(locale, 'tabsMehr.angemeldet_ueber', [student.name])
            : sessionMode === 'campus'
              ? tx(locale, 'tabsMehr.angemeldet')
              : sessionMode === 'local'
              ? tx(locale, 'tabsMehr.nutzerkennung', [student.name])
              : pick(student.faculty, locale)}
        </Text>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>
          {study
            ? `${study.intendedDegree ? `${study.intendedDegree} ` : ''}${study.name}`
            : `${pick(program.degree, locale)} ${pick(program.title, locale)}`}
        </Text>
        <Text style={styles.profileOpen}>{tx(locale, 'profil.oeffnen')}</Text>
      </Card>
      {visibleGroups.length === 0 ? (
        <Card>
          <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>
            {tx(locale, 'tabsMehr.einstellungen_gefunden')}
          </Text>
        </Card>
      ) : isDesktop ? (
        <View style={styles.columns}>
          <ScrollView style={styles.rail} contentContainerStyle={styles.railContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.railHeading}>{tx(locale, 'common.bereiche')}</Text>
            {visibleGroups.map((group) => {
              const active = !searching && group.title === currentGroup?.title;
              return (
                <Pressable
                  key={group.title}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setActiveGroup(group.title);
                    setActiveEntry(null);
                    if (searchOpen) closeSearch();
                  }}
                  style={(state: { pressed: boolean; hovered?: boolean }) => [
                    styles.railItem,
                    active && styles.railItemActive,
                    state.hovered && !active && styles.railItemHover,
                    state.pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.railLabel, active && styles.railLabelActive]} numberOfLines={1}>
                    {group.title}
                  </Text>
                  <Text style={[styles.railCount, active && styles.railLabelActive]}>{group.entries.length}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={active ? colors.blue : colors.mute} />
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.entries} contentContainerStyle={styles.entriesContent} showsVerticalScrollIndicator={false}>
            {searching ? (
              visibleGroups.map((group) => (
                <View key={group.title} style={styles.entryGroupBlock}>
                  <Text style={styles.entryGroup}>{group.title}</Text>
                  {renderPaneEntries(group.entries)}
                </View>
              ))
            ) : currentGroup ? (
              <>
                <Text style={styles.entryGroup}>{currentGroup.title}</Text>
                {renderPaneEntries(currentGroup.entries)}
              </>
            ) : null}
          </ScrollView>

          <View style={styles.detailPane}>
            {currentEntry ? (
              <>
                <View style={styles.paneHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.paneKicker}>{currentEntryGroup}</Text>
                    <Text style={styles.paneTitle} numberOfLines={1}>
                      {currentEntry.title}
                    </Text>
                  </View>
                </View>
                {Pane ? (
                  <View style={styles.paneContent}>
                    <PaneModeProvider>
                      <Pane key={entryKey(currentEntry)} />
                    </PaneModeProvider>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={styles.paneFallback}>
                    <Card>
                      <Text style={styles.paneDetail}>{currentEntry.detail}</Text>
                    </Card>
                    {currentEntry.href ? (
                      <Button
                        label={tx(locale, 'common.oeffnen')}
                        onPress={() => router.push(currentEntry.href as CampusHref)}
                      />
                    ) : null}
                    {currentEntry.onPress ? (
                      <Button label={currentEntry.title} onPress={currentEntry.onPress} />
                    ) : null}
                  </ScrollView>
                )}
              </>
            ) : (
              <View style={styles.paneEmpty}>
                <Text style={styles.paneDetail}>{tx(locale, 'tabsMehr.einstellungen_gefunden')}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <ResponsiveGrid minColumnWidth={360}>{visibleGroups.map(renderGroup)}</ResponsiveGrid>
      )}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  pressed: { opacity: 0.72 },
  columns: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 16, minHeight: 0 },
  rail: {
    width: 240,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  railContent: { padding: 8, gap: 2 },
  railHeading: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
  },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12 },
  railItemActive: { backgroundColor: colors.blueSoft },
  railItemHover: { backgroundColor: colors.mist },
  railLabel: { flex: 1, color: colors.inkSoft, fontSize: 14, fontWeight: '600' },
  railLabelActive: { color: colors.blue, fontWeight: '700' },
  railCount: { color: colors.mute, fontSize: 12, fontWeight: '700' },
  entries: {
    width: 320,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  entriesContent: { padding: 8, gap: 2 },
  entryGroupBlock: { gap: 2, marginBottom: 8 },
  entryGroup: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  entryItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, minHeight: 54 },
  entryItemActive: { backgroundColor: colors.blueSoft },
  entryTitle: { color: colors.anthracite, fontSize: 14, fontWeight: '700' },
  entryTitleActive: { color: colors.blue },
  entryDetail: { color: colors.mute, fontSize: 11, lineHeight: 15, marginTop: 2 },
  detailPane: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  paneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  paneKicker: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  paneTitle: { color: colors.anthracite, fontSize: 18, fontWeight: '700', marginTop: 2 },
  paneContent: { flex: 1, minHeight: 0 },
  paneFallback: { padding: 20, gap: 14 },
  paneDetail: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  paneEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileOpen: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconButtonOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.anthracite,
  },
  cancel: { color: colors.blue, fontSize: 15, fontWeight: '700' },
}));
