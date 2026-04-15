/**
 * DAW Zustand store — owns both the React Flow graph state and the Tone.js audio graph.
 *
 * Design notes:
 * - `_audioNodes` is a module-level Map, NOT inside Zustand state.
 *   Tone.js objects are mutable and non-serializable; keeping them outside
 *   state avoids spurious re-renders and impossible serialization.
 * - `audioVersion` is a counter in Zustand state that bumps whenever the
 *   audio topology changes, giving components a stable signal to subscribe to.
 * - The MasterOutputNode owns the Gain → Split → Analysers chain. All source
 *   nodes connect to its inputGain. The oscilloscope reads from its analysers.
 * - The getWaveformData() export replaces the one in audio/graph.ts.
 */

import { create } from 'zustand';
import {
	applyNodeChanges,
	applyEdgeChanges,
	addEdge,
	type OnNodesChange,
	type OnEdgesChange,
	type OnConnect,
	type NodeChange,
} from '@xyflow/react';
import {
	Player,
	Gain,
	Split,
	Analyser,
	getTransport,
	start as toneStart,
} from 'tone';
import { DEFAULT_AUDIO_SETTINGS, BUILT_IN_TRACKS } from '../config';
import type {
	AppNode,
	AppEdge,
	AudioNodeMap,
	PlayerAudioEntry,
	MasterOutputAudioEntry,
} from './dawTypes';

const { nSamples } = DEFAULT_AUDIO_SETTINGS;

export const MASTER_NODE_ID   = 'master-output';
export const DEFAULT_PLAYER_ID = 'player-default';

// ─── Module-level audio node registry ────────────────────────────────────────

const _audioNodes: AudioNodeMap = new Map();

// ─── Master output chain (lazy init) ─────────────────────────────────────────

let _masterEntry: MasterOutputAudioEntry | null = null;

function getMasterEntry(): MasterOutputAudioEntry {
	if (_masterEntry) return _masterEntry;

	const inputGain    = new Gain();
	const split        = new Split(2);
	const leftAnalyser  = new Analyser('waveform', nSamples);
	const rightAnalyser = new Analyser('waveform', nSamples);

	inputGain.connect(split);
	split.connect(leftAnalyser,  0);
	split.connect(rightAnalyser, 1);
	inputGain.toDestination();

	_masterEntry = { kind: 'masterOutput', inputGain, split, leftAnalyser, rightAnalyser };
	_audioNodes.set(MASTER_NODE_ID, _masterEntry);
	return _masterEntry;
}

// ─── getWaveformData — replaces the export in audio/graph.ts ─────────────────

/**
 * Returns the current waveform snapshot for both channels.
 * CONTRACT: same as the original graph.ts — do not hold references across
 * async boundaries. Copy the arrays if you need to retain the data.
 */
export function getWaveformData(): { left: Float32Array; right: Float32Array } {
	const entry = getMasterEntry();
	return {
		left:  entry.leftAnalyser.getValue()  as Float32Array,
		right: entry.rightAnalyser.getValue() as Float32Array,
	};
}

// ─── Player audio node lifecycle ─────────────────────────────────────────────

function createPlayerEntry(id: string): PlayerAudioEntry {
	const toneNode = new Player();
	const entry: PlayerAudioEntry = {
		kind:           'player',
		toneNode,
		startOffset:    0,
		currentRate:    1,
		isExplicitStop: false,
		isPlaying:      false,
		playbackEndCb:  null,
	};

	toneNode.onstop = () => {
		if (entry.isExplicitStop) {
			entry.isExplicitStop = false;
			return;
		}
		// Natural end of track
		getTransport().stop();
		entry.startOffset = 0;
		entry.isPlaying   = false;
		entry.playbackEndCb?.();
	};

	_audioNodes.set(id, entry);
	return entry;
}

