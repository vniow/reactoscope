import type { StateCreator } from 'zustand';
import type { Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { AppNode } from '../../nodes/types';

export interface FlowState {
	nodes: AppNode[];
	edges: Edge[];
	savedStates: SavedFlowState[];
}

export interface SavedFlowState {
	id: string;
	name: string;
	timestamp: number;
	nodes: AppNode[];
	edges: Edge[];
	description?: string;
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
	// Save/Restore functionality
	saveFlowState: (name: string, description?: string) => string;
	restoreFlowState: (savedStateId: string) => boolean;
	deleteSavedState: (savedStateId: string) => void;
	exportFlowState: () => string;
	importFlowState: (jsonData: string) => boolean;
}

export interface FlowSlice extends FlowState, FlowActions {}

const FLOW_STORAGE_KEY = 'reactoscope-flow-state';
const SAVED_STATES_KEY = 'reactoscope-saved-states';

// Helper function to save current state to localStorage
const saveCurrentFlowState = (nodes: AppNode[], edges: Edge[]) => {
	try {
		const stateToSave = {
			nodes,
			edges,
			timestamp: Date.now(),
		};
		localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(stateToSave));
		// console.log('💾 Flow state persisted to localStorage');
	} catch (error) {
		console.error('❌ Failed to persist flow state:', error);
	}
};

// Helper function to save named states to localStorage
const saveSavedStates = (savedStates: SavedFlowState[]) => {
	try {
		localStorage.setItem(SAVED_STATES_KEY, JSON.stringify(savedStates));
		console.log('💾 Saved states persisted to localStorage');
	} catch (error) {
		console.error('❌ Failed to persist saved states:', error);
	}
};

// Helper function to load saved states from localStorage
const loadSavedStates = (): SavedFlowState[] => {
	try {
		const savedStates = localStorage.getItem(SAVED_STATES_KEY);
		if (!savedStates) return [];

		return JSON.parse(savedStates);
	} catch (error) {
		console.error('❌ Failed to load saved states:', error);
		return [];
	}
};

// Helper function to load state from localStorage
const loadFlowState = (): { nodes: AppNode[]; edges: Edge[] } | null => {
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

		// console.log('📋 Flow state loaded from localStorage:', {
		// 	nodesCount: parsed.nodes.length,
		// 	edgesCount: parsed.edges.length,
		// 	timestamp: new Date(parsed.timestamp || 0).toISOString(),
		// });

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
	set,
	get
) => ({
	// Initial state
	nodes: [],
	edges: [],
	savedStates: loadSavedStates(), // Load saved states on initialization

	// Actions
	setNodes: (nodes) => {
		console.log(`🔄 Setting ${nodes.length} nodes`);
		set((state) => {
			saveCurrentFlowState(nodes, state.edges);
			return { nodes };
		});
	},

	setEdges: (edges) => {
		console.log(`🔄 Setting ${edges.length} edges`);
		set((state) => {
			saveCurrentFlowState(state.nodes, edges);
			return { edges };
		});
	},

	onNodesChange: (changes) => {
		// console.log('🔄 Applying node changes:', changes);
		set((state) => {
			const newNodes = applyNodeChanges(changes, state.nodes) as AppNode[];
			saveCurrentFlowState(newNodes, state.edges);
			return { nodes: newNodes };
		});
	},

	onEdgesChange: (changes) => {
		console.log('🔄 Applying edge changes:', changes);
		set((state) => {
			const newEdges = applyEdgeChanges(changes, state.edges);
			saveCurrentFlowState(state.nodes, newEdges);
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
			saveCurrentFlowState(state.nodes, newEdges);
			return { edges: newEdges };
		});
	},

	addNode: (node) => {
		console.log(`➕ Adding node: ${node.id}`);
		set((state) => {
			const newNodes = [...state.nodes, node];
			saveCurrentFlowState(newNodes, state.edges);
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
			saveCurrentFlowState(newNodes, newEdges);
			return { nodes: newNodes, edges: newEdges };
		});
	},

	updateNode: (nodeId, data) => {
		console.log(`🔧 Updating node ${nodeId}:`, data);
		set((state) => {
			const newNodes = state.nodes.map((node) =>
				node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
			) as AppNode[];
			saveCurrentFlowState(newNodes, state.edges);
			return { nodes: newNodes };
		});
	},

	addEdgeConnection: (edge) => {
		console.log(`🔗 Adding edge: ${edge.id}`);
		set((state) => {
			const newEdges = [...state.edges, edge];
			saveCurrentFlowState(state.nodes, newEdges);
			return { edges: newEdges };
		});
	},

	removeEdge: (edgeId) => {
		console.log(`✂️ Removing edge: ${edgeId}`);
		set((state) => {
			const newEdges = state.edges.filter((edge) => edge.id !== edgeId);
			saveCurrentFlowState(state.nodes, newEdges);
			return { edges: newEdges };
		});
	},

	initializeFlow: (initialNodes, initialEdges) => {
		// console.log('🚀 Initializing flow state...');

		// Try to load from localStorage first
		const savedState = loadFlowState();

		if (savedState && savedState.nodes.length > 0) {
			// console.log('📋 Using saved flow state from localStorage');
			set(() => savedState);
		} else {
			console.log('🆕 Using initial flow state');
			const newState = {
				nodes: initialNodes,
				edges: initialEdges,
			};
			set(() => newState);
			saveCurrentFlowState(initialNodes, initialEdges);
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

	// Save/Restore functionality
	saveFlowState: (name: string, description?: string) => {
		const id = Date.now().toString();
		set((state) => {
			const newSavedState: SavedFlowState = {
				id,
				name,
				timestamp: Date.now(),
				nodes: state.nodes,
				edges: state.edges,
				description,
			};
			const newSavedStates = [...state.savedStates, newSavedState];
			saveSavedStates(newSavedStates);
			return { savedStates: newSavedStates };
		});
		return id;
	},

	restoreFlowState: (savedStateId: string) => {
		let success = false;
		set((state) => {
			const savedState = state.savedStates.find(
				(saved) => saved.id === savedStateId
			);
			if (!savedState) {
				success = false;
				return {};
			}

			saveCurrentFlowState(savedState.nodes, savedState.edges);
			success = true;
			return {
				nodes: savedState.nodes,
				edges: savedState.edges,
			};
		});
		return success;
	},

	deleteSavedState: (savedStateId: string) => {
		set((state) => {
			const newSavedStates = state.savedStates.filter(
				(saved) => saved.id !== savedStateId
			);
			saveSavedStates(newSavedStates);
			return { savedStates: newSavedStates };
		});
	},

	exportFlowState: () => {
		const state = get();
		const flowState = JSON.stringify({
			nodes: state.nodes,
			edges: state.edges,
			timestamp: Date.now(),
		});
		const blob = new Blob([flowState], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `flow-state-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		return flowState;
	},

	importFlowState: (jsonData: string) => {
		try {
			const parsedData = JSON.parse(jsonData);

			// Validate structure
			if (
				!parsedData.nodes ||
				!parsedData.edges ||
				!Array.isArray(parsedData.nodes) ||
				!Array.isArray(parsedData.edges)
			) {
				console.error('❌ Invalid flow state structure in import data');
				return false;
			}

			set(() => ({
				nodes: parsedData.nodes,
				edges: parsedData.edges,
			}));

			// Save the imported state
			saveCurrentFlowState(parsedData.nodes, parsedData.edges);

			console.log('✅ Flow state imported successfully');
			return true;
		} catch (error) {
			console.error('❌ Failed to import flow state:', error);
			return false;
		}
	},
});
