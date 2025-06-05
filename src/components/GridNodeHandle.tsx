import { Handle, Position } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { GRID_UNIT } from '../config/grid';

// Props interface for the GridNodeHandle
interface GridNodeHandleProps {
	id: string;
	type: 'source' | 'target';
	position: Position;

	// === GRID-BASED POSITIONING ===
	// Grid coordinates (uses GRID_UNIT = 64px system)
	gridX: number; // Grid column position (required)
	gridY: number; // Grid row position (required)

	// === STYLING OPTIONS ===
	style?: CSSProperties;
	className?: string;
	size?: 'sm' | 'md' | 'lg';
	color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

/**
 * GridNodeHandle component - a simplified, grid-aligned abstraction over React Flow's Handle
 *
 * GRID-BASED POSITIONING:
 * - gridX: Grid column position (required) - multiplied by GRID_UNIT (64px)
 * - gridY: Grid row position (required) - multiplied by GRID_UNIT (64px)
 * - Positioning is relative to the edge specified by the 'position' prop:
 *   • Position.Top/Left: Relative to top-left corner
 *   • Position.Right: gridX is relative to right edge, gridY to top edge
 *   • Position.Bottom: gridX is relative to left edge, gridY to bottom edge
 *
 * EXAMPLES:
 * - Position.Top: gridX={1}, gridY={0} = 64px from left, at top edge
 * - Position.Right: gridX={0}, gridY={2} = at right edge, 128px from top
 * - Position.Bottom: gridX={3.5}, gridY={0} = 224px from left, at bottom edge
 */
export function GridNodeHandle({
	id,
	type,
	position,
	gridX,
	gridY,
	style = {},
	className,
	size = 'md',
	color = 'default',
}: GridNodeHandleProps) {
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

	// Shape based on handle type
	const shapeClass = type === 'source' ? 'rounded-none' : 'rounded-full';

	// Combine all Tailwind classes
	const handleClasses = [
		sizeClasses[size],
		shapeClass,
		'drop-shadow-md',
		'border-2 border-white',
		colorClasses[color],
		className,
	]
		.filter(Boolean)
		.join(' ');
	// Grid-based positioning using GRID_UNIT system
	// Adjust positioning based on which edge the handle appears on
	const positionStyle: CSSProperties = {
		position: 'absolute',
	};

	// Position handles relative to the correct edge
	switch (position) {
		case Position.Top:
		case Position.Left:
			// Top and Left positions use top-left corner as reference
			positionStyle.left = `${gridX * GRID_UNIT}px`;
			positionStyle.top = `${gridY * GRID_UNIT}px`;
			break;
		case Position.Right:
			// Right positions use right edge as reference
			positionStyle.right = `${gridX * GRID_UNIT}px`;
			positionStyle.top = `${gridY * GRID_UNIT}px`;
			break;
		case Position.Bottom:
			// Bottom positions use bottom edge as reference
			positionStyle.left = `${gridX * GRID_UNIT}px`;
			positionStyle.bottom = `${gridY * GRID_UNIT}px`;
			break;
	}

	// Merge with any additional styles
	const finalStyle = { ...positionStyle, ...style };

	return (
		<Handle
			id={id}
			type={type}
			position={position}
			style={finalStyle}
			className={handleClasses}
		/>
	);
}
