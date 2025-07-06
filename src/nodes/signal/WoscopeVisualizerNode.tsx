import type { NodeProps } from 'reactflow';
import WoscopeVisualization from './components/WoscopeVisualization';
import { BaseNode } from '../../shared/components/BaseNode';

export function WoscopeVisualizerNode({
	id,
	data,
	selected = false,
}: NodeProps) {
	const {
		lineColor = '#00ff00',
		lineThickness = 0.012,
		lineIntensity = 1.0,
		audioScale = 0.8,
		analyzers = { l: null, r: null },
		isPlaying = true,
	} = data || {};

	return (
		<BaseNode
			nodeId={id}
			selected={selected}
			title='Woscope Visualizer'
			variant='signal'
		>
			<div style={{ width: '100%', height: '100%' }}>
				<WoscopeVisualization
					analyzers={analyzers}
					isPlaying={isPlaying}
					lineColor={lineColor}
					lineThickness={lineThickness}
					lineIntensity={lineIntensity}
					audioScale={audioScale}
				/>
			</div>
		</BaseNode>
	);
}

export default WoscopeVisualizerNode;
