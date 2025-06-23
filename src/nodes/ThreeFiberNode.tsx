import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../shared/types';
import { NodeWrapper, Fiber3D } from '../shared/components';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ThreeFiberNode(_props: NodeProps<CustomNode>) {
	const [zoom, setZoom] = useState(3);
	const [wireframe, setWireframe] = useState(false);
	const [showGrid, setShowGrid] = useState(true);

	return (
		<div
			className='react-flow__node-default'
			style={{ width: '320px', height: '380px' }}
		>
			<NodeWrapper label='🎮 3D Viewport'>
				<div className='w-full h-full flex flex-col'>
					{/* Three.js Canvas with fixed dimensions */}
					<div
						className='bg-gray-800 border border-purple-700 rounded mb-3 relative overflow-hidden'
						style={{
							width: '100%',
							height: '200px',
							position: 'relative',
							contain: 'layout style size',
						}}
					>
						<Fiber3D
							zoom={zoom}
							wireframe={wireframe}
							showGrid={showGrid}
						/>
					</div>

					{/* Controls */}
					<div className='space-y-2'>
						{/* Zoom Control */}
						<div className='flex items-center justify-between text-xs'>
							<label className='text-purple-300 font-mono'>Zoom:</label>
							<div className='flex items-center space-x-2'>
								<input
									type='range'
									min='1'
									max='10'
									step='0.5'
									value={zoom}
									onChange={(e) => setZoom(parseFloat(e.target.value))}
									className='w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer'
								/>
								<span className='text-purple-300 font-mono text-xs w-6'>
									{zoom.toFixed(1)}
								</span>
							</div>
						</div>

						{/* Toggle Controls */}
						<div className='flex justify-between items-center'>
							<button
								onClick={() => setWireframe(!wireframe)}
								className={`px-2 py-1 text-xs rounded font-mono ${
									wireframe
										? 'bg-purple-600 text-white'
										: 'bg-gray-700 text-purple-300 hover:bg-gray-600'
								}`}
							>
								WIREFRAME
							</button>

							<button
								onClick={() => setShowGrid(!showGrid)}
								className={`px-2 py-1 text-xs rounded font-mono ${
									showGrid
										? 'bg-purple-600 text-white'
										: 'bg-gray-700 text-purple-300 hover:bg-gray-600'
								}`}
							>
								GRID
							</button>
						</div>
					</div>
				</div>
			</NodeWrapper>

			{/* Input/Output handles */}
			<Handle
				type='target'
				position={Position.Left}
				id='data-in'
				className='w-3 h-3 bg-purple-500 border-2 border-white'
				style={{ top: 20 }}
			/>
			<Handle
				type='source'
				position={Position.Right}
				id='data-out'
				className='w-3 h-3 bg-purple-500 border-2 border-white'
				style={{ top: 20 }}
			/>
		</div>
	);
}
