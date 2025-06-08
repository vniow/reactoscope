# Unified GridNodeHandle System

## Overview

The `GridNodeHandle` component is a unified handle system that supports both **static** and **floating** positioning modes. This allows for consistent handle styling and behavior while providing flexibility for different use cases.

## Modes

### Static Mode (`mode='static'`)

- **Purpose**: Fixed grid-based positioning
- **Use Case**: Standard nodes with predictable handle placement
- **Required Props**: `position`, `gridX`, `gridY`
- **Features**: Precise grid-aligned positioning using the 64px grid system

### Floating Mode (`mode='floating'`)

- **Purpose**: Dynamic positioning based on connections
- **Use Case**: Nodes that need adaptive handle placement
- **Required Props**: `nodeId`
- **Features**: Automatic position calculation, debug visualization
- **Positioning**: Uses actual node position without forced grid alignment for accurate handle placement

> **Note**: The floating positioning system uses the node's actual position (including half-grid positions) to ensure handles are correctly aligned regardless of where the node is positioned on the canvas.

## Usage Examples

### Static Handle (Fixed Position)

```tsx
<GridNodeHandle
	id={`${id}-source`}
	type='source'
	mode='static'
	position={Position.Right}
	gridX={0}
	gridY={2.5}
	color='primary'
	size='md'
/>
```

### Floating Handle (Dynamic Position)

```tsx
<GridNodeHandle
	id={`${id}-source`}
	type='source'
	mode='floating'
	nodeId={id}
	variant='debug'
	showDebugInfo={true}
	minDistanceThreshold={50}
/>
```

## Props Reference

### Common Props

- `id`: Unique handle identifier
- `type`: 'source' | 'target'
- `style`: Additional CSS styles
- `className`: Additional CSS classes
- `size`: 'sm' | 'md' | 'lg'

### Static Mode Props

- `mode`: 'static'
- `position`: React Flow position (Top, Right, Bottom, Left)
- `gridX`: Grid column position (required)
- `gridY`: Grid row position (required)
- `color`: Tailwind color variant

### Floating Mode Props

- `mode`: 'floating'
- `nodeId`: Node ID for floating calculations (required)
- `variant`: Visual variant ('default', 'primary', 'debug', 'secondary', 'audio')
- `minDistanceThreshold`: Minimum distance for positioning (default: 50)
- `showDebugInfo`: Show debug overlay (default: false)

## Implementation Notes

### Grid System Integration

- Static mode uses the 64px `GRID_UNIT` system
- Floating mode automatically aligns to grid positions
- Consistent visual styling across both modes

### Performance

- Floating calculations are memoized via `useFloatingHandles`
- Static positioning has zero runtime overhead
- Both modes share the same styling system

### Debug Features

- Floating mode includes optional debug overlays
- Debug info shows current position and mode
- Visual indicators help with development

## Migration Guide

### From FloatingHandle

```tsx
// Old
<FloatingHandle
  type='source'
  nodeId={id}
  variant='debug'
/>

// New
<GridNodeHandle
  id={`${id}-source`}
  type='source'
  mode='floating'
  nodeId={id}
  variant='debug'
/>
```

### From Handle (React Flow)

```tsx
// Old
<Handle
  type='source'
  position={Position.Right}
  style={{ right: 0, top: '50%' }}
/>

// New
<GridNodeHandle
  id={`${id}-source`}
  type='source'
  mode='static'
  position={Position.Right}
  gridX={0}
  gridY={2.5}
/>
```

## Best Practices

1. **Use Static Mode** for standard, predictable handle placement
2. **Use Floating Mode** for nodes that need dynamic adaptation
3. **Enable Debug Info** during development for floating handles
4. **Keep IDs Unique** across all handles in a node
5. **Follow Grid Alignment** for consistent visual layout

## Positioning Behavior

### Static Mode Positioning

- Uses `gridX` and `gridY` values multiplied by `GRID_UNIT` (64px)
- Position is relative to the specified edge (`position` prop)
- Always grid-aligned and predictable

### Floating Mode Positioning

- Calculates optimal position based on connected nodes
- Uses actual node position without forced grid snapping
- Handles positioned correctly even when nodes are at half-grid positions
- Adapts dynamically as connections change

## Troubleshooting

### Floating Handles Appear Offset

This issue was resolved by removing forced grid alignment in floating mode. The system now uses the node's actual position for accurate handle placement.

### Static Handles Not Aligned

Ensure `gridX` and `gridY` values are properly calculated and the `position` prop matches your intended edge.
