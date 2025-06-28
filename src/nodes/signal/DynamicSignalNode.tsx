/**
 * Dynamic Signal Node Component
 *
 * Routes to specific signal node components based on node data.
 */

import type { NodeProps } from '@xyflow/react';
import { SignalNodeComponent } from '../PlaceholderNodes';
import { OscilloscopeNode } from './OscilloscopeNode';
import type { AppNode } from '../types';

export function DynamicSignalNode(props: NodeProps<AppNode>) {
	const { data } = props;

	// Route to specific component based on node data
	switch (data?.label) {
		case 'Oscilloscope':
			return <OscilloscopeNode {...props} />;
		case 'Analyzer':
		case 'Meter':
		default: {
			// Use placeholder for not-yet-implemented nodes
			// Create a signal-typed node for the placeholder component
			const signalProps = {
				...props,
				type: 'signal' as const,
			};
			return <SignalNodeComponent {...signalProps} />;
		}
	}
}
