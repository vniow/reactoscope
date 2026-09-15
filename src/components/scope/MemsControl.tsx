import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMems } from '../../contexts/MemsContext';
import type { FilterFamily } from '../../dsp/filterDesign';
import { MIN_DEVICE_SPS, MAX_DEVICE_SPS } from '../../mems/quasistaticModel';
import { NODE_COLORS } from '../../daw/nodes/shared/nodeColors';
import { hwToggleSx } from '../../daw/nodes/shared/hwStyles';
import { SliderRow } from './SliderRow';
import { LaserReadoutRow } from './LaserReadoutRow';

const color = NODE_COLORS.scene;

const hzFormat = (v: number) => `${Math.round(v)}Hz`;
const spsFormat = (v: number) => `${Math.round(v)}/s`;
const msFormat = (v: number) => `${Math.round(v)}ms`;
const intFormat = (v: number) => String(Math.round(v));
const decimals2 = (v: number) => v.toFixed(2);
const decimals3 = (v: number) => v.toFixed(3);

export function MemsControl() {
	const {
		enabled, setEnabled, linkAxes, setLinkAxes,
		quasistaticX, setQuasistaticX, quasistaticY, setQuasistaticY,
		setDeviceSampleRate, setFilterType, setFilterOrder, setZeroPhase, setResonanceEnabled,
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
	// safety relationship this device is built around, so it sits next to the
	// controls that set it rather than in a readout somewhere else.
	const margin = quasistaticX.resonanceFreq / Math.max(1, quasistaticX.cutoff);
	// SetupSoftwareFilter takes cutoffFreq alongside sampleFreq; their ratio is
	// the number that actually determines the filter's shape in the device.
	const normalisedCutoff = quasistaticX.cutoff / Math.max(1, quasistaticX.deviceSampleRate);

	// How many fully-settled point-to-point moves the current cutoff buys, which
	// is the actionable form of "how fast can this go". Anchored on the single
	// vendor data point — ~500us settling at a 2200Hz lowpass, from Mirrorcle's
	// Advanced MEMS Control guide — and scaled as 1/cutoff. Derived, not
	// specified: see docs/mems-device-limits.html.
	const settleSeconds = (500e-6 * 2200) / Math.max(1, quasistaticX.cutoff);
	const settledMoves  = 1 / settleSeconds;

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
				<Tooltip title="Forward-backward filtering, the default in PlayzerX's FilterData. Removes group delay entirely, so the figure is band-limited without being displaced — at the cost of applying the response twice, which puts the corner at -6dB instead of -3dB. Turn it off to see the causal, streaming case." placement='top' arrow>
					<ToggleButton
						value='zeroPhase'
						selected={quasistaticX.zeroPhase}
						onChange={() => setZeroPhase(!quasistaticX.zeroPhase)}
						size='small'
					>zero-phase</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>

			{/* MTIDataGenerator's FilterType enum begins Bessel, Butterworth.
			    One filter is configured across both channels, so this is set
			    once rather than per-axis. */}
			<ToggleButtonGroup
				sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}
				exclusive
				value={quasistaticX.filterType}
				onChange={(_e, v: FilterFamily | null) => v && setFilterType(v)}
			>
				<Tooltip title='Bessel — flat group delay, so the figure is delayed uniformly rather than reshaped. Corners soften instead of overshooting.' placement='top' arrow>
					<ToggleButton value='bessel' size='small'>bessel</ToggleButton>
				</Tooltip>
				<Tooltip title='Butterworth — flatter amplitude response, but group delay varies sharply across the passband, so corners overshoot and ring much like a galvo servo.' placement='top' arrow>
					<ToggleButton value='butterworth' size='small'>butterworth</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>

			<SliderRow label='filter order' tooltip='Order of the software filter. Higher is a steeper rolloff (about 6dB/octave per order). Zero-phase doubles the effective order on top of this.'
				value={quasistaticX.filterOrder} min={1} max={8} step={1}
				onChange={setFilterOrder} formatValue={intFormat} />

			<SliderRow label='device rate' tooltip="The Controller's own output rate — PlayzerX's SetSampleRate. Its buffer is read at this many samples per second, so a commanded position only updates that often however fast the host streams. The demo treats anything outside 500–60000 as invalid."
				value={quasistaticX.deviceSampleRate} min={MIN_DEVICE_SPS} max={MAX_DEVICE_SPS} step={100}
				onChange={setDeviceSampleRate} formatValue={spsFormat} />

			<SliderRow label='cutoff X' tooltip='Software filter -3dB corner for the X axis. Lower means a more heavily band-limited figure.'
				value={quasistaticX.cutoff} min={20} max={8000} step={10}
				onChange={(v) => setQuasistaticX({ ...quasistaticX, cutoff: v })} formatValue={hzFormat} />
			<SliderRow label={linkAxes ? 'cutoff Y (linked)' : 'cutoff Y'} tooltip="Software filter corner for the Y axis. RQWaveform takes a separate yBandwidth for exactly this reason — the slow axis need not be filtered like the fast one."
				value={yDisplay.cutoff} min={20} max={8000} step={10} disabled={linkAxes}
				onChange={(v) => setQuasistaticY({ ...quasistaticY, cutoff: v })} formatValue={hzFormat} />

			<SliderRow label='angle limit X' tooltip='Safe deflection ceiling for the X axis, as a fraction of full scale — the VdifferenceMax analog. It clamps the command, so a resonant mirror can still swing past it.'
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
			    corrects. */}
			<Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.75, px: 0.25 }}>
				<Tooltip title='Cutoff as a fraction of the device output rate — the cutoffFreq/sampleFreq ratio SetupSoftwareFilter is configured with, and what actually fixes the filter’s shape in the device.' placement='top' arrow>
					<span>fc/sps {normalisedCutoff.toFixed(3)}</span>
				</Tooltip>
				<Tooltip title='Roughly how many fully-settled point-to-point moves per second this cutoff allows. Derived by scaling Mirrorcle’s measured ~500µs settling at a 2200Hz lowpass — an estimate, not a specification.' placement='top' arrow>
					<span>~{Math.round(settledMoves)} settled/s</span>
				</Tooltip>
				<Tooltip title='How far the mirror’s resonance sits above the filter cutoff. Below about 4x, the filter is no longer keeping drive energy away from the resonance.' placement='top' arrow>
					<span style={{ color: margin < 4 ? '#e0736a' : undefined }}>
						margin {margin.toFixed(1)}x
					</span>
				</Tooltip>
			</Box>

			<LaserReadoutRow />

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
