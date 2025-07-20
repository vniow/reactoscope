import { useState, useMemo } from 'react';
import type { SceneData, VertexInfo } from './sceneTypes';

interface DebugPanelProps {
	sceneData: SceneData;
}

/**
 * Debug Panel Component
 * Shows extracted vertex data for verification
 */
export function DebugPanel({ sceneData }: DebugPanelProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const grouped = useMemo(() => {
		const map: Record<string, VertexInfo[]> = {};
		sceneData.vertices.forEach((v) => {
			const key = v.objectName || 'unknown';
			if (!map[key]) map[key] = [];
			map[key].push(v);
		});
		return map;
	}, [sceneData.vertices]);

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
						Total vertices: {sceneData.vertices.length}
					</div>

					{sceneData.vertices.length === 0 ? (
						<div className='text-gray-500'>No vertices found</div>
					) : (
						<>
							{Object.entries(grouped).map(([name, verts]) => (
								<div
									key={name}
									className='mb-3'
								>
									<div className='font-semibold text-gray-200'>
										{name} ({verts.length})
									</div>
									{verts.map((vertex, i) => (
										<div
											key={i}
											className='font-mono text-xs bg-gray-900 p-1 rounded my-1'
										>
											<div className='flex justify-between'>
												<span className='text-yellow-400'>V{i}:</span>
												<span className='text-cyan-400'>
													NDC: X: {vertex.screen.x.toFixed(3)} Y:{' '}
													{vertex.screen.y.toFixed(3)} Z:{' '}
													{vertex.screen.z.toFixed(3)}
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
													{vertex.world.y.toFixed(1)} Z:{' '}
													{vertex.world.z.toFixed(1)}
												</span>
											</div>
										</div>
									))}
								</div>
							))}
						</>
					)}
				</div>
			)}
		</div>
	);
}
