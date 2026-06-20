import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { dawInitPromise, useDawStore } from './store/daw';
import { usePatchStore } from './store/patchStore';
import { WoscopeProvider } from './contexts/WoahscopeContext';
import { ErrorBoundary }   from './components';
import { WoahscopePanel }    from './daw/panels/WoahscopePanel';
import { SceneInputPanel } from './daw/panels/InputPanel';
import { DawCanvas }         from './daw/DawCanvas';
import { SweepPanel }        from './daw/panels/SweepPanel';
import { debugRef } from './components/scope/WoahcopeSceneR3F';

const DEV_DEBUG = import.meta.env.DEV &&
	new URLSearchParams(window.location.search).has('debug');

const DebugPanel = DEV_DEBUG
	? lazy(() => import('./debug/DebugPanel').then(m => ({ default: m.DebugPanel })))
	: null;

const SPLIT_KEY     = 'woahscope-daw-split';
const DEFAULT_SPLIT = 50;
const MIN_SPLIT     = 15;
const MAX_SPLIT     = 85;

const SWEEP_HEIGHT_KEY    = 'woahscope-sweep-height';
const SWEEP_FULLWIDTH_KEY = 'woahscope-sweep-fullwidth';
const SWEEP_VISIBLE_KEY   = 'woahscope-sweep-visible';
const CANVAS_SWAP_KEY     = 'woahscope-canvases-swapped';
const COLUMN_SWAP_KEY     = 'woahscope-columns-swapped';
const DEFAULT_SWEEP_HEIGHT = 150;
const MIN_SWEEP_HEIGHT     = 60;
const MAX_SWEEP_HEIGHT     = 500;

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

const canvasLabelSx = {
	position:      'absolute',
	top:           6,
	left:          8,
	fontSize:      9,
	fontFamily:    'monospace',
	letterSpacing: 1,
	textTransform: 'uppercase',
	color:         'text.disabled',
	pointerEvents: 'none',
	userSelect:    'none',
	lineHeight:    1,
} as const;

export function App() {
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

	const isDraggingRef     = useRef(false);
	const containerRef      = useRef<HTMLDivElement>(null);
	const columnsSwappedRef = useRef(columnsSwapped);
	useEffect(() => { columnsSwappedRef.current = columnsSwapped; }, [columnsSwapped]);

	// Load the default patch once the DAW audio graph has finished initialising.
	useEffect(() => {
		void dawInitPromise.then(() => {
			const { defaultPatchId, patches } = usePatchStore.getState();
			if (!defaultPatchId) return;
			const saved = patches.find(p => p.id === defaultPatchId);
			if (saved) useDawStore.getState().loadPatch(saved.patch);
		});
	}, []);

	useEffect(() => { try { localStorage.setItem(SPLIT_KEY,           String(splitPercent));    } catch { /* ignore */ } }, [splitPercent]);
	useEffect(() => { try { localStorage.setItem(SWEEP_HEIGHT_KEY,    String(sweepHeight));     } catch { /* ignore */ } }, [sweepHeight]);
	useEffect(() => { try { localStorage.setItem(SWEEP_FULLWIDTH_KEY, String(sweepFullWidth));  } catch { /* ignore */ } }, [sweepFullWidth]);
	useEffect(() => { try { localStorage.setItem(SWEEP_VISIBLE_KEY,   String(sweepVisible));    } catch { /* ignore */ } }, [sweepVisible]);
	useEffect(() => { try { localStorage.setItem(CANVAS_SWAP_KEY,     String(canvasesSwapped)); } catch { /* ignore */ } }, [canvasesSwapped]);
	useEffect(() => { try { localStorage.setItem(COLUMN_SWAP_KEY,     String(columnsSwapped));  } catch { /* ignore */ } }, [columnsSwapped]);

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

	const sweepPanel = (
		<SweepPanel
			height={sweepHeight}
			fullWidth={sweepFullWidth}
			onResize={handleSweepResize}
			onToggleFullWidth={handleToggleFullWidth}
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
						    visual order flips. */}
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
								<Typography sx={canvasLabelSx}>scope</Typography>
							</Box>

							{/* Bottom canvas (SceneInputPanel) — always last child */}
							<Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
								<SceneInputPanel />
								<Typography sx={canvasLabelSx}>scene</Typography>
							</Box>

							{/* Sweep panel in left-column mode — stacks below canvases */}
							{!sweepFullWidth && sweepVisible && sweepPanel}
						</Box>
					</Box>

					{/* DAW column — always last in the DOM tree */}
					<Box sx={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0, borderLeft: '1px solid #1e1e1e' }}>
						<DawCanvas
							columnsSwapped={columnsSwapped}
							onColumnsSwap={() => setColumnsSwapped(v => !v)}
							canvasesSwapped={canvasesSwapped}
							onCanvasesSwap={() => setCanvasesSwapped(v => !v)}
							sweepVisible={sweepVisible}
							onSweepToggle={() => setSweepVisible(v => !v)}
							onResizeStart={handleDividerMouseDown}
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
