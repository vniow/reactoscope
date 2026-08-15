import { FFT } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { FFTNodeData } from '../../store/dawTypes';

function getEntry(id: string) {
	const e = _audioNodes.get(id);
	return e?.kind === 'fft' ? e : undefined;
}

export const fftHandler: NodeTypeHandler<FFTNodeData> = {
	defaultData: { label: 'FFT', size: 1024, smoothing: 0.8, normalRange: false },

	create(id, data) {
		const toneNode = new FFT(data.size);
		toneNode.smoothing   = data.smoothing;
		toneNode.normalRange = data.normalRange;
		_audioNodes.set(id, { kind: 'fft', toneNode });
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
		if (update.size        !== undefined) e.toneNode.size        = update.size;
		if (update.smoothing   !== undefined) e.toneNode.smoothing   = update.smoothing;
		if (update.normalRange !== undefined) e.toneNode.normalRange = update.normalRange;
	},
};

/** Live-polled frequency-bin readout, one dB (or 0–1 when normalRange) value per bin. */
export function getFFTValue(id: string): Float32Array | null {
	const e = getEntry(id);
	return e ? e.toneNode.getValue() : null;
}
