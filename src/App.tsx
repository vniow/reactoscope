import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { WoscopeProvider } from './contexts/WoahscopeContext';
import { NODE_COLORS }                                from './daw/nodes/nodeColors';
import { METAL_BG }                                   from './daw/nodes/metalBackground';
import { HW_INSET, hwIconBtn, hwIconBtnLit,
         hwSelectSx, hwSelectMenuProps, hwSliderSx }  from './daw/nodes/hwStyles';
import { ErrorBoundary }   from './components';
import { WoahscopePanel }    from './daw/WoahscopePanel';
import { SpinningRectPanel } from './daw/InputPanel';
import { DawCanvas }         from './daw/DawCanvas';
import { SweepPanel }        from './daw/SweepPanel';
import { VizSettingsOverlay } from './daw/VizSettingsOverlay';
import { debugRef } from './components/WoahcopeSceneR3F';
import {
	getSceneInputWorkletNode, SCENE_INPUT_ID,
} from './store/daw';
import { useDawStore } from './store/daw';
import {
	SAMPLE_RATE_OPTIONS, getStoredSampleRate, setStoredSampleRate, type SampleRate,
} from './scene/audioSetup';

const DEV_DEBUG = import.meta.env.DEV &&
	new URLSearchParams(window.location.search).has('debug');

const DebugPanel = DEV_DEBUG
	? lazy(() => import('./debug/DebugPanel').then(m => ({ default: m.DebugPanel })))
	: null;

const SPLIT_KEY     = 'woahscope-daw-split';
const DEFAULT_SPLIT = 50;
const MIN_SPLIT     = 15;
const MAX_SPLIT     = 85;

const SWEEP_HEIGHT_KEY      = 'woahscope-sweep-height';
const SWEEP_FULLWIDTH_KEY   = 'woahscope-sweep-fullwidth';
const SWEEP_VISIBLE_KEY     = 'woahscope-sweep-visible';
const CANVAS_SWAP_KEY       = 'woahscope-canvases-swapped';
const COLUMN_SWAP_KEY       = 'woahscope-columns-swapped';
const TOOLBAR_COLLAPSED_KEY = 'woahscope-toolbar-collapsed';
const DEFAULT_SWEEP_HEIGHT  = 150;
const MIN_SWEEP_HEIGHT      = 60;
const MAX_SWEEP_HEIGHT      = 500;

const DEFAULT_SCAN_FREQ = 50;
const SCAN_FREQ_MIN     = 1;
const SCAN_FREQ_MAX     = 9000;

function clampSplit(v: number) {
	return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, v));
}

function clampSweepHeight(v: number) {
	return Math.min(MAX_SWEEP_HEIGHT, Math.max(MIN_SWEEP_HEIGHT, v));
}

function readStored<T>(key: string, parse: (raw: string) => T, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		if (raw !== null) return parse(raw);
	} catch {
		// ignore
	}
	return fallback;
}

const labelSx = { fontSize: 9, color: 'text.disabled' as const, flexShrink: 0, userSelect: 'none' as const };

