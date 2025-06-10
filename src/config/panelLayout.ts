import { GRID_UNIT } from './grid';

// Panel layout configuration
export const PANEL_LAYOUT = {
	// Main panel dimensions
	width: GRID_UNIT * 6, // 384px (match the w-96 class which is 24rem = 384px)
	heightCollapsed: GRID_UNIT * 2, // 128px - just the header when collapsed
	heightExpanded: GRID_UNIT * 12, // 768px - full height when expanded to show all variants

	// Grid positions for each section
	sections: {
		header: { gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 1 },
		nodeGroups: { gridX: 0, gridY: 1, gridWidth: 6, gridHeight: 11 }, // Large area for variant groups
	},

	// Node group configuration
	nodeGroups: {
		itemsPerRow: 3, // 3 nodes per row for better readability in sections
		sectionSpacing: 16, // Space between variant sections
	},
} as const;

// Calculate section heights for easier access
export const SECTION_HEIGHTS = {
	header: PANEL_LAYOUT.sections.header.gridHeight * GRID_UNIT,
	nodeGroups: PANEL_LAYOUT.sections.nodeGroups.gridHeight * GRID_UNIT,
} as const;
