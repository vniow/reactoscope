/**
 * WoscopeDebugPanel.tsx
 * Debug panel for tracking Woscope analyzer states and data flow
 *
 * Follows Reactoscope guidelines:
 * - Function declaration instead of React.FC
 * - Explicit TypeScript types
 * - Performance optimizations with memoization
 * - Constants for magic numbers
 * - Semantic styling with design tokens
 */
import { useState, useEffect } from 'react';
import type * as Tone from 'tone';

interface WoscopeDebugPanelProps {
	analyzers: {
		l: Tone.Analyser | null;
		r: Tone.Analyser | null;
	};
	isReady: boolean;
	nodeId: string;
}

interface AnalyzerDebugInfo {
	isConnected: boolean;
	hasData: boolean;
	dataSize: number;
	sampleRate: number;
	lastUpdate: number;
	peakLevel: number;
	rmsLevel: number;
}

/**
 * WoscopeDebugPanel component following Reactoscope guidelines
 *
 * Provides comprehensive debugging information for woscope analyzers
 * with performance monitoring and data visualization
 */
function WoscopeDebugPanel({
	analyzers,
	isReady,
	nodeId,
}: WoscopeDebugPanelProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [debugInfo, setDebugInfo] = useState<{
		l: AnalyzerDebugInfo;
		r: AnalyzerDebugInfo;
	}>({
		l: {
			isConnected: false,
			hasData: false,
			dataSize: 0,
			sampleRate: 0,
			lastUpdate: 0,
			peakLevel: 0,
			rmsLevel: 0,
		},
		r: {
			isConnected: false,
			hasData: false,
			dataSize: 0,
			sampleRate: 0,
			lastUpdate: 0,
			peakLevel: 0,
			rmsLevel: 0,
		},
	});

	// Monitor analyzer states
	useEffect(() => {
		if (!isReady) return;

		const updateDebugInfo = () => {
			const newDebugInfo = {
				l: {
					isConnected: false,
					hasData: false,
					dataSize: 0,
					sampleRate: 0,
					lastUpdate: 0,
					peakLevel: 0,
					rmsLevel: 0,
				},
				r: {
					isConnected: false,
					hasData: false,
					dataSize: 0,
					sampleRate: 0,
					lastUpdate: 0,
					peakLevel: 0,
					rmsLevel: 0,
				},
			};

			(['l', 'r'] as const).forEach((channel) => {
				const analyzer = analyzers[channel];
				if (analyzer) {
					try {
						const data = analyzer.getValue() as Float32Array;
						const now = Date.now();

						// Calculate peak and RMS levels
						let peak = 0;
						let rms = 0;
						if (data && data.length > 0) {
							for (let i = 0; i < data.length; i++) {
								const sample = Math.abs(data[i]);
								peak = Math.max(peak, sample);
								rms += sample * sample;
							}
							rms = Math.sqrt(rms / data.length);
						}

						newDebugInfo[channel] = {
							isConnected: true,
							hasData: data && data.length > 0 && peak > 0.001, // Threshold for "real" data
							dataSize: data ? data.length : 0,
							sampleRate: analyzer.context.sampleRate,
							lastUpdate: now,
							peakLevel: peak,
							rmsLevel: rms,
						};
					} catch {
						newDebugInfo[channel] = {
							isConnected: false,
							hasData: false,
							dataSize: 0,
							sampleRate: 0,
							lastUpdate: 0,
							peakLevel: 0,
							rmsLevel: 0,
						};
					}
				}
			});

			setDebugInfo(newDebugInfo);
		};

		// Update every 100ms for responsive debugging
		const interval = setInterval(updateDebugInfo, 100);
		updateDebugInfo(); // Initial update

		return () => clearInterval(interval);
	}, [analyzers, isReady]);

	const formatLevel = (level: number): string => {
		return (level * 100).toFixed(1) + '%';
	};

	const formatTime = (timestamp: number): string => {
		if (timestamp === 0) return 'Never';
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		return seconds === 0 ? 'Just now' : `${seconds}s ago`;
	};

	return (
		<div className='mt-2 border-t border-node-border'>
			{/* Debug panel header */}
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className='w-full flex items-center justify-between px-2 py-1 text-xs text-node-muted hover:text-node-secondary transition-colors'
				aria-label={`${isExpanded ? 'Collapse' : 'Expand'} debug panel`}
			>
				<span>🔍 Debug</span>
				<span
					className={`transform transition-transform ${
						isExpanded ? 'rotate-180' : ''
					}`}
				>
					▼
				</span>
			</button>

			{/* Debug panel content */}
			{isExpanded && (
				<div className='px-2 pb-2 text-xs space-y-2'>
					{/* Node info */}
					<div className='space-y-1'>
						<div className='text-node-secondary font-medium'>Node Status</div>
						<div className='pl-2 space-y-0.5'>
							<div>ID: {nodeId}</div>
							<div>Ready: {isReady ? '✅' : '❌'}</div>
							<div>
								Analyzers: {Object.values(analyzers).filter(Boolean).length}/2
							</div>
						</div>
					</div>

					{/* Analyzer debug info */}
					{(['l', 'r'] as const).map((channel) => {
						const info = debugInfo[channel];
						const channelName = channel === 'l' ? 'X Axis' : 'Y Axis';

						return (
							<div
								key={channel}
								className='space-y-1'
							>
								<div className='text-node-secondary font-medium'>
									{channelName}
								</div>
								<div className='pl-2 space-y-0.5'>
									<div>
										Connected:{' '}
										{info.isConnected ? (
											<span className='text-green-400'>✅</span>
										) : (
											<span className='text-red-400'>❌</span>
										)}
									</div>
									<div>
										Has Data:{' '}
										{info.hasData ? (
											<span className='text-green-400'>✅</span>
										) : (
											<span className='text-yellow-400'>⚠️</span>
										)}
									</div>
									<div>Buffer Size: {info.dataSize}</div>
									<div>Sample Rate: {info.sampleRate}Hz</div>
									<div>Peak Level: {formatLevel(info.peakLevel)}</div>
									<div>RMS Level: {formatLevel(info.rmsLevel)}</div>
									<div>Last Update: {formatTime(info.lastUpdate)}</div>
								</div>
							</div>
						);
					})}

					{/* Audio registry info */}
					<div className='space-y-1'>
						<div className='text-node-secondary font-medium'>Registry</div>
						<div className='pl-2 space-y-0.5'>
							<div>X: {nodeId}:x</div>
							<div>Y: {nodeId}:y</div>
						</div>
					</div>

					{/* Audio Context Status */}
					<div className='space-y-1'>
						<div className='text-node-secondary font-medium'>Audio Context</div>
						<div className='pl-2 space-y-0.5'>
							<div>
								State:{' '}
								{analyzers.l?.context.state === 'running' ? (
									<span className='text-green-400'>Running</span>
								) : (
									<span className='text-red-400'>
										{analyzers.l?.context.state || 'Unknown'}
									</span>
								)}
							</div>
							<div>
								Sample Rate: {analyzers.l?.context.sampleRate || 'N/A'}Hz
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default WoscopeDebugPanel;
