import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Generic countdown that survives background by using a timestamp deadline
export const useResendTimer = (isActive: boolean) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const untilRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

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
    let intervalId: ReturnType<typeof setInterval> | null = null;
    // Prefer RAF when available for smoother UI while active
    const loop = () => {
      updateRemaining();
      rafRef.current = requestAnimationFrame(loop);
    };
    try {
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      intervalId = setInterval(updateRemaining, 500);
    }

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') updateRemaining();
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (rafRef.current) { try { cancelAnimationFrame(rafRef.current); } catch {} rafRef.current = null; }
      appStateSub.remove();
    };
  }, [isActive]);

  const start = (ms: number) => {
    untilRef.current = Date.now() + ms;
    setRemainingSeconds(Math.ceil(ms / 1000));
  };

  return { remainingSeconds, start };
};


