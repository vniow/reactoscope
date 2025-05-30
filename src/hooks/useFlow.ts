import { useShallow } from 'zustand/react/shallow';
import { useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import {
	applyNodeChanges,
	applyEdgeChanges,
	reconnectEdge,
} from '@xyflow/react';
import type {
	NodeChange,
	EdgeChange,
	Viewport,
	Connection,
	Edge,
} from '@xyflow/react';
import type { AppNode } from '../nodes/types';

export const useFlowNodes = () =>
	useAppStore(useShallow((state) => state.flow.nodes));

export const useFlowEdges = () =>
	useAppStore(useShallow((state) => state.flow.edges));

export const useFlowViewport = () =>
	useAppStore(useShallow((state) => state.flow.viewport));

export const useFlowActions = () => {
	// Track edge reconnection success for delete-on-drop functionality
	const edgeReconnectSuccessful = useRef(true);

	// Get stable action references from store
	const actions = useAppStore(
		useShallow((state) => ({
			setNodes: state.setNodes,
			setEdges: state.setEdges,
			addNode: state.addNode,
			updateNode: state.updateNode,
			removeNode: state.removeNode,
			moveNode: state.moveNode,
			addEdge: state.addEdge,
			updateEdge: state.updateEdge,
			removeEdge: state.removeEdge,
			setViewport: state.setViewport,
			recalculateAllHandlePositions: state.recalculateAllHandlePositions,
			applyNodesChange: state.applyNodesChange,
			applyEdgesChange: state.applyEdgesChange,
		}))
	);

	// Helper function to detect if node changes include position updates
	const hasPositionChanges = useCallback((changes: NodeChange[]) => {
		return changes.some(
			(change) =>
				change.type === 'position' ||
				(change.type === 'replace' && 'position' in change.item)
		);
	}, []);

	// Create stable event handlers using useCallback
	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			const currentNodes = useAppStore.getState().flow.nodes;
			const updatedNodes = applyNodeChanges(changes, currentNodes);
			actions.applyNodesChange(updatedNodes as AppNode[]);

			if (hasPositionChanges(changes)) {
				// Use setTimeout to avoid synchronous updates during React Flow's internal state changes
				setTimeout(() => {
					actions.recalculateAllHandlePositions();
				}, 0);
			}
		},
		[actions, hasPositionChanges]
	);

	const onEdgesChange = useCallback(
		(changes: EdgeChange[]) => {
			console.log('onEdgesChange called with changes:', changes);
			const currentEdges = useAppStore.getState().flow.edges;
			const updatedEdges = applyEdgeChanges(changes, currentEdges);
			actions.applyEdgesChange(updatedEdges);
		},
		[actions]
	);

	const onConnect = useCallback(
		(connection: Connection) => {
			console.log('onConnect called with:', connection);
			const newEdge = {
				...connection,
				id: `edge-${connection.source}-${connection.target}-${Math.random()
					.toString(36)
					.substring(7)}`,
				type: 'floating',
				animated: false,
			} as Edge;
			actions.addEdge(newEdge);
		},
		[actions]
	);

	const onViewportChange = useCallback(
		(viewport: Viewport) => {
			actions.setViewport(viewport);
		},
		[actions]
	);

	// Reconnectable edge handlers
	const onReconnectStart = useCallback(() => {
		console.log('🔄 Edge reconnection started');
		edgeReconnectSuccessful.current = false;
	}, []);

	const onReconnect = useCallback(
		(oldEdge: Edge, newConnection: Connection) => {
			console.log('🔄 Edge reconnection attempt:', { oldEdge, newConnection });
			edgeReconnectSuccessful.current = true;

			// Use React Flow's reconnectEdge helper to update the edges array
			const currentEdges = useAppStore.getState().flow.edges;
			const updatedEdges = reconnectEdge(oldEdge, newConnection, currentEdges);
			actions.setEdges(updatedEdges);

			console.log(
				'✅ Edge reconnected successfully from',
				oldEdge.source,
				'to',
				newConnection.target
			);
		},
		[actions]
	);

	const onReconnectEnd = useCallback(
		(_: unknown, edge: Edge) => {
			console.log('🔄 Edge reconnection ended:', {
				edge,
				successful: edgeReconnectSuccessful.current,
			});

			if (!edgeReconnectSuccessful.current) {
				// Edge was dropped on empty space, delete it
				console.log('🗑️ Deleting edge dropped on empty space:', edge.id);
				actions.removeEdge(edge.id);
			}

			// Reset the flag
			edgeReconnectSuccessful.current = true;
		},
		[actions]
	);

	// Return all actions with stable references
	return {
		...actions,
		onNodesChange,
		onEdgesChange,
		onConnect,
		onViewportChange,
		onReconnectStart,
		onReconnect,
		onReconnectEnd,
	};
};
