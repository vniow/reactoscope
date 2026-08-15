import type { NodeTypeHandler } from './nodeHandler';
import type { StubNodeData } from '../../store/dawTypes';

export const stubHandler: NodeTypeHandler<StubNodeData> = {
	defaultData: { label: 'Stub', kind: 'convolver' },
	create()        { /* not yet implemented */ },
	dispose()       { /* not yet implemented */ },
	setAudioParam() { /* not yet implemented */ },
};
