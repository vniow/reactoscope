import { useEffect } from 'react';
import { useEdges } from '@xyflow/react';
import {
	useAudioNodes,
	useAudioConnections,
} from '../../shared/stores/useAppStore';

/**
 * MODERN ZUSTAND-BASED CONNECTION MANAGEMENT
 *
 * This hook replaces the old imperative connection logic with a fully centralized,
 * Zustand-driven approach where all connection state lives in the store.
 *
 * Benefits:
 * - Single source of truth for all audio connections
 * - Predictable connection status tracking
 * - Better error handling and debugging
 * - Automatic synchronization with React Flow edges
 * - Type-agnostic and scalable
 */
export function useToneConnectionsZustand() {
	const { syncWithReactFlowEdges } = useAudioConnections();
	const edges = useEdges();

	useEffect(() => {
		// Sync Zustand connection state with React Flow edges
		syncWithReactFlowEdges(edges);
	}, [edges, syncWithReactFlowEdges]);

	return {
		// The store now handles all connection logic
		// This hook just ensures synchronization
	};
}

/**
 * Hook for individual nodes to trigger re-connection when their instances change
 * This replaces the old useToneConnections but is much simpler since the store
 * handles all the actual connection logic.
 */
export function useNodeConnectionSync(nodeId: string) {
	const { audioNodes } = useAudioNodes();
	const { establishAllConnections } = useAudioConnections();

	// Get the node data to watch for instance changes
	const nodeData = audioNodes[nodeId];
	const instance = nodeData?.instance;
	const instances = nodeData?.instances;

	useEffect(() => {
		// When this node's instances change, re-establish all connections
		// The store will handle figuring out which connections involve this node
		if (instance || instances) {
			establishAllConnections();
		}
	}, [instance, instances, establishAllConnections]);

	return {
		nodeData,
		isConnected:
			!!instance || !!(instances && Object.keys(instances).length > 0),
	};
}
