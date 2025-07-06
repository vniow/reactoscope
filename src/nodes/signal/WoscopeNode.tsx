/**
 * WoscopeNode.tsx
 * A node that provides woscope-style XY audio visualization
 *
 * Follows Reactoscope guidelines:
 * - Function declarations over arrow functions
 * - Explicit TypeScript types
 * - Performance optimizations with memoization
 * - Constants for magic numbers
 * - Semantic styling with design tokens
 * - Proper error handling
 *
 * @example
 * ```tsx
 * <WoscopeNode
 *   id="woscope-1"
 *   data={{ lineColor: "#00ff00", audioScale: 0.8 }}
 *   selected={false}
 * />
 * ```
 */
import React, { useEffect, useMemo, useCallback } from 'react';
import { Canvas, type RootState } from '@react-three/fiber';
import { Position, type NodeProps } from '@xyflow/react';

// Import base components
import { BaseNode } from '../../shared/components/BaseNode';
import { NodeHandle } from '../../shared/components/NodeHandle';

// Import woscope-specific components
import WoscopeVisualization from './components/WoscopeVisualization';
import WoscopeDebugPanel from './components/WoscopeDebugPanel';

// Import types and stores
import type { BaseNodeData } from '../types';
import { useAppStore } from '../../shared/stores/appStore';

// Constants following design guidelines - avoid magic numbers
const DEFAULT_LINE_COLOR = '#00ff00';
const DEFAULT_LINE_THICKNESS = 0.012;
const DEFAULT_LINE_INTENSITY = 1.0;
const DEFAULT_AUDIO_SCALE = 0.8;
const ANALYZER_SIZE = 1024;
const CANVAS_SIZE = 'var(--spacing-grid-8)';
const CAMERA_CONFIG = {
	position: [0, 0, 1.5] as const,
	fov: 75,
} as const;

// Development vs production logging
const isDevelopment = import.meta.env.DEV;
const debugLog = isDevelopment ? console.log : () => {};

/**
 * Data interface for Woscope Node
 * Extends BaseNodeData with woscope-specific parameters
 */
interface WoscopeNodeData extends BaseNodeData {
	lineColor?: string;
	lineThickness?: number;
	lineIntensity?: number;
	audioScale?: number;
	analyzerSize?: number;
	showDebug?: boolean;
}

/**
 * WoscopeNode component following Reactoscope guidelines
 *
 * Key patterns implemented:
 * - Function declaration instead of arrow function
 * - Explicit TypeScript typing
 * - Constants for magic numbers
 * - Memoized configurations for performance
 * - Error handling with graceful degradation
 * - Semantic styling with design tokens
 * - Conditional development logging
 */
function WoscopeNode({
	id,
	selected = false,
	data,
}: NodeProps & { data?: WoscopeNodeData }) {
	const registerAudioNode = useAppStore((state) => state.registerAudioNode);
	const unregisterAudioNode = useAppStore((state) => state.unregisterAudioNode);
	const getAudioNode = useAppStore((state) => state.getAudioNode);

	// Destructure data with defaults using constants
	const {
		lineColor = DEFAULT_LINE_COLOR,
		lineThickness = DEFAULT_LINE_THICKNESS,
		lineIntensity = DEFAULT_LINE_INTENSITY,
		audioScale = DEFAULT_AUDIO_SCALE,
		analyzerSize = ANALYZER_SIZE,
		showDebug = false,
	} = data || {};

	// Memoized Canvas configuration for performance
	const canvasConfig = useMemo(
		() => ({
			style: { width: '100%', height: '100%' },
			camera: CAMERA_CONFIG,
			dpr: Math.min(window.devicePixelRatio || 1, 2),
			frameloop: 'always' as const,
			onCreated: (state: RootState) => {
				state.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			},
		}),
		[]
	);

	// Effect for audio analyzer lifecycle management
	useEffect(() => {
		// Register X and Y analyzers for woscope visualization
		registerAudioNode(id + ':x', 'analyzer', {
			type: 'waveform',
			size: analyzerSize,
		});
		registerAudioNode(id + ':y', 'analyzer', {
			type: 'waveform',
			size: analyzerSize,
		});

		debugLog(`WoscopeNode: Registered X/Y analyzers for node ${id}`);

		// Cleanup function following RAII principles
		return () => {
			unregisterAudioNode(id + ':x');
			unregisterAudioNode(id + ':y');
			debugLog(`WoscopeNode: Cleaned up analyzers for node ${id}`);
		};
	}, [id, registerAudioNode, unregisterAudioNode, analyzerSize]);

	// Get analyzers from audio registry
	const analyzerX = getAudioNode(id + ':x') as import('tone').Analyser | null;
	const analyzerY = getAudioNode(id + ':y') as import('tone').Analyser | null;

	// Memoized analyzers object for performance
	const analyzers = useMemo(
		() => ({
			l: analyzerX, // X maps to left channel for compatibility
			r: analyzerY, // Y maps to right channel for compatibility
		}),
		[analyzerX, analyzerY]
	);

	const isReady = Boolean(analyzerX && analyzerY);

	// Error boundary fallback - graceful degradation
	const renderVisualization = useCallback(() => {
		try {
			return (
				<WoscopeVisualization
					analyzers={analyzers}
					isPlaying={isReady}
					lineColor={lineColor}
					lineThickness={lineThickness}
					lineIntensity={lineIntensity}
					audioScale={audioScale}
				/>
			);
		} catch (error) {
			debugLog('WoscopeNode: Visualization error:', error);
			return (
				<mesh>
					<planeGeometry args={[2, 2]} />
					<meshBasicMaterial
						color='red'
						opacity={0.5}
						transparent
					/>
				</mesh>
			);
		}
	}, [analyzers, isReady, lineColor, lineThickness, lineIntensity, audioScale]);

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='Woscope'
			variant='signal'
		>
			<div className='bg-node-secondary rounded overflow-hidden border border-node'>
				{/* Canvas Container with grid-aligned sizing */}
				<div
					className='bg-black r3f-canvas-container'
					style={{
						width: CANVAS_SIZE,
						height: CANVAS_SIZE,
					}}
				>
					<Canvas {...canvasConfig}>{renderVisualization()}</Canvas>
				</div>

				{/* Status indicator with semantic styling */}
				<div className='flex justify-between items-center mt-2 text-xs px-2'>
					<div className='flex items-center'>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								isReady ? 'bg-green-500' : 'bg-yellow-500'
							}`}
							aria-label={isReady ? 'Ready' : 'Initializing'}
						/>
						<span className='text-node-secondary'>
							{isReady ? 'ANALYZING' : 'INIT...'}
						</span>
					</div>
					<div className='text-xs text-node-muted'>
						{
							Object.keys(analyzers).filter(
								(key) => analyzers[key as keyof typeof analyzers]
							).length
						}
						/2
					</div>
				</div>

				{/* Conditional debug panel */}
				{showDebug && (
					<WoscopeDebugPanel
						analyzers={analyzers}
						isReady={isReady}
						nodeId={id}
					/>
				)}
			</div>

			{/* Input Handles - X and Y inputs for woscope visualization */}
			<NodeHandle
				id='inputX'
				type='target'
				position={Position.Left}
				label='X'
				style={{ top: '30%' }}
			/>
			<NodeHandle
				id='inputY'
				type='target'
				position={Position.Left}
				label='Y'
				style={{ top: '70%' }}
			/>
		</BaseNode>
	);
}

export { WoscopeNode };
