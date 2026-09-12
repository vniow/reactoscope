import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
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
				<Tooltip title='Oscilloscope CRT — draws the beam at its commanded position, with no mechanical lag.' placement='top' arrow>
					<ToggleButton value='crt'   size='small'>CRT</ToggleButton>
				</Tooltip>
				<Tooltip title='Galvanometer-mirror laser projector — draws the beam where the simulated mirror actually ends up, including lag and overshoot.' placement='top' arrow>
					<ToggleButton value='galvo' size='small'>Galvo Laser</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>

			<ToggleButtonGroup sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}>
				<Tooltip title='Swap the X and Y channels before drawing.' placement='top' arrow>
					<ToggleButton value='swapXY'   selected={swapXY}   onChange={() => setSwapXY(!swapXY)}     size='small'>swap XY</ToggleButton>
				</Tooltip>
				<Tooltip title='Invert both X and Y deflection.' placement='top' arrow>
					<ToggleButton value='invertXY' selected={invertXY} onChange={() => setInvertXY(!invertXY)} size='small'>invert</ToggleButton>
				</Tooltip>
				{!isGalvo && (
					// Labelled "mask", not "CRT" — the device selector above already
					// owns that word; this toggles only the noise/shadow-mask texture
					// within CRT mode, a different, narrower thing.
					<Tooltip title='Shadow-mask / noise texture overlay for the CRT phosphor look.' placement='top' arrow>
						<ToggleButton value='crtEnabled'     selected={crtEnabled}     onChange={() => setCrtEnabled(!crtEnabled)}         size='small'>mask</ToggleButton>
					</Tooltip>
				)}
				<Tooltip title='Lanczos-upsample the beam path for smoother curves.' placement='top' arrow>
					<ToggleButton value='lanczosEnabled' selected={lanczosEnabled} onChange={() => setLanczosEnabled(!lanczosEnabled)} size='small'>smooth</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>
		</Box>
	);
}
