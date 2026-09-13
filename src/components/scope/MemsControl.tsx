import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMems } from '../../contexts/MemsContext';
import type { BesselOrder } from '../../dsp/bessel';
import { NODE_COLORS } from '../../daw/nodes/shared/nodeColors';
import { hwToggleSx } from '../../daw/nodes/shared/hwStyles';
import { SliderRow } from './SliderRow';

const color = NODE_COLORS.scene;

const hzFormat = (v: number) => `${Math.round(v)}Hz`;
const msFormat = (v: number) => `${Math.round(v)}ms`;
const decimals2 = (v: number) => v.toFixed(2);
const decimals3 = (v: number) => v.toFixed(3);

export function MemsControl() {
	const {
		enabled, setEnabled, linkAxes, setLinkAxes,
		quasistaticX, setQuasistaticX, quasistaticY, setQuasistaticY,
		setFilterOrder, setResonanceEnabled,
		trackingBlankThreshold, setTrackingBlankThreshold,
		trackingBlankSoftness, setTrackingBlankSoftness,
		spotSize, setSpotSize, power, setPower,
		gainR, setGainR, gainG, setGainG, gainB, setGainB,
		blankFloor, setBlankFloor, zGamma, setZGamma,
		exposureTime, setExposureTime,
		glowStrength, setGlowStrength, hazeStrength, setHazeStrength, whitePoint, setWhitePoint,
	} = useMems();

	// Same reasoning as GalvoControl: while linked, Y's sliders show X's value,
	// so they are disabled rather than relabelled — dragging one would otherwise
	// write silently to quasistaticY with no visible feedback.
	const yDisplay = linkAxes ? quasistaticX : quasistaticY;

	// The margin between the filter corner and the mirror's resonance is the
	// safety relationship this whole device is built around, so it is surfaced
	// right next to the controls that set it rather than buried in a readout.
	const margin = quasistaticX.resonanceFreq / Math.max(1, quasistaticX.cutoff);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<ToggleButtonGroup sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}>
				<Tooltip title='Enable the Quasistatic Model. When off, the beam renders at its commanded position with no band-limiting — a direct A/B against CRT.' placement='top' arrow>
					<ToggleButton value='enabled'  selected={enabled}  onChange={() => setEnabled(!enabled)}   size='small'>scanner</ToggleButton>
				</Tooltip>
				<Tooltip title="Mirror the X axis's parameters onto Y, so both axes share one set of values." placement='top' arrow>
					<ToggleButton value='linkAxes' selected={linkAxes} onChange={() => setLinkAxes(!linkAxes)} size='small'>link XY</ToggleButton>
				</Tooltip>
				<Tooltip title="Model the mirror's own mechanical resonance. With it off the response is overshoot-free at any cutoff; with it on, raising the cutoff toward the resonant frequency makes the mirror ring." placement='top' arrow>
					<ToggleButton
						value='resonance'
						selected={quasistaticX.resonanceEnabled}
						onChange={() => setResonanceEnabled(!quasistaticX.resonanceEnabled)}
						size='small'
					>resonance</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>

			{/* One filter per driver board on real hardware, so this is set once
			    for both axes rather than per-axis. */}
			<ToggleButtonGroup
				sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}
				exclusive
				value={quasistaticX.filterOrder}
				onChange={(_e, v: BesselOrder | null) => v && setFilterOrder(v)}
			>
				<Tooltip title='2nd-order Bessel — the continuous-time filter Mirrorcle offers as an alternative to the standard driver.' placement='top' arrow>
					<ToggleButton value={2} size='small'>2-pole</ToggleButton>
				</Tooltip>
				<Tooltip title='5th-order Bessel — the MAX7413 in the standard Mirrorcle driver.' placement='top' arrow>
					<ToggleButton value={5} size='small'>5-pole</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>

			<SliderRow label='cutoff X' tooltip='Bessel corner frequency for the X axis. On real hardware this is set by a filter clock at 60x the cutoff — Mirrorcle’s worked example is 500Hz. Lower means a softer, more heavily band-limited figure.'
				value={quasistaticX.cutoff} min={20} max={5000} step={10}
				onChange={(v) => setQuasistaticX({ ...quasistaticX, cutoff: v })} formatValue={hzFormat} />
			<SliderRow label={linkAxes ? 'cutoff Y (linked)' : 'cutoff Y'} tooltip='Bessel corner frequency for the Y axis.'
				value={yDisplay.cutoff} min={20} max={5000} step={10} disabled={linkAxes}
				onChange={(v) => setQuasistaticY({ ...quasistaticY, cutoff: v })} formatValue={hzFormat} />

			<SliderRow label='angle limit X' tooltip='Safe deflection ceiling for the X axis, as a fraction of full scale. Models the drive-voltage limit a real mirror must not exceed — it clamps the command, so a resonant mirror can still swing past it.'
				value={quasistaticX.angleLimit} min={0.1} max={1} step={0.01}
				onChange={(v) => setQuasistaticX({ ...quasistaticX, angleLimit: v })} formatValue={decimals2} />
			<SliderRow label={linkAxes ? 'angle limit Y (linked)' : 'angle limit Y'} tooltip='Safe deflection ceiling for the Y axis, as a fraction of full scale.'
				value={yDisplay.angleLimit} min={0.1} max={1} step={0.01} disabled={linkAxes}
				onChange={(v) => setQuasistaticY({ ...quasistaticY, angleLimit: v })} formatValue={decimals2} />

			<SliderRow label='resonance X' tooltip='Mechanical resonant frequency of the X mirror. The filter cutoff is meant to sit well below this; as the two approach, the mirror starts to ring.'
				value={quasistaticX.resonanceFreq} min={200} max={20000} step={50}
				onChange={(v) => setQuasistaticX({ ...quasistaticX, resonanceFreq: v })} formatValue={hzFormat} />
			<SliderRow label={linkAxes ? 'resonance Y (linked)' : 'resonance Y'} tooltip='Mechanical resonant frequency of the Y mirror.'
				value={yDisplay.resonanceFreq} min={200} max={20000} step={50} disabled={linkAxes}
				onChange={(v) => setQuasistaticY({ ...quasistaticY, resonanceFreq: v })} formatValue={hzFormat} />

			<SliderRow label='res Q X' tooltip='Sharpness of the X mirror’s resonance. A MEMS mirror is a high-Q spring-mass structure, so this is far higher than anything physical for a galvo servo.'
				value={quasistaticX.resonanceQ} min={1} max={500} step={1}
				onChange={(v) => setQuasistaticX({ ...quasistaticX, resonanceQ: v })} />
			<SliderRow label={linkAxes ? 'res Q Y (linked)' : 'res Q Y'} tooltip='Sharpness of the Y mirror’s resonance.'
				value={yDisplay.resonanceQ} min={1} max={500} step={1} disabled={linkAxes}
				onChange={(v) => setQuasistaticY({ ...quasistaticY, resonanceQ: v })} />

			{/* Display-only, per ADR-0012 sub-decision 9 — nothing here clamps or
			    corrects. The FCLK figure is the clock a real PicoAmp would need
			    for the current cutoff, at the hardware's fixed 60:1 ratio. */}
			<Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.75, px: 0.25 }}>
				<Tooltip title='Filter clock a real Mirrorcle driver would need for this cutoff (FCLK = cutoff x 60).' placement='top' arrow>
					<span>FCLK {Math.round(quasistaticX.cutoff * 60)}Hz</span>
				</Tooltip>
				<Tooltip title='How far the mirror’s resonance sits above the filter cutoff. Below about 4x, the filter is no longer keeping drive energy away from the resonance.' placement='top' arrow>
					<span style={{ color: margin < 4 ? '#e0736a' : undefined }}>
						margin {margin.toFixed(1)}x
					</span>
				</Tooltip>
			</Box>

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
