import React from 'react';
import { combineClasses, getDeleteButtonClasses } from '../../utils/styleUtils';

interface NodeDeleteButtonProps {
	onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
	title?: string;
	className?: string;
}

export function NodeDeleteButton({
	onClick,
	title = 'Delete node',
	className = '',
}: NodeDeleteButtonProps) {
	// Use shared styling utilities for consistent appearance with handles
	const buttonClasses = combineClasses(getDeleteButtonClasses(), className);

	return (
		<div className='absolute pointer-events-none left-0 top-0 w-full h-full z-50'>
			<button
				onClick={onClick}
				className={buttonClasses}
				style={{
					boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)',
					filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
				}}
				title={title}
				aria-label={title}
			>
				×
			</button>
		</div>
	);
}
