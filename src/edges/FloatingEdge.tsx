import {
	type EdgeProps,
	getSmoothStepPath,
	getStraightPath,
	EdgeLabelRenderer,
	useReactFlow,
	BaseEdge,
} from '@xyflow/react';
import { useHybridEdgePositions } from '../hooks/useFloatingPositions';
import { NodeDeleteButton } from '../components/ui/NodeDeleteButton';

import { useEdgeColors } from '../hooks/useVariantColors';

// Hardcoded edge styling
const EDGE_STROKE_WIDTH = 7;

// Remove hardcoded gradient colors - now using dynamic inheritance
// const GRADIENT_START_COLOR = '#3b82f6'; // blue-500
// const GRADIENT_END_COLOR = '#8b5cf6'; // violet-500

// Type for edge data configuration
interface FloatingEdgeData {
	minDistanceThreshold?: number;
	showLabel?: boolean;
	showDebug?: boolean;
	borderRadius?: number;
	offset?: number;
	labelClassName?: string;
	colorMode?: 'source' | 'target' | 'gradient' | 'mixed'; // Add color inheritance mode
}

export function FloatingEdge(props: EdgeProps) {
	const {
		id,
		source,
		target,
		style = {},
		markerEnd,
		label,
		data,
		selected = false,
		// Destructure React Flow specific props to prevent passing to DOM
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition: _sourcePosition,
		targetPosition: _targetPosition,
		...rest
	} = props;

	const { setEdges } = useReactFlow();

	// Extract configuration from data with proper typing
	const edgeData = data as FloatingEdgeData | undefined;
	const minDistanceThreshold = edgeData?.minDistanceThreshold ?? 50;
	const showLabel = edgeData?.showLabel ?? false;
	const showDebug = edgeData?.showDebug ?? false;
	const borderRadius = edgeData?.borderRadius ?? 5;
	const offset = edgeData?.offset ?? 16;
	const colorMode = edgeData?.colorMode ?? 'gradient';

	// Get dynamic colors based on connected nodes
	const { stroke: dynamicStroke, strokeHover, gradient, gradientId } = useEdgeColors(
		source,
		target,
		colorMode
	);

	// Label styling
	const labelClassName =
		edgeData?.labelClassName ??
		'text-xs font-medium bg-white px-2 py-1 rounded shadow-sm border';

	// Use the hybrid hook for edge position calculations that handles both floating and static ends
	const { sourcePosition, targetPosition, sourcePoint, targetPoint } =
		useHybridEdgePositions(
			source,
			target,
			{
				sourcePosition: _sourcePosition,
				targetPosition: _targetPosition,
				sourceX,
				sourceY,
				targetX,
				targetY,
			},
			{
				minDistanceThreshold,
			}
		);

	// Calculate if the edge should be rendered as a straight line
	const isHorizontallyAligned = Math.abs(sourcePoint.y - targetPoint.y) < 1;
	const isVerticallyAligned = Math.abs(sourcePoint.x - targetPoint.x) < 1;
	const shouldUseStraightPath = isHorizontallyAligned || isVerticallyAligned;

	// Generate path based on alignment
	let edgePath: string;
	let labelX: number;
	let labelY: number;

	if (shouldUseStraightPath) {
		// Use straight path for vertical or horizontal alignment
		[edgePath, labelX, labelY] = getStraightPath({
			sourceX: sourcePoint.x,
			sourceY: sourcePoint.y,
			targetX: targetPoint.x,
			targetY: targetPoint.y,
		});
	} else {
		// Use smooth step path for all other cases
		[edgePath, labelX, labelY] = getSmoothStepPath({
			sourceX: sourcePoint.x,
			sourceY: sourcePoint.y,
			sourcePosition,
			targetX: targetPoint.x,
			targetY: targetPoint.y,
			targetPosition,
			borderRadius,
			offset,
		});
	}

	// Calculate debug information
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
				isHorizontallyAligned,
				isVerticallyAligned,
				pathType: shouldUseStraightPath ? 'straight' : 'stepped',
				hasGradient: true, // Both path types now have gradients
				gradientId: `gradient-${id}`,
				selected, // Include edge selection state
			}
		: null;

	// All edges now use gradients
	const edgeStroke = colorMode === 'gradient' ? `url(#${gradientId})` : dynamicStroke;
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
										Alignment:{' '}
										{debugInfo.isHorizontallyAligned
											? '↔️ Horizontal'
											: debugInfo.isVerticallyAligned
												? '↕️ Vertical'
												: '❌ None'}
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
