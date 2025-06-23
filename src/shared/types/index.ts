import type {
	Node,
	Edge,
	OnNodesChange,
	OnEdgesChange,
	OnConnect,
	Connection,
} from '@xyflow/react';

// Placeholder for shared types

export interface Handle {
	id: string;
	channel: number;
	label: string;
}

export interface CustomNodeData {
	audioNodeId?: string;
	inputs?: Handle[];
	outputs?: Handle[];
	label?: string;
	[key: string]: unknown; // Allow other properties
}

export type CustomNode = Node<CustomNodeData>;

export interface FlowSlice {
	nodes: CustomNode[];
	edges: Edge[];
	onNodesChange: OnNodesChange<CustomNode>;
	onEdgesChange: OnEdgesChange;
	onConnect: OnConnect;
	addNode: (type: string, position: { x: number; y: number }) => void;
	addOscillatorDestinationPair: () => void;
	addMultiOscillator: () => void;
	addOscilloscope: () => void;
}

export interface AudioSlice {
	addAudioNode: (node: CustomNode) => void;
	removeAudioNode: (nodeId: string) => void;
	connect: (connection: Connection) => void;
	disconnect: (edge: Edge) => void;
}

export type AppState = FlowSlice & AudioSlice;
