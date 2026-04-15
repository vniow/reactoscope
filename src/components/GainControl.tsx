import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { useAxis, useEffects } from '../contexts/WoahscopeContext';

function SliderRow({
	label,
	value,
	min,
	max,
	step,
	onChange,
	formatValue,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
	formatValue?: (v: number) => string;
}) {
	const displayValue = formatValue
		? formatValue(value)
		: `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
	return (
		<Box>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
				<Typography variant='body2' color='text.secondary'>
					{label}
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					{displayValue}
				</Typography>
			</Box>
			<Slider
				aria-label={label}
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(_e, v) => onChange(v as number)}
				size='small'
				color='primary'
			/>
		</Box>
	);
}

export function GainControl() {
	const { gain, setGain, intensity, setIntensity } = useAxis();
	const {
		persistence, setPersistence,
		glowStrength, setGlowStrength,
		scatterStrength, setScatterStrength,
		lanczosEnabled, lanczosSteps, setLanczosSteps,
	} = useEffects();

	return (
		<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, px: 1 }}>
			<SliderRow label='gain'        value={gain}            min={-1} max={4} step={0.1}  onChange={setGain} />
			<SliderRow label='intensity'   value={intensity}       min={-2} max={4} step={0.1}  onChange={setIntensity} />
			<SliderRow label='persistence' value={persistence}     min={0}  max={4} step={0.1}  onChange={setPersistence} />
			<SliderRow label='glow'        value={glowStrength}    min={0}  max={4} step={0.05} onChange={setGlowStrength} />
			<SliderRow label='scatter'     value={scatterStrength} min={0}  max={2} step={0.05} onChange={setScatterStrength} />
			{lanczosEnabled && (
				<SliderRow
					label='smooth steps'
					value={lanczosSteps}
					min={1}
					max={8}
					step={1}
					onChange={setLanczosSteps}
					formatValue={(v) => String(Math.round(v))}
				/>
			)}
		</Box>
	);
}
