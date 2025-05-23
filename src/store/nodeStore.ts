import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
	Node,
	Edge,
	Connection,
	NodeChange,
	EdgeChange,
} from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import {
	getDefaultNodeDataFromRegistry,
	NODE_REGISTRY_MAP,
	type NodeData,
} from '../types/nodes';

// Extended Node type that includes our custom data
export interface AppNode extends Node {
	data: NodeData;
}

// Store interface
interface NodeStore {
	// State
	nodes: AppNode[];
	edges: Edge[];

	// Actions
	setNodes: (nodes: AppNode[]) => void;
	setEdges: (edges: Edge[]) => void;
	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: (changes: EdgeChange[]) => void;
	onConnect: (connection: Connection) => void;

	// Node management
	addNode: (
		nodeRegistrationKey: string,
		position?: { x: number; y: number }
	) => string;
	removeNode: (nodeId: string) => void;
	updateNodeData: (nodeId: string, newData: Partial<NodeData>) => void;
	getNode: (nodeId: string) => AppNode | undefined;

	// Edge management
	addEdge: (edge: Edge) => void;
	removeEdge: (edgeId: string) => void;

	// Utility
	clearAll: () => void;
	getAvailableNodeTypes: () => typeof NODE_REGISTRY_MAP;
}

// Create the store
export const useNodeStore = create<NodeStore>()(
	devtools(
		(set, get) => ({
			// Initial state
			nodes: [],
			edges: [],

			// Basic setters
			setNodes: (nodes) => set({ nodes }, false, 'setNodes'),
			setEdges: (edges) => set({ edges }, false, 'setEdges'),

			// React Flow change handlers
			onNodesChange: (changes) =>
				set(
					(state) => ({
						nodes: applyNodeChanges(changes, state.nodes),
					}),
					false,
					'onNodesChange'
				),

			onEdgesChange: (changes) =>
				set(
					(state) => ({
						edges: applyEdgeChanges(changes, state.edges),
					}),
					false,
					'onEdgesChange'
				),

			onConnect: (connection) =>
				set(
					(state) => ({
						edges: addEdge(connection, state.edges),
					}),
					false,
					'onConnect'
				),

			// Node management
			addNode: (nodeRegistrationKey, position = { x: 100, y: 100 }) => {
				const id = nanoid();

				// Validate the node registration key
				if (!NODE_REGISTRY_MAP[nodeRegistrationKey]) {
					console.error(
						`Unknown node registration key: ${nodeRegistrationKey}`
					);
					return id;
				}

				// Get default data for this node type
				const data = getDefaultNodeDataFromRegistry(nodeRegistrationKey, id);

				// Create the new node
				const newNode: AppNode = {
					id,
					type: nodeRegistrationKey, // This is what React Flow uses to determine which component to render
					position,
					data,
					// dragHandle: '.node-header', // Optional: specify drag handle class
				};

				set(
					(state) => ({
						nodes: [...state.nodes, newNode],
					}),
					false,
					'addNode'
				);

				return id;
			},

			removeNode: (nodeId) =>
				set(
					(state) => ({
						nodes: state.nodes.filter((node) => node.id !== nodeId),
						edges: state.edges.filter(
							(edge) => edge.source !== nodeId && edge.target !== nodeId
						),
					}),
					false,
					'removeNode'
				),

			updateNodeData: (nodeId, newData) =>
				set(
					(state) => ({
						nodes: state.nodes.map((node) =>
							node.id === nodeId
								? {
										...node,
										data: { ...node.data, ...newData } as NodeData,
									}
								: node
						),
					}),
					false,
					'updateNodeData'
				),

			getNode: (nodeId) => {
				return get().nodes.find((node) => node.id === nodeId);
			},

			// Edge management
			addEdge: (edge) =>
				set(
					(state) => ({
						edges: [...state.edges, edge],
					}),
					false,
					'addEdge'
				),

			removeEdge: (edgeId) =>
				set(
					(state) => ({
						edges: state.edges.filter((edge) => edge.id !== edgeId),
					}),
					false,
					'removeEdge'
				),

			// Utility
			clearAll: () =>
				set(
					{
						nodes: [],
						edges: [],
					},
					false,
					'clearAll'
				),

			getAvailableNodeTypes: () => NODE_REGISTRY_MAP,
		}),
		{
			name: 'reactoscope-node-store', // Store name for devtools
		}
	)
);

// Helper hooks for specific use cases
export const useNodes = () => useNodeStore((state) => state.nodes);
export const useEdges = () => useNodeStore((state) => state.edges);
export const useNodeActions = () =>
	useNodeStore((state) => ({
		addNode: state.addNode,
		removeNode: state.removeNode,
		updateNodeData: state.updateNodeData,
		clearAll: state.clearAll,
	}));