function connectAudioNodes(sourceId: string, targetId: string): void {
	const src = _audioNodes.get(sourceId);
	// Ensure master entry exists before accessing it
	const tgt = targetId === MASTER_NODE_ID
		? getMasterEntry()
		: _audioNodes.get(targetId);
	if (!src || !tgt) return;

	if (src.kind === 'player' && tgt.kind === 'masterOutput') {
		try {
			src.toneNode.connect(tgt.inputGain);
		} catch {
			// Already connected — ignore
		}
	}
}

function disconnectAudioNodes(sourceId: string, targetId: string): void {
	const src = _audioNodes.get(sourceId);
	const tgt = _audioNodes.get(targetId);
	if (!src || !tgt) return;

	if (src.kind === 'player' && tgt.kind === 'masterOutput') {
		try {
			src.toneNode.disconnect(tgt.inputGain);
		} catch {
			// Not connected — ignore
		}
	}
}

function disposeAudioNode(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind === 'masterOutput') return;

	if (entry.kind === 'player') {
		if (entry.toneNode.state === 'started') {
			entry.isExplicitStop = true;
			entry.toneNode.stop();
		}
		entry.toneNode.dispose();
	}
	_audioNodes.delete(id);
}

// ─── Per-player playback helpers (public API) ─────────────────────────────────

export async function playNode(id: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	await toneStart();
	transport.stop();
	transport.seconds = 0;
	entry.toneNode.start('+0.01', entry.startOffset);
	transport.start('+0.01');
	entry.isPlaying = true;
}

export function pauseNode(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	entry.startOffset    = getNodePosition(id);
	entry.isExplicitStop = true;
	entry.toneNode.stop();
	transport.stop();
	entry.isPlaying = false;
}

export function seekNode(id: string, seconds: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport  = getTransport();
	const wasPlaying = entry.toneNode.state === 'started';
	entry.startOffset = seconds;
	if (wasPlaying) {
		entry.isExplicitStop = true;
		entry.toneNode.stop();
		transport.stop();
		transport.seconds = 0;
		entry.toneNode.start('+0.01', entry.startOffset);
		transport.start('+0.01');
	}
}

export async function loadTrackForNode(id: string, url: string): Promise<void> {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	if (entry.toneNode.state === 'started') {
		entry.isExplicitStop = true;
		entry.toneNode.stop();
		transport.stop();
	}
	transport.seconds    = 0;
	entry.startOffset    = 0;
	entry.isPlaying      = false;
	await entry.toneNode.load(url);
}

export function setNodeRate(id: string, rate: number): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;

	const transport = getTransport();
	if (entry.toneNode.state === 'started') {
		entry.startOffset = getNodePosition(id);
		transport.stop();
		transport.seconds = 0;
		transport.start('+0.01');
	}
	entry.currentRate          = rate;
	entry.toneNode.playbackRate = rate;
}

export function setNodeMuted(id: string, muted: boolean): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;
	entry.toneNode.mute = muted;
}

export function getNodePosition(id: string): number {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return 0;
	if (!entry.isPlaying) return entry.startOffset;
	return entry.startOffset + getTransport().seconds * entry.currentRate;
}

export function getNodeDuration(id: string): number {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return 0;
	return entry.toneNode.loaded ? entry.toneNode.buffer.duration : 0;
}

export function getNodeIsLoaded(id: string): boolean {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return false;
	return entry.toneNode.loaded;
}

export function getNodeIsPlaying(id: string): boolean {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return false;
	return entry.isPlaying;
}

export function onNodePlaybackEnd(id: string, cb: () => void): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;
	entry.playbackEndCb = cb;
}

export function clearNodePlaybackEndCallback(id: string): void {
	const entry = _audioNodes.get(id);
	if (!entry || entry.kind !== 'player') return;
	entry.playbackEndCb = null;
}

// ─── Initial graph setup ──────────────────────────────────────────────────────

// Create the default player entry and wire it to the master output.
// Audio nodes are created lazily (getMasterEntry is called inside connectAudioNodes),
// so AudioContext is not touched until the first getWaveformData() or play call.
createPlayerEntry(DEFAULT_PLAYER_ID);
connectAudioNodes(DEFAULT_PLAYER_ID, MASTER_NODE_ID);

