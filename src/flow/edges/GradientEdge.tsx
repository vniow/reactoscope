import {
	type EdgeProps,
	getSmoothStepPath,
	getStraightPath,
	EdgeLabelRenderer,
	useReactFlow,
	BaseEdge,
} from '@xyflow/react';
import { NodeDeleteButton } from '../../shared/components/ui/NodeDeleteButton';
import { useNodeVariant } from '../../shared/utils/useNodeVariant';

// Hardcoded edge styling
const EDGE_STROKE_WIDTH = 7;

// Simplified edge data configuration - removed dynamic positioning options
interface EdgeData {
	showLabel?: boolean;
	showDebug?: boolean;
	borderRadius?: number;
	offset?: number;
	labelClassName?: string;
	colorMode?: 'source' | 'target' | 'gradient' | 'mixed';
	pathType?: 'smooth' | 'straight'; // Allow manual path type selection
}

export function GradientEdge(props: EdgeProps) {
	const {
		id,
		source,
		target,
		style = {},
		markerEnd,
		label,
		data,
		selected = false,
		// Use standard React Flow positioning - no dynamic calculations
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		sourceHandleId,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		targetHandleId,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		pathOptions,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		selectable,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		deletable,
		...rest
	} = props;

	const { setEdges } = useReactFlow();

	// Extract configuration from data with proper typing
	const edgeData = data as EdgeData | undefined;
	const showLabel = edgeData?.showLabel ?? false;
	const showDebug = edgeData?.showDebug ?? false;
	const borderRadius = edgeData?.borderRadius ?? 5;
	const offset = edgeData?.offset ?? 16;
	const colorMode = edgeData?.colorMode ?? 'gradient';
	const pathType = edgeData?.pathType ?? 'smooth'; // Default to smooth step

	// Get variant colors for source and target nodes
	const sourceVariant = useNodeVariant(source);
	const targetVariant = useNodeVariant(target);

	// Create gradient colors based on node variants
	const getVariantColor = (variant: string | undefined) => {
		if (!variant) return '#94a3b8'; // Default gray
		return `var(--color-variant-${variant})`;
	};

	const sourceColor = getVariantColor(sourceVariant);
	const targetColor = getVariantColor(targetVariant);
	const gradientId = `edge-gradient-${source}-${target}`;
	const gradient = { from: sourceColor, to: targetColor };

	// Label styling
	const labelClassName =
		edgeData?.labelClassName ??
		'text-xs font-medium bg-white px-2 py-1 rounded shadow-sm border';

	// Use standard React Flow positioning - no dynamic calculations
	const sourcePoint = { x: sourceX, y: sourceY };
	const targetPoint = { x: targetX, y: targetY };

	// Determine path type - allow manual override via data, otherwise use simple heuristic
	const shouldUseStraightPath =
		pathType === 'straight' ||
		(pathType === 'smooth'
			? false // Default to smooth when 'smooth' is specified
			: Math.abs(sourceX - targetX) < 10 || Math.abs(sourceY - targetY) < 10); // Simple alignment check

	// Generate path based on type preference
	let edgePath: string;
	let labelX: number;
	let labelY: number;

	if (shouldUseStraightPath) {
		// Use straight path
		[edgePath, labelX, labelY] = getStraightPath({
			sourceX,
			sourceY,
			targetX,
			targetY,
		});
	} else {
		// Use smooth step path
		[edgePath, labelX, labelY] = getSmoothStepPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition,
			borderRadius,
			offset,
		});
	}

	// Calculate debug information - simplified without dynamic positioning
	const debugInfo = showDebug
		? {
				edgeId: id,
				sourceNode: source,
				targetNode: target,
				sourcePos: `${Math.round(sourcePoint.x)}, ${Math.round(sourcePoint.y)}`,
				targetPos: `${Math.round(targetPoint.x)}, ${Math.round(targetPoint.y)}`,
				distance: Math.round(
					Math.sqrt(
						Math.pow(targetPoint.x - sourcePoint.x, 2) +
							Math.pow(targetPoint.y - sourcePoint.y, 2)
					)
				),
				sourcePosition,
				targetPosition,
				isStraightLine: shouldUseStraightPath,
				pathType: shouldUseStraightPath ? 'straight' : 'smooth',
				hasGradient: colorMode === 'gradient',
				gradientId: `gradient-${id}`,
				selected,
			}
		: null;

	// All edges now use gradients based on connected node colors
	const edgeStroke = `url(#${gradientId})`;
	const edgeStrokeWidth = selected ? EDGE_STROKE_WIDTH + 2 : EDGE_STROKE_WIDTH; // Make selected edges slightly thicker

	return (
		<>
			{/* Define gradient for dynamic color inheritance */}
			<defs>
				<linearGradient
					id={gradientId}
					x1={sourcePoint.x}
					y1={sourcePoint.y}
					x2={targetPoint.x}
					y2={targetPoint.y}
					gradientUnits='userSpaceOnUse'
				>
					<stop
						offset='0%'
						stopColor={gradient.from}
					/>
					<stop
						offset='100%'
						stopColor={gradient.to}
					/>
				</linearGradient>
			</defs>
			{/* Use BaseEdge for proper selection behavior */}
			<BaseEdge
				id={id}
				path={edgePath}
				markerEnd={markerEnd}
				style={{
					stroke: edgeStroke,
					strokeWidth: edgeStrokeWidth,
					...style,
				}}
				{...rest}
			/>
			{showLabel && (label || showDebug) && (
				<EdgeLabelRenderer>
					<div
						style={{
							position: 'absolute',
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
							pointerEvents: 'all',
						}}
						className={`nodrag nopan ${labelClassName}`}
					>
						{/* Original label */}
						{label && <div className='font-medium'>{label}</div>}

						{/* Debug information */}
						{showDebug && debugInfo && (
							<div className='text-xs text-gray-600 mt-1 space-y-1'>
								<div className='flex items-center gap-2'>
									<span>ID: {debugInfo.edgeId}</span>
									<span
										className={`px-1.5 py-0.5 rounded text-xs font-medium ${
											debugInfo.selected
												? 'bg-blue-100 text-blue-700 border border-blue-200'
												: 'bg-gray-100 text-gray-600 border border-gray-200'
										}`}
									>
										{debugInfo.selected ? '🔵 SELECTED' : '⚪ Not Selected'}
									</span>
								</div>
								<div>
									Source: {debugInfo.sourceNode} → Target:{' '}
									{debugInfo.targetNode}
								</div>
								<div>Distance: {debugInfo.distance}px</div>
								<div>Source Pos: {debugInfo.sourcePosition}</div>
								<div>Target Pos: {debugInfo.targetPosition}</div>
								<div>
									Coords: ({debugInfo.sourcePos}) → ({debugInfo.targetPos})
								</div>

								{/* Straight line analysis */}
								<div className='border-t pt-1 mt-2'>
									<div
										className={`font-medium ${debugInfo.isStraightLine ? 'text-green-600' : 'text-orange-600'}`}
									>
										{debugInfo.isStraightLine
											? '📏 Straight Line'
											: '🔄 Stepped Path'}
									</div>
									<div className='text-xs'>Path Type: {debugInfo.pathType}</div>
									<div className='text-xs'>
										Source: {debugInfo.sourcePosition} → Target:{' '}
										{debugInfo.targetPosition}
									</div>
									{debugInfo.hasGradient && (
										<div className='text-purple-600 text-xs'>
											🎨 Gradient: {gradientId} ({colorMode})
										</div>
									)}
									{debugInfo.isStraightLine ? (
										<div className='text-green-600 text-xs'>
											✓ Straight line with gradient
										</div>
									) : (
										<div className='text-orange-600 text-xs'>
											✓ Stepped path with gradient
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</EdgeLabelRenderer>
			)}

			{/* Delete button - only shown when edge is selected */}
			{selected && (
				<EdgeLabelRenderer>
					<div
						style={{
							position: 'absolute',
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + (showLabel && (label || showDebug) ? 30 : 0)}px)`,
							pointerEvents: 'all',
						}}
						className='nodrag nopan'
					>
						<NodeDeleteButton
							onClick={() => {
								setEdges((edges) => edges.filter((edge) => edge.id !== id));
							}}
							title='Delete edge'
						/>
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}
