import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useGalvo } from '../../contexts/GalvoContext';
import { NODE_COLORS } from '../../daw/nodes/shared/nodeColors';
import { hwToggleSx } from '../../daw/nodes/shared/hwStyles';
import { SliderRow } from './SliderRow';
import { LaserReadoutRow } from './LaserReadoutRow';

const color = NODE_COLORS.scene;

const hzFormat = (v: number) => `${Math.round(v)}Hz`;
const perSecFormat = (v: number) => `${Math.round(v)}/s`;
const msFormat = (v: number) => `${Math.round(v)}ms`;
const decimals3 = (v: number) => v.toFixed(3);

export function GalvoControl() {
	const {
		enabled, setEnabled, linkAxes, setLinkAxes,
		scannerX, setScannerX, scannerY, setScannerY,
		trackingBlankThreshold, setTrackingBlankThreshold,
		trackingBlankSoftness, setTrackingBlankSoftness,
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
				<Tooltip title='Enable the Scanner Model. When off, the beam renders at its commanded position with no simulated lag — a direct A/B against CRT.' placement='top' arrow>
					<ToggleButton value='enabled'  selected={enabled}  onChange={() => setEnabled(!enabled)}   size='small'>scanner</ToggleButton>
				</Tooltip>
				<Tooltip title="Mirror the X axis's scanner parameters onto Y, so both axes share one set of values." placement='top' arrow>
					<ToggleButton value='linkAxes' selected={linkAxes} onChange={() => setLinkAxes(!linkAxes)} size='small'>link XY</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>

			<SliderRow label='bandwidth X' tooltip='Natural frequency of the X-axis servo. Lower means softer motion and more corner rounding.'
				value={scannerX.bandwidth} min={50} max={12000} step={10}
				onChange={(v) => setScannerX({ ...scannerX, bandwidth: v })} formatValue={hzFormat} />
			<SliderRow label={linkAxes ? 'bandwidth Y (linked)' : 'bandwidth Y'} tooltip='Natural frequency of the Y-axis servo. Lower means softer motion and more corner rounding.'
				value={yDisplay.bandwidth} min={50} max={12000} step={10} disabled={linkAxes}
				onChange={(v) => setScannerY({ ...scannerY, bandwidth: v })} formatValue={hzFormat} />

			<SliderRow label='damping X' tooltip='Damping ratio ζ for the X-axis servo. Below 1 the mirror rings and overshoots, 1 is critically damped, above 1 is sluggish.'
				value={scannerX.damping} min={0.05} max={2} step={0.01}
				onChange={(v) => setScannerX({ ...scannerX, damping: v })} />
			<SliderRow label={linkAxes ? 'damping Y (linked)' : 'damping Y'} tooltip='Damping ratio ζ for the Y-axis servo. Below 1 the mirror rings and overshoots, 1 is critically damped, above 1 is sluggish.'
				value={yDisplay.damping} min={0.05} max={2} step={0.01} disabled={linkAxes}
				onChange={(v) => setScannerY({ ...scannerY, damping: v })} />

			<SliderRow label='slew X' tooltip='Maximum X-axis mirror velocity. Limits how fast the beam can move regardless of the servo response — this is what makes long jumps take visible time to travel.'
				value={scannerX.slewLimit} min={10} max={100000} step={10}
				onChange={(v) => setScannerX({ ...scannerX, slewLimit: v })} formatValue={perSecFormat} />
			<SliderRow label={linkAxes ? 'slew Y (linked)' : 'slew Y'} tooltip='Maximum Y-axis mirror velocity. Limits how fast the beam can move regardless of the servo response — this is what makes long jumps take visible time to travel.'
				value={yDisplay.slewLimit} min={10} max={100000} step={10} disabled={linkAxes}
				onChange={(v) => setScannerY({ ...scannerY, slewLimit: v })} formatValue={perSecFormat} />

			{/* Live tracking error and reset count. docs/galvo-laser-emulator.md
			    calls surfacing resets "part of the feature, not polish"; the
			    counter had been incremented but never read until the readout
			    channel arrived with MEMS Laser. */}
			<LaserReadoutRow />

			{/* Forces blank while the Scanner Model hasn't caught up to the
			    commanded position yet — see GalvoContext's own doc comment. */}
			<SliderRow label='tracking blank' tooltip='Tracking-error threshold below which the beam is forced blank while the mirror is still catching up to the commanded position.'
				value={trackingBlankThreshold} min={0} max={0.5} step={0.005}
				onChange={setTrackingBlankThreshold} formatValue={decimals3} />
			<SliderRow label='blank softness' tooltip='How gradually the tracking blank fades in near its threshold, instead of snapping on/off.'
				value={trackingBlankSoftness} min={0} max={1} step={0.05} onChange={setTrackingBlankSoftness} />

			<SliderRow label='spot size' tooltip='Gaussian beam-spot radius, normalised to the scene scale.'
				value={spotSize} min={0.001} max={0.1} step={0.001} onChange={setSpotSize} formatValue={decimals3} />
			<SliderRow label='power' tooltip='Overall exposure multiplier for the beam.'
				value={power} min={0} max={4} step={0.05} onChange={setPower} />
			<SliderRow label='gain R' tooltip='Red-channel diode gain. Real laser projectors are not colour-neutral.'
				value={gainR} min={0} max={2} step={0.02} onChange={setGainR} />
			<SliderRow label='gain G' tooltip='Green-channel diode gain. Real laser projectors are not colour-neutral.'
				value={gainG} min={0} max={2} step={0.02} onChange={setGainG} />
			<SliderRow label='gain B' tooltip='Blue-channel diode gain. Real laser projectors are not colour-neutral.'
				value={gainB} min={0} max={2} step={0.02} onChange={setGainB} />
			<SliderRow label='blank floor' tooltip='Z level at or below which the beam is fully off.'
				value={blankFloor} min={-1} max={0} step={0.01} onChange={setBlankFloor} />
			<SliderRow label='z gamma' tooltip='Modulator response curve — diode intensity vs. drive current is not linear.'
				value={zGamma} min={0.2} max={5} step={0.05} onChange={setZGamma} />

			<SliderRow label='exposure' tooltip='Eye/camera integration time. Longer exposure smooths flicker; this is not phosphor persistence — a laser spot has no afterglow.'
				value={exposureTime} min={5} max={200} step={1} onChange={setExposureTime} formatValue={msFormat} />
			<SliderRow label='glow' tooltip='Bloom strength around bright beam segments.'
				value={glowStrength} min={0} max={1} step={0.02} onChange={setGlowStrength} />
			<SliderRow label='haze' tooltip='Atmospheric-scatter haze around the beam.'
				value={hazeStrength} min={0} max={1} step={0.02} onChange={setHazeStrength} />
			<SliderRow label='white pt' tooltip='Saturation roll-off point for the brightest parts of the beam.'
				value={whitePoint} min={0} max={1} step={0.02} onChange={setWhitePoint} />
		</Box>
	);
}
