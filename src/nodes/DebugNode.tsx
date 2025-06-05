import { useState, useEffect, useRef } from 'react';
import { type NodeProps, Position } from '@xyflow/react';

import { BaseNode } from '../components/BaseNode';
import { GridBlock } from '../components/GridBlock';
import { GridNodeHandle } from '../components/GridNodeHandle';
import { useNodeOperations } from '../hooks/useNodeOperations';
import {
	calculateNextPerimeterPosition,
	getDefaultGridCoordinatesForPosition,
} from '../utils/nodeUtils';

/**
 * DebugNode with interactive debug controls for handle positioning
 */

// Grid configuration for debug node
const DEBUG_NODE_CONFIG = {
	gridWidth: 12,
	gridHeight: 12,
} as const;

// Available positions for handles
const POSITIONS = [
	Position.Top,
	Position.Right,
	Position.Bottom,
	Position.Left,
];
const POSITION_NAMES = ['Top', 'Right', 'Bottom', 'Left'];

// Handle configuration interface
interface HandleConfig {
	id: string;
	type: 'source' | 'target';
	position: Position;
	gridX: number;
	gridY: number;
	color: 'primary' | 'success' | 'error' | 'warning';
	size: 'sm' | 'md' | 'lg';
}

export function DebugNode(props: NodeProps) {
	const { id, data, selected = false } = props;

	// Use custom hook for node operations (Container/Presenter pattern)
	const { deleteNode } = useNodeOperations();

	// State for handle configurations with debug controls
	const [handles, setHandles] = useState<HandleConfig[]>([
		{
			id: `${id}-handle-1`,
			type: 'target',
			position: Position.Top,
			gridX: 0,
			gridY: 0,
			color: 'primary',
			size: 'md',
		},
		{
			id: `${id}-handle-2`,
			type: 'source',
			position: Position.Right,
			gridX: 7,
			gridY: 2,
			color: 'success',
			size: 'lg',
		},
		{
			id: `${id}-handle-3`,
			type: 'source',
			position: Position.Bottom,
			gridX: 3.5,
			gridY: 4,
			color: 'error',
			size: 'lg',
		},
	]);

	// Animation state for clockwise handle movement
	const [isAnimating, setIsAnimating] = useState(false);
	const [animatedHandleIndex, setAnimatedHandleIndex] = useState(0);
	const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Animation effect
	useEffect(() => {
		if (isAnimating && handles.length > 0) {
			animationIntervalRef.current = setInterval(() => {
				setHandles((prev) =>
					prev.map((handle, index) => {
						if (index === animatedHandleIndex) {
							// Calculate next position using the perimeter animation logic
							const nextPos = calculateNextPerimeterPosition(
								handle.gridX,
								handle.gridY,
								handle.position,
								DEBUG_NODE_CONFIG.gridWidth,
								DEBUG_NODE_CONFIG.gridHeight
							);
							return { ...handle, ...nextPos };
						}
						return handle;
					})
				);
			}, 500); // Move every 0.5 seconds for smoother animation
		} else {
			if (animationIntervalRef.current) {
				clearInterval(animationIntervalRef.current);
				animationIntervalRef.current = null;
			}
		}

		return () => {
			if (animationIntervalRef.current) {
				clearInterval(animationIntervalRef.current);
				animationIntervalRef.current = null;
			}
		};
	}, [isAnimating, animatedHandleIndex, handles.length]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (animationIntervalRef.current) {
				clearInterval(animationIntervalRef.current);
			}
		};
	}, []);

	// Event handlers
	const handleDelete = () => deleteNode(id as string);

	// Debug control handlers
	const updateHandlePosition = (handleIndex: number, newPosition: Position) => {
		setHandles((prev) =>
			prev.map((handle, index) => {
				if (index === handleIndex) {
					// Reset gridX and gridY to default coordinates for the new position
					const defaultCoords = getDefaultGridCoordinatesForPosition(
						newPosition,
						DEBUG_NODE_CONFIG.gridWidth,
						DEBUG_NODE_CONFIG.gridHeight
					);
					return {
						...handle,
						position: newPosition,
						gridX: defaultCoords.gridX,
						gridY: defaultCoords.gridY,
					};
				}
				return handle;
			})
		);
	};

	const updateHandleGridX = (handleIndex: number, delta: number) => {
		setHandles((prev) =>
			prev.map((handle, index) =>
				index === handleIndex
					? {
							...handle,
							gridX: Math.max(
								0,
								Math.min(DEBUG_NODE_CONFIG.gridWidth, handle.gridX + delta)
							),
						}
					: handle
			)
		);
	};

	const updateHandleGridY = (handleIndex: number, delta: number) => {
		setHandles((prev) =>
			prev.map((handle, index) =>
				index === handleIndex
					? {
							...handle,
							gridY: Math.max(
								0,
								Math.min(DEBUG_NODE_CONFIG.gridHeight, handle.gridY + delta)
							),
						}
					: handle
			)
		);
	};

	const toggleHandleType = (handleIndex: number) => {
		setHandles((prev) =>
			prev.map((handle, index) =>
				index === handleIndex
					? {
							...handle,
							type: handle.type === 'source' ? 'target' : 'source',
						}
					: handle
			)
		);
	};

	const addHandle = () => {
		const newHandle: HandleConfig = {
			id: `${id}-handle-${Date.now()}`,
			type: 'source',
			position: Position.Top,
			gridX: 0,
			gridY: 0,
			color: 'primary',
			size: 'md',
		};
		setHandles((prev) => [...prev, newHandle]);
	};

	const removeHandle = (handleIndex: number) => {
		setHandles((prev) => prev.filter((_, index) => index !== handleIndex));
	};

	// Animation control handlers
	const toggleAnimation = () => {
		if (handles.length === 0) return;

		// When starting animation, reset the selected handle to the starting position
		if (!isAnimating) {
			setHandles((prev) =>
				prev.map((handle, index) => {
					if (index === animatedHandleIndex) {
						const defaultCoords = getDefaultGridCoordinatesForPosition(
							Position.Top,
							DEBUG_NODE_CONFIG.gridWidth,
							DEBUG_NODE_CONFIG.gridHeight
						);
						return {
							...handle,
							position: Position.Top,
							gridX: defaultCoords.gridX,
							gridY: defaultCoords.gridY,
						};
					}
					return handle;
				})
			);
		}

		setIsAnimating((prev) => !prev);
	};

	const selectAnimatedHandle = (handleIndex: number) => {
		setAnimatedHandleIndex(handleIndex);
		if (isAnimating) {
			// Reset animation step when switching handles and move to starting position
			setHandles((prev) =>
				prev.map((handle, index) => {
					if (index === handleIndex) {
						const defaultCoords = getDefaultGridCoordinatesForPosition(
							Position.Top,
							DEBUG_NODE_CONFIG.gridWidth,
							DEBUG_NODE_CONFIG.gridHeight
						);
						return {
							...handle,
							position: Position.Top,
							gridX: defaultCoords.gridX,
							gridY: defaultCoords.gridY,
						};
					}
					return handle;
				})
			);
		}
	};

	return (
		<BaseNode
			variant='debug'
			gridWidth={DEBUG_NODE_CONFIG.gridWidth}
			gridHeight={DEBUG_NODE_CONFIG.gridHeight}
			nodeId={id as string}
			selected={selected}
			onDelete={handleDelete}
			title={`Debug Node - ${(data as { label?: string })?.label || id}`}
		>
			<div className='relative w-full h-full overflow-visible'>
				{/* Debug Controls Panel */}
				<GridBlock
					gridWidth={7}
					gridHeight={12}
					gridX={1}
					gridY={1}
					variant='debug'
					showDimensions={false}
				>
					<div className='w-full h-full p-2 overflow-y-auto'>
						{/* Animation Controls */}
						<div className='mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border'>
							<h4 className='text-xs font-bold text-purple-800 dark:text-purple-200 mb-2'>
								Handle Perimeter Animation
							</h4>
							<div className='flex items-center gap-2 mb-2'>
								<button
									onClick={toggleAnimation}
									disabled={handles.length === 0}
									className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${
										isAnimating
											? 'bg-red-500 text-white hover:bg-red-600'
											: 'bg-green-500 text-white hover:bg-green-600'
									} disabled:opacity-50 disabled:cursor-not-allowed`}
								>
									{isAnimating ? '⏹ Stop Animation' : '▶ Start Animation'}
								</button>
								{handles.length > 0 && (
									<div className='text-xs text-gray-600 dark:text-gray-400'>
										<div>Handle {animatedHandleIndex + 1} animating</div>
										{isAnimating && (
											<div className='text-xs'>
												Pos: {handles[animatedHandleIndex]?.position} | Grid: (
												{handles[animatedHandleIndex]?.gridX},{' '}
												{handles[animatedHandleIndex]?.gridY})
											</div>
										)}
									</div>
								)}
							</div>
							{handles.length > 1 && (
								<div>
									<label className='text-xs text-gray-600 dark:text-gray-400 block mb-1'>
										Select handle to animate:
									</label>
									<div className='flex gap-1 flex-wrap'>
										{handles.map((_, index) => (
											<button
												key={index}
												onClick={() => selectAnimatedHandle(index)}
												className={`px-2 py-1 text-xs rounded ${
													animatedHandleIndex === index
														? 'bg-purple-500 text-white'
														: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
												}`}
											>
												{index + 1}
											</button>
										))}
									</div>
								</div>
							)}
							<div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
								Animation moves clockwise around the 12×12 grid perimeter
							</div>
						</div>

						<div className='flex items-center justify-between mb-2'>
							<h3 className='text-xs font-bold text-blue-800 dark:text-blue-200'>
								Handle Debug Controls ({handles.length})
							</h3>
							<div className='flex gap-1'>
								<button
									onClick={addHandle}
									className='px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors'
									title='Add new handle'
								>
									+ Add
								</button>
							</div>
						</div>

						{handles.map((handle, index) => (
							<div
								key={handle.id}
								className='mb-3 p-2 bg-white/50 dark:bg-black/20 rounded border'
							>
								<div className='flex items-center justify-between mb-1'>
									<div className='text-xs font-semibold'>
										Handle {index + 1} ({handle.id.split('-').pop()})
									</div>
									{handles.length > 1 && (
										<button
											onClick={() => removeHandle(index)}
											className='px-1 py-0 text-xs bg-red-500 text-white rounded hover:bg-red-600'
										>
											×
										</button>
									)}
								</div>

								{/* Position Controls */}
								<div className='mb-2'>
									<label className='text-xs text-gray-600 dark:text-gray-400'>
										Position:
									</label>
									<div className='flex gap-1 flex-wrap'>
										{POSITIONS.map((pos, posIndex) => (
											<button
												key={pos}
												onClick={() => updateHandlePosition(index, pos)}
												className={`px-2 py-1 text-xs rounded ${
													handle.position === pos
														? 'bg-blue-500 text-white'
														: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
												}`}
											>
												{POSITION_NAMES[posIndex]}
											</button>
										))}
									</div>
								</div>

								{/* Grid X Controls */}
								<div className='flex items-center gap-1 mb-1'>
									<label className='text-xs text-gray-600 dark:text-gray-400 w-12'>
										GridX:
									</label>
									<button
										onClick={() => updateHandleGridX(index, -0.5)}
										className='px-1 py-0 text-xs bg-red-200 dark:bg-red-800 rounded'
									>
										-0.5
									</button>
									<span className='text-xs font-mono w-8 text-center'>
										{handle.gridX}
									</span>
									<button
										onClick={() => updateHandleGridX(index, 0.5)}
										className='px-1 py-0 text-xs bg-green-200 dark:bg-green-800 rounded'
									>
										+0.5
									</button>
								</div>

								{/* Grid Y Controls */}
								<div className='flex items-center gap-1 mb-1'>
									<label className='text-xs text-gray-600 dark:text-gray-400 w-12'>
										GridY:
									</label>
									<button
										onClick={() => updateHandleGridY(index, -0.5)}
										className='px-1 py-0 text-xs bg-red-200 dark:bg-red-800 rounded'
									>
										-0.5
									</button>
									<span className='text-xs font-mono w-8 text-center'>
										{handle.gridY}
									</span>
									<button
										onClick={() => updateHandleGridY(index, 0.5)}
										className='px-1 py-0 text-xs bg-green-200 dark:bg-green-800 rounded'
									>
										+0.5
									</button>
								</div>

								{/* Type Toggle */}
								<div className='flex items-center gap-1'>
									<label className='text-xs text-gray-600 dark:text-gray-400 w-12'>
										Type:
									</label>
									<button
										onClick={() => toggleHandleType(index)}
										className={`px-2 py-0 text-xs rounded ${
											handle.type === 'source'
												? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
												: 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
										}`}
									>
										{handle.type}
									</button>
								</div>

								{/* Remove Handle Button */}
								<button
									onClick={() => removeHandle(index)}
									className='mt-2 px-2 py-1 text-xs bg-red-500 text-white rounded'
								>
									Remove Handle
								</button>
							</div>
						))}

						{/* Add Handle Button */}
						<button
							onClick={addHandle}
							className='mt-2 px-2 py-1 text-xs bg-blue-500 text-white rounded'
						>
							Add Handle
						</button>
					</div>
				</GridBlock>
			</div>

			{/* Render dynamic handles based on current state */}
			{handles.map((handle) => (
				<GridNodeHandle
					key={handle.id}
					id={handle.id}
					type={handle.type}
					position={handle.position}
					gridX={handle.gridX}
					gridY={handle.gridY}
					color={handle.color}
					size={handle.size}
				/>
			))}
		</BaseNode>
	);
}
