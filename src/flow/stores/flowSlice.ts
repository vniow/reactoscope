/**
 * Flow Store Slice - Manages React Flow state and operations
 *
 * This slice handles:
 * - Node and edge state management
 * - Flow operations (add, remove, update)
 * - Save/restore functionality
 * - Persiste			appStore.registerConnection(
				newEdge.id,
				connection.source,
				connection.target,
				connection.sourceHandle || undefined,
				connection.targetHandle || undefined
			);localStorage
 * - Audio node integration
 *
 * Follows the sliced store architecture pattern for predictable state management.
 *
 * @module flowSlice
 */
import type { StateCreator } from 'zustand';
import type { Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { AppNode } from '../../nodes/types';
import type { BaseNodeData } from '../../nodes/types';
import { NODE_TYPE_MAPPING } from '../../audio/types';
import type { AppStore } from '../../shared/stores/types';

/**
 * Flow state interface containing nodes, edges, and saved states
 */
export interface FlowState {
	nodes: AppNode[];
	edges: Edge[];
	savedStates: SavedFlowState[];
}

/**
 * Saved flow state for persistence functionality
 */
export interface SavedFlowState {
	id: string;
	name: string;
	timestamp: number;
	nodes: AppNode[];
	edges: Edge[];
	description?: string;
}

/**
 * Flow actions interface defining all available operations
 * Following the action-based updates pattern
 */
export interface FlowActions {
	// Basic setters
	setNodes: (nodes: AppNode[]) => void;
	setEdges: (edges: Edge[]) => void;

	// React Flow event handlers
	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: (changes: EdgeChange[]) => void;
	onConnect: (connection: Connection) => void;
	onReconnect: (oldEdge: Edge, newConnection: Connection) => void;

	// Node operations
	addNode: (node: AppNode) => void;
	removeNode: (nodeId: string) => void;
	updateNode: (nodeId: string, data: Partial<AppNode['data']>) => void;

	// Edge operations
	addEdgeConnection: (edge: Edge) => void;
	removeEdge: (edgeId: string) => void;

	// Flow management
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

export const createFlowSlice: StateCreator<AppStore, [], [], FlowSlice> = (
	set,
	get
) => ({
	// Initial state
	nodes: [],
	edges: [],
	savedStates: loadSavedStates(), // Load saved states on initialization

	// Actions
	setNodes: (nodes) => {
		set((state) => {
			saveCurrentFlowState(nodes, state.edges);
			return { nodes };
		});
	},

	setEdges: (edges) => {
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
		// Handle edge removals to unregister audio connections
		const removeChanges = changes.filter((change) => change.type === 'remove');
		const appStore = get() as AppStore;

		removeChanges.forEach((change) => {
			if (change.type === 'remove' && appStore.unregisterConnection) {
				appStore.unregisterConnection(change.id);
			}
		});

		set((state) => {
			const newEdges = applyEdgeChanges(changes, state.edges);
			saveCurrentFlowState(state.nodes, newEdges);
			return { edges: newEdges };
		});
	},

	onConnect: (connection) => {
		// Always generate a unique edge ID to allow multiple edges between the same handles
		const uniqueId = `xy-edge__${connection.source}${connection.sourceHandle || ''}-${connection.target}${connection.targetHandle || ''}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
		const newEdge = { ...connection, type: 'gradient', id: uniqueId };

		set((state) => {
			const newEdges = [...state.edges, newEdge];
			saveCurrentFlowState(state.nodes, newEdges);
			return { edges: newEdges };
		});

		// Create audio connection with the new edge ID
		const appStore = get() as AppStore;
		if (appStore.registerConnection) {
			appStore.registerConnection(
				newEdge.id,
				connection.source,
				connection.target,
				connection.sourceHandle || undefined,
				connection.targetHandle || undefined
			);
		}
	},

	onReconnect: (oldEdge, newConnection) => {
		const appStore = get() as AppStore;

		// Step 1: Unregister the old audio connection
		if (appStore.unregisterConnection) {
			appStore.unregisterConnection(oldEdge.id);
		}

		// Step 2: Remove the old edge and add a new one with proper ID generation
		// This prevents duplicate key issues when handles change
		const newEdge = {
			...oldEdge,
			source: newConnection.source,
			target: newConnection.target,
			sourceHandle: newConnection.sourceHandle,
			targetHandle: newConnection.targetHandle,
			// Generate a new ID if handles changed to prevent conflicts
			id:
				oldEdge.sourceHandle !== newConnection.sourceHandle ||
				oldEdge.targetHandle !== newConnection.targetHandle
					? `xy-edge__${newConnection.source}${newConnection.sourceHandle || ''}-${newConnection.target}${newConnection.targetHandle || ''}`
					: oldEdge.id,
		};

		set((state) => {
			const newEdges = state.edges.map((edge) => {
				if (edge.id === oldEdge.id) {
					return newEdge;
				}
				return edge;
			});
			saveCurrentFlowState(state.nodes, newEdges);
			return { edges: newEdges };
		});

		// Step 3: Register new audio connection with the correct edge ID
		if (appStore.registerConnection) {
			// Use raw IDs; audioRegistrySlice will handle XYscope mapping
			appStore.registerConnection(
				newEdge.id,
				newConnection.source,
				newConnection.target,
				newConnection.sourceHandle || undefined,
				newConnection.targetHandle || undefined
			);
		}
	},

	addNode: (node) => {
		set((state) => {
			const newNodes = [...state.nodes, node];
			saveCurrentFlowState(newNodes, state.edges);
			return { nodes: newNodes };
		});

		// Create corresponding audio node if it's an audio node type
		const nodeData = node.data as BaseNodeData;

		// Skip automatic audio registration for dynamic nodes that handle their own registration
		// Dynamic nodes (effect, source, component, etc.) register themselves in their components
		const isDynamicNode = node.type
			? ['effect', 'source', 'component', 'instrument'].includes(node.type)
			: false;

		if (!isDynamicNode) {
			const nodeTypeKey = `${nodeData.variant || node.type}.${node.type}`;
			const audioNodeType = NODE_TYPE_MAPPING[nodeTypeKey];

			if (audioNodeType) {
				const appStore = get() as AppStore;
				appStore.registerAudioNode(
					node.id,
					audioNodeType,
					nodeData.audioParams
				);
			}
		}
	},

	removeNode: (nodeId) => {
		// Get edges that will be removed
		const state = get();
		const edgesToRemove = state.edges.filter(
			(edge) => edge.source === nodeId || edge.target === nodeId
		);

		// Unregister audio connections for affected edges first
		const appStore = get() as AppStore;
		edgesToRemove.forEach((edge) => {
			if (appStore.unregisterConnection) {
				appStore.unregisterConnection(edge.id);
			}
		});

		// Unregister audio node
		if (appStore.unregisterAudioNode) {
			appStore.unregisterAudioNode(nodeId);
		}

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
		set((state) => {
			const newNodes = state.nodes.map((node) =>
				node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
			) as AppNode[];
			saveCurrentFlowState(newNodes, state.edges);
			return { nodes: newNodes };
		});
	},

	addEdgeConnection: (edge) => {
		set((state) => {
			const newEdges = [...state.edges, edge];
			saveCurrentFlowState(state.nodes, newEdges);
			return { edges: newEdges };
		});
	},

	removeEdge: (edgeId) => {
		// Unregister audio connection first
		const appStore = get() as AppStore;
		if (appStore.unregisterConnection) {
			appStore.unregisterConnection(edgeId);
		}

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
			// console.log('🆕 Using initial flow state');
			const newState = {
				nodes: initialNodes,
				edges: initialEdges,
			};
			set(() => newState);
			saveCurrentFlowState(initialNodes, initialEdges);
		}
	},

	resetFlow: () => {
		set(() => ({
			nodes: [],
			edges: [],
		}));
		// Clear localStorage
		localStorage.removeItem(FLOW_STORAGE_KEY);
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

			return true;
		} catch (error) {
			console.error('❌ Failed to import flow state:', error);
			return false;
		}
	},
});
