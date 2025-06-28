/**
 * Dynamic Core Node Component
 *
 * Routes to specific core node components based on node data.
 */

import type { NodeProps } from '@xyflow/react';
import { CoreNodeComponent } from '../PlaceholderNodes';
import { DestinationNode } from './DestinationNode';
import type { AppNode } from '../types';

export function DynamicCoreNode(props: NodeProps<AppNode>) {
	const { data } = props;

	// Route to specific component based on node data
	switch (data?.label) {
		case 'Master Output': {
			return <DestinationNode {...props} />;
		}
		default: {
			// Use placeholder for not-yet-implemented nodes
			// Create a core-typed node for the placeholder component
			const coreProps = {
				...props,
				type: 'core' as const,
			};
			return <CoreNodeComponent {...coreProps} />;
		}
	}
}
