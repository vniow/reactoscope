import { useShallow } from 'zustand/react/shallow';
import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
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

	// Create stable event handlers using useCallback
	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			console.log('onNodesChange called with changes:', changes);
			const currentNodes = useAppStore.getState().flow.nodes;
			const updatedNodes = applyNodeChanges(changes, currentNodes);
			actions.applyNodesChange(updatedNodes as AppNode[]);
		},
		[actions]
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
				animated: true,
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

	// Return all actions with stable references
	return {
		...actions,
		onNodesChange,
		onEdgesChange,
		onConnect,
		onViewportChange,
	};
};
