import { useCallback, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { useDawStore } from '../store/daw';
import { NODE_COLORS } from './nodes/nodeColors';
import { METAL_BG }    from './nodes/metalBackground';
import { hwBtn, hwIconBtn, hwIconBtnLit } from './nodes/hwStyles';

const CATEGORY_COLORS: Record<string, string> = {
	'Sources':    NODE_COLORS.source,
	'Effects':    NODE_COLORS.effects,
	'Processing': NODE_COLORS.processor,
	'Routing':    NODE_COLORS.utility,
	'Utility':    NODE_COLORS.debug,
};
import type { StubKind } from '../store/dawTypes';

// ─── Node catalogue ───────────────────────────────────────────────────────────

type CatalogueItem = {
	label:  string;
	action: string;
};

type CatalogueCategory = {
	label: string;
	items: CatalogueItem[];
};

const CATALOGUE: CatalogueCategory[] = [
	{
		label: 'Sources',
		items: [
			{ label: 'Oscillator',      action: 'oscillator' },
			{ label: 'Player',          action: 'player' },
			{ label: 'Noise Generator', action: 'noiseGenerator' },
			{ label: 'DC Signal',       action: 'dcSignal' },
		],
	},
	{
		label: 'Effects',
		items: [
			{ label: 'Reverb',     action: 'reverb' },
			{ label: 'Delay',      action: 'delay' },
			{ label: 'Distortion', action: 'distortion' },
		],
	},
	{
		label: 'Processing',
		items: [
			{ label: 'Gain',       action: 'gain' },
			{ label: 'Filter',     action: 'filter' },
			{ label: 'Compressor', action: 'compressor' },
			{ label: 'Panner',     action: 'panner' },
		],
	},
	{
		label: 'Routing',
		items: [
			{ label: 'Split', action: 'split' },
			{ label: 'Merge', action: 'merge' },
		],
	},
	{
		label: 'Utility',
		items: [
			{ label: 'Debug', action: 'debug' },
		],
	},
];

const STUB_ACTIONS = new Set<string>([
	'reverb', 'delay', 'distortion', 'filter', 'compressor',
	'panner', 'split', 'merge',
]);

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders a ControlButton that opens a floating add-node panel.
 * Must be rendered inside the <Controls> component which is inside <ReactFlow>.
 */
export function AddNodePanel({ columnsSwapped }: { columnsSwapped: boolean }) {
	const [open, setOpen] = useState(false);
	const color = NODE_COLORS.scene;
	const { screenToFlowPosition } = useReactFlow();
	const containerRef = useRef<HTMLDivElement>(null);

	const addOscillatorNode = useDawStore(s => s.addOscillatorNode);
	const addGainNode       = useDawStore(s => s.addGainNode);
	const addNoiseNode      = useDawStore(s => s.addNoiseNode);
	const addDCSignalNode   = useDawStore(s => s.addDCSignalNode);
	const addPlayerNode     = useDawStore(s => s.addPlayerNode);
	const addStubNode       = useDawStore(s => s.addStubNode);
	const addDebugNode      = useDawStore(s => s.addDebugNode);

	/** Convert screen center of the React Flow canvas to flow coordinates. */
	const getDropPosition = useCallback((): { x: number; y: number } => {
		const rfEl = document.querySelector<HTMLElement>('.react-flow');
		const rect = rfEl?.getBoundingClientRect();
		const cx = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
		const cy = rect ? rect.top  + rect.height / 2 : window.innerHeight / 2;
		const pos = screenToFlowPosition({ x: cx, y: cy });
		// Small jitter so rapidly added nodes don't stack perfectly
		return {
			x: pos.x + (Math.random() - 0.5) * 60,
			y: pos.y + (Math.random() - 0.5) * 60,
		};
	}, [screenToFlowPosition]);

	const handleAdd = useCallback((action: string) => {
		const pos = getDropPosition();
		if (action === 'oscillator') {
			addOscillatorNode(pos);
		} else if (action === 'gain') {
			addGainNode(pos);
		} else if (action === 'noiseGenerator') {
			addNoiseNode(pos);
		} else if (action === 'dcSignal') {
			addDCSignalNode(pos);
		} else if (action === 'player') {
			// Empty trackUrl — user picks a track using the in-node selector
			addPlayerNode('', pos);
		} else if (action === 'debug') {
			addDebugNode(pos);
		} else if (STUB_ACTIONS.has(action)) {
			addStubNode(action as StubKind, pos);
		}
		setOpen(false);
	}, [getDropPosition, addOscillatorNode, addGainNode, addNoiseNode, addDCSignalNode, addPlayerNode, addStubNode, addDebugNode]);

	return (
		<div ref={containerRef} style={{ position: 'relative' }}>
			<IconButton
				size='small'
				onClick={() => setOpen(v => !v)}
				title='Add node'
				aria-label='Add node'
				sx={open ? { ...hwIconBtnLit(color), p: 0.5 } : { ...hwIconBtn(color), p: 0.5 }}
			>
				<AddIcon sx={{ fontSize: 12 }} />
			</IconButton>

			{open && (
				<Box
					className='nodrag nopan'
					onMouseDown={e => e.stopPropagation()}
					sx={{
						position:        'absolute',
						top:             0,
						...(columnsSwapped
							? { right: 'calc(100% + 4px)' }
							: { left:  'calc(100% + 4px)' }
						),
						backgroundImage: METAL_BG,
						border:          `1px solid ${color}40`,
						borderRadius:    1,
						p:               1.5,
						minWidth:        170,
						zIndex:          100,
						boxShadow:       `0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px ${color}18`,
					}}
				>
					{CATALOGUE.map(category => {
						const catColor = CATEGORY_COLORS[category.label] ?? color;
						return (
							<Box key={category.label} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
								<Typography
									variant='caption'
									sx={{ fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', mb: 0.5, color: catColor, opacity: 0.8 }}
								>
									{category.label}
								</Typography>
								{category.items.map(item => (
									<Button
										key={item.action}
										onClick={() => handleAdd(item.action)}
										sx={{ ...hwBtn(catColor), justifyContent: 'flex-start', width: '100%' }}
									>
										{item.label}
									</Button>
								))}
							</Box>
						);
					})}
				</Box>
			)}
		</div>
	);
}
