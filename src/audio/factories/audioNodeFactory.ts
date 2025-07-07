/**
 * Audio Node Factory
 *
 * Factory function to create Tone.js audio nodes with proper configuration
 * and lifecycle management.
 */

import * as Tone from 'tone';
import type {
	AudioNodeType,
	AudioNodeParams,
	OscillatorParams,
	PlayerParams,
	FilterParams,
	DelayParams,
	ReverbParams,
	GainParams,
	DualGainParams,
	PannerParams,
	CompressorParams,
	DistortionParams,
	AnalyzerParams,
	OscilloscopeParams,
	MeterParams,
	EnvelopeParams,
	LFOParams,
	DestinationParams,
} from '../types';

/**
 * Factory function to create Tone.js audio nodes
 *
 * @param type - Type of audio node to create
 * @param params - Parameters for the node
 * @returns The created Tone.js node or array of nodes
 */
export function createAudioNode(
	type: AudioNodeType,
	params?: AudioNodeParams
): Tone.ToneAudioNode | Tone.ToneAudioNode[] {
	try {
		// Handle custom nodes passed through parameters
		if (
			params &&
			typeof params === 'object' &&
			'node' in params &&
			params.node
		) {
			console.log(`🔊 Using provided custom ${type} node`);
			return params.node as Tone.ToneAudioNode;
		}

		switch (type) {
			case 'xyrgbMerge': {
				// 5-channel merger for XYRGB
				return new Tone.Merge(5);
			}
			case 'oscillator': {
				const oscParams = params as OscillatorParams;
				const oscillator = new Tone.Oscillator({
					frequency: oscParams?.frequency || 440,
					type: oscParams?.type || 'sine',
					detune: oscParams?.detune || 0,
				});

				// Add volume control if specified
				if (oscParams?.volume !== undefined) {
					const gain = new Tone.Gain(Tone.dbToGain(oscParams.volume));
					oscillator.connect(gain);
					return [oscillator, gain];
				}

				return oscillator;
			}

			case 'player': {
				const playerParams = params as PlayerParams;
				return new Tone.Player({
					url: playerParams?.url || '',
					loop: playerParams?.loop || false,
					volume: playerParams?.volume || 0,
					playbackRate: playerParams?.playbackRate || 1,
				});
			}

			case 'filter': {
				const filterParams = params as FilterParams;
				return new Tone.Filter({
					frequency: filterParams?.frequency || 1000,
					type: filterParams?.type || 'lowpass',
					Q: filterParams?.Q || 1,
					gain: filterParams?.gain || 0,
				});
			}

			case 'delay': {
				const delayParams = params as DelayParams;
				return new Tone.FeedbackDelay({
					delayTime: delayParams?.delayTime || 0.25,
					feedback: delayParams?.feedback || 0.5,
					wet: delayParams?.wet || 0.5,
				});
			}

			case 'reverb': {
				const reverbParams = params as ReverbParams;
				return new Tone.Reverb({
					decay: reverbParams?.decay || 1.5,
					preDelay: reverbParams?.preDelay || 0.01,
					wet: reverbParams?.wet || 0.3,
				});
			}

			case 'gain': {
				const gainParams = params as GainParams;
				return new Tone.Gain({
					gain: gainParams?.gain || 1,
				});
			}

			case 'dualGain': {
				const dualGainParams = params as DualGainParams;
				const gain1 = new Tone.Gain({
					gain: dualGainParams?.gain1 || 1,
				});
				const gain2 = new Tone.Gain({
					gain: dualGainParams?.gain2 || 1,
				});

				// Return as array with two independent gain nodes
				// Index 0 = gain1 (channel 1), Index 1 = gain2 (channel 2)
				return [gain1, gain2];
			}

			case 'panner': {
				const panParams = params as PannerParams;
				return new Tone.Panner({
					pan: panParams?.pan || 0,
				});
			}

			case 'compressor': {
				const compParams = params as CompressorParams;
				return new Tone.Compressor({
					threshold: compParams?.threshold || -24,
					ratio: compParams?.ratio || 3,
					attack: compParams?.attack || 0.003,
					release: compParams?.release || 0.1,
					knee: compParams?.knee || 30,
				});
			}

			case 'distortion': {
				const distParams = params as DistortionParams;
				return new Tone.Distortion({
					distortion: distParams?.distortion || 0.4,
					oversample: distParams?.oversample || 'none',
				});
			}

			case 'analyzer': {
				const analyzerParams = params as AnalyzerParams;
				return new Tone.Analyser({
					type: analyzerParams?.type || 'waveform',
					size: analyzerParams?.size || 1024,
				});
			}

			case 'oscilloscope': {
				// For oscilloscope, create a gain node for pass-through and an analyzer for visualization
				const oscilloscopeParams = params as OscilloscopeParams;

				// Create a gain node for pass-through
				const passThrough = new Tone.Gain(1);
				const analyzer = new Tone.Analyser({
					type: 'waveform',
					size: oscilloscopeParams?.resolution || 512,
				});

				// Connect pass-through to analyzer for visualization
				passThrough.connect(analyzer);

				// Return array: [pass-through gain (input/output), analyzer (for data)]
				// This allows signal to flow through while being monitored
				return [passThrough, analyzer];
			}

			case 'signal': {
				// Create a Tone.Signal node
				// SignalParams: value (number), min (optional), max (optional), units (optional)
				const { value = 0 } = (params as import('../types').SignalParams) || {};
				// Tone.Signal constructor: new Signal(value?: number, units?: string)
				// Only pass units if defined, to avoid type errors
				// TypeScript does not allow passing units due to type restrictions.
				// If units are needed, set them after construction: signal.units = units as any;
				return new Tone.Signal(value);
			}

			case 'meter': {
				const meterParams = params as MeterParams;
				return new Tone.Meter({
					smoothing: meterParams?.smoothing || 0.8,
				});
			}

			case 'envelope': {
				const envParams = params as EnvelopeParams;
				return new Tone.AmplitudeEnvelope({
					attack: envParams?.attack || 0.1,
					decay: envParams?.decay || 0.2,
					sustain: envParams?.sustain || 0.5,
					release: envParams?.release || 0.8,
				});
			}

			case 'lfo': {
				const lfoParams = params as LFOParams;
				return new Tone.LFO({
					frequency: lfoParams?.frequency || 1,
					type: lfoParams?.type || 'sine',
					min: lfoParams?.min || 0,
					max: lfoParams?.max || 1,
				});
			}

			case 'masterOutput':
			case 'destination': {
				// For destination nodes, create a gain node that connects to destination
				// This allows us to have volume control on the master output
				const destinationParams = params as DestinationParams;
				const destinationGain = new Tone.Gain(
					destinationParams?.mute
						? 0
						: Tone.dbToGain(destinationParams?.volume || 0)
				);
				destinationGain.toDestination();
				return destinationGain;
			}

			case 'microphone': {
				// Create a user media input
				return new Tone.UserMedia();
			}

			case 'custom-xyrgb': {
				// Custom XYRGB interpolator node - handled externally
				// This case should not be reached as custom nodes are passed directly
				console.warn('⚠️ Custom XYRGB node should be provided externally');
				return new Tone.Gain(1);
			}

			default:
				console.warn(`⚠️ Unknown audio node type: ${type}`);
				// Return a pass-through gain node as fallback
				return new Tone.Gain(1);
		}
	} catch (error) {
		console.error(`❌ Failed to create audio node of type ${type}:`, error);
		// Return a safe fallback
		return new Tone.Gain(1);
	}
}

