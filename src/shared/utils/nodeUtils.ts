/**
 * Node utility functions following functional programming principles
 *
 * This module provides pure functions for node operations:
 * - ID generation with collision avoidance
 * - Position calculation with random offsets
 * - Helper functions for node creation
 *
 * All functions are pure (no side effects) and follow the DRY principle.
 *
 * @module nodeUtils
 */

/**
 * Generate a unique ID for a new node
 * Uses timestamp + random string to ensure uniqueness across sessions
 *
 * @returns A unique node ID string in the format: node-{timestamp}-{random}
 */
export function generateNodeId(): string {
	return `node-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a random position offset to avoid node overlap
 * @param maxOffset Maximum offset in pixels (default: 200)
 * @returns Object with x and y offset values
 */
export function generateRandomOffset(maxOffset: number = 200): {
	x: number;
	y: number;
} {
	return {
		x: Math.random() * maxOffset,
		y: Math.random() * maxOffset,
	};
}

/**
 * Create a default position for a new node with optional random offset
 * @param baseX Base X position (default: 100)
 * @param baseY Base Y position (default: 100)
 * @param withRandomOffset Whether to add random offset (default: true)
 * @returns Position object with x and y coordinates
 */
export function generateNodePosition(
	baseX: number = 128,
	baseY: number = 128,
	withRandomOffset: boolean = true
): { x: number; y: number } {
	if (!withRandomOffset) {
		return { x: baseX, y: baseY };
	}

	const offset = generateRandomOffset();
	return {
		x: baseX + offset.x,
		y: baseY + offset.y,
	};
}
