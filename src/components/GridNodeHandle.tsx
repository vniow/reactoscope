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
	color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
	variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio'; // For floating mode styling
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
	color = 'default',
	variant = 'default',
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

	// Color variants for different handle types
	const colorClasses = {
		default: type === 'source' ? '!bg-emerald-500' : '!bg-blue-500',
		primary: '!bg-blue-600',
		secondary: '!bg-gray-500',
		success: '!bg-green-500',
		warning: '!bg-yellow-500',
		error: '!bg-red-500',
	};

	// Floating mode variant styles (similar to FloatingHandle)
	const floatingVariantStyles = {
		default: {
			backgroundColor: '#94a3b8',
			border: '2px solid #475569',
		},
		primary: {
			backgroundColor: '#3b82f6',
			border: '2px solid #1e40af',
		},
		debug: {
			backgroundColor: '#e91e63',
			border: '2px solid #ad1457',
		},
		secondary: {
			backgroundColor: '#64748b',
			border: '2px solid #334155',
		},
		audio: {
			backgroundColor: '#10b981',
			border: '2px solid #047857',
		},
	};

	// Shape based on handle type
	const shapeClass = type === 'source' ? 'rounded-none' : 'rounded-full';

	// Combine all Tailwind classes
	const handleClasses = [
		sizeClasses[size],
		shapeClass,
		'drop-shadow-md',
		'border-2 border-white',
		mode === 'static' ? colorClasses[color] : '', // Use Tailwind for static, inline styles for floating
		className,
	]
		.filter(Boolean)
		.join(' ');

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

	// Merge styles - floating mode gets variant styles
	const finalStyle =
		mode === 'floating'
			? { ...positionStyle, ...floatingVariantStyles[variant], ...style }
			: { ...positionStyle, ...style };

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
						color: floatingVariantStyles[variant].backgroundColor,
						backgroundColor: 'rgba(255,255,255,0.95)',
						padding: '3px 6px',
						borderRadius: '4px',
						border: `1px solid ${floatingVariantStyles[variant].backgroundColor}`,
						pointerEvents: 'none',
						fontWeight: 'bold',
						fontFamily: 'ui-monospace, monospace',
						boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
