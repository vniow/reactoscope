/**
 * MIGRATION GUIDE: From Hook-Based to Zustand-Based Audio Connections
 *
 * This file demonstrates how to migrate from the old imperative connection management
 * to the new centralized Zustand approach.
 */

import { useAudioConnections } from './useAppStore';
import {
	useToneConnectionsZustand,
	useNodeConnectionSync,
} from './useToneConnectionsZustand';

// ===== OLD APPROACH (to be replaced) =====

/*
// OLD: Individual nodes managed their own connections imperatively
export function useToneConnections(nodeId: string) {
  const { audioNodes } = useAudioNodes();
  const edges = useEdges();
  
  useEffect(() => {
    // Imperative connection logic scattered across multiple hooks
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    outgoingEdges.forEach(edge => {
      // Manual instance retrieval and connection
      const sourceInstance = audioNodes[edge.source]?.instance;
      const targetInstance = audioNodes[edge.target]?.instance;
      
      if (sourceInstance && targetInstance) {
        sourceInstance.connect(targetInstance);
      }
    });
    
    return () => {
      // Manual cleanup
      outgoingEdges.forEach(edge => {
        // Disconnect logic...
      });
    };
  }, [nodeId, audioNodes, edges]);
}
*/

// ===== NEW APPROACH (recommended) =====

/**
 * STEP 1: Global Connection Management
 *
 * Add this hook at the top level of your app (e.g., in App.tsx or your main Flow component)
 * This replaces all the individual useToneConnections calls.
 */
export function useGlobalAudioConnectionManagement() {
	// This single hook manages ALL audio connections centrally
	return useToneConnectionsZustand();
}

/**
 * STEP 2: Individual Node Sync (optional)
 *
 * If a node needs to trigger reconnection when its instances change,
 * use this lightweight hook instead of the old useToneConnections.
 */
export function useModernNodeConnection(nodeId: string) {
	// NEW: useNodeConnectionSync(id) instead of useToneConnections(id)
	return useNodeConnectionSync(nodeId);
}

/**
 * STEP 3: Connection State Access
 *
 * You can now easily access and monitor connection state from anywhere.
 */
export function useConnectionDebugData() {
	const { audioConnections } = useAudioConnections();

	return {
		connections: audioConnections,
		connectionCount: audioConnections.length,
		connectedCount: audioConnections.filter((c) => c.status === 'connected')
			.length,
		errorCount: audioConnections.filter((c) => c.status === 'error').length,
	};
}

/**
 * STEP 4: Migration Checklist
 *
 * 1. ✅ Remove all individual `useToneConnections(nodeId)` calls from your node components
 * 2. ✅ Add `useGlobalAudioConnectionManagement()` to your main Flow component
 * 3. ✅ Replace with `useModernNodeConnection(nodeId)` if nodes need to trigger reconnection
 * 4. ✅ Update any manual connection/disconnection logic to use Zustand actions
 * 5. ✅ Test that all existing connections still work
 * 6. ✅ Enjoy the benefits: centralized state, better debugging, and easier maintenance!
 */

// ===== BENEFITS OF THE NEW APPROACH =====

/*
✅ CENTRALIZED STATE
- All connections live in Zustand store
- Single source of truth
- Easy to debug and inspect

✅ AUTOMATIC SYNCHRONIZATION  
- React Flow edges automatically sync with Tone.js connections
- No more manual edge handling

✅ STATUS TRACKING
- Connection status: 'connected', 'disconnected', 'error', 'pending'
- Error messages and timestamps
- Easy to build debugging UIs

✅ TYPE SAFETY & SCALABILITY
- Works with any node type automatically
- No need to update connection logic when adding new nodes
- Supports both single and multi-instance nodes

✅ PERFORMANCE
- Fewer useEffect hooks running
- More efficient re-rendering
- Better memory management

✅ TESTABILITY
- Easy to unit test connection logic
- Predictable state changes
- No complex hook interactions
*/

// Example usage patterns:

/*
// In your main App.tsx or Flow component:
function App() {
  useGlobalAudioConnectionManagement(); // Handles all connections
  
  return <YourFlowComponent />;
}

// In individual node components (if they need to trigger reconnection):
function OscillatorNode({ id }) {
  const { isConnected } = useModernNodeConnection(id);
  
  // Your node logic here...
  
  return <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>;
}

// For debugging/monitoring:
function DebugPanel() {
  const { connectionCount, connectedCount, errorCount } = useConnectionDebugData();
  
  return (
    <div>
      Total: {connectionCount}, Connected: {connectedCount}, Errors: {errorCount}
    </div>
  );
}
*/
