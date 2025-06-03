import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { useMemo, useState } from 'react';

interface GridNodeHandleProps {
	id: string;
	type: 'source' | 'target';
	position: Position;
	offsetX?: number;
	offsetY?: number;
	variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio';
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
 * Simplified GridNodeHandle - accepts direct position and offset props
 */
export function GridNodeHandle({
	id,
	type,
	position,
	offsetX = 0,
	offsetY = 0,
	variant = 'default',
	className = '',
}: GridNodeHandleProps) {
	const [showTooltip, setShowTooltip] = useState(false);
	const isDebugMode = process.env.NODE_ENV === 'development';

	const color = handleColors[variant];

	// Track handle connections
	const handleConnections = useNodeConnections({
		handleId: id,
		onConnect: (connections) => {
			if (isDebugMode) {
				console.log(`Handle ${id} connected:`, connections);
			}
		},
		onDisconnect: (connections) => {
			if (isDebugMode) {
				console.log(`Handle ${id} disconnected:`, connections);
			}
		},
	});

	const isConnected = handleConnections.length > 0;

	// Connection-aware color
	const connectionAwareColor = useMemo(() => {
		if (isConnected) {
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
		return color;
	}, [isConnected, variant, color]);

	// Build style object for positioning with offsets
	const handleStyle: React.CSSProperties = {};

	if (position === Position.Top || position === Position.Bottom) {
		handleStyle.left = `${offsetX}px`;
		if (offsetY !== 0) {
			if (position === Position.Top) {
				handleStyle.top = `${offsetY}px`;
			} else {
				handleStyle.bottom = `${-offsetY}px`;
			}
		}
	} else {
		handleStyle.top = `${offsetY}px`;
		if (offsetX !== 0) {
			if (position === Position.Left) {
				handleStyle.left = `${offsetX}px`;
			} else {
				handleStyle.right = `${-offsetX}px`;
			}
		}
	}

	// Styling classes
	const baseClasses =
		'!w-4 !h-4 !border-0 !bg-transparent flex items-center justify-center transition-all duration-200';

	const connectionClasses = isConnected
		? 'scale-110 drop-shadow-md'
		: 'hover:scale-105';

	const combinedClasses =
		`${baseClasses} ${connectionClasses} ${className}`.trim();

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
		<>
			{/* Debug indicator */}
			{isDebugMode && (
				<div
					className='fixed w-8 h-8 bg-red-500 border-2 border-yellow-300 rounded-full z-[9999] opacity-75'
					style={{
						left: '10px',
						top: '10px',
					}}
					title={`Handle: ${id} at ${position} (${offsetX}, ${offsetY})`}
				>
					<div className='absolute inset-0 flex items-center justify-center text-xs font-bold text-white'>
						H
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

			{/* Debug tooltip */}
			{isDebugMode && showTooltip && (
				<div className='absolute z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-gray-700 pointer-events-none'>
					<div className='font-semibold text-blue-300 mb-1'>Handle Debug</div>
					<div>ID: {id}</div>
					<div>Type: {type}</div>
					<div>Position: {position}</div>
					<div>
						Offset: ({offsetX}, {offsetY})
					</div>
					<div>Connected: {isConnected ? 'Yes' : 'No'}</div>
				</div>
			)}
		</>
	);
}

/**
 * Container for multiple handles - simplified to work with direct props
 */
interface GridHandlesProps {
	handles: Array<{
		id: string;
		type: 'source' | 'target';
		position: Position;
		offsetX?: number;
		offsetY?: number;
		variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio';
	}>;
}

export function GridHandles({ handles }: GridHandlesProps) {
	if (process.env.NODE_ENV === 'development') {
		console.log(`GridHandles: rendering ${handles.length} handles`);
	}

	return (
		<>
			{handles.map((handle) => (
				<GridNodeHandle
					key={handle.id}
					{...handle}
				/>
			))}
		</>
	);
}
