import { useState } from 'react';
import { Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { authHeaders } from '@/src/auth/session';
import { Button } from '@/src/components/ui';
import { useAppSelector } from '@/src/state/AppState';
import { themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

import { iliasOfficeViewerUrl } from '../api';

export interface IliasOfficeViewProps {
  refId: number;
  title: string;
  /** Present for PPTX; DOCX documents do not report a slide count. */
  onSlides?: (count: number) => void;
}

/**
 * Reader for one ILIAS office file. The assistant server fetches the PPTX or
 * DOCX and returns a self-contained page with the renderer and the file bytes;
 * the WebView only runs that page. PDFs keep the native `react-native-pdf`
 * reader. The web build uses `office-view.web.tsx`.
 */
export function IliasOfficeView({ refId, title, onSlides }: IliasOfficeViewProps) {
  const locale = useAppSelector((state) => state.locale);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const onMessage = (event: WebViewMessageEvent) => {
    let message: { type?: unknown; count?: unknown };
    try {
      message = JSON.parse(event.nativeEvent.data) as { type?: unknown; count?: unknown };
    } catch {
      return;
    }
    if (message.type === 'slides' && typeof message.count === 'number') onSlides?.(message.count);
    else if (message.type === 'error') setFailed(true);
  };

  if (failed) {
    return (
      <View style={styles.state}>
        <Text style={styles.error}>{tx(locale, 'tabsIlias.datei_fehler')}</Text>
        <Button
          label={tx(locale, 'tabsIlias.erneut')}
          secondary
          onPress={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }}
        />
      </View>
    );
  }

  return (
    <WebView
      key={`${refId}:${attempt}`}
      source={{ uri: iliasOfficeViewerUrl(refId, locale), headers: { ...authHeaders() } }}
      style={styles.view}
      containerStyle={styles.view}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled={false}
      cacheEnabled={false}
      setSupportMultipleWindows={false}
      onMessage={onMessage}
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
      accessibilityLabel={title}
    />
  );
}

const styles = themedStyles((colors) => ({
  view: { flex: 1, backgroundColor: colors.mist },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20, textAlign: 'center' },
}));
