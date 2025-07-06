import { useState } from 'react';
import type { SceneData } from './sceneTypes';

interface DebugPanelProps {
	sceneData: SceneData;
}

/**
 * Debug Panel Component
 * Shows extracted vertex data for verification
 */
export function DebugPanel({ sceneData }: DebugPanelProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className='mt-2 border border-gray-600 rounded bg-gray-800 text-xs'>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className='w-full p-2 text-left hover:bg-gray-700 flex justify-between items-center'
			>
				<span>Debug: Scene Data ({sceneData.vertices.length} vertices)</span>
				<span>{isExpanded ? '▼' : '▶'}</span>
			</button>

			{isExpanded && (
				<div className='p-2 border-t border-gray-600 overflow-y-auto'>
					<div className='mb-2 text-gray-400'>
						Last updated: {new Date(sceneData.timestamp).toLocaleTimeString()}
					</div>

					<div className='mb-2 text-sm'>
						<span className='text-blue-400'>Total vertices:</span>{' '}
						{sceneData.vertices.length}
					</div>

					{sceneData.vertices.length === 0 ? (
						<div className='text-gray-500'>No vertices found</div>
					) : (
						<div className='space-y-1'>
							<div className='text-xs text-gray-500 mb-1'>
								Vertex Data (showing first 5):
							</div>
							{sceneData.vertices.slice(0, 6).map((vertex, i) => (
								<div
									key={i}
									className='font-mono text-xs bg-gray-900 p-1 rounded'
								>
									<div className='flex justify-between'>
										<span className='text-yellow-400'>V{i}:</span>
										<span className='text-cyan-400'>
											NDC: X: {vertex.screen.x.toFixed(3)} Y:{' '}
											{vertex.screen.y.toFixed(3)}
										</span>
									</div>
									<div className='flex justify-between text-gray-400 ml-4'>
										<span>Pixel:</span>
										<span>
											X: {vertex.screenRaw.x.toFixed(0)}px Y:{' '}
											{vertex.screenRaw.y.toFixed(0)}px
										</span>
									</div>
									<div className='flex justify-between text-gray-400 ml-4'>
										<span>RGB:</span>
										<span>
											<span className='text-red-400'>
												R: {vertex.color.r.toFixed(3)}
											</span>{' '}
											<span className='text-green-400'>
												G: {vertex.color.g.toFixed(3)}
											</span>{' '}
											<span className='text-blue-400'>
												B: {vertex.color.b.toFixed(3)}
											</span>
										</span>
									</div>
									<div className='flex justify-between text-gray-500 ml-4 text-xs'>
										<span>World:</span>
										<span>
											X: {vertex.world.x.toFixed(1)} Y:{' '}
											{vertex.world.y.toFixed(1)} Z: {vertex.world.z.toFixed(1)}
										</span>
									</div>
								</div>
							))}
							{sceneData.vertices.length > 5 && (
								<div className='text-gray-500 text-center'>
									... and {sceneData.vertices.length - 6} more vertices
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
