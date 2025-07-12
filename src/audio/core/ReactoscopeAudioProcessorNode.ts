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
import type { VertexInfo } from '../../nodes/source/sceneTypes';

export interface ReactoscopeAudioProcessorNodeOptions {
	/** Scan rate in Hz */
	scanRate?: number;
	/** Smoothing factor for transitions */
	smoothing?: number;
	/** Start automatically when created */
	autostart?: boolean;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * XYRGB Interpolator Audio Node
 * Generates 5-channel audio output: X, Y, R, G, B
 */
export class ReactoscopeAudioProcessorNode {
	readonly name: string = 'ReactoscopeAudioProcessorNode';
	readonly outputs: {
		x: Tone.Gain;
		y: Tone.Gain;
		r: Tone.Gain;
		g: Tone.Gain;
		b: Tone.Gain;
	};

	private _workletNode: AudioWorkletNode | null = null;
	private _splitter: ChannelSplitterNode | null = null;
	private _isPlaying: boolean = false;
	private _isReady: boolean = false;
	private _readyPromise: Promise<void>;
	private _resolveReady!: () => void;
	private _debug: boolean = false;
	private _vertices: VertexInfo[] = [];

	// Parameters
	private _scanRate: number = 30;
	private _smoothing: number = 0.1;

	/**
	 * Create a new ReactoscopeAudioProcessorNode
	 */
	constructor(options: ReactoscopeAudioProcessorNodeOptions = {}) {
		this._scanRate = options.scanRate ?? 30;
		this._smoothing = options.smoothing ?? 0.1;
		this._debug = options.debug ?? false;

		// Create output nodes for each channel
		this.outputs = {
			x: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			y: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			r: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			g: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
			b: new Tone.Gain({ context: Tone.getContext(), gain: 1 }),
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

			try {
				await Tone.getContext().addAudioWorkletModule(workletUrl);
			} finally {
				URL.revokeObjectURL(workletUrl);
			}

			// Create worklet node with 5 output channels
			this._workletNode = Tone.getContext().createAudioWorkletNode(
				workletName,
				{
					numberOfInputs: 0,
					numberOfOutputs: 1,
					outputChannelCount: [5], // X, Y, R, G, B channels
					parameterData: {
						scanRate: this._scanRate,
						smoothing: this._smoothing,
					},
				}
			);

			// Create channel splitter to separate the 5 channels
			this._splitter = Tone.getContext().createChannelSplitter(5);
			this._workletNode.connect(this._splitter);

			// Connect each channel to its corresponding output
			this._splitter.connect(this.outputs.x.input, 0); // X channel
			this._splitter.connect(this.outputs.y.input, 1); // Y channel
			this._splitter.connect(this.outputs.r.input, 2); // R channel
			this._splitter.connect(this.outputs.g.input, 3); // G channel
			this._splitter.connect(this.outputs.b.input, 4); // B channel

			// Send initial configuration
			this._workletNode.port.postMessage({
				type: 'scanRate',
				data: this._scanRate,
			});
			this._workletNode.port.postMessage({
				type: 'smoothing',
				data: this._smoothing,
			});

			this._isReady = true;
			this._resolveReady();

			if (this._debug) {
				console.log('✅ XYRGBInterpolatorNode initialized successfully');
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
		if (this._workletNode && this._isReady) {
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
		if (this._workletNode && this._isReady) {
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
		this._vertices = [...vertices];

		if (this._workletNode && this._isReady) {
			this._workletNode.port.postMessage({
				type: 'vertices',
				data: this._vertices,
			});

			if (this._debug) {
				// console.log(`🔄 Updated vertices: ${vertices.length} vertices`);
			}
		}

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
	 * Set smoothing factor
	 */
	setSmoothing(value: number): this {
		this._smoothing = Math.max(0, Math.min(1, value));

		if (this._workletNode && this._isReady) {
			const param = this._workletNode.parameters.get('smoothing');
			if (param) {
				param.setValueAtTime(this._smoothing, Tone.getContext().currentTime);
			}

			this._workletNode.port.postMessage({
				type: 'smoothing',
				data: this._smoothing,
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

	get smoothing(): number {
		return this._smoothing;
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

	set smoothing(value: number) {
		this.setSmoothing(value);
	}

	/**
	 * Connect a specific channel to another node
	 */
	connectChannel(
		channel: 'x' | 'y' | 'r' | 'g' | 'b',
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
	}): this {
		if (destinations.x) this.outputs.x.connect(destinations.x);
		if (destinations.y) this.outputs.y.connect(destinations.y);
		if (destinations.r) this.outputs.r.connect(destinations.r);
		if (destinations.g) this.outputs.g.connect(destinations.g);
		if (destinations.b) this.outputs.b.connect(destinations.b);
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
	 */
	dispose(): this {
		if (this._isPlaying) {
			this.stop();
		}

		if (this._workletNode) {
			this._workletNode.disconnect();
			this._workletNode = null;
		}

		if (this._splitter) {
			this._splitter.disconnect();
			this._splitter = null;
		}

		Object.values(this.outputs).forEach((output) => output.dispose());

		if (this._debug) {
			console.log('🧹 ReactoscopeProcessorNode disposed');
		}

		return this;
	}
}
