import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Measures a container element and returns the largest square that fits inside it,
 * i.e. `Math.min(width, height)`. Updates live via ResizeObserver whenever the
 * container resizes.
 *
 * Usage:
 *   const { ref, size } = useSquareSize();
 *   <div ref={ref} style={{ width: '100%', height: '100%' }}>
 *     <ThingThatNeedsToBeSquare style={{ width: size, height: size }} />
 *   </div>
 */
export function useSquareSize() {
	const ref  = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState(0);

	// Synchronous initial measurement — fires before the first paint so there
	// is no layout flash with size=0.
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const { width, height } = el.getBoundingClientRect();
		setSize(Math.floor(Math.min(width, height)));
	}, []);

	// Ongoing observation — updates whenever the container is resized.
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			setSize(Math.floor(Math.min(width, height)));
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return { ref, size };
}
