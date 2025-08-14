import { useEffect, useRef, useState } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState<T>(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setDebounced(value), Math.max(0, delayMs));
		return () => { if (timerRef.current) clearTimeout(timerRef.current); };
	}, [value, delayMs]);

	return debounced;
}


