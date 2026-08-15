import { DCMeter } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { DCMeterNodeData } from '../../store/dawTypes';

function getEntry(id: string) {
	const e = _audioNodes.get(id);
	return e?.kind === 'dcMeter' ? e : undefined;
}

export const dcMeterHandler: NodeTypeHandler<DCMeterNodeData> = {
	defaultData: { label: 'DCMeter' },

	create(id) {
		const toneNode = new DCMeter();
		_audioNodes.set(id, { kind: 'dcMeter', toneNode });
	},

	dispose(id) {
		const e = getEntry(id);
		if (!e) return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() {
		// No configurable params.
	},
};

/** Live-polled raw instantaneous sample value (not RMS). */
export function getDCMeterValue(id: string): number | null {
	const e = getEntry(id);
	return e ? e.toneNode.getValue() : null;
}
