import type { CSSProperties, ReactElement } from 'react';
import { createElement } from 'react';

/** Hollow circle — signals "this accepts a connection." */
export function inputHandleStyle(color: string): CSSProperties {
	return {
		width:        10,
		height:       10,
		borderRadius: '50%',
		background:   'transparent',
		border:       `2px solid ${color}`,
		zIndex:       10,
	};
}

/** Filled downward triangle — signals "this emits a signal." */
export function outputHandleStyle(color: string): CSSProperties {
	return {
		width:        10,
		height:       10,
		borderRadius: 0,
		background:   color,
		border:       'none',
		clipPath:     'polygon(0% 0%, 100% 0%, 50% 100%)',
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
	};
}

/** Tiny label adjacent to a left-edge (input) handle. `top` matches the handle's top value. */
export function inputLabel(text: string, top: string, color: string): ReactElement {
	return createElement('span', {
		style: { ...labelBase(color), left: 10, top, transform: 'translateY(-50%)' },
	}, text);
}

/** Tiny label adjacent to a bottom-edge (output) handle. `left` matches the handle's left value. */
export function outputLabel(text: string, color: string, left = '50%'): ReactElement {
	return createElement('span', {
		style: { ...labelBase(color), bottom: 12, left, transform: 'translateX(-50%)' },
	}, text);
}
