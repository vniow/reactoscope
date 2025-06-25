import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from './appStore';

// Theme hooks with performance optimization
export const useTheme = () => {
	return useAppStore(
		useShallow((state) => ({
			theme: state.theme.current,
			actualTheme: state.theme.actualTheme,
			setTheme: state.setTheme,
		}))
	);
};

export const useActualTheme = () => {
	return useAppStore((state) => state.theme.actualTheme);
};

export const useMetallicTheme = () => {
	return useAppStore(
		useShallow((state) => ({
			metallicBackground: state.theme.metallicBackground,
			setMetallicBackground: state.setMetallicBackground,
		}))
	);
};

// UI state hooks
export const useUIState = () => {
	return useAppStore(
		useShallow((state) => ({
			selectedNodes: state.ui.selectedNodes,
			selectedEdges: state.ui.selectedEdges,
			isNodeDragging: state.ui.isNodeDragging,
			isConnecting: state.ui.isConnecting,
			isNodeAddPanelExpanded: state.ui.isNodeAddPanelExpanded,
			setSelectedNodes: state.setSelectedNodes,
			setSelectedEdges: state.setSelectedEdges,
			setIsNodeDragging: state.setIsNodeDragging,
			setIsConnecting: state.setIsConnecting,
			setIsNodeAddPanelExpanded: state.setIsNodeAddPanelExpanded,
			toggleNodeAddPanel: state.toggleNodeAddPanel,
		}))
	);
};

// Flow operations hooks
export const useFlowOperations = () => {
	return useAppStore(
		useShallow((state) => ({
			removeNode: state.removeNode,
			updateNode: state.updateNode,
			addNode: state.addNode,
			setNodes: state.setNodes,
			setEdges: state.setEdges,
		}))
	);
};
