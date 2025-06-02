# Using useNodeConnections with Grid Handles

This guide demonstrates how ReactFlow's `useNodeConnections` hook can be integrated with the grid handle system to create more intelligent and responsive node components.

## Overview

The `useNodeConnections` hook provides real-time connection tracking and lifecycle management for ReactFlow nodes. When combined with the grid handle system, it enables:

- **Connection-aware visual feedback**
- **Automatic handle state management**
- **Dynamic handle behavior based on connections**
- **Performance optimization through ReactFlow's native connection tracking**

## Enhanced useGridHandles Hook

The updated `useGridHandles` hook now includes connection tracking:

```typescript
const {
	handles,
	gridWidth,
	gridHeight,
	// Standard grid handle functions
	addHandle,
	removeHandle,
	updateHandle,
	setHandles,
	forceUpdate,
	// New connection-aware functionality
	allConnections,
	sourceConnections,
	targetConnections,
	isHandleConnected,
	getHandleConnections,
	connectionStats,
} = useGridHandles(nodeId);
```

### Connection Statistics

The `connectionStats()` function provides comprehensive connection information:

```typescript
const stats = connectionStats();
// Returns:
{
  total: 8,              // Total handles
  connected: 3,          // Connected handles
  disconnected: 5,       // Disconnected handles
  sourceConnections: 2,  // Connected source handles
  targetConnections: 1,  // Connected target handles
  connectedHandles: [...], // Array of connected handle objects
  disconnectedHandles: [...] // Array of disconnected handle objects
}
```

### Connection Checking

Check if specific handles are connected:

```typescript
const isInputConnected = isHandleConnected('input-1');
const outputConnections = getHandleConnections('output-1');
```

## Enhanced GridNodeHandle Component

Individual handles now provide visual feedback based on connection status:

### Connection-Aware Styling

```typescript
// Handles automatically adjust their appearance when connected:
const connectionClasses = isConnected
	? 'scale-110 drop-shadow-md' // Larger with shadow when connected
	: 'hover:scale-105'; // Subtle hover when disconnected
```

### Dynamic Colors

Connected handles use brighter colors to indicate active connections:

```typescript
const connectionAwareColor = useMemo(() => {
	if (isConnected) {
		// Brighter variants when connected
		switch (variant) {
			case 'primary':
				return '#059669'; // green-600
			case 'debug':
				return '#2563eb'; // blue-600
			// ... etc
		}
	}
	return color; // Default color when not connected
}, [isConnected, variant, color]);
```

### Connection Lifecycle Callbacks

Handle connection and disconnection events:

```typescript
const handleConnections = useNodeConnections({
	handleId: id,
	onConnect: (connections) => {
		console.log(`Handle ${id} connected:`, connections);
		// Custom logic: audio routing, analytics, etc.
	},
	onDisconnect: (connections) => {
		console.log(`Handle ${id} disconnected:`, connections);
		// Custom logic: cleanup, visual updates, etc.
	},
});
```

## GridDebugNode Example

The enhanced `GridDebugNode` demonstrates connection tracking:

### Real-time Connection Display

```typescript
const stats = connectionStats();
const gridHandleInfo = {
	'Total Handles': handles.length,
	Connected: `${stats.connected}/${stats.total}`,
	'Sources Connected': stats.sourceConnections,
	'Targets Connected': stats.targetConnections,
	// ... other info
};
```

### Connection Status Section

```tsx
<GridBlock variant='debug'>
	<div>
		🔗 Active Connections: {allConnections.length} | Connected Handles:{' '}
		{stats.connected}/{stats.total}
		{stats.connected > 0 && (
			<span className='text-green-600'>
				{stats.connectedHandles.map((h) => h.id).join(', ')}
			</span>
		)}
	</div>
</GridBlock>
```

## Benefits of useNodeConnections Integration

### 1. **Automatic Connection Tracking**

- No manual state management for connections
- Real-time updates when connections change
- Leverages ReactFlow's optimized connection system

### 2. **Enhanced User Experience**

- Visual feedback for connected/disconnected handles
- Connection status information in real-time
- Better understanding of node state

### 3. **Performance Optimization**

- ReactFlow's native connection tracking is highly optimized
- Only re-renders when connections actually change
- Reduces custom state management overhead

### 4. **Audio Application Benefits**

- Automatic audio routing setup/teardown
- Visual indication of audio signal flow
- Real-time connection monitoring for debugging

### 5. **Developer Experience**

- Simple API for connection-aware functionality
- Built-in lifecycle management
- Comprehensive connection statistics

## Common Use Cases

### 1. **Dynamic Handle Visibility**

```typescript
// Show additional inputs only when current ones are connected
const shouldShowExtraInputs = stats.targetConnections > 0;
```

### 2. **Audio Signal Routing**

```typescript
useNodeConnections({
	handleType: 'target',
	onConnect: (connections) => {
		// Automatically connect Tone.js audio sources
		connections.forEach((conn) => setupAudioRouting(conn));
	},
	onDisconnect: (connections) => {
		// Clean up audio connections
		connections.forEach((conn) => teardownAudioRouting(conn));
	},
});
```

### 3. **Connection Validation**

```typescript
// Prevent certain connections based on current state
const canAcceptConnection = (connection) => {
	const currentConnections = getHandleConnections(connection.targetHandle);
	return currentConnections.length < maxConnections;
};
```

### 4. **Handle State Management**

```typescript
// Update handle properties based on connections
useEffect(() => {
	handles.forEach((handle) => {
		if (isHandleConnected(handle.id)) {
			// Mark handle as active, change variant, etc.
			updateHandle(handle.id, { variant: 'primary' });
		}
	});
}, [allConnections]);
```

## Best Practices

1. **Use Connection Stats**: Display connection information to help users understand node state
2. **Visual Feedback**: Provide clear visual indicators for connected vs disconnected handles
3. **Performance**: Leverage ReactFlow's optimized connection tracking instead of custom solutions
4. **Lifecycle Management**: Use onConnect/onDisconnect for setup/teardown logic
5. **Separation of Concerns**: Let ReactFlow handle connections, use custom state for handle positioning

The integration of `useNodeConnections` with the grid handle system creates a powerful, responsive, and user-friendly node interface that automatically adapts to connection state while maintaining excellent performance.
