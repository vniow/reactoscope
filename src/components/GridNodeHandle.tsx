import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useEffect, useMemo } from 'react';
import { GRID_UNIT } from '../config/grid';
import { useAppStore } from '../stores/appStore';
import type { GridHandle } from '../stores/types';

interface GridNodeHandleProps extends GridHandle {
	nodeId: string;
	nodeGridWidth: number;
	nodeGridHeight: number;
	className?: string;
}

// Color mapping for handle variants
const handleColors = {
	default: '#6b7280', // gray-500
	primary: '#10b981', // green-500
	debug: '#3b82f6', // blue-500
	secondary: '#8b5cf6', // purple-500
	audio: '#f59e0b', // orange-500
} as const;

// Triangle SVG component for source handles
const TriangleIcon = ({
	position,
	color,
}: {
	position: Position;
	color: string;
}) => {
	const rotations = {
		[Position.Top]: '0',
		[Position.Right]: '90',
		[Position.Bottom]: '180',
		[Position.Left]: '270',
	};

	return (
		<svg
			width='16'
			height='16'
			viewBox='0 0 16 16'
			style={{
				transform: `rotate(${rotations[position]}deg)`,
				pointerEvents: 'none',
			}}
		>
			<path
				d='M8 1L15 13H1L8 1Z'
				fill={color}
				stroke='white'
				strokeWidth='1'
			/>
		</svg>
	);
};

// Circle SVG component for target handles
const CircleIcon = ({ color }: { color: string }) => (
	<svg
		width='16'
		height='16'
		viewBox='0 0 16 16'
		style={{
			pointerEvents: 'none',
		}}
	>
		<circle
			cx='8'
			cy='8'
			r='6'
			fill={color}
			stroke='white'
			strokeWidth='1'
		/>
	</svg>
);

/**
 * Convert grid coordinates to ReactFlow position and offset
 */
function getPositionFromGridCoords(
	gridX: number,
	gridY: number,
	nodeGridWidth: number,
	nodeGridHeight: number
): { position: Position; offset: { x: number; y: number } } {
	// Determine which edge the handle is on
	if (gridY === 0) {
		// Top edge
		return {
			position: Position.Top,
			offset: {
				x: gridX * GRID_UNIT + GRID_UNIT / 2,
				y: 0,
			},
		};
	} else if (gridY === nodeGridHeight - 1) {
		// Bottom edge
		return {
			position: Position.Bottom,
			offset: {
				x: gridX * GRID_UNIT + GRID_UNIT / 2,
				y: 0,
			},
		};
	} else if (gridX === 0) {
		// Left edge
		return {
			position: Position.Left,
			offset: {
				x: 0,
				y: gridY * GRID_UNIT + GRID_UNIT / 2,
			},
		};
	} else if (gridX === nodeGridWidth - 1) {
		// Right edge
		return {
			position: Position.Right,
			offset: {
				x: 0,
				y: gridY * GRID_UNIT + GRID_UNIT / 2,
			},
		};
	}

	// Default to top if coordinates don't match an edge
	console.warn(
		`GridNodeHandle: Invalid grid coordinates (${gridX}, ${gridY}) for node size ${nodeGridWidth}x${nodeGridHeight}`
	);
	return {
		position: Position.Top,
		offset: { x: 0, y: 0 },
	};
}

export function GridNodeHandle({
	id,
	type,
	gridX,
	gridY,
	nodeId,
	nodeGridWidth,
	nodeGridHeight,
	variant = 'default',
	floating = true,
	className = '',
}: GridNodeHandleProps) {
	const color = handleColors[variant];
	const { position, offset } = getPositionFromGridCoords(
		gridX,
		gridY,
		nodeGridWidth,
		nodeGridHeight
	);

	const updateHandlePositions = useAppStore(
		(state) => state.updateHandlePositions
	);

	// Use ReactFlow's useNodeConnections to track this specific handle's connections
	const handleConnections = useNodeConnections({
		handleId: id,
		onConnect: (connections) => {
			console.log(`Handle ${id} connected:`, connections);
			// You can add custom logic here when this handle gets connected
		},
		onDisconnect: (connections) => {
			console.log(`Handle ${id} disconnected:`, connections);
			// You can add custom logic here when this handle gets disconnected
		},
	});

	// Determine if this handle is currently connected
	const isConnected = handleConnections.length > 0;

	// Dynamically adjust handle color based on connection status
	const connectionAwareColor = useMemo(() => {
		if (isConnected) {
			// Use brighter color when connected
			switch (variant) {
				case 'primary':
					return '#059669'; // green-600
				case 'debug':
					return '#2563eb'; // blue-600
				case 'secondary':
					return '#7c3aed'; // purple-600
				case 'audio':
					return '#d97706'; // orange-600
				default:
					return '#4b5563'; // gray-600
			}
		}
		return color; // Default color when not connected
	}, [isConnected, variant, color]);

	// Update handle position in store if this is a floating handle
	useEffect(() => {
		if (floating) {
			updateHandlePositions(nodeId, { [id]: position });
		}
	}, [floating, nodeId, id, position, updateHandlePositions]);

	// Build style object for positioning
	const handleStyle: React.CSSProperties = {};

	if (position === Position.Top || position === Position.Bottom) {
		handleStyle.left = `${offset.x}px`;
	} else {
		handleStyle.top = `${offset.y}px`;
	}

	// Base handle styling with floating/static and connection-aware distinction
	const baseClasses =
		'!w-4 !h-4 !border-0 !bg-transparent flex items-center justify-center transition-all duration-200';

	// Enhanced styling based on floating state and connection status
	const floatingClasses = floating
		? 'opacity-100' // Floating handles at full opacity
		: 'opacity-75 border-2 border-dashed border-gray-400'; // Static handles with dashed border

	// Add connection-aware styling
	const connectionClasses = isConnected
		? 'scale-110 drop-shadow-md' // Slightly larger and with shadow when connected
		: 'hover:scale-105'; // Subtle hover effect when not connected

	const combinedClasses =
		`${baseClasses} ${floatingClasses} ${connectionClasses} ${className}`.trim();

	return (
		<Handle
			id={id}
			type={type}
			position={position}
			style={handleStyle}
			className={combinedClasses}
		>
			{type === 'source' ? (
				<TriangleIcon
					position={position}
					color={connectionAwareColor}
				/>
			) : (
				<CircleIcon color={connectionAwareColor} />
			)}
		</Handle>
	);
}

/**
 * Container component for declaring multiple grid handles
 */
interface GridHandlesProps {
	nodeId: string;
	nodeGridWidth: number;
	nodeGridHeight: number;
	handles: GridHandle[];
}

export function GridHandles({
	nodeId,
	nodeGridWidth,
	nodeGridHeight,
	handles,
}: GridHandlesProps) {
	return (
		<>
			{handles.map((handle) => (
				<GridNodeHandle
					key={handle.id}
					{...handle}
					nodeId={nodeId}
					nodeGridWidth={nodeGridWidth}
					nodeGridHeight={nodeGridHeight}
				/>
			))}
		</>
	);
}
