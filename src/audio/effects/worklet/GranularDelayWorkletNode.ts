/**
 * GranularDelay Worklet Node
 *
 * Tone.js-compatible wrapper for the GranularDelay worklet processor.
 * Provides a high-level interface for granular delay effects.
 *
 * TODO: Implement actual granular delay functionality
 */

import * as Tone from 'tone';
import { ReactoscopeWorkletBase } from '../../core/ReactoscopeWorkletBase';
import { workletName } from '../../worklets/processors/GranularDelay.worklet';
import type { ReactoscopeWorkletOptions } from '../../core/ReactoscopeWorkletBase';

/**
 * Configuration options for GranularDelay
 */
export interface GranularDelayOptions extends ReactoscopeWorkletOptions {
	/** Delay time in seconds */
	delayTime?: number;
	/** Feedback amount (0-0.95) */
	feedback?: number;
	/** Grain size in seconds */
	grainSize?: number;
	/** Grain density (grains per second) */
	grainDensity?: number;
	/** Pitch shift factor */
	pitch?: number;
	/** Wet/dry mix (0-1) */
	wet?: number;
}

/**
 * GranularDelay worklet node class
 *
 * Provides granular delay effects with pitch shifting and complex modulation.
 * This is currently a placeholder implementation.
 *
 * @example
 * ```typescript
 * const granularDelay = new GranularDelayWorkletNode({
 *   delayTime: 0.5,
 *   feedback: 0.3,
 *   grainSize: 0.1,
 *   grainDensity: 15,
 *   pitch: 1.2,
 *   wet: 0.6
 * });
 *
 * // Connect to audio graph
 * inputSource.connect(granularDelay).toDestination();
 *
 * // Animate parameters
 * granularDelay.delayTime.rampTo(1.0, 3);
 * granularDelay.pitch.rampTo(0.5, 2);
 * ```
 */
export class GranularDelayWorkletNode extends ReactoscopeWorkletBase<GranularDelayOptions> {
	readonly delayTime: Tone.Param<'time'>;
	readonly feedback: Tone.Param<'normalRange'>;
	readonly grainSize: Tone.Param<'time'>;
	readonly grainDensity: Tone.Param<'frequency'>;
	readonly pitch: Tone.Param<'positive'>;
	readonly wet: Tone.Param<'normalRange'>;

	constructor(options: Partial<GranularDelayOptions> = {}) {
		super({
			nodeType: 'granulardelay',
			workletName,
			workletUrl: '', // Will be set by WorkletRegistry
			context: options.context ?? Tone.getContext(),
			...options,
		});

		// Initialize parameters with proper Tone.Param types
		this.delayTime = this.createParameter(
			'delayTime',
			options.delayTime ?? 0.25,
			'time',
			0,
			2
		);

		this.feedback = this.createParameter(
			'feedback',
			options.feedback ?? 0.3,
			'normalRange',
			0,
			0.95
		);

		this.grainSize = this.createParameter(
			'grainSize',
			options.grainSize ?? 0.1,
			'time',
			0.01,
			0.5
		);

		this.grainDensity = this.createParameter(
			'grainDensity',
			options.grainDensity ?? 10,
			'frequency',
			1,
			50
		);

		this.pitch = this.createParameter(
			'pitch',
			options.pitch ?? 1,
			'positive',
			0.25,
			4
		);

		this.wet = this.createParameter(
			'wet',
			options.wet ?? 0.5,
			'normalRange',
			0,
			1
		);

		console.log('🎛️ GranularDelayWorkletNode created (placeholder)');
	}

	/**
	 * Get the worklet processor name
	 */
	protected getProcessorName(): string {
		return workletName;
	}

	/**
	 * Handle worklet ready state
	 */
	protected onWorkletReady(): void {
		console.log('✅ GranularDelay worklet ready');
	}

	/**
	 * Convenience method to set delay time
	 */
	setDelayTime(time: number): this {
		this.delayTime.value = time;
		return this;
	}

	/**
	 * Convenience method to set feedback
	 */
	setFeedback(feedback: number): this {
		this.feedback.value = feedback;
		return this;
	}

	/**
	 * Convenience method to set grain size
	 */
	setGrainSize(size: number): this {
		this.grainSize.value = size;
		return this;
	}

	/**
	 * Convenience method to set grain density
	 */
	setGrainDensity(density: number): this {
		this.grainDensity.value = density;
		return this;
	}

	/**
	 * Convenience method to set pitch shift
	 */
	setPitch(pitch: number): this {
		this.pitch.value = pitch;
		return this;
	}

	/**
	 * Convenience method to set wet/dry mix
	 */
	setWet(wet: number): this {
		this.wet.value = wet;
		return this;
	}

	/**
	 * Trigger granular texture change (placeholder)
	 */
	triggerGranulation(): this {
		// TODO: Implement when granular engine is ready
		console.log('🎹 triggerGranulation called (placeholder)');
		return this;
	}

	/**
	 * Freeze current grains (placeholder)
	 */
	freeze(shouldFreeze: boolean = true): this {
		// TODO: Implement when granular engine is ready
		console.log(`❄️ freeze(${shouldFreeze}) called (placeholder)`);
		return this;
	}

	/**
	 * Clean up resources
	 */
	dispose(): this {
		console.log('🧹 GranularDelayWorkletNode disposed');
		return super.dispose();
	}
}
