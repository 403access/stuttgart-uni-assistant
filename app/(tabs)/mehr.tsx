import { router } from 'expo-router';

import { activeStudy } from '@/src/auth/campus';
import { Card, InfoRow, Screen } from '@/src/components/ui';
import { StudySelector } from '@/src/components/study-selector';
import { program, student } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';
import { Text } from 'react-native';

export default function MoreScreen() {
  const { locale, sessionAccount, sessionMode, sessionName, sessionEmail, campusStudies, activeStudyId } = useApp();
  const study = sessionMode === 'campus' ? activeStudy(campusStudies, activeStudyId) : null;
  const entries: Array<{ title: string; detail: string; href: '/api' | '/campus' | '/plattformen' | '/dokumente' | '/kommilitonen' | '/altklausuren' | '/feed' | '/anrechnung' | '/fristen' | '/einstellungen' }> = [
    { title: tx(locale, 'Karte', 'Map'), detail: tx(locale, 'Uni-Lageplan und Gebäudesuche', 'University map and building search'), href: '/campus' },
    { title: tx(locale, 'Plattformen', 'Platforms'), detail: 'C@MPUS · ILIAS · SDG · SIAM', href: '/plattformen' },
    { title: tx(locale, 'Dokumente', 'Documents'), detail: tx(locale, 'ILIAS, Notizen, Import', 'ILIAS, notes, import'), href: '/dokumente' },
    { title: tx(locale, 'Kommilitonen', 'Peers'), detail: tx(locale, 'Bewertungen und geteilte Notizen', 'Reviews and shared notes'), href: '/kommilitonen' },
    { title: tx(locale, 'Altklausuren', 'Past exams'), detail: tx(locale, 'Themen und Schwerpunkte, keine PDFs', 'Topics and focus, no PDFs'), href: '/altklausuren' },
    { title: tx(locale, 'Meldungen', 'Notices'), detail: tx(locale, 'Universität, Fakultät, stuvus', 'University, faculty, stuvus'), href: '/feed' },
    { title: tx(locale, 'Anrechnung', 'Recognition'), detail: tx(locale, 'Anerkennung vorbereiten', 'Prepare a recognition request'), href: '/anrechnung' },
    { title: tx(locale, 'Fristen', 'Deadlines'), detail: tx(locale, 'Anmeldung, Abgabe, Prüfung', 'Registration, submission, exams'), href: '/fristen' },
    { title: tx(locale, 'Einstellungen', 'Settings'), detail: tx(locale, 'Sprache, Daten, Hinweis', 'Language, data, notice'), href: '/einstellungen' },
    { title: tx(locale, 'Schnittstelle', 'Interface'), detail: tx(locale, 'Aufrufe senden, Curriculum laden', 'Send calls, load the curriculum'), href: '/api' },
  ];
  return (
    <Screen kicker={tx(locale, 'Profil', 'Profile')} title={tx(locale, 'Campus', 'Campus')}>
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
      {entries.map((entry) => (
        <InfoRow key={entry.href} title={entry.title} detail={entry.detail} onPress={() => router.push(entry.href)} />
      ))}
    </Screen>
  );
}
