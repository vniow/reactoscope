import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import { useDawStore } from '../../../store/daw';
import { NodeHeader } from '../shared/NodeHeader';
import { NODE_COLORS } from '../shared/nodeColors';
import { GRID_UNIT } from '../shared/gridSystem';
import { inputHandleStyle, outputHandleStyle } from '../shared/handleStyles';
import { METAL_BG } from '../shared/metalBackground';
import { HwSwitch } from '../shared/hwComponents';
import { HwArcSlider } from '../../../components/hw/HwArcSlider';
import type { ChannelFlowNode } from '../../../store/dawTypes';

const color = NODE_COLORS.processor;

// PanVol + Solo internally composed (docs/node-roadmap.md). Solo state comes
// from the store, not node data — same cross-instance pattern as SoloNode.tsx
// (ADR-0003): Channel and Solo share Tone's own static solo registry, so
// soloing this instance dims every other Solo/Channel node on the canvas.
export const ChannelNode = memo(function ChannelNode({ id, data, selected }: NodeProps<ChannelFlowNode>) {
	const setNodeParam = useDawStore(s => s.setNodeParam);
	const toggleSolo    = useDawStore(s => s.toggleSolo);
	const soloedNodeId  = useDawStore(s => s.soloedNodeId);
	const isSoloed       = soloedNodeId === id;
	const isMutedByPeer  = soloedNodeId !== null && !isSoloed;

	return (
		<Box sx={{ borderRadius: 1, backgroundImage: METAL_BG, width: 2 * GRID_UNIT, position: 'relative', opacity: isMutedByPeer ? 0.55 : 1, boxShadow: selected ? `0px 4px 15px ${color}4d` : '0px 4px 15px rgba(0,0,0,0.30)' }}>
			<NodeHeader id={id} label='Channel' selected={selected} accentColor={color} filledHeader />

			<Box sx={{ px: 1.75, pt: 2, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75 }} className='nodrag nowheel'>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
					<HwArcSlider label='pan'    value={data.pan}    min={-1}  max={1} step={0.01} color={color} onChange={v => setNodeParam(id, { pan: v })}    format={v => v.toFixed(2)} allowValueEdit allowBoundsEdit />
					<HwArcSlider label='volume' value={data.volume} min={-60} max={6} step={0.5}  color={color} onChange={v => setNodeParam(id, { volume: v })} format={v => v.toFixed(1)} unit='dB' allowValueEdit allowBoundsEdit />
				</Box>
				<Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
					<HwSwitch checked={data.mute} color={color} onChange={() => setNodeParam(id, { mute: !data.mute })} label='mute' />
					<HwSwitch checked={isSoloed}  color={color} onChange={() => toggleSolo(id)}                          label='solo' />
				</Box>
			</Box>

			<Handle type='target' position={Position.Left}  id='in-0'  style={inputHandleStyle(color)} />
			<Handle type='source' position={Position.Right} id='out-0' style={outputHandleStyle(color)} />
		</Box>
	);
});
