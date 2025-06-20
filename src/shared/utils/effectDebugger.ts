/**
 * Effect Debugger - Global utility for tracking useEffect calls and detecting infinite loops
 */

let globalEffectCounter = 0;
const effectCallHistory: Array<{
	id: number;
	component: string;
	description: string;
	timestamp: number;
	stack?: string;
}> = [];

const MAX_HISTORY = 100;
const RAPID_FIRE_THRESHOLD = 50; // If more than 50 effects in 1 second, warn
const RAPID_FIRE_WINDOW = 1000; // 1 second

/**
 * Track a useEffect call and detect potential infinite loops
 */
export function trackEffect(
	component: string,
	description: string,
	includeStack = false
): number {
	globalEffectCounter++;
	const timestamp = Date.now();
	const id = globalEffectCounter;

	const entry = {
		id,
		component,
		description,
		timestamp,
		stack: includeStack
			? new Error().stack?.split('\n').slice(2, 6).join('\n')
			: undefined,
	};

	effectCallHistory.push(entry);

	// Keep history manageable
	if (effectCallHistory.length > MAX_HISTORY) {
		effectCallHistory.shift();
	}

	// Check for rapid-fire effects (potential infinite loop)
	const recentEffects = effectCallHistory.filter(
		(e) => timestamp - e.timestamp < RAPID_FIRE_WINDOW
	);

	if (recentEffects.length > RAPID_FIRE_THRESHOLD) {
		console.error(
			`🚨 POTENTIAL INFINITE LOOP DETECTED! ${recentEffects.length} effects in ${RAPID_FIRE_WINDOW}ms`,
			{
				recentEffects: recentEffects.slice(-10), // Show last 10
				totalEffects: globalEffectCounter,
				mostCommonComponent: getMostCommonComponent(recentEffects),
			}
		);
	}

	console.log(`🔍 [EFFECT-${id}] ${component} - ${description}`, {
		totalEffects: globalEffectCounter,
		recentCount: recentEffects.length,
	});

	return id;
}

/**
 * Find the most common component in recent effects
 */
function getMostCommonComponent(effects: typeof effectCallHistory): {
	component: string;
	count: number;
} {
	const counts = effects.reduce(
		(acc, effect) => {
			acc[effect.component] = (acc[effect.component] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);

	const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
	const [component, count] = sorted[0] || ['unknown', 0];

	return { component, count };
}

/**
 * Get recent effect history for debugging
 */
export function getEffectHistory(limit = 20): typeof effectCallHistory {
	return effectCallHistory.slice(-limit);
}

/**
 * Reset the effect counter (useful for testing)
 */
export function resetEffectCounter(): void {
	globalEffectCounter = 0;
	effectCallHistory.length = 0;
}

/**
 * Get current effect statistics
 */
export function getEffectStats(): {
	totalEffects: number;
	recentEffects: number;
	componentsActive: string[];
} {
	const now = Date.now();
	const recentEffects = effectCallHistory.filter(
		(e) => now - e.timestamp < RAPID_FIRE_WINDOW
	);
	const componentsActive = [...new Set(recentEffects.map((e) => e.component))];

	return {
		totalEffects: globalEffectCounter,
		recentEffects: recentEffects.length,
		componentsActive,
	};
}
