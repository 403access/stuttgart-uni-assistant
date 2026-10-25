import { useState, type ComponentType } from 'react';
import { View } from 'react-native';

import { themedStyles } from '@ua/ui/theme';

const Iframe = 'iframe' as unknown as ComponentType<{
  src: string;
  title: string;
  style: Record<string, string | number>;
  onError: () => void;
}>;

/**
 * Web map embed. `react-native-webview` has no web implementation in this
 * setup, and the map site sends no framing restrictions, so a plain iframe
 * does the job. Same props as `uni-map-view.tsx`.
 */
export function UniMapView({ url, onError }: { url: string; onError: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <View style={styles.wrap}>
      <Iframe
        src={url}
        title="Uni-Karte"
        style={{ width: '100%', height: 520, borderWidth: 0, borderRadius: 18 }}
        onError={() => {
          setFailed(true);
          onError();
        }}
      />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  wrap: { flex: 1, minHeight: 520, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
}));
