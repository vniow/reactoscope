import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { startNoise, stopNoise, setNoiseType, setNoiseVolume } from '../../store/daw';
import { NodeHeader } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { outputHandleStyle, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import { hwSelectSx, hwSelectMenuProps, hwIconBtn, hwIconBtnLit } from './hwStyles';
import { HwSliderField } from '../../components/HwSliderField';
import type { NoiseFlowNode } from '../../store/dawTypes';

const NOISE_TYPES = ['white', 'pink', 'brown'] as const;
type NoiseType = typeof NOISE_TYPES[number];

const color = NODE_COLORS.source;
const nodeSx = {
	select:     hwSelectSx(color),
	selectMenu: hwSelectMenuProps(color),
	iconBtn:    hwIconBtn(color),
	iconBtnLit: hwIconBtnLit(color),
};

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

	const handleTypeChange = (e: SelectChangeEvent) => {
		const t = e.target.value as NoiseType;
		setNoiseTypeState(t);
		setNoiseType(id, t);
	};

	const handleVolumeChange = (v: number) => {
		setVolumeState(v);
		setNoiseVolume(id, v);
	};

	return (
		<Box sx={{
			border:          '1px solid',
			borderColor:     color,
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           2 * GRID_UNIT,
			position:        'relative',
			pb:              2,
		}}>
			<NodeHeader id={id} label='Noise' selected={selected} accentColor={color} />

			<Box sx={{ px: 1, py: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
				<Box className='nodrag'>
					<Select
						value={noiseType}
						onChange={handleTypeChange}
						size='small'
						fullWidth
						sx={nodeSx.select}
						MenuProps={nodeSx.selectMenu}
					>
						{NOISE_TYPES.map(t => (
							<MenuItem key={t} value={t} sx={{ fontSize: 11 }}>{t}</MenuItem>
						))}
					</Select>
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
					/>
				</Box>

				<Box sx={{ display: 'flex', justifyContent: 'center' }} className='nodrag'>
					<IconButton
						onClick={handleToggle}
						size='small'
						aria-label={isPlaying ? 'Stop noise' : 'Start noise'}
						sx={isPlaying ? nodeSx.iconBtnLit : nodeSx.iconBtn}
					>
						{isPlaying ? <StopIcon sx={{ fontSize: 14 }} /> : <PlayArrowIcon sx={{ fontSize: 14 }} />}
					</IconButton>
				</Box>
			</Box>

			<Handle
				type='source'
				position={Position.Bottom}
				id='out-0'
				style={outputHandleStyle(color)}
			/>
			{outputLabel('out', color)}
		</Box>
	);
});
