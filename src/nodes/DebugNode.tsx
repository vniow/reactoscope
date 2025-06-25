import { Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';

import { type DebugNode } from './types';
import { BaseNode } from '../shared/components/BaseNode';
import { GridNodeHandle } from '../shared/components/GridNodeHandle';
import { GridControl } from '../shared/components/ui/GridControl';

/**
 * Debug Node - Displays node position and connection information
 * Updated with consistent design standards and larger text
 */

export function DebugNode({
	id,
	positionAbsoluteX,
	positionAbsoluteY,
	data,
	selected = false,
}: NodeProps<DebugNode>) {
	// Format position values
	const x = Math.round(positionAbsoluteX || 0);
	const y = Math.round(positionAbsoluteY || 0);

	// State for UI elements
	const [selectedOption, setSelectedOption] = useState('position');
	const [sliderValue, setSliderValue] = useState(50);
	const [isToggled, setIsToggled] = useState(false);

	// Options for the dropdown
	const debugOptions = [
		{ value: 'position', label: '📍 Position Data' },
		{ value: 'performance', label: '⚡ Performance' },
		{ value: 'memory', label: '💾 Memory Usage' },
		{ value: 'network', label: '🌐 Network Stats' },
	];

	return (
		<BaseNode
			variant='unit'
			nodeId={id as string}
			selected={selected}
			title={data.label || 'Debug Info'}
			className="w-grid-6 h-grid-8" // Increased size to accommodate new UI elements
		>
			<div className='relative w-full h-full overflow-visible flex flex-col p-2 space-y-3'>
				{/* Debug Mode Selector */}
				<div className='flex-shrink-0'>
					<GridControl
						type="select"
						options={debugOptions}
						value={selectedOption}
						onChange={(e) => setSelectedOption(e.target.value)}
						layout="minimal"
						className="w-full h-8"
					/>
				</div>

				{/* Position Display */}
				<div className="flex-shrink-0 p-2 rounded" style={{ backgroundColor: 'var(--node-bg-interactive)' }}>
					<div className='text-center space-y-1'>
						<h3 className='debug-title text-sm'>
							🐛 Position Data
						</h3>
						<div className='flex justify-between text-xs'>
							<div className='debug-text'>
								<span className='font-semibold'>X:</span>{' '}
								<span className='debug-value text-xs px-2 py-0.5'>
									{x}px
								</span>
							</div>
							<div className='debug-text'>
								<span className='font-semibold'>Y:</span>{' '}
								<span className='debug-value text-xs px-2 py-0.5'>
									{y}px
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Debug Intensity Slider */}
				<div className='flex-shrink-0'>
					<div className='debug-label text-xs mb-1'>Debug Intensity: {sliderValue}%</div>
					<GridControl
						type="slider"
						value={sliderValue}
						onChange={(e) => setSliderValue(Number(e.target.value))}
						min={0}
						max={100}
						step={1}
						layout="minimal"
						className="w-full h-6"
					/>
				</div>

				{/* Toggle and Action Button Row */}
				<div className='flex-shrink-0 flex gap-2'>
					{/* Toggle Switch */}
					<GridControl
						type="toggle"
						checked={isToggled}
						onChange={(checked) => setIsToggled(checked)}
						toggleLabel={`Live Updates ${isToggled ? 'ON' : 'OFF'}`}
						showLabel={true}
						className="flex-1"
					/>
				</div>

				{/* Action Button */}
				<div className='flex-shrink-0'>
					<GridControl
						type="button"
						buttonLabel="📊 Export Debug Data"
						onClick={() => console.log('Exporting debug data...', { x, y, sliderValue, isToggled, selectedOption })}
						variant="node-variant"
						icon="📊"
						className="w-full h-8"
					/>
				</div>

				{/* Status Label */}
				<div className='flex-1 flex items-end justify-center'>
					<div className='debug-label text-xs text-center'>
						Debug Node Active
					</div>
				</div>
			</div>

			{/* Input handle - left side */}
			<GridNodeHandle
				id={`${id}-debug-in`}
				type='target'
				position={Position.Left}
				size='sm'
			/>
			{/* Output handle - right side */}
			<GridNodeHandle
				id={`${id}-debug-out`}
				type='source'
				position={Position.Right}
				size='sm'
			/>
		</BaseNode>
	);
}
