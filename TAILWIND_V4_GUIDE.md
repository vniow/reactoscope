# Tailwind v4 Theme Variables - Implementation Guide

## Overview

Tailwind v4 introduces a CSS-first approach to theming using the `@theme` directive, replacing the traditional `tailwind.config.js` file. This guide shows how to implement and use theme variables in your Reactoscope project.

## 1. Theme Configuration (`@theme` directive)

Your theme is now defined in CSS using the `@theme` directive in your `index.css`:

```css
@theme {
	/* Semantic color system */
	--color-canvas: #f8fafc;
	--color-surface: #ffffff;
	--color-variant-audio: #f97316;
	--color-variant-primary: #22c55e;

	/* Interactive states with automatic dark mode */
	--color-interactive-bg: light-dark(#ffffff, #1e293b);
	--color-interactive-border: light-dark(#cbd5e1, #475569);

	/* Spacing system */
	--spacing-grid-unit: 20px;
	--spacing-handle-md: 2rem;

	/* Animation tokens */
	--duration-normal: 200ms;
	--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 2. Using Theme Variables in Components

### Method 1: Tailwind Utilities with Arbitrary Values

```tsx
function MyComponent() {
	return (
		<div
			className='
      bg-[var(--color-surface)] 
      border-[var(--color-interactive-border)]
      rounded-[var(--radius-lg)]
      p-[var(--spacing-handle-md)]
      shadow-[var(--shadow-elevated)]
      transition-all duration-[var(--duration-normal)]
    '
		>
			Content here
		</div>
	);
}
```

### Method 2: CSS Custom Properties in Style Objects

```tsx
function MyCard({ variant = 'primary' }) {
	const style = {
		backgroundColor: 'var(--color-surface)',
		borderColor: `var(--color-variant-${variant})`,
		borderRadius: 'var(--radius-lg)',
		padding: 'var(--spacing-handle-md)',
		transition: `all var(--duration-normal) var(--ease-standard)`,
	};

	return <div style={style}>Card content</div>;
}
```

### Method 3: Semantic CSS Classes

Create reusable classes in your CSS:

```css
.interactive-surface {
	background-color: var(--color-interactive-bg);
	border: 1px solid var(--color-interactive-border);
	border-radius: var(--radius-control);
	transition: all var(--duration-normal) var(--ease-standard);
}

.variant-audio {
	--variant-color: var(--color-variant-audio);
	border-color: var(--variant-color);
	color: var(--variant-color);
	background-color: color-mix(in srgb, var(--variant-color) 10%, transparent);
}
```

Then use them in components:

```tsx
function AudioButton() {
	return (
		<button className='interactive-surface variant-audio px-4 py-2'>
			Audio Control
		</button>
	);
}
```

## 3. Advanced Features

### Using `color-mix()` for Dynamic Colors

```css
.hover-effect:hover {
	background-color: color-mix(
		in srgb,
		var(--color-variant-primary) 20%,
		transparent
	);
}
```

### Grid System with Theme Variables

```tsx
function GridBlock({ gridX, gridY, gridWidth, gridHeight }) {
	const style = {
		'--grid-x': gridX,
		'--grid-y': gridY,
		position: 'absolute',
		left: 'calc(var(--grid-x) * var(--spacing-grid-unit))',
		top: 'calc(var(--grid-y) * var(--spacing-grid-unit))',
		width: 'calc(var(--grid-width) * var(--spacing-grid-unit))',
		height: 'calc(var(--grid-height) * var(--spacing-grid-unit))',
	};

	return (
		<div
			style={style}
			className='grid-block'
		>
			Content
		</div>
	);
}
```

### Automatic Dark Mode with `light-dark()`

```css
@theme {
	--color-interactive-bg: light-dark(#ffffff, #1e293b);
	--color-text: light-dark(#1f2937, #f9fafb);
}
```

## 4. Migration from Your Current System

### Before (styleUtils.ts)

```typescript
// Complex utility functions
export function getVariantClasses(variant: ComponentVariant, type: string) {
	const styles = VARIANT_STYLES[variant];
	switch (type) {
		case 'border':
			return styles.border;
		case 'background':
			return styles.background;
		// ... more cases
	}
}
```

### After (Simplified)

```typescript
// Simple utility functions
export function getVariantClass(variant: ComponentVariant): string {
	return `variant-${variant}`;
}

export function cn(...classes: (string | undefined | false)[]): string {
	return clsx(classes);
}
```

## 5. Component Pattern Examples

### Theme-Aware Button Component

```tsx
function ThemeButton({ variant = 'primary', size = 'md', children, ...props }) {
	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg',
	};

	return (
		<button
			className={cn(
				'interactive-surface font-medium rounded-[var(--radius-control)]',
				'transition-all duration-[var(--duration-normal)]',
				'hover:scale-105 active:scale-95',
				sizeClasses[size],
				`variant-${variant}`
			)}
			{...props}
		>
			{children}
		</button>
	);
}
```

### Audio Node with Theme Integration

```tsx
function AudioNode({ title, selected, children }) {
	return (
		<div
			className={cn(
				'audio-node min-w-[150px] min-h-[100px]',
				selected && 'selected'
			)}
		>
			<div className='node-header'>{title}</div>
			<div className='flex-1 p-2'>{children}</div>
		</div>
	);
}
```

## 6. Best Practices

### ✅ Do's

- Use semantic variable names (`--color-surface` not `--color-white`)
- Leverage `color-mix()` for transparent backgrounds and hover states
- Use `light-dark()` for automatic dark mode support
- Create reusable utility classes for common patterns
- Use `calc()` for responsive spacing based on grid units

### ❌ Don'ts

- Don't hardcode color values in components
- Don't create complex utility functions when CSS can handle it
- Don't duplicate theme values in multiple places
- Don't use absolute positioning without theme-based calculations

## 7. Performance Benefits

1. **Smaller Bundle Size**: No JavaScript configuration object
2. **Better Tree Shaking**: Unused CSS variables are automatically removed
3. **Faster Development**: Hot reload works better with CSS-only changes
4. **Better Caching**: Theme changes don't require JavaScript bundle rebuilds

## 8. Debugging Theme Variables

Use browser dev tools to inspect CSS custom properties:

```javascript
// In browser console
getComputedStyle(document.documentElement).getPropertyValue(
	'--color-variant-audio'
);
```

Or create a debug component:

```tsx
function ThemeDebugger() {
	const [value, setValue] = useState('');

	const checkThemeValue = (variable) => {
		const computed = getComputedStyle(
			document.documentElement
		).getPropertyValue(`--${variable}`);
		setValue(computed);
	};

	return (
		<div className='p-4 border rounded'>
			<input
				placeholder='Enter theme variable (e.g., color-variant-audio)'
				onChange={(e) => checkThemeValue(e.target.value)}
			/>
			<p>Value: {value}</p>
		</div>
	);
}
```

This approach gives you a more maintainable, performant, and scalable design system that's fully aligned with Tailwind v4's philosophy.
