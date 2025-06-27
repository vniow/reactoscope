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
		<button
			onClick={onClick}
			className={buttonClasses}
			title={title}
			aria-label={title}
		>
			×
		</button>
	);
}
