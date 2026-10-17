import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { askGrok } from '@/src/assistant/remote';
import { asBullets, summarize } from '@/src/assistant/summarize';
import { Button, Card, Screen } from '@/src/components/ui';
import { documents } from '@/src/data';
import { exportText } from '@/src/documents/io';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function DocumentScreen() {
  const { locale, imports, downloadedIds, toggleShare, toggleDownload } = useApp();
  const id = one(useLocalSearchParams<{ id: string }>().id);
  const bundled = documents.find((item) => item.id === id);
  const imported = imports.find((item) => item.id === id);
  const [panel, setPanel] = useState('');
  const [seedPanel, setSeedPanel] = useState('');
  const title = bundled ? pick(bundled.title, locale) : (imported?.title ?? '');
  const pages = bundled ? bundled.pages[locale] : imported?.text ? [imported.text] : [];
  const plain = pages.join('\n\n');

  // Refine through a mutation: the local summary shows instantly and Grok's
  // rewrite replaces it. A rejection keeps the local seed on the panel.
  const refineMutation = useMutation({
    mutationKey: ['document-refine'],
    mutationFn: (vars: { instruction: string; seed: string }) => {
      setPanel(vars.seed);
      return askGrok({ locale, question: vars.instruction, facts: `Document: ${title}\n\n${plain}`, history: [] });
    },
    onMutate: (vars) => setSeedPanel(vars.seed),
    onSuccess: (remote) => {
      if (remote) setPanel(remote);
    },
    onError: () => setPanel(seedPanel),
  });
  const busy = refineMutation.isPending;

  function refine(instruction: string, seed: string): void {
    refineMutation.mutate({ instruction, seed });
  }

  if (!bundled && !imported) {
    return (
      <Screen kicker={tx(locale, 'Dokument fehlt', 'Document missing')} subtitle={tx(locale, 'Kein Eintrag mit dieser Kennung.', 'No entry with this id.')}>
        <Stack.Screen options={{ title: tx(locale, 'Dokument fehlt', 'Document missing') }} />
      </Screen>
    );
  }

  const alternate = bundled ? bundled.pages[locale === 'de' ? 'en' : 'de'].join('\n\n') : '';
  const offline = bundled ? downloadedIds.includes(bundled.id) : true;

  return (
    <Screen kicker={bundled ? (bundled.source === 'ilias' ? 'ILIAS' : tx(locale, 'Geteilt', 'Shared')) : tx(locale, 'Eigene Datei', 'Your file')} subtitle={bundled ? `${bundled.author} · ${bundled.updated}` : imported?.folder}>
      <Stack.Screen options={{ title }} />
      <Text style={{ color: colors.inkSoft }}>{offline ? tx(locale, 'Auf diesem Gerät lesbar.', 'Readable on this device.') : tx(locale, 'Noch nicht als offline markiert.', 'Not marked offline yet.')}</Text>
      {!plain ? (
        <Card>
          <Text style={{ color: colors.inkSoft, lineHeight: 21 }}>
            {tx(locale, 'Die Datei ist importiert, hat aber keinen auslesbaren Text. Zusammenfassungen brauchen einen Textlayer oder eine TXT/Markdown-Datei.', 'The file is imported but has no readable text. Summaries need a text layer or a TXT/Markdown file.')}
          </Text>
        </Card>
      ) : (
        pages.map((page, index) => (
          <Card key={`${title}-${index}`}>
            <Text style={{ color: colors.mute, fontSize: 12, fontWeight: '700' }}>
              {index + 1} / {pages.length}
            </Text>
            <Text style={{ color: colors.anthracite, fontSize: 16, lineHeight: 24 }}>{page}</Text>
          </Card>
        ))
      )}
      {plain ? (
        <View style={{ gap: 8 }}>
          <Button
            label={tx(locale, 'Kurz fassen', 'Summarize')}
            onPress={() => refine(tx(locale, 'Fasse das Dokument in Stichpunkten zusammen.', 'Summarize the document in bullet points.'), asBullets(summarize(plain)))}
          />
          <Button
            secondary
            label={tx(locale, 'In einfacher Sprache', 'In plain language')}
            onPress={() =>
              refine(
                tx(locale, 'Formuliere den Inhalt in einfacher Sprache, ohne Fakten zu erfinden.', 'Rewrite the content in plain language without inventing facts.'),
                asBullets(summarize(plain, 3)),
              )
            }
          />
          <Button
            secondary
            label={locale === 'de' ? 'English' : 'Deutsch'}
            onPress={() =>
              alternate
                ? setPanel(alternate)
                : refine(tx(locale, 'Übersetze den Text in die andere Sprache. Erfinde nichts.', 'Translate the text into the other language. Do not invent anything.'), plain)
            }
          />
          <Button secondary label={tx(locale, 'Im Chat fragen', 'Ask in chat')} onPress={() => router.navigate({ pathname: '/chat', params: { doc: id } })} />
          <Button
            secondary
            label={tx(locale, 'Exportieren', 'Export')}
            onPress={() => {
              if (plain) exportText(title, plain).catch(() => setPanel(tx(locale, 'Export ist hier nicht verfügbar.', 'Export is not available here.')));
            }}
          />
        </View>
      ) : null}
      {bundled?.source === 'ilias' ? (
        <Button secondary label={offline ? tx(locale, 'Offline-Markierung lösen', 'Remove offline mark') : tx(locale, 'Offline markieren', 'Mark offline')} onPress={() => toggleDownload(bundled.id)} />
      ) : null}
      {imported ? (
        <Button
          secondary
          label={imported.shared ? tx(locale, 'Nicht mehr teilen', 'Stop sharing') : tx(locale, 'Mit dem Kurs teilen', 'Share with the course')}
          onPress={() => toggleShare(imported.id)}
        />
      ) : null}
      {panel ? (
        <Card>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>{busy ? tx(locale, 'Grok formuliert …', 'Grok is writing …') : tx(locale, 'Auszug', 'Extract')}</Text>
          <Text style={{ color: colors.anthracite, lineHeight: 22 }}>{panel}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
