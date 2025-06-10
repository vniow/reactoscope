import { GridBlock, type GridBlockProps } from './GridBlock';
import { combineClasses } from '../utils/styleUtils';

export interface NodeHeaderProps
	extends Omit<GridBlockProps, 'children' | 'gridHeight' | 'variant'> {
	title: string;
}

export function NodeHeader({
	title,
	gridWidth,
	gridX,
	gridY,
	className = '',
	...rest
}: NodeHeaderProps) {
	// Build header classes using CSS custom properties
	const headerClasses = combineClasses(
		'flex items-center justify-center font-semibold text-xl',
		// 'bg-opacity-80 backdrop-blur-md',
		// 'shadow-lg rounded-sm px-4',
		'shadow-[0_10px_15px_-3px_var(--node-shadow),0_4px_6px_-4px_var(--node-shadow)]',
		'text-[var(--node-accent)]',
		// 'border-b border-[var(--node-border)]',
		className
	);

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={1}
			gridX={gridX}
			gridY={gridY}
			showDimensions={false}
			showShadow={true}
			showBorder={false}
			transparentBackground={true}
			className={headerClasses}
			{...rest}
		>
			{title}
		</GridBlock>
	);
}
