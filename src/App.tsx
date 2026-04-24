import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { WoscopeProvider } from './contexts/WoahscopeContext';
import { ErrorBoundary }   from './components';
import { WoahscopePanel }    from './daw/WoahscopePanel';
import { SpinningRectPanel } from './daw/InputPanel';
import { DawCanvas }         from './daw/DawCanvas';
import { debugRef } from './components/WoahcopeSceneR3F';

const DEV_DEBUG = import.meta.env.DEV &&
	new URLSearchParams(window.location.search).has('debug');

const DebugPanel = DEV_DEBUG
	? lazy(() => import('./debug/DebugPanel').then(m => ({ default: m.DebugPanel })))
	: null;

const SPLIT_KEY     = 'woahscope-daw-split';
const DEFAULT_SPLIT = 50;  // percent
const MIN_SPLIT     = 15;
const MAX_SPLIT     = 85;

function clampSplit(v: number) {
	return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, v));
}

function readStoredSplit(): number {
	try {
		const raw = localStorage.getItem(SPLIT_KEY);
		if (raw !== null) return clampSplit(Number(raw));
	} catch {
		// localStorage unavailable (e.g. private browsing restrictions)
	}
	return DEFAULT_SPLIT;
}

export function App() {
	const [splitPercent, setSplitPercent] = useState(readStoredSplit);
	const isDraggingRef   = useRef(false);
	const containerRef    = useRef<HTMLDivElement>(null);

	// Persist whenever the split changes
	useEffect(() => {
		try {
			localStorage.setItem(SPLIT_KEY, String(splitPercent));
		} catch {
			// ignore
		}
	}, [splitPercent]);

	const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		isDraggingRef.current = true;
		document.body.style.cursor = 'col-resize';
		// Prevent text selection while dragging
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
			isDraggingRef.current        = false;
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

	return (
		<ErrorBoundary>
		<WoscopeProvider>
			<noscript>gotta enable JavaScript yo</noscript>

			{/* Full-viewport two-column layout */}
			<Box
				ref={containerRef}
				sx={{
					display:        'flex',
					flexDirection:  'row',
					height:         '100%',
					overflow:       'hidden',
					// Prevent cursor flicker when dragging fast
					'&.dragging':   { cursor: 'col-resize' },
				}}
			>
				{/* Left column — stacked canvases */}
				<Box
					sx={{
						width:     `${splitPercent}%`,
						flexShrink: 0,
						height:    '100%',
						overflow:  'hidden',
						position:  'relative',
						bgcolor:   '#000',
						display:   'flex',
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
				</Box>

				{/* Drag divider */}
				<Box
					onMouseDown={handleDividerMouseDown}
					sx={{
						width:      6,
						flexShrink: 0,
						position:   'relative',
						cursor:     'col-resize',
						bgcolor:    '#1a1a1a',
						borderLeft:  '1px solid #2a2a2a',
						borderRight: '1px solid #2a2a2a',
						zIndex:     10,
						transition: 'background-color 0.15s',
						'&:hover':  { bgcolor: 'rgba(34, 221, 34, 0.4)' },
						// Grip dots
						'&::after': {
							content:    '""',
							position:   'absolute',
							top:        '50%',
							left:       '50%',
							transform:  'translate(-50%, -50%)',
							width:      2,
							height:     32,
							borderRadius: 1,
							bgcolor:    '#555',
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
		</WoscopeProvider>
		</ErrorBoundary>
	);
}
