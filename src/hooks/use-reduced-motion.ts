import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the platform's reduced-motion setting. Animated transitions should
 * fall back to a static state when it is on.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
      if (active) setReduced(value);
    });
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}
