import { Handle, Position } from '@xyflow/react';
import type { CSSProperties } from 'react';

// Simplified props interface - no grid positioning
interface NodeHandleProps {
	id: string;
	type: 'source' | 'target';
	position: Position;

	// === STYLING OPTIONS ===
	style?: CSSProperties;
	className?: string;
	size?: 'sm' | 'md' | 'lg';

	// === LABEL OPTIONS (for source handles) ===
	label?: string; // Text label to display inside source handles
	showLabel?: boolean; // Whether to show the label (default: true if label is provided)
}

/**
 * NodeHandle component - simplified positioning with CSS
 *
 * VISUAL DESIGN:
 * - Source handles: Large pointed arrow SVG icons that can contain text labels
 * - Target handles: Circle SVG icons indicating input connections
 * - Uses CSS custom properties for theming and color consistency
 *
 * POSITIONING:
 * - Uses React Flow's built-in positioning system
 * - Position can be customized via style prop if needed
 */
export function GridNodeHandle({
	id,
	type,
	position,
	style = {},
	className,
	size = 'md',
	label,
	showLabel = true,
}: NodeHandleProps) {
	// Size variants - both source and target handles use same arrow dimensions
	const sizeClasses = {
		sm: 'w-16 h-8',
		md: 'w-20 h-10',
		lg: 'w-24 h-12',
	};

	// Get SVG size in pixels for inline SVG - same dimensions for both source and target
	const getSvgSize = (
		size: 'sm' | 'md' | 'lg'
	): { width: number; height: number } => {
		switch (size) {
			case 'sm':
				return { width: 64, height: 32 };
			case 'md':
				return { width: 80, height: 40 };
			case 'lg':
				return { width: 96, height: 48 };
			default:
				return { width: 80, height: 40 };
		}
	};

	const svgDimensions = getSvgSize(size);

	// Create SVG icon based on handle type
	const createHandleIcon = () => {
		// Simplified styling with variant-aware colors
		const strokeColor = 'var(--node-accent, #3b82f6)';
		const fillColor =
			type === 'source'
				? 'color-mix(in srgb, var(--node-accent, #3b82f6) 25%, light-dark(white, #1e293b))'
				: 'color-mix(in srgb, var(--node-accent, #3b82f6) 35%, light-dark(white, #1e293b))';

		// Clean arrow shapes with simple translucency
		return (
			<svg
				width={svgDimensions.width}
				height={svgDimensions.height}
				viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
				style={{
					pointerEvents: 'none',
					filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
				}}
			>
				{/* Single arrow path with simple styling */}
				{getArrowPath(
					position,
					fillColor,
					strokeColor,
					svgDimensions,
					type
				)}

				{/* Add label text inside the arrow if provided */}
				{label && showLabel && (
					<text
						x={svgDimensions.width / 2}
						y={svgDimensions.height / 2 + 1}
						textAnchor='middle'
						dominantBaseline='middle'
						fill='var(--node-text-primary, light-dark(#374151, #f9fafb))'
						fontSize={size === 'sm' ? '10' : size === 'md' ? '12' : '14'}
						fontWeight='600'
						fontFamily='ui-sans-serif, system-ui, sans-serif'
						style={{ userSelect: 'none' }}
					>
						{label}
					</text>
				)}
			</svg>
		);
	};

	// Helper function to create arrow path based on position and handle type
	// Target handles point in the opposite direction of source handles
	const getArrowPath = (
		position: Position | undefined,
		fillColor: string,
		strokeColor: string,
		dimensions: { width: number; height: number },
		handleType: 'source' | 'target'
	) => {
		const { width, height } = dimensions;
		const centerX = width / 2;
		const centerY = height / 2;

		// Determine arrow direction based on handle type and position
		const getArrowDirection = (pos: Position | undefined) => {
			if (handleType === 'source') {
				return pos; // Source handles point in their natural direction
			} else {
				// Target handles point in the opposite direction
				switch (pos) {
					case Position.Right:
						return Position.Left;
					case Position.Left:
						return Position.Right;
					case Position.Bottom:
						return Position.Top;
					case Position.Top:
						return Position.Bottom;
					default:
						return Position.Left; // Default opposite of right
				}
			}
		};

		const arrowDirection = getArrowDirection(position);

		// Simple styling without complex filters
		const pathStyles = {
			fill: fillColor,
			stroke: strokeColor,
			strokeWidth: '2',
			strokeLinejoin: 'round' as const,
			opacity: '0.9',
		};

		switch (arrowDirection) {
			case Position.Right:
				// Arrow pointing right - elongated to fit label
				return (
					<path
						d={`M 4 4 L ${width - 12} 4 L ${width - 4} ${centerY} L ${width - 12} ${height - 4} L 4 ${height - 4} Z`}
						{...pathStyles}
					/>
				);
			case Position.Left:
				// Arrow pointing left - elongated to fit label
				return (
					<path
						d={`M ${width - 4} 4 L 12 4 L 4 ${centerY} L 12 ${height - 4} L ${width - 4} ${height - 4} Z`}
						{...pathStyles}
					/>
				);
			case Position.Bottom:
				// Arrow pointing down - wider to fit label
				return (
					<path
						d={`M 4 4 L ${width - 4} 4 L ${width - 4} ${height - 12} L ${centerX} ${height - 4} L 4 ${height - 12} Z`}
						{...pathStyles}
					/>
				);
			case Position.Top:
				// Arrow pointing up - wider to fit label
				return (
					<path
						d={`M 4 ${height - 4} L ${width - 4} ${height - 4} L ${width - 4} 12 L ${centerX} 4 L 4 12 Z`}
						{...pathStyles}
					/>
				);
			default:
				// Default left-pointing arrow (opposite of default right for source)
				return (
					<path
						d={`M ${width - 4} 4 L 12 4 L 4 ${centerY} L 12 ${height - 4} L ${width - 4} ${height - 4} Z`}
						{...pathStyles}
					/>
				);
		}
	};

	// Handle styling for SVG container - simplified since we're using SVG icons
	const handleClasses = [
		sizeClasses[size] || sizeClasses.md, // Safe access with fallback
		'transition-colors',
		'duration-150',
		// Remove border and background since SVG handles its own styling
		'bg-transparent',
		'border-0',
		'flex',
		'items-center',
		'justify-center',
		className,
	]
		.filter(Boolean)
		.join(' ');

	// Background style - simplified since SVG handles visual appearance
	const backgroundStyle: CSSProperties = {
		backgroundColor: 'transparent',
	};

	// Merge styles - combine background and custom styles (no positioning calculations)
	const finalStyle = { ...backgroundStyle, ...style };

	return (
		<>
			<Handle
				id={id}
				type={type}
				position={position}
				style={finalStyle}
				className={handleClasses}
			>
				{/* Render SVG icon inside the handle */}
				{createHandleIcon()}
			</Handle>
		</>
	);
}
