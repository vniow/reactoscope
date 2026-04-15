import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { useDawStore } from '../store/daw';
import { GainControl }           from '../components/GainControl';
import { VisualizationControls } from '../components/VisualizationControls';
import { PhosphorControl }       from '../components/PhosphorControl';

/**
 * Right sidebar panel.
 * When no node is selected: shows the woahscope visualization controls.
 * When a node is selected: the node's own inline controls are sufficient,
 * so this panel is hidden (returns null).
 */
export function NodeControlsPanel() {
	const selectedNodeId = useDawStore(s => s.selectedNodeId);

	if (selectedNodeId !== null) return null;

	return (
		<Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, alignItems: 'center' }}>
				<PhosphorControl />
				<VisualizationControls />
			</Box>
			<Divider />
			<GainControl />
		</Box>
	);
}
