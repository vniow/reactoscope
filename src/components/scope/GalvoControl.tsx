import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useGalvo } from '../../contexts/GalvoContext';
import { NODE_COLORS } from '../../daw/nodes/shared/nodeColors';
import { hwSliderSx, hwToggleSx } from '../../daw/nodes/shared/hwStyles';

const color = NODE_COLORS.scene;

// Local, not shared with GainControl.tsx's near-identical SliderRow — that
// component isn't exported, and this one needs a `disabled` state (for the
// linked-Y sliders below) the other doesn't. Not worth a cross-file refactor
// over ~20 duplicated lines.
function SliderRow({
	label, value, min, max, step, onChange, formatValue, disabled,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (v: number) => void;
	formatValue?: (v: number) => string;
	disabled?: boolean;
}) {
	const displayValue = formatValue ? formatValue(value) : value.toFixed(2);
	return (
		<Box>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9, letterSpacing: 0.5 }}>
					{label}
				</Typography>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
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
				disabled={disabled}
				sx={hwSliderSx(color)}
			/>
		</Box>
	);
}

export function GalvoControl() {
	const {
		enabled, setEnabled, linkAxes, setLinkAxes,
		scannerX, setScannerX, scannerY, setScannerY,
		spotSize, setSpotSize, power, setPower,
		gainR, setGainR, gainG, setGainG, gainB, setGainB,
		blankFloor, setBlankFloor, zGamma, setZGamma,
		exposureTime, setExposureTime,
		glowStrength, setGlowStrength, hazeStrength, setHazeStrength, whitePoint, setWhitePoint,
	} = useGalvo();

	// While linked, Y's own stored params are never displayed (the sliders show
	// X's mirrored value instead) — disabling them, not just relabeling, avoids
	// a real trap: dragging a Y slider that displays X's value would otherwise
	// silently write to scannerY's storage with zero visible feedback, only
	// surfacing as a surprise the next time the axes are unlinked.
	const yDisplay = linkAxes ? scannerX : scannerY;

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<ToggleButtonGroup sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}>
				<ToggleButton value='enabled'  selected={enabled}  onChange={() => setEnabled(!enabled)}   size='small'>scanner</ToggleButton>
				<ToggleButton value='linkAxes' selected={linkAxes} onChange={() => setLinkAxes(!linkAxes)} size='small'>link XY</ToggleButton>
			</ToggleButtonGroup>

			<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 1 }}>
				<SliderRow label='bandwidth X' value={scannerX.bandwidth} min={50} max={12000} step={10}
					onChange={(v) => setScannerX({ ...scannerX, bandwidth: v })} formatValue={(v) => `${Math.round(v)}Hz`} />
				<SliderRow label={linkAxes ? 'bandwidth Y (linked)' : 'bandwidth Y'} value={yDisplay.bandwidth}
					min={50} max={12000} step={10} disabled={linkAxes}
					onChange={(v) => setScannerY({ ...scannerY, bandwidth: v })} formatValue={(v) => `${Math.round(v)}Hz`} />

				<SliderRow label='damping X' value={scannerX.damping} min={0.05} max={2} step={0.01}
					onChange={(v) => setScannerX({ ...scannerX, damping: v })} />
				<SliderRow label={linkAxes ? 'damping Y (linked)' : 'damping Y'} value={yDisplay.damping}
					min={0.05} max={2} step={0.01} disabled={linkAxes}
					onChange={(v) => setScannerY({ ...scannerY, damping: v })} />

				<SliderRow label='slew X' value={scannerX.slewLimit} min={10} max={100000} step={10}
					onChange={(v) => setScannerX({ ...scannerX, slewLimit: v })} formatValue={(v) => `${Math.round(v)}/s`} />
				<SliderRow label={linkAxes ? 'slew Y (linked)' : 'slew Y'} value={yDisplay.slewLimit}
					min={10} max={100000} step={10} disabled={linkAxes}
					onChange={(v) => setScannerY({ ...scannerY, slewLimit: v })} formatValue={(v) => `${Math.round(v)}/s`} />
			</Box>

			<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 1 }}>
				<SliderRow label='spot size'   value={spotSize}   min={0.001} max={0.1} step={0.001} onChange={setSpotSize} formatValue={(v) => v.toFixed(3)} />
				<SliderRow label='power'       value={power}      min={0}     max={4}   step={0.05}  onChange={setPower} />
				<SliderRow label='gain R'      value={gainR}      min={0}     max={2}   step={0.02}  onChange={setGainR} />
				<SliderRow label='gain G'      value={gainG}      min={0}     max={2}   step={0.02}  onChange={setGainG} />
				<SliderRow label='gain B'      value={gainB}      min={0}     max={2}   step={0.02}  onChange={setGainB} />
				<SliderRow label='blank floor' value={blankFloor} min={-1}    max={0}   step={0.01}  onChange={setBlankFloor} />
				<SliderRow label='z gamma'     value={zGamma}     min={0.2}   max={5}   step={0.05}  onChange={setZGamma} />
			</Box>

			<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 1 }}>
				<SliderRow label='exposure'  value={exposureTime} min={5} max={200} step={1}    onChange={setExposureTime} formatValue={(v) => `${Math.round(v)}ms`} />
				<SliderRow label='glow'      value={glowStrength} min={0} max={1}   step={0.02} onChange={setGlowStrength} />
				<SliderRow label='haze'      value={hazeStrength} min={0} max={1}   step={0.02} onChange={setHazeStrength} />
				<SliderRow label='white pt'  value={whitePoint}   min={0} max={1}   step={0.02} onChange={setWhitePoint} />
			</Box>
		</Box>
	);
}
