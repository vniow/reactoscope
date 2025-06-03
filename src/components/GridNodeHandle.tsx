import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo, useState, useEffect } from 'react';
import {
	GRID_UNIT,
	calculateHandlePosition,
	validateHandlePosition,
} from '../config/grid';
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

// Debug tooltip component
interface DebugTooltipProps {
	handle: GridHandle;
	nodeId: string;
	position: Position;
	offset: { x: number; y: number };
	isVisible: boolean;
}

const DebugTooltip = ({
	handle,
	nodeId,
	position,
	offset,
	isVisible,
}: DebugTooltipProps) => {
	if (!isVisible) return null;

	const tooltipContent = [
		`Node: ${nodeId}`,
		`ID: ${handle.id}`,
		`Type: ${handle.type}`,
		`Grid: (${handle.gridX}, ${handle.gridY})`,
		`Position: ${position}`,
		`Offset: (${offset.x.toFixed(1)}, ${offset.y.toFixed(1)})px`,
		handle.positionX !== undefined && `PositionX: ${handle.positionX} gu`,
		handle.positionY !== undefined && `PositionY: ${handle.positionY} gu`,
		`Variant: ${handle.variant || 'default'}`,
		handle.floating !== undefined && `Floating: ${handle.floating}`,
	].filter(Boolean);

	// Position tooltip based on handle position
	const tooltipPositionClasses = {
		[Position.Top]: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
		[Position.Bottom]: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
		[Position.Left]: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
		[Position.Right]: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
	};

	return (
		<div
			className={`absolute z-50 ${tooltipPositionClasses[position]} pointer-events-none`}
		>
			<div className='bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-gray-700 max-w-xs'>
				<div className='font-semibold text-blue-300 mb-1'>
					Handle Debug Info
				</div>
				{tooltipContent.map((line, index) => (
					<div
						key={index}
						className='whitespace-nowrap'
					>
						{line}
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Convert grid coordinates to ReactFlow position and offset with custom position support
 */
function getPositionFromGridCoords(
	gridX: number,
	gridY: number,
	nodeGridWidth: number,
	nodeGridHeight: number,
	customPositionX: number = 0,
	customPositionY: number = 0
): { position: Position; offset: { x: number; y: number } } {
	// Calculate custom positions in pixels (always grid units now)
	const pixelPositionX = calculateHandlePosition(customPositionX);
	const pixelPositionY = calculateHandlePosition(customPositionY);

	// Validate position (log warnings in development)
	if (process.env.NODE_ENV === 'development') {
		const validation = validateHandlePosition(
			gridX,
			gridY,
			customPositionX,
			customPositionY,
			nodeGridWidth,
			nodeGridHeight
		);
		if (!validation.isValid) {
			console.warn('GridNodeHandle position validation:', validation.warnings);
		}
	}

	// Determine which edge the handle is on
	if (gridY === 0) {
		// Top edge
		return {
			position: Position.Top,
			offset: {
				x: gridX * GRID_UNIT + GRID_UNIT / 2 + pixelPositionX,
				y: pixelPositionY,
			},
		};
	} else if (gridY === nodeGridHeight - 1) {
		// Bottom edge
		return {
			position: Position.Bottom,
			offset: {
				x: gridX * GRID_UNIT + GRID_UNIT / 2 + pixelPositionX,
				y: pixelPositionY,
			},
		};
	} else if (gridX === 0) {
		// Left edge
		return {
			position: Position.Left,
			offset: {
				x: pixelPositionX,
				y: gridY * GRID_UNIT + GRID_UNIT / 2 + pixelPositionY,
			},
		};
	} else if (gridX === nodeGridWidth - 1) {
		// Right edge
		return {
			position: Position.Right,
			offset: {
				x: pixelPositionX,
				y: gridY * GRID_UNIT + GRID_UNIT / 2 + pixelPositionY,
			},
		};
	}

	// Default to top if coordinates don't match an edge
	console.warn(
		`GridNodeHandle: Invalid grid coordinates (${gridX}, ${gridY}) for node size ${nodeGridWidth}x${nodeGridHeight}`
	);
	return {
		position: Position.Top,
		offset: { x: pixelPositionX, y: pixelPositionY },
	};
}

export function GridNodeHandle({
	id,
	type,
	gridX,
	gridY,
	nodeId, // Available for future use in store integration
	nodeGridWidth,
	nodeGridHeight,
	variant = 'default',
	floating = true,
	positionX = 0,
	positionY = 0,
	className = '',
}: GridNodeHandleProps) {
	// State for tooltip visibility (only show in development)
	const [showTooltip, setShowTooltip] = useState(false);
	const isDebugMode = process.env.NODE_ENV === 'development';

	const color = handleColors[variant];

	// Debug: Log all parameters passed to getPositionFromGridCoords
	if (process.env.NODE_ENV === 'development') {
		console.log(`GridNodeHandle ${id} parameters:`, {
			gridX,
			gridY,
			nodeGridWidth,
			nodeGridHeight,
			positionX,
			positionY,
		});
	}

	const { position, offset } = getPositionFromGridCoords(
		gridX,
		gridY,
		nodeGridWidth,
		nodeGridHeight,
		positionX,
		positionY
	);

	// Debug: Log calculated position details
	// if (process.env.NODE_ENV === 'development') {
	// 	console.log(`GridNodeHandle ${id} calculated position:`, {
	// 		position,
	// 		offset,
	// 		handleStyle: {
	// 			left:
	// 				position === Position.Top || position === Position.Bottom
	// 					? `${offset.x}px`
	// 					: 'auto',
	// 			top:
	// 				position === Position.Left || position === Position.Right
	// 					? `${offset.y}px`
	// 					: 'auto',
	// 		},
	// 	});
	// }

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

	// Log handle position in development for debugging
	useEffect(() => {
		if (process.env.NODE_ENV === 'development') {
			console.log(`Handle ${id} positioned at:`, {
				gridX,
				gridY,
				positionX,
				positionY,
				finalOffset: offset,
				position,
			});
		}
	}, [id, gridX, gridY, positionX, positionY, offset, position]);

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

	// Create the handle props for both data
	const handleProps = {
		id,
		type,
		position,
		style: handleStyle,
		className: combinedClasses,
		...(isDebugMode && {
			onMouseEnter: () => setShowTooltip(true),
			onMouseLeave: () => setShowTooltip(false),
		}),
	};

	return (
		<div className='relative'>
			{/* Debug: MASSIVE visible indicator to see if handle container is rendered */}
			{isDebugMode && (
				<div
					className='fixed w-20 h-20 bg-red-500 border-8 border-yellow-300 rounded-full z-[9999] opacity-95 animate-pulse'
					style={{
						left: '50px',
						top: '50px',
					}}
					title={`Handle: ${id} at (${gridX}, ${gridY}) pos:${position}`}
				>
					<div className='absolute inset-0 flex items-center justify-center text-sm font-bold text-white'>
						{id.slice(-6)}
					</div>
				</div>
			)}

			<Handle {...handleProps}>
				{type === 'source' ? (
					<TriangleIcon
						position={position}
						color={connectionAwareColor}
					/>
				) : (
					<CircleIcon color={connectionAwareColor} />
				)}
			</Handle>

			{isDebugMode && showTooltip && (
				<DebugTooltip
					handle={{
						id,
						type,
						gridX,
						gridY,
						variant,
						floating,
						positionX,
						positionY,
					}}
					nodeId={nodeId}
					position={position}
					offset={offset}
					isVisible={showTooltip}
				/>
			)}
		</div>
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
	// Debug logging
	if (process.env.NODE_ENV === 'development') {
		console.log(`GridHandles for node ${nodeId}:`, {
			nodeGridWidth,
			nodeGridHeight,
			handlesCount: handles.length,
			handles: handles.map((h) => ({
				id: h.id,
				type: h.type,
				gridX: h.gridX,
				gridY: h.gridY,
			})),
		});
	}

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
