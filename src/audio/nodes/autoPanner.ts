import { AutoPanner } from 'tone';
import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AutoPannerNodeData } from '../../store/dawTypes';

export const autoPannerHandler: NodeTypeHandler<AutoPannerNodeData> = {
	defaultData: { label: 'Auto Panner', frequency: 1, wet: 1 },

	create(id, data) {
		const toneNode = new AutoPanner({ frequency: data.frequency, wet: data.wet });
		_audioNodes.set(id, { kind: 'autoPanner', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoPanner') return;
		try { e.toneNode.stop(); } catch {}
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoPanner') return;
		if (update.frequency !== undefined) e.toneNode.frequency.value = update.frequency;
		if (update.wet       !== undefined) e.toneNode.wet.value       = update.wet;
	},

	async start(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoPanner') return false;
		await toneStart();
		e.toneNode.start();
		return false;
	},

	stop(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'autoPanner') return;
		e.toneNode.stop();
	},
};
