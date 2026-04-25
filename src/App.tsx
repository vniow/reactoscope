import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { WoscopeProvider } from './contexts/WoahscopeContext';
import { ErrorBoundary }   from './components';
import { WoahscopePanel }    from './daw/WoahscopePanel';
import { SpinningRectPanel } from './daw/InputPanel';
import { DawCanvas }         from './daw/DawCanvas';
import { SweepPanel }        from './daw/SweepPanel';
import { debugRef } from './components/WoahcopeSceneR3F';

const DEV_DEBUG = import.meta.env.DEV &&
	new URLSearchParams(window.location.search).has('debug');

const DebugPanel = DEV_DEBUG
	? lazy(() => import('./debug/DebugPanel').then(m => ({ default: m.DebugPanel })))
	: null;

const SPLIT_KEY     = 'woahscope-daw-split';
const DEFAULT_SPLIT = 50;
const MIN_SPLIT     = 15;
const MAX_SPLIT     = 85;

const SWEEP_HEIGHT_KEY     = 'woahscope-sweep-height';
const SWEEP_FULLWIDTH_KEY  = 'woahscope-sweep-fullwidth';
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

export function App() {
	const [splitPercent,   setSplitPercent]   = useState(() =>
		readStored(SPLIT_KEY, v => clampSplit(Number(v)), DEFAULT_SPLIT),
	);
	const [sweepHeight,    setSweepHeight]    = useState(() =>
		readStored(SWEEP_HEIGHT_KEY, v => clampSweepHeight(Number(v)), DEFAULT_SWEEP_HEIGHT),
	);
	const [sweepFullWidth, setSweepFullWidth] = useState(() =>
		readStored(SWEEP_FULLWIDTH_KEY, v => v === 'true', false),
	);

	const isDraggingRef = useRef(false);
	const containerRef  = useRef<HTMLDivElement>(null);

	// Persist split
	useEffect(() => {
		try { localStorage.setItem(SPLIT_KEY, String(splitPercent)); } catch { /* ignore */ }
	}, [splitPercent]);

	// Persist sweep height
	useEffect(() => {
		try { localStorage.setItem(SWEEP_HEIGHT_KEY, String(sweepHeight)); } catch { /* ignore */ }
	}, [sweepHeight]);

	// Persist sweep full-width mode
	useEffect(() => {
		try { localStorage.setItem(SWEEP_FULLWIDTH_KEY, String(sweepFullWidth)); } catch { /* ignore */ }
	}, [sweepFullWidth]);

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
			const rect = containerRef.current.getBoundingClientRect();
			const pct  = ((e.clientX - rect.left) / rect.width) * 100;
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

			{/* Outer column: main row + optional full-width sweep row */}
			<Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

				{/* Main two-column row */}
				<Box
					ref={containerRef}
					sx={{
						display:       'flex',
						flexDirection: 'row',
						flex:          1,
						minHeight:     0,
						overflow:      'hidden',
					}}
				>
					{/* Left column — stacked canvases */}
					<Box
						sx={{
							width:         `${splitPercent}%`,
							flexShrink:    0,
							height:        '100%',
							overflow:      'hidden',
							position:      'relative',
							bgcolor:       '#000',
							display:       'flex',
							flexDirection: 'column',
						}}
					>
						<Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
							<WoahscopePanel />
							{DEV_DEBUG && DebugPanel && (
								<Suspense fallback={null}>
									<DebugPanel debugRef={debugRef} />
								</Suspense>
							)}
						</Box>
						<Box sx={{ flex: 1, overflow: 'hidden' }}>
							<SpinningRectPanel />
						</Box>

						{/* Sweep panel in left-column (default) mode */}
						{!sweepFullWidth && sweepPanel}
					</Box>

					{/* Drag divider */}
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

					{/* Right column — React Flow DAW canvas */}
					<Box
						sx={{
							flex:     1,
							height:   '100%',
							overflow: 'hidden',
							minWidth: 0,
						}}
					>
						<DawCanvas />
					</Box>
				</Box>

				{/* Sweep panel in full-width mode (below both columns) */}
				{sweepFullWidth && sweepPanel}
			</Box>
		</WoscopeProvider>
		</ErrorBoundary>
	);
}
