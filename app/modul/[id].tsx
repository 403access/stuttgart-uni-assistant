import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, Card, InfoRow, Pill, Screen } from '@/src/components/ui';
import { documents, exams, modules, people, places, reviews as seedReviews, tutorials } from '@/src/data';
import { lockReason } from '@/src/domain/plan';
import { moduleStatus, sessionKind } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { formatGrade, pick, tx, uid, weekdays } from '@/src/text';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function ModuleScreen() {
  const app = useApp();
  const { locale, plannedIds, togglePlanned, reviews, addReview } = app;
  const module = modules.find((item) => item.id === one(useLocalSearchParams<{ id: string }>().id));
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('4');
  const [workload, setWorkload] = useState('8');
  if (!module) return <Screen back title={tx(locale, 'Modul fehlt', 'Module missing')}><Text /></Screen>;
  const current = module;
  const lecturer = people.find((item) => item.id === current.lecturerId);
  const area = current.area;
  const relatedReviews = [...reviews, ...seedReviews].filter((item) => item.moduleId === current.id);
  const relatedExams = exams.filter((item) => item.moduleId === current.id);
  const relatedDocs = documents.filter((item) => item.courseId === current.id);
  const groups = tutorials.filter((item) => item.moduleId === current.id);
  const locked = current.status === 'open' ? lockReason(current, modules) : null;

  function publish() {
    const note = comment.trim();
    const score = Number(rating);
    const hours = Number(workload);
    if (!note || Number.isNaN(score) || Number.isNaN(hours)) return;
    addReview({
      id: uid('rev'),
      moduleId: current.id,
      author: tx(locale, 'Du', 'You'),
      term: 'WiSe 2026/27',
      rating: Math.min(5, Math.max(1, score)),
      workload: Math.max(0, hours),
      difficulty: 3,
      comment: { de: note, en: note },
    });
    setComment('');
  }

  return (
    <Screen back kicker={module.code} title={pick(module.title, locale)} subtitle={`${module.ects} ECTS · ${area}`}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Pill label={moduleStatus(module.status, locale)} tone={module.status === 'passed' ? 'ok' : module.status === 'enrolled' ? 'blue' : 'wait'} />
        {typeof module.grade === 'number' ? <Pill label={formatGrade(module.grade, locale)} tone="ok" /> : null}
        {plannedIds.includes(module.id) ? <Pill label={tx(locale, 'Vorgemerkt', 'Planned')} tone="blue" /> : null}
      </View>
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 16, lineHeight: 23 }}>{pick(module.summary, locale)}</Text>
        {module.topics[locale].map((topic) => (
          <Text key={topic} style={{ color: colors.inkSoft }}>
            • {topic}
          </Text>
        ))}
      </Card>
      {locked ? (
        <Card>
          <Text style={{ color: colors.warning, fontWeight: '700' }}>
            {locked.startsWith('min:')
              ? tx(locale, `Wartet auf ${module.minEarned} bestandene ECTS.`, `Waits for ${module.minEarned} passed ECTS.`)
              : tx(locale, 'Eine Voraussetzung ist noch nicht bestanden.', 'A prerequisite is not passed yet.')}
          </Text>
        </Card>
      ) : null}
      {module.status === 'open' ? (
        <Button
          label={plannedIds.includes(module.id) ? tx(locale, 'Vormerkung lösen', 'Remove from plan') : tx(locale, 'Für später vormerken', 'Plan for later')}
          onPress={() => togglePlanned(module.id)}
          secondary={plannedIds.includes(module.id)}
        />
      ) : null}
      <Card>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>{tx(locale, 'Voraussetzungen', 'Prerequisites')}</Text>
        {module.prerequisites.length === 0 && !module.minEarned ? (
          <Text style={{ color: colors.inkSoft }}>{tx(locale, 'Keine harten Voraussetzungen im Demonstrationsplan.', 'No hard prerequisites in the demonstration plan.')}</Text>
        ) : (
          module.prerequisites.map((id) => {
            const required = modules.find((item) => item.id === id);
            if (!required) return null;
            return (
              <Text key={id} style={{ color: required.status === 'passed' ? colors.success : colors.warning }}>
                {pick(required.title, locale)} · {moduleStatus(required.status, locale)}
              </Text>
            );
          })
        )}
      </Card>
      {lecturer ? (
        <InfoRow
          title={`${pick(lecturer.title, locale)} ${lecturer.name}`}
          detail={pick(lecturer.hours, locale)}
          onPress={() => router.push({ pathname: '/dozent/[id]', params: { id: lecturer.id } })}
        />
      ) : null}
      {module.sessions.map((session) => {
        const room = places.find((place) => place.id === session.roomId);
        return (
          <InfoRow
            key={`${session.day}-${session.start}`}
            title={`${weekdays[locale][session.day]} ${session.start}–${session.end}`}
            meta={sessionKind(session.kind, locale)}
            detail={room?.name}
            onPress={room ? () => router.push({ pathname: '/raum/[id]', params: { id: room.id } }) : undefined}
          />
        );
      })}
      {groups.map((group) => (
        <InfoRow key={group.id} title={group.group} meta={group.enrolled ? tx(locale, 'belegt', 'enrolled') : `${group.taken}/${group.seats}`} detail={group.tutor} />
      ))}
      {relatedDocs.map((document) => (
        <InfoRow key={document.id} title={pick(document.title, locale)} meta={document.source === 'ilias' ? 'ILIAS' : tx(locale, 'Notiz', 'Note')} onPress={() => router.push({ pathname: '/dokument/[id]', params: { id: document.id } })} />
      ))}
      {relatedExams.map((exam) => (
        <InfoRow key={exam.id} title={exam.term} meta={tx(locale, 'Themen', 'Topics')} onPress={() => router.push({ pathname: '/pruefung/[id]', params: { id: exam.id } })} />
      ))}
      {relatedReviews.map((review) => (
        <Card key={review.id}>
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>
            {review.author} · {review.rating.toFixed(1)} · {review.workload} h
          </Text>
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{pick(review.comment, locale)}</Text>
        </Card>
      ))}
      <Card>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>{tx(locale, 'Eigene Einschätzung', 'Your note')}</Text>
        <TextInput value={rating} onChangeText={setRating} keyboardType="decimal-pad" style={input} placeholder="1–5" placeholderTextColor={colors.mute} />
        <TextInput value={workload} onChangeText={setWorkload} keyboardType="decimal-pad" style={input} placeholder={tx(locale, 'Stunden pro Woche', 'Hours per week')} placeholderTextColor={colors.mute} />
        <TextInput value={comment} onChangeText={setComment} multiline style={[input, { minHeight: 80 }]} placeholder={tx(locale, 'Tipp für Kommilitonen', 'A tip for other students')} placeholderTextColor={colors.mute} />
        <Button label={tx(locale, 'Auf diesem Gerät speichern', 'Save on this device')} onPress={publish} />
      </Card>
    </Screen>
  );
}

const input = {
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: colors.anthracite,
  fontSize: 16,
};
