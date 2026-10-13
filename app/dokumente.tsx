import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button, Card, InfoRow, Screen, Section } from '@/src/components/ui';
import { documents } from '@/src/data';
import { pickStudyFile } from '@/src/documents/io';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx, uid } from '@/src/text';

export default function DocumentsScreen() {
  const { locale, downloadedIds, imports, syncPlatform, addImport, toggleDownload } = useApp();
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
      folder: tx(locale, 'Import', 'Import'),
      source: 'device',
      createdAt: new Date().toISOString(),
      shared: false,
      uri: picked.uri,
      mimeType: picked.mimeType,
    });
    setMessage(
      picked.text
        ? tx(locale, 'Textdatei liegt im persönlichen Ordner.', 'The text file is in your folder.')
        : tx(locale, 'Datei ist vermerkt. Binäre PDFs haben in dieser Fassung noch keinen Textlayer.', 'The file is listed. Binary PDFs have no text layer in this build.'),
    );
    router.push({ pathname: '/dokument/[id]', params: { id } });
  }

  function saveNote() {
    const note = body.trim();
    if (!note) return;
    const id = uid('note');
    addImport({
      id,
      title: title.trim() || tx(locale, 'Eigene Notiz', 'Personal note'),
      text: note,
      folder: tx(locale, 'Notizen', 'Notes'),
      source: 'note',
      createdAt: new Date().toISOString(),
      shared: false,
    });
    setTitle('');
    setBody('');
    router.push({ pathname: '/dokument/[id]', params: { id } });
  }

  return (
    <Screen back kicker={tx(locale, 'Document Hub', 'Document hub')} title={tx(locale, 'Dokumente', 'Documents')}>
      <Button
        label={tx(locale, 'ILIAS auf dieses Gerät legen', 'Save ILIAS onto this device')}
        onPress={() => {
          syncPlatform('ilias');
          setMessage(tx(locale, 'ILIAS-Kurse sind als offline markiert.', 'ILIAS courses are marked offline.'));
        }}
      />
      <Button label={tx(locale, 'Datei vom Gerät importieren', 'Import a file from this device')} onPress={importFile} secondary />
      {message ? <Text style={{ color: colors.inkSoft }}>{message}</Text> : null}
      <Section title="ILIAS" />
      {documents
        .filter((item) => item.source === 'ilias')
        .map((item) => (
          <InfoRow
            key={item.id}
            title={pick(item.title, locale)}
            meta={downloadedIds.includes(item.id) ? tx(locale, 'offline', 'offline') : 'ILIAS'}
            detail={pick(item.folder, locale)}
            onPress={() => {
              if (!downloadedIds.includes(item.id)) toggleDownload(item.id);
              router.push({ pathname: '/dokument/[id]', params: { id: item.id } });
            }}
          />
        ))}
      <Section title={tx(locale, 'Geteilt und eigene', 'Shared and yours')} />
      {documents
        .filter((item) => item.source === 'peer')
        .map((item) => (
          <InfoRow key={item.id} title={pick(item.title, locale)} meta={item.author} detail={pick(item.folder, locale)} onPress={() => router.push({ pathname: '/dokument/[id]', params: { id: item.id } })} />
        ))}
      {imports.map((item) => (
        <InfoRow key={item.id} title={item.title} meta={item.shared ? tx(locale, 'geteilt', 'shared') : item.folder} onPress={() => router.push({ pathname: '/dokument/[id]', params: { id: item.id } })} />
      ))}
      <Card>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>{tx(locale, 'Notiz anlegen', 'Write a note')}</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={tx(locale, 'Titel', 'Title')} placeholderTextColor={colors.mute} style={input} />
        <TextInput value={body} onChangeText={setBody} multiline placeholder={tx(locale, 'Zusammenfassung, Karten, Lösungsweg', 'Summary, cards, solution path')} placeholderTextColor={colors.mute} style={[input, { minHeight: 100 }]} />
        <Button label={tx(locale, 'Notiz speichern', 'Save note')} onPress={saveNote} />
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
