import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * useClickOutside
 * Calls the handler when a click occurs outside the specified element.
 * @param ref - Ref to the element
 * @param handler - Callback to invoke on outside click
 */
export function useClickOutside<T extends HTMLElement>(
	ref: RefObject<T | null>,
	handler: (event: MouseEvent | TouchEvent) => void
) {
	useEffect(() => {
		const listener = (event: MouseEvent | TouchEvent) => {
			// Do nothing if clicking ref's element or its descendants
			if (!ref.current || ref.current.contains(event.target as Node)) {
				return;
			}
			handler(event);
		};

		document.addEventListener('mousedown', listener);
		document.addEventListener('touchstart', listener);

		return () => {
			document.removeEventListener('mousedown', listener);
			document.removeEventListener('touchstart', listener);
		};
	}, [ref, handler]);
}
