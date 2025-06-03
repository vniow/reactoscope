import { type NodeProps } from '@xyflow/react';
import { useState } from 'react';

import { type DebugNodeData } from './types';
import { BaseNode } from '../components/BaseNode';
import { GridHandles } from '../components/GridNodeHandle';
import { GridButton } from '../components/ui/GridButton';
import { GridSlider } from '../components/ui/GridSlider';
import type { GridHandle } from '../stores/types';

/**
 * Advanced example node demonstrating programmable handle offset control
 * tied to the grid positioning system
 */
export function AdvancedHandleNode(props: NodeProps<DebugNodeData>) {
	const { id, data, selected } = props;

	// State for dynamic offset control
	const [offsetMode, setOffsetMode] = useState<'pixels' | 'grid-units'>(
		'pixels'
	);
	const [dynamicOffset, setDynamicOffset] = useState(0);
	const [showGridHelpers, setShowGridHelpers] = useState(true);

	// Define handles with various offset configurations
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

		// Handles with pixel-based offsets
		{
			id: 'input-pixel-offset',
			type: 'target',
			gridX: 0,
			gridY: 2,
			variant: 'secondary',
			offsetX: 16, // 16 pixels right from edge
			offsetY: 8, // 8 pixels down
			offsetMode: 'pixels',
			floating: true,
		},

		// Handles with grid-unit-based offsets
		{
			id: 'input-grid-offset',
			type: 'target',
			gridX: 0,
			gridY: 3,
			variant: 'debug',
			offsetX: 0.25, // Quarter grid unit right (16px)
			offsetY: 0.125, // Eighth grid unit down (8px)
			offsetMode: 'grid-units',
			floating: true,
		},

		// Handles with dynamic offsets (controlled by slider)
		{
			id: 'input-dynamic',
			type: 'target',
			gridX: 0,
			gridY: 4,
			variant: 'audio',
			offsetX: dynamicOffset,
			offsetY: 0,
			offsetMode: offsetMode,
			floating: true,
		},

		// Bottom edge handles with horizontal offsets
		{
			id: 'output-bottom-left',
			type: 'source',
			gridX: 1,
			gridY: 5, // Bottom edge
			variant: 'default',
			offsetX: -16, // Move 16px left from center
			offsetY: 0,
			offsetMode: 'pixels',
			floating: true,
		},
		{
			id: 'output-bottom-center',
			type: 'source',
			gridX: 2,
			gridY: 5, // Bottom edge
			variant: 'primary',
			// No offset - centered in grid cell
			floating: true,
		},
		{
			id: 'output-bottom-right',
			type: 'source',
			gridX: 3,
			gridY: 5, // Bottom edge
			variant: 'default',
			offsetX: 16, // Move 16px right from center
			offsetY: 0,
			offsetMode: 'pixels',
			floating: true,
		},
	];

	const formatValue = (value: unknown): string => {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	};

	const offsetInfo = {
		Mode: offsetMode,
		'Dynamic Offset': `${dynamicOffset}${offsetMode === 'grid-units' ? ' grid units' : 'px'}`,
		'Grid Unit Size': '64px',
		'Active Handles': handles.length,
	};

	return (
		<BaseNode
			variant='debug'
			gridWidth={6}
			gridHeight={6}
			nodeId={id as string}
			selected={selected as boolean}
			title={`Advanced Handle Demo - ${(data as DebugNodeData)?.label || id}`}
		>
			<div className='relative w-full h-full p-4 space-y-4'>
				{/* Control Panel */}
				<div className='space-y-3'>
					<h3 className='text-sm font-semibold text-center'>
						Handle Offset Controls
					</h3>

					{/* Offset Mode Toggle */}
					<div className='flex gap-2'>
						<GridButton
							gridWidth={2}
							gridHeight={1}
							gridX={0}
							gridY={0}
							variant={offsetMode === 'pixels' ? 'primary' : 'default'}
							buttonLabel='Pixels'
							onClick={() => setOffsetMode('pixels')}
							className='flex-1'
						/>
						<GridButton
							gridWidth={2}
							gridHeight={1}
							gridX={2}
							gridY={0}
							variant={offsetMode === 'grid-units' ? 'primary' : 'default'}
							buttonLabel='Grid Units'
							onClick={() => setOffsetMode('grid-units')}
							className='flex-1'
						/>
					</div>

					{/* Dynamic Offset Slider */}
					<GridSlider
						gridWidth={4}
						gridHeight={1}
						gridX={0}
						gridY={0}
						variant='secondary'
						showDimensions={false}
						showBorder={true}
						transparentBackground={false}
						label='Dynamic Offset'
						sliderProps={{
							value: dynamicOffset,
							min: offsetMode === 'pixels' ? -32 : -0.5,
							max: offsetMode === 'pixels' ? 32 : 0.5,
							step: offsetMode === 'pixels' ? 1 : 0.025,
							onChange: (e) => setDynamicOffset(Number(e.target.value)),
							size: 'sm',
							color: 'blue',
							formatValue: (val) =>
								`${val}${offsetMode === 'grid-units' ? 'gu' : 'px'}`,
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
					<div className='font-semibold text-center'>Offset Configuration</div>
					{Object.entries(offsetInfo).map(([label, value]) => (
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
