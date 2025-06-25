// Panel layout configuration
export const PANEL_LAYOUT = {
	// Main panel dimensions
	width: '384px', // 384px (match the w-96 class which is 24rem = 384px)
	heightCollapsed: '64px', // 64px - just the header when collapsed
	heightExpanded: '512px', // 512px - reasonable height for scrollable content

	// Layout configuration for each section (no longer grid-based)
	sections: {
		header: { height: '64px' },
		nodeGroups: { height: '448px' }, // Reduced height to fit within expanded panel
	},

	// Node group configuration
	nodeGroups: {
		itemsPerRow: 3, // 3 nodes per row for better readability in sections
		sectionSpacing: 16, // Space between variant sections
	},
} as const;

// Calculate section heights for easier access
export const SECTION_HEIGHTS = {
	header: '64px',
	nodeGroups: '448px',
} as const;