/**
 * Properly dispose of an audio node or array of nodes
 *
 * @param audioNode - The audio node(s) to dispose
 */
export function disposeAudioNode(
	audioNode:
		| Tone.ToneAudioNode
		| Tone.ToneAudioNode[]
		| { outputs: Record<string, Tone.ToneAudioNode> }
): void {
	try {
		if (Array.isArray(audioNode)) {
			audioNode.forEach((node) => {
				if (node.dispose && typeof node.dispose === 'function') {
					node.dispose();
				}
			});
		} else if ('outputs' in audioNode) {
			// Handle nodes with named outputs
			Object.values(audioNode.outputs).forEach((outputNode) => {
				if (outputNode.dispose && typeof outputNode.dispose === 'function') {
					outputNode.dispose();
				}
			});
			// Dispose the main node if it has dispose method
			if (isDisposableNode(audioNode)) {
				audioNode.dispose();
			}
		} else {
			if (audioNode.dispose && typeof audioNode.dispose === 'function') {
				audioNode.dispose();
			}
		}
	} catch (error) {
		console.error('❌ Error disposing audio node:', error);
	}
}

// Type guards for audio node capabilities
interface StartableNode extends Tone.ToneAudioNode {
	start: () => void;
	state: 'started' | 'stopped';
}

