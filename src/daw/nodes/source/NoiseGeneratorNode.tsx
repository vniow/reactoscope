import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startNoise, stopNoise, setNoiseType, setNoiseVolume } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwButton, HwToggleButtonGroup } from '../shared/hwComponents';
import { HwSliderField } from '../../../components/hw/HwSliderField';
import type { NoiseFlowNode } from '../../../store/dawTypes';

const NOISE_TYPES = ['white', 'pink', 'brown'] as const;
type NoiseType = typeof NOISE_TYPES[number];

const color = NODE_COLORS.source;

export const NoiseGeneratorNode = memo(function NoiseGeneratorNode({
	id,
	data,
	selected,
}: NodeProps<NoiseFlowNode>) {
	const [isPlaying,  setIsPlaying]      = useState(false);
	const [noiseType,  setNoiseTypeState] = useState<NoiseType>(data.noiseType ?? 'white');
	const [volume,     setVolumeState]    = useState(data.volume ?? -6);

	const handleToggle = async () => {
		if (isPlaying) { stopNoise(id); setIsPlaying(false); }
		else           { await startNoise(id); setIsPlaying(true); }
	};

	const handleTypeSelect = (t: NoiseType) => {
		setNoiseTypeState(t);
		setNoiseType(id, t);
	};

	const handleVolumeChange = (v: number) => {
		setVolumeState(v);
		setNoiseVolume(id, v);
	};

	return (
		<Box sx={{
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			position:        'relative',
			pb:              2,
			boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label='Noise' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>

				{/* Noise type toggle */}
				<Box className='nodrag'>
					<HwToggleButtonGroup color={color} value={noiseType} exclusive
						onChange={(_, v) => v && handleTypeSelect(v as NoiseType)}>
						{NOISE_TYPES.map(t => (
							<ToggleButton key={t} value={t}>{t}</ToggleButton>
						))}
					</HwToggleButtonGroup>
				</Box>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='volume'
						value={volume}
						min={-40} max={0} step={1}
						color={color}
						onChange={handleVolumeChange}
						format={v => String(v)}
						unit='dB'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>

				<HwButton color={color} lit={isPlaying} sx={{ py: 0.4 }}
					onClick={handleToggle} fullWidth className='nodrag'
					aria-label={isPlaying ? 'Stop noise' : 'Start noise'}>
					{isPlaying ? <StopIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
				</HwButton>
			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={bottomOutputHandleStyle(color)}
			/>
		</Box>
	);
});
