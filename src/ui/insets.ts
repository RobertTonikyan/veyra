import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/**
 * Safe-area insets (status bar / notch on top, home bar at the bottom).
 * Native: from react-native-safe-area-context.
 * Web: read straight from the browser's env(safe-area-inset-*), which is what an
 * iPhone home-screen app reports; the library's web value can stay at 0 there.
 */
const ZERO: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function readWebInsets(): EdgeInsets {
  if (typeof document === 'undefined') return ZERO;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);' +
    'padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const px = (v: string) => parseFloat(v) || 0;
  const value = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
  probe.remove();
  return value;
}

export function useInsets(): EdgeInsets {
  const native = useSafeAreaInsets();
  const [web, setWeb] = useState<EdgeInsets>(() => (Platform.OS === 'web' ? readWebInsets() : ZERO));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setWeb(readWebInsets());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (Platform.OS !== 'web') return native;
  return {
    top: Math.max(web.top, native.top),
    right: Math.max(web.right, native.right),
    bottom: Math.max(web.bottom, native.bottom),
    left: Math.max(web.left, native.left),
  };
}
