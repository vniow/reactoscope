# Reactoscope Styling Architecture

This document outlines the styling architecture for the Reactoscope project, which uses Tailwind CSS v4 with theme variable namespaces.

## Overview

The styling architecture follows these key principles:

1. Using Tailwind CSS v4's `@theme` directive with namespaces
2. Theme variables organized by component type and functionality
3. Consistent styling across node types using theme references
4. Dark mode support throughout the application

## Theme Structure

### Core Theme Definition

The theme is defined in `src/index.css` using the `@theme` directive, which organizes colors and other properties into logical namespaces:

```css
@theme {
  colors: {
    node: {
      debug: { ... },
      oscillator: { ... },
      gain: { ... },
      file: { ... },
      generic: { ... },
    },
    ui: {
      background: { ... },
      surface: { ... },
      border: { ... },
      text: { ... },
      input: { ... },
      button: { ... },
    }
  }
}
```

### Node Theme Structure

Each node type has its own theme namespace with consistent properties:

```css
debug: {
  bg: {
    DEFAULT: '#F87171',
    hover: '#FCA5A5',
    dark: '#B91C1C',
    /* more variants */
  },
  border: { ... },
  handle: { ... },
  text: { ... },
  button: { ... },
}
```

## Usage in Components

### Node Components

Node components use the `themeKey` property to access the correct theme variables:

```tsx
<BaseNode
	label='Oscillator'
	themeKey='oscillator'
	/* other props */
>
	{/* Node content */}
</BaseNode>
```

### Theme() Function Usage

The Tailwind `theme()` function is used to access theme variables:

```tsx
// In component class names
className = 'bg-[theme(colors.node.oscillator.bg.DEFAULT)]';

// In dark mode
className = 'dark:text-[theme(colors.node.oscillator.text.dark)]';
```

### Component Hierarchy

1. `BaseNode.tsx` - Core node component with theme handling
2. Specific node types (e.g., `OscillatorNode.tsx`, `DebugNode.tsx`) - Use BaseNode with appropriate theme keys
3. Helper components (`NodeButton`, `NodePre`) - Styled according to node theme

## CSS Structure

1. `index.css` - Core theme definitions and base styles
2. `styles/flow.css` - Flow-specific and node-specific utility styles

## Benefits

1. **Consistency**: Common styling approach across all node types
2. **Maintainability**: Centralized theme definition
3. **Flexibility**: Easy to add new node types with consistent styling
4. **Dark Mode**: Built-in support for dark mode through theme variables

## Type Safety

The component system uses TypeScript to ensure theme keys are valid:

```typescript
// In types/nodes.ts
export const NODE_THEME_KEYS: Record<NodeType, string> = {
	[NodeType.DEBUG]: 'debug',
	[NodeType.OSCILLATOR]: 'oscillator',
	// other mappings
};
```

## Future Improvements

1. Add responsive variants for different screen sizes
2. Implement animation themes for interactive elements
3. Create theme presets that users can select from
4. Add accessibility features through theme variables
