import { GridBlock, type GridBlockProps } from './GridBlock';

const variantHeaderTextStyles = {
	default: 'text-gray-800 dark:text-gray-100',
	debug: 'text-blue-800 dark:text-blue-100',
	primary: 'text-green-800 dark:text-green-100',
	secondary: 'text-purple-800 dark:text-purple-100',
	audio: 'text-orange-800 dark:text-orange-100',
};

const variantHeaderShadowStyles = {
	default: 'shadow-gray-300/50 dark:shadow-gray-600/50',
	debug: 'shadow-blue-300/50 dark:shadow-blue-600/50',
	primary: 'shadow-green-300/50 dark:shadow-green-600/50',
	secondary: 'shadow-purple-300/50 dark:shadow-purple-600/50',
	audio: 'shadow-orange-300/50 dark:shadow-orange-600/50',
};

export interface NodeHeaderProps
	extends Omit<GridBlockProps, 'children' | 'gridHeight'> {
	title: string;
	// gridHeight is fixed to 1, gridWidth is customizable
}

export function NodeHeader({
	title,
	gridWidth, // Expect gridWidth from props
	gridX,
	gridY,
	variant = 'default',
	className = '',
	...rest
}: NodeHeaderProps) {
	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={1} // Default height to 1 grid unit
			gridX={gridX}
			gridY={gridY}
			variant={variant}
			// showDimensions and showPosition can be false by default for a header
			showDimensions={false}
			showPosition={false}
			// By default, a header might not need its own border if it's part of a larger node
			showBorder={false}
			// Headers often have specific backgrounds, so allow transparency to override GridBlock's default
			transparentBackground={true}
			className={`
        flex items-center justify-center // Center title within the GridBlock
        font-semibold font-mono text-xl // Existing text styling
        // Apply variant-specific text colors directly if GridBlock doesn't handle this for content
        ${variantHeaderTextStyles[variant]} 
        // Background gradient and shadow - these might need to be adjusted if GridBlock applies its own
        bg-gradient-to-b from-slate-200 via-slate-50 to-slate-200 dark:from-slate-600 dark:via-slate-800 dark:to-slate-600
        shadow-lg ${variantHeaderShadowStyles[variant]}
        rounded-sm // Keep rounded corners for the header itself
        px-4 // Keep padding for the text
        ${className}
      `}
			{...rest}
		>
			{title}
		</GridBlock>
	);
}
