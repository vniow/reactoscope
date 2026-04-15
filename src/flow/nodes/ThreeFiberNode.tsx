import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import type { CustomNode } from '../../shared/types';
import { NodeWrapper, Fiber3D } from '../../shared/components';
import { cn } from '../../shared/utils/classNames';

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
			<NodeWrapper
				label='🎮 3D Viewport'
				nodeType='threejs'
			>
				<div className='w-full h-full flex flex-col'>
					{/* Three.js Canvas with fixed dimensions */}
					<div
						className='node-3d-container'
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
							<label className='node-3d-label'>Zoom:</label>
							<div className='flex items-center space-x-2'>
								<input
									type='range'
									min='1'
									max='10'
									step='0.5'
									value={zoom}
									onChange={(e) => setZoom(parseFloat(e.target.value))}
									className='node-3d-slider'
								/>
								<span className='node-3d-value'>{zoom.toFixed(1)}</span>
							</div>
						</div>

						{/* Toggle Controls */}
						<div className='flex justify-between items-center'>
							<button
								onClick={() => setWireframe(!wireframe)}
								className={cn(
									'node-3d-button',
									wireframe
										? 'node-3d-button-active'
										: 'node-3d-button-inactive'
								)}
							>
								WIREFRAME
							</button>

							<button
								onClick={() => setShowGrid(!showGrid)}
								className={cn(
									'node-3d-button',
									showGrid ? 'node-3d-button-active' : 'node-3d-button-inactive'
								)}
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
				className='node-3d-handle'
				style={{ top: 20 }}
			/>
			<Handle
				type='source'
				position={Position.Right}
				id='data-out'
				className='node-3d-handle'
				style={{ top: 20 }}
			/>
		</div>
	);
}
