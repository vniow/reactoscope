/**
 * WorkletGlobalScope - Registry system for managing AudioWorklet shared code
 *
 * AudioWorklets must be written in JavaScript and be registered within the AudioWorkletNode global scope.
 * This system manages the compilation and registration of worklet processors for use in Reactoscope.
 */

import type { WorkletRegistry } from './WorkletTypes';

/**
 * Registry to track different types of worklet code
 */
const workletRegistry: WorkletRegistry = {
	baseClasses: new Set<string>(),
	processors: new Set<string>(),
	utilities: new Set<string>(),
	registrations: new Map<string, string>(),
};

/**
 * Add base class code to the worklet global scope
 *
 * @param classCode - The class code to add (should be a class definition)
 */
export function addBaseClass(classCode: string): void {
	workletRegistry.baseClasses.add(classCode);
}

/**
 * Add utility code to the worklet global scope
 *
 * @param utilityCode - The utility code to add (functions, constants, etc.)
 */
export function addUtility(utilityCode: string): void {
	workletRegistry.utilities.add(utilityCode);
}

/**
 * Add processor implementation to the worklet global scope
 *
 * @param processorCode - The processor implementation code
 */
export function addProcessor(processorCode: string): void {
	workletRegistry.processors.add(processorCode);
}

/**
 * Register an AudioWorklet processor with the global scope
 *
 * This creates the registerProcessor call to register the processor
 * with the AudioWorklet processing context.
 *
 * @param name - The name to register the processor with
 * @param classDesc - JavaScript class as a string
 * @throws Error if a processor with the given name is already registered
 */
export function registerProcessor(name: string, classDesc: string): void {
	if (workletRegistry.registrations.has(name)) {
		throw new Error(`AudioWorklet processor "${name}" is already registered`);
	}

	const processor = /* javascript */ `registerProcessor("${name}", ${classDesc})`;
	workletRegistry.registrations.set(name, processor);
}

/**
 * Get the complete JavaScript code for the worklet global scope in the correct load order
 *
 * @param debug - Include debug statements in the generated code
 * @returns The complete worklet code as a string
 */
export function getWorkletGlobalScope(debug: boolean = false): string {
	const parts: string[] = [];

	// Add debug header if requested
	if (debug) {
		parts.push(
			`/* AudioWorklet Global Scope - Generated ${new Date().toISOString()} */`
		);
		parts.push(
			`console.log("🎛️ AudioWorklet global scope initializing with ${workletRegistry.registrations.size} processors");`
		);
	}

	// Load order is important:
	// 1. Base classes first (dependencies)
	workletRegistry.baseClasses.forEach((baseClass) => parts.push(baseClass));

	// 2. Utility functions
	workletRegistry.utilities.forEach((utility) => parts.push(utility));

	// 3. Processor implementations
	workletRegistry.processors.forEach((processor) => parts.push(processor));

	// 4. Finally, processor registrations
	workletRegistry.registrations.forEach((registration) =>
		parts.push(registration)
	);

	return parts.join('\n\n');
}

/**
 * Check if a processor is registered
 *
 * @param name - Name of the processor to check
 * @returns True if the processor is registered
 */
export function isProcessorRegistered(name: string): boolean {
	return workletRegistry.registrations.has(name);
}

/**
 * Get a list of all registered processor names
 *
 * @returns Array of registered processor names
 */
export function getRegisteredProcessors(): string[] {
	return Array.from(workletRegistry.registrations.keys());
}

/**
 * Get worklet registry statistics
 *
 * @returns Object with counts of registered components
 */
export function getRegistryStats() {
	return {
		baseClasses: workletRegistry.baseClasses.size,
		processors: workletRegistry.processors.size,
		utilities: workletRegistry.utilities.size,
		registrations: workletRegistry.registrations.size,
	};
}

/**
 * Reset the worklet registry - primarily for testing purposes
 */
export function resetWorkletRegistry(): void {
	workletRegistry.baseClasses.clear();
	workletRegistry.processors.clear();
	workletRegistry.utilities.clear();
	workletRegistry.registrations.clear();
}

/**
 * Create a blob URL for the worklet global scope
 *
 * @param debug - Include debug information
 * @returns Blob URL for the worklet code
 */
export function createWorkletBlobUrl(debug: boolean = false): string {
	const workletCode = getWorkletGlobalScope(debug);
	const blob = new Blob([workletCode], { type: 'text/javascript' });
	return URL.createObjectURL(blob);
}
