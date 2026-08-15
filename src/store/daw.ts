/**
 * DAW Zustand store — owns the React Flow graph topology (nodes, edges) and
 * UI-facing session state. All audio behaviour lives behind the audio engine
 * interface (src/audio/engine.ts); this store tells the engine what exists
 * and how it is wired, and the engine owns the Tone.js objects.
 *
 * - `audioVersion` is a counter in Zustand state that bumps whenever the
 *   audio topology changes, giving components a stable signal to subscribe to.
 * - Handle ID convention:
 *     Source handles: 'out-0', 'out-1', ...  (position Bottom)
 *     Target handles: 'in-0',  'in-1',  ...  (position Top)
 *   MasterOutput: 'in-0'..'in-5' = X, Y, R, G, B, A
 */

import { create } from 'zustand';
import {
	applyNodeChanges,
	applyEdgeChanges,
	addEdge,
	reconnectEdge,
	type OnNodesChange,
	type OnEdgesChange,
	type OnConnect,
	type NodeChange,
	type Connection,
} from '@xyflow/react';
import { NODE_COLORS } from '../daw/nodes/shared/nodeColors';
import * as engine from '../audio/engine';
import { MASTER_NODE_ID, SCENE_INPUT_ID } from '../audio/engine';
import { isolationMode, excludedAudioComponents, testTone } from '../isolationMode';
import type {
	AppNode,
	AppEdge,
	StubKind,
	PatchFile,
	MasterOutputNodeData,
} from './dawTypes';

export { MASTER_NODE_ID, SCENE_INPUT_ID };
export const DEFAULT_PLAYER_ID = 'player-default';

const NODE_TYPE_EDGE_COLOR: Record<string, string> = {
	masterOutput:    NODE_COLORS.output,
	gain:            NODE_COLORS.processor,
	player:          NODE_COLORS.source,
	oscillator:      NODE_COLORS.source,
	noiseGenerator:  NODE_COLORS.source,
	dcSignal:        NODE_COLORS.source,
	lfo:             NODE_COLORS.source,
	fmOscillator:    NODE_COLORS.source,
	amOscillator:    NODE_COLORS.source,
	fatOscillator:   NODE_COLORS.source,
	pulseOscillator: NODE_COLORS.source,
	pwmOscillator:   NODE_COLORS.source,
	grainPlayer:     NODE_COLORS.source,
	micInput:        NODE_COLORS.source,
	sceneInput:        NODE_COLORS.scene,
	debug:             NODE_COLORS.debug,
	stub:              NODE_COLORS.processor,
	reverb:            NODE_COLORS.effects,
	jcReverb:          NODE_COLORS.effects,
	freeverb:          NODE_COLORS.effects,
	delay:             NODE_COLORS.effects,
	feedbackDelay:     NODE_COLORS.effects,
	pingPongDelay:     NODE_COLORS.effects,
	distortion:        NODE_COLORS.effects,
	chebyshev:         NODE_COLORS.effects,
	bitCrusher:        NODE_COLORS.effects,
	frequencyShifter:  NODE_COLORS.effects,
	pitchShift:        NODE_COLORS.effects,
	stereoWidener:     NODE_COLORS.effects,
	chorus:            NODE_COLORS.effects,
	phaser:            NODE_COLORS.effects,
	tremolo:           NODE_COLORS.effects,
	vibrato:           NODE_COLORS.effects,
	autoFilter:        NODE_COLORS.effects,
	autoPanner:        NODE_COLORS.effects,
	autoWah:           NODE_COLORS.effects,
	limiter:           NODE_COLORS.dynamics,
	gate:              NODE_COLORS.dynamics,
	biquadFilter:      NODE_COLORS.processor,
	panVol:            NODE_COLORS.processor,
	split:             NODE_COLORS.processor,
	merge:             NODE_COLORS.processor,
	mono:              NODE_COLORS.processor,
	volume:            NODE_COLORS.processor,
	fft:               NODE_COLORS.utility,
	meter:             NODE_COLORS.utility,
	dcMeter:           NODE_COLORS.utility,
	waveform:          NODE_COLORS.utility,
	signal:            NODE_COLORS.utility,
	scale:             NODE_COLORS.utility,
	scaleExp:          NODE_COLORS.utility,
	abs:               NODE_COLORS.utility,
	negate:            NODE_COLORS.utility,
	audioToGain:       NODE_COLORS.utility,
	gainToAudio:       NODE_COLORS.utility,
};