interface StoppableNode extends Tone.ToneAudioNode {
	stop: () => void;
}

interface DisposableNode {
	dispose: () => void;
}

function isStartableNode(node: Tone.ToneAudioNode): node is StartableNode {
	return 'start' in node && typeof (node as StartableNode).start === 'function';
}

function isStoppableNode(node: Tone.ToneAudioNode): node is StoppableNode {
	return 'stop' in node && typeof (node as StoppableNode).stop === 'function';
}

function isDisposableNode(obj: unknown): obj is DisposableNode {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'dispose' in obj &&
		typeof (obj as DisposableNode).dispose === 'function'
	);
}

function isNodeAlreadyStarted(node: Tone.ToneAudioNode): boolean {
	return 'state' in node && (node as StartableNode).state === 'started';
}

/**
 * Start an audio node if it supports starting and isn't already started
 *
 * @param audioNode - The audio node(s) to start
 */
export function startAudioNode(
	audioNode:
		| Tone.ToneAudioNode
		| Tone.ToneAudioNode[]
		| { outputs: Record<string, Tone.ToneAudioNode> }
): void {
	try {
		if (Array.isArray(audioNode)) {
			audioNode.forEach((node, index) => {
				if (isStartableNode(node)) {
					const isAlreadyStarted = isNodeAlreadyStarted(node);
					if (!isAlreadyStarted) {
						console.log(
							`▶️ Starting audio node[${index}] (${node.constructor.name})`
						);
						node.start();
					} else {
						console.log(
							`⏭️ Skipping already started audio node[${index}] (${node.constructor.name})`
						);
					}
				}
			});
		} else if ('outputs' in audioNode) {
			// Handle nodes with named outputs - try to start the main node if it's startable
			if ('start' in audioNode && typeof audioNode.start === 'function') {
				console.log(`▶️ Starting audio node with outputs`);
				(audioNode.start as () => void)();
			}
		} else {
			if (isStartableNode(audioNode)) {
				const isAlreadyStarted = isNodeAlreadyStarted(audioNode);
				if (!isAlreadyStarted) {
					console.log(`▶️ Starting audio node (${audioNode.constructor.name})`);
					audioNode.start();
				} else {
					console.log(
						`⏭️ Skipping already started audio node (${audioNode.constructor.name})`
					);
				}
			}
		}
	} catch (error) {
		console.error('❌ Error starting audio node:', error);
	}
}

/**
 * Stop an audio node if it supports stopping
 *
 * @param audioNode - The audio node(s) to stop
 */
export function stopAudioNode(
	audioNode:
		| Tone.ToneAudioNode
		| Tone.ToneAudioNode[]
		| { outputs: Record<string, Tone.ToneAudioNode> }
): void {
	try {
		if (Array.isArray(audioNode)) {
			audioNode.forEach((node) => {
				if (isStoppableNode(node)) {
					node.stop();
				}
			});
		} else if ('outputs' in audioNode) {
			// Handle nodes with named outputs - try to stop the main node if it's stoppable
			if ('stop' in audioNode && typeof audioNode.stop === 'function') {
				(audioNode.stop as () => void)();
			}
		} else {
			if (isStoppableNode(audioNode)) {
				audioNode.stop();
			}
		}
	} catch (error) {
		console.error('❌ Error stopping audio node:', error);
	}
}

