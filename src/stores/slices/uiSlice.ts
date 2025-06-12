import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';

type UISliceProps = Pick<
	AppStore,
	| 'ui'
	| 'setSelectedNodes'
	| 'setSelectedEdges'
	| 'setIsNodeDragging'
	| 'setIsConnecting'
	| 'setIsNodeAddPanelExpanded'
	| 'toggleNodeAddPanel'
>;

export const createUISlice: StateCreator<AppStore, [], [], UISliceProps> = (
	set
) => ({
	// Initial state
	ui: {
		isNodeDragging: false,
		selectedNodes: [],
		selectedEdges: [],
		isConnecting: false,
		isNodeAddPanelExpanded: false, // Initialize NodeAddPanel as collapsed
	},

	// Actions
	setSelectedNodes: (nodeIds: string[]) => {
		set((state) => ({
			ui: {
				...state.ui,
				selectedNodes: nodeIds,
			},
		}));
	},

	setSelectedEdges: (edgeIds: string[]) => {
		set((state) => ({
			ui: {
				...state.ui,
				selectedEdges: edgeIds,
			},
		}));
	},

	setIsNodeDragging: (isDragging: boolean) => {
		set((state) => ({
			ui: {
				...state.ui,
				isNodeDragging: isDragging,
			},
		}));
	},

	setIsConnecting: (isConnecting: boolean) => {
		set((state) => ({
			ui: {
				...state.ui,
				isConnecting,
			},
		}));
	},

	setIsNodeAddPanelExpanded: (isExpanded: boolean) => {
		set((state) => ({
			ui: {
				...state.ui,
				isNodeAddPanelExpanded: isExpanded,
			},
		}));
	},

	toggleNodeAddPanel: () => {
		set((state) => {
			const newState = !state.ui.isNodeAddPanelExpanded;
			console.log(
				`🎛️ Toggling node add panel: ${state.ui.isNodeAddPanelExpanded} -> ${newState}`
			);
			return {
				ui: {
					...state.ui,
					isNodeAddPanelExpanded: newState,
				},
			};
		});
	},
});
