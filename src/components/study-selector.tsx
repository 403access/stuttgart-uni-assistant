import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { activeStudy, campusDetail, loadCampusCurriculum } from '@/src/auth/campus';
import { useCampusLog, type CampusLogEntry } from '@/src/auth/campus-log';
import { showFetchAlert } from '@/src/components/fetch-alert';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';

/**
 * Enrolled studies from `GET /v1/campus/studies`, shown at the very top after login.
 * One study is shown directly; several studies are selectable.
 * This is production data, not the demonstration record.
 */
export function StudySelector() {
  const { locale, sessionMode, campusStudies, activeStudyId, setActiveStudy, setCurriculum } = useApp();
  const [error, setError] = useState('');
  const log = useCampusLog();

  // Study switch: commit only when the portal answered, so header and
  // curriculum stay consistent. `variables` holds the pending study.
  const switchMutation = useMutation({
    mutationKey: ['campus-study-switch'],
    mutationFn: (vars: { studyId: number; elementId: number }) => loadCampusCurriculum(vars.elementId, vars.studyId),
    onSuccess: (loaded, vars) => {
      setActiveStudy(vars.studyId);
      setCurriculum(loaded.nodes, { studyId: loaded.studyId, replace: true });
    },
    onError: (caught, vars) => {
      const code = caught instanceof Error ? caught.message : 'campus_failed';
      const detail = campusDetail(caught);
      const staleServer = detail.includes('ohne Detail');
      setError(
        tx(
          locale,
          `Studium nicht gewechselt (${code}${detail ? `, ${detail}` : ''}).${staleServer ? " Der Assistenz-Server antwortet im alten Format — ihn stoppen und mit 'npm run assistant' neu starten, danach steht hier die Portal-Antwort." : ''}`,
          `Study not switched (${code}${detail ? `, ${detail}` : ''}).${staleServer ? " The assistant server answers in the old format — stop it and restart with 'npm run assistant', then the portal response shows up here." : ''}`,
        ),
      );
      showFetchAlert(locale, {
        title: tx(locale, 'Studium nicht gewechselt', 'Study not switched'),
        code,
        detail: detail || undefined,
        onRetry: () => switchMutation.mutate(vars),
      });
    },
  });

  if (sessionMode !== 'campus' || campusStudies.length === 0) return null;
  const current = activeStudy(campusStudies, activeStudyId);

  function select(studyId: number, elementId: number | null): void {
    if (studyId === activeStudyId || switchMutation.isPending) return;
    setError('');
    if (elementId == null) {
      setError(
        tx(
          locale,
          'Für diesen Studiengang fehlt die Verknüpfung aus der Chooser-Antwort. Lade die Studiengänge über die Schnittstelle neu.',
          'This study has no link from the chooser response. Reload the studies from the interface screen.',
        ),
      );
      return;
    }
    switchMutation.mutate({ studyId, elementId });
  }

  if (campusStudies.length === 1 && current) {
    return (
      <View style={styles.single}>
        <View style={[styles.dot, current.color ? { backgroundColor: current.color } : null]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{current.name}</Text>
          <Text style={styles.meta}>
            {[current.intendedDegree, current.versionIdentifier].filter(Boolean).join(' · ') || tx(locale, 'Eingeschrieben', 'Enrolled')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{tx(locale, 'Studiengang', 'Degree program')}</Text>
      <View style={styles.row}>
        {campusStudies.map((study) => {
          const isActive = study.studyId === activeStudyId;
          return (
            <Pressable
              key={study.studyId}
              onPress={() => select(study.studyId, study.elementId)}
              style={[styles.chip, isActive && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}>
              <Text style={[styles.chipText, isActive && styles.chipTextOn]}>
                {study.name}
                {switchMutation.isPending && switchMutation.variables?.studyId === study.studyId ? ' …' : ''}
              </Text>
              {study.intendedDegree ? <Text style={[styles.chipMeta, isActive && styles.chipTextOn]}>{study.intendedDegree}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {error ? <CampusLogView entries={log.slice(0, 4)} /> : null}
    </View>
  );
}

function CampusLogView({ entries }: { entries: CampusLogEntry[] }) {
  if (!entries.length) return null;
  return (
    <View style={styles.log}>
      {entries.map((entry) => (
        <Text key={entry.id} style={styles.logLine}>
          {entry.time} {entry.op}
          {entry.studyId ? ` s=${entry.studyId}` : ''}
          {entry.elementId ? ` e=${entry.elementId}` : ''} →{' '}
          {entry.ok ? `ok (${entry.httpStatus ?? '-'})` : `${entry.code ?? '?'}${entry.detail ? ` ${entry.detail}` : ''} (${entry.httpStatus ?? '-'})`} ·{' '}
          {entry.elapsedMs}ms
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 99, backgroundColor: colors.blue },
  name: { color: colors.anthracite, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  wrap: { gap: 8 },
  kicker: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.anthracite, fontSize: 14, fontWeight: '700' },
  chipTextOn: { color: '#FFFFFF' },
  chipMeta: { color: colors.inkSoft, fontSize: 12 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  log: { backgroundColor: colors.mist, borderRadius: 10, padding: 8, gap: 2 },
  logLine: { color: colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: 'Menlo' },
});
