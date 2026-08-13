import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { hwSliderSx } from '../../daw/nodes/shared/hwStyles';
import { EditInput, useBoundsEdit } from './hwSliderShared';

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

export function HwSliderField({
	label, value, min, max, step, color, onChange,
	format, unit, allowValueEdit, allowBoundsEdit, marks,
}: HwSliderFieldProps) {
	const [editingValue, setEditingValue] = useState(false);
	const {
		editingMin, setEditingMin,
		editingMax, setEditingMax,
		localMin, localMax,
		commitMin, commitMax,
	} = useBoundsEdit(min, max, value, onChange);

	const displayValue = format ? format(value) : String(value);
	const displayLabel = unit ? `${displayValue} ${unit}` : displayValue;

	const commitValue = useCallback((raw: string) => {
		setEditingValue(false);
		const parsed = parseFloat(raw);
		if (!isNaN(parsed)) onChange(Math.min(localMax, Math.max(localMin, parsed)));
	}, [onChange, localMin, localMax]);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
				<Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>{label}</Typography>
				{allowValueEdit && editingValue ? (
					<EditInput defaultValue={displayValue} onCommit={commitValue} onCancel={() => setEditingValue(false)} color={color} />
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
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
					{editingMin ? (
						<EditInput defaultValue={String(localMin)} onCommit={commitMin} onCancel={() => setEditingMin(false)} compact color={color} align='center' />
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
						<EditInput defaultValue={String(localMax)} onCommit={commitMax} onCancel={() => setEditingMax(false)} compact color={color} align='center' />
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
