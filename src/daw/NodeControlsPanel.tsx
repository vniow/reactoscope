import { useDawStore } from '../store/daw';

/**
 * Right sidebar panel. Visualiser settings have moved to the canvas overlay (VizSettingsOverlay).
 * This panel is retained as a mount point for future node-specific controls surfaced outside
 * the node card itself, but currently renders nothing.
 */
export function NodeControlsPanel() {
	// Keep the store subscription so the component re-renders when selection changes,
	// ready to show node-specific controls here if needed in future.
	useDawStore(s => s.selectedNodeId);
	return null;
}