/**
 * Update parameters of an existing audio node without recreating it
 *
 * @param audioNode - The audio node(s) to update
 * @param type - The type of audio node
 * @param params - The new parameters to apply
 */
export async function updateAudioNodeParams(
	audioNode:
		| Tone.ToneAudioNode
		| Tone.ToneAudioNode[]
		| { outputs: Record<string, Tone.ToneAudioNode> },
	type: AudioNodeType,
	params: Partial<AudioNodeParams>
): Promise<void> {
	try {
		if (Array.isArray(audioNode)) {
			// Handle array of nodes (like dualGain, oscillator with volume, etc.)
			switch (type) {
				case 'dualGain': {
					const gainParams = params as Partial<DualGainParams>;
					if (gainParams.gain1 !== undefined && audioNode[0]) {
						(audioNode[0] as Tone.Gain).gain.value = gainParams.gain1;
					}
					if (gainParams.gain2 !== undefined && audioNode[1]) {
						(audioNode[1] as Tone.Gain).gain.value = gainParams.gain2;
					}
					break;
				}
				case 'oscillator': {
					// Handle oscillator with volume (array of [oscillator, gain])
					const oscParams = params as Partial<OscillatorParams>;
					const osc = audioNode[0] as Tone.Oscillator;
					const gain = audioNode[1] as Tone.Gain;

					if (oscParams.frequency !== undefined) {
						osc.frequency.value = oscParams.frequency;
					}
					if (oscParams.type !== undefined) {
						osc.type = oscParams.type;
					}
					if (oscParams.detune !== undefined) {
						osc.detune.value = oscParams.detune;
					}
					if (oscParams.volume !== undefined) {
						// Update the gain node (second element in array)
						gain.gain.value = Tone.dbToGain(oscParams.volume);
					}
					break;
				}
				case 'oscilloscope': {
					// Handle oscilloscope (array of [passThrough, analyzer])
					const scopeParams = params as Partial<OscilloscopeParams>;

					if (scopeParams.resolution !== undefined) {
						// Note: Tone.Analyser doesn't support runtime size changes
						// This would require recreating the analyzer
						console.warn(
							'⚠️ Runtime resolution changes not supported, requires node recreation'
						);
					}
					// Other parameters like timeWindow and triggerLevel are handled by the UI component
					// No live parameter updates needed for oscilloscope audio nodes
					break;
				}
				default:
					console.warn(`⚠️ Unknown array audio node type for update: ${type}`);
			}
		} else if ('outputs' in audioNode) {
			// Handle nodes with named outputs (like custom XYRGB node)
			switch (type) {
				case 'custom-xyrgb': {
					// Custom XYRGB nodes handle their own parameter updates through their methods
					// The parameters are already applied through the React component
					// No additional parameter updates needed here
					break;
				}
				default:
					console.warn(`⚠️ Unknown custom node type for update: ${type}`);
			}
		} else {
			// Handle single nodes
			switch (type) {
				case 'oscillator': {
					// Handle simple oscillator without volume (single node)
					const oscParams = params as Partial<OscillatorParams>;
					const osc = audioNode as Tone.Oscillator;
					if (oscParams.frequency !== undefined) {
						osc.frequency.value = oscParams.frequency;
					}
					if (oscParams.type !== undefined) {
						osc.type = oscParams.type;
					}
					if (oscParams.detune !== undefined) {
						osc.detune.value = oscParams.detune;
					}
					// Note: volume parameter should not be set on single oscillator nodes
					// as they don't have volume control - only array oscillators do
					break;
				}

				case 'gain': {
					const gainParams = params as Partial<GainParams>;
					const gain = audioNode as Tone.Gain;
					if (gainParams.gain !== undefined) {
						gain.gain.value = gainParams.gain;
					}
					break;
				}

				case 'destination': {
					const destParams = params as Partial<DestinationParams>;
					const dest = audioNode as Tone.Gain; // Destination is implemented as a Gain node
					if (destParams.volume !== undefined) {
						dest.gain.value = Tone.dbToGain(destParams.volume);
					}
					if (destParams.mute !== undefined) {
						dest.gain.value = destParams.mute
							? 0
							: Tone.dbToGain(destParams.volume || 0);
					}
					break;
				}

				case 'filter': {
					const filterParams = params as Partial<FilterParams>;
					const filter = audioNode as Tone.Filter;
					if (filterParams.frequency !== undefined) {
						filter.frequency.value = filterParams.frequency;
					}
					if (filterParams.Q !== undefined) {
						filter.Q.value = filterParams.Q;
					}
					if (filterParams.type !== undefined) {
						filter.type = filterParams.type;
					}
					if (filterParams.gain !== undefined) {
						filter.gain.value = filterParams.gain;
					}
					break;
				}

				case 'delay': {
					const delayParams = params as Partial<DelayParams>;
					const delay = audioNode as Tone.Delay;
					if (delayParams.delayTime !== undefined) {
						delay.delayTime.value = delayParams.delayTime;
					}
					// Note: feedback and wet properties may need to be accessed differently in Tone.js
					break;
				}

				case 'reverb': {
					const reverbParams = params as Partial<ReverbParams>;
					const reverb = audioNode as Tone.Reverb;
					if (reverbParams.wet !== undefined) {
						reverb.wet.value = reverbParams.wet;
					}
					// Note: roomSize and dampening may need to be accessed differently in Tone.js
					break;
				}

				case 'panner': {
					const panParams = params as Partial<PannerParams>;
					const panner = audioNode as Tone.Panner;
					if (panParams.pan !== undefined) {
						panner.pan.value = panParams.pan;
					}
					break;
				}

				case 'compressor': {
					const compParams = params as Partial<CompressorParams>;
					const comp = audioNode as Tone.Compressor;
					if (compParams.threshold !== undefined) {
						comp.threshold.value = compParams.threshold;
					}
					if (compParams.ratio !== undefined) {
						comp.ratio.value = compParams.ratio;
					}
					if (compParams.attack !== undefined) {
						comp.attack.value = compParams.attack;
					}
					if (compParams.release !== undefined) {
						comp.release.value = compParams.release;
					}
					break;
				}

				case 'distortion': {
					const distParams = params as Partial<DistortionParams>;
					const dist = audioNode as Tone.Distortion;
					if (distParams.distortion !== undefined) {
						dist.distortion = distParams.distortion;
					}
					if (distParams.oversample !== undefined) {
						dist.oversample = distParams.oversample;
					}
					break;
				}

				case 'lfo': {
					const lfoParams = params as Partial<LFOParams>;
					const lfo = audioNode as Tone.LFO;
					if (lfoParams.frequency !== undefined) {
						lfo.frequency.value = lfoParams.frequency;
					}
					if (lfoParams.type !== undefined) {
						lfo.type = lfoParams.type;
					}
					// Note: amplitude property may need to be accessed differently in Tone.js
					break;
				}

				case 'oscilloscope': {
					// Handle oscilloscope (single analyzer node)
					const scopeParams = params as Partial<OscilloscopeParams>;

					if (scopeParams.resolution !== undefined) {
						// Note: Tone.Analyser doesn't support runtime size changes
						// This would require recreating the analyzer
						console.warn(
							'⚠️ Runtime resolution changes not supported, requires node recreation'
						);
					}
					// Other parameters like timeWindow and triggerLevel are handled by the UI component
					// No live parameter updates needed for oscilloscope audio nodes
					break;
				}

				case 'signal': {
					// Update Tone.Signal value if provided
					const signalParams = params as Partial<
						import('../types').SignalParams
					>;
					const signal = audioNode as Tone.Signal;
					if (signalParams.value !== undefined) {
						signal.value = signalParams.value;
					}
					break;
				}
				case 'custom-noise':
				case 'custom-xyrgb': {
					// Custom nodes handle their own parameter updates through their methods
					// The parameters are already applied through the React component
					// No additional parameter updates needed here
					break;
				}

				default:
					console.warn(`⚠️ Unknown audio node type for update: ${type}`);
			}
		}

		// console.log(`✅ Live audio node params updated (${type})`);
	} catch (error) {
		console.error(`❌ Error updating live audio node params (${type}):`, error);
	}
}
