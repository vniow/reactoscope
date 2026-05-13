import { useCallback, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useDawStore } from '../store/daw';
import { NODE_COLORS } from './nodes/nodeColors';
import { METAL_BG } from './nodes/metalBackground';
import { HW_INSET, hwBtn, hwIconBtn, hwIconBtnLit } from './nodes/hwStyles';
import type { StubKind } from '../store/dawTypes';

// ─── Catalogue data ───────────────────────────────────────────────────────────

type CatalogueItem = {
	label:  string;   // full Tone.js class name — shown in tooltip + used for filtering
	action: string;   // store dispatch key
	abbr:   string;   // 3–5 char chip label
};

type CatalogueCategory = {
	label: string;
	color: string;
	items: CatalogueItem[];
};

const CATALOGUE: CatalogueCategory[] = [
	{
		label: 'Source',
		color: NODE_COLORS.source,
		items: [
			{ label: 'Oscillator',      action: 'oscillator',      abbr: 'OSC'  },
			{ label: 'FMOscillator',    action: 'fmOscillator',    abbr: 'FMOC' },
			{ label: 'AMOscillator',    action: 'amOscillator',    abbr: 'AMOC' },
			{ label: 'FatOscillator',   action: 'fatOscillator',   abbr: 'FTOC' },
			{ label: 'PulseOscillator', action: 'pulseOscillator', abbr: 'PUOC' },
			{ label: 'PWMOscillator',   action: 'pwmOscillator',   abbr: 'PWMO' },
			{ label: 'OmniOscillator',  action: 'omniOscillator',  abbr: 'OMNI' },
			{ label: 'Noise',           action: 'noiseGenerator',  abbr: 'NOIS' },
			{ label: 'Player',          action: 'player',          abbr: 'PLY'  },
			{ label: 'Players',         action: 'players',         abbr: 'PLYS' },
			{ label: 'GrainPlayer',     action: 'grainPlayer',     abbr: 'GRPD' },
			{ label: 'UserMedia',       action: 'userMedia',       abbr: 'UMED' },
			{ label: 'LFO',             action: 'lfo',             abbr: 'LFO'  },
			{ label: 'DCSignal',        action: 'dcSignal',        abbr: 'DC'   },
		],
	},
	{
		label: 'Instrument',
		color: NODE_COLORS.source,
		items: [
			{ label: 'Synth',          action: 'synth',          abbr: 'SYN'  },
			{ label: 'MonoSynth',      action: 'monoSynth',      abbr: 'MSYN' },
			{ label: 'PolySynth',      action: 'polySynth',      abbr: 'PSYN' },
			{ label: 'FMSynth',        action: 'fmSynth',        abbr: 'FMSY' },
			{ label: 'AMSynth',        action: 'amSynth',        abbr: 'AMSY' },
			{ label: 'DuoSynth',       action: 'duoSynth',       abbr: 'DUSY' },
			{ label: 'MembraneSynth',  action: 'membraneSynth',  abbr: 'MBSY' },
			{ label: 'MetalSynth',     action: 'metalSynth',     abbr: 'MTSY' },
			{ label: 'NoiseSynth',     action: 'noiseSynth',     abbr: 'NZSY' },
			{ label: 'PluckSynth',     action: 'pluckSynth',     abbr: 'PLSY' },
			{ label: 'Sampler',        action: 'sampler',        abbr: 'SMPL' },
		],
	},
	{
		label: 'Effect',
		color: NODE_COLORS.effects,
		items: [
			{ label: 'Reverb',            action: 'reverb',           abbr: 'REV'  },
			{ label: 'JCReverb',          action: 'jcReverb',         abbr: 'JCRV' },
			{ label: 'Freeverb',          action: 'freeverb',         abbr: 'FRV'  },
			{ label: 'Delay',             action: 'delay',            abbr: 'DLY'  },
			{ label: 'FeedbackDelay',     action: 'feedbackDelay',    abbr: 'FBDL' },
			{ label: 'PingPongDelay',     action: 'pingPongDelay',    abbr: 'PPDL' },
			{ label: 'Chorus',            action: 'chorus',           abbr: 'CHR'  },
			{ label: 'Phaser',            action: 'phaser',           abbr: 'PHS'  },
			{ label: 'Tremolo',           action: 'tremolo',          abbr: 'TRML' },
			{ label: 'Vibrato',           action: 'vibrato',          abbr: 'VIB'  },
			{ label: 'Distortion',        action: 'distortion',       abbr: 'DIST' },
			{ label: 'Chebyshev',         action: 'chebyshev',        abbr: 'CHB'  },
			{ label: 'BitCrusher',        action: 'bitCrusher',       abbr: 'BIT'  },
			{ label: 'AutoFilter',        action: 'autoFilter',       abbr: 'AFLT' },
			{ label: 'AutoPanner',        action: 'autoPanner',       abbr: 'APAN' },
			{ label: 'AutoWah',           action: 'autoWah',          abbr: 'AWAH' },
			{ label: 'FrequencyShifter',  action: 'frequencyShifter', abbr: 'FSHF' },
			{ label: 'PitchShift',        action: 'pitchShift',       abbr: 'PTSH' },
			{ label: 'StereoWidener',     action: 'stereoWidener',    abbr: 'SWDN' },
		],
	},
	{
		label: 'Dynamics',
		color: NODE_COLORS.dynamics,
		items: [
			{ label: 'Compressor',           action: 'compressor',           abbr: 'COMP' },
			{ label: 'Limiter',              action: 'limiter',              abbr: 'LIM'  },
			{ label: 'Gate',                 action: 'gate',                 abbr: 'GATE' },
			{ label: 'MidSideCompressor',    action: 'midSideCompressor',    abbr: 'MSCM' },
			{ label: 'MultibandCompressor',  action: 'multibandCompressor',  abbr: 'MBCM' },
		],
	},
	{
		label: 'Processing',
		color: NODE_COLORS.processor,
		items: [
			{ label: 'Gain',           action: 'gain',          abbr: 'GAIN' },
			{ label: 'Filter',         action: 'filter',        abbr: 'FILT' },
			{ label: 'BiquadFilter',   action: 'biquadFilter',  abbr: 'BQFL' },
			{ label: 'EQ3',            action: 'eq3',           abbr: 'EQ3'  },
			{ label: 'Channel',        action: 'channel',       abbr: 'CHNL' },
			{ label: 'PanVol',         action: 'panVol',        abbr: 'PANV' },
			{ label: 'Panner',         action: 'panner',        abbr: 'PAN'  },
			{ label: 'Panner3D',       action: 'panner3d',      abbr: 'P3D'  },
			{ label: 'CrossFade',      action: 'crossFade',     abbr: 'XFAD' },
			{ label: 'Split',          action: 'split',         abbr: 'SPLT' },
			{ label: 'Merge',          action: 'merge',         abbr: 'MERG' },
			{ label: 'Mono',           action: 'mono',          abbr: 'MONO' },
			{ label: 'MultibandSplit', action: 'multibandSplit', abbr: 'MBSP' },
			{ label: 'Solo',           action: 'solo',          abbr: 'SOLO' },
			{ label: 'Volume',         action: 'volume',        abbr: 'VOL'  },
			{ label: 'Convolver',      action: 'convolver',     abbr: 'CNVL' },
		],
	},
	{
		label: 'Analysis',
		color: NODE_COLORS.utility,
		items: [
			{ label: 'Analyser',             action: 'analyser',            abbr: 'ANLY' },
			{ label: 'FFT',                  action: 'fft',                 abbr: 'FFT'  },
			{ label: 'Meter',                action: 'meter',               abbr: 'MTER' },
			{ label: 'DCMeter',              action: 'dcMeter',             abbr: 'DCMT' },
			{ label: 'Waveform',             action: 'waveform',            abbr: 'WAVE' },
			{ label: 'Follower',             action: 'follower',            abbr: 'FLWR' },
			{ label: 'Recorder',             action: 'recorder',            abbr: 'REC'  },
			{ label: 'AmplitudeEnvelope',    action: 'amplitudeEnvelope',   abbr: 'AENV' },
			{ label: 'FrequencyEnvelope',    action: 'frequencyEnvelope',   abbr: 'FENV' },
		],
	},
	{
		label: 'Signal',
		color: NODE_COLORS.utility,
		items: [
			{ label: 'Signal',       action: 'signal',       abbr: 'SIG'  },
			{ label: 'WaveShaper',   action: 'waveShaper',   abbr: 'WSHP' },
			{ label: 'Scale',        action: 'scale',        abbr: 'SCAL' },
			{ label: 'ScaleExp',     action: 'scaleExp',     abbr: 'SCEX' },
			{ label: 'Abs',          action: 'abs',          abbr: 'ABS'  },
			{ label: 'Add',          action: 'add',          abbr: 'ADD'  },
			{ label: 'Multiply',     action: 'multiply',     abbr: 'MULT' },
			{ label: 'Negate',       action: 'negate',       abbr: 'NEG'  },
			{ label: 'GreaterThan',  action: 'greaterThan',  abbr: 'GT'   },
			{ label: 'AudioToGain',  action: 'audioToGain',  abbr: 'A2G'  },
			{ label: 'GainToAudio',  action: 'gainToAudio',  abbr: 'G2A'  },
		],
	},
	{
		label: 'Event',
		color: NODE_COLORS.utility,
		items: [
			{ label: 'Loop',       action: 'loop',      abbr: 'LOOP' },
			{ label: 'Sequence',   action: 'sequence',  abbr: 'SEQ'  },
			{ label: 'Pattern',    action: 'pattern',   abbr: 'PTRN' },
			{ label: 'Part',       action: 'part',      abbr: 'PART' },
			{ label: 'ToneEvent',  action: 'toneEvent', abbr: 'EVT'  },
		],
	},
	{
		label: 'Utility',
		color: NODE_COLORS.debug,
		items: [
			{ label: 'Debug', action: 'debug', abbr: 'DBG' },
		],
	},
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AddNodePanel({ columnsSwapped, onOpenChange }: { columnsSwapped: boolean; onOpenChange?: (open: boolean) => void }) {
	const [open, setOpen]     = useState(false);
	const [filter, setFilter] = useState('');
	const setOpenTracked = useCallback((v: boolean) => { setOpen(v); onOpenChange?.(v); }, [onOpenChange]);
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

	const getDropPosition = useCallback((): { x: number; y: number } => {
		const rfEl = document.querySelector<HTMLElement>('.react-flow');
		const rect = rfEl?.getBoundingClientRect();
		const cx = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
		const cy = rect ? rect.top  + rect.height / 2 : window.innerHeight / 2;
		const pos = screenToFlowPosition({ x: cx, y: cy });
		return {
			x: pos.x + (Math.random() - 0.5) * 60,
			y: pos.y + (Math.random() - 0.5) * 60,
		};
	}, [screenToFlowPosition]);

	const handleAdd = useCallback((action: string) => {
		const pos = getDropPosition();
		const REAL_HANDLERS: Record<string, () => void> = {
			oscillator:    () => addOscillatorNode(pos),
			gain:          () => addGainNode(pos),
			noiseGenerator: () => addNoiseNode(pos),
			dcSignal:      () => addDCSignalNode(pos),
			player:        () => addPlayerNode('', pos),
			debug:         () => addDebugNode(pos),
		};
		const handler = REAL_HANDLERS[action];
		if (handler) handler();
		else addStubNode(action as StubKind, pos);
		setOpenTracked(false);
		setFilter('');
	}, [getDropPosition, addOscillatorNode, addGainNode, addNoiseNode, addDCSignalNode, addPlayerNode, addStubNode, addDebugNode]);

	const q = filter.trim().toLowerCase();
	const filtered = q
		? CATALOGUE
				.map(cat => ({ ...cat, items: cat.items.filter(i => i.label.toLowerCase().includes(q) || i.abbr.toLowerCase().includes(q)) }))
				.filter(cat => cat.items.length > 0)
		: CATALOGUE;

	const chipSx = (catColor: string) => ({
		...hwBtn(catColor),
		width:         '100%',
		px:            0.75,
		py:            1.25,
		fontSize:      9,
		fontFamily:    'monospace',
		letterSpacing: 0.8,
		minWidth:      0,
		fontWeight:    600,
		lineHeight:    1.4,
	});

	return (
		<div ref={containerRef} style={{ position: 'relative' }}>
			<IconButton
				size='small'
				onClick={() => { setOpenTracked(!open); setFilter(''); }}
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
						width:           400,
						maxHeight:       600,
						overflowY:       'auto',
						zIndex:          100,
						boxShadow:       `0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px ${color}18`,
					}}
				>
					{/* Filter bar */}
					<Box sx={{ ...HW_INSET, px: 0.75, py: 0.4, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
						<SearchIcon sx={{ fontSize: 10, color: 'text.disabled', flexShrink: 0 }} />
						<InputBase
							value={filter}
							onChange={e => setFilter(e.target.value)}
							placeholder='filter...'
							autoFocus
							sx={{ fontSize: 9, color: 'text.secondary', flex: 1,
							      '& .MuiInputBase-input': { p: 0 } }}
						/>
					</Box>

					{/* Category chip grids — two categories per row */}
					<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, alignItems: 'start' }}>
						{filtered.map(cat => (
							<Box key={cat.label}>
								<Typography variant='caption' sx={{
									fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase',
									display: 'block', mb: 0.5, color: cat.color, opacity: 0.8,
								}}>
									{cat.label}
								</Typography>
								<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
									{cat.items.map(item => (
										<Tooltip key={item.action} title={item.label} placement='top' arrow
											slotProps={{ popper: { modifiers: [{ name: 'offset', options: { offset: [0, -4] } }] } }}>
											<Button onClick={() => handleAdd(item.action)} sx={chipSx(cat.color)}>
												{item.abbr}
											</Button>
										</Tooltip>
									))}
								</Box>
							</Box>
						))}
					</Box>

					{filtered.length === 0 && (
						<Typography variant='caption' sx={{ fontSize: 9, color: 'text.disabled' }}>
							no matches
						</Typography>
					)}
				</Box>
			)}
		</div>
	);
}
