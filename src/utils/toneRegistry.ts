import * as Tone from 'tone';

/**
 * Centralized registry for Tone.js instances
 * Provides a singleton pattern for managing audio node instances
 */

export type ToneInstanceType = Tone.ToneAudioNode;

class ToneRegistry {
	private instances: Map<string, ToneInstanceType> = new Map();
	private static instance: ToneRegistry;

	private constructor() {
		// Singleton pattern
		// Also attach to window for debugging
		(window as unknown as { toneRegistry?: ToneRegistry }).toneRegistry = this;
	}

	static getInstance(): ToneRegistry {
		if (!ToneRegistry.instance) {
			ToneRegistry.instance = new ToneRegistry();
		}
		return ToneRegistry.instance;
	}

	/**
	 * Register a Tone.js instance
	 */
	register(key: string, instance: ToneInstanceType): void {
		this.instances.set(key, instance);
	}

	/**
	 * Unregister a Tone.js instance
	 */
	unregister(key: string): void {
		this.instances.delete(key);
	}

	/**
	 * Get a Tone.js instance by key
	 */
	get(key: string): ToneInstanceType | undefined {
		return this.instances.get(key);
	}

	/**
	 * Get all registered keys
	 */
	getKeys(): string[] {
		return Array.from(this.instances.keys());
	}

	/**
	 * Get the size of the registry
	 */
	size(): number {
		return this.instances.size;
	}

	/**
	 * Clear all instances (for cleanup)
	 */
	clear(): void {
		this.instances.clear();
	}

	/**
	 * Debug function to print current state (for development use)
	 */
	debug(): void {
		// Debug information available in development mode
		if (process.env.NODE_ENV === 'development') {
			console.log('ToneRegistry Debug:', {
				size: this.instances.size,
				keys: this.getKeys(),
				instances: Array.from(this.instances.entries()).map(
					([key, instance]) => ({
						key,
						type: instance.constructor.name,
						disposed:
							(instance as unknown as { _disposed?: boolean })._disposed ||
							false,
					})
				),
			});
		}
	}
}

// Export singleton instance
export const toneRegistry = ToneRegistry.getInstance();

// Add global debug function
(
	window as unknown as { debugToneRegistry?: () => ToneRegistry }
).debugToneRegistry = () => {
	toneRegistry.debug();
	return toneRegistry;
};
