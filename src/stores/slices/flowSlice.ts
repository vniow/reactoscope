import type { StateCreator } from 'zustand';
import type { Edge, Position } from '@xyflow/react';
import type { AppNode } from '../../nodes/types';
import type { AppStore } from '../types';
import { getNodeHandlePositions } from '../../utils/handlePositioning';

type FlowSliceProps = Pick<
	AppStore,
	| 'flow'
	| 'addNode'
	| 'updateNode'
	| 'removeNode'
	| 'moveNode'
	| 'addEdge'
	| 'updateEdge'
	| 'removeEdge'
	| 'updateHandlePositions'
	| 'recalculateAllHandlePositions'
	| 'batchUpdateNodes'
	| 'batchUpdateEdges'
	| 'setViewport'
	| 'setNodes'
	| 'setEdges'
	| 'applyNodesChange'
	| 'applyEdgesChange'
>;

export const createFlowSlice: StateCreator<AppStore, [], [], FlowSliceProps> = (
	set,
	get
) => ({
	// Initial state
	flow: {
		nodes: [],
		edges: [],
		nodeHandlePositions: {},
		viewport: { x: 0, y: 0, zoom: 1 },
	},

	// Node Actions
	addNode: (node: AppNode) => {
		console.log(`🔵 Adding node to store:`, node.id, node.type);

		set((state) => ({
			flow: {
				...state.flow,
				nodes: [...state.flow.nodes, node],
			},
		}));

		// Recalculate handle positions after adding node
		get().recalculateAllHandlePositions();

		console.log(`✅ Node added, total nodes: ${get().flow.nodes.length}`);
	},

	updateNode: (id: string, updates: Partial<AppNode>) => {
		set((state) => ({
			flow: {
				...state.flow,
				nodes: state.flow.nodes.map((node) =>
					node.id === id ? ({ ...node, ...updates } as AppNode) : node
				),
			},
		}));

		// Recalculate handle positions if position changed
		if (updates.position) {
			get().recalculateAllHandlePositions();
		}
	},

	removeNode: (id: string) => {
		set((state) => ({
			flow: {
				...state.flow,
				nodes: state.flow.nodes.filter((node) => node.id !== id),
				edges: state.flow.edges.filter(
					(edge) => edge.source !== id && edge.target !== id
				),
				nodeHandlePositions: Object.fromEntries(
					Object.entries(state.flow.nodeHandlePositions).filter(
						([nodeId]) => nodeId !== id
					)
				),
			},
		}));
	},

	moveNode: (id: string, position: { x: number; y: number }) => {
		get().updateNode(id, { position });
	},

	// Edge Actions
	addEdge: (edge: Edge) => {
		console.log(
			`🔗 Adding edge to store:`,
			edge.id,
			`${edge.source} -> ${edge.target}`
		);

		set((state) => ({
			flow: {
				...state.flow,
				edges: [...state.flow.edges, edge],
			},
		}));

		// Recalculate handle positions for connected nodes
		const { flow } = get();
		const sourceNode = flow.nodes.find((n) => n.id === edge.source);
		const targetNode = flow.nodes.find((n) => n.id === edge.target);

		if (sourceNode) {
			get().updateHandlePositions(
				edge.source,
				getNodeHandlePositions(edge.source, flow.nodes, flow.edges)
			);
		}
		if (targetNode) {
			get().updateHandlePositions(
				edge.target,
				getNodeHandlePositions(edge.target, flow.nodes, flow.edges)
			);
		}

		console.log(`✅ Edge added, total edges: ${get().flow.edges.length}`);
	},

	updateEdge: (id: string, updates: Partial<Edge>) => {
		set((state) => ({
			flow: {
				...state.flow,
				edges: state.flow.edges.map((edge) =>
					edge.id === id ? { ...edge, ...updates } : edge
				),
			},
		}));
	},

	removeEdge: (id: string) => {
		const { flow } = get();
		const edgeToRemove = flow.edges.find((e) => e.id === id);

		set((state) => ({
			flow: {
				...state.flow,
				edges: state.flow.edges.filter((edge) => edge.id !== id),
			},
		}));

		// Recalculate handle positions for previously connected nodes
		if (edgeToRemove) {
			const { flow: updatedFlow } = get();
			get().updateHandlePositions(
				edgeToRemove.source,
				getNodeHandlePositions(
					edgeToRemove.source,
					updatedFlow.nodes,
					updatedFlow.edges
				)
			);
			get().updateHandlePositions(
				edgeToRemove.target,
				getNodeHandlePositions(
					edgeToRemove.target,
					updatedFlow.nodes,
					updatedFlow.edges
				)
			);
		}
	},

	// Handle Position Actions
	updateHandlePositions: (
		nodeId: string,
		positions: Record<string, Position>
	) => {
		set((state) => ({
			flow: {
				...state.flow,
				nodeHandlePositions: {
					...state.flow.nodeHandlePositions,
					[nodeId]: positions,
				},
			},
		}));
	},

	recalculateAllHandlePositions: () => {
		const { flow } = get();
		const newHandlePositions: Record<string, Record<string, Position>> = {};

		flow.nodes.forEach((node) => {
			newHandlePositions[node.id] = getNodeHandlePositions(
				node.id,
				flow.nodes,
				flow.edges
			);
		});

		set((state) => ({
			flow: {
				...state.flow,
				nodeHandlePositions: newHandlePositions,
			},
		}));
	},

	// Batch Actions
	batchUpdateNodes: (
		updates: Array<{ id: string; updates: Partial<AppNode> }>
	) => {
		set((state) => ({
			flow: {
				...state.flow,
				nodes: state.flow.nodes.map((node) => {
					const update = updates.find((u) => u.id === node.id);
					return update ? ({ ...node, ...update.updates } as AppNode) : node;
				}),
			},
		}));

		// Check if any position updates occurred
		const hasPositionUpdates = updates.some((u) => u.updates.position);
		if (hasPositionUpdates) {
			get().recalculateAllHandlePositions();
		}
	},

	batchUpdateEdges: (
		updates: Array<{ id: string; updates: Partial<Edge> }>
	) => {
		set((state) => ({
			flow: {
				...state.flow,
				edges: state.flow.edges.map((edge) => {
					const update = updates.find((u) => u.id === edge.id);
					return update ? { ...edge, ...update.updates } : edge;
				}),
			},
		}));
	},

	// Viewport Actions
	setViewport: (viewport: { x: number; y: number; zoom: number }) => {
		set((state) => ({
			flow: {
				...state.flow,
				viewport,
			},
		}));
	},

	// Bulk setters for initial data
	setNodes: (nodes: AppNode[]) => {
		console.log(`📦 Setting initial nodes in store: ${nodes.length} nodes`);

		set((state) => ({
			flow: {
				...state.flow,
				nodes,
			},
		}));
		// get().recalculateAllHandlePositions(); // Removed to break potential loop

		console.log(`✅ Nodes initialized in store`);
	},

	setEdges: (edges: Edge[]) => {
		console.log(`🔗 Setting initial edges in store: ${edges.length} edges`);

		set((state) => ({
			flow: {
				...state.flow,
				edges,
			},
		}));
		// get().recalculateAllHandlePositions(); // Removed to break potential loop

		console.log(`✅ Edges initialized in store`);
	},

	// React Flow change handlers (these should not trigger handle recalculation to avoid loops)
	applyNodesChange: (nodes: AppNode[]) => {
		set((state) => ({
			flow: {
				...state.flow,
				nodes,
			},
		}));
	},

	applyEdgesChange: (edges: Edge[]) => {
		set((state) => ({
			flow: {
				...state.flow,
				edges,
			},
		}));
	},
});
