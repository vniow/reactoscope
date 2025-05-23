import type { NodeTypes } from '@xyflow/react';
import FileNode from './FileNode';
import DebugNode from './DebugNode';
import OscillatorNode from './OscillatorNode';

const nodeTypes: NodeTypes = {
	fileNode: FileNode,
	debugNode: DebugNode,
	oscillatorNode: OscillatorNode,
};

export default nodeTypes;
