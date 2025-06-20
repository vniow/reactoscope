import { useEffect } from 'react';
import { useEdges } from '@xyflow/react';
import { useAudioConnections } from '../../shared/stores/useAppStore';

/**
 * AudioSyncComponent - A component that handles audio sync within React Flow context
 *
 * This component must be rendered as a child of ReactFlow because it uses useEdges().
 * It replaces the individual useToneConnections hooks with centralized audio management.
 */
export function AudioSyncComponent() {
	const { syncWithReactFlowEdges } = useAudioConnections();
	const edges = useEdges();

	useEffect(() => {
		// Sync all edges with the audio store - let the store handle all connection logic
		syncWithReactFlowEdges(edges);
	}, [edges, syncWithReactFlowEdges]);

	// This component doesn't render anything - it's just for the side effect
	return null;
}
