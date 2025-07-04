/**
 * Enhanced base class extending the existing ToneAudioWorklet
 *
 * Key improvements:
 * - Automatic worklet registration via registry
 * - Parameter mapping with type safety
 * - Integration with existing node parameter system
 * - Promise-based readiness handling
 * - Proper disposal and cleanup
 */

import * as Tone from 'tone';
import { WorkletRegistry } from './WorkletRegistry';
import type { AudioNodeType } from '../types';

/**
 * Options interface for ReactoscopeWorkletBase
 */
export interface ReactoscopeWorkletOptions extends Tone.ToneAudioNodeOptions {
	nodeType: AudioNodeType; // Links to existing type system
	numberOfInputs?: number;
	numberOfOutputs?: number;
	workletOptions?: AudioWorkletNodeOptions;
	parameters?: Record<string, number | string | boolean>;
	debug?: boolean;
}

/**
 * Enhanced base class for Reactoscope audio worklets
 *
 * @template Options - Configuration options type extending ReactoscopeWorkletOptions
 */
export abstract class ReactoscopeWorkletBase<
	Options extends ReactoscopeWorkletOptions,
> extends Tone.ToneAudioNode<Options> {
	readonly name: string = 'ReactoscopeWorkletBase';

	/**
	 * The underlying AudioWorkletNode instance
	 */
	protected _worklet!: AudioWorkletNode;

	/**
	 * The options passed to the constructor
	 */
	readonly options: Options;

	/**
	 * Parameter management - maps parameter names to Tone.Param instances
	 */
	protected parameters: Map<string, Tone.Param<Tone.Unit.UnitName>> = new Map();

	/**
	 * Readiness tracking
	 */
	private _workletReady: boolean = false;
	private _workletReadyPromise: Promise<void>;
	private _workletReadyResolve!: () => void;
	private _workletReadyReject!: (error: Error) => void;

	/**
	 * Debug mode flag
	 */
	public debug: boolean = false;

	/**
	 * Abstract methods for subclasses to implement
	 */
	protected abstract getProcessorName(): string;
	protected abstract onWorkletReady(worklet: AudioWorkletNode): void;

	constructor(options: Options) {
		super(options);

		this.options = options;
		this.debug = options.debug || false;

		// Create promise for worklet readiness
		this._workletReadyPromise = new Promise<void>((resolve, reject) => {
			this._workletReadyResolve = resolve;
			this._workletReadyReject = reject;
		});

		// Initialize worklet after construction
		this._initializeWorklet();
	}

	/**
	 * Ensure worklet registry is set up and register with AudioContext
	 */
	private static async ensureWorkletRegistered(): Promise<void> {
		const registry = WorkletRegistry.getInstance();
		await registry.registerWithAudioContext(Tone.getContext() as Tone.Context);
	}

	/**
	 * Initialize the worklet node
	 */
	private async _initializeWorklet(): Promise<void> {
		try {
			// Ensure worklets are registered with the AudioContext
			await ReactoscopeWorkletBase.ensureWorkletRegistered();

			if (this.debug) {
				console.log(`🎛️ Creating worklet node: ${this.getProcessorName()}`);
			}

			// Create the worklet node
			this._createWorkletNode();

			// Set up error handling
			this._worklet.onprocessorerror = (event: ErrorEvent) => {
				console.error(
					`❌ Worklet processor error in ${this.getProcessorName()}:`,
					event
				);
				this.onprocessorerror(event);
			};

			// Call the ready callback
			this.onWorkletReady(this._worklet);

			// Mark as ready
			this._workletReady = true;
			this._workletReadyResolve();

			if (this.debug) {
				console.log(`✅ Worklet node ready: ${this.getProcessorName()}`);
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			if (this.debug) {
				console.error(
					`❌ Failed to initialize worklet ${this.getProcessorName()}:`,
					err
				);
			}
			this._workletReadyReject(err);
		}
	}

	/**
	 * Create the AudioWorkletNode instance
	 */
	private _createWorkletNode(): void {
		const processorName = this.getProcessorName();

		// Use Tone.js context method instead of direct AudioWorkletNode constructor
		// This ensures proper AudioContext handling
		this._worklet = this.context.createAudioWorkletNode(processorName, {
			numberOfInputs: this.options.numberOfInputs ?? 1,
			numberOfOutputs: this.options.numberOfOutputs ?? 1,
			processorOptions: {
				debug: this.debug,
			},
			...this.options.workletOptions,
		});

		// Set up message port handling
		this._worklet.port.onmessage = (event: MessageEvent) => {
			this._handleWorkletMessage(event);
		};
	}

	/**
	 * Handle messages from the worklet processor
	 */
	private _handleWorkletMessage(event: MessageEvent): void {
		const { type, data } = event.data;

		switch (type) {
			case 'performance':
				if (this.debug) {
					console.log(`🔍 ${this.getProcessorName()} performance:`, data);
				}
				break;
			case 'error':
				console.error(`❌ ${this.getProcessorName()} error:`, data);
				break;
			default:
				// Allow subclasses to handle custom messages
				this.onWorkletMessage(event);
		}
	}

	/**
	 * Override in subclasses to handle custom worklet messages
	 */
	protected onWorkletMessage(event: MessageEvent): void {
		// Default implementation does nothing
		if (this.debug) {
			console.log(`📬 ${this.getProcessorName()} message:`, event.data);
		}
	}

	/**
	 * Override in subclasses to handle processor errors
	 */
	protected onprocessorerror(event: ErrorEvent): void {
		// Default implementation logs the error
		console.error(`Processor error in ${this.name}:`, event);
	}

	/**
	 * Create a Tone.js parameter with proper configuration
	 *
	 * @param name - parameter name
	 * @param initialValue - initial parameter value
	 * @param units - Tone.js unit type
	 * @param min - minimum value
	 * @param max - maximum value
	 * @returns configured Tone.Param
	 */
	protected createParameter<T extends Tone.Unit.UnitName>(
		name: string,
		initialValue: number,
		units: T,
		min?: number,
		max?: number
	): Tone.Param<T> {
		const param = new Tone.Param<T>({
			context: this.context,
			value: initialValue,
			units: units,
			minValue: min,
			maxValue: max,
			param: this.context.createGain().gain, // Dummy AudioParam initially
			swappable: true,
		});

		this.parameters.set(name, param);
		return param;
	}

	/**
	 * Map a Tone.js parameter to an AudioWorklet parameter
	 *
	 * @param paramName - parameter name
	 * @param toneParam - Tone.js parameter instance
	 * @param workletParam - AudioWorklet AudioParam
	 */
	protected mapParameterToWorklet(
		paramName: string,
		toneParam: Tone.Param<Tone.Unit.UnitName>,
		workletParam: AudioParam
	): void {
		if (!workletParam) {
			console.warn(`⚠️ AudioWorklet parameter '${paramName}' not found`);
			return;
		}

		// Use Tone.js setParam to connect the parameter
		toneParam.setParam(workletParam);

		if (this.debug) {
			console.log(`🔗 Mapped parameter '${paramName}' to worklet`);
		}
	}

	/**
	 * Send a message to the worklet processor
	 *
	 * @param message - message to send
	 */
	protected sendMessageToWorklet(message: unknown): void {
		if (this._worklet && this._worklet.port) {
			this._worklet.port.postMessage(message);
		}
	}

	/**
	 * Promise that resolves when the worklet is ready
	 */
	get ready(): Promise<void> {
		return this._workletReadyPromise;
	}

	/**
	 * Check if the worklet is ready
	 */
	get isReady(): boolean {
		return this._workletReady;
	}

	/**
	 * Clean up and dispose of resources
	 */
	dispose(): this {
		if (this.debug) {
			console.log(`🧹 Disposing ${this.name} worklet`);
		}

		// Dispose all parameters
		this.parameters.forEach((param) => param.dispose());
		this.parameters.clear();

		// Send dispose message to worklet
		if (this._worklet && this._worklet.port) {
			this._worklet.port.postMessage('dispose');
		}

		// Call parent dispose
		super.dispose();

		return this;
	}

	/**
	 * Get default options for ReactoscopeWorkletBase
	 */
	static getDefaults(): ReactoscopeWorkletOptions {
		return Object.assign(Tone.ToneAudioNode.getDefaults(), {
			nodeType: 'gain' as AudioNodeType, // Default type
			debug: false,
			numberOfInputs: 1,
			numberOfOutputs: 1,
		});
	}
}
