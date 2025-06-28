/**
 * Dynamic Component Node Component
 *
 * Routes to specific component node components based on node data.
 */

import type { NodeProps } from '@xyflow/react';
import { ComponentNodeComponent } from '../PlaceholderNodes';
import { DualGainNode } from './DualGainNode';
import type { AppNode } from '../types';

export function DynamicComponentNode(props: NodeProps<AppNode>) {
	const { data } = props;

	// Route to specific component based on node data
	switch (data?.label) {
		case 'Dual Gain': {
			return <DualGainNode {...props} />;
		}
		case 'Gain':
		case 'Panner':
		case 'Envelope':
		case 'LFO':
		default: {
			// Use placeholder for not-yet-implemented nodes
			// Create a component-typed node for the placeholder component
			const componentProps = {
				...props,
				type: 'component' as const,
			};
			return <ComponentNodeComponent {...componentProps} />;
		}
	}
}
