import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { getContext as getToneContext } from 'tone';
import { getSceneRunning, getSceneInputWorkletNode, setLastCoordBuffer } from '../store/daw';
import { useEffects } from '../contexts/WoahscopeContext';
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

// Maximum dwell samples emitted at a 180° reversal when anchorAggressiveness = 1.
// Chosen so the 30K preset (0.7) rounds to dwell = 4, matching the prior constant.
const ANCHOR_DWELL_BASE = 6;

export function useSceneToAudio(): void {
	const { scene, camera } = useThree();
	const prevEndPos  = useRef({ x: 0, y: 0 });
	const workerRef   = useRef<Worker | null>(null);
	const workerBusy  = useRef(false);
	const {
		coordBufferSize,
		vizMode,
		galvoPps,
		galvoAnchorAggressiveness,
	} = useEffects();

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

			// Stash a copy for the ILDA-export action. The original buffer is about
			// to be detached by the worklet transfer; we want our cache live.
			if (data) {
				const cacheCopy = new Float32Array(data).slice();
				setLastCoordBuffer(cacheCopy, nPoints);
			}

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

		worker.postMessage({ type: 'setCoordBufferSize', size: coordBufferSize });
		workerRef.current = worker;
		return () => {
			console.log(..._OK, 'Path worker terminated (component unmounting)');
			worker.terminate();
			workerRef.current = null;
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps -- worker created once; coordBufferSize sync is handled by the effect below
	}, []);

	useEffect(() => {
		if (workerRef.current) {
			workerRef.current.postMessage({ type: 'setCoordBufferSize', size: coordBufferSize });
		}
	}, [coordBufferSize]);

	// Anchor-point dwell ceiling drives how aggressively the path builder duplicates
	// samples at sharp corners. Scaled from a perceptual 0..1 slider into integer
	// dwell counts; rounded so the standard 30K preset reproduces the prior default.
	useEffect(() => {
		if (!workerRef.current) return;
		const dwellMax = Math.max(0, Math.round(galvoAnchorAggressiveness * ANCHOR_DWELL_BASE));
		workerRef.current.postMessage({ type: 'setDwellMax', value: dwellMax });
	}, [galvoAnchorAggressiveness]);

	// In laser mode, PPS is the canonical user-facing setting: the worklet's
	// scan-frequency (frames per second) gets derived from PPS / pointsPerFrame.
	// Scope mode keeps the user's manual scan-frequency from DawCanvas untouched.
	useEffect(() => {
		if (vizMode !== 'laser') return;
		const node = getSceneInputWorkletNode();
		if (!node) return;
		const fps = Math.max(1, galvoPps / Math.max(1, coordBufferSize));
		node.port.postMessage({ type: 'scanFreq', value: fps });
	}, [vizMode, galvoPps, coordBufferSize]);

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
