import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { HW_INSET, hwSliderSx } from '../daw/nodes/hwStyles';

export interface HwSliderFieldProps {
	label:            string;
	value:            number;
	min:              number;
	max:              number;
	step:             number;
	color:            string;
	onChange:         (value: number) => void;
	format?:          (v: number) => string;
	unit?:            string;
	allowValueEdit?:  boolean;
	allowBoundsEdit?: boolean;
	marks?:           Array<{ value: number }>;
}

function EditInput({
	defaultValue,
	onCommit,
	onCancel,
	compact = false,
}: {
	defaultValue: string;
	onCommit: (raw: string) => void;
	onCancel: () => void;
	compact?: boolean;
}) {
	const [raw, setRaw] = useState(defaultValue);
	return (
		<Box sx={{ ...HW_INSET, px: 0.5, display: 'inline-flex', alignItems: 'center' }}>
			<InputBase
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
					fontSize: compact ? 8 : 10,
					color: 'text.primary',
					width: compact ? 38 : 54,
					'& .MuiInputBase-input': { p: 0, textAlign: 'right' },
				}}
			/>
		</Box>
	);
}

export function HwSliderField({
	label, value, min, max, step, color, onChange,
	format, unit, allowValueEdit, allowBoundsEdit, marks,
}: HwSliderFieldProps) {
	const [editingValue, setEditingValue] = useState(false);
	const [editingMin,   setEditingMin]   = useState(false);
	const [editingMax,   setEditingMax]   = useState(false);
	const [localMin, setLocalMin] = useState(min);
	const [localMax, setLocalMax] = useState(max);

	const displayValue = format ? format(value) : String(value);
	const displayLabel = unit ? `${displayValue} ${unit}` : displayValue;

	const commitValue = useCallback((raw: string) => {
		setEditingValue(false);
		const parsed = parseFloat(raw);
		if (!isNaN(parsed)) onChange(Math.min(localMax, Math.max(localMin, parsed)));
	}, [onChange, localMin, localMax]);

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

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
				<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>{label}</Typography>
				{allowValueEdit && editingValue ? (
					<EditInput defaultValue={displayValue} onCommit={commitValue} onCancel={() => setEditingValue(false)} />
				) : (
					<Typography
						variant='caption' color='text.disabled'
						sx={{ fontSize: 10, cursor: allowValueEdit ? 'text' : 'default', userSelect: 'none' }}
						onClick={allowValueEdit ? () => setEditingValue(true) : undefined}
					>
						{displayLabel}
					</Typography>
				)}
			</Box>

			<Slider
				aria-label={label}
				min={localMin} max={localMax} step={step}
				marks={marks}
				value={value}
				onChange={(_e, v) => onChange(v as number)}
				size='small'
				sx={hwSliderSx(color)}
			/>

			{allowBoundsEdit && (
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
					{editingMin ? (
						<EditInput defaultValue={String(localMin)} onCommit={commitMin} onCancel={() => setEditingMin(false)} compact />
					) : (
						<Typography
							variant='caption'
							sx={{ fontSize: 8, color: 'text.disabled', cursor: 'text', userSelect: 'none' }}
							onClick={() => setEditingMin(true)}
						>
							{localMin}{unit ? ` ${unit}` : ''}
						</Typography>
					)}
					{editingMax ? (
						<EditInput defaultValue={String(localMax)} onCommit={commitMax} onCancel={() => setEditingMax(false)} compact />
					) : (
						<Typography
							variant='caption'
							sx={{ fontSize: 8, color: 'text.disabled', cursor: 'text', userSelect: 'none' }}
							onClick={() => setEditingMax(true)}
						>
							{localMax}{unit ? ` ${unit}` : ''}
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);
}
