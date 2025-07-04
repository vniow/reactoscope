/**
 * Enhanced WorkletRegistry for Reactoscope
 *
 * Builds upon tone-audioworklet-demo patterns with Reactoscope-specific features:
 * - Integration with existing audio node types
 * - Support for multi-channel processors
 * - Debug logging aligned with project patterns
 * - TypeScript-first design
 */

import * as Tone from 'tone';
import type { AudioNodeType } from '../types';

/**
 * Registry entry for a worklet processor
 */
export interface WorkletRegistration {
	name: string;
	classCode: string;
	nodeType: AudioNodeType;
	parameterDescriptors: {
		name: string;
		defaultValue: number;
		minValue?: number;
		maxValue?: number;
		automationRate?: 'a-rate' | 'k-rate';
		description?: string;
	}[];
	channels: { inputs: number; outputs: number };
	description?: string;
}

/**
 * Internal registry structure
 */
interface ReactoscopeWorkletRegistry {
	baseClasses: Set<string>;
	processors: Set<string>;
	utilities: Set<string>;
	registrations: Map<string, WorkletRegistration>;
}

/**
 * Singleton WorkletRegistry for managing AudioWorklet code compilation and registration
 */
export class WorkletRegistry {
	private static instance: WorkletRegistry;
	private registry: ReactoscopeWorkletRegistry;
	private compiledCode: string | null = null;
	private isRegistered = false;
	private registrationPromise: Promise<void> | null = null;

	private constructor() {
		this.registry = {
			baseClasses: new Set<string>(),
			processors: new Set<string>(),
			utilities: new Set<string>(),
			registrations: new Map<string, WorkletRegistration>(),
		};
	}

	/**
	 * Get the singleton instance
	 */
	static getInstance(): WorkletRegistry {
		if (!WorkletRegistry.instance) {
			WorkletRegistry.instance = new WorkletRegistry();
		}
		return WorkletRegistry.instance;
	}

	/**
	 * Add base class code to the worklet global scope
	 *
	 * @param classCode - the class code to add (should be a class definition)
	 */
	addBaseClass(classCode: string): void {
		this.registry.baseClasses.add(classCode);
		this.invalidateCompiledCode();
	}

	/**
	 * Add utility code to the worklet global scope
	 *
	 * @param utilityCode - the utility code to add (functions, constants, etc.)
	 */
	addUtility(utilityCode: string): void {
		this.registry.utilities.add(utilityCode);
		this.invalidateCompiledCode();
	}

	/**
	 * Register a worklet processor
	 *
	 * @param registration - processor registration details
	 * @throws error if a processor with the given name is already registered
	 */
	registerProcessor(registration: WorkletRegistration): void {
		if (this.registry.registrations.has(registration.name)) {
			throw new Error(
				`AudioWorklet processor "${registration.name}" is already registered`
			);
		}

		// Add the processor class code
		this.registry.processors.add(registration.classCode);

		// Create the registerProcessor call
		const processorRegistration = `registerProcessor("${registration.name}", ${registration.classCode.match(/class\s+(\w+)/)?.[1] || 'UnknownProcessor'})`;

		// Store the full registration
		this.registry.registrations.set(registration.name, {
			...registration,
			classCode: processorRegistration,
		});

		this.invalidateCompiledCode();
	}

	/**
	 * Get the complete JavaScript code for the worklet global scope
	 *
	 * @param debug - includes debug statements in the generated code
	 * @returns the complete worklet code as a string
	 */
	getCompiledWorkletCode(debug: boolean = false): string {
		if (this.compiledCode) {
			return this.compiledCode;
		}

		const parts: string[] = [];

		// Add debug header if requested
		if (debug) {
			parts.push(
				`/* Reactoscope AudioWorklet Global Scope - Generated ${new Date().toISOString()} */`
			);
			parts.push(
				`console.log("🎛️ Reactoscope AudioWorklet global scope initializing with ${this.registry.registrations.size} processors");`
			);
		}

		// Add base classes first (order matters for inheritance)
		this.registry.baseClasses.forEach((baseClass) => parts.push(baseClass));

		// Add utility functions
		this.registry.utilities.forEach((utility) => parts.push(utility));

		// Add processor implementations
		this.registry.processors.forEach((processor) => parts.push(processor));

		// Finally add processor registrations
		this.registry.registrations.forEach((registration) =>
			parts.push(registration.classCode)
		);

		this.compiledCode = parts.join('\n\n');
		return this.compiledCode;
	}

