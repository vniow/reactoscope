import { Handle, Position } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { GRID_UNIT } from '../config/grid';
import { useFloatingHandles } from '../hooks/useFloatingPositions';

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
}

/**
 * GridNodeHandle component - a unified handle system supporting both static and floating positioning
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
 * EXAMPLES:
 * Static: gridX={1}, gridY={0}, position={Position.Top} = 64px from left, at top edge
 * Floating: nodeId="node-1", minDistanceThreshold={50} = dynamic positioning
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

	// Size variants
	const sizeClasses = {
		sm: 'w-6 h-6',
		md: 'w-8 h-8',
		lg: 'w-10 h-10',
	};

	// Shape based on handle type
	const shapeClass = type === 'source' ? 'rounded-none' : 'rounded-full';

	// Handle styling that matches node buttons and adapts to light/dark mode
	// Uses CSS custom properties to inherit the node's accent color and provide appropriate fill variants
	const handleClasses = [
		sizeClasses[size],
		shapeClass,
		'drop-shadow-md',
		'border-2',
		// Use CSS custom properties for colors - inherits from parent node's data-variant
		'border-[var(--node-accent,theme(colors.blue.500))]',
		'transition-colors',
		'duration-150',
		className,
	]
		.filter(Boolean)
		.join(' ');

	// Background color using CSS custom properties for better browser support
	const backgroundStyle: CSSProperties = {
		backgroundColor:
			type === 'source'
				? // Source handles: lighter fill (20% accent mix)
					'color-mix(in srgb, var(--node-accent, #3b82f6) 20%, light-dark(white, #374151))'
				: // Target handles: slightly more saturated fill (30% accent mix)
					'color-mix(in srgb, var(--node-accent, #3b82f6) 30%, light-dark(white, #374151))',
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
			/>

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
