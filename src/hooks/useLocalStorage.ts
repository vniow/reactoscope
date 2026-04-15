import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
	const [value, setValueState] = useState<T>(() => {
		try {
			const item = window.localStorage.getItem(key);
			return item !== null ? (JSON.parse(item) as T) : defaultValue;
		} catch {
			return defaultValue;
		}
	});

	const setValue = useCallback((newValue: T) => {
		try {
			window.localStorage.setItem(key, JSON.stringify(newValue));
		} catch {
			// localStorage may be unavailable — state still updates in memory
		}
		setValueState(newValue);
	}, [key]);

	return [value, setValue];
}
