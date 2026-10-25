import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { themedStyles } from '@ua/ui/theme';

/** Native map embed. The web build uses `uni-map-view.web.tsx` (iframe) instead. */
export function UniMapView({ url, onError }: { url: string; onError: () => void }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (failed) onError();
  }, [failed, onError]);
  if (failed) return null;
  return (
    <View style={styles.wrap}>
      <WebView
        source={{ uri: url }}
        style={styles.web}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  wrap: { flex: 1, minHeight: 520, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  web: { flex: 1 },
}));
