import { type NodeProps } from '@xyflow/react';
import { BaseNode } from '../components/BaseNode';
import { GridHandles } from '../components/GridNodeHandle';
import type { GridHandle } from '../stores/types';

/**
 * Simple example demonstrating programmable handle position control using grid units only
 */
export function SimpleOffsetNode(props: NodeProps) {
	const { id, data, selected } = props;

	// Example handles demonstrating different position configurations using grid units only
	const handles: GridHandle[] = [
		// Standard handle on left edge, centered in grid cell
		{
			id: 'input-standard',
			type: 'target',
			gridX: 0,
			gridY: 1,
			variant: 'primary',
		},

		// Handle with grid-unit-based position - moved quarter unit right and eighth unit down
		{
			id: 'input-grid-position',
			type: 'target',
			gridX: 0,
			gridY: 2,
			variant: 'secondary',
			positionX: 0.25, // Quarter grid unit (16px) right from normal position
			positionY: 0.125, // Eighth grid unit (8px) down from normal position
		},

		// Handle with different grid-unit-based position
		{
			id: 'input-precise-position',
			type: 'target',
			gridX: 0,
			gridY: 3,
			variant: 'debug',
			positionX: 0.25, // Quarter grid unit (16px) right
			positionY: 0,
		},

		// Bottom edge handles with precise horizontal spacing using grid units
		{
			id: 'output-left',
			type: 'source',
			gridX: 1,
			gridY: 4, // Bottom edge of a 5-tall node
			variant: 'primary',
			positionX: -0.3125, // Move left from center (20px left = -0.3125 grid units)
		},
		{
			id: 'output-center',
			type: 'source',
			gridX: 2,
			gridY: 4,
			variant: 'primary',
			// No position offset - perfectly centered
		},
		{
			id: 'output-right',
			type: 'source',
			gridX: 3,
			gridY: 4,
			variant: 'primary',
			positionX: 0.3125, // Move right from center (20px right = 0.3125 grid units)
		},
	];

	return (
		<BaseNode
			variant='default'
			gridWidth={5}
			gridHeight={5}
			nodeId={id as string}
			selected={selected as boolean}
			title={`Position Demo - ${data?.label || id}`}
		>
			<div className='p-4 text-center text-sm space-y-2'>
				<div className='font-semibold'>
					Handle Position Examples (Grid Units)
				</div>
				<div className='text-xs opacity-70 space-y-1'>
					<div>• Standard (left edge)</div>
					<div>• +0.25gu right, +0.125gu down</div>
					<div>• +0.25 grid units right</div>
					<div>• Bottom: -0.3125gu, center, +0.3125gu</div>
				</div>
			</div>

			{/* Render all handles with their configured positions */}
			<GridHandles
				nodeId={id as string}
				nodeGridWidth={5}
				nodeGridHeight={5}
				handles={handles}
			/>
		</BaseNode>
	);
}
