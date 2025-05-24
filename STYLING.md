# Reactoscope Styling Architecture

This document outlines the styling architecture for the Reactoscope project, which uses Tailwind CSS v4 with CSS custom properties and a comprehensive slot-based component system.

## Overview

The styling architecture follows these key principles:

1. **Centralized Styling Hook**: Using `useNodeStyles` hook for consistent styling logic
2. **Slot-based Architecture**: Flexible content composition with header, toolbar, content, and footer slots
3. **Theme-driven Design**: CSS custom properties organized by component type and functionality
4. **Component Composition**: Reusable components (`NodeButton`, `NodePre`) with theme integration
5. **Dark Mode Support**: Built-in dark mode variants throughout the application

## Architecture Components

### 1. useNodeStyles Hook

The `useNodeStyles` hook centralizes all styling logic and returns consistent class strings:

```typescript
export interface NodeStyleOptions {
	themeKey: string; // Theme identifier (e.g., 'debug', 'oscillator')
	isDragging?: boolean; // State-aware styling
	isHovering?: boolean; // Hover state styling
	isSelected?: boolean; // Selection state styling
	isCompact?: boolean; // Responsive compact mode
	variant?: 'node' | 'ui'; // Component variant styling
}

export interface NodeStyleClasses {
	container: string; // Main node container
	header: string; // Node header styling
	content: string; // Content area styling
	toolbar: string; // Toolbar section styling
	footer: string; // Footer section styling
	handleBase: string; // Base handle styling
	themedHandle: string; // Theme-aware handle styling
	button: string; // Button component styling
	pre: string; // Pre-formatted text styling
}
```

### 2. Slot-based Node Architecture

Nodes are composed using a flexible slot system:

```typescript
export interface NodeSlots {
	header?: ReactNode; // Custom header content
	toolbar?: ReactNode; // Action buttons and status indicators
	content?: ReactNode; // Main node functionality
	footer?: ReactNode; // Additional info and metadata
}
```

### 3. Component Hierarchy

```
BaseNode (Core container with theme handling)
├── SlottedContent (Slot renderer)
│   ├── NodeHeader (Optional custom header)
│   ├── NodeToolbar (Action buttons and status)
│   ├── NodeContent (Main functionality)
│   └── NodeFooter (Metadata and info)
├── NodeButton (Theme-aware buttons)
├── NodePre (Styled pre-formatted text)
└── BaseHandle (Connection points)
```

## Theme Structure

### CSS Custom Properties

The theme is defined in `src/index.css` using CSS custom properties with a flat namespace structure:

```css
@theme {
	/* Node Theme Colors - Debug */
	--color-node-debug-DEFAULT: #f87171;
	--color-node-debug-border: #dc2626;
	--color-node-debug-text: #000000;
	--color-node-debug-handle: #ef4444;
	--color-node-debug-dark-DEFAULT: #dc2626;
	--color-node-debug-dark-border: #b91c1c;
	--color-node-debug-dark-text: #ffffff;
	--color-node-debug-dark-handle: #f87171;

	/* Node Theme Colors - Oscillator */
	--color-node-oscillator-DEFAULT: #60a5fa;
	--color-node-oscillator-border: #2563eb;
	--color-node-oscillator-text: #ffffff;
	--color-node-oscillator-handle: #3b82f6;
	--color-node-oscillator-dark-DEFAULT: #2563eb;
	--color-node-oscillator-dark-border: #1d4ed8;
	--color-node-oscillator-dark-text: #ffffff;
	--color-node-oscillator-dark-handle: #60a5fa;

	/* UI Elements */
	--color-ui-input-bg: #f9fafb;
	--color-ui-input-border: #d1d5db;
	--color-ui-input-text: #111827;
	--color-ui-input-dark-bg: #374151;
	--color-ui-input-dark-border: #6b7280;
	--color-ui-input-dark-text: #f9fafb;

	--color-ui-button-primary-bg: #3b82f6;
	--color-ui-button-primary-text: #ffffff;
	--color-ui-button-primary-bg-hover: #2563eb;

	/* Border radius */
	--radius-node: 0.75rem;
}
```

### Theme Key Mapping

Node types are mapped to theme keys through TypeScript constants:

```typescript
export const NODE_THEME_KEYS: Record<NodeType, string> = {
	[NodeType.DEBUG]: 'debug',
	[NodeType.OSCILLATOR]: 'oscillator',
	[NodeType.GAIN]: 'gain',
	// other mappings
};
```

## Usage in Components

### Slot-based Node Components

Node components use the slot-based architecture with the `createNodeSlots` utility:

```tsx
// Example: OscillatorNode implementation
const slots = createNodeSlots({
	toolbar: (
		<div className='flex items-center justify-between w-full'>
			<NodeButton
				onClick={togglePlay}
				themeKey={themeKey}
				variant='node'
			>
				{isPlaying ? 'Stop' : 'Play'}
			</NodeButton>
			<div className='text-xs opacity-75'>
				{isPlaying ? '🔊' : '🔇'} {frequency.toFixed(0)}Hz
			</div>
		</div>
	),
	content: (
		<div className='flex flex-col gap-3 w-full'>
			{/* Frequency and waveform controls */}
		</div>
	),
	footer: <div className='text-center text-xs opacity-60'>ID: {id}</div>,
});

return (
	<BaseNode
		label='Oscillator'
		themeKey={NODE_THEME_KEYS[NodeTypes.OSCILLATOR]}
		slots={slots}
		/* other props */
	/>
);
```

