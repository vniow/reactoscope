// workletRegistry.ts
// Utility for tracking AudioWorklet module loading per AudioContext

/**
 * A registry of worklet module promises keyed by AudioContext.
 * The inner Map keys are worklet names (string) with their loading Promise.
 */
const workletRegistry = new WeakMap<AudioContext, Map<string, Promise<void>>>();

/**
 * Get or create the registry map for a given AudioContext.
 */
export function getWorkletRegistry(
	context: AudioContext
): Map<string, Promise<void>> {
	let registry = workletRegistry.get(context);
	if (!registry) {
		registry = new Map<string, Promise<void>>();
		workletRegistry.set(context, registry);
	}
	return registry;
}

/**
 * Ensure the worklet module is added to the context. Uses the registry to avoid duplicate loads.
 * @param context The AudioContext (raw) to register module on
 * @param name The worklet processor name identifier
 * @param url The URL of the worklet module
 */
export async function ensureWorkletModule(
	context: AudioContext,
	name: string,
	url: string
): Promise<void> {
	const registry = getWorkletRegistry(context);
	let promise = registry.get(name);
	if (!promise) {
		promise = context.audioWorklet.addModule(url);
		registry.set(name, promise);
	}
	return promise;
}
