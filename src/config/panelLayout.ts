import { GRID_UNIT } from './grid';

// Panel layout configuration
export const PANEL_LAYOUT = {
	// Main panel dimensions
	width: GRID_UNIT * 5, // 384px
	heightCollapsed: GRID_UNIT * 9, // 256px
	heightExpanded: GRID_UNIT * 12, // Increased to accommodate metallic selector

	// Grid positions for each section
	sections: {
		header: { gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		quickAdd: { gridX: 0, gridY: 1, gridWidth: 6, gridHeight: 2 },
		testFlow: { gridX: 0, gridY: 3, gridWidth: 6, gridHeight: 1 },
		detailedOptions: { gridX: 0, gridY: 4, gridWidth: 6, gridHeight: 6 },
		metallicTheme: { gridX: 0, gridY: 10, gridWidth: 6, gridHeight: 3 },
		transportControls: { gridX: 0, gridY: 14, gridWidth: 6, gridHeight: 1 },
	},

	// Quick add grid configuration
	quickAdd: {
		columns: 4,
		maxItems: 8,
	},
} as const;

// Calculate section heights for easier access
export const SECTION_HEIGHTS = {
	header: PANEL_LAYOUT.sections.header.gridHeight * GRID_UNIT,
	quickAdd: PANEL_LAYOUT.sections.quickAdd.gridHeight * GRID_UNIT,
	testFlow: PANEL_LAYOUT.sections.testFlow.gridHeight * GRID_UNIT,
	detailedOptions: PANEL_LAYOUT.sections.detailedOptions.gridHeight * GRID_UNIT,
	metallicTheme: PANEL_LAYOUT.sections.metallicTheme.gridHeight * GRID_UNIT,
	transportControls:
		PANEL_LAYOUT.sections.transportControls.gridHeight * GRID_UNIT,
} as const;
