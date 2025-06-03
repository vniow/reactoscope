import { type NodeProps } from '@xyflow/react';
import { useState } from 'react';

import { BaseNode } from '../components/BaseNode';
import { GridHandles } from '../components/GridNodeHandle';
import { GridButton } from '../components/ui/GridButton';
import { GridSlider } from '../components/ui/GridSlider';
import type { GridHandle } from '../stores/types';

/**
 * Advanced example node demonstrating programmable handle offset control
 * tied to the grid positioning system
 */
export function AdvancedHandleNode(props: NodeProps) {
	const { id, data, selected } = props;

	// State for dynamic position control (now only uses grid units)
	const [dynamicPosition, setDynamicPosition] = useState(0);
	const [showGridHelpers, setShowGridHelpers] = useState(true);

	// Define handles with various position configurations using grid units only
	const handles: GridHandle[] = [
		// Standard edge-based handles
		{
			id: 'input-standard',
			type: 'target',
			gridX: 0,
			gridY: 1,
			variant: 'primary',
			floating: true,
		},
		{
			id: 'output-standard',
			type: 'source',
			gridX: 5,
			gridY: 1,
			variant: 'primary',
			floating: true,
		},

		// Handles with grid-unit-based positions
		{
			id: 'input-grid-position',
			type: 'target',
			gridX: 0,
			gridY: 2,
			variant: 'secondary',
			positionX: 0.25, // Quarter grid unit right (16px)
			positionY: 0.125, // Eighth grid unit down (8px)
			floating: true,
		},

		// Handles with more precise grid-unit positioning
		{
			id: 'input-precise-position',
			type: 'target',
			gridX: 0,
			gridY: 3,
			variant: 'debug',
			positionX: 0.25, // Quarter grid unit right (16px)
			positionY: 0.125, // Eighth grid unit down (8px)
			floating: true,
		},

		// Handles with dynamic positions (controlled by slider)
		{
			id: 'input-dynamic',
			type: 'target',
			gridX: 0,
			gridY: 4,
			variant: 'audio',
			positionX: dynamicPosition,
			positionY: 0,
			floating: true,
		},

		// Bottom edge handles with horizontal positions
		{
			id: 'output-bottom-left',
			type: 'source',
			gridX: 1,
			gridY: 5, // Bottom edge
			variant: 'default',
			positionX: -0.25, // Quarter grid unit left (16px left)
			positionY: 0,
			floating: true,
		},
		{
			id: 'output-bottom-center',
			type: 'source',
			gridX: 2,
			gridY: 5, // Bottom edge
			variant: 'primary',
			// No position offset - centered in grid cell
			floating: true,
		},
		{
			id: 'output-bottom-right',
			type: 'source',
			gridX: 3,
			gridY: 5, // Bottom edge
			variant: 'default',
			positionX: 0.25, // Quarter grid unit right (16px right)
			positionY: 0,
			floating: true,
		},
	];

	const formatValue = (value: unknown): string => {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	};

	const positionInfo = {
		'Dynamic Position': `${dynamicPosition} grid units`,
		'Grid Unit Size': '64px',
		'Active Handles': handles.length,
		'Position System': 'Grid Units Only',
	};

	return (
		<BaseNode
			variant='debug'
			gridWidth={6}
			gridHeight={6}
			nodeId={id as string}
			selected={selected as boolean}
			title={`Advanced Handle Demo - ${data?.label || id}`}
		>
			<div className='relative w-full h-full p-4 space-y-4'>
				{/* Control Panel */}
				<div className='space-y-3'>
					<h3 className='text-sm font-semibold text-center'>
						Handle Position Controls (Grid Units Only)
					</h3>

					{/* Dynamic Position Slider */}
					<GridSlider
						gridWidth={4}
						gridHeight={1}
						gridX={0}
						gridY={0}
						variant='secondary'
						showDimensions={false}
						showBorder={true}
						transparentBackground={false}
						label='Dynamic Position'
						sliderProps={{
							value: dynamicPosition,
							min: -0.5,
							max: 0.5,
							step: 0.025,
							onChange: (e) => setDynamicPosition(Number(e.target.value)),
							size: 'sm',
							color: 'blue',
							formatValue: (val) => `${val} gu`,
							showMinMax: true,
						}}
					/>

					{/* Grid Helpers Toggle */}
					<GridButton
						gridWidth={4}
						gridHeight={1}
						gridX={0}
						gridY={0}
						variant={showGridHelpers ? 'secondary' : 'default'}
						buttonLabel={
							showGridHelpers ? 'Hide Grid Helpers' : 'Show Grid Helpers'
						}
						onClick={() => setShowGridHelpers(!showGridHelpers)}
						className='w-full'
					/>
				</div>

				{/* Info Display */}
				<div className='bg-gray-100 dark:bg-gray-800 rounded p-3 text-xs space-y-2'>
					<div className='font-semibold text-center'>
						Position Configuration
					</div>
					{Object.entries(positionInfo).map(([label, value]) => (
						<div
							key={label}
							className='flex justify-between'
						>
							<span className='opacity-70'>{label}:</span>
							<span className='font-mono'>{formatValue(value)}</span>
						</div>
					))}
				</div>

				{/* Grid Helper Overlay */}
				{showGridHelpers && (
					<div className='absolute inset-0 pointer-events-none'>
						{/* Grid lines */}
						<div className='absolute inset-0 opacity-20'>
							{/* Vertical lines */}
							{Array.from({ length: 7 }).map((_, i) => (
								<div
									key={`v-${i}`}
									className='absolute top-0 bottom-0 w-px bg-blue-500'
									style={{ left: `${i * 64}px` }}
								/>
							))}
							{/* Horizontal lines */}
							{Array.from({ length: 7 }).map((_, i) => (
								<div
									key={`h-${i}`}
									className='absolute left-0 right-0 h-px bg-blue-500'
									style={{ top: `${i * 64}px` }}
								/>
							))}
						</div>

						{/* Grid coordinates */}
						<div className='absolute inset-0 text-xs text-blue-600 dark:text-blue-400'>
							{Array.from({ length: 6 }).map((_, y) =>
								Array.from({ length: 6 }).map((_, x) => (
									<div
										key={`coord-${x}-${y}`}
										className='absolute font-mono opacity-60'
										style={{
											left: `${x * 64 + 4}px`,
											top: `${y * 64 + 4}px`,
										}}
									>
										{x},{y}
									</div>
								))
							)}
						</div>
					</div>
				)}
			</div>

			{/* Render all handles with their configured offsets */}
			<GridHandles
				nodeId={id as string}
				nodeGridWidth={6}
				nodeGridHeight={6}
				handles={handles}
			/>
		</BaseNode>
	);
}
