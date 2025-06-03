# Handle Offset System - Usage Guide

## Overview

Your Reactoscope application now has a comprehensive system for controlling handle positions programmatically through the grid positioning system. This allows precise control over where handles appear on nodes beyond automatic edge-based positioning.

## Key Features

✅ **Pixel-based offsets**: Fine-grained positioning with exact pixel control  
✅ **Grid-unit-based offsets**: Consistent positioning tied to your 64px grid system  
✅ **Automatic edge detection**: Handles automatically position on the appropriate node edge  
✅ **Development validation**: Position validation with boundary checking and warnings  
✅ **Multiple handles per node**: Support for complex node layouts with many connection points

## Basic Usage

### 1. Define Handles with Offsets

```typescript
import type { GridHandle } from '../stores/types';

const handles: GridHandle[] = [
	{
		id: 'input-main',
		type: 'target',
		gridX: 0, // Left edge
		gridY: 1, // Second grid row
		variant: 'primary',
		offsetX: 16, // Move 16px right from normal position
		offsetY: 8, // Move 8px down from normal position
		offsetMode: 'pixels', // Interpret offsets as pixels
	},
	{
		id: 'output-main',
		type: 'source',
		gridX: 3, // Right edge (for a 4-wide node)
		gridY: 2, // Third grid row
		variant: 'primary',
		offsetX: 0.25, // Move quarter grid unit (16px) left
		offsetY: 0, // No vertical offset
		offsetMode: 'grid-units', // Interpret offsets as grid units
	},
];
```

### 2. Render Handles in Your Node

```typescript
export function MyCustomNode(props: NodeProps) {
  const { id, selected } = props;

  return (
    <BaseNode
      variant='default'
      gridWidth={4}
      gridHeight={4}
      nodeId={id}
      selected={selected}
      title="My Custom Node"
    >
      {/* Your node content */}

      <GridHandles
        nodeId={id}
        nodeGridWidth={4}
        nodeGridHeight={4}
        handles={handles}
      />
    </BaseNode>
  );
}
```

## Advanced Examples

### Precise Handle Spacing

Create evenly spaced handles along an edge:

```typescript
const bottomHandles: GridHandle[] = [
	{
		id: 'out-1',
		type: 'source',
		gridX: 1,
		gridY: 3, // Bottom edge
		offsetX: -20, // 20px left of center
		offsetMode: 'pixels',
	},
	{
		id: 'out-2',
		type: 'source',
		gridX: 2,
		gridY: 3,
		// No offset - centered
	},
	{
		id: 'out-3',
		type: 'source',
		gridX: 3,
		gridY: 3,
		offsetX: 20, // 20px right of center
		offsetMode: 'pixels',
	},
];
```

### Grid-Unit Based Positioning

Use grid units for consistent spacing across different zoom levels:

```typescript
const preciseHandles: GridHandle[] = [
	{
		id: 'input-offset',
		type: 'target',
		gridX: 0,
		gridY: 1,
		offsetX: 0.5, // Half grid unit (32px) right
		offsetY: 0.25, // Quarter grid unit (16px) down
		offsetMode: 'grid-units',
	},
];
```

### Dynamic Offsets

Control offsets programmatically based on node state:

```typescript
function MyDynamicNode(props: NodeProps) {
  const [offsetValue, setOffsetValue] = useState(0);

  const dynamicHandles: GridHandle[] = [
    {
      id: 'dynamic-input',
      type: 'target',
      gridX: 0, gridY: 1,
      offsetX: offsetValue, // Controlled by state
      offsetY: 0,
      offsetMode: 'pixels',
    }
  ];

  // Update offset based on some logic
  useEffect(() => {
    // Your dynamic logic here
  }, [/* dependencies */]);

  return (
    <BaseNode /* ... */>
      {/* Controls to modify offsetValue */}
      <GridHandles handles={dynamicHandles} /* ... */ />
    </BaseNode>
  );
}
```

## Configuration Options

### GridHandle Interface

```typescript
interface GridHandle {
	id: string; // Unique handle identifier
	type: 'source' | 'target'; // Handle type for connections
	gridX: number; // Grid X coordinate (determines edge)
	gridY: number; // Grid Y coordinate (determines edge)
	variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio';
	floating?: boolean; // Whether handle uses floating positioning
	offsetX?: number; // Additional X offset (default: 0)
	offsetY?: number; // Additional Y offset (default: 0)
	offsetMode?: 'pixels' | 'grid-units'; // How to interpret offset values
}
```

### Offset Modes

- **`pixels`** (default): Direct pixel positioning for fine control
- **`grid-units`**: Grid-relative positioning (1 unit = 64px)

### Edge Detection Rules

Handles automatically position on node edges based on grid coordinates:

- **Top edge**: `gridY === 0`
- **Bottom edge**: `gridY === nodeGridHeight - 1`
- **Left edge**: `gridX === 0`
- **Right edge**: `gridX === nodeGridWidth - 1`

## Utility Functions

The system provides several utility functions in `src/config/grid.ts`:

```typescript
// Convert between units
gridUnitsToPixels(0.5); // Returns 32
pixelsToGridUnits(128); // Returns 2

// Calculate offsets
calculateHandleOffset(16, 'pixels'); // Returns 16
calculateHandleOffset(0.25, 'grid-units'); // Returns 16

// Validate positions (development mode)
validateHandlePosition(gridX, gridY, offsetX, offsetY, nodeWidth, nodeHeight);
```

## Best Practices

1. **Use grid-units for responsive layouts** that should scale with your grid system
2. **Use pixels for precise positioning** when exact placement is critical
3. **Validate in development** - the system logs warnings for invalid positions
4. **Group related handles** using consistent variants and naming conventions
5. **Consider connection density** when placing multiple handles close together

## Example Nodes

See the following example implementations:

- `SimpleOffsetNode.tsx` - Basic offset usage patterns
- `AdvancedHandleNode.tsx` - Dynamic offset control with UI
- `DebugNode.tsx` - Standard ReactFlow handles for comparison

## Integration with Existing Nodes

To add offset control to existing nodes:

1. Replace standard `Handle` components with `GridHandles`
2. Define your handle configurations as `GridHandle[]` arrays
3. Specify grid dimensions in your `BaseNode`
4. Use the offset properties to fine-tune positioning

The system is backward compatible - existing nodes without offsets continue to work normally.
