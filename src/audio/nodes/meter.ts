import { Meter } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { MeterNodeData } from '../../store/dawTypes';

function getEntry(id: string) {
	const e = _audioNodes.get(id);
	return e?.kind === 'meter' ? e : undefined;
}

export const meterHandler: NodeTypeHandler<MeterNodeData> = {
	defaultData: { label: 'Meter', smoothing: 0.8, normalRange: false },

	create(id, data) {
		const toneNode = new Meter(data.smoothing);
		toneNode.normalRange = data.normalRange;
		_audioNodes.set(id, { kind: 'meter', toneNode });
	},

	dispose(id) {
		const e = getEntry(id);
		if (!e) return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = getEntry(id);
		if (!e) return;
		if (update.smoothing   !== undefined) e.toneNode.smoothing   = update.smoothing;
		if (update.normalRange !== undefined) e.toneNode.normalRange = update.normalRange;
	},
};

/** Live-polled RMS level (single channel input, so always a plain number). */
export function getMeterValue(id: string): number | null {
	const e = getEntry(id);
	if (!e) return null;
	const v = e.toneNode.getValue();
	return Array.isArray(v) ? (v[0] ?? 0) : v;
}
