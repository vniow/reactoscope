import { type NodeSlots } from './NodeSlots';

/**
 * Utility for building slot-based node content
 */
export function createNodeSlots(slots: Partial<NodeSlots>): NodeSlots {
	return {
		header: slots.header,
		toolbar: slots.toolbar,
		content: slots.content,
		footer: slots.footer,
	};
}
