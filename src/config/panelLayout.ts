import { GRID_UNIT } from './grid';

// Panel layout configuration
export const PANEL_LAYOUT = {
	// Main panel dimensions
	width: GRID_UNIT * 6, // 384px (match the w-96 class which is 24rem = 384px)
	heightCollapsed: GRID_UNIT * 5, // 320px
	heightExpanded: GRID_UNIT * 11, // Height for expanded panel without metallic theme

	// Grid positions for each section
	sections: {
		header: { gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		quickAdd: { gridX: 0, gridY: 1, gridWidth: 6, gridHeight: 3 },
		testFlow: { gridX: 0, gridY: 4, gridWidth: 6, gridHeight: 1 },
		detailedOptions: { gridX: 0, gridY: 5, gridWidth: 6, gridHeight: 5 },
		transportControls: { gridX: 0, gridY: 10, gridWidth: 6, gridHeight: 1 },
	},

	// Quick add grid configuration
	quickAdd: {
		columns: 4,
		maxItems: 12,
	},
} as const;

// Calculate section heights for easier access
export const SECTION_HEIGHTS = {
	header: PANEL_LAYOUT.sections.header.gridHeight * GRID_UNIT,
	quickAdd: PANEL_LAYOUT.sections.quickAdd.gridHeight * GRID_UNIT,
	testFlow: PANEL_LAYOUT.sections.testFlow.gridHeight * GRID_UNIT,
	detailedOptions: PANEL_LAYOUT.sections.detailedOptions.gridHeight * GRID_UNIT,
	transportControls:
		PANEL_LAYOUT.sections.transportControls.gridHeight * GRID_UNIT,
} as const;
