/**
 * Debug panel component for displaying worklet metrics
 * Extracted for better separation of concerns and reusability
 */
import { useState, useEffect } from 'react';

// Type imports
import type { ComponentVariant } from '../shared/types/ui';

// Constants for improved maintainability
const DISPLAY_UPDATE_INTERVAL = 100; // ms

const WORKLET_STATUS_STYLES = {
	ready: 'text-green-400',
	notReady: 'text-red-400',
	playing: 'text-green-400',
	stopped: 'text-gray-400',
} as const;

export interface BufferStats {
	fillPercentage: number;
	oldestPointAge: number;
	lastSendTime: number;
	throttleHits: number;
}

export interface DebugMetrics {
	objectCount: number;
	totalDataPoints: number;
	sampleStep: number;
	extractedPoints: number;
	duplicatesFiltered: number;
	pointsPerObject: { [key: string]: number };
	dataRange: { xMin: number; xMax: number; yMin: number; yMax: number };
	processingTime: number;
	centerPointsAdded: number;
}

/**
 * Performance-optimized component for displaying last send time
 * Uses useEffect with interval to avoid recalculating on every render
 *
 * @param lastSendTime - Timestamp of the last send operation
 */
function LastSendTimeDisplay({ lastSendTime }: { lastSendTime: number }) {
	const [timeDiff, setTimeDiff] = useState<number>(0);

	// Update time difference every 100ms for smooth display
	useEffect(() => {
		const interval = setInterval(() => {
			setTimeDiff(Date.now() - lastSendTime);
		}, DISPLAY_UPDATE_INTERVAL);

		return () => clearInterval(interval);
	}, [lastSendTime]);

	return (
		<span className='text-xs text-gray-400'>Last Send: {timeDiff}ms ago</span>
	);
}

/**
 * Debug panel component for displaying worklet metrics
 * Extracted for better separation of concerns and reusability
 */
interface DebugPanelProps {
	debugMetrics: DebugMetrics | null;
	frameRate: number;
	bufferStats: BufferStats;
	bufferSize: number;
	coordinateBufferLength: number;
	isReady: boolean;
	isPlaying: boolean;
}

/**
 * Debug panel component for displaying worklet metrics
 * Follows component composition pattern and uses semantic CSS custom properties
 *
 * @param debugMetrics - Current debug metrics data
 * @param frameRate - Current frame rate
 * @param bufferStats - Buffer statistics
 * @param bufferSize - Size of the buffer
 * @param coordinateBufferLength - Current coordinate buffer length
 * @param isReady - Whether the worklet is ready
 * @param isPlaying - Whether the worklet is currently playing
 */
export function DebugPanel({
	debugMetrics,
	frameRate,
	bufferStats,
	bufferSize,
	coordinateBufferLength,
	isReady,
	isPlaying,
}: DebugPanelProps) {
	return (
		<div
			className='w-grid-8 h-grid-5 mt-grid-3 p-2 rounded-lg'
			style={{
				backgroundColor: 'var(--node-bg-interactive)',
				color: 'var(--node-text-primary)',
			}}
		>
			<div className='w-full h-full p-1'>
				<div className='w-full h-full'>
					<div
						className='text-xs font-mono mb-1'
						style={{ color: 'var(--node-text-highlight)' }}
					>
						🔍 Debug Panel (FPS: {frameRate})
					</div>

					{debugMetrics && (
						<div className='grid grid-cols-3 gap-1 text-xs font-mono overflow-y-auto h-full'>
							{/* Performance Metrics */}
							<div className='space-y-0.5'>
								<div className='text-yellow-400 font-semibold'>
									Performance:
								</div>
								<div className='text-green-400'>
									Process: {debugMetrics.processingTime.toFixed(2)}ms
								</div>
								<div className='text-green-400'>
									Throttle Hits: {bufferStats.throttleHits}
								</div>
								<div className='text-green-400'>
									Sample Step: {debugMetrics.sampleStep}
								</div>
							</div>

							{/* Scene Analysis */}
							<div className='space-y-0.5'>
								<div className='text-yellow-400 font-semibold'>Data:</div>
								<div className='text-blue-400'>
									Objects: {debugMetrics.objectCount}
								</div>
								<div className='text-blue-400'>
									Points: {debugMetrics.totalDataPoints}
								</div>
								<div className='text-blue-400'>
									Centers: +{debugMetrics.centerPointsAdded}
								</div>
							</div>

							{/* Buffer Statistics */}
							<div className='space-y-0.5'>
								<div className='text-yellow-400 font-semibold'>Buffer:</div>
								<div className='text-purple-400'>
									Fill: {bufferStats.fillPercentage.toFixed(1)}%
								</div>
								<div className='text-purple-400'>
									Age: {bufferStats.oldestPointAge}ms
								</div>
								<div className='text-purple-400'>
									Size: {coordinateBufferLength}/{bufferSize}
								</div>
							</div>

							{/* Coordinate Quality */}
							<div className='space-y-0.5'>
								<div className='text-yellow-400 font-semibold'>Quality:</div>
								<div className='text-orange-400'>
									Extracted: {debugMetrics.extractedPoints}
								</div>
								<div className='text-orange-400'>
									Dupes: {debugMetrics.duplicatesFiltered}
								</div>
								<div className='text-orange-400'>
									Range: X[{debugMetrics.dataRange.xMin.toFixed(2)},
									{debugMetrics.dataRange.xMax.toFixed(2)}]
								</div>
							</div>

							{/* Per-Object Breakdown */}
							<div className='space-y-0.5 col-span-3'>
								<div className='text-yellow-400 font-semibold'>Per Object:</div>
								<div className='flex flex-wrap gap-2'>
									{Object.entries(debugMetrics.pointsPerObject).map(
										([name, count]) => (
											<span
												key={name}
												className='text-cyan-400 text-xs'
											>
												{name}: {String(count)}
											</span>
										)
									)}
								</div>
							</div>

							{/* Worklet Status */}
							<div className='space-y-0.5 col-span-3'>
								<div className='text-yellow-400 font-semibold'>Worklet:</div>
								<div className='flex gap-4'>
									<span
										className={`text-xs ${isReady ? WORKLET_STATUS_STYLES.ready : WORKLET_STATUS_STYLES.notReady}`}
									>
										Ready: {isReady ? 'YES' : 'NO'}
									</span>
									<span
										className={`text-xs ${isPlaying ? WORKLET_STATUS_STYLES.playing : WORKLET_STATUS_STYLES.stopped}`}
									>
										Playing: {isPlaying ? 'YES' : 'NO'}
									</span>
									<LastSendTimeDisplay
										lastSendTime={bufferStats.lastSendTime}
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
