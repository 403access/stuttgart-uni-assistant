import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { activeStudy } from '@/src/auth/campus';
import { Card, InfoRow, Screen, Section, listPosition } from '@/src/components/ui';
import { StudySelector } from '@/src/components/study-selector';
import { program, student } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';

type CampusHref = '/api' | '/campus' | '/plattformen' | '/dokumente' | '/kommilitonen' | '/mail' | '/altklausuren' | '/feed' | '/anrechnung' | '/fristen' | '/einstellungen' | '/kalender-export';
type CampusEntry = { title: string; detail: string; href: CampusHref };
type CampusGroup = { title: string; entries: CampusEntry[] };

export default function MoreScreen() {
  const { locale, sessionAccount, sessionMode, sessionName, sessionEmail, campusStudies, activeStudyId } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;
  const groups: CampusGroup[] = [
    {
      title: tx(locale, 'Campus', 'Campus'),
      entries: [
        { title: tx(locale, 'Karte', 'Map'), detail: tx(locale, 'Uni-Lageplan und Gebäudesuche', 'University map and building search'), href: '/campus' },
        { title: tx(locale, 'Plattformen', 'Platforms'), detail: 'C@MPUS · ILIAS · SDG · SIAM', href: '/plattformen' },
        { title: tx(locale, 'E-Mail', 'E-mail'), detail: tx(locale, 'UniMail-Anbindung und Posteingang', 'UniMail connection and inbox'), href: '/mail' },
      ],
    },
    {
      title: tx(locale, 'Studium', 'Studies'),
      entries: [
        { title: tx(locale, 'Kalender-Import', 'Calendar import'), detail: tx(locale, 'C@MPUS-Kalender in die App laden', 'Load the C@MPUS calendar into the app'), href: '/kalender-export' },
        { title: tx(locale, 'Dokumente', 'Documents'), detail: tx(locale, 'ILIAS, Notizen, Import', 'ILIAS, notes, import'), href: '/dokumente' },
        { title: tx(locale, 'Altklausuren', 'Past exams'), detail: tx(locale, 'Themen und Schwerpunkte, keine PDFs', 'Topics and focus, no PDFs'), href: '/altklausuren' },
        { title: tx(locale, 'Anrechnung', 'Recognition'), detail: tx(locale, 'Anerkennung vorbereiten', 'Prepare a recognition request'), href: '/anrechnung' },
        { title: tx(locale, 'Fristen', 'Deadlines'), detail: tx(locale, 'Anmeldung, Abgabe, Prüfung', 'Registration, submission, exams'), href: '/fristen' },
      ],
    },
    {
      title: tx(locale, 'Austausch', 'Exchange'),
      entries: [
        { title: tx(locale, 'Kommilitonen', 'Peers'), detail: tx(locale, 'Bewertungen und geteilte Notizen', 'Reviews and shared notes'), href: '/kommilitonen' },
        { title: tx(locale, 'Meldungen', 'Notices'), detail: tx(locale, 'Universität, Fakultät, stuvus', 'University, faculty, stuvus'), href: '/feed' },
      ],
    },
    {
      title: tx(locale, 'App', 'App'),
      entries: [
        { title: tx(locale, 'Einstellungen', 'Settings'), detail: tx(locale, 'Sprache, Daten, Hinweis', 'Language, data, notice'), href: '/einstellungen' },
        ...(typeof __DEV__ !== 'undefined' && __DEV__
          ? [{ title: tx(locale, 'Schnittstelle', 'Interface'), detail: tx(locale, 'Aufrufe senden, Curriculum laden', 'Send calls, load the curriculum'), href: '/api' as CampusHref }]
          : []),
      ],
    },
  ];
  const needle = query.trim().toLowerCase();
  const visibleGroups = needle
    ? groups
        .map((group) =>
          group.title.toLowerCase().includes(needle)
            ? group
            : { ...group, entries: group.entries.filter((entry) => `${entry.title} ${entry.detail}`.toLowerCase().includes(needle)) },
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
      kicker={tx(locale, 'Profil', 'Profile')}
      title={tx(locale, 'Campus', 'Campus')}
      action={
        <Pressable
          onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: searchOpen }}
          accessibilityLabel={tx(locale, 'Einstellungen durchsuchen', 'Search settings')}
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
            placeholder={tx(locale, 'Einstellungen durchsuchen …', 'Search settings …')}
            placeholderTextColor={colors.mute}
            style={styles.searchInput}
          />
          <Pressable onPress={closeSearch} hitSlop={8} accessibilityRole="button">
            <Text style={styles.cancel}>{tx(locale, 'Abbrechen', 'Cancel')}</Text>
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
            ? tx(locale, 'Lokal eingetragen', 'Entered on this device')
            : sessionMode === 'campus'
              ? sessionAccount
              : `${sessionAccount ?? ''}${sessionEmail ? ` · ${sessionEmail}` : ` · ${student.matriculation}`}`}
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {sessionMode === 'oidc'
            ? tx(
                locale,
                `Angemeldet über den Identity Provider. Stundenplan und Noten sind weiter der Demonstrationsstand von ${student.name}.`,
                `Signed in through the identity provider. The timetable and grades are still the demonstration record of ${student.name}.`,
              )
            : sessionMode === 'campus'
              ? tx(
                  locale,
                  'Angemeldet mit dem C@MPUS-Token. Der Name kommt aus der Curriculum-Struktur.',
                  'Signed in with the C@MPUS token. The name comes from the curriculum structure.',
                )
              : sessionMode === 'local'
              ? tx(
                  locale,
                  `Nutzerkennung nur lokal eingetragen. Das Passwort wurde nicht geprüft. C@MPUS öffnest du über Plattformen. Der Studienstand ist weiter ${student.name}.`,
                  `Account id stored only on this device. The password was not checked. Open C@MPUS from Platforms. The study record is still ${student.name}.`,
                )
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
            {tx(locale, 'Keine Einstellungen gefunden.', 'No settings found.')}
          </Text>
        </Card>
      ) : (
        visibleGroups.map((group) => (
          <View key={group.title} style={{ gap: 8 }}>
            <Section title={group.title} />
            <View>
              {group.entries.map((entry, index) => (
                <InfoRow
                  key={entry.href}
                  title={entry.title}
                  detail={entry.detail}
                  position={listPosition(index, group.entries.length)}
                  onPress={() => router.push(entry.href)}
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
