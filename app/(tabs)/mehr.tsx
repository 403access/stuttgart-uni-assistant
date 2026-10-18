import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { activeStudy } from '@/src/auth/campus';
import { endUniversitySession } from '@/src/auth/oidc';
import { clearLogin } from '@/src/auth/vault';
import { Card, InfoRow, Screen, Section, listPosition } from '@/src/components/ui';
import { StudySelector } from '@/src/components/study-selector';
import { program, student } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';

type CampusHref = '/api' | '/campus' | '/plattformen' | '/dokumente' | '/kommilitonen' | '/mail' | '/altklausuren' | '/feed' | '/anrechnung' | '/fristen' | '/einstellungen' | '/kalender-export';
type CampusEntry = { title: string; detail: string; href?: CampusHref; onPress?: () => void; tone?: 'danger'; tags: string[] };
type CampusGroup = { title: string; entries: CampusEntry[] };

export default function MoreScreen() {
  const { locale, sessionAccount, sessionMode, sessionName, sessionEmail, campusStudies, activeStudyId, signOut, oidcSessionId } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;
  async function leave() {
    if (sessionMode === 'oidc') await endUniversitySession(oidcSessionId);
    await clearLogin();
    signOut();
  }
  const groups: CampusGroup[] = [
    {
      title: tx(locale, 'common.campus'),
      entries: [
        { title: tx(locale, 'common.karte'), detail: tx(locale, 'tabsMehr.uni'), href: '/campus', tags: ['map', 'karte', 'lageplan', 'gebäude', 'gebaeude', 'building', 'standort', 'location', 'campus'] },
        { title: tx(locale, 'common.plattformen'), detail: 'C@MPUS · ILIAS · SDG · SIAM', href: '/plattformen', tags: ['plattformen', 'platforms', 'plattform', 'campus', 'ilias', 'sdg', 'siam', 'portal'] },
        { title: tx(locale, 'tabsMehr.e'), detail: tx(locale, 'tabsMehr.unimail'), href: '/mail', tags: ['email', 'e-mail', 'mail', 'unimail', 'posteingang', 'inbox', 'nachrichten'] },
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
        { title: tx(locale, 'common.einstellungen'), detail: tx(locale, 'tabsMehr.sprache'), href: '/einstellungen', tags: ['einstellungen', 'settings', 'sprache', 'language', 'daten', 'data', 'hinweis', 'notice'] },
        ...(typeof __DEV__ !== 'undefined' && __DEV__
          ? [{ title: tx(locale, 'common.schnittstelle'), detail: tx(locale, 'tabsMehr.aufrufe'), href: '/api' as CampusHref, tags: ['schnittstelle', 'interface', 'api', 'aufrufe', 'calls', 'curriculum'] }]
          : []),
        {
          title: tx(locale, 'tabsMehr.sitzung'),
          detail: tx(locale, 'tabsMehr.abmelden'),
          onPress: leave,
          tone: 'danger' as const,
          tags: ['abmelden', 'sign out', 'logout', 'sitzung', 'session', 'beenden', 'end session', 'anmeldung', 'sign-in'],
        },
      ],
    },
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

  return (
    <Screen
      topInset
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
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 20, fontWeight: '700' }}>
          {sessionMode === 'oidc' || sessionMode === 'campus' ? sessionName || sessionAccount : sessionMode === 'local' ? sessionAccount : student.name}
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {sessionMode === 'local'
            ? tx(locale, 'tabsMehr.lokal')
            : sessionMode === 'campus'
              ? sessionAccount
              : `${sessionAccount ?? ''}${sessionEmail ? ` · ${sessionEmail}` : ` · ${student.matriculation}`}`}
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
      </Card>
      {visibleGroups.length === 0 ? (
        <Card>
          <Text style={{ color: colors.inkSoft, fontSize: 14, lineHeight: 20 }}>
            {tx(locale, 'tabsMehr.einstellungen_gefunden')}
          </Text>
        </Card>
      ) : (
        visibleGroups.map((group) => (
          <View key={group.title} style={{ gap: 8 }}>
            <Section title={group.title} />
            <View>
              {group.entries.map((entry, index) => (
                <InfoRow
                  key={entry.href ?? entry.title}
                  title={entry.title}
                  detail={entry.detail}
                  tone={entry.tone}
                  position={listPosition(index, group.entries.length)}
                  onPress={entry.href ? () => router.push(entry.href as CampusHref) : entry.onPress}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
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
  iconButtonOn: { backgroundColor: colors.blue, borderColor: colors.blue },
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
});
