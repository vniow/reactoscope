// Internal node component imports
import { nodeTypes } from './nodeRegistry';

// Type imports
import type { AppNode } from './types';

export const initialNodes: AppNode[] = [
	// Start with no initial nodes - users can add nodes as needed
	// This prevents handle ID conflicts and other initialization issues
];

// Use the nodeTypes from the centralized registry
export { nodeTypes };
