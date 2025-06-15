import { useAudioConnections } from '../hooks/useAppStore';

/**
 * AudioConnectionDebugPanel - Shows real-time audio connection status
 *
 * This component demonstrates the power of centralized Zustand connection state.
 * You can see all connections, their status, and any errors in real-time.
 */
export function AudioConnectionDebugPanel() {
	const { audioConnections } = useAudioConnections();

	const connectedCount = audioConnections.filter(
		(c) => c.status === 'connected'
	).length;
	const errorCount = audioConnections.filter(
		(c) => c.status === 'error'
	).length;
	const pendingCount = audioConnections.filter(
		(c) => c.status === 'pending'
	).length;

	return (
		<div className='fixed top-16 right-4 bg-black/80 text-white p-4 rounded-lg text-sm z-50 max-w-sm'>
			<h3 className='font-bold mb-2'>🔌 Audio Connections</h3>

			<div className='mb-3'>
				<div className='flex gap-4 text-xs'>
					<span className='text-green-400'>✅ Connected: {connectedCount}</span>
					<span className='text-yellow-400'>⏳ Pending: {pendingCount}</span>
					<span className='text-red-400'>❌ Errors: {errorCount}</span>
				</div>
			</div>

			<div className='space-y-1 max-h-60 overflow-y-auto'>
				{audioConnections.length === 0 ? (
					<div className='text-gray-400 italic'>No connections</div>
				) : (
					audioConnections.map((connection) => (
						<div
							key={connection.id}
							className='border-l-2 border-gray-600 pl-2 py-1'
						>
							<div className='flex items-center gap-2'>
								<StatusIcon status={connection.status} />
								<span className='text-xs'>
									{connection.sourceNodeId} → {connection.targetNodeId}
								</span>
							</div>
							{connection.targetHandle &&
								connection.targetHandle !== 'audio-in' && (
									<div className='text-xs text-gray-400 ml-4'>
										{connection.targetHandle}
									</div>
								)}
							{connection.lastError && (
								<div className='text-xs text-red-400 ml-4'>
									Error: {connection.lastError}
								</div>
							)}
						</div>
					))
				)}
			</div>
		</div>
	);
}

function StatusIcon({ status }: { status: string }) {
	switch (status) {
		case 'connected':
			return <span className='text-green-400'>✅</span>;
		case 'error':
			return <span className='text-red-400'>❌</span>;
		case 'pending':
			return <span className='text-yellow-400'>⏳</span>;
		case 'disconnected':
			return <span className='text-gray-400'>⭕</span>;
		default:
			return <span className='text-gray-400'>❓</span>;
	}
}
