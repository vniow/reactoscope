import { GridBlock, type GridBlockProps } from './GridBlock';
import type { ComponentVariant } from '../types/ui';
import { getVariantClasses, combineClasses } from '../utils/styleUtils';

export interface NodeHeaderProps
	extends Omit<GridBlockProps, 'children' | 'gridHeight'> {
	title: string;
	variant?: ComponentVariant;
}

export function NodeHeader({
	title,
	gridWidth,
	gridX,
	gridY,
	variant = 'default',
	className = '',
	...rest
}: NodeHeaderProps) {
	// Build header classes using utilities
	const headerClasses = combineClasses(
		'flex items-center justify-center font-semibold font-mono text-xl',
		'bg-gradient-to-b from-slate-200 via-slate-50 to-slate-200',
		'dark:from-slate-600 dark:via-slate-800 dark:to-slate-600',
		'shadow-lg rounded-sm px-4',
		getVariantClasses(variant, 'text'),
		getVariantClasses(variant, 'shadow'),
		className
	);

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={1}
			gridX={gridX}
			gridY={gridY}
			variant={variant}
			showDimensions={false}
			showPosition={false}
			showBorder={false}
			transparentBackground={true}
			className={headerClasses}
			{...rest}
		>
			{title}
		</GridBlock>
	);
}
