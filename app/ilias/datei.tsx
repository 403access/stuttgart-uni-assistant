import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { showToast } from '@/src/components/toast';
import { Button, Muted, Screen } from '@/src/components/ui';
import { IliasPdfView } from '@/src/ilias/components/pdf-view';
import { IliasPptxView } from '@/src/ilias/components/pptx-view';
import { saveIliasFile } from '@/src/ilias/download';
import { iliasContentErrorMessage } from '@/src/ilias/errors';
import { previewKindFromParams, type IliasPreviewKind } from '@/src/ilias/files';
import { useAppSelector } from '@/src/state/AppState';
import { themedStyles } from '@/src/theme';
import { firstParam, tx } from '@/src/text';

const ILIAS_BASE = 'https://ilias3.uni-stuttgart.de';

/** One ILIAS file rendered in the app: PDFs natively, PPTX in a WebView. */
export default function IliasFileScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{
    refId?: string | string[];
    title?: string | string[];
    type?: string | string[];
    size?: string | string[];
    date?: string | string[];
    view?: string | string[];
  }>();
  const refId = Number(firstParam(params.refId));
  const title = firstParam(params.title) || tx(locale, 'tabsIlias.datei');
  const type = firstParam(params.type);
  const size = firstParam(params.size);
  const date = firstParam(params.date);
  const explicitView = firstParam(params.view);
  const kind: IliasPreviewKind | null =
    explicitView === 'pdf' || explicitView === 'pptx' ? explicitView : previewKindFromParams(type, title);
  const validRef = Number.isInteger(refId) && refId > 0;
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [slides, setSlides] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const share = async () => {
    if (!validRef || busy) return;
    setBusy(true);
    setActionError('');
    try {
      const result = await saveIliasFile(refId, title, type);
      if (result === 'unavailable') setActionError(tx(locale, 'tabsIlias.download_nicht_verfuegbar'));
      else showToast({ tone: 'success', title: tx(locale, 'tabsIlias.heruntergeladen'), message: title });
    } catch (caught) {
      setActionError(iliasContentErrorMessage(caught, locale));
    } finally {
      setBusy(false);
    }
  };

  const meta = [type ? type.toUpperCase() : kind ? kind.toUpperCase() : '', size, date].filter(Boolean).join(' · ');

  return (
    <Screen
      scroll={false}
      flush
      footer={
        <View style={styles.footer}>
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                secondary
                label={tx(locale, 'tabsIlias.im_browser')}
                onPress={() => {
                  if (validRef) {
                    void WebBrowser.openBrowserAsync(`${ILIAS_BASE}/go/file/${refId}`).catch(() => undefined);
                  }
                }}
              />
            </View>
            <View style={styles.action}>
              <Button
                label={
                  busy
                    ? tx(locale, 'tabsIlias.herunterladen')
                    : Platform.OS === 'web'
                      ? tx(locale, 'tabsIlias.datei_herunterladen')
                      : tx(locale, 'tabsIlias.datei_teilen')
                }
                onPress={() => void share()}
              />
            </View>
          </View>
        </View>
      }>
      <Stack.Screen options={{ title }} />
      <View style={styles.meta}>
        <Text style={styles.metaText} numberOfLines={1}>
          {meta}
        </Text>
        {kind === 'pptx' && slides > 0 ? (
          <Text style={styles.metaText}>{tx(locale, 'tabsIlias.folien', [String(slides)])}</Text>
        ) : pages > 0 ? (
          <Text style={styles.metaText}>{tx(locale, 'tabsIlias.pdf_seite', [String(page), String(pages)])}</Text>
        ) : null}
      </View>
      <View style={styles.viewer}>
        {validRef && kind === 'pptx' ? (
          <IliasPptxView refId={refId} title={title} onSlides={setSlides} />
        ) : validRef && kind === 'pdf' ? (
          <IliasPdfView
            refId={refId}
            title={title}
            type={type}
            onPageChange={(nextPage, total) => {
              setPage(nextPage);
              setPages(total);
            }}
          />
        ) : (
          <View style={styles.state}>
            <Muted>{tx(locale, 'tabsIlias.datei_nicht_unterstuetzt')}</Muted>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  metaText: { flexShrink: 1, color: colors.inkSoft, fontSize: 12 },
  viewer: { flex: 1, backgroundColor: colors.mist },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  footer: { paddingHorizontal: 20, gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
