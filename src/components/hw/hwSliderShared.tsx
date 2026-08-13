import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import { HW_INSET } from '../../daw/nodes/shared/hwStyles';

// ─── Shared edit input ────────────────────────────────────────────────────────

export function EditInput({
	defaultValue,
	onCommit,
	onCancel,
	compact   = false,
	fontSize: fontSizeProp,
	width:    widthProp,
	color,
	align     = 'right',
}: {
	defaultValue: string;
	onCommit:     (raw: string) => void;
	onCancel:     () => void;
	compact?:     boolean;
	/** Override font size. Defaults to standard slider sizes (10 / 8). */
	fontSize?:    number;
	/** Override input width. Defaults to standard slider sizes (54 / 38). */
	width?:       number;
	/** Accent the box border/glow with the owning control's color. Neutral gray if omitted. */
	color?:       string;
	/** Text alignment within the box. Defaults to 'right' (matches corner-anchored displays). */
	align?:       'left' | 'center' | 'right';
}) {
	const [raw, setRaw] = useState(defaultValue);
	return (
		<Box sx={{
			background:   HW_INSET.background,
			border:       `1px solid ${color ? `${color}50` : '#0d0d0f'}`,
			boxShadow:    color
				? `inset 0 2px 4px rgba(0,0,0,0.55), 0 0 6px ${color}30`
				: 'inset 0 2px 4px rgba(0,0,0,0.55)',
			borderRadius: HW_INSET.borderRadius,
			px: 0.5, display: 'inline-flex', alignItems: 'center',
		}}>
			<InputBase
				// eslint-disable-next-line jsx-a11y/no-autofocus
				autoFocus
				value={raw}
				onChange={e => setRaw(e.target.value)}
				onFocus={e => e.target.select()}
				onBlur={() => onCommit(raw)}
				onKeyDown={e => {
					if (e.key === 'Enter')  { e.preventDefault(); onCommit(raw); }
					if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
				}}
				sx={{
					fontSize: fontSizeProp ?? (compact ? 8 : 10),
					color:    'text.primary',
					width:    widthProp    ?? (compact ? 38 : 54),
					'& .MuiInputBase-input': { p: 0, textAlign: align, lineHeight: 1.66 },
				}}
			/>
		</Box>
	);
}

// ─── Shared bounds editing hook ───────────────────────────────────────────────

export function useBoundsEdit(min: number, max: number, value: number, onChange: (v: number) => void) {
	const [editingMin, setEditingMin] = useState(false);
	const [editingMax, setEditingMax] = useState(false);
	const [localMin,   setLocalMin]   = useState(min);
	const [localMax,   setLocalMax]   = useState(max);

	const commitMin = useCallback((raw: string) => {
		setEditingMin(false);
		const parsed = parseFloat(raw);
		if (!isNaN(parsed) && parsed < localMax) {
			setLocalMin(parsed);
			if (value < parsed) onChange(parsed);
		}
	}, [localMax, value, onChange]);

	const commitMax = useCallback((raw: string) => {
		setEditingMax(false);
		const parsed = parseFloat(raw);
		if (!isNaN(parsed) && parsed > localMin) {
			setLocalMax(parsed);
			if (value > parsed) onChange(parsed);
		}
	}, [localMin, value, onChange]);

	return { editingMin, setEditingMin, editingMax, setEditingMax, localMin, localMax, commitMin, commitMax };
}
