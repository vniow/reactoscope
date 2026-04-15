# Node Theming Architecture

## Overview

The reactoscope-next theming system provides a scalable, type-safe approach to styling different node types using Tailwind v4's class-based approach. The architecture supports:

- **Per-node-type theming** with consistent color schemes
- **Easy extensibility** for new node types
- **Type safety** with TypeScript
- **Dark mode support** via Tailwind utilities
- **Programmatic color access** for canvas/WebGL rendering

## Architecture Components

### 1. Theme Store (`themeSlice.ts`)

Zustand slice that manages:

- Node theme definitions
- Node type to theme mappings
- Runtime theme updates

### 2. Theme Hook (`useNodeTheme.ts`)

React hook that provides:

- Theme data for specific node types
- Pre-built CSS classes
- Variant utilities

### 3. Themed Components

- `ThemedNode`: Base node container
- `ThemedButton`, `ThemedLabel`, etc.: Styled controls

## Usage

### Basic Node Implementation

```tsx
import { ThemedNode } from '../../shared/components/ThemedNode';
import {
	ThemedButton,
	ThemedRangeInput,
} from '../../shared/components/ThemedControls';

export function MyNode({ id, data }: NodeProps<CustomNode>) {
	return (
		<ThemedNode
			nodeType='oscillator' // Maps to theme
			title='My Node'
			handles={{
				inputs: [{ id: 'in' }],
				outputs: [{ id: 'out' }],
			}}
		>
			<ThemedRangeInput
				nodeType='oscillator'
				min='0'
				max='100'
				// ...other props
			/>

			<ThemedButton
				nodeType='oscillator'
				onClick={handleClick}
			>
				Click Me
			</ThemedButton>
		</ThemedNode>
	);
}
```

### Adding New Node Types

1. **Add theme definition** (if needed):

```tsx
// In themeSlice.ts
export const NODE_THEMES = {
	// ...existing themes
	myNewTheme: {
		name: 'My New Theme',
		primary: 'pink-500',
		secondary: 'pink-400',
		// ...other colors
	},
};
```

2. **Map node type to theme**:

```tsx
export const NODE_TYPE_THEME_MAP = {
	// ...existing mappings
	mynewnode: 'myNewTheme',
};
```

3. **Use in component**:

```tsx
<ThemedNode
	nodeType='mynewnode'
	title='My New Node'
>
	{/* content */}
</ThemedNode>
```

### Custom Styling

For advanced customization, use the hook directly:

```tsx
function MyCustomNode({ nodeType }: { nodeType: string }) {
	const { theme, classes, getVariantClasses } = useNodeTheme(nodeType);

	const primaryVariant = getVariantClasses('primary');

	return (
		<div className={`${classes.container} my-custom-class`}>
			<div className={primaryVariant.bg}>Custom styled content</div>
		</div>
	);
}
```

## Predefined Node Categories

### Audio Generation

- **oscillator**: Blue theme for oscillators and signal generators
- **noise**: Purple theme for noise generators

### Audio Processing

- **filter**: Orange theme for filters and effects
- **gain**: Yellow theme for gain and volume controls
- **delay**: Teal theme for delay and reverb effects

### Audio Output

- **destination**: Green theme for output and destination nodes

### Visualization

- **oscilloscope**: Cyan theme for scopes and analyzers

### 3D/WebGL

- **threejs**: Indigo theme for 3D and WebGL nodes

### Utility

- **debug**: Gray theme for debug and utility nodes

## Dynamic Theme Updates

```tsx
// Update a theme at runtime
const updateNodeTheme = useStore((state) => state.updateNodeTheme);

updateNodeTheme('oscillator', {
	primary: 'red-500', // Change oscillator theme to red
});

// Add new node type mapping
const addNodeTypeMapping = useStore((state) => state.addNodeTypeMapping);
addNodeTypeMapping('newnode', 'oscillator');
```

## Programmatic Color Access

For canvas rendering or other programmatic use:

```tsx
import { getNodeThemeColors } from '../../shared/hooks/useNodeTheme';

function MyCanvasComponent() {
	const colors = getNodeThemeColors('oscillator');

	useEffect(() => {
		// Use colors.primary, colors.secondary, etc. in canvas drawing
		const ctx = canvasRef.current?.getContext('2d');
		if (ctx) {
			ctx.fillStyle = colors.primary;
			ctx.fillRect(0, 0, 100, 100);
		}
	}, [colors]);

	return <canvas ref={canvasRef} />;
}
```

## Benefits

### 🎨 **Consistent Visual Design**

- All nodes follow the same design patterns
- Color schemes are semantically meaningful
- Automatic dark mode support

### 🔧 **Easy Maintenance**

- Change theme in one place, applies everywhere
- Type-safe theme definitions
- Clear separation of styling logic

### 🚀 **Scalable Architecture**

- Add new node types without touching existing code
- Support for unlimited theme variations
- Runtime theme switching capability

### 📱 **Responsive & Accessible**

- Built on Tailwind's responsive utilities
- Consistent spacing and typography
- Proper contrast ratios

## Migration from Hardcoded Styles

**Before:**

```tsx
<div className='bg-blue-500 border-2 border-blue-600'>
	<button className='bg-blue-600 hover:bg-blue-700'>Click me</button>
</div>
```

**After:**

```tsx
<ThemedNode
	nodeType='oscillator'
	title='Node'
>
	<ThemedButton
		nodeType='oscillator'
		onClick={handler}
	>
		Click me
	</ThemedButton>
</ThemedNode>
```

This approach provides better maintainability, consistency, and extensibility for your growing node library.
