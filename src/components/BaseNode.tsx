import { ReactNode } from 'react';
import { calculateNodeSize } from '../config/grid';

interface BaseNodeProps {
	children: ReactNode;
	className?: string;
	variant?: 'default' | 'debug' | 'primary' | 'secondary';
	gridWidth?: number;
	gridHeight?: number;
}

const variantStyles = {
	default: 'border-gray-200 dark:border-gray-600',
	debug: 'border-blue-200 dark:border-blue-600',
	primary: 'border-green-200 dark:border-green-600',
	secondary: 'border-purple-200 dark:border-purple-600',
};

export function BaseNode({
	children,
	className = '',
	variant = 'default',
	gridWidth = 2,
	gridHeight = 1,
}: BaseNodeProps) {
	const { width, height } = calculateNodeSize(gridWidth, gridHeight);

	return (
		<div
			className={`
        bg-white dark:bg-gray-800 
        border-2 
        ${variantStyles[variant]}
        rounded-lg 
        shadow-lg 
        p-4 
        transition-colors 
        duration-200
        ${className}
      `}
			style={{
				width: `${width}px`,
				height: `${height}px`,
				minWidth: `${width}px`,
				minHeight: `${height}px`,
			}}
		>
			{children}
		</div>
	);
}
