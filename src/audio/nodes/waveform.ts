import { Waveform } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { WaveformNodeData } from '../../store/dawTypes';

function getEntry(id: string) {
	const e = _audioNodes.get(id);
	return e?.kind === 'waveform' ? e : undefined;
}

export const waveformHandler: NodeTypeHandler<WaveformNodeData> = {
	defaultData: { label: 'Waveform', size: 1024 },

	create(id, data) {
		const toneNode = new Waveform(data.size);
		_audioNodes.set(id, { kind: 'waveform', toneNode });
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
		if (update.size !== undefined) e.toneNode.size = update.size;
	},
};

/** Live-polled raw waveform samples. */
export function getWaveformValue(id: string): Float32Array | null {
	const e = getEntry(id);
	return e ? e.toneNode.getValue() : null;
}
