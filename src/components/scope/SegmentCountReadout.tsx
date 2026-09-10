import { useEffect, useRef } from 'react';
import Typography from '@mui/material/Typography';
import { getLastSegmentCount } from '../../scene/sceneComplexity';
import { useEffects } from '../../contexts/WoahscopeContext';

// ─── Scene complexity readout ───────────────────────────────────────────────
// How many line segments the currently authored scene decomposes into (see
// scene/sceneComplexity.ts) — the number that actually varies with shape
// complexity, unlike the coord buffer's point count (always fixed at
// coordBufferSize; see pathBuilder.ts's buildCoordBuffer). Meant to help
// judge whether a design is asking too much detail of a fixed point budget
// before it ever reaches the Scanner Model.
//
// Scene-Input-specific by nature (the source's own path worker is what
// counts segments), so unlike a generic per-sample stream measurement this
// only updates while Scene Input is actively running, and reads "—" the
// rest of the time — including when Master Output is driven by something
// else entirely, where segment count has no meaning at all.
//
// Writes straight to the span's textContent from the rAF loop instead of via
// React state, matching useCanvasReadout.ts's convention for anything that
// updates at frame rate.
//
// Toggleable via WoahscopeContext's device-neutral `showSegmentCount` (the
// "segs" button in VisualizationControls) — when off, the rAF loop doesn't
// even start rather than just hiding a rendered element.

export function SegmentCountReadout() {
	const { showSegmentCount } = useEffects();
	const spanRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!showSegmentCount) return;

		let rafId = 0;

		const tick = () => {
			const count = getLastSegmentCount();
			if (spanRef.current) {
				spanRef.current.textContent = count === null ? '— segs' : `${count} segs`;
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [showSegmentCount]);

	if (!showSegmentCount) return null;

	return (
		<Typography
			ref={spanRef}
			component='span'
			sx={{
				position: 'absolute', top: 8, right: 8, zIndex: 50, fontSize: 9,
				color: 'text.disabled', fontFamily: 'monospace', letterSpacing: 0.4,
				pointerEvents: 'none',
			}}
		>
			— segs
		</Typography>
	);
}
