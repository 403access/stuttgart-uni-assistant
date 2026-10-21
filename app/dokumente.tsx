import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button, Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { documents } from '@/src/data';
import { pickStudyFile } from '@/src/documents/io';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyle } from '@/src/theme';
import { pick, tx, uid } from '@/src/text';

export default function DocumentsScreen() {
  const locale = useAppSelector((state) => state.locale);
  const downloadedIds = useAppSelector((state) => state.downloadedIds);
  const imports = useAppSelector((state) => state.imports);
  const { syncPlatform, addImport, toggleDownload } = appActions;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  async function importFile() {
    const picked = await pickStudyFile();
    if (!picked) return;
    const id = uid('file');
    addImport({
      id,
      title: picked.title,
      text: picked.text,
      folder: tx(locale, 'dokumente.import'),
      source: 'device',
      createdAt: new Date().toISOString(),
      shared: false,
      uri: picked.uri,
      mimeType: picked.mimeType,
    });
    setMessage(
      picked.text
        ? tx(locale, 'dokumente.textdatei')
        : tx(locale, 'dokumente.datei'),
    );
    router.push({ pathname: '/dokument/[id]', params: { id } });
  }

  function saveNote() {
    const note = body.trim();
    if (!note) return;
    const id = uid('note');
    addImport({
      id,
      title: title.trim() || tx(locale, 'dokumente.eigene'),
      text: note,
      folder: tx(locale, 'dokumente.notizen'),
      source: 'note',
      createdAt: new Date().toISOString(),
      shared: false,
    });
    setTitle('');
    setBody('');
    router.push({ pathname: '/dokument/[id]', params: { id } });
  }

  return (
    <Screen kicker={tx(locale, 'dokumente.document')}>
      <Stack.Screen options={{ title: tx(locale, 'common.dokumente') }} />
      <Button
        label={tx(locale, 'dokumente.ilias')}
        onPress={() => {
          syncPlatform('ilias');
          setMessage(tx(locale, 'dokumente.ilias_kurse'));
        }}
      />
      <Button label={tx(locale, 'dokumente.datei_vom')} onPress={importFile} secondary />
      {message ? <Text style={{ color: colors.inkSoft }}>{message}</Text> : null}
      <Section title="ILIAS" />
      {documents
        .filter((item) => item.source === 'ilias')
        .map((item) => (
          <InfoRow
            key={item.id}
            title={pick(item.title, locale)}
            meta={downloadedIds.includes(item.id) ? tx(locale, 'dokumente.offline') : 'ILIAS'}
            detail={pick(item.folder, locale)}
            onPress={() => {
              if (!downloadedIds.includes(item.id)) toggleDownload(item.id);
              router.push({ pathname: '/dokument/[id]', params: { id: item.id } });
            }}
          />
        ))}
      <Section title={tx(locale, 'dokumente.geteilt_eigene')} />
      {documents
        .filter((item) => item.source === 'peer')
        .map((item) => (
          <InfoRow key={item.id} title={pick(item.title, locale)} meta={item.author} detail={pick(item.folder, locale)} onPress={() => router.push({ pathname: '/dokument/[id]', params: { id: item.id } })} />
        ))}
      {imports.map((item) => (
        <InfoRow key={item.id} title={item.title} meta={item.shared ? tx(locale, 'dokumente.geteilt') : item.folder} onPress={() => router.push({ pathname: '/dokument/[id]', params: { id: item.id } })} />
      ))}
      <Card>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>{tx(locale, 'dokumente.notiz')}</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={tx(locale, 'common.titel')} placeholderTextColor={colors.mute} style={{ ...input }} />
        <TextInput value={body} onChangeText={setBody} multiline placeholder={tx(locale, 'dokumente.zusammenfassung')} placeholderTextColor={colors.mute} style={[{ ...input }, { minHeight: 100 }]} />
        <Button label={tx(locale, 'dokumente.notiz_speichern')} onPress={saveNote} />
      </Card>
    </Screen>
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
}));
