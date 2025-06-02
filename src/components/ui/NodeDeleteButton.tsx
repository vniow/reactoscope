import React from 'react';

interface NodeDeleteButtonProps {
	onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
	title?: string;
}

export function NodeDeleteButton({
	onClick,
	title = 'Delete node',
}: NodeDeleteButtonProps) {
	return (
		<div className='absolute pointer-events-none left-0 top-0 w-full h-full z-50'>
			<button
				onClick={onClick}
				className={`
					absolute pointer-events-auto -top-4 -left-4
					w-8 h-8
					bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700
					text-white
					rounded-full
					flex items-center justify-center
					text-lg font-bold
					transition-all duration-200
					border-2 border-white dark:border-gray-900
					shadow-xl
					z-50
					transform hover:scale-110
				`}
				style={{
					boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
					filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
				}}
				title={title}
			>
				×
			</button>
		</div>
	);
}
