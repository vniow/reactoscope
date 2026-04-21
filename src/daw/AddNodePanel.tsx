import { useCallback, useRef, useState } from 'react';
import { ControlButton, useReactFlow } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { useDawStore } from '../store/daw';
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
export function AddNodePanel() {
	const [open, setOpen] = useState(false);
	const { screenToFlowPosition } = useReactFlow();
	const containerRef = useRef<HTMLDivElement>(null);

	const addOscillatorNode = useDawStore(s => s.addOscillatorNode);
	const addGainNode       = useDawStore(s => s.addGainNode);
	const addNoiseNode      = useDawStore(s => s.addNoiseNode);
	const addDCSignalNode   = useDawStore(s => s.addDCSignalNode);
	const addPlayerNode     = useDawStore(s => s.addPlayerNode);
	const addStubNode       = useDawStore(s => s.addStubNode);

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
		} else if (STUB_ACTIONS.has(action)) {
			addStubNode(action as StubKind, pos);
		}
		setOpen(false);
	}, [getDropPosition, addOscillatorNode, addGainNode, addNoiseNode, addDCSignalNode, addPlayerNode, addStubNode]);

	return (
		<div ref={containerRef} style={{ position: 'relative' }}>
			<ControlButton
				onClick={() => setOpen(v => !v)}
				title='Add node'
				aria-label='Add node'
				style={{ color: open ? '#22dd22' : undefined }}
			>
				<AddIcon style={{ width: 16, height: 16 }} />
			</ControlButton>

			{open && (
				<Box
					className='nodrag nopan'
					onMouseDown={e => e.stopPropagation()}
					sx={{
						position:    'absolute',
						bottom:      '100%',
						left:        0,
						mb:          0.5,
						bgcolor:     'background.paper',
						border:      '1px solid',
						borderColor: 'divider',
						borderRadius: 1,
						p:           1.5,
						minWidth:    170,
						zIndex:      100,
						boxShadow:   4,
					}}
				>
					{CATALOGUE.map(category => (
						<Box key={category.label} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
							<Typography
								variant='caption'
								color='text.disabled'
								sx={{ fontWeight: 700, letterSpacing: 1, display: 'block', mb: 0.25 }}
							>
								{category.label.toUpperCase()}
							</Typography>
							{category.items.map(item => (
								<Button
									key={item.action}
									onClick={() => handleAdd(item.action)}
									size='small'
									variant='text'
									fullWidth
									sx={{
										justifyContent: 'flex-start',
										py:             0.25,
										px:             0.5,
										minHeight:      0,
										color:          'text.primary',
										fontSize:       12,
										fontWeight:     400,
										textTransform:  'none',
									}}
								>
									{item.label}
								</Button>
							))}
						</Box>
					))}
				</Box>
			)}
		</div>
	);
}
