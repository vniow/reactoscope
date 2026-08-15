import { Channel } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { ChannelNodeData } from '../../store/dawTypes';

// Solo state is NOT threaded through here — Channel and Solo share Tone's own
// static solo registry, and which instance is soloed is store-driven (daw.ts's
// soloedNodeId, ADR-0003), set via setSoloed() in solo.ts, not through
// setAudioParam. See ChannelNodeData's comment in dawTypes.ts.

export const channelHandler: NodeTypeHandler<ChannelNodeData> = {
	defaultData: { label: 'Channel', volume: 0, pan: 0, mute: false },

	create(id, data) {
		const toneNode = new Channel({ volume: data.volume, pan: data.pan, mute: data.mute });
		_audioNodes.set(id, { kind: 'channel', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'channel') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'channel') return;
		if (update.volume !== undefined) e.toneNode.volume.value = update.volume;
		if (update.pan    !== undefined) e.toneNode.pan.value    = update.pan;
		if (update.mute   !== undefined) e.toneNode.mute          = update.mute;
	},
};
