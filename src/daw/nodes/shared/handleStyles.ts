import type { CSSProperties, ReactElement } from 'react';
import { createElement } from 'react';
import { NODE_HEADER_HEIGHT } from './NodeHeader';

// ─── Handle spacing system ────────────────────────────────────────────────────

export const HANDLE_SPACING_PX = { tight: 20, normal: 32, loose: 48 } as const;
export const HANDLE_PAD        = 14; // px inset from node edge for top/bottom alignment

/**
 * Compute `top` CSS strings for handles on the left or right edge.
 * Spacing is the gap between handle centres; align positions the group within
 * the content area (below NodeHeader).
 */
export function computeHandleTops(
	count:   number,
	spacing: keyof typeof HANDLE_SPACING_PX,
	align:   'top' | 'center' | 'bottom' = 'center',
): string[] {
	const s     = HANDLE_SPACING_PX[spacing];
	const total = (count - 1) * s;
	return Array.from({ length: count }, (_, i) => {
		const off = i * s;
		if (align === 'top')
			return `${NODE_HEADER_HEIGHT + HANDLE_PAD + off}px`;
		if (align === 'bottom')
			return `calc(100% - ${HANDLE_PAD + total - off}px)`;
		const delta = off - total / 2;
		return delta === 0
			? `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2)`
			: `calc(${NODE_HEADER_HEIGHT}px + (100% - ${NODE_HEADER_HEIGHT}px) / 2 + ${delta}px)`;
	});
}

/**
 * Compute `left` CSS strings for handles on the bottom edge, centred
 * horizontally within the node.
 */
export function computeHandleLefts(
	count:   number,
	spacing: keyof typeof HANDLE_SPACING_PX,
): string[] {
	const s     = HANDLE_SPACING_PX[spacing];
	const total = (count - 1) * s;
	return Array.from({ length: count }, (_, i) => {
		const delta = i * s - total / 2;
		return delta === 0 ? '50%' : `calc(50% + ${delta}px)`;
	});
}

/** Circle handle with glow — left-edge inputs. */
export function inputHandleStyle(color: string): CSSProperties {
	return {
		width:        16,
		height:       16,
		borderRadius: '50%',
		background:   color,
		border:       'none',
		boxShadow:    `0 0 8px ${color}80`,
		zIndex:       10,
	};
}

/** Right-pointing triangle — right-edge outputs. */
export function outputHandleStyle(color: string): CSSProperties {
	return {
		width:        16,
		height:       18,
		borderRadius: 0,
		background:   color,
		border:       'none',
		clipPath:     'polygon(0% 0%, 100% 50%, 0% 100%)',
		filter:       `drop-shadow(0 0 5px ${color}80)`,
		zIndex:       10,
	};
}

/** Downward-pointing triangle — bottom-edge outputs. */
export function bottomOutputHandleStyle(color: string): CSSProperties {
	return {
		width:        18,
		height:       16,
		borderRadius: 0,
		background:   color,
		border:       'none',
		clipPath:     'polygon(0% 0%, 100% 0%, 50% 100%)',
		filter:       `drop-shadow(0 0 5px ${color}80)`,
		zIndex:       10,
	};
}

function labelBase(color: string): CSSProperties {
	return {
		position:      'absolute',
		fontSize:      8,
		lineHeight:    1,
		color,
		whiteSpace:    'nowrap',
		pointerEvents: 'none',
		userSelect:    'none',
		background:    'rgba(16,16,20,0.85)',
		padding:       '2px 4px',
		borderRadius:  '2px',
	};
}

/**
 * Label for a left-edge (input) handle — sits to the RIGHT of the handle,
 * inside the node body, vertically centred on the handle.
 */
export function inputLabel(text: string, handleTop: string, color: string): ReactElement {
	return createElement('span', {
		style: { ...labelBase(color), left: 14, top: handleTop, transform: 'translateY(-50%)' },
	}, text);
}

/**
 * Label for a right-edge (output) handle — sits to the LEFT of the handle,
 * inside the node body, vertically centred on the handle.
 */
export function rightLabel(text: string, handleTop: string, color: string): ReactElement {
	return createElement('span', {
		style: { ...labelBase(color), right: 14, top: handleTop, transform: 'translateY(-50%)' },
	}, text);
}

/**
 * Label for a bottom-edge handle — sits ABOVE the handle, inside the node.
 * `left` matches the handle's left value.
 */
export function outputLabel(text: string, color: string, left = '50%'): ReactElement {
	return createElement('span', {
		style: { ...labelBase(color), bottom: 16, left, transform: 'translateX(-50%)' },
	}, text);
}
