import { useEffect, useCallback } from 'react';
import { useEdges } from '@xyflow/react';
import { useAppStore } from '../../shared/stores/appStore';

/**
 * AudioSyncComponent - A component that handles audio sync within React Flow context
 *
 * This component must be rendered as a child of ReactFlow because it uses useEdges().
 * It replaces the individual useToneConnections hooks with centralized audio management.
 */
export function AudioSyncComponent() {
	const edges = useEdges();

	// Get the sync function directly from the store to ensure stability
	const syncWithReactFlowEdges = useAppStore(
		useCallback((state) => state.syncWithReactFlowEdges, [])
	);

	useEffect(() => {
		console.log(`🔍 [AudioSyncComponent] useEffect ENTRY - Sync edges`, {
			edgesCount: edges.length,
			edgeIds: edges.map((e) => `${e.source}->${e.target}`),
			syncFunctionRef: syncWithReactFlowEdges.toString().slice(0, 100),
			stack: new Error().stack?.split('\n').slice(1, 4).join('\n'),
		});

		// Sync all edges with the audio store - let the store handle all connection logic
		syncWithReactFlowEdges(edges);

		console.log(
			`🔍 [AudioSyncComponent] useEffect EXIT - Sync edges completed`
		);
	}, [edges, syncWithReactFlowEdges]);

	// This component doesn't render anything - it's just for the side effect
	return null;
}
