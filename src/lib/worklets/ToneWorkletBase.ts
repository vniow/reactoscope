/**
 * ToneWorkletBase - Base class for AudioWorklet integration with Tone.js
 *
 * This class extends Tone.ToneAudioNode to provide a wrapper around AudioWorklet functionality,
 * making it compatible with the existing Tone.js ecosystem in Reactoscope.
 */

import * as Tone from 'tone';
import { createWorkletBlobUrl } from './WorkletGlobalScope';
import type {
	WorkletBaseOptions,
	WorkletErrorHandler,
	WorkletState,
} from './WorkletTypes';

/**
 * Default no-op error handler for worklet processor errors
 */
const defaultErrorHandler: WorkletErrorHandler = () => {
	// Errors are handled by subclasses if needed
};

/**
 * Abstract base class for AudioWorklet integration with Tone.js
 *
 * @template Options - Configuration options type for the node
 */
export abstract class ToneWorkletBase<
	Options extends WorkletBaseOptions,
> extends Tone.ToneAudioNode<Options> {
	readonly name: string = 'ToneWorkletBase';

	/**
	 * The AudioWorkletNode instance
	 */
	protected _worklet!: AudioWorkletNode;

	/**
	 * Dummy gain node for parameter management
	 */
	private _dummyGain: GainNode;

	/**
	 * Dummy parameter for Tone.js parameter compatibility
	 */
	protected _dummyParam: AudioParam;

	/**
	 * Options for the AudioWorkletNode
	 */
	protected workletOptions: Partial<AudioWorkletNodeOptions> = {};

	/**
	 * Handler for AudioWorklet processor errors
	 */
	onprocessorerror: WorkletErrorHandler = defaultErrorHandler;

	/**
	 * Current worklet state
	 */
	private _workletState: WorkletState = {
		isInitialized: false,
		isReady: false,
	};

	/**
	 * Promise that resolves when worklet is ready
	 */
	private _workletReadyPromise: Promise<void>;
	private _workletReadyResolve!: () => void;
	private _workletReadyReject!: (err: Error) => void;

	/**
	 * Abstract method to provide the name of the AudioWorklet processor
	 * Must be implemented by subclasses
	 */
	protected abstract _audioWorkletName(): string;

	/**
	 * Called when the AudioWorkletNode is successfully created
	 * Use this to connect parameters and set up routing
	 * Must be implemented by subclasses
	 *
	 * @param node - The newly created AudioWorkletNode
	 */
	protected abstract onReady(node: AudioWorkletNode): void;

	/**
	 * Create a new ToneWorkletBase instance
	 *
	 * @param options - Configuration options
	 */
	constructor(options: Options) {
		super(options);

		// Set up worklet options if provided
		if (options.workletOptions) {
			this.workletOptions = options.workletOptions;
		}

		// Enable debug mode if specified
		if (options.debug) {
			this.debug = true;
		}

		// Create dummy gain node for parameter management
		this._dummyGain = this.context.createGain();
		this._dummyParam = this._dummyGain.gain;

		// Create promise for worklet readiness
		this._workletReadyPromise = new Promise<void>((resolve, reject) => {
			this._workletReadyResolve = resolve;
			this._workletReadyReject = reject;
		});

		// Initialize the worklet module
		this._initWorklet();
	}

	/**
	 * Initialize the AudioWorklet module and create the node
	 */
	private _initWorklet(): void {
		const workletName = this._audioWorkletName();

		if (this.debug) {
			console.log(`🔍 Initializing AudioWorklet: ${workletName}`);
		}

		// Create blob URL for the worklet code
		const blobUrl = createWorkletBlobUrl(this.debug);

		// Register the processor
		this.context
			.addAudioWorkletModule(blobUrl)
			.then(() => {
				// Create the worklet when it's ready
				if (!this.disposed) {
					try {
						this._worklet = this.context.createAudioWorkletNode(
							workletName,
							this.workletOptions
						);

						// Set up error handling
						this._worklet.onprocessorerror = (e: ErrorEvent) => {
							if (this.debug) {
								console.error(
									`⚠️ AudioWorklet processor error in ${workletName}:`,
									e
								);
							}
							this._workletState.error = new Error(
								`Worklet processor error: ${e.message}`
							);
							this.onprocessorerror(e);
						};

						// Call subclass setup
						this.onReady(this._worklet);

						// Update state
						this._workletState.isInitialized = true;
						this._workletState.isReady = true;
						this._workletReadyResolve();

						if (this.debug) {
							console.log(`✅ AudioWorklet node ready: ${workletName}`);
						}
					} catch (err) {
						const error = err instanceof Error ? err : new Error(String(err));
						this._workletState.error = error;

						if (this.debug) {
							console.error(
								`❌ Failed to create AudioWorklet node ${workletName}:`,
								error
							);
						}
						this._workletReadyReject(error);
					}
				}
			})
			.catch((err) => {
				const error = err instanceof Error ? err : new Error(String(err));
				this._workletState.error = error;

				if (this.debug) {
					console.error(
						`❌ Failed to add AudioWorklet module ${workletName}:`,
						error
					);
				}
				this._workletReadyReject(error);
			})
			.finally(() => {
				// Clean up the blob URL
				URL.revokeObjectURL(blobUrl);
			});
	}

	/**
	 * Get a promise that resolves when the worklet is initialized and ready
	 */
	get ready(): Promise<void> {
		return this._workletReadyPromise;
	}

	/**
	 * Check if the worklet is ready
	 */
	get isReady(): boolean {
		return this._workletState.isReady;
	}

	/**
	 * Check if the worklet is initialized
	 */
	get isInitialized(): boolean {
		return this._workletState.isInitialized;
	}

	/**
	 * Get the current worklet state
	 */
	get workletState(): WorkletState {
		return { ...this._workletState };
	}

	/**
	 * Get the underlying AudioWorkletNode (if ready)
	 */
	get workletNode(): AudioWorkletNode | null {
		return this._worklet || null;
	}

	/**
	 * Send a message to the worklet processor
	 *
	 * @param message - Message to send to the worklet
	 */
	protected postMessage(message: Record<string, unknown>): void {
		if (this._worklet && this.isReady) {
			this._worklet.port.postMessage(message);
		} else if (this.debug) {
			console.warn(
				`⚠️ Cannot post message to worklet ${this._audioWorkletName()}: not ready`
			);
		}
	}

	/**
	 * Clean up and release resources
	 */
	dispose(): this {
		if (this.debug) {
			console.log(`🧹 Disposing ${this.name} worklet`);
		}

		super.dispose();

		// Clean up dummy gain
		this._dummyGain.disconnect();

		// Clean up worklet
		if (this._worklet) {
			this._worklet.port.postMessage({ type: 'dispose' });
			this._worklet.disconnect();
		}

		// Reset state
		this._workletState = {
			isInitialized: false,
			isReady: false,
		};

		return this;
	}

	/**
	 * Get default options for ToneWorkletBase
	 */
	static getDefaults(): WorkletBaseOptions {
		return Object.assign(Tone.ToneAudioNode.getDefaults(), {
			debug: false,
		});
	}
}
