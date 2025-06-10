import { GRID_UNIT } from './grid';

// Panel layout configuration
export const PANEL_LAYOUT = {
	// Main panel dimensions
	width: GRID_UNIT * 6, // 384px (match the w-96 class which is 24rem = 384px)
	heightCollapsed: GRID_UNIT * 5, // 320px
	heightExpanded: GRID_UNIT * 9, // Height for expanded panel (reduced from 10 after removing test flow)

	// Grid positions for each section
	sections: {
		header: { gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		quickAdd: { gridX: 0, gridY: 1, gridWidth: 6, gridHeight: 3 },
		detailedOptions: { gridX: 0, gridY: 4, gridWidth: 6, gridHeight: 5 }, // Moved up from gridY: 5 to gridY: 4
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
	detailedOptions: PANEL_LAYOUT.sections.detailedOptions.gridHeight * GRID_UNIT,
} as const;
