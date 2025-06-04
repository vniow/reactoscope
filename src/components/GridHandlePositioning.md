# Grid-Based Handle Positioning System

## Overview

This system provides precise, consistent handle positioning that aligns with your GRID_UNIT-based design pattern. Instead of manual pixel calculations, you can position handles using grid coordinates that match your node's grid layout.

## Core Concepts

### Grid Units

- **GRID_UNIT = 64px** (defined in `src/config/grid.ts`)
- All positioning calculations use this base unit
- Ensures visual consistency across your entire application

### Coordinate System

- **gridX, gridY**: Grid cell coordinates (integers)
- **subGridX, subGridY**: Sub-cell positioning (0-1 range within a cell)
- **gridOffset**: Fractional grid unit offsets for precise positioning

## GridNodeHandle Positioning Methods

### 1. Basic Grid Positioning

```tsx
<GridNodeHandle
	id='handle-1'
	type='source'
	position={Position.Right}
	gridX={2} // 3rd column (0-indexed)
	gridY={1} // 2nd row
/>
```

This positions the handle at grid coordinate (2,1), which is 128px right and 64px down.

### 2. Sub-Grid Positioning

```tsx
<GridNodeHandle
	id='handle-2'
	type='target'
	position={Position.Top}
	gridX={1}
	gridY={0}
	subGridX={0.5} // Half-way through the grid cell
	subGridY={0.25} // Quarter way through the grid cell
/>
```

### 3. Fractional Grid Offsets

```tsx
<GridNodeHandle
	id='handle-3'
	type='source'
	position={Position.Bottom}
	gridX={3}
	gridY={2}
	gridOffset={{ x: 0.5, y: 1 }} // Half grid unit right, full unit down
/>
```

### 4. Grid Snapping

```tsx
<GridNodeHandle
	id='handle-4'
	type='target'
	position={Position.Left}
	x={75} // Will be snapped to nearest grid boundary (64px)
	y={30} // Will be snapped to 0px
	snapToGrid={true}
/>
```

## Utility Functions

### Pre-Built Positioning Patterns

#### Centered on Edge

```tsx
import { centeredOnEdge } from '../utils/gridHandleUtils';

// Center handle on the right edge of a 7x4 grid node
<GridNodeHandle
	{...centeredOnEdge(7, 4, 'right')}
	id='centered-handle'
	type='source'
	position={Position.Right}
/>;
```

#### Evenly Spaced Handles

```tsx
import { evenlySpacedHandles } from '../utils/gridHandleUtils';

// Create 3 evenly spaced handles on the top edge
{
	evenlySpacedHandles(7, 4, 'top', 3).map((pos, index) => (
		<GridNodeHandle
			key={index}
			{...pos}
			id={`input-${index}`}
			type='target'
			position={Position.Top}
		/>
	));
}
```

#### Corner Positions

```tsx
import { cornerPositions } from '../utils/gridHandleUtils';

const corners = cornerPositions(7, 4);

<GridNodeHandle
	{...corners.topLeft}
	id='corner-tl'
	type='target'
	position={Position.Left}
/>;
```

## Real-World Examples

### Audio Node with Centered I/O

```tsx
// GainNode.tsx - Centered input/output
<GridNodeHandle
  id={`${id}-audio-in`}
  type="target"
  position={Position.Top}
  {...centeredOnEdge(3, 4, 'top')}  // 3x4 grid node
  color="primary"
/>

<GridNodeHandle
  id={`${id}-audio-out`}
  type="source"
  position={Position.Bottom}
  {...centeredOnEdge(3, 4, 'bottom')}
  color="success"
/>
```

### Multi-Input Processor Node

```tsx
// OscillatorNode.tsx - Multiple frequency inputs
const inputPositions = evenlySpacedHandles(5, 6, 'left', 4);

{
	inputPositions.map((pos, index) => (
		<GridNodeHandle
			key={`freq-input-${index}`}
			{...pos}
			id={`${id}-freq-${index}`}
			type='target'
			position={Position.Left}
			color='primary'
			size='sm'
		/>
	));
}
```

### Custom Grid Alignment

