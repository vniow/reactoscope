import Box from '@mui/material/Box';
import { useAxis, useEffects } from '../../contexts/WoahscopeContext';
import { useBeamEmulator } from '../../contexts/BeamEmulatorContext';
import { SliderRow } from './SliderRow';

const signedFormat = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
const roundedFormat = (v: number) => String(Math.round(v));
const pow2Format = (v: number) => String(1 << v);
const pow2Parse = (s: string) => Math.round(Math.log2(Math.max(1, parseFloat(s))));

export function EffectsControl() {
	const { intensity, setIntensity } = useAxis();
	const { device } = useBeamEmulator();
	const {
		persistence, setPersistence,
		glowStrength, setGlowStrength,
		scatterStrength, setScatterStrength,
		lanczosEnabled, lanczosSteps, setLanczosSteps,
		nSamples, setNSamples,
		coordBufferSize, setCoordBufferSize,
	} = useEffects();

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<SliderRow label='intensity' tooltip='Overall beam brightness multiplier.'
				value={intensity} min={-2} max={4} step={0.1} onChange={setIntensity} formatValue={signedFormat} />
			{device === 'crt' && (
				<>
					{/* persistence/glow/scatter are CRT phosphor concepts (see
					    CONTEXT.md, docs/galvo-laser-emulator.md's "Exposure is not
					    persistence"). GalvoControl has its own glow/haze sliders
					    driving different code — showing both here would be two
					    "glow" sliders controlling different things under one label. */}
					<SliderRow label='persistence' tooltip='How long the CRT phosphor keeps glowing after the beam passes (phosphor decay, distinct from eye/camera integration).'
						value={persistence} min={0} max={4} step={0.1} onChange={setPersistence} formatValue={signedFormat} />
					<SliderRow label='glow' tooltip='Bloom strength around bright beam segments.'
						value={glowStrength} min={0} max={4} step={0.05} onChange={setGlowStrength} formatValue={signedFormat} />
					<SliderRow label='scatter' tooltip='Atmospheric-scatter haze around the beam.'
						value={scatterStrength} min={0} max={2} step={0.05} onChange={setScatterStrength} formatValue={signedFormat} />
				</>
			)}
			{lanczosEnabled && (
				<SliderRow label='smooth steps' tooltip='Number of Lanczos taps used to smooth the beam path. Higher looks smoother but costs more to render.'
					value={lanczosSteps} min={1} max={8} step={1} onChange={setLanczosSteps} formatValue={roundedFormat} />
			)}
			<SliderRow label='samples' tooltip='Points sampled per frame from the audio waveform. Higher gives finer detail at a higher rendering cost.'
				value={Math.log2(nSamples)} min={8} max={11} step={1}
				onChange={(v) => setNSamples(1 << v)} formatValue={pow2Format} parseValue={pow2Parse} />
			<SliderRow label='coord buf' tooltip='Size of the coordinate buffer used to scan scene geometry into the beam path. Larger supports more complex scenes at a higher rendering cost.'
				value={Math.log2(coordBufferSize)} min={8} max={12} step={1}
				onChange={(v) => setCoordBufferSize(1 << v)} formatValue={pow2Format} parseValue={pow2Parse} />
		</Box>
	);
}
