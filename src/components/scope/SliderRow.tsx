import { useState } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { NODE_COLORS } from '../../daw/nodes/shared/nodeColors';
import { hwSliderSx } from '../../daw/nodes/shared/hwStyles';

const color = NODE_COLORS.scene;

// Shared by GainControl and GalvoControl. Both used to keep a near-identical
// SliderRow locally, but tooltip + editable value/bounds tripled the logic —
// past the point where duplicating it per-file was worth avoiding a shared file.

function EditableNumber({
	value, format, parse, onCommit, width, align = 'right', disabled,
}: {
	value: number;
	format: (v: number) => string;
	parse: (s: string) => number;
	onCommit: (v: number) => void;
	width: number;
	align?: 'left' | 'right';
	disabled?: boolean;
}) {
	const [editing, setEditing] = useState(false);
	const [text, setText] = useState('');

	const commit = () => {
		const parsed = parse(text);
		if (Number.isFinite(parsed)) onCommit(parsed);
		setEditing(false);
	};

	return (
		<InputBase
			value={editing ? text : format(value)}
			disabled={disabled}
			onFocus={(e) => { setEditing(true); setText(format(value)); e.target.select(); }}
			onChange={(e) => setText(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
				if (e.key === 'Escape') { setEditing(false); (e.target as HTMLInputElement).blur(); }
			}}
			inputProps={{ inputMode: 'decimal', style: { textAlign: align, padding: 0 } }}
			sx={{
				width,
				fontSize: 9,
				color: 'text.disabled',
				borderBottom: '1px dotted rgba(255,255,255,0.3)',
				'& input': { padding: 0 },
				'&.Mui-focused': { color, borderBottomColor: color },
				'&.Mui-disabled': { borderBottomColor: 'transparent' },
			}}
		/>
	);
}

export function SliderRow({
	label, tooltip, value, min, max, step, onChange, formatValue, parseValue, disabled,
}: {
	label: string;
	/** Short definition shown on hover — what this control does and, where useful, its unit. */
	tooltip?: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
	formatValue?: (v: number) => string;
	/** Inverse of formatValue, for parsing typed text back into the raw slider value. Defaults to parseFloat. */
	parseValue?: (s: string) => number;
	disabled?: boolean;
}) {
	// Bounds are editable per-row, independent of the parent's default min/max.
	const [bounds, setBounds] = useState({ min, max });
	const format = formatValue ?? ((v: number) => v.toFixed(2));
	const parse = parseValue ?? ((s: string) => parseFloat(s));

	const clampToBounds = (v: number) => Math.min(bounds.max, Math.max(bounds.min, v));

	const commitValue = (raw: number) => onChange(clampToBounds(raw));

	const commitMin = (raw: number) => {
		const next = Math.min(raw, bounds.max - step);
		setBounds((b) => ({ ...b, min: next }));
		if (value < next) onChange(next);
	};

	const commitMax = (raw: number) => {
		const next = Math.max(raw, bounds.min + step);
		setBounds((b) => ({ ...b, max: next }));
		if (value > next) onChange(next);
	};

	const labelEl = (
		<Typography variant='caption' color='text.disabled'
			sx={{ fontSize: 9, letterSpacing: 0.5, cursor: tooltip ? 'help' : undefined }}>
			{label}
		</Typography>
	);

	return (
		<Box>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
				{tooltip
					? <Tooltip title={tooltip} placement='top' arrow><span>{labelEl}</span></Tooltip>
					: labelEl}
				<EditableNumber value={value} format={format} parse={parse} onCommit={commitValue} width={40} disabled={disabled} />
			</Box>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
				<EditableNumber value={bounds.min} format={format} parse={parse} onCommit={commitMin} width={34} align='left' disabled={disabled} />
				<Slider
					aria-label={label}
					min={bounds.min}
					max={bounds.max}
					step={step}
					value={clampToBounds(value)}
					onChange={(_e, v) => onChange(v as number)}
					size='small'
					disabled={disabled}
					sx={{ ...hwSliderSx(color), flex: 1 }}
				/>
				<EditableNumber value={bounds.max} format={format} parse={parse} onCommit={commitMax} width={34} disabled={disabled} />
			</Box>
		</Box>
	);
}
