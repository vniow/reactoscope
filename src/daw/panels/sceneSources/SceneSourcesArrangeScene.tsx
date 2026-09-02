/**
 * Canvas-native source selection + arrangement (issue #43's winning
 * prototype variant, folded in for real): click a source in the scene to
 * select it, drei's <TransformControls> gizmo attaches to the selection
 * (W/E/R mode switch), with a floating duplicate/delete toolbar. Orbit
 * controls disable while dragging so they don't fight the gizmo.
 */

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Html, TransformControls } from '@react-three/drei';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDawStore } from '../../../store/daw';
import { hwIconBtn, hwToggleSx } from '../../nodes/shared/hwStyles';
import { NODE_COLORS } from '../../nodes/shared/nodeColors';
import { sourceRegistry } from '../../../scene/sources/sourceRegistry';
import { EXCLUDE_FROM_SCAN_KEY } from '../../../scene/pathBuilder';

const ACCENT = NODE_COLORS.scene;
type Mode = 'translate' | 'rotate' | 'scale';

export function SceneSourcesArrangeScene() {
	const sources          = useDawStore(s => s.sources);
	const selectedSourceId = useDawStore(s => s.selectedSourceId);
	const setSelectedSourceId   = useDawStore(s => s.setSelectedSourceId);
	const updateSourceTransform = useDawStore(s => s.updateSourceTransform);
	const duplicateSource        = useDawStore(s => s.duplicateSource);
	const removeSource           = useDawStore(s => s.removeSource);

	// The mounted THREE.Group per source id, held in state rather than a ref:
	// the gizmo and the floating toolbar are rendered *from* this object, so
	// React has to re-render once it exists. This previously lived in a ref with
	// a forceRerender counter alongside it, which meant deciding what to draw by
	// reading a ref during render — the same re-render, but invisible to React.
	const [groups, setGroups] = useState<Record<string, THREE.Group | null>>({});
	const [mode, setMode] = useState<Mode>('translate');
	const orbit = useThree(s => s.controls) as unknown as { enabled: boolean } | null;

	// Stable per-id ref callbacks — a fresh inline arrow function every render
	// would make React detach and re-attach every ref on every single render.
	// Keyed on the source *ids* rather than the `sources` array itself: dragging
	// the gizmo rewrites `sources` on every frame (via updateSourceTransform),
	// which would otherwise rebuild these callbacks mid-drag. The identity check
	// below makes a repeat attach a no-op, so re-attaching can't loop.
	const sourceIdKey  = JSON.stringify(sources.map(s => s.id));
	const refCallbacks = useMemo(() => {
		const map: Record<string, (el: THREE.Group | null) => void> = {};
		for (const id of JSON.parse(sourceIdKey) as string[]) {
			map[id] = (el: THREE.Group | null) =>
				setGroups(prev => (prev[id] === el ? prev : { ...prev, [id]: el }));
		}
		return map;
	}, [sourceIdKey]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA') return;
			if (e.key === 'w' || e.key === 'W') setMode('translate');
			if (e.key === 'e' || e.key === 'E') setMode('rotate');
			if (e.key === 'r' || e.key === 'R') setMode('scale');
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const selectedObj    = selectedSourceId ? groups[selectedSourceId] ?? null : null;
	const selectedSource = sources.find(s => s.id === selectedSourceId) ?? null;

	const commitTransform = () => {
		if (!selectedSourceId) return;
		const obj = groups[selectedSourceId];
		if (!obj) return;
		updateSourceTransform(selectedSourceId, {
			position: [obj.position.x, obj.position.y, obj.position.z],
			rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
			scale:    [obj.scale.x, obj.scale.y, obj.scale.z],
		});
	};

	return (
		<group onPointerMissed={() => setSelectedSourceId(null)}>
			{sources.map((s) => {
				const Source = sourceRegistry[s.type];
				return (
					<group
						key={s.id}
						onClick={e => { e.stopPropagation(); setSelectedSourceId(s.id === selectedSourceId ? null : s.id); }}
					>
						<Source ref={refCallbacks[s.id]} id={s.id} data={s.data} />
					</group>
				);
			})}

			{selectedObj && selectedSource && (
				<>
					<TransformControls
						// The gizmo (rings/arrows) is real THREE.Line geometry living in
						// this same scene — exclude it from the audio-beam scan, or it
						// shows up as extra lines in the oscilloscope output.
						ref={el => { if (el) el.userData[EXCLUDE_FROM_SCAN_KEY] = true; }}
						object={selectedObj}
						mode={mode}
						onMouseDown={() => { if (orbit) orbit.enabled = false; }}
						onMouseUp={() => { if (orbit) orbit.enabled = true; commitTransform(); }}
						onObjectChange={commitTransform}
					/>
					<Html position={selectedObj.position} center style={{ pointerEvents: 'none' }}>
						<Box sx={{
							display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
							transform: 'translateY(-38px)', pointerEvents: 'auto',
						}}>
							<ToggleButtonGroup size='small' exclusive value={mode}
								onChange={(_, v) => v && setMode(v)} sx={hwToggleSx(ACCENT)}>
								<ToggleButton value='translate'><Tooltip title='Translate (W)'><span>Move</span></Tooltip></ToggleButton>
								<ToggleButton value='rotate'><Tooltip title='Rotate (E)'><span>Rot</span></Tooltip></ToggleButton>
								<ToggleButton value='scale'><Tooltip title='Scale (R)'><span>Scale</span></Tooltip></ToggleButton>
							</ToggleButtonGroup>
							<Box sx={{
								display: 'flex', gap: 0.5,
								bgcolor: 'rgba(20,20,24,0.9)', border: `1px solid ${ACCENT}60`, borderRadius: 1, p: 0.25,
							}}>
								<Tooltip title='Duplicate' placement='top'>
									<IconButton size='small' onClick={() => duplicateSource(selectedSource.id)} sx={{ ...hwIconBtn(ACCENT), p: 0.3 }}>
										<ContentCopyIcon sx={{ fontSize: 11 }} />
									</IconButton>
								</Tooltip>
								<Tooltip title='Delete' placement='top'>
									<IconButton size='small' onClick={() => removeSource(selectedSource.id)} sx={{ ...hwIconBtn(ACCENT), p: 0.3 }}>
										<DeleteIcon sx={{ fontSize: 11 }} />
									</IconButton>
								</Tooltip>
							</Box>
						</Box>
					</Html>
				</>
			)}
		</group>
	);
}
