/**
 * Dynamic Effect Node Component
 *
 * Routes to specific effect node components based on node data.
 */

import type { NodeProps } from '@xyflow/react';
import { EffectNodeComponent } from '../PlaceholderNodes';
import { BitCrusherNode } from './BitCrusherNode';
import type { AppNode } from '../types';

export function DynamicEffectNode(props: NodeProps<AppNode>) {
	const { data } = props;

	// Route to specific component based on node data
	switch (data?.label) {
		case 'BitCrusher':
		case 'Bit Crusher':
			return <BitCrusherNode {...props} />;

		case 'Filter':
		case 'Delay':
		case 'Reverb':
		case 'Compressor':
		case 'Distortion':
		default: {
			// Use placeholder for not-yet-implemented nodes
			// Create an effect-typed node for the placeholder component
			const effectProps = {
				...props,
				type: 'effect' as const,
			};
			return <EffectNodeComponent {...effectProps} />;
		}
	}
}
