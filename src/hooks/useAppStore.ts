import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore';
import type { AppNode } from '../nodes/types';
import type { Edge } from '@xyflow/react';

// Theme hooks with performance optimization
export const useTheme = () => {
	return useAppStore(
		useShallow((state) => ({
			theme: state.theme.current,
			actualTheme: state.theme.actualTheme,
			setTheme: state.setTheme,
		}))
	);
};

export const useActualTheme = () => {
	return useAppStore((state) => state.theme.actualTheme);
};

export const useMetallicTheme = () => {
	return useAppStore(
		useShallow((state) => ({
			metallicBackground: state.theme.metallicBackground,
			setMetallicBackground: state.setMetallicBackground,
		}))
	);
};

// Flow state hooks with performance optimization
export const useNodes = () => {
	return useAppStore(
		useShallow((state) => ({
			nodes: state.flow.nodes,
			addNode: state.addNode,
			updateNode: state.updateNode,
			removeNode: state.removeNode,
			setNodes: state.setNodes,
		}))
	);
};

export const useEdges = () => {
	return useAppStore(
		useShallow((state) => ({
			edges: state.flow.edges,
			addEdge: state.addEdge,
			updateEdge: state.updateEdge,
			removeEdge: state.removeEdge,
			setEdges: state.setEdges,
		}))
	);
};

export const useFlowActions = () => {
	return useAppStore(
		useShallow((state) => ({
			recalculateAllHandlePositions: state.recalculateAllHandlePositions,
			batchUpdateNodes: state.batchUpdateNodes,
			batchUpdateEdges: state.batchUpdateEdges,
			batchUpdateNodePositions: state.batchUpdateNodePositions,
			setViewport: state.setViewport,
		}))
	);
};

// UI state hooks
export const useUIState = () => {
	return useAppStore(
		useShallow((state) => ({
			selectedNodes: state.ui.selectedNodes,
			selectedEdges: state.ui.selectedEdges,
			isNodeDragging: state.ui.isNodeDragging,
			isConnecting: state.ui.isConnecting,
			setSelectedNodes: state.setSelectedNodes,
			setSelectedEdges: state.setSelectedEdges,
			setIsNodeDragging: state.setIsNodeDragging,
			setIsConnecting: state.setIsConnecting,
		}))
	);
};

// Audio hooks with performance optimization
export const useAudioNodes = () => {
	return useAppStore(
		useShallow((state) => ({
			audioNodes: state.audioNodes,
			addAudioNode: state.addAudioNode,
			updateAudioNode: state.updateAudioNode,
			removeAudioNode: state.removeAudioNode,
		}))
	);
};

export const useTransport = () => {
	return useAppStore(
		useShallow((state) => ({
			transport: state.transport,
			audioContext: state.audioContext,
			startTransport: state.startTransport,
			stopTransport: state.stopTransport,
			setBPM: state.setBPM,
			initializeAudioContext: state.initializeAudioContext,
		}))
	);
};

export const useAudioConnections = () => {
	return useAppStore(
		useShallow((state) => ({
			audioConnections: state.audioConnections,
			connectAudioNodes: state.connectAudioNodes,
			disconnectAudioNodes: state.disconnectAudioNodes,
		}))
	);
};

// Combined hooks for convenience
export const useFlowState = () => {
	return useAppStore(
		useShallow((state) => ({
			nodes: state.flow.nodes,
			edges: state.flow.edges,
			viewport: state.flow.viewport,
			handlePositions: state.flow.nodeHandlePositions,
		}))
	);
};

// Specialized hooks for specific use cases
export const useNodeById = (nodeId: string) => {
	return useAppStore((state) =>
		state.flow.nodes.find((node) => node.id === nodeId)
	);
};

export const useEdgeById = (edgeId: string) => {
	return useAppStore((state) =>
		state.flow.edges.find((edge) => edge.id === edgeId)
	);
};

export const useNodeHandlePositions = (nodeId: string) => {
	return useAppStore((state) => state.flow.nodeHandlePositions[nodeId] || {});
};

// Hook for initializing the store with current React Flow data
export const useInitializeStore = () => {
	const { setNodes, setEdges, initializeTheme } = useAppStore(
		useShallow((state) => ({
			setNodes: state.setNodes,
			setEdges: state.setEdges,
			initializeTheme: state.initializeTheme,
		}))
	);

	return {
		initializeWithData: (nodes: AppNode[], edges: Edge[]) => {
			setNodes(nodes);
			setEdges(edges);
			initializeTheme();
		},
	};
};
