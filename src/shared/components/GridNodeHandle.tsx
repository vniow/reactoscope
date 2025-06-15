import { Handle, Position } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { GRID_UNIT } from '../config/grid';
import { useFloatingHandles } from '../../flow/hooks/useFloatingPositions';

// Props interface for the GridNodeHandle
interface GridNodeHandleProps {
	id: string;
	type: 'source' | 'target';

	// === POSITIONING MODE ===
	/**
	 * Determines if the handle uses static grid positioning or dynamic floating positioning
	 * - 'static': Uses gridX/gridY for fixed grid-based positioning
	 * - 'floating': Uses floating logic to dynamically position based on connections
	 */
	mode?: 'static' | 'floating';

	// === STATIC GRID-BASED POSITIONING (required when mode='static') ===
	position?: Position; // React Flow position (required for static mode)
	gridX?: number; // Grid column position (required for static mode)
	gridY?: number; // Grid row position (required for static mode)

	// === FLOATING POSITIONING OPTIONS (used when mode='floating') ===
	nodeId?: string; // Node ID for floating calculations (required for floating mode)
	minDistanceThreshold?: number; // Minimum distance for floating positioning
	showDebugInfo?: boolean; // Show debug information for floating handles

	// === STYLING OPTIONS ===
	style?: CSSProperties;
	className?: string;
	size?: 'sm' | 'md' | 'lg';

	// === LABEL OPTIONS (for source handles) ===
	label?: string; // Text label to display inside source handles
	showLabel?: boolean; // Whether to show the label (default: true if label is provided)
}

/**
 * GridNodeHandle component - a unified handle system supporting both static and floating positioning
 *
 * VISUAL DESIGN:
 * - Source handles: Large pointed arrow SVG icons that can contain text labels
 *   Arrow points start their angle at the edge of the node where the handle is positioned
 *   Sized to accommodate labels: sm(64x32), md(80x40), lg(96x48)
 * - Target handles: Circle SVG icons indicating input connections
 * - Uses CSS custom properties for theming and color consistency
 *
 * STATIC MODE (mode='static'):
 * - gridX: Grid column position (required) - multiplied by GRID_UNIT (64px)
 * - gridY: Grid row position (required) - multiplied by GRID_UNIT (64px)
 * - position: React Flow position (required)
 * - Positioning is relative to the edge specified by the 'position' prop:
 *   • Position.Top/Left: Relative to top-left corner
 *   • Position.Right: gridX is relative to right edge, gridY to top edge
 *   • Position.Bottom: gridX is relative to left edge, gridY to bottom edge
 *
 * FLOATING MODE (mode='floating'):
 * - nodeId: Node ID for floating calculations (required)
 * - minDistanceThreshold: Minimum distance for optimal positioning
 * - showDebugInfo: Show debug information overlay
 * - Position is calculated dynamically based on connected nodes
 *
 * LABEL FUNCTIONALITY (source handles only):
 * - label: Text to display inside the arrow handle
 * - showLabel: Control label visibility (default: true if label is provided)
 *
 * EXAMPLES:
 * Static: gridX={1}, gridY={0}, position={Position.Top} = 64px from left, at top edge
 * Floating: nodeId="node-1", minDistanceThreshold={50} = dynamic positioning
 * With Label: label="Audio Out", showLabel={true} = displays text inside source arrow
 */
export function GridNodeHandle({
	id,
	type,
	mode = 'static',
	position,
	gridX,
	gridY,
	nodeId,
	minDistanceThreshold = 50,
	showDebugInfo = false,
	style = {},
	className,
	size = 'md',
	label,
	showLabel = true,
}: GridNodeHandleProps) {
	// Get floating positions if in floating mode
	const floatingPositions = useFloatingHandles(
		mode === 'floating' ? nodeId : undefined,
		{
			minDistanceThreshold,
		}
	);

	// Determine the final position to use
	const finalPosition =
		mode === 'floating' ? floatingPositions[type] : position;

	// Validation for required props based on mode
	if (mode === 'static') {
		if (!position || gridX === undefined || gridY === undefined) {
			console.error(
				'GridNodeHandle: Static mode requires position, gridX, and gridY props'
			);
			return null;
		}
	} else if (mode === 'floating') {
		if (!nodeId) {
			console.error('GridNodeHandle: Floating mode requires nodeId prop');
			return null;
		}
	}

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
					finalPosition,
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
		sizeClasses[size],
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
		// Remove background color since SVG handles it
		backgroundColor: 'transparent',
	};

	// Calculate positioning style
	const positionStyle: CSSProperties = {
		position: 'absolute',
	};

	// Apply positioning based on mode
	if (
		mode === 'static' &&
		position &&
		gridX !== undefined &&
		gridY !== undefined
	) {
		// Static grid-based positioning
		switch (position) {
			case Position.Top:
			case Position.Left:
				positionStyle.left = `${gridX * GRID_UNIT}px`;
				positionStyle.top = `${gridY * GRID_UNIT}px`;
				break;
			case Position.Right:
				positionStyle.right = `${gridX * GRID_UNIT}px`;
				positionStyle.top = `${gridY * GRID_UNIT}px`;
				break;
			case Position.Bottom:
				positionStyle.left = `${gridX * GRID_UNIT}px`;
				positionStyle.bottom = `${gridY * GRID_UNIT}px`;
				break;
		}
	}
	// For floating mode, React Flow handles the positioning automatically

	// Merge styles - combine positioning, background, and custom styles
	const finalStyle = { ...positionStyle, ...backgroundStyle, ...style };

	return (
		<>
			<Handle
				id={id}
				type={type}
				position={finalPosition!}
				style={finalStyle}
				className={handleClasses}
			>
				{/* Render SVG icon inside the handle */}
				{createHandleIcon()}
			</Handle>

			{/* Debug info for floating mode */}
			{mode === 'floating' && showDebugInfo && (
				<div
					style={{
						position: 'absolute',
						fontSize: '8px',
						color: 'var(--node-accent, #6366f1)',
						backgroundColor:
							'color-mix(in srgb, var(--node-accent, #6366f1) 10%, light-dark(white, #1e293b))',
						padding: '3px 6px',
						borderRadius: '4px',
						border: '1px solid var(--node-accent, #6366f1)',
						pointerEvents: 'none',
						fontWeight: 'bold',
						fontFamily: 'ui-monospace, monospace',
						boxShadow:
							'0 2px 4px color-mix(in srgb, var(--node-accent, #6366f1) 20%, transparent)',
						zIndex: 1000,
						...(type === 'source'
							? { bottom: '-22px', right: '-10px' }
							: { top: '-22px', left: '-10px' }),
					}}
				>
					FLOATING {type}: {finalPosition?.toLowerCase()}
				</div>
			)}
		</>
	);
}
