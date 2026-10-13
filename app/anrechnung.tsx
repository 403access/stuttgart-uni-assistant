import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, InfoRow, Pill, Screen } from '@/src/components/ui';
import { modules } from '@/src/data';
import { suggestRecognitionTarget } from '@/src/domain/plan';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx, uid } from '@/src/text';

export default function RecognitionScreen() {
  const { locale, transfers, saveTransfer, removeTransfer } = useApp();
  const [origin, setOrigin] = useState<'abroad' | 'previous'>('abroad');
  const [institution, setInstitution] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [ects, setEcts] = useState('');
  const [grade, setGrade] = useState('');
  const [targetId, setTargetId] = useState('hci');
  const [note, setNote] = useState('');
  const suggestion = useMemo(() => suggestRecognitionTarget(courseTitle, modules), [courseTitle]);
  const target = modules.find((item) => item.id === targetId) ?? suggestion;

  function save() {
    if (!institution.trim() || !courseTitle.trim() || !ects.trim() || !target) return;
    saveTransfer({
      id: uid('transfer'),
      origin,
      institution: institution.trim(),
      courseTitle: courseTitle.trim(),
      ects: ects.trim(),
      grade: grade.trim(),
      targetModuleId: target.id,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });
    setInstitution('');
    setCourseTitle('');
    setEcts('');
    setGrade('');
    setNote('');
  }

  const papers =
    origin === 'abroad'
      ? [
          tx(locale, 'Learning Agreement', 'Learning agreement'),
          tx(locale, 'Transcript der Gasthochschule', 'Host transcript'),
          tx(locale, 'Modulbeschreibung mit Lernzielen', 'Module description with learning outcomes'),
        ]
      : [
          tx(locale, 'Notenspiegel der vorherigen Hochschule', 'Transcript from the previous university'),
          tx(locale, 'Auszug aus dem Modulhandbuch', 'Excerpt from the module handbook'),
          tx(locale, 'Nachweis über bestandene Prüfung', 'Proof that the exam was passed'),
        ];

  return (
    <Screen
      back
      kicker={tx(locale, 'Prüfungsausschuss', 'Examinations board')}
      title={tx(locale, 'Anrechnung', 'Recognition')}
      subtitle={tx(locale, 'Die App reicht nichts ein. Sie sortiert den Entwurf und die Unterlagen. Der Antrag geht an den Prüfungsausschuss.', 'The app submits nothing. It organizes the draft and the papers. The request goes to the examinations board.')}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setOrigin('abroad')}>
          <Pill label={tx(locale, 'Ausland', 'Abroad')} active={origin === 'abroad'} />
        </Pressable>
        <Pressable onPress={() => setOrigin('previous')}>
          <Pill label={tx(locale, 'Vorheriges Studium', 'Previous degree')} active={origin === 'previous'} />
        </Pressable>
      </View>
      <Field label={tx(locale, 'Hochschule', 'Institution')} value={institution} onChange={setInstitution} />
      <Field label={tx(locale, 'Kurs', 'Course')} value={courseTitle} onChange={setCourseTitle} />
      <Field label="ECTS" value={ects} onChange={setEcts} />
      <Field label={tx(locale, 'Note, falls vorhanden', 'Grade, if you have one')} value={grade} onChange={setGrade} />
      <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>{tx(locale, 'Zielmodul', 'Target module')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {modules
          .filter((item) => item.area === 'elective' || item.area === 'sq' || item.id === suggestion?.id)
          .slice(0, 8)
          .map((item) => (
            <Pressable key={item.id} onPress={() => setTargetId(item.id)}>
              <Pill label={item.code} active={(target?.id ?? '') === item.id} />
            </Pressable>
          ))}
      </View>
      {target ? (
        <Card>
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>
            {target.code} · {pick(target.title, locale)}
          </Text>
          <Text style={{ color: target.status === 'passed' ? colors.danger : colors.inkSoft }}>
            {target.status === 'passed'
              ? tx(locale, 'Dieses Modul ist im Demonstrationsstand schon bestanden. Eine zweite Anrechnung wäre vermutlich ausgeschlossen.', 'This module is already passed in the demonstration record. A second recognition would likely be refused.')
              : tx(locale, `${target.ects} ECTS im Plan. Der Ausschuss vergleicht Lernziele, nicht nur den Titel.`, `${target.ects} ECTS in the plan. The board compares learning outcomes, not only the title.`)}
          </Text>
        </Card>
      ) : null}
      <Field label={tx(locale, 'Notiz', 'Note')} value={note} onChange={setNote} />
      <Card>
        {papers.map((item) => (
          <Text key={item} style={{ color: colors.anthracite }}>
            • {item}
          </Text>
        ))}
      </Card>
      <Button label={tx(locale, 'Entwurf auf dem Gerät sichern', 'Save the draft on this device')} onPress={save} />
      {transfers.map((draft) => (
        <InfoRow
          key={draft.id}
          title={draft.courseTitle}
          meta={`${draft.ects} ECTS`}
          detail={`${draft.institution} → ${draft.targetModuleId}`}
          onPress={() => removeTransfer(draft.id)}
        />
      ))}
      {transfers.length ? <Text style={{ color: colors.mute }}>{tx(locale, 'Tippen entfernt den Entwurf.', 'Tap a draft to remove it.')}</Text> : null}
    </Screen>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={input} placeholderTextColor={colors.mute} />
    </View>
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
  backgroundColor: colors.paper,
};
