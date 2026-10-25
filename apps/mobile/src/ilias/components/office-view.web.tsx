import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/src/components/ui';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

import { fetchIliasOfficeViewer } from '../api';
import { iliasContentErrorMessage } from '../errors';
import type { IliasOfficeViewProps } from './office-view';

const Iframe = 'iframe' as unknown as ComponentType<{
  srcDoc?: string;
  title?: string;
  style: Record<string, string | number>;
}>;

/**
 * Web office reader. The assistant server returns a self-contained HTML page
 * (renderer plus file bytes), which the browser loads in an iframe. Same props
 * as `office-view.tsx`; the native slide count has no equivalent here.
 */
export function IliasOfficeView({ refId, title }: IliasOfficeViewProps) {
  const locale = useAppSelector((state) => state.locale);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${refId}:${attempt}`;
  const [result, setResult] = useState<{ key: string; html: string; error: string }>({
    key: '',
    html: '',
    error: '',
  });

  useEffect(() => {
    let active = true;
    fetchIliasOfficeViewer(refId, locale)
      .then((html) => {
        if (active) setResult({ key: requestKey, html, error: '' });
      })
      .catch((caught) => {
        if (active) setResult({ key: requestKey, html: '', error: iliasContentErrorMessage(caught, locale) });
      });
    return () => {
      active = false;
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
  if (!ready || !result.html) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.hint}>{tx(locale, 'tabsIlias.datei_laden')}</Text>
      </View>
    );
  }
  return <Iframe srcDoc={result.html} title={title} style={styles.frame} />;
}

const styles = themedStyles((colors) => ({
  frame: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: colors.mist },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  hint: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, textAlign: 'center' },
}));
