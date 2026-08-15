import { useCallback, useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useReactFlow } from '@xyflow/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useDawStore } from '../../store/daw';
import { NODE_COLORS } from '../nodes/shared/nodeColors';
import { METAL_BG } from '../nodes/shared/metalBackground';
import {
	HW_INSET,
	hwBtn,
	hwIconBtn,
	hwIconBtnLit,
} from '../nodes/shared/hwStyles';
import type { StubKind } from '../../store/dawTypes';

// ─── Catalogue data ───────────────────────────────────────────────────────────

type CatalogueItem = {
	label: string; // full Tone.js class name — shown + used for filtering
	action: string; // store dispatch key (must match nodeRegistry key for real nodes)
	abbr: string; // shorthand — kept for filter compat, no longer rendered
	desc?: string; // 1–3 word hint shown under the label
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
			{
				label: 'Oscillator',
				action: 'oscillator',
				abbr: 'OSC',
				desc: 'sine/square/tri/saw',
			},
			{
				label: 'FMOscillator',
				action: 'fmOscillator',
				abbr: 'FMOC',
				desc: 'FM synthesis',
			},
			{
				label: 'AMOscillator',
				action: 'amOscillator',
				abbr: 'AMOC',
				desc: 'AM synthesis',
			},
			{
				label: 'FatOscillator',
				action: 'fatOscillator',
				abbr: 'FTOC',
				desc: 'unison voices',
			},
			{
				label: 'PulseOscillator',
				action: 'pulseOscillator',
				abbr: 'PUOC',
				desc: 'pulse width',
			},
			{
				label: 'PWMOscillator',
				action: 'pwmOscillator',
				abbr: 'PWMO',
				desc: 'PWM sweep',
			},
			{
				label: 'Noise',
				action: 'noiseGenerator',
				abbr: 'NOIS',
				desc: 'white/pink/brown',
			},
			{ label: 'Player', action: 'player', abbr: 'PLY', desc: 'audio file' },
			{
				label: 'GrainPlayer',
				action: 'grainPlayer',
				abbr: 'GRPD',
				desc: 'granular',
			},
			{
				label: 'MicInput',
				action: 'micInput',
				abbr: 'MIC',
				desc: 'microphone',
			},
			{ label: 'LFO', action: 'lfo', abbr: 'LFO', desc: 'low-freq osc' },
			{
				label: 'DCSignal',
				action: 'dcSignal',
				abbr: 'DC',
				desc: 'constant value',
			},
		],
	},
	{
		label: 'Instrument',
		color: NODE_COLORS.source,
		items: [
			{ label: 'Synth', action: 'synth', abbr: 'SYN', desc: 'basic synth' },
			{
				label: 'MonoSynth',
				action: 'monoSynth',
				abbr: 'MSYN',
				desc: 'mono voice',
			},
			{
				label: 'PolySynth',
				action: 'polySynth',
				abbr: 'PSYN',
				desc: 'polyphonic',
			},
			{ label: 'FMSynth', action: 'fmSynth', abbr: 'FMSY', desc: 'FM voice' },
			{ label: 'AMSynth', action: 'amSynth', abbr: 'AMSY', desc: 'AM voice' },
			{ label: 'DuoSynth', action: 'duoSynth', abbr: 'DUSY', desc: 'dual osc' },
			{
				label: 'MembraneSynth',
				action: 'membraneSynth',
				abbr: 'MBSY',
				desc: 'drum membrane',
			},
			{
				label: 'MetalSynth',
				action: 'metalSynth',
				abbr: 'MTSY',
				desc: 'metallic',
			},
			{
				label: 'NoiseSynth',
				action: 'noiseSynth',
				abbr: 'NZSY',
				desc: 'noise synth',
			},
			{
				label: 'PluckSynth',
				action: 'pluckSynth',
				abbr: 'PLSY',
				desc: 'plucked string',
			},
			{ label: 'Sampler', action: 'sampler', abbr: 'SMPL', desc: 'sample map' },
		],
	},
	{
		label: 'Effect',
		color: NODE_COLORS.effects,
		items: [
			{ label: 'Reverb', action: 'reverb', abbr: 'REV', desc: 'convolution' },
			{
				label: 'JCReverb',
				action: 'jcReverb',
				abbr: 'JCRV',
				desc: 'Chowning reverb',
			},
			{
				label: 'Freeverb',
				action: 'freeverb',
				abbr: 'FRV',
				desc: 'dense reverb',
			},
			{ label: 'Delay', action: 'delay', abbr: 'DLY', desc: 'tape delay' },
			{
				label: 'FeedbackDelay',
				action: 'feedbackDelay',
				abbr: 'FBDL',
				desc: 'feedback delay',
			},
			{
				label: 'PingPongDelay',
				action: 'pingPongDelay',
				abbr: 'PPDL',
				desc: 'ping pong',
			},
			{ label: 'Chorus', action: 'chorus', abbr: 'CHR', desc: 'chorus mod' },
			{ label: 'Phaser', action: 'phaser', abbr: 'PHS', desc: 'phase shift' },
			{
				label: 'Tremolo',
				action: 'tremolo',
				abbr: 'TRML',
				desc: 'amplitude mod',
			},
			{ label: 'Vibrato', action: 'vibrato', abbr: 'VIB', desc: 'pitch mod' },
			{
				label: 'Distortion',
				action: 'distortion',
				abbr: 'DIST',
				desc: 'waveshaper',
			},
			{
				label: 'Chebyshev',
				action: 'chebyshev',
				abbr: 'CHB',
				desc: 'Chebyshev',
			},
			{
				label: 'BitCrusher',
				action: 'bitCrusher',
				abbr: 'BIT',
				desc: 'bit depth',
			},
			{
				label: 'AutoFilter',
				action: 'autoFilter',
				abbr: 'AFLT',
				desc: 'auto filter',
			},
			{
				label: 'AutoPanner',
				action: 'autoPanner',
				abbr: 'APAN',
				desc: 'auto pan',
			},
			{ label: 'AutoWah', action: 'autoWah', abbr: 'AWAH', desc: 'auto wah' },
			{
				label: 'FrequencyShifter',
				action: 'frequencyShifter',
				abbr: 'FSHF',
				desc: 'freq shift',
			},
			{
				label: 'PitchShift',
				action: 'pitchShift',
				abbr: 'PTSH',
				desc: 'pitch shift',
			},
			{
				label: 'StereoWidener',
				action: 'stereoWidener',
				abbr: 'SWDN',
				desc: 'stereo width',
			},
		],
	},
	{
		label: 'Dynamics',
		color: NODE_COLORS.dynamics,
		items: [
			{
				label: 'Compressor',
				action: 'compressor',
				abbr: 'COMP',
				desc: 'compression',
			},
			{ label: 'Limiter', action: 'limiter', abbr: 'LIM', desc: 'peak limit' },
			{ label: 'Gate', action: 'gate', abbr: 'GATE', desc: 'noise gate' },
			{
				label: 'MidSideCompressor',
				action: 'midSideCompressor',
				abbr: 'MSCM',
				desc: 'mid-side',
			},
			{
				label: 'MultibandCompressor',
				action: 'multibandCompressor',
				abbr: 'MBCM',
				desc: 'multiband',
			},
		],
	},
	{
		label: 'Processing',
		color: NODE_COLORS.processor,
		items: [
			{ label: 'Gain', action: 'gain', abbr: 'GAIN', desc: 'amplification' },
			{ label: 'Filter', action: 'filter', abbr: 'FILT', desc: 'tone filter' },
			{
				label: 'BiquadFilter',
				action: 'biquadFilter',
				abbr: 'BQFL',
				desc: 'biquad',
			},
			{ label: 'EQ3', action: 'eq3', abbr: 'EQ3', desc: '3-band EQ' },
			{ label: 'Channel', action: 'channel', abbr: 'CHNL', desc: 'strip' },
			{ label: 'PanVol', action: 'panVol', abbr: 'PANV', desc: 'pan + vol' },
			{ label: 'Panner', action: 'panner', abbr: 'PAN', desc: 'stereo pan' },
			{ label: 'Panner3D', action: 'panner3d', abbr: 'P3D', desc: '3D pan' },
			{
				label: 'CrossFade',
				action: 'crossFade',
				abbr: 'XFAD',
				desc: 'crossfade',
			},
			{ label: 'Split', action: 'split', abbr: 'SPLT', desc: 'L/R split' },
			{ label: 'Merge', action: 'merge', abbr: 'MERG', desc: 'L/R merge' },
			{ label: 'Mono', action: 'mono', abbr: 'MONO', desc: 'sum to mono' },
			{
				label: 'MultibandSplit',
				action: 'multibandSplit',
				abbr: 'MBSP',
				desc: '3-band split',
			},
			{ label: 'Solo', action: 'solo', abbr: 'SOLO', desc: 'solo toggle' },
			{ label: 'Volume', action: 'volume', abbr: 'VOL', desc: 'vol fader' },
			{
				label: 'Convolver',
				action: 'convolver',
				abbr: 'CNVL',
				desc: 'IR convolver',
			},
		],
	},
	{
		label: 'Analysis',
		color: NODE_COLORS.utility,
		items: [
			{ label: 'Analyser', action: 'analyser', abbr: 'ANLY', desc: 'waveform' },
			{ label: 'FFT', action: 'fft', abbr: 'FFT', desc: 'spectrum' },
			{ label: 'Meter', action: 'meter', abbr: 'MTER', desc: 'peak level' },
			{ label: 'DCMeter', action: 'dcMeter', abbr: 'DCMT', desc: 'DC level' },
			{
				label: 'Waveform',
				action: 'waveform',
				abbr: 'WAVE',
				desc: 'waveform cap',
			},
			{
				label: 'Follower',
				action: 'follower',
				abbr: 'FLWR',
				desc: 'envelope follow',
			},
			{
				label: 'Recorder',
				action: 'recorder',
				abbr: 'REC',
				desc: 'audio capture',
			},
			{
				label: 'AmplitudeEnvelope',
				action: 'amplitudeEnvelope',
				abbr: 'AENV',
				desc: 'amp env',
			},
			{
				label: 'FrequencyEnvelope',
				action: 'frequencyEnvelope',
				abbr: 'FENV',
				desc: 'freq env',
			},
		],
	},
	{
		label: 'Signal',
		color: NODE_COLORS.utility,
		items: [
			{
				label: 'Signal',
				action: 'signal',
				abbr: 'SIG',
				desc: 'constant signal',
			},
			{
				label: 'WaveShaper',
				action: 'waveShaper',
				abbr: 'WSHP',
				desc: 'curve map',
			},
			{ label: 'Scale', action: 'scale', abbr: 'SCAL', desc: 'linear scale' },
			{
				label: 'ScaleExp',
				action: 'scaleExp',
				abbr: 'SCEX',
				desc: 'exp scale',
			},
			{ label: 'Abs', action: 'abs', abbr: 'ABS', desc: 'absolute val' },
			{ label: 'Add', action: 'add', abbr: 'ADD', desc: 'offset add' },
			{ label: 'Multiply', action: 'multiply', abbr: 'MULT', desc: 'multiply' },
			{ label: 'Negate', action: 'negate', abbr: 'NEG', desc: 'negate' },
			{
				label: 'GreaterThan',
				action: 'greaterThan',
				abbr: 'GT',
				desc: 'threshold',
			},
			{
				label: 'AudioToGain',
				action: 'audioToGain',
				abbr: 'A2G',
				desc: 'audio→gain',
			},
			{
				label: 'GainToAudio',
				action: 'gainToAudio',
				abbr: 'G2A',
				desc: 'gain→audio',
			},
		],
	},
	{
		label: 'Event',
		color: NODE_COLORS.utility,
		items: [
			{ label: 'Loop', action: 'loop', abbr: 'LOOP', desc: 'looping' },
			{ label: 'Sequence', action: 'sequence', abbr: 'SEQ', desc: 'step seq' },
			{
				label: 'Pattern',
				action: 'pattern',
				abbr: 'PTRN',
				desc: 'pattern gen',
			},
			{ label: 'Part', action: 'part', abbr: 'PART', desc: 'event part' },
			{
				label: 'ToneEvent',
				action: 'toneEvent',
				abbr: 'EVT',
				desc: 'single event',
			},
		],
	},
	{
		label: 'Utility',
		color: NODE_COLORS.debug,
		items: [
			{ label: 'Debug', action: 'debug', abbr: 'DBG', desc: 'inspect node' },
		],
	},
];

