/**
 * XYRGBInterpolatorNode - Audio node for XYRGB signal generation
 *
 * Manages an AudioWorklet that interpolates between vertex data to generate
 * continuous X, Y, R, G, B audio signals for vectorscope/oscilloscope display.
 */
import * as Tone from 'tone';
import {
	reactoscopeProcessorWorklet,
	workletName,
} from './worklet/ReactoscopeAudioProcessor.worklet';
import { ensureWorkletModule } from '../utils/workletRegistry';
import type { VertexInfo } from '../../flow/nodes/source/sceneTypes';
// interpolation utilities
import {
	chunkVerticesByObject,
	interpolateBetweenChunks,
} from '../utils/vertexUtils';

export interface ReactoscopeAudioProcessorNodeOptions {
	/** Scan rate in Hz */
	scanRate?: number;
	/** Start automatically when created */
	autostart?: boolean;
	/** Enable debug logging */
	debug?: boolean;
	/** Number of interpolation steps between object chunks */
	interpolationSteps?: number;
}

/**
 * XYRGB Interpolator Audio Node
 * Generates 6-channel audio output: X, Y, R, G, B, Z
 */
export class ReactoscopeAudioProcessorNode {
	readonly name: string = 'ReactoscopeAudioProcessorNode';
	readonly outputs: {
		x: Tone.Gain;
		y: Tone.Gain;
		r: Tone.Gain;
		g: Tone.Gain;
		b: Tone.Gain;
		z: Tone.Gain; // Added Z output
	};

	private _workletNode: AudioWorkletNode | null = null;
	private _splitter: ChannelSplitterNode | null = null;
	private _isPlaying: boolean = false;
	private _isReady: boolean = false;
	private _readyPromise: Promise<void>;
	private _resolveReady!: () => void;
	private _debug: boolean = false;
	private _vertices: VertexInfo[] = [];
	private _interpolationSteps: number = 1;

	// Parameters
	private _scanRate: number = 60;

	/**
	 * Create a new ReactoscopeAudioProcessorNode
	 */
	constructor(options: ReactoscopeAudioProcessorNodeOptions = {}) {
		this._scanRate = options.scanRate ?? 60;
		this._debug = options.debug ?? false;
		this._interpolationSteps = options.interpolationSteps ?? 1;

		// Create output nodes for each channel
		this.outputs = {
			x: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			y: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			r: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			g: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			b: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			z: new Tone.Gain({ context: Tone.getContext(), gain: 1 }), // Added Z output
		};

		// Setup ready promise
		this._readyPromise = new Promise((resolve) => {
			this._resolveReady = resolve;
		});

		this._initializeWorklet();

		if (options.autostart) {
			this._readyPromise.then(() => {
				this.start();
			});
		}
	}

	/**
	 * Initialize the AudioWorklet
	 */
	private async _initializeWorklet(): Promise<void> {
		try {
			// Create and register worklet
			const workletBlob = new Blob([reactoscopeProcessorWorklet], {
				type: 'text/javascript',
			});
			const workletUrl = URL.createObjectURL(workletBlob);

			// Register worklet module via registry to avoid duplicate loads
			const raw = Tone.getContext().rawContext as AudioContext;
			try {
				await ensureWorkletModule(raw, workletName, workletUrl);
			} finally {
				URL.revokeObjectURL(workletUrl);
			}

			// Create worklet node via Tone.js context wrapper
			const workletNode = Tone.getContext().createAudioWorkletNode(
				workletName,
				{
					numberOfInputs: 0,
					numberOfOutputs: 1,
					channelCount: 6,
					channelCountMode: 'explicit',
					outputChannelCount: [6],
					parameterData: { scanRate: this._scanRate },
				}
			);
			this._workletNode = workletNode;

			// Split multichannel output into 6 mono channels
			const splitter = raw.createChannelSplitter(6);
			this._splitter = splitter;
			this._workletNode.connect(splitter);
			splitter.connect(this.outputs.x.input, 0);
			splitter.connect(this.outputs.y.input, 1);
			splitter.connect(this.outputs.r.input, 2);
			splitter.connect(this.outputs.g.input, 3);
			splitter.connect(this.outputs.b.input, 4);
			splitter.connect(this.outputs.z.input, 5);

			// Send initial configuration
			this._workletNode.port.postMessage({
				type: 'scanRate',
				data: this._scanRate,
			});

			this._isReady = true;
			this._resolveReady();

			if (this._debug) {
				console.log('✅ ReactoscopeAudioProcessorNode worklet initialized');
			}
		} catch (error) {
			console.error('❌ Failed to initialize ReactoscopeProcessorNode:', error);
			throw error;
		}
	}

	/**
	 * Start interpolation
	 */
	start(): this {
		// If worklet not initialized (e.g., after dispose), reinitialize and then start
		if (!this._workletNode) {
			this._isReady = false;
			// Create new ready promise for reinitialization
			this._readyPromise = new Promise((resolve) => {
				this._resolveReady = resolve;
			});
			this._initializeWorklet()
				.then(() => this.start())
				.catch((err) =>
					console.error('❌ Failed to reinitialize worklet:', err)
				);
			return this;
		}
		if (this._isReady && !this._isPlaying) {
			this._workletNode.port.postMessage({ type: 'start' });
			this._isPlaying = true;
			if (this._debug) {
				console.log('▶️ ReactoscopeProcessorNode started');
			}
		}
		return this;
	}

