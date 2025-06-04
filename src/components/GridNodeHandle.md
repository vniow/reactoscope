# GridNodeHandle Positioning Guide

## Overview

The `GridNodeHandle` component provides a flexible abstraction over React Flow's `Handle` component with enhanced positioning capabilities and consistent Tailwind styling.

## How React Flow Handle Positioning Works

### Internal Mechanism

1. React Flow **does not** accept `x` and `y` as direct props on the `<Handle>` component
2. Instead, positioning is handled through the `style` prop using CSS positioning
3. React Flow automatically calculates connection coordinates by:
   - Querying the DOM for each handle's actual position
   - Combining the node's world position with the handle's relative position
   - Using these coordinates for edge routing and connection points

### Key Insight

The `x` and `y` values you see in React Flow's internal types are **calculated values**, not input props. They represent the final world coordinates of handles after React Flow processes the DOM positions.

## Positioning Methods

### 1. Default Positioning

```tsx
<GridNodeHandle
	id='handle-1'
	type='source'
	position={Position.Right} // Centers on right edge
/>
```

### 2. Pixel Offset Positioning

```tsx
<GridNodeHandle
	id='handle-2'
	type='target'
	position={Position.Top}
	x={20} // 20px from left
	y={10} // 10px from top
/>
```

### 3. Percentage-Based Positioning

```tsx
<GridNodeHandle
	id='handle-3'
	type='source'
	position={Position.Bottom}
	leftPercent={75} // 75% from left edge
	topPercent={0} // At the top edge
/>
```

### 4. Centered Positioning

```tsx
<GridNodeHandle
	id='handle-4'
	type='target'
	position={Position.Top}
	leftPercent={50}
	centerX={true} // Centers horizontally using transform
/>
```

### 5. Grid-Based Positioning

Perfect for your grid system:

```tsx
<GridNodeHandle
	id='handle-5'
	type='source'
	position={Position.Right}
	gridX={5} // 5th grid column
	gridY={2} // 2nd grid row
	gridSize={20} // 20px per grid unit (default)
/>
```

### 6. Complex Positioning

Combine multiple methods:

```tsx
<GridNodeHandle
	id='handle-6'
	type='target'
	position={Position.Left}
	gridX={0}
	gridY={3}
	centerY={true} // Center vertically within grid cell
	color='primary'
	size='lg'
/>
```

## Styling Options

### Size Variants

- `size="sm"` - 24x24px (w-6 h-6)
- `size="md"` - 32x32px (w-8 h-8) - default
- `size="lg"` - 40x40px (w-10 h-10)

### Color Variants

- `color="default"` - Emerald for source, Blue for target
- `color="primary"` - Blue
- `color="secondary"` - Gray
- `color="success"` - Green
- `color="warning"` - Yellow
- `color="error"` - Red

### Shape

- **Source handles**: Square (`rounded-none`)
- **Target handles**: Circle (`rounded-full`)

## Advanced Usage

### Responsive Handle Layout

```tsx
// Create handles that adapt to node size
const nodeWidth = 280; // Your node width
const handleSpacing = nodeWidth / 4;

<GridNodeHandle
  id="input-1"
  type="target"
  position={Position.Top}
  x={handleSpacing}
  centerX={true}
/>
<GridNodeHandle
  id="input-2"
  type="target"
  position={Position.Top}
  x={handleSpacing * 3}
  centerX={true}
/>
```

### Grid-Aligned Handles

```tsx
// Align handles to your grid system
<GridNodeHandle
	id='audio-in'
	type='target'
	position={Position.Top}
	gridX={3} // Center of 7-unit wide node
	gridY={0}
	centerX={true}
/>
```

### Custom Styling

```tsx
<GridNodeHandle
	id='custom-handle'
	type='source'
	position={Position.Right}
	style={{
		border: '3px solid gold',
		boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
	}}
	className='animate-pulse'
/>
```

## Best Practices

1. **Use meaningful IDs**: Include node ID and handle purpose

   ```tsx
   id={`${nodeId}-audio-output`}
   ```

2. **Choose appropriate positioning method**:

   - Use `leftPercent`/`topPercent` for responsive layouts
   - Use `gridX`/`gridY` for grid-aligned designs
   - Use `x`/`y` for fixed pixel positioning

3. **Combine centering with positioning**:

   ```tsx
   leftPercent={50}
   centerX={true}  // Perfectly centered
   ```

4. **Consider handle hierarchy**:

   - Use different sizes for primary vs secondary connections
   - Use colors to indicate connection types
   - Use consistent positioning patterns across similar nodes

5. **Test connection behavior**:
   - Ensure handles don't overlap
   - Verify connections work as expected
   - Check handle visibility at different zoom levels

## Troubleshooting

### Handles Not Connecting

- Ensure handles don't have `pointer-events: none`
- Check that handles are visible and properly sized
- Verify handle IDs are unique within the node

### Positioning Issues

- Remember that `position` prop is still required (defines edge relationship)
- Use browser dev tools to inspect actual handle positions
- Check that parent node has proper positioning context

### Styling Conflicts

- Tailwind classes in `className` override component defaults
- Custom `style` props override Tailwind classes
- Use `!important` sparingly in custom styles
