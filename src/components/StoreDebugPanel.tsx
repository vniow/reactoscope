import React, { useState, useEffect } from 'react';
import { useFlowState, useFlowActions } from '../hooks/useAppStore';
import {
	useHandlePositionsNeedUpdate,
	useConnectedEdges,
	useNodeHandlePositions,
} from '../hooks/useHandlePositions';
import { Position } from '@xyflow/react';

/**
 * Comprehensive Phase 3 Debug Panel
 * Focus: Flow State Migration & Handle Position Optimization
 */
export const StoreDebugPanel: React.FC = () => {
	const { nodes, edges, handlePositions } = useFlowState();
	const { recalculateAllHandlePositions, batchUpdateNodePositions } =
		useFlowActions();
	const handlePositionsNeedUpdate = useHandlePositionsNeedUpdate();
	const [selectedNodeId, setSelectedNodeId] = useState<string>('');
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [performanceMetrics, setPerformanceMetrics] = useState({
		lastCalculationTime: 0,
		cacheHits: 0,
		cacheMisses: 0,
	});

	// Get connected edges for selected node
	const connectedEdges = useConnectedEdges(selectedNodeId);
	const nodeHandlePositions = useNodeHandlePositions(selectedNodeId);

	// Update selected node when nodes change
	useEffect(() => {
		if (!selectedNodeId && nodes.length > 0) {
			setSelectedNodeId(nodes[0].id);
		}
	}, [nodes, selectedNodeId]);

	// Monitor console logs for performance metrics
	useEffect(() => {
		const originalLog = console.log;
		console.log = (...args) => {
			const message = args.join(' ');
			if (message.includes('🎯 Using cached handle positions')) {
				setPerformanceMetrics((prev) => ({
					...prev,
					cacheHits: prev.cacheHits + 1,
				}));
			} else if (message.includes('🔄 Calculating new handle positions')) {
				setPerformanceMetrics((prev) => ({
					...prev,
					cacheMisses: prev.cacheMisses + 1,
				}));
			} else if (message.includes('Handle positions calculated in')) {
				const timeMatch = message.match(/(\d+\.?\d*)ms/);
				if (timeMatch) {
					setPerformanceMetrics((prev) => ({
						...prev,
						lastCalculationTime: parseFloat(timeMatch[1]),
					}));
				}
			}
			// originalLog.apply(console, args);
		};

		return () => {
			// console.log = originalLog;
		};
	}, []);

	const handleForceRecalculation = () => {
		// console.log('🔧 Manually triggering handle position recalculation');
		recalculateAllHandlePositions();
	};

	const handleTestBatchUpdate = () => {
		const updates = nodes.slice(0, Math.min(3, nodes.length)).map((node) => ({
			id: node.id,
			position: {
				x: node.position.x + (Math.random() - 0.5) * 100,
				y: node.position.y + (Math.random() - 0.5) * 100,
			},
		}));

		console.log('🚀 Testing batch position update:', updates);
		batchUpdateNodePositions(updates);
	};

	const handleClearMetrics = () => {
		setPerformanceMetrics({
			lastCalculationTime: 0,
			cacheHits: 0,
			cacheMisses: 0,
		});
		console.log('🧹 Performance metrics cleared');
	};

	const getPositionIcon = (position: Position) => {
		switch (position) {
			case Position.Top:
				return '⬆️';
			case Position.Right:
				return '➡️';
			case Position.Bottom:
				return '⬇️';
			case Position.Left:
				return '⬅️';
			default:
				return '❓';
		}
	};

	return (
		<div className='fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg z-50 max-w-md max-h-[80vh] overflow-y-auto'>
			<h3 className='font-bold text-lg mb-3 text-gray-900 dark:text-white'>
				� Phase 3: Flow Debug Panel
			</h3>

			{/* Advanced Debugging Toggle */}
			<div className='mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded'>
				<label className='flex items-center text-sm'>
					<input
						type='checkbox'
						checked={showAdvanced}
						onChange={(e) => setShowAdvanced(e.target.checked)}
						className='mr-2'
					/>
					<span>🔧 Show Advanced Debug Info</span>
				</label>
			</div>

			{/* Flow State Overview */}
			<div className='mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded'>
				<h4 className='font-semibold text-blue-800 dark:text-blue-200 mb-2'>
					📊 Flow State Overview
				</h4>
				<div className='text-sm space-y-1'>
					<div className='flex justify-between'>
						<span>Nodes:</span>
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{nodes.length}
						</code>
					</div>
					<div className='flex justify-between'>
						<span>Edges:</span>
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{edges.length}
						</code>
					</div>
					<div className='flex justify-between'>
						<span>Handle Cache:</span>
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{Object.keys(handlePositions).length} nodes
						</code>
					</div>
					<div className='flex justify-between'>
						<span>Need Update:</span>
						<span
							className={
								handlePositionsNeedUpdate ? 'text-red-600' : 'text-green-600'
							}
						>
							{handlePositionsNeedUpdate ? '❌ Yes' : '✅ No'}
						</span>
					</div>
				</div>
			</div>

			{/* Performance Metrics */}
			<div className='mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded'>
				<h4 className='font-semibold text-green-800 dark:text-green-200 mb-2'>
					⚡ Performance Metrics
				</h4>
				<div className='text-sm space-y-1'>
					<div className='flex justify-between'>
						<span>Cache Hits:</span>
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded text-green-600'>
							{performanceMetrics.cacheHits}
						</code>
					</div>
					<div className='flex justify-between'>
						<span>Cache Misses:</span>
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded text-yellow-600'>
							{performanceMetrics.cacheMisses}
						</code>
					</div>
					<div className='flex justify-between'>
						<span>Last Calc:</span>
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{performanceMetrics.lastCalculationTime.toFixed(2)}ms
						</code>
					</div>
					<div className='flex justify-between'>
						<span>Hit Rate:</span>
						<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
							{performanceMetrics.cacheHits + performanceMetrics.cacheMisses ===
							0
								? '0%'
								: (
										(performanceMetrics.cacheHits /
											(performanceMetrics.cacheHits +
												performanceMetrics.cacheMisses)) *
										100
								  ).toFixed(1)}
							%
						</code>
					</div>
				</div>
			</div>

			{/* Node Inspector */}
			{nodes.length > 0 && (
				<div className='mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded'>
					<h4 className='font-semibold text-purple-800 dark:text-purple-200 mb-2'>
						🔍 Node Inspector
					</h4>
					<div className='text-sm space-y-2'>
						<div>
							<label className='block text-xs text-gray-600 dark:text-gray-400 mb-1'>
								Select Node:
							</label>
							<select
								value={selectedNodeId}
								onChange={(e) => setSelectedNodeId(e.target.value)}
								className='w-full p-1 border rounded text-xs bg-white dark:bg-gray-700'
							>
								{nodes.map((node) => (
									<option
										key={node.id}
										value={node.id}
									>
										{node.id} ({node.type})
									</option>
								))}
							</select>
						</div>

						{selectedNodeId && (
							<>
								<div className='flex justify-between'>
									<span>Connected Edges:</span>
									<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
										{connectedEdges.length}
									</code>
								</div>
								<div className='flex justify-between'>
									<span>Handle Positions:</span>
									<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
										{Object.keys(nodeHandlePositions).length}
									</code>
								</div>

								{Object.keys(nodeHandlePositions).length > 0 && (
									<div className='mt-2'>
										<div className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
											Handles:
										</div>
										<div className='grid grid-cols-2 gap-1 text-xs'>
											{Object.entries(nodeHandlePositions).map(
												([handleId, position]) => (
													<div
														key={handleId}
														className='flex items-center justify-between bg-gray-100 dark:bg-gray-600 p-1 rounded'
													>
														<span className='truncate'>{handleId}</span>
														<span>{getPositionIcon(position)}</span>
													</div>
												)
											)}
										</div>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			)}

			{/* Advanced Debug Info */}
			{showAdvanced && (
				<div className='mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border-2 border-dashed border-gray-300 dark:border-gray-600'>
					<h4 className='font-semibold text-gray-800 dark:text-gray-200 mb-2'>
						🔬 Advanced Debug Info
					</h4>
					<div className='text-xs space-y-2'>
						<div>
							<div className='font-medium mb-1'>
								Raw Handle Positions Cache:
							</div>
							<pre className='bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto max-h-32 overflow-y-auto'>
								{JSON.stringify(handlePositions, null, 2)}
							</pre>
						</div>

						{selectedNodeId && Object.keys(nodeHandlePositions).length > 0 && (
							<div>
								<div className='font-medium mb-1'>Selected Node Handles:</div>
								<pre className='bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto'>
									{JSON.stringify(nodeHandlePositions, null, 2)}
								</pre>
							</div>
						)}

						<div>
							<div className='font-medium mb-1'>Performance Timing:</div>
							<div className='text-xs text-gray-600 dark:text-gray-400'>
								• Cache hit rate indicates memoization efficiency
								<br />
								• Calculation time shows handle positioning performance
								<br />• Monitor for sudden increases during drag operations
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Actions */}
			<div className='mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded'>
				<h4 className='font-semibold text-orange-800 dark:text-orange-200 mb-2'>
					🛠️ Debug Actions
				</h4>
				<div className='space-y-2'>
					<button
						onClick={handleForceRecalculation}
						className='w-full px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600'
					>
						🔄 Force Recalculate Handles
					</button>

					<button
						onClick={handleClearMetrics}
						className='w-full px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600'
					>
						🧹 Clear Performance Metrics
					</button>

					{nodes.length > 0 && (
						<button
							onClick={handleTestBatchUpdate}
							className='w-full px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600'
						>
							🚀 Test Batch Position Update
						</button>
					)}
				</div>
			</div>

			{/* Status Indicator */}
			<div className='text-center p-2 bg-gray-100 dark:bg-gray-700 rounded'>
				<div className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
					Phase 3 Status
				</div>
				<div className='text-sm font-semibold text-green-600'>
					✅ Flow Migration Complete
				</div>
				<div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
					Drag nodes to test handle optimization
				</div>
			</div>
		</div>
	);
};