	/**
	 * Stop interpolation
	 */
	stop(): this {
		if (this._workletNode && this._isReady && this._isPlaying) {
			this._workletNode.port.postMessage({ type: 'stop' });
			this._isPlaying = false;

			if (this._debug) {
				console.log('⏹️ ReactoscopeProcessorNode stopped');
			}
		}
		return this;
	}

	/**
	 * Update vertex data for interpolation
	 */
	setVertices(vertices: VertexInfo[]): this {
		// console.log(
		// 	'[ReactoscopeAudioProcessorNode] setVertices called, interpolationSteps:',
		// 	this._interpolationSteps
		// );
		// Apply chunking and interpolation to smooth transitions between objects
		const chunks = chunkVerticesByObject(vertices);
		const interpolated = interpolateBetweenChunks(
			chunks,
			this._interpolationSteps
		);

		this._vertices = interpolated;

		if (this._workletNode && this._isReady) {
			this._workletNode.port.postMessage({
				type: 'vertices',
				data: this._vertices,
			});
		}

		return this;
	}

	/**
	 * Set the number of interpolation steps between object chunks
	 */
	setInterpolationSteps(steps: number): this {
		this._interpolationSteps = Math.max(0, Math.floor(steps));

		return this;
	}

	/**
	 * Set scan rate in Hz
	 */
	setScanRate(value: number): this {
		this._scanRate = Math.max(0.1, Math.min(1000, value));

		if (this._workletNode && this._isReady) {
			const param = this._workletNode.parameters.get('scanRate');
			if (param) {
				param.setValueAtTime(this._scanRate, Tone.getContext().currentTime);
			}

			this._workletNode.port.postMessage({
				type: 'scanRate',
				data: this._scanRate,
			});
		}

		return this;
	}

	/**
	 * Getters
	 */
	get vertices(): VertexInfo[] {
		return [...this._vertices];
	}

	get scanRate(): number {
		return this._scanRate;
	}

	get isPlaying(): boolean {
		return this._isPlaying;
	}

	get isReady(): boolean {
		return this._isReady;
	}

	get ready(): Promise<void> {
		return this._readyPromise;
	}

	/**
	 * Property setters for useAudioNodeParam compatibility
	 */
	set scanRate(value: number) {
		this.setScanRate(value);
	}

	/**
	 * Connect a specific channel to another node
	 */
	connectChannel(
		channel: 'x' | 'y' | 'r' | 'g' | 'b' | 'z', // Added 'z'
		destination: Tone.InputNode
	): this {
		this.outputs[channel].connect(destination);
		return this;
	}

	/**
	 * Connect all channels to destinations
	 */
	connectAll(destinations: {
		x?: Tone.InputNode;
		y?: Tone.InputNode;
		r?: Tone.InputNode;
		g?: Tone.InputNode;
		b?: Tone.InputNode;
		z?: Tone.InputNode; // Added 'z'
	}): this {
		if (destinations.x) this.outputs.x.connect(destinations.x);
		if (destinations.y) this.outputs.y.connect(destinations.y);
		if (destinations.r) this.outputs.r.connect(destinations.r);
		if (destinations.g) this.outputs.g.connect(destinations.g);
		if (destinations.b) this.outputs.b.connect(destinations.b);
		if (destinations.z) this.outputs.z.connect(destinations.z); // Added Z connection
		return this;
	}

	/**
	 * Disconnect all outputs
	 */
	disconnect(): this {
		Object.values(this.outputs).forEach((output) => output.disconnect());
		return this;
	}

	/**
	 * Clean up resources
	 * Note: Only disposes the internal worklet, keeping output gains permanent
	 * This matches the NoiseWorkletNode pattern for proper lifecycle management
	 */
	dispose(): this {
		if (this._isPlaying) {
			this.stop();
		}

		// Only dispose the internal worklet and splitter, NOT the output gains
		if (this._workletNode) {
			this._workletNode.disconnect();
			this._workletNode = null;
		}

		if (this._splitter) {
			this._splitter.disconnect();
			this._splitter = null;
		}

		// Keep output gains alive - they are permanent wrappers
		// Do NOT dispose them: Object.values(this.outputs).forEach((output) => output.dispose());

		// Reset ready state so worklet can be recreated if needed
		this._isReady = false;

		if (this._debug) {
			console.log(
				'🧹 ReactoscopeAudioProcessorNode worklet disposed (outputs preserved)'
			);
		}

		return this;
	}

	/**
	 * Complete disposal for when React Flow node is removed
	 * This disposes everything including the permanent output gains
	 */
	disposeCompletely(): this {
		if (this._isPlaying) {
			this.stop();
		}

		// Dispose internal worklet and splitter
		if (this._workletNode) {
			this._workletNode.disconnect();
			this._workletNode = null;
		}

		if (this._splitter) {
			this._splitter.disconnect();
			this._splitter = null;
		}

		// Now dispose the output gains as well since node is being removed
		Object.values(this.outputs).forEach((output) => {
			output.dispose();
		});

		this._isReady = false;

		if (this._debug) {
			console.log('🧹 ReactoscopeAudioProcessorNode completely disposed');
		}

		return this;
	}
}
