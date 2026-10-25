import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/src/components/ui';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

import { fetchIliasFile } from '../api';
import { iliasContentErrorMessage } from '@ua/feature-ilias';
import type { IliasPdfViewProps } from './pdf-view';

const Iframe = 'iframe' as unknown as ComponentType<{
  src: string;
  title: string;
  style: Record<string, string | number>;
}>;

/**
 * Web PDF reader. The browser has its own PDF viewer, so the bytes are fetched
 * with the session header and handed over as a blob URL in an iframe. Same
 * props as `pdf-view.tsx`; the native page counter has no equivalent here.
 */
export function IliasPdfView({ refId, title }: IliasPdfViewProps) {
  const locale = useAppSelector((state) => state.locale);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${refId}:${attempt}`;
  const [result, setResult] = useState<{ key: string; url: string; error: string }>({
    key: '',
    url: '',
    error: '',
  });

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    fetchIliasFile(refId)
      .then((file) => {
        if (!active) return;
        if (!file.contentType.includes('pdf') && !/\.pdf$/i.test(file.filename)) {
          setResult({ key: requestKey, url: '', error: tx(locale, 'tabsIlias.datei_kein_pdf') });
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([file.data], { type: 'application/pdf' }));
        setResult({ key: requestKey, url: objectUrl, error: '' });
      })
      .catch((caught) => {
        if (active) setResult({ key: requestKey, url: '', error: iliasContentErrorMessage(caught, locale) });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [locale, refId, requestKey]);

  const ready = result.key === requestKey;

  if (ready && result.error) {
    return (
      <View style={styles.state}>
        <Text style={styles.error}>{result.error}</Text>
        <Button label={tx(locale, 'tabsIlias.erneut')} onPress={() => setAttempt((value) => value + 1)} secondary />
      </View>
    );
  }
  if (!ready || !result.url) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.hint}>{tx(locale, 'tabsIlias.datei_laden')}</Text>
      </View>
    );
  }
  return <Iframe src={result.url} title={title} style={styles.frame} />;
}

const styles = themedStyles((colors) => ({
  frame: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: colors.mist },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  hint: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, textAlign: 'center' },
}));
