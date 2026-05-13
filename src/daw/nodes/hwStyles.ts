/**
 * Hardware-style visual state tokens for DAW UI controls.
 * All component factories accept an accent `color` hex string (e.g. '#4488ff')
 * so every node type can light up in its own category colour.
 */

// ─── Base surface states ──────────────────────────────────────────────────────

export const HW_RAISED = {
	background:      'linear-gradient(to bottom, #383840 0%, #26262c 100%)',
	border:          '1px solid #0d0d0f',
	borderTopColor:  '#4a4a52',
	borderLeftColor: '#3e3e46',
	boxShadow:       '0 2px 4px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
	borderRadius:    '3px',
	transition:      'background 80ms ease, box-shadow 80ms ease, border-color 80ms ease, transform 80ms ease',
};

export const HW_PRESSED = {
	background:      'linear-gradient(to bottom, #1e1e24 0%, #28282e 100%)',
	border:          '1px solid #0d0d0f',
	borderTopColor:  '#0d0d0f',
	borderLeftColor: '#0d0d0f',
	boxShadow:       'inset 0 2px 4px rgba(0,0,0,0.6)',
	borderRadius:    '3px',
	transform:       'translateY(1px)',
};

export const HW_INSET = {
	background:   'linear-gradient(to bottom, #161618 0%, #22222a 100%)',
	border:       '1px solid #0d0d0f',
	boxShadow:    'inset 0 2px 4px rgba(0,0,0,0.55)',
	borderRadius: '3px',
};

/** Lit/active surface — recessed with accent glow. All other states derive from this. */
export function hwLit(color: string) {
	return {
		background:      `linear-gradient(to bottom, ${color}22 0%, ${color}16 100%)`,
		border:          `1px solid ${color}50`,
		borderTopColor:  `${color}28`,
		borderLeftColor: `${color}38`,
		boxShadow:       `inset 0 2px 5px rgba(0,0,0,0.55), 0 0 8px ${color}30`,
		borderRadius:    '3px',
		transition:      'background 80ms ease, box-shadow 80ms ease, border-color 80ms ease',
	};
}

// ─── Component factories ──────────────────────────────────────────────────────

export function hwBtn(color: string) {
	return {
		...HW_RAISED,
		minWidth: 0, px: 1.5, py: 0.5,
		fontSize: 10, fontWeight: 500, letterSpacing: 0.3,
		textTransform: 'none' as const, lineHeight: 1.4,
		color: 'text.secondary',
		'&:hover': {
			background:     'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)',
			color:          'text.primary',
			border:         `1px solid ${color}28`,
			borderTopColor: '#4a4a52',
			boxShadow:      '0 2px 5px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)',
		},
		'&:active': { ...HW_PRESSED, transform: 'translateY(1px)' },
	};
}

export function hwBtnLit(color: string) {
	const lit = hwLit(color);
	return {
		...hwBtn(color), ...lit, color,
		'&:hover': { ...lit, filter: 'brightness(1.2)', color },
		'&:active': { ...HW_PRESSED, transform: 'translateY(1px)' },
	};
}

export function hwToggleSx(color: string) {
	const lit = hwLit(color);
	const radii = {
		'&:first-of-type':  { borderRadius: '3px 0 0 3px' },
		'&:last-of-type':   { borderRadius: '0 3px 3px 0' },
		'&:not(:first-of-type):not(:last-of-type)': { borderRadius: 0 },
	};
	return {
		'& .MuiToggleButton-root': {
			...HW_RAISED, ...radii,
			px: 1.25, py: 0.35, fontSize: 10, lineHeight: 1,
			color: 'text.secondary', textTransform: 'none',
			'&:not(:first-of-type)': { marginLeft: '-1px', borderLeftColor: '#0d0d0f' },
			'&:hover': { background: 'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)', color: 'text.primary' },
			'&:active': HW_PRESSED,
		},
		'& .MuiToggleButton-root.Mui-selected': {
			...lit, ...radii, color,
			'&:not(:first-of-type)': { marginLeft: '-1px' },
			'&:hover': { ...lit, filter: 'brightness(1.1)', color },
			'&:active': HW_PRESSED,
		},
	};
}

