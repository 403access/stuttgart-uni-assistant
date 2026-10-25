import { View } from 'react-native';

import { useAppSelector } from '@/src/state/AppState';
import { themedStyles } from '@ua/ui/theme';

/**
 * Backdrop used by the app screens, mirroring the marketing site's section
 * background: a mist-to-blue wash with two floating cyan glows and a sparse
 * dot grid. Purely decorative, so it never receives touches.
 *
 * The `clean` design (the default) skips the backdrop entirely; `playful` shows
 * it. Everything is painted through the `backgroundImage` style (also supported
 * by React Native Web). The dot layer is a radial gradient tiled with
 * `backgroundSize`/`backgroundRepeat`, which keeps it crisp at any density and
 * avoids shipping a bitmap tile.
 */
export function AmbientBackground() {
  const design = useAppSelector((state) => state.design);
  if (design === 'clean') return null;
  return (
    <View
      pointerEvents="none"
      style={styles.ground}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = themedStyles((colors) => ({
  ground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.mist,
    backgroundImage: [
      `radial-gradient(55% 35% at 92% 2%, ${colors.ambientGlow}, transparent 70%)`,
      `radial-gradient(45% 35% at 4% 46%, ${colors.ambientGlowSoft}, transparent 70%)`,
      `radial-gradient(circle, ${colors.ambientDot} 0%, ${colors.ambientDot} 4%, transparent 9%)`,
      `linear-gradient(180deg, ${colors.mist} 0%, ${colors.blueSoft} 55%, ${colors.mist} 100%)`,
    ].join(', '),
    backgroundSize: 'auto, auto, 26px 26px, auto',
    backgroundRepeat: 'no-repeat, no-repeat, repeat, no-repeat',
  },
}));
