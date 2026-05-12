import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useAxis, useEffects } from '../contexts/WoahscopeContext';
import { NODE_COLORS } from '../daw/nodes/nodeColors';
import { hwToggleSx } from '../daw/nodes/hwStyles';

const color = NODE_COLORS.scene;

export function VisualizationControls({ hideCrt = false }: { hideCrt?: boolean }) {
	const { swapXY, setSwapXY, invertXY, setInvertXY } = useAxis();
	const { crtEnabled, setCrtEnabled, lanczosEnabled, setLanczosEnabled } = useEffects();

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
			<ToggleButtonGroup sx={{ ...hwToggleSx(color), flexWrap: 'wrap' }}>
				<ToggleButton value='swapXY'   selected={swapXY}   onChange={() => setSwapXY(!swapXY)}     size='small'>swap XY</ToggleButton>
				<ToggleButton value='invertXY' selected={invertXY} onChange={() => setInvertXY(!invertXY)} size='small'>invert</ToggleButton>
				{!hideCrt && (
					<ToggleButton value='crtEnabled'     selected={crtEnabled}     onChange={() => setCrtEnabled(!crtEnabled)}         size='small'>CRT</ToggleButton>
				)}
				<ToggleButton value='lanczosEnabled' selected={lanczosEnabled} onChange={() => setLanczosEnabled(!lanczosEnabled)} size='small'>smooth</ToggleButton>
			</ToggleButtonGroup>
		</Box>
	);
}
