import { Handle, Position } from '@xyflow/react';

// Simplified props interface - no grid positioning
interface NodeHandleProps {
	id: string;
	type: 'source' | 'target';
	position: Position;

	// === STYLING OPTIONS ===
	className?: string;
	size?: 'sm' | 'md' | 'lg';
	style?: React.CSSProperties; // Allow custom positioning styles

	// === LABEL OPTIONS (for source handles) ===
	label?: string; // Text label to display inside source handles
	showLabel?: boolean; // Whether to show the label (default: true if label is provided)

	// === CONNECTION STATUS ===
	connectionStatus?: 'default' | 'connected' | 'connecting' | 'error'; // NEW
}

/**
 * NodeHandle component - simplified positioning with CSS
 *
 * VISUAL DESIGN:
 * - Source handles: Arrow-shaped SVG icons pointing outward that can contain text labels
 * - Target handles: Oval/circle SVG icons indicating input connections
 * - Uses CSS custom properties for theming and color consistency
 * - Different shapes clearly distinguish between inputs (targets) and outputs (sources)
 *
 * POSITIONING:
 * - Uses React Flow's built-in positioning system
 * - Position can be customized via style prop if needed
 */
export function NodeHandle({
	id,
	type,
	position,
	className,
	size = 'md',
	style,
	label,
	showLabel = true,
	connectionStatus = 'default', // NEW
}: NodeHandleProps) {
	// Size variants - both source and target handles use same arrow dimensions
	const sizeClasses = {
		sm: 'w-16 h-8',
		md: 'w-20 h-10',
		lg: 'w-24 h-12',
	};

	// Semantic color system for handle stroke/fill
	const handleStrokeColor = {
		default: 'var(--handle-color-default)',
		connected: 'var(--handle-color-connected)',
		connecting: 'var(--handle-color-connecting)',
		error: 'var(--handle-color-error)',
	}[connectionStatus ?? 'default'];
	const handleFillColor = 'var(--node-bg-interactive)';

	// Get SVG size in pixels for inline SVG - same dimensions for both source and target
	const getSvgSize = (
		size: 'sm' | 'md' | 'lg'
	): { width: number; height: number } => {
		switch (size) {
			case 'sm':
				return { width: 64, height: 32 };
			case 'md':
				return { width: 80, height: 40 };
			case 'lg':
				return { width: 96, height: 48 };
			default:
				return { width: 80, height: 40 };
		}
	};

	const svgDimensions = getSvgSize(size);

	// Create SVG icon based on handle type
	const createHandleIcon = () => {
		// Use Tailwind colors directly for better theming
		const strokeColor = handleStrokeColor;
		const fillColor = handleFillColor;

		if (type === 'source') {
			// Source handles: Arrow shapes pointing outward
			return (
				<svg
					width={svgDimensions.width}
					height={svgDimensions.height}
					viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
					className='drop-shadow-sm pointer-events-none'
				>
					{/* Arrow path for source handles */}
					{getSourceArrowPath(position, fillColor, strokeColor, svgDimensions)}

					{/* Add label text inside the arrow if provided */}
					{label && showLabel && (
						<text
							x={svgDimensions.width / 2}
							y={svgDimensions.height / 2 + 1}
							textAnchor='middle'
							dominantBaseline='middle'
							fill='var(--node-text-primary)'
							fontSize={size === 'sm' ? '10' : size === 'md' ? '12' : '14'}
							fontWeight='600'
							fontFamily='ui-sans-serif, system-ui, sans-serif'
							className='select-none'
						>
							{label}
						</text>
					)}
				</svg>
			);
		} else {
			// Target handles: Circle/oval shapes for inputs
			return (
				<svg
					width={svgDimensions.width}
					height={svgDimensions.height}
					viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
					className='drop-shadow-sm pointer-events-none'
				>
					{/* Circle/oval path for target handles */}
					{getTargetCirclePath(fillColor, strokeColor, svgDimensions)}

					{/* Add label text inside the circle if provided */}
					{label && showLabel && (
						<text
							x={svgDimensions.width / 2}
							y={svgDimensions.height / 2 + 1}
							textAnchor='middle'
							dominantBaseline='middle'
							fill='var(--node-text-primary)'
							fontSize={size === 'sm' ? '8' : size === 'md' ? '10' : '12'}
							fontWeight='600'
							fontFamily='ui-sans-serif, system-ui, sans-serif'
							className='select-none'
						>
							{label}
						</text>
					)}
				</svg>
			);
		}
	};

	// Helper function to create arrow path for source handles
	const getSourceArrowPath = (
		position: Position | undefined,
		fillColor: string,
		strokeColor: string,
		dimensions: { width: number; height: number }
	) => {
		const { width, height } = dimensions;
		const centerX = width / 2;
		const centerY = height / 2;

		// Simple styling without complex filters
		const pathStyles = {
			fill: fillColor,
			stroke: strokeColor,
			strokeWidth: '2',
			strokeLinejoin: 'round' as const,
			opacity: '0.9',
		};

		switch (position) {
			case Position.Right:
				// Arrow pointing right - elongated to fit label
				return (
					<path
						d={`M 4 4 L ${width - 12} 4 L ${width - 4} ${centerY} L ${width - 12} ${height - 4} L 4 ${height - 4} Z`}
						{...pathStyles}
					/>
				);
			case Position.Left:
				// Arrow pointing left - elongated to fit label
				return (
					<path
						d={`M ${width - 4} 4 L 12 4 L 4 ${centerY} L 12 ${height - 4} L ${width - 4} ${height - 4} Z`}
						{...pathStyles}
					/>
				);
			case Position.Bottom:
				// Arrow pointing down - wider to fit label
				return (
					<path
						d={`M 4 4 L ${width - 4} 4 L ${width - 4} ${height - 12} L ${centerX} ${height - 4} L 4 ${height - 12} Z`}
						{...pathStyles}
					/>
				);
			case Position.Top:
				// Arrow pointing up - wider to fit label
				return (
					<path
						d={`M 4 ${height - 4} L ${width - 4} ${height - 4} L ${width - 4} 12 L ${centerX} 4 L 4 12 Z`}
						{...pathStyles}
					/>
				);
			default:
				// Default right-pointing arrow
				return (
					<path
						d={`M 4 4 L ${width - 12} 4 L ${width - 4} ${centerY} L ${width - 12} ${height - 4} L 4 ${height - 4} Z`}
						{...pathStyles}
					/>
				);
		}
	};

	// Helper function to create a perfect circle path for target handles
	const getTargetCirclePath = (
		fillColor: string,
		strokeColor: string,
		dimensions: { width: number; height: number }
	) => {
		const { width, height } = dimensions;
		const centerX = width / 2;
		const centerY = height / 2;
		// Use the smaller of width or height for a perfect circle
		const radius = Math.min(width, height) / 2 - 4; // 4px padding

		const pathStyles = {
			fill: fillColor,
			stroke: strokeColor,
			strokeWidth: '2',
			opacity: '0.9',
		};

		return (
			<circle
				cx={centerX}
				cy={centerY}
				r={radius}
				{...pathStyles}
			/>
		);
	};

	// Handle styling for SVG container - simplified since we're using SVG icons
	const handleClasses = [
		sizeClasses[size] || sizeClasses.md, // Safe access with fallback
		'transition-colors',
		'duration-150',

		// 'bg-transparent',
		'border-0',
		'flex',
		'items-center',
		'justify-center',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<Handle
			id={id}
			type={type}
			position={position}
			className={handleClasses}
			style={style}
		>
			{/* Render SVG icon inside the handle */}
			{createHandleIcon()}
		</Handle>
	);
}