export function App() {
	const color = NODE_COLORS.scene;

	const [splitPercent,    setSplitPercent]    = useState(() =>
		readStored(SPLIT_KEY, v => clampSplit(Number(v)), DEFAULT_SPLIT),
	);
	const [sweepHeight,     setSweepHeight]     = useState(() =>
		readStored(SWEEP_HEIGHT_KEY, v => clampSweepHeight(Number(v)), DEFAULT_SWEEP_HEIGHT),
	);
	const [sweepFullWidth,  setSweepFullWidth]  = useState(() =>
		readStored(SWEEP_FULLWIDTH_KEY, v => v === 'true', false),
	);
	const [sweepVisible,    setSweepVisible]    = useState(() =>
		readStored(SWEEP_VISIBLE_KEY, v => v === 'true', false),
	);
	const [canvasesSwapped, setCanvasesSwapped] = useState(() =>
		readStored(CANVAS_SWAP_KEY, v => v === 'true', false),
	);
	const [columnsSwapped,  setColumnsSwapped]  = useState(() =>
		readStored(COLUMN_SWAP_KEY, v => v === 'true', false),
	);
	const [toolbarCollapsed, setToolbarCollapsed] = useState(() =>
		readStored(TOOLBAR_COLLAPSED_KEY, v => v === 'true', false),
	);

	// Scene input controls
	const updateNodeData  = useDawStore(s => s.updateNodeData);
	const isRunning       = useDawStore(s => s.sceneRunning);
	const startScene      = useDawStore(s => s.startScene);
	const stopScene       = useDawStore(s => s.stopScene);
	const [sampleRate,    setSampleRate]    = useState<SampleRate>(getStoredSampleRate);
	const [needsReload,   setNeedsReload]   = useState(false);
	const [scanFreq,      setScanFreq]      = useState(DEFAULT_SCAN_FREQ);
	const [editingScan,   setEditingScan]   = useState(false);
	const [scanFreqInput, setScanFreqInput] = useState('');
	const scanInputRef = useRef<HTMLInputElement>(null);

	const isDraggingRef     = useRef(false);
	const containerRef      = useRef<HTMLDivElement>(null);
	// Ref so the drag handler closure always sees the latest swap state.
	const columnsSwappedRef = useRef(columnsSwapped);
	useEffect(() => { columnsSwappedRef.current = columnsSwapped; }, [columnsSwapped]);

	useEffect(() => {
		try { localStorage.setItem(SPLIT_KEY,            String(splitPercent));    } catch { /* ignore */ }
	}, [splitPercent]);
	useEffect(() => {
		try { localStorage.setItem(SWEEP_HEIGHT_KEY,     String(sweepHeight));     } catch { /* ignore */ }
	}, [sweepHeight]);
	useEffect(() => {
		try { localStorage.setItem(SWEEP_FULLWIDTH_KEY,  String(sweepFullWidth));  } catch { /* ignore */ }
	}, [sweepFullWidth]);
	useEffect(() => {
		try { localStorage.setItem(SWEEP_VISIBLE_KEY,    String(sweepVisible));    } catch { /* ignore */ }
	}, [sweepVisible]);
	useEffect(() => {
		try { localStorage.setItem(CANVAS_SWAP_KEY,      String(canvasesSwapped)); } catch { /* ignore */ }
	}, [canvasesSwapped]);
	useEffect(() => {
		try { localStorage.setItem(COLUMN_SWAP_KEY,      String(columnsSwapped));  } catch { /* ignore */ }
	}, [columnsSwapped]);
	useEffect(() => {
		try { localStorage.setItem(TOOLBAR_COLLAPSED_KEY, String(toolbarCollapsed)); } catch { /* ignore */ }
	}, [toolbarCollapsed]);

	// Horizontal split drag
	const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		isDraggingRef.current = true;
		document.body.style.cursor     = 'col-resize';
		document.body.style.userSelect = 'none';
	}, []);

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!isDraggingRef.current || !containerRef.current) return;
			const rect   = containerRef.current.getBoundingClientRect();
			const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
			// When columns are visually swapped the canvas column is on the right,
			// so the split percentage runs in the opposite direction.
			const pct = columnsSwappedRef.current ? 100 - rawPct : rawPct;
			setSplitPercent(clampSplit(pct));
		};
		const onMouseUp = () => {
			if (!isDraggingRef.current) return;
			isDraggingRef.current          = false;
			document.body.style.cursor     = '';
			document.body.style.userSelect = '';
		};
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup',   onMouseUp);
		return () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup',   onMouseUp);
		};
	}, []);

	const handleSweepResize = useCallback((newHeight: number) => {
		setSweepHeight(clampSweepHeight(newHeight));
	}, []);

	const handleToggleFullWidth = useCallback(() => {
		setSweepFullWidth(v => !v);
	}, []);

	// Scene input handlers
	const handlePlay = useCallback(async () => { await startScene(); }, [startScene]);
	const handleStop = useCallback(() => { stopScene(); }, [stopScene]);

	const handleSampleRate = useCallback((rate: SampleRate) => {
		setStoredSampleRate(rate);
		setSampleRate(rate);
		setNeedsReload(true);
	}, []);

	const handleScanFreq = useCallback((value: number) => {
		setScanFreq(value);
		updateNodeData(SCENE_INPUT_ID, { scanFrequency: value });
		const node = getSceneInputWorkletNode();
		if (node) node.port.postMessage({ type: 'scanFreq', value });
	}, [updateNodeData]);

	const commitScanFreqInput = useCallback(() => {
		const parsed = parseInt(scanFreqInput, 10);
		if (!isNaN(parsed)) {
			handleScanFreq(Math.min(SCAN_FREQ_MAX, Math.max(SCAN_FREQ_MIN, parsed)));
		}
		setEditingScan(false);
	}, [scanFreqInput, handleScanFreq]);

	const sweepPanel = (
		<SweepPanel
			height={sweepHeight}
			fullWidth={sweepFullWidth}
			onResize={handleSweepResize}
			onToggleFullWidth={handleToggleFullWidth}
		/>
	);

	const divider = (
		<Box
			onMouseDown={handleDividerMouseDown}
			sx={{
				width:       6,
				flexShrink:  0,
				position:    'relative',
				cursor:      'col-resize',
				bgcolor:     '#1a1a1a',
				borderLeft:  '1px solid #2a2a2a',
				borderRight: '1px solid #2a2a2a',
				zIndex:      10,
				transition:  'background-color 0.15s',
				'&:hover':   { bgcolor: 'rgba(34, 221, 34, 0.4)' },
				'&::after':  {
					content:      '""',
					position:     'absolute',
					top:          '50%',
					left:         '50%',
					transform:    'translate(-50%, -50%)',
					width:        2,
					height:       32,
					borderRadius: 1,
					bgcolor:      '#555',
				},
			}}
		/>
	);

	return (
		<ErrorBoundary>
		<WoscopeProvider>
			<noscript>gotta enable JavaScript yo</noscript>

			<Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

				{/* Main two-column row.
				    flexDirection drives column swap — no child reordering needed. */}
				<Box
					ref={containerRef}
					sx={{
						display:       'flex',
						flexDirection: columnsSwapped ? 'row-reverse' : 'row',
						flex:          1,
						minHeight:     0,
						overflow:      'hidden',
					}}
				>
					{/* Canvas column — always first in the DOM tree */}
					<Box
						sx={{
							width:         `${splitPercent}%`,
							flexShrink:    0,
							height:        '100%',
							overflow:      'hidden',
							bgcolor:       '#000',
							display:       'flex',
							flexDirection: 'column',
						}}
					>

						{/* Canvas + toolbar column.
						    flexDirection drives canvas swap — WoahscopePanel and
						    SpinningRectPanel stay in fixed DOM positions; only the
						    visual order flips. The toolbar stays between them either way
						    because it is the middle sibling. */}
						<Box sx={{
							flex:          1,
							display:       'flex',
							flexDirection: canvasesSwapped ? 'column-reverse' : 'column',
							overflow:      'hidden',
							minWidth:      0,
						}}>
							{/* Top canvas (WoahscopePanel) — always first child */}
							<Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
								<WoahscopePanel />
								{DEV_DEBUG && DebugPanel && (
									<Suspense fallback={null}>
										<DebugPanel debugRef={debugRef} />
									</Suspense>
								)}
							</Box>

							{/* Toolbar — collapses to height 0.
							    MUI portals escape overflow:hidden so menus still appear. */}
							<Box sx={{
								flexShrink:      0,
								overflow:        'hidden',
								height:          toolbarCollapsed ? 0 : 28,
								backgroundImage: METAL_BG,
							}}>
								<Box sx={{ display: 'flex', alignItems: 'center', height: 28, gap: 1, px: 1 }}>
									{/* Viz settings */}
									<VizSettingsOverlay />

									<Box sx={{ width: '1px', height: 16, background: `${color}20`, flexShrink: 0 }} />

									{/* Play / stop */}
									<IconButton
										size="small"
										onClick={isRunning ? handleStop : handlePlay}
										aria-label={isRunning ? 'Stop' : 'Start'}
										sx={isRunning ? { ...hwIconBtnLit(color), p: 0.5 } : { ...hwIconBtn(color), p: 0.5 }}
									>
										{isRunning
											? <StopIcon sx={{ fontSize: 12 }} />
											: <PlayArrowIcon sx={{ fontSize: 12 }} />
										}
									</IconButton>

									{/* Sample rate */}
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
										<Typography variant="caption" sx={labelSx}>RATE</Typography>
										<Select
											size="small"
											value={sampleRate}
											onChange={e => handleSampleRate(Number(e.target.value) as SampleRate)}
											sx={{ ...hwSelectSx(color), fontSize: 9, '& .MuiSelect-select': { py: '3px', px: '6px' } }}
											MenuProps={hwSelectMenuProps(color)}
										>
											{SAMPLE_RATE_OPTIONS.map(r => (
												<MenuItem key={r} value={r} sx={{ fontSize: 9 }}>
													{r >= 1000 ? `${r / 1000} kHz` : `${r} Hz`}
												</MenuItem>
											))}
										</Select>
									</Box>

									{/* Scan frequency */}
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 80 }}>
										<Typography variant="caption" sx={labelSx}>SCAN</Typography>
										{editingScan ? (
											<Box sx={{ ...HW_INSET, px: 0.75, display: 'flex', alignItems: 'center', width: 52, flexShrink: 0 }}>
												<InputBase
													inputRef={scanInputRef}
													value={scanFreqInput}
													onChange={e => setScanFreqInput(e.target.value)}
													onBlur={commitScanFreqInput}
													onKeyDown={e => {
														if (e.key === 'Enter') commitScanFreqInput();
														if (e.key === 'Escape') setEditingScan(false);
													}}
													sx={{
														fontSize: 9, color: 'text.secondary', width: '100%',
														'& .MuiInputBase-input': { p: 0, textAlign: 'right' },
													}}
												/>
											</Box>
										) : (
											<Typography
												variant="caption"
												sx={{ fontSize: 9, color: 'text.disabled', width: 52, textAlign: 'right', cursor: 'text', userSelect: 'none', flexShrink: 0 }}
												onClick={() => {
													setScanFreqInput(String(scanFreq));
													setEditingScan(true);
													setTimeout(() => scanInputRef.current?.select(), 0);
												}}
											>
												{scanFreq} Hz
											</Typography>
										)}
										<Slider
											size="small"
											min={SCAN_FREQ_MIN} max={SCAN_FREQ_MAX} step={1}
											value={scanFreq}
											onChange={(_, v) => handleScanFreq(v as number)}
											sx={[hwSliderSx(color), {
												flex: 1,
												'& .MuiSlider-rail':  { height: 4 },
												'& .MuiSlider-track': { height: 4 },
												'& .MuiSlider-thumb': { width: 10, height: 10 },
											}]}
										/>
									</Box>

									{/* Reload notice */}
									{needsReload && (
										<Typography
											variant="caption"
											sx={{ fontSize: 9, color: '#dd8822', cursor: 'pointer', flexShrink: 0, '&:hover': { color: '#ffaa44' } }}
											onClick={() => window.location.reload()}
										>
											↻ reload
										</Typography>
									)}

								</Box>
							</Box>

							{/* Bottom canvas (SpinningRectPanel) — always last child */}
							<Box sx={{ flex: 1, overflow: 'hidden' }}>
								<SpinningRectPanel />
							</Box>

							{/* Sweep panel in left-column mode — stacks below canvases */}
							{!sweepFullWidth && sweepVisible && sweepPanel}
						</Box>
					</Box>

					{divider}

					{/* DAW column — always last in the DOM tree */}
					<Box sx={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0 }}>
						<DawCanvas
							columnsSwapped={columnsSwapped}
							onColumnsSwap={() => setColumnsSwapped(v => !v)}
							canvasesSwapped={canvasesSwapped}
							onCanvasesSwap={() => setCanvasesSwapped(v => !v)}
							sweepVisible={sweepVisible}
							onSweepToggle={() => setSweepVisible(v => !v)}
							toolbarCollapsed={toolbarCollapsed}
							onToolbarToggle={() => setToolbarCollapsed(v => !v)}
						/>
					</Box>
				</Box>

				{/* Sweep panel in full-width mode */}
				{sweepFullWidth && sweepVisible && sweepPanel}
			</Box>
		</WoscopeProvider>
		</ErrorBoundary>
	);
}
