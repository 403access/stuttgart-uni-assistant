import { useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, InfoRow, Pill, Screen } from '@/src/components/ui';
import { modules } from '@ua/core/data';
import { suggestRecognitionTarget } from '@ua/core/domain/plan';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyle } from '@ua/ui/theme';
import { pick, tx, uid } from '@ua/core/format';

export default function RecognitionScreen() {
  const locale = useAppSelector((state) => state.locale);
  const transfers = useAppSelector((state) => state.transfers);
  const { saveTransfer, removeTransfer } = appActions;
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
          tx(locale, 'anrechnung.learning'),
          tx(locale, 'anrechnung.transcript'),
          tx(locale, 'anrechnung.modulbeschreibung'),
        ]
      : [
          tx(locale, 'anrechnung.notenspiegel'),
          tx(locale, 'anrechnung.auszug'),
          tx(locale, 'anrechnung.nachweis'),
        ];

  return (
    <Screen
      narrow
      kicker={tx(locale, 'anrechnung.pruefungsausschuss')}
      subtitle={tx(locale, 'anrechnung.app')}>
      <Stack.Screen options={{ title: tx(locale, 'common.anrechnung') }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setOrigin('abroad')}>
          <Pill label={tx(locale, 'anrechnung.ausland')} active={origin === 'abroad'} />
        </Pressable>
        <Pressable onPress={() => setOrigin('previous')}>
          <Pill label={tx(locale, 'anrechnung.vorheriges')} active={origin === 'previous'} />
        </Pressable>
      </View>
      <Field label={tx(locale, 'anrechnung.hochschule')} value={institution} onChange={setInstitution} />
      <Field label={tx(locale, 'common.kurs')} value={courseTitle} onChange={setCourseTitle} />
      <Field label="ECTS" value={ects} onChange={setEcts} />
      <Field label={tx(locale, 'anrechnung.note')} value={grade} onChange={setGrade} />
      <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>{tx(locale, 'anrechnung.zielmodul')}</Text>
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
              ? tx(locale, 'anrechnung.modul')
              : tx(locale, 'anrechnung.ects', [target.ects])}
          </Text>
        </Card>
      ) : null}
      <Field label={tx(locale, 'common.notiz')} value={note} onChange={setNote} />
      <Card>
        {papers.map((item) => (
          <Text key={item} style={{ color: colors.anthracite }}>
            • {item}
          </Text>
        ))}
      </Card>
      <Button label={tx(locale, 'anrechnung.entwurf')} onPress={save} />
      {transfers.map((draft) => (
        <InfoRow
          key={draft.id}
          title={draft.courseTitle}
          meta={`${draft.ects} ECTS`}
          detail={`${draft.institution} → ${draft.targetModuleId}`}
          onPress={() => removeTransfer(draft.id)}
        />
      ))}
      {transfers.length ? <Text style={{ color: colors.mute }}>{tx(locale, 'anrechnung.tippen')}</Text> : null}
    </Screen>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.inkSoft, fontWeight: '700' }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={{ ...input }} placeholderTextColor={colors.mute} />
    </View>
  );
}

const input = themedStyle((colors) => ({
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: colors.anthracite,
  fontSize: 16,
  backgroundColor: colors.paper,
}));
