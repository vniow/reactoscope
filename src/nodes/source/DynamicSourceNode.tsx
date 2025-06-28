/**
 * Dynamic Source Node Component
 *
 * Routes to specific source node components based on node data.
 */

import type { NodeProps } from '@xyflow/react';
import { OscillatorNode } from './OscillatorNode';
import { SourceNodeComponent } from '../PlaceholderNodes';
import type { BaseNodeData } from '../types';

interface SourceNodeData extends BaseNodeData {
	nodeSubType?: string;
}

export function DynamicSourceNode(props: NodeProps) {
	const { data } = props;
	const nodeData = data as SourceNodeData;

	// Route to specific component based on node data
	switch (nodeData.label) {
		case 'Oscillator':
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return <OscillatorNode {...(props as any)} />;
		case 'Audio Player':
		case 'Noise Generator':
		case 'Microphone':
		default:
			// Use placeholder for not-yet-implemented nodes
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return <SourceNodeComponent {...(props as any)} />;
	}
}
