import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useAxis, useEffects } from '../../contexts/WoahscopeContext';
import { useBeamEmulator, type BeamEmulatorDevice } from '../../contexts/BeamEmulatorContext';
import { NODE_COLORS } from '../../daw/nodes/shared/nodeColors';
import { hwToggleSx } from '../../daw/nodes/shared/hwStyles';

const color = NODE_COLORS.scene;

export function VisualizationControls() {
	const { swapXY, setSwapXY, invertXY, setInvertXY } = useAxis();
	const { crtEnabled, setCrtEnabled, lanczosEnabled, setLanczosEnabled } = useEffects();
	const { device, setDevice } = useBeamEmulator();
	const isGalvo = device === 'galvo';

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
			<ToggleButtonGroup
				sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}
				exclusive
				value={device}
				onChange={(_e, v: BeamEmulatorDevice | null) => v && setDevice(v)}
			>
				<ToggleButton value='crt'   size='small'>CRT</ToggleButton>
				<ToggleButton value='galvo' size='small'>Galvo Laser</ToggleButton>
			</ToggleButtonGroup>

			<ToggleButtonGroup sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}>
				<ToggleButton value='swapXY'   selected={swapXY}   onChange={() => setSwapXY(!swapXY)}     size='small'>swap XY</ToggleButton>
				<ToggleButton value='invertXY' selected={invertXY} onChange={() => setInvertXY(!invertXY)} size='small'>invert</ToggleButton>
				{!isGalvo && (
					// Labelled "mask", not "CRT" — the device selector above already
					// owns that word; this toggles only the noise/shadow-mask texture
					// within CRT mode, a different, narrower thing.
					<ToggleButton value='crtEnabled'     selected={crtEnabled}     onChange={() => setCrtEnabled(!crtEnabled)}         size='small'>mask</ToggleButton>
				)}
				<ToggleButton value='lanczosEnabled' selected={lanczosEnabled} onChange={() => setLanczosEnabled(!lanczosEnabled)} size='small'>smooth</ToggleButton>
			</ToggleButtonGroup>
		</Box>
	);
}