function edgeColorForSource(sourceId: string, nodes: AppNode[]): string {
	const node = nodes.find(n => n.id === sourceId);
	return NODE_TYPE_EDGE_COLOR[node?.type ?? ''] ?? NODE_COLORS.output;
}

// ─── Stub labels ──────────────────────────────────────────────────────────────

// Only entries that need a display name different from their action key.
// Everything else falls back to capitalising the action string.
const STUB_LABELS: Partial<Record<StubKind, string>> = {
	noiseGenerator:      'Noise',
	midSideCompressor:   'MidSideCompressor',
	multibandCompressor: 'MultibandCompressor',
	panner3d:            'Panner3D',
	amplitudeEnvelope:   'AmplitudeEnvelope',
	frequencyEnvelope:   'FrequencyEnvelope',
	waveShaper:          'WaveShaper',
	greaterThan:         'GreaterThan',
	toneEvent:           'ToneEvent',
};

function stubLabel(kind: StubKind): string {
	return STUB_LABELS[kind] ?? (kind.charAt(0).toUpperCase() + kind.slice(1));
}

// ─── Initial graph setup ──────────────────────────────────────────────────────

// Player nodes are created on demand via addNode — no default player.

const initialNodes: AppNode[] = [
	{
		id:       MASTER_NODE_ID,
		type:     'masterOutput',
		position: { x: 288, y: 240 },
		data:     { label: 'Master Output', speakersMuted: true },
	},
	{
		id:       SCENE_INPUT_ID,
		type:     'sceneInput',
		position: { x: -240, y: 240 },
		data:     { label: 'Scene Input', scanFrequency: 50 },
	},
];

