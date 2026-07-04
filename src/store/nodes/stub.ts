import type { NodeTypeHandler } from './nodeHandler';
import type { StubNodeData } from '../dawTypes';

export const stubHandler: NodeTypeHandler<StubNodeData> = {
	defaultData: { label: 'Stub', kind: 'filter' },
	create()        { /* not yet implemented */ },
	dispose()       { /* not yet implemented */ },
	setAudioParam() { /* not yet implemented */ },
};
