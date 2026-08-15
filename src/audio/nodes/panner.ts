import { Panner, Split } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PannerNodeData } from '../../store/dawTypes';

// Panner wraps a single stereo StereoPannerNode with no native separate L/R
// taps — out-0/out-1 are satisfied by an internal Split(2), same shape as
// player.ts's/grainPlayer.ts's split field.

export const pannerHandler: NodeTypeHandler<PannerNodeData> = {
	defaultData: { label: 'Panner', pan: 0 },

	create(id, data) {
		const toneNode = new Panner(data.pan);
		const split    = new Split(2);
		toneNode.connect(split);
		_audioNodes.set(id, { kind: 'panner', toneNode, split });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'panner') return;
		e.toneNode.dispose();
		e.split.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'panner') return;
		if (update.pan !== undefined) e.toneNode.pan.value = update.pan;
	},
};
