import { memo, Fragment } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { NodeHeader, NODE_HEADER_HEIGHT } from './NodeHeader';
import { NODE_COLORS } from './nodeColors';
import { GRID_UNIT } from './gridSystem';
import { inputHandleStyle, outputHandleStyle, inputLabel, outputLabel } from './handleStyles';
import { METAL_BG } from './metalBackground';
import type { StubFlowNode, StubKind } from '../../../store/dawTypes';

// Only entries that differ from the default mono in → mono out topology.
const STUB_TOPOLOGY: Partial<Record<StubKind, { inputs: string[]; outputs: string[] }>> = {
	noiseGenerator: { inputs: [],               outputs: ['out-0'] },
	panner:         { inputs: ['in-0'],         outputs: ['out-0', 'out-1'] },
	multibandSplit: { inputs: ['in-0'],         outputs: ['out-0', 'out-1', 'out-2'] },
	crossFade:      { inputs: ['in-0', 'in-1'], outputs: ['out-0'] },
	// Source-like stubs (instruments, oscillators) have no audio input
	synth:          { inputs: [], outputs: ['out-0'] },
	monoSynth:      { inputs: [], outputs: ['out-0'] },
	polySynth:      { inputs: [], outputs: ['out-0'] },
	fmSynth:        { inputs: [], outputs: ['out-0'] },
	amSynth:        { inputs: [], outputs: ['out-0'] },
	duoSynth:       { inputs: [], outputs: ['out-0'] },
	membraneSynth:  { inputs: [], outputs: ['out-0'] },
	metalSynth:     { inputs: [], outputs: ['out-0'] },
	noiseSynth:     { inputs: [], outputs: ['out-0'] },
	pluckSynth:     { inputs: [], outputs: ['out-0'] },
	sampler:        { inputs: [], outputs: ['out-0'] },
	omniOscillator: { inputs: [], outputs: ['out-0'] },
	players:        { inputs: [], outputs: ['out-0'] },
	userMedia:      { inputs: [], outputs: ['out-0'] },
};

const DEFAULT_TOPO = { inputs: ['in-0'], outputs: ['out-0'] };

function getHandleTop(index: number, total: number): string {
	const fraction = total === 1 ? 0.5 : (index + 1) / (total + 1);
	return `calc(${NODE_HEADER_HEIGHT}px + ${fraction} * (100% - ${NODE_HEADER_HEIGHT}px))`;
}

function getHandleLeft(index: number, total: number): string {
	if (total === 1) return '50%';
	return `${((index + 1) / (total + 1)) * 100}%`;
}

export const StubNode = memo(function StubNode({
	id,
	data,
	selected,
}: NodeProps<StubFlowNode>) {
	const topo = STUB_TOPOLOGY[data.kind] ?? DEFAULT_TOPO;

	return (
		<Box sx={{
			border:       '1px dashed',
			borderColor:  NODE_COLORS.processor,
			borderRadius: 1,
			backgroundImage: METAL_BG,
			width:        2 * GRID_UNIT,
			height:       2 * GRID_UNIT,
			position:     'relative',
			opacity:      0.8,
			pb:           3,
		}}>
			<NodeHeader id={id} label={data.label} selected={selected} accentColor={NODE_COLORS.processor} />

			<Box sx={{ px: 1.5, py: 1, textAlign: 'center' }}>
				<Typography variant='caption' color='text.disabled' sx={{ fontSize: 9 }}>
					stub
				</Typography>
			</Box>

			{topo.inputs.map((handleId, i) => {
				const top = getHandleTop(i, topo.inputs.length);
				const label = topo.inputs.length === 1 ? 'in' : `in ${i}`;
				return (
					<Fragment key={handleId}>
						<Handle type='target' position={Position.Left} id={handleId}
							style={{ ...inputHandleStyle(NODE_COLORS.processor), top }} />
						{inputLabel(label, top, NODE_COLORS.processor)}
					</Fragment>
				);
			})}

			{topo.outputs.map((handleId, i) => {
				const left = getHandleLeft(i, topo.outputs.length);
				const label = topo.outputs.length === 1 ? 'out' : `out ${i}`;
				return (
					<Fragment key={handleId}>
						<Handle type='source' position={Position.Bottom} id={handleId}
							style={{ ...outputHandleStyle(NODE_COLORS.processor), left }} />
						{outputLabel(label, NODE_COLORS.processor, left)}
					</Fragment>
				);
			})}
		</Box>
	);
});
