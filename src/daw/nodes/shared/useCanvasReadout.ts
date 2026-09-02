import { useEffect, useRef, type RefObject } from 'react';

/**
 * Drives a requestAnimationFrame loop that clears a canvas and hands its 2D
 * context to `draw` every frame. `draw` is read from a ref so the loop never
 * restarts on re-render — only `width`/`height` changes tear it down and
 * restart it, matching ADR-0001's scope: the FFT/Waveform/Analyser rendering
 * shape, not the setInterval+React-state shape Meter/DCMeter use.
 */
export function useCanvasReadout(
	canvasRef: RefObject<HTMLCanvasElement | null>,
	width:     number,
	height:    number,
	draw:      (ctx: CanvasRenderingContext2D) => void,
): void {
	const drawRef = useRef(draw);
	// Synced after commit rather than during render — writing a ref in render is
	// unsafe under concurrent rendering, and the rAF loop below only ever reads
	// `drawRef.current` from a frame callback, which always runs post-commit.
	useEffect(() => { drawRef.current = draw; });

	useEffect(() => {
		const rafRef = { current: 0 };
		const tick = () => {
			const canvas = canvasRef.current;
			const ctx    = canvas?.getContext('2d');
			if (ctx) {
				ctx.clearRect(0, 0, width, height);
				drawRef.current(ctx);
			}
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [canvasRef, width, height]);
}
