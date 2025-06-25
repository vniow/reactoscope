/**
 * Simplified Grid System for Tailwind CSS
 * 
 * This module provides the GRID_UNIT constant for legacy compatibility only.
 * All positioning and sizing is now handled via Tailwind utility classes and inline styles.
 * 
 * NEW APPROACH:
 * - Use explicit Tailwind classes for sizing (w-64, h-32, etc.)
 * - Use inline styles for dynamic sizing where needed
 * - Use standard CSS positioning (absolute, relative) instead of complex grid calculations
 * - Leverage Tailwind's built-in responsive design and theme system
 * 
 * EXAMPLE USAGE:
 * ```tsx
 * // Instead of gridWidth/gridHeight props, use explicit sizing
 * <div className="w-80 h-64 bg-white/10 border border-gray-300 rounded-lg shadow-lg">
 *   {content}
 * </div>
 * 
 * // Or use inline styles for dynamic sizing
 * <div 
 *   className="bg-white/10 border border-gray-300 rounded-lg shadow-lg"
 *   style={{ width: '320px', height: '256px' }}
 * >
 *   {content}
 * </div>
 * ```
 * 
 * This approach follows Tailwind v4 patterns and provides better maintainability
 * while keeping the consistent sizing that was provided by the grid system.
 */

export const GRID_UNIT = 64; // Base unit for node sizing (64px) - kept for legacy compatibility
