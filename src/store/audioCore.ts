import type { AudioNodeMap, AppEdge } from './dawTypes';

// ─── Shared audio node registry ───────────────────────────────────────────────
// Module-level singleton — the same Map instance is imported by daw.ts and all
// node handlers. ES module caching guarantees one instance for the whole app.
// Tone.js objects are mutable and non-serializable; keeping them here (not in
// Zustand state) avoids spurious re-renders and impossible serialization.

export const _audioNodes: AudioNodeMap = new Map();

// ─── Well-known node ids ──────────────────────────────────────────────────────
// Defined here (not in daw.ts) so node handlers can reference them without
// importing the Zustand store.

export const MASTER_NODE_ID = 'master-output';
export const SCENE_INPUT_ID = 'scene-input';

// ─── Tone.js graph traversal helpers ────────────────────────────────────────���

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToneInputNode = any;

function _getTargetToneNode(
	tgt: NonNullable<ReturnType<typeof _audioNodes.get>>,
	targetHandle: string,
): ToneInputNode | null {
	if (tgt.kind === 'masterOutput') {
		if (targetHandle === 'in-0') return tgt.inputGainX;
		if (targetHandle === 'in-1') return tgt.inputGainY;
		if (targetHandle === 'in-2') return tgt.inputGainR;
		if (targetHandle === 'in-3') return tgt.inputGainG;
		if (targetHandle === 'in-4') return tgt.inputGainB;
		if (targetHandle === 'in-5') return tgt.inputGainA;
		return null;
	}
	if ('toneNode' in tgt) return (tgt as { toneNode: ToneInputNode }).toneNode;
	return null;
}

// Follow the Tone.js .input chain to the underlying raw AudioNode.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _resolveInput(node: ToneInputNode): any {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let n: any = node;
	for (let i = 0; i < 16 && n?.input !== undefined; i++) n = n.input;
	return n;
}

// Follow the Tone.js .output chain to the underlying raw AudioNode.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _resolveOutput(node: ToneInputNode): any {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let n: any = node;
	for (let i = 0; i < 16 && n?.output !== undefined; i++) n = n.output;
	return n;
}

// ─── Audio routing ────────────────────────────────────────────────────────────
// Both functions rely on the master entry already being in _audioNodes.
// getMasterEntry() in daw.ts guarantees this during dawInit, before any edges
// are connected.

export function connectAudioNodes(
	sourceId:     string,
	sourceHandle: string,
	targetId:     string,
	targetHandle: string,
): void {
	const src = _audioNodes.get(sourceId);
	const tgt = _audioNodes.get(targetId);
	if (!src || !tgt) return;

	const destNode = _getTargetToneNode(tgt, targetHandle);
	if (!destNode) return;

	const outputIndex = sourceHandle === 'out-1' ? 1 : 0;
	const destAudio   = _resolveInput(destNode);

	try {
		if (src.kind === 'player' || src.kind === 'grainPlayer') {
			_resolveOutput(src.split as unknown as ToneInputNode).connect(destAudio, outputIndex, 0);
		} else if (src.kind === 'sceneInput') {
			const chanIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			src.split.output.connect(destAudio, chanIndex, 0);
		} else if ('toneNode' in src) {
			_resolveOutput((src as { toneNode: ToneInputNode }).toneNode).connect(destAudio, outputIndex, 0);
		}
	} catch (e) {
		if ((e as Error)?.message?.includes('already connected') ||
			(e as Error)?.message?.includes('InvalidStateError')) return;
		console.error('[audio] connectAudioNodes error', { sourceId, targetId, srcKind: src.kind, error: e });
	}
}

export function disconnectAudioNodes(
	sourceId:     string,
	sourceHandle: string,
	targetId:     string,
	targetHandle: string,
): void {
	const src = _audioNodes.get(sourceId);
	const tgt = _audioNodes.get(targetId);
	if (!src || !tgt) return;

	const destNode = _getTargetToneNode(tgt, targetHandle);
	if (!destNode) return;

	const outputIndex = sourceHandle === 'out-1' ? 1 : 0;
	const destAudio   = _resolveInput(destNode);

	try {
		if (src.kind === 'player' || src.kind === 'grainPlayer') {
			_resolveOutput(src.split as unknown as ToneInputNode).disconnect(destAudio, outputIndex);
		} else if (src.kind === 'sceneInput') {
			const chanIndex = parseInt(sourceHandle.replace('out-', ''), 10);
			src.split.output.disconnect(destAudio, chanIndex, 0);
		} else if ('toneNode' in src) {
			_resolveOutput((src as { toneNode: ToneInputNode }).toneNode).disconnect(destAudio, outputIndex);
		}
	} catch {
		// Not connected — ignore
	}
}

// ─── Reconnect helper ─────────────────────────────────────────────────────────
// Re-wires all outgoing edges for a node whose Tone.js instance was recreated
// (single-use sources: Oscillator, Noise, LFO, FM/AM/Fat/Pulse/PWM oscillators).
// Takes edges as a parameter so this module has no dependency on the Zustand store.

export function reconnectSourceEdges(id: string, edges: AppEdge[]): void {
	for (const edge of edges) {
		if (edge.source === id && edge.sourceHandle && edge.targetHandle) {
			connectAudioNodes(id, edge.sourceHandle, edge.target, edge.targetHandle);
		}
	}
}
