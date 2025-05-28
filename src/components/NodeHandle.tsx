import { Handle, Position } from '@xyflow/react';

interface NodeHandleProps {
	id: string;
	type: 'source' | 'target';
	position: Position;
	variant?: 'default' | 'primary' | 'debug' | 'secondary' | 'audio';
	className?: string;
}

// Source handle styles (triangles)
const sourceHandleStyles = {
	default: {
		[Position.Top]:
			'!border-l-8 !border-r-8 !border-b-8 !border-t-0 !border-l-transparent !border-r-transparent !border-b-gray-500 !bg-transparent !w-0 !h-0',
		[Position.Right]:
			'!border-t-8 !border-b-8 !border-l-8 !border-r-0 !border-t-transparent !border-b-transparent !border-l-gray-500 !bg-transparent !w-0 !h-0',
		[Position.Bottom]:
			'!border-l-8 !border-r-8 !border-t-8 !border-b-0 !border-l-transparent !border-r-transparent !border-t-gray-500 !bg-transparent !w-0 !h-0',
		[Position.Left]:
			'!border-t-8 !border-b-8 !border-r-8 !border-l-0 !border-t-transparent !border-b-transparent !border-r-gray-500 !bg-transparent !w-0 !h-0',
	},
	primary: {
		[Position.Top]:
			'!border-l-8 !border-r-8 !border-b-8 !border-t-0 !border-l-transparent !border-r-transparent !border-b-green-500 !bg-transparent !w-0 !h-0',
		[Position.Right]:
			'!border-t-8 !border-b-8 !border-l-8 !border-r-0 !border-t-transparent !border-b-transparent !border-l-green-500 !bg-transparent !w-0 !h-0',
		[Position.Bottom]:
			'!border-l-8 !border-r-8 !border-t-8 !border-b-0 !border-l-transparent !border-r-transparent !border-t-green-500 !bg-transparent !w-0 !h-0',
		[Position.Left]:
			'!border-t-8 !border-b-8 !border-r-8 !border-l-0 !border-t-transparent !border-b-transparent !border-r-green-500 !bg-transparent !w-0 !h-0',
	},
	debug: {
		[Position.Top]:
			'!border-l-8 !border-r-8 !border-b-8 !border-t-0 !border-l-transparent !border-r-transparent !border-b-blue-500 !bg-transparent !w-0 !h-0',
		[Position.Right]:
			'!border-t-8 !border-b-8 !border-l-8 !border-r-0 !border-t-transparent !border-b-transparent !border-l-blue-500 !bg-transparent !w-0 !h-0',
		[Position.Bottom]:
			'!border-l-8 !border-r-8 !border-t-8 !border-b-0 !border-l-transparent !border-r-transparent !border-t-blue-500 !bg-transparent !w-0 !h-0',
		[Position.Left]:
			'!border-t-8 !border-b-8 !border-r-8 !border-l-0 !border-t-transparent !border-b-transparent !border-r-blue-500 !bg-transparent !w-0 !h-0',
	},
	secondary: {
		[Position.Top]:
			'!border-l-8 !border-r-8 !border-b-8 !border-t-0 !border-l-transparent !border-r-transparent !border-b-purple-500 !bg-transparent !w-0 !h-0',
		[Position.Right]:
			'!border-t-8 !border-b-8 !border-l-8 !border-r-0 !border-t-transparent !border-b-transparent !border-l-purple-500 !bg-transparent !w-0 !h-0',
		[Position.Bottom]:
			'!border-l-8 !border-r-8 !border-t-8 !border-b-0 !border-l-transparent !border-r-transparent !border-t-purple-500 !bg-transparent !w-0 !h-0',
		[Position.Left]:
			'!border-t-8 !border-b-8 !border-r-8 !border-l-0 !border-t-transparent !border-b-transparent !border-r-purple-500 !bg-transparent !w-0 !h-0',
	},
	audio: {
		[Position.Top]:
			'!border-l-8 !border-r-8 !border-b-8 !border-t-0 !border-l-transparent !border-r-transparent !border-b-orange-500 !bg-transparent !w-0 !h-0',
		[Position.Right]:
			'!border-t-8 !border-b-8 !border-l-8 !border-r-0 !border-t-transparent !border-b-transparent !border-l-orange-500 !bg-transparent !w-0 !h-0',
		[Position.Bottom]:
			'!border-l-8 !border-r-8 !border-t-8 !border-b-0 !border-l-transparent !border-r-transparent !border-t-orange-500 !bg-transparent !w-0 !h-0',
		[Position.Left]:
			'!border-t-8 !border-b-8 !border-r-8 !border-l-0 !border-t-transparent !border-b-transparent !border-r-orange-500 !bg-transparent !w-0 !h-0',
	},
};

// Target handle styles (semicircles)
const targetHandleStyles = {
	default: {
		[Position.Top]:
			'!bg-gray-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-b-full',
		[Position.Right]:
			'!bg-gray-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-l-full',
		[Position.Bottom]:
			'!bg-gray-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-t-full',
		[Position.Left]:
			'!bg-gray-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-r-full',
	},
	primary: {
		[Position.Top]:
			'!bg-green-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-b-full',
		[Position.Right]:
			'!bg-green-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-l-full',
		[Position.Bottom]:
			'!bg-green-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-t-full',
		[Position.Left]:
			'!bg-green-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-r-full',
	},
	debug: {
		[Position.Top]:
			'!bg-blue-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-b-full',
		[Position.Right]:
			'!bg-blue-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-l-full',
		[Position.Bottom]:
			'!bg-blue-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-t-full',
		[Position.Left]:
			'!bg-blue-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-r-full',
	},
	secondary: {
		[Position.Top]:
			'!bg-purple-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-b-full',
		[Position.Right]:
			'!bg-purple-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-l-full',
		[Position.Bottom]:
			'!bg-purple-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-t-full',
		[Position.Left]:
			'!bg-purple-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-r-full',
	},
	audio: {
		[Position.Top]:
			'!bg-orange-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-b-full',
		[Position.Right]:
			'!bg-orange-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-l-full',
		[Position.Bottom]:
			'!bg-orange-500 !border-2 !border-white dark:!border-gray-800 !w-4 !h-2 !rounded-t-full',
		[Position.Left]:
			'!bg-orange-500 !border-2 !border-white dark:!border-gray-800 !w-2 !h-4 !rounded-r-full',
	},
};

export function NodeHandle({
	id,
	type,
	position,
	variant = 'default',
	className = '',
}: NodeHandleProps) {
	const styles = type === 'source' ? sourceHandleStyles : targetHandleStyles;
	const handleClasses = styles[variant][position];
	const combinedClasses = `${handleClasses} ${className}`.trim();

	return (
		<Handle
			id={id}
			type={type}
			position={position}
			className={combinedClasses}
		/>
	);
}
