import { Follower } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FollowerNodeData } from '../../store/dawTypes';

export const followerHandler: NodeTypeHandler<FollowerNodeData> = {
	defaultData: { label: 'Follower', smoothing: 0.05 },

	create(id, data) {
		const toneNode = new Follower(data.smoothing);
		_audioNodes.set(id, { kind: 'follower', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'follower') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'follower') return;
		if (update.smoothing !== undefined) e.toneNode.smoothing = update.smoothing;
	},
};