export function hwSelectSx(color: string) {
	return {
		...HW_RAISED,
		fontSize: 11, color: 'text.secondary',
		'& .MuiSelect-select':               { py: '5px', px: '10px' },
		'& .MuiOutlinedInput-notchedOutline': { border: 'none' },
		'&:hover': {
			background:                           'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)',
			'& .MuiOutlinedInput-notchedOutline': { border: 'none' },
		},
		'&.Mui-focused': {
			...hwLit(color),
			'& .MuiOutlinedInput-notchedOutline': { border: 'none' },
		},
		'& .MuiSelect-icon': { color: 'text.disabled' },
	};
}

export function hwSelectMenuProps(color: string) {
	return {
		PaperProps: {
			sx: {
				background:   '#1a1a1e',
				border:       '1px solid #0d0d0f',
				borderColor:  `${color}40`,
				boxShadow:    `0 4px 12px rgba(0,0,0,0.7), 0 0 0 1px ${color}20`,
				'& .MuiMenuItem-root': {
					fontSize: 12, color: 'text.secondary',
					'&:hover':       { background: `${color}14`, color: 'text.primary' },
					'&.Mui-selected': {
						background: `${color}22`, color,
						'&:hover':  { background: `${color}30` },
					},
				},
			},
		},
	};
}

export function hwSliderSx(color: string) {
	return {
		py: 0.75,
		'& .MuiSlider-rail': { ...HW_INSET, height: 6, opacity: 1 },
		'& .MuiSlider-track': {
			height: 6, border: 'none',
			background: `linear-gradient(to right, ${color}80, ${color})`,
			boxShadow:  `0 0 5px ${color}40`,
		},
		'& .MuiSlider-thumb': {
			width: 14, height: 14,
			...HW_RAISED,
			background: 'linear-gradient(to bottom, #484850, #343438)',
			'&::before':    { display: 'none' },
			'&:hover':      { boxShadow: '0 2px 6px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.16)', border: `1px solid ${color}30`, borderTopColor: '#4a4a52' },
			'&.Mui-active': { ...HW_PRESSED, width: 14, height: 14, transform: 'translate(-50%, calc(-50% + 1px))' },
		},
		'& .MuiSlider-mark': {
			width: '2px', height: '8px',
			borderRadius: 0,
			background: `${color}30`,
			opacity: 1,
		},
		'& .MuiSlider-markActive': {
			background: `${color}70`,
			opacity: 1,
		},
	};
}

export function hwIconBtn(color: string) {
	return {
		...HW_RAISED, p: 0.75, color: 'text.secondary',
		'&:hover': {
			background: 'linear-gradient(to bottom, #40404a 0%, #2e2e34 100%)',
			color: 'text.primary',
			border: `1px solid ${color}30`,
			borderTopColor: '#4a4a52',
		},
		'&:active': HW_PRESSED,
	};
}

export function hwIconBtnLit(color: string) {
	const lit = hwLit(color);
	return {
		...hwIconBtn(color), ...lit, color,
		'&:hover': { ...lit, filter: 'brightness(1.15)', color },
		'&:active': HW_PRESSED,
	};
}

export function hwDeleteIconBtn(color: string) {
	return {
		...HW_RAISED,
		borderRadius: '50%',
		p: 0.25,
		color: `${color}90`,
		'&:hover': {
			background:     `linear-gradient(to bottom, ${color}ee 0%, ${color}cc 100%)`,
			border:         `1px solid ${color}`,
			borderTopColor: `${color}aa`,
			boxShadow:      `0 2px 4px rgba(0,0,0,0.4), 0 0 8px ${color}50`,
			borderRadius:   '50%',
			color:          'rgba(0,0,0,0.7)',
		},
		'&:active': { ...HW_PRESSED, borderRadius: '50%', transform: 'translateY(1px)' },
	};
}
