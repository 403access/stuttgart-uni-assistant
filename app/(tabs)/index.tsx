import { router } from 'expo-router';
import { Text } from 'react-native';

import { CalendarHero } from '@/src/components/calendar-hero';
import { Card, InfoRow, Meter, Screen, Section } from '@/src/components/ui';
import { deadlines, modules, news, places, program } from '@/src/data';
import { scheduleForDay, totals, weightedAverage } from '@/src/domain/plan';
import { newsSource, sessionKind } from '@/src/labels';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatDate, formatGrade, localDay, pick, tx, weekdays } from '@/src/text';

export default function TodayScreen() {
  const locale = useAppSelector((state) => state.locale);
  const now = new Date();
  const credit = totals(modules);
  const average = weightedAverage(modules);
  const sessions = scheduleForDay(modules, now.getDay(), places);
  const upcoming = deadlines.filter((item) => item.date >= localDay(now)).slice(0, 3);
  const latest = [...news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);

  return (
    <Screen topInset>
      <CalendarHero />
      <Card onPress={() => router.push('/anforderungen')}>
        <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>{tx(locale, 'tabsIndex.bestandene')}</Text>
        <Text style={{ color: colors.anthracite, fontSize: 28, fontWeight: '700' }}>
          {credit.earned}
          <Text style={{ fontSize: 16, color: colors.inkSoft }}> / {program.totalEcts} ECTS</Text>
        </Text>
        <Meter value={credit.earned} max={program.totalEcts} />
        <Text style={{ color: colors.inkSoft }}>
          {tx(locale, 'tabsIndex.ects', [credit.active, average === null ? '–' : formatGrade(average, locale)])}
        </Text>
      </Card>

      <Card onPress={() => router.push('/studium')}>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>
          {tx(locale, 'tabsIndex.studium')}
        </Text>
        <Text style={{ color: colors.inkSoft }}>
          {tx(locale, 'tabsIndex.module')}
        </Text>
      </Card>

      <Section title={weekdays[locale][now.getDay()] ?? ''} action={tx(locale, 'common.campus')} onAction={() => router.push('/campus')} />
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
          <Text style={{ color: colors.inkSoft }}>{tx(locale, 'tabsIndex.heute')}</Text>
        </Card>
      )}

      <Section title={tx(locale, 'common.fristen')} action={tx(locale, 'common.alle')} onAction={() => router.push('/fristen')} />
      {upcoming.map((item) => (
        <InfoRow
          key={item.id}
          title={pick(item.title, locale)}
          meta={formatDate(item.date, locale)}
          detail={pick(item.detail, locale)}
          onPress={() => router.push('/fristen')}
        />
      ))}

      <Section title={tx(locale, 'common.meldungen')} action={tx(locale, 'tabsIndex.feed')} onAction={() => router.push('/feed')} />
      {latest.map((item) => (
        <InfoRow
          key={item.id}
          title={pick(item.title, locale)}
          meta={newsSource(item.source, locale)}
          detail={pick(item.summary, locale)}
          onPress={() => router.push({ pathname: '/meldung/[id]', params: { id: item.id } })}
        />
      ))}
    </Screen>
  );
}
