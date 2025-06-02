import type { Edge, Position } from '@xyflow/react';
import type { AppNode } from '../nodes/types';
import type { AudioSlice } from './slices/audioSlice';

// Theme Types
export type Theme = 'light' | 'dark' | 'system';
export type ActualTheme = 'light' | 'dark';
export type MetallicTheme =
	| 'chrome'
	| 'gold'
	| 'copper'
	| 'titanium'
	| 'rainbow';

export interface ThemeState {
	current: Theme;
	actualTheme: ActualTheme;
	metallicBackground: MetallicTheme;
}

// Flow Types
export interface FlowState {
	nodes: AppNode[];
	edges: Edge[];
	nodeHandlePositions: Record<string, Record<string, Position>>;
	viewport: { x: number; y: number; zoom: number };
}

// UI Types
export interface UIState {
	isNodeDragging: boolean;
	selectedNodes: string[];
	selectedEdges: string[];
	isConnecting: boolean;
}

// Audio Types
export interface AudioState {
	audioSlices: AudioSlice[];
	isPlaying: boolean;
	currentTime: number;
	duration: number;
}

// Action Types
export interface ThemeActions {
	setTheme: (theme: Theme) => void;
	setMetallicBackground: (metallic: MetallicTheme) => void;
	initializeTheme: () => void;
}

export interface FlowActions {
	addNode: (node: AppNode) => void;
	updateNode: (id: string, updates: Partial<AppNode>) => void;
	removeNode: (id: string) => void;
	moveNode: (id: string, position: { x: number; y: number }) => void;

	addEdge: (edge: Edge) => void;
	updateEdge: (id: string, updates: Partial<Edge>) => void;
	removeEdge: (id: string) => void;

	updateHandlePositions: (
		nodeId: string,
		positions: Record<string, Position>
	) => void;
	recalculateAllHandlePositions: () => void;

	batchUpdateNodes: (
		updates: Array<{ id: string; updates: Partial<AppNode> }>
	) => void;
	batchUpdateEdges: (
		updates: Array<{ id: string; updates: Partial<Edge> }>
	) => void;
	batchUpdateNodePositions: (
		updates: Array<{ id: string; position: { x: number; y: number } }>
	) => void;

	setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
	setNodes: (nodes: AppNode[]) => void;
	setEdges: (edges: Edge[]) => void;

	// React Flow change handlers (these should not trigger handle recalculation to avoid loops)
	applyNodesChange: (nodes: AppNode[]) => void;
	applyEdgesChange: (edges: Edge[]) => void;
}

export interface UIActions {
	setSelectedNodes: (nodeIds: string[]) => void;
	setSelectedEdges: (edgeIds: string[]) => void;
	setIsNodeDragging: (isDragging: boolean) => void;
	setIsConnecting: (isConnecting: boolean) => void;
}

// Main Store Interface
export interface AppStore
	extends ThemeActions,
		FlowActions,
		UIActions,
		AudioSlice {
	theme: ThemeState;
	flow: FlowState;
	ui: UIState;

	// Actions (flattened for easier access)
	setTheme: ThemeActions['setTheme'];
	initializeTheme: ThemeActions['initializeTheme'];

	addNode: FlowActions['addNode'];
	updateNode: FlowActions['updateNode'];
	removeNode: FlowActions['removeNode'];
	moveNode: FlowActions['moveNode'];
	addEdge: FlowActions['addEdge'];
	updateEdge: FlowActions['updateEdge'];
	removeEdge: FlowActions['removeEdge'];
	updateHandlePositions: FlowActions['updateHandlePositions'];
	recalculateAllHandlePositions: FlowActions['recalculateAllHandlePositions'];
	batchUpdateNodes: FlowActions['batchUpdateNodes'];
	batchUpdateEdges: FlowActions['batchUpdateEdges'];
	batchUpdateNodePositions: FlowActions['batchUpdateNodePositions'];
	setViewport: FlowActions['setViewport'];
	setNodes: FlowActions['setNodes'];
	setEdges: FlowActions['setEdges'];
	applyNodesChange: FlowActions['applyNodesChange'];
	applyEdgesChange: FlowActions['applyEdgesChange'];

	setSelectedNodes: UIActions['setSelectedNodes'];
	setSelectedEdges: UIActions['setSelectedEdges'];
	setIsNodeDragging: UIActions['setIsNodeDragging'];
	setIsConnecting: UIActions['setIsConnecting'];
}
