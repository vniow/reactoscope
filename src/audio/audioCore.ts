import { getContext, ToneAudioNode } from 'tone';
import type { AudioNodeMap, AudioNodeEntry, AppEdge } from '../store/dawTypes';

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

// ─── Audio context queries ────────────────────────────────────────────────────

export function getSampleRate(): number {
	return getContext().rawContext.sampleRate;
}

export function getAudioCurrentTime(): number {
	return getContext().rawContext.currentTime;
}

// ─── Routing adapters ─────────────────────────────────────────────────────────
// A Port is a resolved connection endpoint: the real Tone.js node to call
// .connect()/.disconnect() on, and which of its channels a handle refers to.
// Tone's own connect()/disconnect() already walk a node's .input/.output chain
// down to the raw AudioNode internally — every port here is a genuine
// ToneAudioNode, so nothing in this file needs to do that walk by hand.
//
// Every AudioNodeEntry kind gets exactly one adapter in ROUTING, keyed by
// kind — connectAudioNodes/disconnectAudioNodes dispatch through it once,
// instead of each doing its own kind-branching. Most kinds share
// `genericAdapter`: their whole routable surface is `entry.toneNode` itself.
// A kind needs its own adapter only when its real input/output isn't
// reachable that way — either it lives under a different field (`split`, or
// masterOutput's six named gains), or reading it needs per-handle knowledge
// the generic case can't have.

export type Port = { node: ToneAudioNode; channel: number };

type PortAdapter = {
	getOutput?(entry: AudioNodeEntry, sourceHandle: string): Port | null;
	getInput?(entry: AudioNodeEntry, targetHandle: string): Port | null;
};

const genericAdapter: PortAdapter = {
	getOutput: (entry) =>
		'toneNode' in entry && entry.toneNode instanceof ToneAudioNode
			? { node: entry.toneNode, channel: 0 } : null,
	getInput: (entry) =>
		'toneNode' in entry && entry.toneNode instanceof ToneAudioNode
			? { node: entry.toneNode, channel: 0 } : null,
};

const masterOutputAdapter: PortAdapter = {
	// Target-only: six named gains, one per handle. Never a connection source.
	getInput: (entry, targetHandle) => {
		if (entry.kind !== 'masterOutput') return null;
		const gain = {
			'in-0': entry.inputGainX, 'in-1': entry.inputGainY,
			'in-2': entry.inputGainR, 'in-3': entry.inputGainG,
			'in-4': entry.inputGainB, 'in-5': entry.inputGainA,
		}[targetHandle];
		return gain ? { node: gain, channel: 0 } : null;
	},
};

const splitOutputAdapter: PortAdapter = {
	// player / grainPlayer: source-only, out-0 = L, out-1 = R of a Split(2).
	getOutput: (entry, sourceHandle) =>
		'split' in entry ? { node: entry.split, channel: sourceHandle === 'out-1' ? 1 : 0 } : null,
};

const sceneInputAdapter: PortAdapter = {
	// Source-only, six channels of a Split(6) selected by handle index.
	getOutput: (entry, sourceHandle) =>
		entry.kind === 'sceneInput'
			? { node: entry.split, channel: parseInt(sourceHandle.replace('out-', ''), 10) } : null,
};

const delayAdapter: PortAdapter = {
	// TODO: delete once DelayAudioEntry wraps a real FeedbackDelay — it'll fall
	// into genericAdapter like every other effect once toneNode is a real node
	// instead of a plain { input, output } composite.
	getOutput: (entry) => entry.kind === 'delay' ? { node: entry.toneNode.output, channel: 0 } : null,
	getInput:  (entry) => entry.kind === 'delay' ? { node: entry.toneNode.input,  channel: 0 } : null,
};

const ROUTING: Record<AudioNodeEntry['kind'], PortAdapter> = {
	masterOutput: masterOutputAdapter,
	player:       splitOutputAdapter,
	grainPlayer:  splitOutputAdapter,
	sceneInput:   sceneInputAdapter,
	delay:        delayAdapter,
	oscillator:       genericAdapter,
	gain:             genericAdapter,
	noise:            genericAdapter,
	dcSignal:         genericAdapter,
	lfo:              genericAdapter,
	fmOscillator:     genericAdapter,
	amOscillator:     genericAdapter,
	fatOscillator:    genericAdapter,
	pulseOscillator:  genericAdapter,
	pwmOscillator:    genericAdapter,
	micInput:         genericAdapter,
	reverb:           genericAdapter,
	jcReverb:         genericAdapter,
	freeverb:         genericAdapter,
	feedbackDelay:    genericAdapter,
	pingPongDelay:    genericAdapter,
	distortion:       genericAdapter,
	chebyshev:        genericAdapter,
	bitCrusher:       genericAdapter,
	frequencyShifter: genericAdapter,
	pitchShift:       genericAdapter,
	stereoWidener:    genericAdapter,
	chorus:           genericAdapter,
	phaser:           genericAdapter,
	tremolo:          genericAdapter,
	vibrato:          genericAdapter,
	autoFilter:       genericAdapter,
	autoPanner:       genericAdapter,
	autoWah:          genericAdapter,
};

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

	const srcPort = ROUTING[src.kind].getOutput?.(src, sourceHandle);
	const dstPort = ROUTING[tgt.kind].getInput?.(tgt, targetHandle);
	if (!srcPort || !dstPort) return;

	try {
		srcPort.node.connect(dstPort.node, srcPort.channel, dstPort.channel);
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

	const srcPort = ROUTING[src.kind].getOutput?.(src, sourceHandle);
	const dstPort = ROUTING[tgt.kind].getInput?.(tgt, targetHandle);
	if (!srcPort || !dstPort) return;

	try {
		srcPort.node.disconnect(dstPort.node, srcPort.channel, dstPort.channel);
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
