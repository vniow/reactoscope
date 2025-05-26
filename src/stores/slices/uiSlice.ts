import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';

type UISliceProps = Pick<
	AppStore,
	| 'ui'
	| 'setSelectedNodes'
	| 'setSelectedEdges'
	| 'setIsNodeDragging'
	| 'setIsConnecting'
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
});