### useNodeStyles Hook Usage

The styling hook provides all necessary classes:

```tsx
const styles = useNodeStyles({
	themeKey: 'oscillator',
	isDragging,
	isHovering,
	isCompact: window.innerWidth < 768,
	variant: 'node',
});

// Usage:
<div className={styles.container}>
	<div className={styles.header}>Header</div>
	<div className={styles.toolbar}>Toolbar</div>
	<div className={styles.content}>Content</div>
	<div className={styles.footer}>Footer</div>
</div>;
```

### Component-specific Styling

#### NodeButton Component

```tsx
<NodeButton
	onClick={handleAction}
	themeKey='oscillator'
	variant='node' // 'node' | 'ui'
	className='w-full'
>
	Button Text
</NodeButton>
```

#### NodePre Component

```tsx
<NodePre
	themeKey='debug'
	className='mt-2'
>
	{JSON.stringify(debugData, null, 2)}
</NodePre>
```

## CSS Structure

1. `src/index.css` - Core theme definitions using CSS custom properties
2. `src/styles/flow.css` - Flow-specific and node-specific utility styles
3. `src/hooks/useNodeStyles.ts` - Centralized styling logic and class generation
4. `src/components/nodes/NodeSlots.tsx` - Slot component definitions
5. `src/components/nodes/nodeSlotUtils.ts` - Slot creation utilities

## Styling Features

### State-aware Styling

The `useNodeStyles` hook provides dynamic styling based on component state:

```typescript
const styles = useNodeStyles({
	themeKey: 'oscillator',
	isDragging: true, // Applies scale transform and enhanced shadow
	isHovering: true, // Applies hover effects
	isSelected: true, // Applies selection ring
	isCompact: true, // Responsive sizing for mobile
});
```

### Responsive Design

- Compact mode automatically triggered on screens < 768px
- Smaller text sizes, padding, and spacing in compact mode
- Responsive button and input sizing

### Theme Variants

- **Node variant**: Uses node-specific theme colors
- **UI variant**: Uses generic UI colors for consistent interface elements

### Slot-specific Styling

Each slot receives appropriate styling classes:

- **Toolbar**: Horizontal flex layout with borders
- **Content**: Scrollable area with proper spacing
- **Footer**: Bottom-aligned with reduced opacity

## Benefits

1. **Consistency**: Centralized styling logic ensures uniform appearance across all node types
2. **Maintainability**: Single source of truth for styling in `useNodeStyles` hook
3. **Flexibility**: Slot-based architecture allows for diverse node layouts while maintaining consistency
4. **Performance**: Memoized styling calculations prevent unnecessary re-renders
5. **Type Safety**: TypeScript interfaces ensure proper theme key usage
6. **Scalability**: Easy to add new node types with consistent styling patterns
7. **Dark Mode**: Built-in support through CSS custom properties
8. **Responsive**: Automatic compact mode for mobile devices

## Implementation Examples

### Creating a New Node Type

1. **Define theme colors** in `src/index.css`:

```css
--color-node-filter-DEFAULT: #8b5cf6;
--color-node-filter-border: #7c3aed;
--color-node-filter-text: #ffffff;
--color-node-filter-handle: #a78bfa;
```

2. **Add theme key mapping**:

```typescript
export const NODE_THEME_KEYS: Record<NodeType, string> = {
	// ...existing keys
	[NodeType.FILTER]: 'filter',
};
```

3. **Implement node component**:

```tsx
export default function FilterNode({ id, data, isConnectable }: NodeProps) {
	const themeKey = NODE_THEME_KEYS[NodeTypes.FILTER];

	const slots = createNodeSlots({
		toolbar: <FilterControls />,
		content: <FilterSettings />,
		footer: <FilterInfo />,
	});

	return (
		<BaseNode
			label='Filter'
			themeKey={themeKey}
			slots={slots}
			isConnectable={isConnectable}
		/>
	);
}
```

### Backward Compatibility

The system maintains backward compatibility with children-based nodes:

```tsx
<BaseNode themeKey='debug' /* other props */>
	<div>Legacy content using children prop</div>
</BaseNode>
```

## Future Improvements

1. **Node Context System**: Implement React Context for shared node state and theming to eliminate prop drilling
2. **Theme Presets**: Allow users to select from different color schemes and themes
3. **Animation Themes**: Add coordinated animations and transitions for interactive elements
4. **Advanced Responsive Design**: Implement container queries for more granular responsive behavior
5. **Accessibility Enhancements**: Add high contrast themes and focus management
6. **Custom Theme Builder**: UI for creating and customizing node themes
7. **Theme Persistence**: Save user theme preferences to localStorage
8. **CSS-in-JS Migration**: Consider migrating to styled-components or emotion for more dynamic theming

## File Structure Summary

```
src/
├── index.css                     # Theme definitions
├── styles/
│   └── flow.css                  # Flow-specific styles
├── hooks/
│   └── useNodeStyles.ts          # Centralized styling logic
├── components/
│   ├── nodes/
│   │   ├── BaseNode.tsx          # Core node component
│   │   ├── NodeSlots.tsx         # Slot components
│   │   ├── nodeSlotUtils.ts      # Slot utilities
│   │   ├── DebugNode.tsx         # Example slot-based node
│   │   ├── OscillatorNode.tsx    # Example slot-based node
│   │   └── index.ts              # Node exports
│   └── handles/
│       └── BaseHandle.tsx        # Connection handle component
└── types/
    └── nodes.ts                  # Type definitions and theme mappings
```
