import { useEffect } from 'react';

/**
 * Fires `onClose` on any mousedown that lands outside `ref`.
 * Only attaches the listener while `enabled` is true.
 */
export function useClickOutside(
	ref:     React.RefObject<Element | null>,
	onClose: () => void,
	enabled: boolean,
): void {
	useEffect(() => {
		if (!enabled) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				onClose();
			}
		};
		document.addEventListener('mousedown', handler, true);
		return () => document.removeEventListener('mousedown', handler, true);
	}, [ref, onClose, enabled]);
}