const initialNodes: AppNode[] = [
	{
		id:        MASTER_NODE_ID,
		type:      'masterOutput',
		position:  { x: 300, y: 250 },
		data:      { label: 'Master Output' },
		deletable: false,
	},
	{
		id:       DEFAULT_PLAYER_ID,
		type:     'player',
		position: { x: 75, y: 50 },
		data:     { trackUrl: BUILT_IN_TRACKS[0].file, label: 'Player' },
	},
];

const initialEdges: AppEdge[] = [
	{
		id:       'e-default',
		source:   DEFAULT_PLAYER_ID,
		target:   MASTER_NODE_ID,
		animated: true,
		style:    { stroke: '#22dd22' },
	},
];

// ─── Zustand store ────────────────────────────────────────────────────────────

type DawState = {
	nodes:          AppNode[];
	edges:          AppEdge[];
	audioVersion:   number;
	selectedNodeId: string | null;

	onNodesChange:    OnNodesChange<AppNode>;
	onEdgesChange:    OnEdgesChange<AppEdge>;
	onConnect:        OnConnect;
	addPlayerNode:    (trackUrl: string, position: { x: number; y: number }) => string;
	updateNodeData:   (id: string, data: Partial<{ trackUrl: string; label: string }>) => void;
	setSelectedNodeId: (id: string | null) => void;
};

export const useDawStore = create<DawState>((set, get) => ({
	nodes:          initialNodes,
	edges:          initialEdges,
	audioVersion:   0,
	selectedNodeId: null,

	onNodesChange: (changes: NodeChange<AppNode>[]) => {
		// Never allow the master output node to be deleted
		const safeChanges = changes.filter(
			c => !(c.type === 'remove' && c.id === MASTER_NODE_ID),
		);
		// Dispose audio nodes for nodes that are being removed
		safeChanges
			.filter(c => c.type === 'remove')
			.forEach(c => disposeAudioNode(c.id));

		set({ nodes: applyNodeChanges(safeChanges, get().nodes) });
	},

	onEdgesChange: (changes) => {
		const currentEdges = get().edges;
		changes
			.filter(c => c.type === 'remove')
			.forEach(c => {
				const edge = currentEdges.find(e => e.id === c.id);
				if (edge) disconnectAudioNodes(edge.source, edge.target);
			});
		set({ edges: applyEdgeChanges(changes, get().edges) });
	},

	onConnect: (connection) => {
		if (!connection.source || !connection.target) return;
		connectAudioNodes(connection.source, connection.target);
		set({
			edges: addEdge(
				{ ...connection, animated: true, style: { stroke: '#22dd22' } },
				get().edges,
			),
			audioVersion: get().audioVersion + 1,
		});
	},

	addPlayerNode: (trackUrl, position) => {
		const id = `player-${Date.now()}`;
		createPlayerEntry(id);
		const newNode: AppNode = {
			id,
			type:     'player',
			position,
			data:     { trackUrl, label: 'Player' },
		};
		set({
			nodes:        [...get().nodes, newNode],
			audioVersion: get().audioVersion + 1,
		});
		return id;
	},

	updateNodeData: (id, data) => {
		set({
			nodes: get().nodes.map(n =>
				n.id === id ? ({ ...n, data: { ...n.data, ...data } } as AppNode) : n,
			),
		});
	},

	setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}));

// ─── Cleanup on page unload ───────────────────────────────────────────────────

window.addEventListener(
	'beforeunload',
	() => {
		for (const [, entry] of _audioNodes) {
			if (entry.kind === 'player') {
				if (entry.toneNode.state === 'started') {
					entry.isExplicitStop = true;
					entry.toneNode.stop();
				}
				entry.toneNode.dispose();
			} else if (entry.kind === 'masterOutput') {
				entry.inputGain.dispose();
				entry.split.dispose();
				entry.leftAnalyser.dispose();
				entry.rightAnalyser.dispose();
			}
		}
		_audioNodes.clear();
	},
	{ once: true },
);
