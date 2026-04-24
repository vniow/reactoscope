import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { getContext as getToneContext } from 'tone';
import { getSceneRunning, getSceneInputWorkletNode } from '../store/daw';
import { collectSegments } from './pathBuilder';
import type { Segment } from './pathBuilder';

// ─── Console styling ──────────────────────────────────────────────────────────
const _INFO = [
	'%c SceneToAudio %c',
	'background:#4a148c;color:#e1bee7;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
] as const;
const _OK = [
	'%c SceneToAudio %c',
	'background:#1b5e20;color:#a5d6a7;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
] as const;
const _WARN = [
	'%c SceneToAudio %c',
	'background:#e65100;color:#fff;font-weight:bold;padding:2px 6px;border-radius:3px',
	'color:inherit',
] as const;

/**
 * R3F hook: each frame, traverses the current scene, packs the visible geometry
 * into a transferable buffer, and posts it to the path worker. The worker runs
 * orderSegments + buildCoordBuffer off the main thread and posts the resulting
 * coordinate buffer back. The main thread forwards it to the AudioWorklet via
 * workletNode.port.postMessage (transferable — zero-copy on both hops).
 *
 * The worklet cycles through the coordinate buffer at a configurable scan
 * frequency, generating audio in real-time with no ring buffer latency (~20-40ms
 * total, vs ~967ms with the previous pre-generated ring buffer model).
 *
 * Self-healing: if the worker is still processing the previous frame when a new
 * frame fires, the frame is skipped. The worklet continues cycling through the
 * previous frame's coords — no audio interruption, only geometry lags by one frame.
 *
 * Must be called from inside an R3F Canvas component tree.
 */

const FLOATS_PER_VERTEX  = 6;   // x, y, intensity, r, g, b
const VERTICES_PER_SEG   = 2;
const FLOATS_PER_SEGMENT = FLOATS_PER_VERTEX * VERTICES_PER_SEG;

function packSegments(segments: Segment[]): Float32Array {
	const raw = new Float32Array(segments.length * FLOATS_PER_SEGMENT);
	for (let s = 0; s < segments.length; s++) {
		const o   = s * FLOATS_PER_SEGMENT;
		const seg = segments[s];
		raw[o]      = seg.points[0][0]; raw[o + 1] = seg.points[0][1]; raw[o + 2] = seg.points[0][2];
		raw[o + 3]  = seg.colors[0][0]; raw[o + 4] = seg.colors[0][1]; raw[o + 5] = seg.colors[0][2];
		raw[o + 6]  = seg.points[1][0]; raw[o + 7] = seg.points[1][1]; raw[o + 8] = seg.points[1][2];
		raw[o + 9]  = seg.colors[1][0]; raw[o + 10]= seg.colors[1][1]; raw[o + 11]= seg.colors[1][2];
	}
	return raw;
}

export function useSceneToAudio(): void {
	const { scene, camera } = useThree();
	const prevEndPos  = useRef({ x: 0, y: 0 });
	const workerRef   = useRef<Worker | null>(null);
	const workerBusy  = useRef(false);

	useEffect(() => {
		// Read the actual sample rate from Tone's AudioContext for logging.
		let sampleRate = 44100;
		try {
			sampleRate = getToneContext().rawContext.sampleRate;
		} catch {
			// Tone context not yet available
		}

		const worker = new Worker(
			new URL('./pathWorker.ts', import.meta.url),
			{ type: 'module' },
		);
		console.log(..._INFO, `Path worker spawned — sampleRate: ${sampleRate} Hz, mode: coordinate-streaming`);

		worker.onmessage = (event: MessageEvent) => {
			const { type, data, nPoints, endPos, computeMs, nSeg } = event.data as {
				type:      string;
				data:      ArrayBuffer;
				nPoints:   number;
				endPos:    { x: number; y: number };
				computeMs: number;
				nSeg:      number;
			};

			if (type !== 'path') return;

			prevEndPos.current = endPos;
			workerBusy.current = false;

			// Forward coord buffer to worklet — transferable, zero-copy on this hop too.
			const node = getSceneInputWorkletNode();
			if (node && data) {
				node.port.postMessage({ type: 'path', data, nPoints }, [data]);
			}

			if (import.meta.env.DEV && computeMs > 8) {
				console.warn(..._WARN, `Slow worker frame — ${computeMs.toFixed(1)} ms, nSeg: ${nSeg}`);
			}
		};

		worker.onerror = (e) => {
			console.error(..._WARN, 'Worker error:', e.message);
		};

		workerRef.current = worker;
		return () => {
			console.log(..._OK, 'Path worker terminated (component unmounting)');
			worker.terminate();
			workerRef.current = null;
		};
	}, []);

	useFrame(() => {
		if (!workerRef.current) return;
		if (!getSceneRunning()) return;
		if (workerBusy.current) return;

		const segments = collectSegments(scene, camera);
		const raw      = packSegments(segments);

		workerBusy.current = true;

		workerRef.current.postMessage(
			{ type: 'geometry', segmentData: raw.buffer, prevEnd: prevEndPos.current },
			[raw.buffer],
		);
	});
}
