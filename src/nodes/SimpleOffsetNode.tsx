import { type NodeProps } from '@xyflow/react';
import { BaseNode } from '../components/BaseNode';
import { GridHandles } from '../components/GridNodeHandle';
import type { GridHandle } from '../stores/types';

/**
 * Simple example demonstrating programmable handle offset control
 */
export function SimpleOffsetNode(props: NodeProps) {
	const { id, data, selected } = props;

	// Example handles demonstrating different offset configurations
	const handles: GridHandle[] = [
		// Standard handle on left edge, centered in grid cell
		{
			id: 'input-standard',
			type: 'target',
			gridX: 0,
			gridY: 1,
			variant: 'primary',
		},

		// Handle with pixel-based offset - moved 16px right and 8px down from grid position
		{
			id: 'input-pixel-offset',
			type: 'target',
			gridX: 0,
			gridY: 2,
			variant: 'secondary',
			offsetX: 16, // 16 pixels right from normal position
			offsetY: 8, // 8 pixels down from normal position
			offsetMode: 'pixels',
		},

		// Handle with grid-unit-based offset - moved quarter unit right
		{
			id: 'input-grid-offset',
			type: 'target',
			gridX: 0,
			gridY: 3,
			variant: 'debug',
			offsetX: 0.25, // Quarter grid unit (16px) right
			offsetY: 0,
			offsetMode: 'grid-units',
		},

		// Bottom edge handles with precise horizontal spacing
		{
			id: 'output-left',
			type: 'source',
			gridX: 1,
			gridY: 4, // Bottom edge of a 5-tall node
			variant: 'primary',
			offsetX: -20, // Move left from center
			offsetMode: 'pixels',
		},
		{
			id: 'output-center',
			type: 'source',
			gridX: 2,
			gridY: 4,
			variant: 'primary',
			// No offset - perfectly centered
		},
		{
			id: 'output-right',
			type: 'source',
			gridX: 3,
			gridY: 4,
			variant: 'primary',
			offsetX: 20, // Move right from center
			offsetMode: 'pixels',
		},
	];

	return (
		<BaseNode
			variant='default'
			gridWidth={5}
			gridHeight={5}
			nodeId={id as string}
			selected={selected as boolean}
			title={`Offset Demo - ${data?.label || id}`}
		>
			<div className='p-4 text-center text-sm space-y-2'>
				<div className='font-semibold'>Handle Offset Examples</div>
				<div className='text-xs opacity-70 space-y-1'>
					<div>• Standard (left edge)</div>
					<div>• +16px right, +8px down</div>
					<div>• +0.25 grid units right</div>
					<div>• Bottom: -20px, center, +20px</div>
				</div>
			</div>

			{/* Render all handles with their configured offsets */}
			<GridHandles
				nodeId={id as string}
				nodeGridWidth={5}
				nodeGridHeight={5}
				handles={handles}
			/>
		</BaseNode>
	);
}