const initialEdges: AppEdge[] = [
	{ id: 'e-scene-x', source: SCENE_INPUT_ID, sourceHandle: 'out-0', target: MASTER_NODE_ID, targetHandle: 'in-0', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-y', source: SCENE_INPUT_ID, sourceHandle: 'out-1', target: MASTER_NODE_ID, targetHandle: 'in-1', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-r', source: SCENE_INPUT_ID, sourceHandle: 'out-2', target: MASTER_NODE_ID, targetHandle: 'in-2', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-g', source: SCENE_INPUT_ID, sourceHandle: 'out-3', target: MASTER_NODE_ID, targetHandle: 'in-3', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-b', source: SCENE_INPUT_ID, sourceHandle: 'out-4', target: MASTER_NODE_ID, targetHandle: 'in-4', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
	{ id: 'e-scene-a', source: SCENE_INPUT_ID, sourceHandle: 'out-5', target: MASTER_NODE_ID, targetHandle: 'in-5', animated: false, type: 'deletable', style: { stroke: NODE_COLORS.scene } },
];

// ─── Zustand store ────────────────────────────────────────────────────────────

type DawState = {
	nodes:          AppNode[];
	edges:          AppEdge[];
	audioVersion:   number;
	selectedNodeId: string | null;
	sceneRunning:   boolean;
	playingNodes:   Set<string>;
	soloedNodeId:   string | null;

	onNodesChange:     OnNodesChange<AppNode>;
	onEdgesChange:     OnEdgesChange<AppEdge>;
	onConnect:         OnConnect;
	onReconnect:       (oldEdge: AppEdge, newConnection: Connection) => void;
	addStubNode: (kind: StubKind, position: { x: number; y: number }) => string;
	setNodePlaying:      (id: string, playing: boolean) => void;
	addNode:             (type: string, position: { x: number; y: number }, extraData?: Record<string, unknown>) => string;
	setNodeParam:        (id: string, update: Record<string, unknown>) => void;
	startNode:           (id: string) => Promise<void>;
	stopNode:            (id: string) => void;
	updateNodeData:      (id: string, data: Partial<Record<string, unknown>>) => void;
	updateNodePositions: (updatedNodes: AppNode[]) => void;
	setSelectedNodeId:   (id: string | null) => void;
	toggleSolo:          (id: string) => void;
	setSpeakersMuted:    (muted: boolean) => void;
	edgePathType:        'bezier' | 'straight' | 'step' | 'smoothstep';
	setEdgePathType:     (type: 'bezier' | 'straight' | 'step' | 'smoothstep') => void;
	startScene:          () => Promise<void>;
	stopScene:           () => void;
	loadPatch:           (patch: PatchFile) => void;
};

export const useDawStore = create<DawState>((set, get) => ({
	nodes:          initialNodes,
	edges:          initialEdges,
	audioVersion:   0,
	edgePathType:   'smoothstep',
	setEdgePathType: (type) => set({ edgePathType: type }),
	selectedNodeId: null,
	sceneRunning:   false,
	playingNodes:   new Set<string>(),
	soloedNodeId:   null,

	setNodePlaying: (id, playing) => set(state => {
		const next = new Set(state.playingNodes);
		if (playing) next.add(id); else next.delete(id);
		return { playingNodes: next };
	}),
	startScene: async () => {
		await engine.startSceneInput();
		set({ sceneRunning: true });
	},
	stopScene: () => {
		engine.stopSceneInput();
		set({ sceneRunning: false });
	},

	onNodesChange: (changes: NodeChange<AppNode>[]) => {
		// Dispose audio and clear playing state for removed nodes
		const removed = changes.filter(c => c.type === 'remove').map(c => c.id);
		removed.forEach(id => engine.disposeNode(id));

		if (removed.length > 0) {
			set(state => {
				const next = new Set(state.playingNodes);
				removed.forEach(id => next.delete(id));
				return {
					nodes:        applyNodeChanges(changes, state.nodes),
					playingNodes: next,
					soloedNodeId: state.soloedNodeId && removed.includes(state.soloedNodeId) ? null : state.soloedNodeId,
				};
			});
		} else {
			set({ nodes: applyNodeChanges(changes, get().nodes) });
		}
	},

	updateNodePositions: (updatedNodes: AppNode[]) => {
		const posMap = new Map(updatedNodes.map(n => [n.id, n.position]));
		set({
			nodes: get().nodes.map(n =>
				posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n,
			),
		});
	},

	onEdgesChange: (changes) => {
		const currentEdges = get().edges;
		changes
			.filter(c => c.type === 'remove')
			.forEach(c => {
				const edge = currentEdges.find(e => e.id === c.id);
				if (edge?.sourceHandle && edge?.targetHandle) {
					engine.disconnectAudioNodes(
						edge.source, edge.sourceHandle,
						edge.target, edge.targetHandle,
					);
				}
			});
		set({ edges: applyEdgeChanges(changes, get().edges) });
	},

	onConnect: (connection) => {
		if (!connection.source || !connection.target) return;
		if (!connection.sourceHandle || !connection.targetHandle) return;
		engine.connectAudioNodes(
			connection.source, connection.sourceHandle,
			connection.target, connection.targetHandle,
		);
		set({
			edges: addEdge(
				{
					...connection,
					animated: false,
					type:     'deletable',
					style:    { stroke: edgeColorForSource(connection.source, get().nodes) },
				},
				get().edges,
			),
			audioVersion: get().audioVersion + 1,
		});
	},

	onReconnect: (oldEdge, newConnection) => {
		// Disconnect the old audio path
		if (oldEdge.sourceHandle && oldEdge.targetHandle) {
			engine.disconnectAudioNodes(
				oldEdge.source, oldEdge.sourceHandle,
				oldEdge.target, oldEdge.targetHandle,
			);
		}
		// Connect the new audio path
		if (newConnection.source && newConnection.target &&
			newConnection.sourceHandle && newConnection.targetHandle) {
			engine.connectAudioNodes(
				newConnection.source, newConnection.sourceHandle,
				newConnection.target, newConnection.targetHandle,
			);
		}
		set({
			edges:        reconnectEdge(oldEdge, newConnection, get().edges),
			audioVersion: get().audioVersion + 1,
		});
	},

	addStubNode: (kind, position) => {
		const id = `${kind}-${Date.now()}`;
		// Stubs have no audio entry — they are UI-only for now
		const newNode: AppNode = {
			id,
			type:     'stub',
			position,
			data:     { label: stubLabel(kind), kind },
		};
		set({ nodes: [...get().nodes, newNode] });
		return id;
	},

	addNode: (type, position, extraData) => {
		const id   = `${type}-${Date.now()}`;
		const data = engine.createNode(type, id, extraData);
		if (!data) {
			console.warn(`[addNode] no handler registered for type "${type}"`);
			return '';
		}
		const newNode = { id, type: type as AppNode['type'], position, data } as AppNode;
		set({ nodes: [...get().nodes, newNode], audioVersion: get().audioVersion + 1 });
		return id;
	},

	setNodeParam: (id, update) => {
		const node = get().nodes.find(n => n.id === id);
		if (!node || !node.type) return;
		engine.setNodeParam(node.type, id, update);
		set({
			nodes: get().nodes.map(n =>
				n.id === id ? ({ ...n, data: { ...n.data, ...update } } as AppNode) : n,
			),
		});
	},

	startNode: async (id) => {
		const node = get().nodes.find(n => n.id === id);
		if (!node || !node.type) return;
		const started = await engine.startNode(node.type, id, get().edges);
		if (started) get().setNodePlaying(id, true);
	},

	stopNode: (id) => {
		const node = get().nodes.find(n => n.id === id);
		if (!node || !node.type) return;
		engine.stopNode(node.type, id);
		get().setNodePlaying(id, false);
	},

	updateNodeData: (id, data) => {
		set({
			nodes: get().nodes.map(n =>
				n.id === id ? ({ ...n, data: { ...n.data, ...data } } as AppNode) : n,
			),
		});
	},

	setSelectedNodeId: (id) => set({ selectedNodeId: id }),

	// Only one Solo/Channel instance can be soloed at a time (Tone.Solo's own
	// static registry enforces this on the audio side, ADR-0003) — this field
	// is the UI's mirror of that, letting every Solo node's component dim
	// itself when a *different* instance is the soloed one.
	toggleSolo: (id) => {
		const current = get().soloedNodeId;
		if (current === id) {
			engine.setSoloed(id, false);
			set({ soloedNodeId: null });
		} else {
			engine.setSoloed(id, true);
			set({ soloedNodeId: id });
		}
	},

	setSpeakersMuted: (muted) => {
		engine.setSpeakersMuted(muted);
		set({
			nodes: get().nodes.map(n =>
				n.id === MASTER_NODE_ID
					? ({ ...n, data: { ...n.data, speakersMuted: muted } } as AppNode)
					: n,
			),
		});
	},

	loadPatch: (patch) => {
		const { nodes: currentNodes, edges: currentEdges, sceneRunning } = get();

		if (sceneRunning) {
			engine.stopSceneInput();
		}

		// Disconnect every current audio edge
		for (const edge of currentEdges) {
			if (edge.sourceHandle && edge.targetHandle) {
				engine.disconnectAudioNodes(edge.source, edge.sourceHandle, edge.target, edge.targetHandle);
			}
		}

		// Dispose all non-protected audio nodes
		for (const node of currentNodes) {
			if (node.id !== MASTER_NODE_ID && node.id !== SCENE_INPUT_ID) {
				engine.disposeNode(node.id);
			}
		}

		// Apply master output settings from patch
		const patchMaster = patch.nodes.find(n => n.id === MASTER_NODE_ID);
		if (patchMaster?.type === 'masterOutput') {
			const d = patchMaster.data as MasterOutputNodeData;
			engine.setSpeakersMuted(d.speakersMuted);
		}

		// Reconstruct audio entries from patch node data
		for (const node of patch.nodes) {
			if (node.id === MASTER_NODE_ID || node.id === SCENE_INPUT_ID) continue;
			engine.createNode(node.type ?? '', node.id, node.data);
		}

		// Wire edges per patch
		for (const edge of patch.edges) {
			if (edge.sourceHandle && edge.targetHandle) {
				engine.connectAudioNodes(edge.source, edge.sourceHandle, edge.target, edge.targetHandle);
			}
		}

		// Ensure protected nodes keep deletable: false
		const restoredNodes = patch.nodes.map(n =>
			(n.id === MASTER_NODE_ID || n.id === SCENE_INPUT_ID)
				? { ...n, deletable: false }
				: n,
		);

		set({
			nodes:          restoredNodes,
			edges:          patch.edges,
			edgePathType:   patch.edgePathType,
			audioVersion:   get().audioVersion + 1,
			sceneRunning:   false,
			selectedNodeId: null,
			playingNodes:   new Set<string>(),
			soloedNodeId:   null,
		});
	},

}));

/**
 * Returns true if any of the master output's R/G/B handles (in-2, in-3, in-4)
 * has an inbound edge. Used by the visualiser to decide between per-sample
 * R/G/B colouring and the phosphor hue fallback.
 */
export function isMasterMultichannel(edges: AppEdge[]): boolean {
	return edges.some(e =>
		e.target === MASTER_NODE_ID &&
		(e.targetHandle === 'in-2' || e.targetHandle === 'in-3' || e.targetHandle === 'in-4'),
	);
}

// ─── Patch export helpers ─────────────────────────────────────────────────────

export function exportPatch(name: string): PatchFile {
	const { nodes, edges, edgePathType } = useDawStore.getState();
	return { version: 1, savedAt: new Date().toISOString(), name, nodes, edges, edgePathType };
}

export function downloadPatch(patch: PatchFile, filenameStem?: string): void {
	const stem = filenameStem ?? (patch.name.replace(/[^a-z0-9]/gi, '_') || 'patch');
	const blob = new Blob([JSON.stringify(patch, null, 2)], { type: 'application/json' });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement('a');
	a.href     = url;
	a.download = `${stem}.reactoscope.json`;
	a.click();
	URL.revokeObjectURL(url);
}

// Bring up the audio engine (async). writeSceneAudio() guards against the scene
// entry not existing, so early writes are silently dropped.
// Exported so App.tsx can await full init before loading a default patch.
//
// `?isolate=viz` (see isolationMode.ts) skips this entirely — no Tone.js
// context, no worklets, no Scene Input scanning — so a soak run can attribute
// footprint growth to the WebGL/Three.js rendering side alone. See issue #4.
export const dawInitPromise = isolationMode === 'viz'
	? Promise.resolve()
	: engine.initAudioEngine();

// ─── Dev-only memory-tracking hook ─────────────────────────────────────────────
// Exposes the live audio node registry and store on window for console /
// evaluate_script polling while diagnosing native-memory (GPU, audio-thread)
// leaks that don't show up in performance.memory or a JS heap snapshot.
if (import.meta.env.DEV && typeof window !== 'undefined') {
	(window as unknown as { __reactoscope?: Record<string, unknown> }).__reactoscope = {
		store:                          useDawStore,
		audioNodes:                     engine._audioNodes,
		getWorkletStats:                engine.getSceneInputWorkletStats,
		getWaveformCaptureWorkletStats: engine.getWaveformCaptureWorkletStats,
		isolationMode,
		excludedAudioComponents:        [...excludedAudioComponents],
		testTone,
		// scopeRenderer / sceneRenderer are stashed by the two <Canvas onCreated>
		// hooks (VisualizationCanvasR3F.tsx, InputPanel.tsx) once each mounts.
	};
}
