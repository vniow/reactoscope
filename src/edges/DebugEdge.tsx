import {
	BaseEdge,
	EdgeLabelRenderer,
	type EdgeProps,
	getBezierPath,
} from '@xyflow/react';
import { GridBlock } from '../components/GridBlock'; // Import GridBlock

export function DebugEdge(props: EdgeProps) {
	const {
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		style = {},
		markerEnd,
		data, // Extract data from props
		selected,
	} = props;

	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	// Custom style for the debug edge
	const debugStyle = {
		...style,
		stroke: 'red', // Make it red
		strokeWidth: 2, // Make it thicker
	};

	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				markerEnd={markerEnd}
				style={debugStyle}
			/>
			<EdgeLabelRenderer>
				<div
					style={{
						position: 'absolute',
						transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
						fontSize: 10,
						color: 'red',
						pointerEvents: 'all', // Allows interaction if needed, set to 'none' to pass through
						background: 'rgba(255, 255, 255, 0.7)', // Optional: for better readability
						padding: '2px 4px',
						borderRadius: '3px',
					}}
					className='nodrag nopan' // Prevents dragging of the label itself
				>
					{/* Display basic edge info or custom data */}
					{selected && (
						<div style={{ minWidth: '150px', textAlign: 'left' }}>
							<strong>ID:</strong> {id}
							<br />
							<strong>Source:</strong> {props.source}
							<br />
							<strong>Target:</strong> {props.target}
							<br />
							{data && (
								<>
									<strong>Data:</strong>
									<pre
										style={{
											fontSize: '0.8em',
											background: 'rgba(0,0,0,0.05)',
											padding: '2px',
										}}
									>
										{JSON.stringify(data, null, 2)}
									</pre>
								</>
							)}
						</div>
					)}
					{!selected && 'DEBUG EDGE'}
				</div>
			</EdgeLabelRenderer>
		</>
	);
}
