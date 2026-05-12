import type { CSSProperties, ReactElement } from 'react';
import { createElement } from 'react';

/** Solid circle handle — both inputs and outputs use this shape. */
export function inputHandleStyle(color: string): CSSProperties {
	return {
		width:        10,
		height:       10,
		borderRadius: '50%',
		background:   color,
		border:       'none',
		zIndex:       10,
	};
}

/** Solid circle handle — same shape as input for visual consistency. */
export function outputHandleStyle(color: string): CSSProperties {
	return {
		width:        10,
		height:       10,
		borderRadius: '50%',
		background:   color,
		border:       'none',
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
