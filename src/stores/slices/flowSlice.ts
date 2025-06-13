import type { StateCreator } from 'zustand';
import type { Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { AppNode } from '../../nodes/types';

export interface FlowState {
	nodes: AppNode[];
	edges: Edge[];
}

export interface FlowActions {
	setNodes: (nodes: AppNode[]) => void;
	setEdges: (edges: Edge[]) => void;
	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: (changes: EdgeChange[]) => void;
	onConnect: (connection: Connection) => void;
	addNode: (node: AppNode) => void;
	removeNode: (nodeId: string) => void;
	updateNode: (nodeId: string, data: Partial<AppNode['data']>) => void;
	addEdgeConnection: (edge: Edge) => void;
	removeEdge: (edgeId: string) => void;
	initializeFlow: (initialNodes: AppNode[], initialEdges: Edge[]) => void;
	resetFlow: () => void;
}

export interface FlowSlice extends FlowState, FlowActions {}

const FLOW_STORAGE_KEY = 'reactoscope-flow-state';

// Helper function to save state to localStorage
const saveFlowState = (state: FlowState) => {
	try {
		const stateToSave = {
			nodes: state.nodes,
			edges: state.edges,
			timestamp: Date.now(),
		};
		localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(stateToSave));
		console.log('💾 Flow state persisted to localStorage');
	} catch (error) {
		console.error('❌ Failed to persist flow state:', error);
	}
};

// Helper function to load state from localStorage
const loadFlowState = (): FlowState | null => {
	try {
		const savedState = localStorage.getItem(FLOW_STORAGE_KEY);
		if (!savedState) return null;

		const parsed = JSON.parse(savedState);

		// Validate the structure
		if (
			!parsed.nodes ||
			!parsed.edges ||
			!Array.isArray(parsed.nodes) ||
			!Array.isArray(parsed.edges)
		) {
			console.warn('⚠️ Invalid flow state structure in localStorage, ignoring');
			return null;
		}

		console.log('📋 Flow state loaded from localStorage:', {
			nodesCount: parsed.nodes.length,
			edgesCount: parsed.edges.length,
			timestamp: new Date(parsed.timestamp || 0).toISOString(),
		});

		return {
			nodes: parsed.nodes,
			edges: parsed.edges,
		};
	} catch (error) {
		console.error('❌ Failed to load flow state from localStorage:', error);
		return null;
	}
};

export const createFlowSlice: StateCreator<FlowSlice, [], [], FlowSlice> = (
	set
) => ({
	// Initial state
	nodes: [],
	edges: [],

	// Actions
	setNodes: (nodes) => {
		console.log(`🔄 Setting ${nodes.length} nodes`);
		set((state) => {
			const newState = { nodes, edges: state.edges };
			saveFlowState(newState);
			return { nodes };
		});
	},

	setEdges: (edges) => {
		console.log(`🔄 Setting ${edges.length} edges`);
		set((state) => {
			const newState = { nodes: state.nodes, edges };
			saveFlowState(newState);
			return { edges };
		});
	},

	onNodesChange: (changes) => {
		console.log('🔄 Applying node changes:', changes);
		set((state) => {
			const newNodes = applyNodeChanges(changes, state.nodes) as AppNode[];
			const newState = { nodes: newNodes, edges: state.edges };
			saveFlowState(newState);
			return { nodes: newNodes };
		});
	},

	onEdgesChange: (changes) => {
		console.log('🔄 Applying edge changes:', changes);
		set((state) => {
			const newEdges = applyEdgeChanges(changes, state.edges);
			const newState = { nodes: state.nodes, edges: newEdges };
			saveFlowState(newState);
			return { edges: newEdges };
		});
	},

	onConnect: (connection) => {
		console.log('🔌 Creating new connection:', connection);
		set((state) => {
			const newEdges = addEdge(
				{ ...connection, type: 'floating' },
				state.edges
			);
			const newState = { nodes: state.nodes, edges: newEdges };
			saveFlowState(newState);
			return { edges: newEdges };
		});
	},

	addNode: (node) => {
		console.log(`➕ Adding node: ${node.id}`);
		set((state) => {
			const newNodes = [...state.nodes, node];
			const newState = { nodes: newNodes, edges: state.edges };
			saveFlowState(newState);
			return { nodes: newNodes };
		});
	},

	removeNode: (nodeId) => {
		console.log(`🗑️ Removing node: ${nodeId}`);
		set((state) => {
			const newNodes = state.nodes.filter((node) => node.id !== nodeId);
			// Also remove edges connected to this node
			const newEdges = state.edges.filter(
				(edge) => edge.source !== nodeId && edge.target !== nodeId
			);
			const newState = { nodes: newNodes, edges: newEdges };
			saveFlowState(newState);
			return { nodes: newNodes, edges: newEdges };
		});
	},

	updateNode: (nodeId, data) => {
		console.log(`🔧 Updating node ${nodeId}:`, data);
		set((state) => {
			const newNodes = state.nodes.map((node) =>
				node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
			) as AppNode[];
			const newState = { nodes: newNodes, edges: state.edges };
			saveFlowState(newState);
			return { nodes: newNodes };
		});
	},

	addEdgeConnection: (edge) => {
		console.log(`🔗 Adding edge: ${edge.id}`);
		set((state) => {
			const newEdges = [...state.edges, edge];
			const newState = { nodes: state.nodes, edges: newEdges };
			saveFlowState(newState);
			return { edges: newEdges };
		});
	},

	removeEdge: (edgeId) => {
		console.log(`✂️ Removing edge: ${edgeId}`);
		set((state) => {
			const newEdges = state.edges.filter((edge) => edge.id !== edgeId);
			const newState = { nodes: state.nodes, edges: newEdges };
			saveFlowState(newState);
			return { edges: newEdges };
		});
	},

	initializeFlow: (initialNodes, initialEdges) => {
		console.log('🚀 Initializing flow state...');

		// Try to load from localStorage first
		const savedState = loadFlowState();

		if (savedState && savedState.nodes.length > 0) {
			console.log('📋 Using saved flow state from localStorage');
			set(() => savedState);
		} else {
			console.log('🆕 Using initial flow state');
			const newState = {
				nodes: initialNodes,
				edges: initialEdges,
			};
			set(() => newState);
			saveFlowState(newState);
		}
	},

	resetFlow: () => {
		console.log('🔄 Resetting flow state');
		set(() => ({
			nodes: [],
			edges: [],
		}));
		// Clear localStorage
		localStorage.removeItem(FLOW_STORAGE_KEY);
		console.log('🧹 Flow state cleared from localStorage');
	},
});
