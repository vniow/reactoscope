import { UserMedia, start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { MicInputNodeData, MicInputAudioEntry } from '../../store/dawTypes';

function getEntry(id: string): MicInputAudioEntry | undefined {
	const e = _audioNodes.get(id);
	return e?.kind === 'micInput' ? e : undefined;
}

export const micInputHandler: NodeTypeHandler<MicInputNodeData> = {
	defaultData: { label: 'Mic' },

	create(id) {
		const toneNode = new UserMedia();
		_audioNodes.set(id, { kind: 'micInput', toneNode });
	},

	dispose(id) {
		const entry = getEntry(id);
		if (!entry) return;
		try { entry.toneNode.close(); } catch { /* already closed */ }
		entry.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() { /* no tweakable params */ },

	async start(id) {
		const entry = getEntry(id);
		if (!entry) return false;
		await toneStart();
		await entry.toneNode.open();
		return false;
	},

	stop(id) {
		const entry = getEntry(id);
		if (!entry) return;
		entry.toneNode.close();
	},
};

export async function startMicInput(id: string): Promise<void> {
	await micInputHandler.start!(id);
}

export function stopMicInput(id: string): void {
	micInputHandler.stop!(id);
}
