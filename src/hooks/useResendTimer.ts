import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Generic countdown that survives background by using a timestamp deadline
export const useResendTimer = (isActive: boolean) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const untilRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const updateRemaining = () => {
      const now = Date.now();
      const until = untilRef.current ?? now;
      const remaining = Math.max(0, Math.ceil((until - now) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) untilRef.current = null;
    };

    updateRemaining();
    const intervalId = setInterval(updateRemaining, 500);

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') updateRemaining();
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [isActive]);

  const start = (ms: number) => {
    untilRef.current = Date.now() + ms;
    setRemainingSeconds(Math.ceil(ms / 1000));
  };

  return { remainingSeconds, start };
};


