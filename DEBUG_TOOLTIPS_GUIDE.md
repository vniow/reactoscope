# Debug Tooltips for GridNodeHandle

This document describes the debug tooltip functionality added to the GridNodeHandle system for better handle identification and debugging during development.

## Overview

Debug tooltips are automatically enabled in development mode (`NODE_ENV === 'development'`) and provide detailed information about each handle when hovering over them. This helps developers:

- Identify specific handles by ID and type
- See grid positioning and offset calculations
- Debug handle configuration issues
- Understand handle variants and styling

## Features

### Automatic Development Mode Detection

- Tooltips only appear when `process.env.NODE_ENV === 'development'`
- No impact on production builds
- No additional configuration required

### Comprehensive Handle Information

Each tooltip displays:

- **Node ID**: The parent node identifier
- **Handle ID**: Unique handle identifier
- **Type**: `source` or `target`
- **Grid Position**: `(gridX, gridY)` coordinates
- **React Flow Position**: Calculated edge position (`top`, `bottom`, `left`, `right`)
- **Final Offset**: Calculated pixel offset `(x, y)`
- **Custom Offsets**: Shows `offsetX` and `offsetY` if defined
- **Offset Mode**: `pixels` or `grid-units` if defined
- **Variant**: Handle color variant (`default`, `primary`, `debug`, `secondary`, `audio`)
- **Floating**: Whether handle is floating or static

### Smart Positioning

- Tooltips automatically position themselves to avoid overlapping the handle
- Position adapts based on handle edge location:
  - **Top handles**: Tooltip appears below
  - **Bottom handles**: Tooltip appears above
  - **Left handles**: Tooltip appears to the right
  - **Right handles**: Tooltip appears to the left

### Visual Design

- Dark theme with gray-900 background
- White text with blue accent for title
- Rounded corners and subtle shadow
- High z-index to appear above other elements
- Pointer events disabled to avoid interference

## Usage Examples

### Basic Handle with Tooltip

```tsx
const handles: GridHandle[] = [
	{
		id: 'input-1',
		type: 'target',
		gridX: 0,
		gridY: 3,
		variant: 'primary',
	},
];

// In development, hovering shows:
// Node: my-node-id
// ID: input-1
// Type: target
// Grid: (0, 3)
// Position: left
// Offset: (0.0, 224.0)px
// Variant: primary
```

### Handle with Custom Offsets

```tsx
const handles: GridHandle[] = [
	{
		id: 'output-1',
		type: 'source',
		gridX: 8,
		gridY: 4,
		variant: 'debug',
		offsetX: 0,
		offsetY: -8,
		offsetMode: 'pixels',
	},
];

// In development, hovering shows:
// Node: my-node-id
// ID: output-1
// Type: source
// Grid: (8, 4)
// Position: right
// Offset: (0.0, 248.0)px
// OffsetX: 0
// OffsetY: -8
// Mode: pixels
// Variant: debug
```

## Technical Implementation

### Component Structure

```tsx
// Tooltip state (only in development)
const [showTooltip, setShowTooltip] = useState(false);
const isDebugMode = process.env.NODE_ENV === 'development';

// Mouse event handlers (only in development)
const handleProps = {
	// ...other props
	...(isDebugMode && {
		onMouseEnter: () => setShowTooltip(true),
		onMouseLeave: () => setShowTooltip(false),
	}),
};

// Render tooltip conditionally
{
	isDebugMode && (
		<DebugTooltip
			handle={handleData}
			nodeId={nodeId}
			position={position}
			offset={offset}
			isVisible={showTooltip}
		/>
	);
}
```

### CSS Classes Used

```css
/* Tooltip positioning */
.absolute.z-50

/* Edge-specific positioning */
.bottom-full.left-1/2.transform.-translate-x-1/2.mb-2  /* Top handles */
.top-full.left-1/2.transform.-translate-x-1/2.mt-2     /* Bottom handles */
.right-full.top-1/2.transform.-translate-y-1/2.mr-2    /* Left handles */
.left-full.top-1/2.transform.-translate-y-1/2.ml-2     /* Right handles */

/* Tooltip styling */
.bg-gray-900.text-white.text-xs.rounded-lg.px-3.py-2.shadow-lg.border.border-gray-700.max-w-xs
```

## Testing

### DebugNode Example

The DebugNode demonstrates tooltips with 4 different handles:

1. **debug-input** (target, left edge, blue variant)
2. **debug-output** (source, right edge, blue variant)
3. **debug-aux-input** (target, left edge, purple variant, -8px Y offset)
4. **debug-aux-output** (source, right edge, purple variant, +8px Y offset)

### How to Test

1. Start development server: `pnpm run dev`
2. Add a DebugNode to the canvas
3. Hover over any handle to see tooltip
4. Verify tooltip shows correct information
5. Check tooltip positioning adapts to handle location

## Development Notes

- Tooltips use React state and mouse events for interaction
- Only minimal overhead in development (single useState per handle)
- Zero impact on production builds due to environment checks
- Tooltips are pointer-events-disabled to avoid interfering with connections
- All information shown is computed from current handle configuration

## Future Enhancements

Potential improvements for debug tooltips:

1. **Connection State**: Show connected edges and target nodes
2. **Store Integration**: Display store-related handle data
3. **Performance Metrics**: Show connection/disconnection timing
4. **Custom Debug Data**: Allow nodes to provide additional debug info
5. **Keyboard Shortcuts**: Toggle tooltip visibility with hotkeys
6. **Export Debug Data**: Copy handle configuration to clipboard

The current implementation provides a solid foundation for handle debugging while maintaining clean separation between development and production environments.
