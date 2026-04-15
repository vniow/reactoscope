import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import { useAxis, useEffects } from '../contexts/WoahscopeContext';

const toggleSx = {
	'&.Mui-selected, &.Mui-selected:hover': {
		color: 'primary.main',
		borderColor: 'primary.main',
		bgcolor: 'rgba(34, 221, 34, 0.12)',
	},
} as const;

export function VisualizationControls() {
	const { swapXY, setSwapXY, invertXY, setInvertXY } = useAxis();
	const { crtEnabled, setCrtEnabled, lanczosEnabled, setLanczosEnabled } = useEffects();

	return (
		<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
			<ToggleButton
				value='swapXY'
				selected={swapXY}
				onChange={() => setSwapXY(!swapXY)}
				size='small'
				sx={toggleSx}
			>
				swap XY
			</ToggleButton>
			<ToggleButton
				value='invertXY'
				selected={invertXY}
				onChange={() => setInvertXY(!invertXY)}
				size='small'
				sx={toggleSx}
			>
				invert
			</ToggleButton>
			<ToggleButton
				value='crtEnabled'
				selected={crtEnabled}
				onChange={() => setCrtEnabled(!crtEnabled)}
				size='small'
				sx={toggleSx}
			>
				CRT
			</ToggleButton>
		<ToggleButton
			value='lanczosEnabled'
			selected={lanczosEnabled}
			onChange={() => setLanczosEnabled(!lanczosEnabled)}
			size='small'
			sx={toggleSx}
		>
			smooth
		</ToggleButton>
		</Box>
	);
}
