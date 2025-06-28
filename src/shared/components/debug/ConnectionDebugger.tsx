/**
 * Connection Debug Component
 *
 * A development utility to inspect handle connections and their mappings.
 * Use this to understand how handle IDs map to specific audio nodes.
 */

import { useAppStore } from '../../stores/appStore';

export function ConnectionDebugger() {
	const { connectionRegistry, getConnectionDetails } = useAppStore((state) => ({
		connectionRegistry: state.connectionRegistry,
		getConnectionDetails: state.getConnectionDetails,
	}));

	const connections = Object.entries(connectionRegistry);

	if (connections.length === 0) {
		return (
			<div className='p-4 bg-gray-800 text-white rounded'>
				<h3 className='text-lg font-bold mb-2'>🔗 Connection Debugger</h3>
				<p className='text-gray-400'>No active connections to debug</p>
			</div>
		);
	}

	return (
		<div className='p-4 bg-gray-800 text-white rounded max-w-4xl'>
			<h3 className='text-lg font-bold mb-4'>🔗 Connection Debugger</h3>
			<div className='space-y-3'>
				{connections.map(([edgeId]) => {
					const details = getConnectionDetails(edgeId);
					if (!details) return null;

					return (
						<div
							key={edgeId}
							className='p-3 bg-gray-700 rounded'
						>
							<div className='font-mono text-sm mb-2'>
								<span className='text-blue-400'>Edge:</span> {edgeId}
							</div>

							<div className='grid grid-cols-2 gap-4 text-sm'>
								{/* Source Info */}
								<div className='bg-green-900/30 p-2 rounded'>
									<div className='font-semibold text-green-400'>Source</div>
									<div>
										Node:{' '}
										<span className='font-mono'>{details.sourceEntry?.id}</span>
									</div>
									<div>
										Type:{' '}
										<span className='font-mono'>
											{details.sourceEntry?.type}
										</span>
									</div>
									<div>
										Handle:{' '}
										<span className='font-mono'>
											{details.connection.sourceHandleId || 'default'}
										</span>
									</div>
									<div>
										Array Count:{' '}
										<span className='font-mono'>
											{details.sourceEntry?.nodeCount}
										</span>
									</div>
									<div>
										Output Index:{' '}
										<span className='font-mono'>
											{details.sourceEntry?.outputIndex ?? 'undefined'}
										</span>
									</div>
								</div>

								{/* Target Info */}
								<div className='bg-blue-900/30 p-2 rounded'>
									<div className='font-semibold text-blue-400'>Target</div>
									<div>
										Node:{' '}
										<span className='font-mono'>{details.targetEntry?.id}</span>
									</div>
									<div>
										Type:{' '}
										<span className='font-mono'>
											{details.targetEntry?.type}
										</span>
									</div>
									<div>
										Handle:{' '}
										<span className='font-mono'>
											{details.connection.targetHandleId || 'default'}
										</span>
									</div>
									<div>
										Array Count:{' '}
										<span className='font-mono'>
											{details.targetEntry?.nodeCount}
										</span>
									</div>
									<div>
										Input Index:{' '}
										<span className='font-mono'>
											{details.targetEntry?.inputIndex ?? 'undefined'}
										</span>
									</div>
								</div>
							</div>

							{/* Connection Summary */}
							<div className='mt-2 p-2 bg-gray-600 rounded text-xs'>
								<strong>Routing:</strong> {details.sourceEntry?.type}[
								{details.sourceEntry?.outputIndex ?? 'auto'}] →{' '}
								{details.targetEntry?.type}[
								{details.targetEntry?.inputIndex ?? 'auto'}]
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