// Actions backed by a real nodeRegistry handler — everything else gets addStubNode.
const REAL_ACTIONS = new Set<string>([
	'oscillator',
	'gain',
	'noiseGenerator',
	'dcSignal',
	'player',
	'lfo',
	'fmOscillator',
	'amOscillator',
	'fatOscillator',
	'pulseOscillator',
	'pwmOscillator',
	'grainPlayer',
	'micInput',
	'debug',
	'reverb',
	'jcReverb',
	'freeverb',
	'delay',
	'feedbackDelay',
	'pingPongDelay',
	'distortion',
	'chebyshev',
	'bitCrusher',
	'frequencyShifter',
	'pitchShift',
	'stereoWidener',
	'chorus',
	'phaser',
	'tremolo',
	'vibrato',
	'autoFilter',
	'autoPanner',
	'autoWah',
	'limiter',
	'gate',
	'biquadFilter',
	'panVol',
	'split',
	'merge',
	'mono',
	'volume',
	'fft',
	'meter',
	'dcMeter',
	'waveform',
	'signal',
	'scale',
	'scaleExp',
	'abs',
	'negate',
	'audioToGain',
	'gainToAudio',
	'compressor',
	'filter',
	'eq3',
	'multibandSplit',
	'analyser',
	'follower',
	'solo',
]);

