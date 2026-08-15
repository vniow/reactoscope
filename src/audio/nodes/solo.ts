import { Solo } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { SoloNodeData } from '../../store/dawTypes';

// Solo has no configurable params exposed through the generic setNodeParam
// path — which instance is soloed is store-driven (daw.ts's soloedNodeId,
// ADR-0003), set via setSoloed() below, not through NodeTypeHandler. Channel
// (src/audio/nodes/channel.ts) shares Tone's own static solo registry with
// Solo, so setSoloed() below handles both entry kinds rather than duplicating
// this function there.

export const soloHandler: NodeTypeHandler<SoloNodeData> = {
	defaultData: { label: 'Solo' },

	create(id) {
		const toneNode = new Solo();
		_audioNodes.set(id, { kind: 'solo', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'solo') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params — see setSoloed().
	},
};

/** Solos or unsolos this instance. Tone's own static registry mutes every other Solo/Channel instance in the context. */
export function setSoloed(id: string, soloed: boolean): void {
	const e = _audioNodes.get(id);
	if (e?.kind !== 'solo' && e?.kind !== 'channel') return;
	e.toneNode.solo = soloed;
}
