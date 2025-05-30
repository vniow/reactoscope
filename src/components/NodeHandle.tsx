import { Handle, Position } from '@xyflow/react';

interface NodeHandleProps {
	id: string;
	type: 'source' | 'target';
	position: Position;
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
				pointerEvents: 'none', // Crucial: don't block Handle events
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
			pointerEvents: 'none', // Crucial: don't block Handle events
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

export function NodeHandle({
	id,
	type,
	position,
	variant = 'default',
	className = '',
}: NodeHandleProps) {
	const color = handleColors[variant];

	// Base handle styling - important to set proper dimensions
	const baseClasses =
		'!w-4 !h-4 !border-0 !bg-transparent flex items-center justify-center';
	const combinedClasses = `${baseClasses} ${className}`.trim();

	return (
		<Handle
			id={id}
			type={type}
			position={position}
			className={combinedClasses}
		>
			{type === 'source' ? (
				<TriangleIcon
					position={position}
					color={color}
				/>
			) : (
				<CircleIcon color={color} />
			)}
		</Handle>
	);
}
