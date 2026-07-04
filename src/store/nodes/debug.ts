import type { NodeTypeHandler } from './nodeHandler';
import type { DebugNodeData } from '../dawTypes';

export const debugHandler: NodeTypeHandler<DebugNodeData> = {
	defaultData: { label: 'Debug' },
	create()         { /* no audio */ },
	dispose()        { /* no audio */ },
	setAudioParam()  { /* no audio */ },
};
