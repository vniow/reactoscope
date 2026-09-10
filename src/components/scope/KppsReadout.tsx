import { useEffect, useRef } from 'react';
import Typography from '@mui/material/Typography';
import { readWaveformTap } from '../../audio/engine';
import type { TapCursor } from '../../audio/engine';
import { createTapThroughputMeter } from '../../audio/tapThroughput';

// ─── kpps readout ───────────────────────────────────────────────────────────
// The Master Output stream's actual point rate — one audio sample is one
// point (the ILDA/real-DAC convention), measured from the Waveform Tap
// rather than read off the AudioContext's nominal sample rate, so it
// genuinely dips on a real stutter (see tapThroughput.ts). Device-neutral:
// this describes the stream itself, not either Beam Emulator's physics, so
// it lives in the shared scope chrome (VisualizationCanvasR3F) rather than
// inside GalvoControl/GalvoSceneR3F, and runs its own plain rAF + TapCursor
// independent of whichever scene is currently mounted.
//
// Writes straight to the span's textContent from the rAF loop instead of via
// React state, matching useCanvasReadout.ts's convention for anything that
// updates at frame rate — a re-render per frame here would be pure waste for
// a single text node.

export function KppsReadout() {
	const spanRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const cursor: TapCursor = { last: 0, lastNSamples: -1 };
		const meter = createTapThroughputMeter();
		let rafId = 0;

		const tick = () => {
			const prevWriteIndex = cursor.last;
			const frame = readWaveformTap(cursor);
			if (frame !== null) {
				// Correct even across a 'gap': cursor.last has already advanced by
				// the true write-index delta, so this counts the dropped frames'
				// samples too, not just the latest frame's own length. Irrelevant
				// for 'first'/'sourceChanged' — the meter discards those reads
				// regardless of the sample count passed in.
				const framesAdvanced = Math.max(1, cursor.last - prevWriteIndex);
				meter.recordFrame(framesAdvanced * frame.x.length, frame.continuity, performance.now());
				if (spanRef.current) {
					spanRef.current.textContent = meter.kpps === null ? '— kpps' : `${meter.kpps.toFixed(1)} kpps`;
				}
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, []);

	return (
		<Typography
			ref={spanRef}
			component='span'
			sx={{
				position: 'absolute', top: 8, right: 8, fontSize: 9,
				color: 'text.disabled', fontFamily: 'monospace', letterSpacing: 0.4,
				pointerEvents: 'none',
			}}
		>
			— kpps
		</Typography>
	);
}