```tsx
// DebugNode.tsx - Custom precise positioning
<GridNodeHandle
	id={`${id}-debug-output`}
	type='source'
	position={Position.Right}
	gridX={6} // Last column of 7-wide grid
	gridY={2} // Middle row of 4-high grid
	gridOffset={{ x: 1, y: 0 }} // Extend beyond grid boundary
	color='warning'
/>
```

## Migration from Pixel-Based Positioning

### Before (Manual Pixel Calculations)

```tsx
<GridNodeHandle
	style={{ left: '50%', transform: 'translateX(-50%)' }}
	id='old-handle'
	type='source'
	position={Position.Top}
/>
```

### After (Grid-Based)

```tsx
<GridNodeHandle
	{...centeredOnEdge(nodeWidth, nodeHeight, 'top')}
	id='new-handle'
	type='source'
	position={Position.Top}
/>
```

## Best Practices

### 1. Use Grid Utilities for Common Patterns

- `centeredOnEdge()` for single centered handles
- `evenlySpacedHandles()` for multiple handles
- `cornerPositions()` for corner-mounted handles

### 2. Consistent Grid Alignment

```tsx
// ✅ Good - Aligns with your grid system
gridX={3}, gridY={2}

// ❌ Avoid - Arbitrary pixel positioning
x={210}, y={140}
```

### 3. Validate Handle Positions

```tsx
import { validateGridPosition } from '../utils/gridHandleUtils';

const position = { gridX: 5, gridY: 3, gridOffset: { x: 0.5 } };
const validation = validateGridPosition(position, 7, 4);

if (!validation.isValid) {
	console.warn('Handle position issues:', validation.warnings);
}
```

### 4. Use Semantic Naming

```tsx
// ✅ Good - Describes function and position
id={`${nodeId}-audio-input-left-top`}

// ❌ Avoid - Generic numbering
id={`${nodeId}-handle-1`}
```

## Advanced Techniques

### Dynamic Handle Positioning

```tsx
// Adjust handle positions based on node content
const handleCount = audioInputs.length;
const positions = evenlySpacedHandles(
	nodeWidth,
	nodeHeight,
	'left',
	handleCount
);

{
	audioInputs.map((input, index) => (
		<GridNodeHandle
			key={input.id}
			{...positions[index]}
			id={`${nodeId}-input-${input.id}`}
			type='target'
			position={Position.Left}
		/>
	));
}
```

### Responsive Handle Layout

```tsx
// Adapt to different node sizes
const isLargeNode = gridWidth >= 6;
const handleSize = isLargeNode ? 'lg' : 'md';
const edgePosition = isLargeNode
	? centeredOnEdge(gridWidth, gridHeight, 'right')
	: { gridX: gridWidth - 1, gridY: 1 };
```

### Grid-Aligned Visual Effects

```tsx
// Position handles to align with internal grid content
<GridNodeHandle
	gridX={contentGridX} // Match internal content position
	gridY={contentGridY}
	gridOffset={{ x: 1, y: 0.5 }} // Offset to edge
	className='animate-pulse' // Visual indicator
/>
```

## Debugging

### Position Validation

The system includes validation utilities to ensure handles stay within node boundaries:

```tsx
import { validateGridPosition, gridToPixels } from '../utils/gridHandleUtils';

// Check if position is valid
const isValid = validateGridPosition(handlePosition, nodeWidth, nodeHeight);

// Convert to pixels for debugging
const pixelPos = gridToPixels(handlePosition);
console.log(`Handle at (${pixelPos.x}px, ${pixelPos.y}px)`);
```

### Visual Grid Overlay

You can temporarily add a visual grid overlay to debug handle positioning:

```tsx
// Add to your node for debugging
<div className='absolute inset-0 pointer-events-none'>
	{Array.from({ length: gridHeight }).map((_, row) =>
		Array.from({ length: gridWidth }).map((_, col) => (
			<div
				key={`${row}-${col}`}
				className='absolute border border-red-300 opacity-30'
				style={{
					left: col * GRID_UNIT,
					top: row * GRID_UNIT,
					width: GRID_UNIT,
					height: GRID_UNIT,
				}}
			/>
		))
	)}
</div>
```

This grid-based positioning system ensures your handles are always perfectly aligned with your design system while providing the flexibility to create complex layouts with minimal code.
