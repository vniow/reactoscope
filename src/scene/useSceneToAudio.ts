import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { getSceneRunning, getSceneInputWorkletNode, getSampleRate } from '../audio/engine';
import { useEffects } from '../contexts/WoahscopeContext';
import { useDawStore, SCENE_INPUT_ID } from '../store/daw';
import { collectSegments } from './pathBuilder';
import type { Segment } from './pathBuilder';
import type { SceneInputNodeData } from '../store/dawTypes';

// PROTOTYPE (foldover investigation): a coordinate buffer with more points than
// the scan rate can render in one cycle forces the worklet to skip table
// entries with no anti-aliasing — the source of the Nyquist-foldover artifact.
// Capping the buffer to ~one point per audio sample lets buildCoordBuffer's own
// arc-length resampling do a proper resample instead of the worklet blindly
// decimating. Floor keeps very high scan frequencies from collapsing the
// shape to a handful of points.
const DEFAULT_SCAN_FREQ     = 60; // Hz — mirrors DawCanvas.tsx's default
const MIN_COORD_BUFFER_SIZE = 64;

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
	const { coordBufferSize } = useEffects();
	const scanFrequency = useDawStore((s) => {
		const node = s.nodes.find((n) => n.id === SCENE_INPUT_ID);
		return (node?.data as SceneInputNodeData | undefined)?.scanFrequency ?? DEFAULT_SCAN_FREQ;
	});

	useEffect(() => {
		// Memory-leak-harness instrumentation: counts how many times this effect
		// (and therefore the path worker + host Canvas) has mounted. A climbing
		// count over a long run means the Canvas is remounting — e.g. via
		// InputPanel's `size > 0` gate on useSquareSize — which would explain a
		// leak invisible to a single play/stop cycle.
		if (import.meta.env.DEV && typeof window !== 'undefined') {
			const w = window as unknown as { __reactoscope?: Record<string, unknown> };
			if (w.__reactoscope) {
				w.__reactoscope.workerMountCount = ((w.__reactoscope.workerMountCount as number) ?? 0) + 1;
			}
		}

		const worker = new Worker(
			new URL('./pathWorker.ts', import.meta.url),
			{ type: 'module' },
		);

		worker.onmessage = (event: MessageEvent) => {
			const { type, data, nPoints, endPos } = event.data as {
				type:    string;
				data:    ArrayBuffer;
				nPoints: number;
				endPos:  { x: number; y: number };
			};

			if (type !== 'path') return;

			prevEndPos.current = endPos;
			workerBusy.current = false;

			// Forward coord buffer to worklet — transferable, zero-copy on this hop too.
			const node = getSceneInputWorkletNode();
			if (node && data) {
				node.port.postMessage({ type: 'path', data, nPoints }, [data]);
			}
		};

		workerRef.current = worker;
		return () => {
			worker.terminate();
			workerRef.current = null;
		};
	// Worker is created once; buffer-size sync is handled by the effect below.
	}, []);

	// Cap the buffer to what the current scan rate can render in one cycle
	// (~one point per audio sample) so buildCoordBuffer's arc-length resample
	// does the anti-aliasing, instead of the worklet skipping table entries.
	useEffect(() => {
		if (!workerRef.current) return;
		const period        = getSampleRate() / scanFrequency;
		const effectiveSize = Math.max(MIN_COORD_BUFFER_SIZE, Math.min(coordBufferSize, Math.floor(period)));
		workerRef.current.postMessage({ type: 'setCoordBufferSize', size: effectiveSize });
	}, [coordBufferSize, scanFrequency]);

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
