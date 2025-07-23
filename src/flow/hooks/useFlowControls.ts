import { useState, useCallback } from 'react';
import {
	useTheme,
	useUIState,
	useMetallicTheme,
} from '../../shared/stores/useAppStore';
import { useReactFlow } from '@xyflow/react';
import { createNode } from '../../shared/utils/nodeFactory';
import type { NodeTypeOption } from '../../shared/config/nodeTypes';

/**
 * Custom hook encapsulating logic for flow control panel (container logic).
 */
export function useFlowControls() {
	const { theme, setTheme } = useTheme();
	const [isSaveRestoreModalOpen, setIsSaveRestoreModalOpen] = useState(false);
	const { metallicBackground, setMetallicBackground } = useMetallicTheme();
	const {
		isNodeAddPanelExpanded,
		toggleNodeAddPanel,
		setIsNodeAddPanelExpanded,
	} = useUIState();
	const { zoomIn, zoomOut, fitView, setNodes } = useReactFlow();

	const handleAddNode = useCallback(
		(nodeTypeOption: NodeTypeOption) => {
			const newNode = createNode(nodeTypeOption);
			setNodes((nodes) => [...nodes, newNode]);
			// Close panel after adding
			setIsNodeAddPanelExpanded(false);
		},
		[setNodes, setIsNodeAddPanelExpanded]
	);

	const handleThemeToggle = useCallback(() => {
		if (theme === 'light') setTheme('dark');
		else if (theme === 'dark') setTheme('system');
		else setTheme('light');
	}, [theme, setTheme]);

	const getThemeIcon = useCallback(() => {
		if (theme === 'light') return '☀️';
		if (theme === 'dark') return '🌙';
		return '💻';
	}, [theme]);

	const getThemeTitle = useCallback(() => {
		if (theme === 'light') return 'Switch to Dark Theme';
		if (theme === 'dark') return 'Switch to System Theme';
		return 'Switch to Light Theme';
	}, [theme]);

	const toggleRainbowMetallic = useCallback(() => {
		setMetallicBackground(
			metallicBackground === 'rainbow' ? 'titanium' : 'rainbow'
		);
	}, [metallicBackground, setMetallicBackground]);

	return {
		isSaveRestoreModalOpen,
		setIsSaveRestoreModalOpen,
		metallicBackground,
		isNodeAddPanelExpanded,
		toggleNodeAddPanel,
		zoomIn,
		zoomOut,
		fitView,
		handleAddNode,
		handleThemeToggle,
		getThemeIcon,
		getThemeTitle,
		toggleRainbowMetallic,
	};
}
