import type { NodeTypes } from '@xyflow/react';
import FileNode from './FileNode';
import DebugNode from './DebugNode';
import OscillatorNode from './OscillatorNode';

// Export individual components and utilities for direct use
export { default as BaseNode, NodeButton, NodePre } from './BaseNode';
export {
	NodeHeader,
	NodeToolbar,
	NodeContent,
	NodeFooter,
	SlottedContent,
	type NodeSlots,
} from './NodeSlots';
export { createNodeSlots } from './nodeSlotUtils';
export { default as DebugNode } from './DebugNode';
export { default as OscillatorNode } from './OscillatorNode';
export { default as FileNode } from './FileNode';

const nodeTypes: NodeTypes = {
	fileNode: FileNode,
	debugNode: DebugNode,
	oscillatorNode: OscillatorNode,
};

export default nodeTypes;
