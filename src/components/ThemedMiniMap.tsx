import { MiniMap, type Node } from '@xyflow/react';
import { useAppStore } from '../stores/appStore';
import { getThemeValue } from '../utils/themeUtils';
import type { ComponentVariant } from '../types/ui';

/**
 * ThemedMiniMap - A styled React Flow MiniMap component that integrates with the application's theming system
 *
 * Features:
 * - Glass morphism styling with backdrop blur effects
 * - Variant-aware coloring that matches the application's color system
 * - Automatic dark/light theme adaptation
 * - Rainbow theme support with enhanced contrast
 * - Customizable positioning (top-left, top-right, bottom-left, bottom-right)
 * - Enhanced node styling with variant-based colors
 * - Smooth transitions and hover effects
 * - CSS custom properties for consistent theming
 *
 * @example
 * ```tsx
 * <ThemedMiniMap
 *   variant="source"
 *   position="bottom-right"
 *   pannable={true}
 *   nodeStrokeWidth={1.5}
 *   nodeBorderRadius={3}
 * />
 * ```
 */

interface ThemedMiniMapProps {
	/** The color variant to use for theming (matches node variants) */
	variant?: ComponentVariant;
	/** Position of the minimap on the screen */
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	/** Whether the minimap viewport is pannable */
	pannable?: boolean;
	/** Whether the minimap is zoomable */
	zoomable?: boolean;
	/** Accessibility label for screen readers */
	ariaLabel?: string;
	/** Additional CSS classes */
	className?: string;
	/** Custom inline styles */
	style?: React.CSSProperties;
	/** Stroke width for minimap nodes */
	nodeStrokeWidth?: number;
	/** Custom function to determine node colors */
	nodeColor?: (node: Node) => string;
	/** Border radius for minimap nodes */
	nodeBorderRadius?: number;
	/** Custom mask color for the viewport indicator */
	maskColor?: string;
}

export function ThemedMiniMap({
	variant = 'core',
	position = 'bottom-right',
	pannable = true,
	zoomable = false,
	ariaLabel = 'Flow MiniMap',
	className = '',
	style = {},
	nodeStrokeWidth = 1,
	nodeColor,
	nodeBorderRadius = 2,
	maskColor,
	...props
}: ThemedMiniMapProps) {
	// Get theme state
	const actualTheme = useAppStore((state) => state.theme.actualTheme);
	const metallicBackground = useAppStore(
		(state) => state.theme.metallicBackground
	);

	// Calculate themed colors based on current theme
	const getThemedColors = () => {
		const isDark = actualTheme === 'dark';
		const isRainbow = metallicBackground === 'rainbow';

		// Base colors that work with both themes
		const baseColors = {
			// MiniMap background - glass effect with theme awareness
			bgColor: isDark
				? 'rgba(30, 41, 59, 0.85)' // dark:bg-slate-800/85
				: 'rgba(248, 250, 252, 0.85)', // light:bg-slate-50/85

			// Mask color for the viewport indicator
			maskColor:
				maskColor ||
				(isDark
					? 'rgba(0, 0, 0, 0.6)' // Darker overlay for dark theme
					: 'rgba(0, 0, 0, 0.2)'), // Lighter overlay for light theme
		};

		// Adjust for rainbow theme
		if (isRainbow) {
			return {
				...baseColors,
				// For rainbow theme, use a more neutral background
				bgColor: isDark
					? 'rgba(51, 65, 85, 0.9)' // More opaque slate for rainbow contrast
					: 'rgba(241, 245, 249, 0.9)',
				maskColor: maskColor || 'rgba(0, 0, 0, 0.3)', // Enhanced contrast for rainbow
			};
		}

		return baseColors;
	};

	const themedColors = getThemedColors();

	// Default node color function that respects variant theming
	const defaultNodeColor = (node: Node) => {
		if (nodeColor) return nodeColor(node);

		// Extract variant from node data or default to core
		const nodeVariant =
			(node.data as { variant?: ComponentVariant })?.variant || variant;

		// Use CSS custom property for variant color
		return `var(--color-variant-${nodeVariant}, var(--color-variant-core))`;
	};

	// Build container style with theme variables
	const containerStyle: React.CSSProperties = {
		// Use CSS custom properties for variant-aware styling
		'--minimap-accent': getThemeValue(`color-variant-${variant}`),
		'--minimap-border': `color-mix(in srgb, var(--minimap-accent) 40%, transparent)`,
		'--minimap-shadow': `color-mix(in srgb, var(--minimap-accent) 20%, transparent)`,

		// Container positioning and styling
		position: 'absolute',
		...getPositionStyles(position),

		// Glass morphism styling
		borderRadius: getThemeValue('radius-control'),
		border: `1px solid var(--minimap-border)`,
		backdropFilter: 'blur(12px) saturate(150%)',
		WebkitBackdropFilter: 'blur(12px) saturate(150%)',

		// Enhanced shadow with theme colors
		boxShadow: `
			0 4px 6px -1px var(--minimap-shadow),
			0 2px 4px -2px var(--minimap-shadow),
			inset 0 1px 0 ${
				actualTheme === 'dark'
					? 'rgba(255, 255, 255, 0.05)'
					: 'rgba(255, 255, 255, 0.2)'
			}
		`,

		// Subtle gradient overlay
		background: `
			linear-gradient(135deg, 
				${themedColors.bgColor} 0%, 
				color-mix(in srgb, var(--minimap-accent) 5%, ${themedColors.bgColor}) 100%
			)
		`,

		// Smooth transitions
		transition: `all ${getThemeValue('duration-normal')} ${getThemeValue('ease-standard')}`,

		...style,
	} as React.CSSProperties;

	// Build className with theme-aware classes
	const miniMapClasses = [
		'themed-minimap',
		`variant-${variant}`,
		`position-${position}`,
		'transition-all',
		'duration-200',
		'hover:scale-[1.02]',
		'group',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div
			style={containerStyle}
			className={miniMapClasses}
			data-variant={variant}
		>
			<MiniMap
				pannable={pannable}
				zoomable={zoomable}
				bgColor={themedColors.bgColor}
				maskColor={themedColors.maskColor}
				nodeColor={defaultNodeColor}
				nodeStrokeWidth={nodeStrokeWidth}
				nodeBorderRadius={nodeBorderRadius}
				ariaLabel={ariaLabel}
				style={{
					borderRadius: getThemeValue('radius-control'),
					overflow: 'hidden',
				}}
				{...props}
			/>

			{/* Optional accent border overlay */}
			<div
				className='absolute inset-0 rounded-[var(--radius-control)] pointer-events-none'
				style={{
					background: `linear-gradient(45deg, 
						var(--minimap-accent) 0%, 
						transparent 20%, 
						transparent 80%, 
						var(--minimap-accent) 100%
					)`,
					opacity: 0.1,
					mixBlendMode: actualTheme === 'dark' ? 'screen' : 'multiply',
				}}
			/>
		</div>
	);
}

// Helper function to get position styles
function getPositionStyles(position: string): React.CSSProperties {
	const offset = 16; // 1rem equivalent

	switch (position) {
		case 'top-left':
			return { top: offset, left: offset };
		case 'top-right':
			return { top: offset, right: offset };
		case 'bottom-left':
			return { bottom: offset, left: offset };
		case 'bottom-right':
		default:
			return { bottom: offset, right: offset };
	}
}
