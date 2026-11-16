import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the user asked the OS for less motion — we then skip decorative animations. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);

  return reduce;
}
