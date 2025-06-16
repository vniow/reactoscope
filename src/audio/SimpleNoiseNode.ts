/**
 * SimpleNoiseNode - Direct Tone.js integration with AudioWorklet
 *
 * This node directly extends Tone.ToneAudioNode and manages an AudioWorkletNode
 * without complex base classes or abstractions.
 */

import * as Tone from 'tone';

export interface SimpleNoiseNodeOptions extends Tone.ToneAudioNodeOptions {
	volume?: number;
	autostart?: boolean;
}

export class SimpleNoiseNode extends Tone.ToneAudioNode<SimpleNoiseNodeOptions> {
	readonly name = 'SimpleNoiseNode';

	// This is a source node, so no input
	readonly input: undefined = undefined;

	// Output gain node for connecting to other nodes
	readonly output: Tone.Gain;

	// Volume parameter (Tone.js style)
	readonly volume: Tone.Param<'normalRange'>;

	// The underlying AudioWorkletNode
	private _workletNode?: AudioWorkletNode;
	private _isReady = false;
	private _isPlaying = false;
	private _readyPromise: Promise<void>;

	constructor(options: Partial<SimpleNoiseNodeOptions> = {}) {
		super(options);

		// Create output gain node
		this.output = new Tone.Gain({
			context: this.context,
			gain: 1,
		});

		// Create volume parameter
		this.volume = new Tone.Param({
			context: this.context,
			value: options.volume ?? 0.5,
			units: 'normalRange',
		});

		// Initialize the worklet
		this._readyPromise = this._initializeWorklet();

		// Auto-start if requested
		if (options.autostart) {
			this._readyPromise.then(() => this.start());
		}
	}

	private async _initializeWorklet(): Promise<void> {
		try {
			// Get the raw AudioContext from Tone
			const audioContext = this.context.rawContext;

			// Define the processor code inline
			const processorCode = `
        class SimpleNoiseProcessor extends AudioWorkletProcessor {
          static get parameterDescriptors() {
            return [
              {
                name: 'volume',
                defaultValue: 0.5,
                minValue: 0.0,
                maxValue: 1.0,
                automationRate: 'a-rate'
              },
              {
                name: 'isPlaying',
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
                automationRate: 'k-rate'
              }
            ];
          }

          constructor() {
            super();
            this.isPlaying = false;
            
            // Listen for messages from the main thread
            this.port.onmessage = (event) => {
              const { type, data } = event.data;
              
              switch (type) {
                case 'start':
                  this.isPlaying = true;
                  break;
                case 'stop':
                  this.isPlaying = false;
                  break;
                case 'dispose':
                  // Clean up if needed
                  break;
              }
            };
          }

          process(inputs, outputs, parameters) {
            const output = outputs[0];
            const volumeParam = parameters.volume;
            const isPlayingParam = parameters.isPlaying;
            
            // Check if we should be playing
            const shouldPlay = this.isPlaying || isPlayingParam[0] > 0.5;
            
            if (!shouldPlay) {
              // Output silence when not playing
              for (let channel = 0; channel < output.length; channel++) {
                output[channel].fill(0);
              }
              return true;
            }

            // Generate white noise for each channel
            for (let channel = 0; channel < output.length; channel++) {
              const outputChannel = output[channel];
              
              for (let i = 0; i < outputChannel.length; i++) {
                // Generate white noise (-1 to 1)
                const noise = (Math.random() * 2) - 1;
                
                // Apply volume (support per-sample automation)
                const volume = volumeParam.length > 1 ? volumeParam[i] : volumeParam[0];
                
                outputChannel[i] = noise * volume;
              }
            }

            return true;
          }
        }

        // Register the processor
        registerProcessor('simple-noise-processor', SimpleNoiseProcessor);
      `;

			// Create a blob URL for the processor code
			const blob = new Blob([processorCode], {
				type: 'application/javascript',
			});
			const blobUrl = URL.createObjectURL(blob);

			// Add the worklet module
			await audioContext.audioWorklet.addModule(blobUrl);

			// Clean up blob URL
			URL.revokeObjectURL(blobUrl);

			// Create the AudioWorkletNode
			this._workletNode = new AudioWorkletNode(
				audioContext,
				'simple-noise-processor',
				{
					numberOfInputs: 0,
					numberOfOutputs: 1,
					outputChannelCount: [2],
				}
			);

			// Connect worklet to output
			this._workletNode.connect(this.output.input);

			// Set up parameter synchronization
			this._syncParameters();

			this._isReady = true;
			console.log('🔊 SimpleNoiseNode ready');
		} catch (error) {
			console.error('❌ Failed to initialize SimpleNoiseNode:', error);
			throw error;
		}
	}

	private _syncParameters(): void {
		if (!this._workletNode) return;

		// Initialize worklet parameters with current values
		const volumeParam = this._workletNode.parameters.get('volume');
		if (volumeParam) {
			volumeParam.value = this.volume.value;
		}
	}

	/**
	 * Start generating noise
	 */
	async start(): Promise<this> {
		await this._readyPromise;

		if (this._workletNode && !this._isPlaying) {
			// Make sure Tone.js context is started
			await Tone.start();

			// Send start message to worklet
			this._workletNode.port.postMessage({ type: 'start' });
			this._isPlaying = true;

			console.log('▶️ SimpleNoiseNode started');
		}

		return this;
	}

	/**
	 * Stop generating noise
	 */
	stop(): this {
		if (this._workletNode && this._isPlaying) {
			this._workletNode.port.postMessage({ type: 'stop' });
			this._isPlaying = false;

			console.log('⏹️ SimpleNoiseNode stopped');
		}

		return this;
	}

	/**
	 * Check if the node is ready
	 */
	get ready(): Promise<void> {
		return this._readyPromise;
	}

	/**
	 * Check if noise is currently playing
	 */
	get isPlaying(): boolean {
		return this._isPlaying;
	}

	/**
	 * Check if the worklet is ready
	 */
	get isReady(): boolean {
		return this._isReady;
	}

	/**
	 * Set volume level
	 */
	setVolume(value: number): this {
		this.volume.value = value;

		// Sync with worklet parameter
		if (this._workletNode) {
			const volumeParam = this._workletNode.parameters.get('volume');
			if (volumeParam) {
				volumeParam.value = value;
			}
		}

		return this;
	}

	/**
	 * Get default options
	 */
	static getDefaults(): SimpleNoiseNodeOptions {
		return Object.assign(Tone.ToneAudioNode.getDefaults(), {
			volume: 0.5,
			autostart: false,
		});
	}

	/**
	 * Clean up resources
	 */
	dispose(): this {
		if (this._isPlaying) {
			this.stop();
		}

		if (this._workletNode) {
			this._workletNode.port.postMessage({ type: 'dispose' });
			this._workletNode.disconnect();
		}

		this.volume.dispose();
		this.output.dispose();

		super.dispose();
		return this;
	}
}
