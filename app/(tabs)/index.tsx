import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, InfoRow, Mark, Meter, Pill, Screen, Section } from '@/src/components/ui';
import { deadlines, modules, news, places, program, student } from '@/src/data';
import { scheduleForDay, totals, weightedAverage } from '@/src/domain/plan';
import { newsSource, sessionKind } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDate, formatGrade, pick, tx, weekdays } from '@/src/text';

function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function TodayScreen() {
  const { locale } = useApp();
  const now = new Date();
  const credit = totals(modules);
  const average = weightedAverage(modules);
  const sessions = scheduleForDay(modules, now.getDay(), places);
  const upcoming = deadlines.filter((item) => item.date >= todayIso(now)).slice(0, 3);
  const latest = [...news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);

  return (
    <Screen
      kicker="Stuttgart Uni"
      title={tx(locale, 'Guten Tag', 'Good day')}
      subtitle={`${student.name} · ${tx(locale, 'Demonstration', 'Demonstration')} · ${student.semester}. ${tx(locale, 'Semester', 'semester')}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Mark size={28} />
        <Pill label={`${program.degree.de.split(' ')[0]} ${pick(program.title, locale)}`} tone="blue" />
      </View>
      <Card onPress={() => router.push('/anforderungen')}>
        <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>{tx(locale, 'Bestandene Leistung', 'Credits passed')}</Text>
        <Text style={{ color: colors.anthracite, fontSize: 28, fontWeight: '700' }}>
          {credit.earned}
          <Text style={{ fontSize: 16, color: colors.inkSoft }}> / {program.totalEcts} ECTS</Text>
        </Text>
        <Meter value={credit.earned} max={program.totalEcts} />
        <Text style={{ color: colors.inkSoft }}>
          {tx(
            locale,
            `${credit.active} ECTS in diesem Semester · Schnitt ${average === null ? '–' : formatGrade(average, locale)}`,
            `${credit.active} ECTS this semester · average ${average === null ? '–' : formatGrade(average, locale)}`,
          )}
        </Text>
      </Card>

      <Section title={weekdays[locale][now.getDay()] ?? ''} action={tx(locale, 'Campus', 'Campus')} onAction={() => router.push('/campus')} />
      {sessions.length ? (
        sessions.map((row) => (
          <InfoRow
            key={`${row.module.id}-${row.session.start}`}
            title={pick(row.module.title, locale)}
            meta={`${row.session.start}–${row.session.end}`}
            detail={`${sessionKind(row.session.kind, locale)} · ${row.place?.name ?? ''}`}
            onPress={() => router.push({ pathname: '/modul/[id]', params: { id: row.module.id } })}
          />
        ))
      ) : (
        <Card>
          <Text style={{ color: colors.inkSoft }}>{tx(locale, 'Heute steht keine Lehrveranstaltung im Plan.', 'No class on today’s timetable.')}</Text>
        </Card>
      )}

      <Section title={tx(locale, 'Fristen', 'Deadlines')} action={tx(locale, 'Alle', 'All')} onAction={() => router.push('/fristen')} />
      {upcoming.map((item) => (
        <InfoRow
          key={item.id}
          title={pick(item.title, locale)}
          meta={formatDate(item.date, locale)}
          detail={pick(item.detail, locale)}
          onPress={() => router.push('/fristen')}
        />
      ))}

      <Section title={tx(locale, 'Meldungen', 'Notices')} action={tx(locale, 'Feed', 'Feed')} onAction={() => router.push('/feed')} />
      {latest.map((item) => (
        <InfoRow
          key={item.id}
          title={pick(item.title, locale)}
          meta={newsSource(item.source, locale)}
          detail={pick(item.summary, locale)}
          onPress={() => router.push({ pathname: '/meldung/[id]', params: { id: item.id } })}
        />
      ))}

      <Section title={tx(locale, 'Direkt', 'Go to')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          [tx(locale, 'Anforderungen', 'Requirements'), '/anforderungen'],
          [tx(locale, 'Reihenfolge', 'Sequence'), '/reihenfolge'],
          [tx(locale, 'Dokumente', 'Documents'), '/dokumente'],
          [tx(locale, 'Anrechnung', 'Recognition'), '/anrechnung'],
          [tx(locale, 'Kommilitonen', 'Peers'), '/kommilitonen'],
          [tx(locale, 'Altklausuren', 'Past exams'), '/altklausuren'],
        ].map(([label, href]) => (
          <Card key={href} onPress={() => router.push(href as '/anforderungen')}>
            <Text style={{ color: colors.blue, fontWeight: '700' }}>{label}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