	/**
	 * Register the compiled worklet code with an AudioContext
	 *
	 * @param context - Tone.js context to register with
	 * @returns Promise that resolves when registration is complete
	 */
	async registerWithAudioContext(context: Tone.Context): Promise<void> {
		// Return existing promise if registration is in progress
		if (this.registrationPromise) {
			return this.registrationPromise;
		}

		// Return immediately if already registered
		if (this.isRegistered) {
			return Promise.resolve();
		}

		this.registrationPromise = this._performRegistration(context);
		return this.registrationPromise;
	}

	/**
	 * Internal method to perform worklet registration
	 */
	private async _performRegistration(context: Tone.Context): Promise<void> {
		try {
			const workletCode = this.getCompiledWorkletCode(true); // Enable debug for development
			const blob = new Blob([workletCode], { type: 'text/javascript' });
			const blobUrl = URL.createObjectURL(blob);

			console.log('🎛️ Registering Reactoscope AudioWorklet module...');

			await context.addAudioWorkletModule(blobUrl);

			this.isRegistered = true;
			console.log(
				`✅ AudioWorklet module registered with ${this.registry.registrations.size} processors`
			);

			// Clean up blob URL
			URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error('❌ Failed to register AudioWorklet module:', error);
			this.registrationPromise = null; // Allow retry
			throw error;
		}
	}

	/**
	 * Check if a processor is registered
	 *
	 * @param name - name of the processor to check
	 * @returns true if the processor is registered
	 */
	isProcessorRegistered(name: string): boolean {
		return this.registry.registrations.has(name);
	}

	/**
	 * Get processor registration info
	 *
	 * @param name - name of the processor
	 * @returns processor registration or undefined
	 */
	getProcessorInfo(name: string): WorkletRegistration | undefined {
		return this.registry.registrations.get(name);
	}

	/**
	 * Get all processors for a specific node type
	 *
	 * @param nodeType - audio node type to filter by
	 * @returns array of processor registrations
	 */
	getProcessorsByNodeType(nodeType: AudioNodeType): WorkletRegistration[] {
		return Array.from(this.registry.registrations.values()).filter(
			(reg) => reg.nodeType === nodeType
		);
	}

	/**
	 * Get a list of all registered processor names
	 *
	 * @returns array of registered processor names
	 */
	getRegisteredProcessors(): string[] {
		return Array.from(this.registry.registrations.keys());
	}

	/**
	 * Reset the worklet registry - primarily for testing purposes
	 */
	resetRegistry(): void {
		this.registry.baseClasses.clear();
		this.registry.processors.clear();
		this.registry.utilities.clear();
		this.registry.registrations.clear();
		this.invalidateCompiledCode();
		this.isRegistered = false;
		this.registrationPromise = null;
	}

	/**
	 * Invalidate the compiled code cache
	 */
	private invalidateCompiledCode(): void {
		this.compiledCode = null;
		this.isRegistered = false;
		this.registrationPromise = null;
	}

	/**
	 * Get registry statistics for debugging
	 */
	getStats() {
		return {
			baseClasses: this.registry.baseClasses.size,
			processors: this.registry.processors.size,
			utilities: this.registry.utilities.size,
			registrations: this.registry.registrations.size,
			isRegistered: this.isRegistered,
			compiledCodeLength: this.compiledCode?.length || 0,
		};
	}
}

/**
 * Convenience functions for global registry access
 */

/**
 * Add base class code to the global registry
 */
export function addBaseClass(classCode: string): void {
	WorkletRegistry.getInstance().addBaseClass(classCode);
}

/**
 * Add utility code to the global registry
 */
export function addUtility(utilityCode: string): void {
	WorkletRegistry.getInstance().addUtility(utilityCode);
}

/**
 * Register a processor with the global registry
 */
export function registerProcessor(registration: WorkletRegistration): void {
	WorkletRegistry.getInstance().registerProcessor(registration);
}

/**
 * Check if a processor is registered in the global registry
 */
export function isProcessorRegistered(name: string): boolean {
	return WorkletRegistry.getInstance().isProcessorRegistered(name);
}

/**
 * Get all registered processor names from the global registry
 */
export function getRegisteredProcessors(): string[] {
	return WorkletRegistry.getInstance().getRegisteredProcessors();
}
