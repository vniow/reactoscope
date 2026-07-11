import { _audioNodes, SCENE_INPUT_ID } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { IldaFrameNodeData, IldaFrameAudioEntry } from '../../store/dawTypes';

// ─── ILDA frame node ──────────────────────────────────────────────────────────
// Plays pre-decoded .ild frames through the Scene Input worklet: each frame is
// a coord buffer posted to the worklet's port; animated mode cycles frames on
// a main-thread interval timer.

function getEntry(id: string): IldaFrameAudioEntry | undefined {
	const e = _audioNodes.get(id);
	return e?.kind === 'ildaFrame' ? e : undefined;
}

export const ildaFrameHandler: NodeTypeHandler<IldaFrameNodeData> = {
	defaultData: { label: 'ILDA', ildUrl: '', filename: '', mode: 'static', fps: 30, isPlaying: false },

	create(id) {
		const sceneEntry = _audioNodes.get(SCENE_INPUT_ID);
		const entry: IldaFrameAudioEntry = {
			kind:        'ildaFrame',
			workletNode: sceneEntry ? (sceneEntry as { workletNode: unknown }).workletNode : null,
			coordBufs:   [],
			frameIdx:    0,
			frameTimer:  null,
		};
		_audioNodes.set(id, entry);
	},

	dispose(id) {
		const entry = getEntry(id);
		if (!entry) return;
		if (entry.frameTimer !== null) {
			clearInterval(entry.frameTimer);
			entry.frameTimer = null;
		}
		try { entry.workletNode.disconnect(); } catch { /* already disconnected */ }
		entry.coordBufs = [];
		_audioNodes.delete(id);
	},

	setAudioParam() { /* playback is driven by the frame operations below */ },
};

// ─── ILDA frame operations beyond the handler protocol ───────────────────────

/**
 * Fetch an .ild file, decode it, and load every frame into the node's audio
 * entry as a precomputed coord buffer. Posts frame[0] to the worklet so the
 * sound starts immediately; the UI layer (IldaFrameNode) is responsible for
 * deciding when to start the animated cycle.
 *
 * Imports the codec lazily so the path doesn't pull it into the main bundle.
 */
export async function loadIldaForNode(id: string, url: string): Promise<{ nFrames: number; nPoints: number }> {
	const entry = getEntry(id);
	if (!entry) throw new Error(`Node ${id} is not an ildaFrame entry`);

	const [{ decodeIldaFile, ildaFrameToCoordBuffer }] = await Promise.all([
		import('../../laser/ildaCodec'),
	]);
	const res    = await fetch(url);
	const arrBuf = await res.arrayBuffer();
	const frames = decodeIldaFile(arrBuf);
	if (frames.length === 0) throw new Error('ILDA file contained no frames');

	const coordBufs = frames.map(f => ildaFrameToCoordBuffer(f));

	// Stop any running animated cursor before swapping the buffer set.
	if (entry.frameTimer !== null) {
		clearInterval(entry.frameTimer);
		entry.frameTimer = null;
	}
	entry.coordBufs = coordBufs;
	entry.frameIdx  = 0;

	_postIldaCoordBufferToWorklet(entry, 0);

	return { nFrames: frames.length, nPoints: coordBufs[0].nPoints };
}

function _postIldaCoordBufferToWorklet(entry: IldaFrameAudioEntry, idx: number): void {
	const cb = entry.coordBufs[idx];
	if (!cb) return;
	// Caller keeps `entry.coordBufs[idx]` alive; transfer a fresh copy so the
	// worklet owns its own buffer and we can re-post on the next animated tick.
	const copy = cb.data.slice();
	(entry.workletNode as AudioWorkletNode).port.postMessage(
		{ type: 'path', data: copy.buffer, nPoints: cb.nPoints },
		[copy.buffer],
	);
}

export function startIldaPlayback(id: string, mode: 'static' | 'animated', fps: number): void {
	const entry = getEntry(id);
	if (!entry) return;
	if (entry.coordBufs.length === 0) return;

	if (entry.frameTimer !== null) {
		clearInterval(entry.frameTimer);
		entry.frameTimer = null;
	}

	// Always (re-)seed the worklet with the current frame so silence resumes
	// turn into sound on the next process() call.
	_postIldaCoordBufferToWorklet(entry, entry.frameIdx);

	if (mode === 'animated' && entry.coordBufs.length > 1) {
		const intervalMs = 1000 / Math.max(1, fps);
		entry.frameTimer = setInterval(() => {
			entry.frameIdx = (entry.frameIdx + 1) % entry.coordBufs.length;
			_postIldaCoordBufferToWorklet(entry, entry.frameIdx);
		}, intervalMs);
	}
}

export function stopIldaPlayback(id: string): void {
	const entry = getEntry(id);
	if (!entry) return;
	if (entry.frameTimer !== null) {
		clearInterval(entry.frameTimer);
		entry.frameTimer = null;
	}
	(entry.workletNode as AudioWorkletNode).port.postMessage({ type: 'clear' });
}

export function getIldaFrameInfo(id: string): { nFrames: number; nPoints: number; frameIdx: number } | null {
	const entry = getEntry(id);
	if (!entry) return null;
	if (entry.coordBufs.length === 0) return null;
	return {
		nFrames:  entry.coordBufs.length,
		nPoints:  entry.coordBufs[entry.frameIdx]?.nPoints ?? 0,
		frameIdx: entry.frameIdx,
	};
}
