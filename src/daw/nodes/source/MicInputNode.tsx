import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { startMicInput, stopMicInput } from '../../../audio/engine';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { bottomOutputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { hwIconBtn, hwIconBtnLit } from '../shared/hwStyles';
import type { MicInputFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.source;

export const MicInputNode = memo(function MicInputNode({
	id,
	data,
	selected,
}: NodeProps<MicInputFlowNode>) {
	const [isActive, setIsActive] = useState(false);

	const handleToggle = async () => {
		if (isActive) {
			stopMicInput(id);
			setIsActive(false);
		} else {
			try {
				await startMicInput(id);
				setIsActive(true);
			} catch {
				// Permission denied or device error — stay inactive
			}
		}
	};

	return (
		<Box sx={{
			borderRadius:    1,
			backgroundImage: METAL_BG,
			width:           1 * GRID_UNIT,
			position:        'relative',
			pb:              3,
			boxShadow:       selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)',
		}}>
			<NodeHeader id={id} label={data.label} selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, py: 1.75, display: 'flex', justifyContent: 'center' }}>
				<IconButton
					onClick={handleToggle}
					className='nodrag'
					aria-label={isActive ? 'Deactivate microphone' : 'Activate microphone'}
					sx={{
						...(isActive ? hwIconBtnLit(color) : hwIconBtn(color)),
						width:  44,
						height: 44,
					}}
				>
					{isActive
						? <MicIcon    sx={{ fontSize: 22, color }} />
						: <MicOffIcon sx={{ fontSize: 22 }} />}
				</IconButton>
			</Box>

			<Handle type='source' position={Position.Bottom} id='out-0' style={bottomOutputHandleStyle(color)} />
		</Box>
	);
});
