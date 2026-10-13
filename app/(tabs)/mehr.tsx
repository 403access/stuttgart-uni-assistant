import { router } from 'expo-router';

import { Card, InfoRow, Screen } from '@/src/components/ui';
import { program, student } from '@/src/data';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';
import { Text } from 'react-native';

export default function MoreScreen() {
  const { locale, sessionAccount } = useApp();
  const entries: Array<{ title: string; detail: string; href: '/plattformen' | '/dokumente' | '/kommilitonen' | '/altklausuren' | '/feed' | '/anrechnung' | '/fristen' | '/einstellungen' }> = [
    { title: tx(locale, 'Plattformen', 'Platforms'), detail: 'C@MPUS · ILIAS · SDG · SIAM', href: '/plattformen' },
    { title: tx(locale, 'Dokumente', 'Documents'), detail: tx(locale, 'ILIAS, Notizen, Import', 'ILIAS, notes, import'), href: '/dokumente' },
    { title: tx(locale, 'Kommilitonen', 'Peers'), detail: tx(locale, 'Bewertungen und geteilte Notizen', 'Reviews and shared notes'), href: '/kommilitonen' },
    { title: tx(locale, 'Altklausuren', 'Past exams'), detail: tx(locale, 'Themen und Schwerpunkte, keine PDFs', 'Topics and focus, no PDFs'), href: '/altklausuren' },
    { title: tx(locale, 'Meldungen', 'Notices'), detail: tx(locale, 'Universität, Fakultät, stuvus', 'University, faculty, stuvus'), href: '/feed' },
    { title: tx(locale, 'Anrechnung', 'Recognition'), detail: tx(locale, 'Anerkennung vorbereiten', 'Prepare a recognition request'), href: '/anrechnung' },
    { title: tx(locale, 'Fristen', 'Deadlines'), detail: tx(locale, 'Anmeldung, Abgabe, Prüfung', 'Registration, submission, exams'), href: '/fristen' },
    { title: tx(locale, 'Einstellungen', 'Settings'), detail: tx(locale, 'Sprache, Daten, Hinweis', 'Language, data, notice'), href: '/einstellungen' },
  ];
  return (
    <Screen kicker={tx(locale, 'Profil', 'Profile')} title={tx(locale, 'Mehr', 'More')}>
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 20, fontWeight: '700' }}>{student.name}</Text>
        <Text style={{ color: colors.inkSoft }}>
          {sessionAccount} · {student.matriculation}
        </Text>
        <Text style={{ color: colors.inkSoft }}>{pick(student.faculty, locale)}</Text>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>
          {pick(program.degree, locale)} {pick(program.title, locale)}
        </Text>
      </Card>
      {entries.map((entry) => (
        <InfoRow key={entry.href} title={entry.title} detail={entry.detail} onPress={() => router.push(entry.href)} />
      ))}
    </Screen>
  );
}
