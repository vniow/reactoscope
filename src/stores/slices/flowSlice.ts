import type { StateCreator } from 'zustand';
import type { Edge, Position } from '@xyflow/react';
import type { AppNode } from '../../nodes/types';
import type { AppStore, GridHandle } from '../types';
import { getNodeHandlePositions } from '../../utils/handlePositioning';

// 🚀 PERFORMANCE: Memoization cache for handle position calculations
interface HandlePositionCache {
	hash: string;
	positions: Record<string, Record<string, Position>>;
	timestamp: number;
}

let handlePositionCache: HandlePositionCache | null = null;

// Generate hash for current state to detect changes
const generateStateHash = (nodes: AppNode[], edges: Edge[]): string => {
	const nodePositions = nodes
		.map((n) => `${n.id}:${n.position.x},${n.position.y}`)
		.join('|');
	const edgeConnections = edges.map((e) => `${e.source}-${e.target}`).join('|');
	return `nodes:${nodePositions}||edges:${edgeConnections}`;
};

// 🚀 PERFORMANCE: Memoized handle position calculation
const calculateHandlePositionsWithMemo = (
	nodes: AppNode[],
	edges: Edge[]
): Record<string, Record<string, Position>> => {
	const currentHash = generateStateHash(nodes, edges);

	// Check if we can use cached result
	if (handlePositionCache && handlePositionCache.hash === currentHash) {
		// console.log('🎯 Using cached handle positions');
		return handlePositionCache.positions;
	}

	// console.log('🔄 Calculating new handle positions');
	// const start = performance.now();

	// Calculate new positions
	const newPositions: Record<string, Record<string, Position>> = {};
	nodes.forEach((node) => {
		newPositions[node.id] = getNodeHandlePositions(node.id, nodes, edges);
	});

	// Cache the result
	handlePositionCache = {
		hash: currentHash,
		positions: newPositions,
		timestamp: Date.now(),
	};

	// const duration = performance.now() - start;
	// console.log(`✅ Handle positions calculated in ${duration.toFixed(2)}ms`);

	return newPositions;
};

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
	| 'updateNodeHandles'
	| 'addGridHandle'
	| 'removeGridHandle'
	| 'updateGridHandle'
	| 'batchUpdateNodes'
	| 'batchUpdateEdges'
	| 'batchUpdateNodePositions'
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
		gridHandles: {},
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

		// Only recalculate handle positions if the node has connections
		// This allows new nodes to use their default handle positions until connected
		const { flow } = get();
		const hasConnections = flow.edges.some(
			(edge) => edge.source === node.id || edge.target === node.id
		);

		if (hasConnections) {
			console.log(
				`📍 Node ${node.id} has connections, recalculating positions`
			);
			get().recalculateAllHandlePositions();
		} else {
			console.log(
				`📍 Node ${node.id} has no connections, using default positions`
			);
		}

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

		// Handle positions for previously connected nodes
		if (edgeToRemove) {
			const { flow: updatedFlow } = get();

			// Check if source node still has connections
			const sourceHasConnections = updatedFlow.edges.some(
				(edge) =>
					edge.source === edgeToRemove.source ||
					edge.target === edgeToRemove.source
			);

			// Check if target node still has connections
			const targetHasConnections = updatedFlow.edges.some(
				(edge) =>
					edge.source === edgeToRemove.target ||
					edge.target === edgeToRemove.target
			);

			if (sourceHasConnections) {
				// Recalculate positions for connected source node
				get().updateHandlePositions(
					edgeToRemove.source,
					getNodeHandlePositions(
						edgeToRemove.source,
						updatedFlow.nodes,
						updatedFlow.edges
					)
				);
			} else {
				// Clear positions for unconnected source node (will use defaults)
				console.log(
					`📍 Node ${edgeToRemove.source} no longer connected, clearing stored positions`
				);
				set((state) => ({
					flow: {
						...state.flow,
						nodeHandlePositions: {
							...state.flow.nodeHandlePositions,
							[edgeToRemove.source]: {},
						},
					},
				}));
			}

			if (targetHasConnections) {
				// Recalculate positions for connected target node
				get().updateHandlePositions(
					edgeToRemove.target,
					getNodeHandlePositions(
						edgeToRemove.target,
						updatedFlow.nodes,
						updatedFlow.edges
					)
				);
			} else {
				// Clear positions for unconnected target node (will use defaults)
				console.log(
					`📍 Node ${edgeToRemove.target} no longer connected, clearing stored positions`
				);
				set((state) => ({
					flow: {
						...state.flow,
						nodeHandlePositions: {
							...state.flow.nodeHandlePositions,
							[edgeToRemove.target]: {},
						},
					},
				}));
			}
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
		// console.log('🔄 Recalculating all handle positions with memoization');

		// 🚀 PERFORMANCE: Use memoized calculation
		const newHandlePositions = calculateHandlePositionsWithMemo(
			flow.nodes,
			flow.edges
		);

		set((state) => ({
			flow: {
				...state.flow,
				nodeHandlePositions: newHandlePositions,
			},
		}));
	},

	// Grid Handle Actions
	updateNodeHandles: (nodeId: string, handles: GridHandle[]) => {
		set((state) => ({
			flow: {
				...state.flow,
				gridHandles: {
					...state.flow.gridHandles,
					[nodeId]: handles,
				},
			},
		}));
	},

	addGridHandle: (nodeId: string, handle: GridHandle) => {
		set((state) => {
			const currentHandles = state.flow.gridHandles[nodeId] || [];
			return {
				flow: {
					...state.flow,
					gridHandles: {
						...state.flow.gridHandles,
						[nodeId]: [...currentHandles, handle],
					},
				},
			};
		});
	},

	removeGridHandle: (nodeId: string, handleId: string) => {
		set((state) => {
			const currentHandles = state.flow.gridHandles[nodeId] || [];
			return {
				flow: {
					...state.flow,
					gridHandles: {
						...state.flow.gridHandles,
						[nodeId]: currentHandles.filter((h) => h.id !== handleId),
					},
				},
			};
		});
	},

	updateGridHandle: (
		nodeId: string,
		handleId: string,
		updates: Partial<GridHandle>
	) => {
		set((state) => {
			const currentHandles = state.flow.gridHandles[nodeId] || [];
			return {
				flow: {
					...state.flow,
					gridHandles: {
						...state.flow.gridHandles,
						[nodeId]: currentHandles.map((h) =>
							h.id === handleId ? { ...h, ...updates } : h
						),
					},
				},
			};
		});
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

	// 🚀 PERFORMANCE: Optimized batch position updates
	batchUpdateNodePositions: (
		updates: Array<{ id: string; position: { x: number; y: number } }>
	) => {
		console.log(`📍 Batch updating ${updates.length} node positions`);

		set((state) => ({
			flow: {
				...state.flow,
				nodes: state.flow.nodes.map((node) => {
					const update = updates.find((u) => u.id === node.id);
					return update ? { ...node, position: update.position } : node;
				}),
			},
		}));

		// Always recalculate handle positions after position updates
		get().recalculateAllHandlePositions();
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
