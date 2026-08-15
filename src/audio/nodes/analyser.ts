import { Analyser } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AnalyserNodeData } from '../../store/dawTypes';

function getEntry(id: string) {
	const e = _audioNodes.get(id);
	return e?.kind === 'analyser' ? e : undefined;
}

export const analyserHandler: NodeTypeHandler<AnalyserNodeData> = {
	defaultData: { label: 'Analyser', size: 1024, type: 'fft', smoothing: 0.8 },

	create(id, data) {
		const toneNode = new Analyser(data.type, data.size);
		toneNode.smoothing = data.smoothing;
		_audioNodes.set(id, { kind: 'analyser', toneNode });
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
		if (update.size      !== undefined) e.toneNode.size      = update.size;
		if (update.type      !== undefined) e.toneNode.type      = update.type;
		if (update.smoothing !== undefined) e.toneNode.smoothing = update.smoothing;
	},
};

/** Live-polled readout — FFT bins or waveform samples depending on `type`. Single channel, so always a plain Float32Array. */
export function getAnalyserValue(id: string): Float32Array | null {
	const e = getEntry(id);
	if (!e) return null;
	const v = e.toneNode.getValue();
	return Array.isArray(v) ? (v[0] ?? null) : v;
}
