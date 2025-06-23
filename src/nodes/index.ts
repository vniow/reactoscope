import { OscillatorNode } from './OscillatorNode';
import { DestinationNode } from './DestinationNode';
import { MultiOscillatorNode } from './MultiOscillatorNode';
import { OscilloscopeNode } from './OscilloscopeNode';
import { SimpleOscNode } from './SimpleOscNode';
import { SimpleXYScope } from './SimpleXYScope';
import { NoiseGeneratorNode } from './NoiseGeneratorNode';
import { ThreeFiberNode } from './ThreeFiberNode';

export const nodeTypes = {
	oscillator: OscillatorNode,
	destination: DestinationNode,
	multioscillator: MultiOscillatorNode,
	oscilloscope: OscilloscopeNode,
	simpleosc: SimpleOscNode,
	simplexy: SimpleXYScope,
	noisegen: NoiseGeneratorNode,
	threefiber: ThreeFiberNode,
};

export {
	OscillatorNode,
	DestinationNode,
	MultiOscillatorNode,
	OscilloscopeNode,
	SimpleOscNode,
	SimpleXYScope,
	NoiseGeneratorNode,
	ThreeFiberNode,
};
export * from './types';
