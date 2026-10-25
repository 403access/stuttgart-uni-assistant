import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { askGrok } from '@/src/assistant/remote';
import { asBullets, summarize } from '@/src/assistant/summarize';
import { Button, Card, Screen } from '@/src/components/ui';
import { documents } from '@/src/data';
import { exportText } from '@/src/documents/io';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { firstParam, pick, tx } from '@/src/text';

export default function DocumentScreen() {
  const locale = useAppSelector((state) => state.locale);
  const imports = useAppSelector((state) => state.imports);
  const downloadedIds = useAppSelector((state) => state.downloadedIds);
  const { toggleShare, toggleDownload } = appActions;
  const id = firstParam(useLocalSearchParams<{ id: string }>().id);
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
      <Screen narrow kicker={tx(locale, 'dokument.dokument')} subtitle={tx(locale, 'common.eintrag')}>
        <Stack.Screen options={{ title: tx(locale, 'dokument.dokument') }} />
      </Screen>
    );
  }

  const alternate = bundled ? bundled.pages[locale === 'de' ? 'en' : 'de'].join('\n\n') : '';
  const offline = bundled ? downloadedIds.includes(bundled.id) : true;

  return (
    <Screen narrow kicker={bundled ? (bundled.source === 'ilias' ? 'ILIAS' : tx(locale, 'dokument.geteilt')) : tx(locale, 'dokument.eigene')} subtitle={bundled ? `${bundled.author} · ${bundled.updated}` : imported?.folder}>
      <Stack.Screen options={{ title }} />
      <Text style={{ color: colors.inkSoft }}>{offline ? tx(locale, 'dokument.diesem') : tx(locale, 'dokument.offline')}</Text>
      {!plain ? (
        <Card>
          <Text style={{ color: colors.inkSoft, lineHeight: 21 }}>
            {tx(locale, 'dokument.datei')}
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
            label={tx(locale, 'dokument.kurz')}
            onPress={() => refine(tx(locale, 'dokument.fasse'), asBullets(summarize(plain)))}
          />
          <Button
            secondary
            label={tx(locale, 'dokument.einfacher')}
            onPress={() =>
              refine(
                tx(locale, 'dokument.formuliere'),
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
                : refine(tx(locale, 'dokument.uebersetze'), plain)
            }
          />
          <Button secondary label={tx(locale, 'dokument.chat')} onPress={() => router.navigate({ pathname: '/chat', params: { doc: id } })} />
          <Button
            secondary
            label={tx(locale, 'dokument.exportieren')}
            onPress={() => {
              if (plain) exportText(title, plain).catch(() => setPanel(tx(locale, 'dokument.export')));
            }}
          />
        </View>
      ) : null}
      {bundled?.source === 'ilias' ? (
        <Button secondary label={offline ? tx(locale, 'dokument.offline_markierung') : tx(locale, 'dokument.offline_markieren')} onPress={() => toggleDownload(bundled.id)} />
      ) : null}
      {imported ? (
        <Button
          secondary
          label={imported.shared ? tx(locale, 'dokument.mehr') : tx(locale, 'dokument.kurs')}
          onPress={() => toggleShare(imported.id)}
        />
      ) : null}
      {panel ? (
        <Card>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>{busy ? tx(locale, 'dokument.grok') : tx(locale, 'dokument.auszug')}</Text>
          <Text style={{ color: colors.anthracite, lineHeight: 22 }}>{panel}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}
