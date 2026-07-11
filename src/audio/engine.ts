/**
 * The audio engine's interface. Everything outside src/audio/ that needs the
 * audio graph — the Zustand store, the visualisers, node UIs — goes through
 * this module. Tone.js, the AudioWorklets, and the master output chain are
 * implementation behind this seam.
 *
 * Graph lifecycle is keyed by React Flow node type and dispatched through the
 * node handler registry; the store owns topology (which nodes/edges exist),
 * the engine owns the audio objects those nodes stand for.
 */

import {
	_audioNodes,
	connectAudioNodes,
	disconnectAudioNodes,
	reconnectSourceEdges,
	MASTER_NODE_ID,
	SCENE_INPUT_ID,
} from './audioCore';
import { nodeRegistry } from './nodeRegistry';
import { getMasterEntry, disposeMasterChain } from './master';
import { initWaveformCapture, initGalvoProjector } from './capture';
import { initSceneInput, disposeSceneInput } from './sceneInput';
import type { AppEdge } from '../store/dawTypes';

// ─── Node lifecycle (dispatched through the handler registry) ─────────────────

/**
 * Creates the audio entry for a node and returns its full node data
 * (handler defaults merged with `extraData`), or null for unknown types.
 */
export function createNode(
	type: string,
	id: string,
	extraData?: Record<string, unknown>,
): Record<string, unknown> | null {
	const handler = nodeRegistry.get(type);
	if (!handler) return null;
	const data = { ...handler.defaultData, ...extraData };
	handler.create(id, data);
	return data;
}

/**
 * Disposes a node's audio entry through its handler. The master output and
 * scene input are engine infrastructure, never disposed with graph nodes —
 * their teardown happens only in shutdownAudioEngine().
 */
export function disposeNode(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind === 'masterOutput' || entry.kind === 'sceneInput') return;
	nodeRegistry.getByKind(entry.kind)?.dispose(id);
}

export function setNodeParam(type: string, id: string, update: Record<string, unknown>): void {
	nodeRegistry.get(type)?.setAudioParam(id, update);
}

/**
 * Starts a startable node. Single-use Tone sources are recreated internally
 * when restarted; their outgoing edges are re-wired here, which is why the
 * caller passes the node's current edges. Returns false when the type has no
 * start behaviour.
 */
export async function startNode(type: string, id: string, edges: AppEdge[]): Promise<boolean> {
	const handler = nodeRegistry.get(type);
	if (!handler?.start) return false;
	const recreated = await handler.start(id);
	if (recreated) reconnectSourceEdges(id, edges);
	return true;
}

export function stopNode(type: string, id: string): void {
	nodeRegistry.get(type)?.stop?.(id);
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export { connectAudioNodes, disconnectAudioNodes };

// ─── Engine init / shutdown ───────────────────────────────────────────────────

/**
 * Brings up the engine: master chain, scene input worklet (wired to the master
 * by default), then the waveform-capture and galvo-projector taps.
 */
export function initAudioEngine(): Promise<void> {
	return initSceneInput().then(() => {
		getMasterEntry(); // ensure the master entry exists before wiring edges into it
		connectAudioNodes(SCENE_INPUT_ID, 'out-0', MASTER_NODE_ID, 'in-0');
		connectAudioNodes(SCENE_INPUT_ID, 'out-1', MASTER_NODE_ID, 'in-1');
		connectAudioNodes(SCENE_INPUT_ID, 'out-2', MASTER_NODE_ID, 'in-2');
		connectAudioNodes(SCENE_INPUT_ID, 'out-3', MASTER_NODE_ID, 'in-3');
		connectAudioNodes(SCENE_INPUT_ID, 'out-4', MASTER_NODE_ID, 'in-4');
		connectAudioNodes(SCENE_INPUT_ID, 'out-5', MASTER_NODE_ID, 'in-5');
		return initWaveformCapture().then(initGalvoProjector);
	}).catch(console.error);
}

/** Disposes every audio object the engine owns. Used on page unload. */
export function shutdownAudioEngine(): void {
	for (const id of [..._audioNodes.keys()]) {
		disposeNode(id);
	}
	disposeSceneInput();
	disposeMasterChain();
	_audioNodes.clear();
}

if (typeof window !== 'undefined') {
	window.addEventListener('beforeunload', shutdownAudioEngine, { once: true });
}

// ─── Re-exported engine surface ───────────────────────────────────────────────
// Constants, context queries, taps, and node-type operations beyond the shared
// handler protocol. One import path for every audio consumer.

export { MASTER_NODE_ID, SCENE_INPUT_ID, getSampleRate, getAudioCurrentTime, _audioNodes } from './audioCore';

export { getWaveformData, setAnalyserSize, setSpeakersMuted } from './master';

export {
	getWaveformDataFromSAB, getWaveformWriteIndex, getWaveformNSamples, setWaveformCaptureSize,
	getGalvoRing, getGalvoWriteCount, setGalvoParams,
} from './capture';

export {
	getSceneInputPhase, startSceneInput, stopSceneInput, getSceneRunning,
	getSceneInputWorkletNode, setLastCoordBuffer, getLastCoordBuffer,
} from './sceneInput';

export {
	playNode, pauseNode, seekNode, loadTrackForNode,
	setNodeRate, setNodeMuted, setNodeLoop,
	getNodePosition, getNodeDuration, getNodeIsLoaded, getNodeIsPlaying,
	onNodePlaybackEnd, clearNodePlaybackEndCallback,
} from './nodes/player';

export {
	startGrainPlayer, stopGrainPlayer, loadTrackForGrainPlayer,
	setGrainPlayerGrainSize, setGrainPlayerOverlap, setGrainPlayerPlaybackRate,
	setGrainPlayerDetune, setGrainPlayerLoop, setGrainPlayerLoopStart,
	setGrainPlayerLoopEnd, setGrainPlayerReverse, setGrainPlayerMuted,
	getGrainPlayerBufferDuration,
} from './nodes/grainPlayer';

export { startMicInput, stopMicInput } from './nodes/micInput';

export { loadIldaForNode, startIldaPlayback, stopIldaPlayback, getIldaFrameInfo } from './nodes/ildaFrame';
