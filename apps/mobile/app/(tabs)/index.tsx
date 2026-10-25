import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { CalendarHero } from '@/src/components/calendar-hero';
import { Card, InfoRow, Meter, Screen, Section } from '@/src/components/ui';
import { deadlines, modules, places, program } from '@ua/core/data';
import { scheduleForDay, totals, weightedAverage } from '@ua/core/domain/plan';
import { useResponsive } from '@ua/ui';
import { newsSource, sessionKind } from '@ua/core/labels';
import { useNewsItems } from '@/src/news/use-news';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { formatDate, formatGrade, localDay, pick, tx, weekdays } from '@ua/core/format';

export default function TodayScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { items: newsItems } = useNewsItems();
  const { isDesktop } = useResponsive();
  const now = new Date();
  const credit = totals(modules);
  const average = weightedAverage(modules);
  const sessions = scheduleForDay(modules, now.getDay(), places);
  const upcoming = deadlines.filter((item) => item.date >= localDay(now)).slice(0, 3);
  const latest = newsItems.slice(0, 2);

  const overview = (
    <>
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
    </>
  );

  const today = (
    <>
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
    </>
  );

  return (
    <Screen topInset title={isDesktop ? tx(locale, 'tabsLayout.dashboard') : undefined}>
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.column}>{overview}</View>
          <View style={styles.column}>{today}</View>
        </View>
      ) : (
        <>
          {overview}
          {today}
        </>
      )}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  column: { flex: 1, minWidth: 0, gap: 14 },
}));
