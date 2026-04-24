/* eslint-disable react-hooks/purity -- performance.now() in useRef init is called once at mount, not during render */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { DebugSnapshot } from './types';
import { EMPTY_SNAPSHOT } from './types';

function rgba(px: [number, number, number, number]): string {
	return `rgba(${px[0]}, ${px[1]}, ${px[2]}, ${px[3]})`;
}

function dot(px: [number, number, number, number]): string {
	const bright = px[0] > 0 || px[1] > 0 || px[2] > 0;
	return bright ? '🟢' : '🔴';
}

interface Props {
	debugRef: RefObject<DebugSnapshot>;
}

export function DebugPanel({ debugRef }: Props) {
	const [snap, setSnap] = useState<DebugSnapshot>(EMPTY_SNAPSHOT);
	const [fps, setFps] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
	const prevFrameRef = useRef<{ count: number; time: number }>({ count: 0, time: performance.now() });

	useEffect(() => {
		intervalRef.current = setInterval(() => {
			const now = performance.now();
			const current = debugRef.current;
			const delta = current.frameCount - prevFrameRef.current.count;
			const elapsed = (now - prevFrameRef.current.time) / 1000;
			setFps(elapsed > 0 ? Math.round(delta / elapsed) : 0);
			prevFrameRef.current = { count: current.frameCount, time: now };
			setSnap({ ...current });
		}, 200);
		return () => clearInterval(intervalRef.current);
	}, [debugRef]);

	const panelStyle: React.CSSProperties = {
		position: 'absolute',
		top: 8,
		left: 8,
		padding: '6px 10px',
		background: 'rgba(0,0,0,0.82)',
		color: '#b0ffb0',
		fontFamily: 'monospace',
		fontSize: 11,
		lineHeight: 1.6,
		borderRadius: 4,
		pointerEvents: 'none',
		zIndex: 100,
		whiteSpace: 'pre',
		userSelect: 'none',
	};

	const {
		frameCount, shaderPrograms, nPoints,
		lineRTPixelAfterFade, lineRTPixelAfterLine,
		blur1RTPixel, blur3RTPixel,
		canvasPixelAfterBlit,
		waveformLeft, waveformRight, audioContextState,
		isDragging, lastDragStartMs, lastDragStopMs, audioVersionAtDragStop,
		silenceStartMs, silenceEndMs,
	} = snap;

	const lSamples = waveformLeft.sample.map(v => v.toFixed(3)).join(', ');
	const rSamples = waveformRight.sample.map(v => v.toFixed(3)).join(', ');

	const dragDelta = lastDragStopMs > 0 && lastDragStartMs > 0
		? `Δ${(lastDragStopMs - lastDragStartMs).toFixed(1)}ms`
		: '—';
	const silenceGap = silenceStartMs > 0 && silenceEndMs >= silenceStartMs
		? `Δ${(silenceEndMs - silenceStartMs).toFixed(1)}ms`
		: silenceStartMs > 0 ? 'ongoing' : 'none';
	const silenceOffsetFromDrag = silenceStartMs > 0 && lastDragStartMs > 0
		? `${(silenceStartMs - lastDragStartMs).toFixed(1)}ms after dragStart / ${(silenceStartMs - lastDragStopMs).toFixed(1)}ms after dragStop`
		: '—';

	return (
		<div style={panelStyle}>
{`[DEBUG] frame ${frameCount}   fps: ${fps}   programs: ${shaderPrograms}   pts: ${nPoints}
─── passes ────────────────────────────────
  post-fade    lineRT[512,512]:  ${dot(lineRTPixelAfterFade)} ${rgba(lineRTPixelAfterFade)}
  post-line    lineRT[512,512]:  ${dot(lineRTPixelAfterLine)} ${rgba(lineRTPixelAfterLine)}
  tight glow   blur1RT[128,128]: ${dot(blur1RTPixel)} ${rgba(blur1RTPixel)}
  scatter glow blur3RT[16,16]:   ${dot(blur3RTPixel)} ${rgba(blur3RTPixel)}
  post-output  canvas[center]:   ${dot(canvasPixelAfterBlit)} ${rgba(canvasPixelAfterBlit)}
─── audio ─────────────────────────────────
  ctx: ${audioContextState}
  L  min:${waveformLeft.min.toFixed(4)}  max:${waveformLeft.max.toFixed(4)}   [${lSamples}]
  R  min:${waveformRight.min.toFixed(4)}  max:${waveformRight.max.toFixed(4)}   [${rSamples}]
─── drag timing ────────────────────────────
  dragging: ${isDragging ? '🟡 YES' : 'no'}
  dragStart: ${lastDragStartMs > 0 ? lastDragStartMs.toFixed(1) + 'ms' : '—'}   dragStop: ${lastDragStopMs > 0 ? lastDragStopMs.toFixed(1) + 'ms' : '—'}   (${dragDelta})
  audioVer@stop: ${audioVersionAtDragStop >= 0 ? audioVersionAtDragStop : '—'}
  silence gap: ${silenceGap}
  silence offset: ${silenceOffsetFromDrag}`}
		</div>
	);
}