// ─── Component ────────────────────────────────────────────────────────────────

export function AddNodePanel({
	columnsSwapped,
	onOpenChange,
}: {
	columnsSwapped: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState('');
	const setOpenTracked = useCallback(
		(v: boolean) => {
			setOpen(v);
			onOpenChange?.(v);
		},
		[onOpenChange],
	);
	const color = NODE_COLORS.scene;
	const { screenToFlowPosition } = useReactFlow();
	const containerRef = useRef<HTMLDivElement>(null);

	useClickOutside(containerRef, () => setOpenTracked(false), open);

	// The toolbar is vertically centred, so the flyout's top (anchored to the
	// button) sits mid-screen. Measure that top and cap the height so the panel
	// runs from the toolbar top down to just above the window bottom.
	const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
	useEffect(() => {
		if (!open) return;
		const measure = () => {
			const top = containerRef.current?.getBoundingClientRect().top ?? 0;
			setMaxHeight(window.innerHeight - top - 8);
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, [open]);

	const addNode = useDawStore((s) => s.addNode);
	const addStubNode = useDawStore((s) => s.addStubNode);

	const getDropPosition = useCallback((): { x: number; y: number } => {
		const rfEl = document.querySelector<HTMLElement>('.react-flow');
		const rect = rfEl?.getBoundingClientRect();
		const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
		const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
		const pos = screenToFlowPosition({ x: cx, y: cy });
		return {
			x: pos.x + (Math.random() - 0.5) * 60,
			y: pos.y + (Math.random() - 0.5) * 60,
		};
	}, [screenToFlowPosition]);

	const handleAdd = useCallback(
		(action: string) => {
			const pos = getDropPosition();
			if (REAL_ACTIONS.has(action)) addNode(action, pos);
			else addStubNode(action as StubKind, pos);
			setOpenTracked(false);
			setFilter('');
		},
		[getDropPosition, addNode, addStubNode, setOpenTracked],
	);

	const q = filter.trim().toLowerCase();
	const filtered = q
		? CATALOGUE.map((cat) => ({
				...cat,
				items: cat.items.filter(
					(i) =>
						i.label.toLowerCase().includes(q) ||
						i.abbr.toLowerCase().includes(q) ||
						i.desc?.toLowerCase().includes(q),
				),
			})).filter((cat) => cat.items.length > 0)
		: CATALOGUE;

	const itemBtnSx = (catColor: string) => ({
		...hwBtn(catColor),
		width: '100%',
		px: 1,
		py: 1,
		minWidth: 0,
		textAlign: 'left' as const,
		justifyContent: 'flex-start',
		display: 'flex',
		flexDirection: 'column' as const,
		alignItems: 'flex-start',
	});

	return (
		<div
			ref={containerRef}
			style={{ position: 'relative' }}
		>
			<IconButton
				size='small'
				onClick={() => {
					setOpenTracked(!open);
					setFilter('');
				}}
				title='Add node'
				aria-label='Add node'
				sx={
					open
						? { ...hwIconBtnLit(color), p: 0.5 }
						: { ...hwIconBtn(color), p: 0.5 }
				}
			>
				<AddIcon sx={{ fontSize: 12 }} />
			</IconButton>

			{open && (
				<Box
					className='nodrag nopan'
					onMouseDown={(e) => e.stopPropagation()}
					sx={{
						position: 'absolute',
						// Align the flyout top with the toolbar/button top and extend
						// down to just above the window bottom (height measured above,
						// since the toolbar is vertically centred).
						top: 0,
						...(columnsSwapped
							? { right: 'calc(100% + 4px)' }
							: { left: 'calc(100% + 4px)' }),
						backgroundImage: METAL_BG,
						border: `1px solid ${color}40`,
						borderRadius: 1,
						p: 1.5,
						width: 400,
						maxHeight: maxHeight ?? 'calc(100vh - 32px)',
						overflowY: 'auto',
						zIndex: 100,
						boxShadow: `0 4px 16px rgba(0,0,0,0.7), 0 0 0 1px ${color}18`,
					}}
				>
					{/* Filter bar */}
					<Box
						sx={{
							...HW_INSET,
							px: 0.75,
							py: 0.4,
							mb: 1,
							display: 'flex',
							alignItems: 'center',
							gap: 0.5,
						}}
					>
						<SearchIcon
							sx={{ fontSize: 10, color: 'text.disabled', flexShrink: 0 }}
						/>
						<InputBase
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							placeholder='filter...'
							// eslint-disable-next-line jsx-a11y/no-autofocus
							autoFocus
							sx={{
								fontSize: 9,
								color: 'text.secondary',
								flex: 1,
								'& .MuiInputBase-input': { p: 0 },
							}}
						/>
					</Box>

					{/* Category sections — single vertical stack */}
					<Box sx={{ display: 'flex', flexDirection: 'column' }}>
						{filtered.map((cat) => (
							<Box key={cat.label}>
								{/* Category header with left-border accent */}
								<Box
									sx={{
										borderLeft: `3px solid ${cat.color}`,
										pl: 1,
										py: 0.25,
										mb: 0.5,
										mt: 2.5,
										background: `${cat.color}08`,
										'&:first-of-type': { mt: 1 },
									}}
								>
									<Typography
										sx={{
											fontSize: 9,
											letterSpacing: 0.8,
											textTransform: 'uppercase',
											color: cat.color,
											fontWeight: 700,
										}}
									>
										{cat.label}
									</Typography>
								</Box>

								{/* 2-column item grid */}
								<Box
									sx={{
										display: 'grid',
										gridTemplateColumns: 'repeat(2, 1fr)',
										gap: 0.5,
									}}
								>
									{cat.items.map((item) => (
										<Button
											key={item.action}
											onClick={() => handleAdd(item.action)}
											sx={itemBtnSx(cat.color)}
										>
											<Box
												sx={{
													display: 'flex',
													flexDirection: 'column',
													alignItems: 'flex-start',
													gap: 0.25,
													width: '100%',
												}}
											>
												<Typography
													sx={{
														fontSize: 10,
														fontWeight: 600,
														color: 'inherit',
														lineHeight: 1.2,
														textTransform: 'none',
													}}
												>
													{item.label}
													{!REAL_ACTIONS.has(item.action) && ' *'}
												</Typography>
												{item.desc && (
													<Typography
														sx={{
															fontSize: 8,
															color: 'text.disabled',
															lineHeight: 1,
															textTransform: 'none',
															fontWeight: 400,
														}}
													>
														{item.desc}
													</Typography>
												)}
											</Box>
										</Button>
									))}
								</Box>
							</Box>
						))}
					</Box>

					{filtered.length === 0 && (
						<Typography
							variant='caption'
							sx={{ fontSize: 9, color: 'text.disabled' }}
						>
							no matches
						</Typography>
					)}
				</Box>
			)}
		</div>
	);
}
