import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwButton } from '../shared/hwComponents';
import { HwSliderField } from '../../../components/hw/HwSliderField';
import type { PWMOscillatorFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

export const PWMOscillatorNode = memo(function PWMOscillatorNode({
	id,
	data,
	selected,
}: NodeProps<PWMOscillatorFlowNode>) {
	const setNodeParam = useDawStore((s) => s.setNodeParam);
	const startNode = useDawStore((s) => s.startNode);
	const stopNode = useDawStore((s) => s.stopNode);
	const isPlaying = useDawStore((s) => s.playingNodes.has(id));

	const handleToggle = async () => {
		if (isPlaying) stopNode(id);
		else await startNode(id);
	};

	return (
		<Box
			sx={{
				borderRadius: 1,
				backgroundImage: METAL_BG,
				width: 2 * GRID_UNIT,
				position: 'relative',
				pb: 2,
				boxShadow: selected
					? `0px 4px 15px ${color}4d`
					: '0px 4px 15px rgba(0,0,0,0.30)',
			}}
		>
			<NodeHeader
				id={id}
				label='PWM Osc'
				selected={selected}
				accentColor={color}
				filledHeader
			/>

			<Box
				sx={{
					px: 1.75,
					pt: 2,
					pb: 0.75,
					display: 'flex',
					flexDirection: 'column',
					gap: 0.75,
				}}
			>
				<HwButton
					color={color}
					lit={isPlaying}
					sx={{ py: 0.4 }}
					onClick={handleToggle}
					fullWidth
					className='nodrag'
					aria-label={
						isPlaying ? 'Stop PWM oscillator' : 'Start PWM oscillator'
					}
				>
					{isPlaying ? (
						<StopIcon sx={{ fontSize: 13 }} />
					) : (
						<PlayArrowIcon sx={{ fontSize: 13 }} />
					)}
				</HwButton>

				<Box className='nodrag nowheel'>
					<HwSliderField
						label='freq'
						value={data.frequency}
						min={20}
						max={4000}
						step={1}
						color={color}
						onChange={(v) => setNodeParam(id, { frequency: v })}
						format={(v) => String(v)}
						unit='Hz'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='mod freq'
						value={data.modulationFrequency}
						min={0.1}
						max={20}
						step={0.01}
						color={color}
						onChange={(v) => setNodeParam(id, { modulationFrequency: v })}
						format={(v) => v.toFixed(2)}
						unit='Hz'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='detune'
						value={data.detune}
						min={-1200}
						max={1200}
						step={1}
						color={color}
						onChange={(v) => setNodeParam(id, { detune: v })}
						format={(v) => String(v)}
						unit='ct'
						allowValueEdit
						allowBoundsEdit
					/>
				</Box>
				<Box className='nodrag nowheel'>
					<HwSliderField
						label='phase'
						value={data.phase}
						min={0}
						max={360}
						step={1}
						color={color}
						onChange={(v) => setNodeParam(id, { phase: v })}
						format={(v) => String(v)}
						unit='deg'
						allowValueEdit
					/>
				</Box>
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
