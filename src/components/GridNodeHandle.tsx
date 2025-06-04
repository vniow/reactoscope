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
 * SIMPLIFIED GRID-BASED POSITIONING:
 * ==================================
 *
 * This component uses ONLY grid-based positioning aligned with your GRID_UNIT (64px) system.
 * All positioning is done via gridX and gridY coordinates, ensuring perfect alignment
 * with your node's grid layout.
 *
 * POSITIONING:
 * - gridX: Grid column position (required) - multiplied by GRID_UNIT (64px)
 * - gridY: Grid row position (required) - multiplied by GRID_UNIT (64px)
 *
 * EXAMPLE:
 * - gridX={1}, gridY={2} positions the handle at (64px, 128px)
 * - gridX={0}, gridY={0} positions the handle at the top-left corner
 *
 * For advanced positioning patterns, use the utility functions in gridHandleUtils.ts
 *
 * @param gridX - Grid column position (0-based, required)
 * @param gridY - Grid row position (0-based, required)
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
	const positionStyle: CSSProperties = {
		position: 'absolute',
		left: `${gridX * GRID_UNIT}px`,
		top: `${gridY * GRID_UNIT}px`,
	};

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
