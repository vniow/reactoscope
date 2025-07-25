/**
 * Debug Node - Displays node position and connection information
 *
 * This component demonstrates proper usage of:
 * - Function component declaration (not arrow function)
 * - Explicit TypeScript typing
 * - State management with useState
 * - Component composition with BaseNode
 * - Grid-based layout system
 *
 * @module DebugNode
 */

import { Position, type NodeProps } from '@xyflow/react';
import { useState, useRef } from 'react';
import { View } from '@react-three/drei';
import { type DebugNode } from '../types';
import { BaseNode } from '../../../shared/components/BaseNode';
import { NodeHandle } from '../../../shared/components/NodeHandle';
import { GridControl } from '../../../shared/components/ui/GridControl';

/**
 * DebugNode component - Interactive debugging component for the node system
 *
 * Features:
 * - Real-time position tracking
 * - Interactive UI controls demonstration
 * - Debug mode selection
 * - Export functionality
 */
export function DebugNode(props: NodeProps<DebugNode>) {
	const { id, data, selected, positionAbsoluteX, positionAbsoluteY } = props;
	const x = Math.round(positionAbsoluteX ?? 0);
	const y = Math.round(positionAbsoluteY ?? 0);

	// UI state
	const [selectedOption, setSelectedOption] = useState<string>('position');
	const [sliderValue, setSliderValue] = useState<number>(50);
	const [isToggled, setIsToggled] = useState<boolean>(false);

	const viewRef = useRef<HTMLDivElement>(null);

	const debugOptions = [
		{ value: 'position', label: '📍 Position Data' },
		{ value: 'performance', label: '⚡ Performance' },
		{ value: 'memory', label: '💾 Memory Usage' },
		{ value: 'network', label: '🌐 Network Stats' },
	];

	return (
		<BaseNode
			variant='util'
			nodeId={id as string}
			selected={selected}
			title={data.label || 'Debug Info'}
		>
			<div className='relative w-full h-full flex flex-col p-2 gap-3'>
				{/* Debug Mode Selector */}
				<GridControl
					type='select'
					options={debugOptions}
					value={selectedOption}
					onChange={(e) => setSelectedOption(e.target.value)}
					layout='minimal'
					className='w-full h-8'
					aria-label='Debug mode selector'
				/>

				{/* Position Display */}
				<div className='flex-shrink-0 p-2 rounded bg-node-interactive text-xs text-center'>
					<h3 className='font-semibold mb-1'>🐛 Position Data</h3>
					<div className='flex justify-between'>
						<span>
							<span className='font-semibold'>X:</span>{' '}
							<span className='px-2 py-0.5'>{x}px</span>
						</span>
						<span>
							<span className='font-semibold'>Y:</span>{' '}
							<span className='px-2 py-0.5'>{y}px</span>
						</span>
					</div>
				</div>

				{/* Debug Intensity Slider */}
				<div>
					<label
						className='block text-xs mb-1'
						htmlFor={`debug-slider-${id}`}
					>
						Debug Intensity: {sliderValue}%
					</label>
					<GridControl
						type='slider'
						value={sliderValue}
						onChange={(e) => setSliderValue(Number(e.target.value))}
						min={0}
						max={100}
						step={1}
						layout='minimal'
						className='w-full h-6'
						aria-label='Debug intensity slider'
					/>
				</div>

				{/* Toggle and Action Button Row */}
				<div className='flex gap-2'>
					<GridControl
						type='toggle'
						checked={isToggled}
						onChange={setIsToggled}
						toggleLabel={`Live Updates ${isToggled ? 'ON' : 'OFF'}`}
						showLabel
						className='flex-1'
						aria-label='Live updates toggle'
					/>
					<GridControl
						type='button'
						buttonLabel='📊 Export Debug Data'
						onClick={() => {
							console.log('Exporting debug data...', {
								x,
								y,
								sliderValue,
								isToggled,
								selectedOption,
							});
						}}
						variant='node-variant'
						icon='📊'
						className='flex-1 h-8'
						aria-label='Export debug data'
					/>
				</div>

				{/* Status Label */}
				<div className='flex-1 flex items-end justify-center'>
					<span className='text-xs text-center text-node-accent'>
						Debug Node Active
					</span>
				</div>

				{/* 3D window using <View> */}
				<View
					ref={viewRef}
					className='bg-node-secondary rounded overflow-hidden r3f-canvas-container flex items-center justify-center mt-2'
					style={{
						width: 'var(--spacing-grid-8)',
						height: 'var(--spacing-grid-8)',
						pointerEvents: 'auto',
					}}
					aria-label='3D debug window'
				>
					<group position={[0, 0, 0]}>
						<mesh>
							<boxGeometry args={[1, 1, 1]} />
							<meshStandardMaterial color='#3b82f6' />
						</mesh>
					</group>
				</View>
			</div>

			<NodeHandle
				id={`${id}-debug-in`}
				type='target'
				position={Position.Left}
				size='lg'
				aria-label='Input handle'
				label='Input'
			/>
			<NodeHandle
				id={`${id}-debug-out`}
				type='source'
				position={Position.Right}
				size='lg'
				aria-label='Output handle'
				label='Output'
			/>
		</BaseNode>
	);
}
