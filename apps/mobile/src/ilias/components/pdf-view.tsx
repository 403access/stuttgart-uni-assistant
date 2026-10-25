import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';

import { Button } from '@/src/components/ui';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

import { cacheIliasFile } from '../download';
import { iliasContentErrorMessage } from '@ua/feature-ilias';

export interface IliasPdfViewProps {
  refId: number;
  title: string;
  /** File extension from the repository row, e.g. `pdf`; names the cache file. */
  type?: string;
  onPageChange?: (page: number, pages: number) => void;
}

/**
 * Native PDF reader for one ILIAS file. The bytes are fetched through the
 * assistant server and written to the cache; `react-native-pdf` renders them
 * with PDFKit on iOS and PdfRenderer on Android. The web build uses
 * `pdf-view.web.tsx`.
 */
export function IliasPdfView({ refId, title, type = '', onPageChange }: IliasPdfViewProps) {
  const locale = useAppSelector((state) => state.locale);
  const [attempt, setAttempt] = useState(0);
  // The attempt is part of the key, so a retry shows the loading state without
  // synchronously resetting state inside the effect.
  const requestKey = `${refId}:${attempt}`;
  const [result, setResult] = useState<{ key: string; uri: string; error: string }>({
    key: '',
    uri: '',
    error: '',
  });

  useEffect(() => {
    let active = true;
    cacheIliasFile(refId, title, type)
      .then((file) => {
        if (!active) return;
        if (!/\.pdf$/i.test(file.name) && file.contentType !== 'application/pdf') {
          setResult({ key: requestKey, uri: '', error: tx(locale, 'tabsIlias.datei_kein_pdf') });
          return;
        }
        setResult({ key: requestKey, uri: file.uri, error: '' });
      })
      .catch((caught) => {
        if (active) setResult({ key: requestKey, uri: '', error: iliasContentErrorMessage(caught, locale) });
      });
    return () => {
      active = false;
    };
  }, [locale, refId, requestKey, title, type]);

  const ready = result.key === requestKey;

  if (ready && result.error) {
    return (
      <View style={styles.state}>
        <Text style={styles.error}>{result.error}</Text>
        <Button label={tx(locale, 'tabsIlias.erneut')} onPress={() => setAttempt((value) => value + 1)} secondary />
      </View>
    );
  }
  if (!ready || !result.uri) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.hint}>{tx(locale, 'tabsIlias.datei_laden')}</Text>
      </View>
    );
  }
  return (
    <Pdf
      source={{ uri: result.uri }}
      style={styles.pdf}
      fitPolicy={0}
      spacing={10}
      enableTextSelection
      enableDoubleTapZoom
      trustAllCerts={false}
      onLoadComplete={(pages) => onPageChange?.(1, pages)}
      onPageChanged={(page, pages) => onPageChange?.(page, pages)}
      onError={(caught) => setResult({ key: requestKey, uri: '', error: iliasContentErrorMessage(caught, locale) })}
    />
  );
}

const styles = themedStyles((colors) => ({
  pdf: { flex: 1, width: '100%', backgroundColor: colors.mist },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  hint: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, textAlign: 'center' },
}));
