import { Recorder, start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { RecorderNodeData, RecorderAudioEntry } from '../../store/dawTypes';

// ─── Recorder node ────────────────────────────────────────────────────────────
// No live params (docs/adr/0006-recorder-v1-interaction-scope.md): mimeType is
// constructor-only on Tone's Recorder, so v1 skips it entirely rather than
// rebuilding the toneNode on every change. Sink topology — in-0 only, no
// output. Own start/pause/stop lifecycle functions below, called directly by
// the node's UI, mirroring player.ts's playNode/pauseNode/seekNode precedent
// rather than threading record/pause/stop-with-blob through the shared
// NodeTypeHandler.start/stop protocol (reserved for single-use-source restart).

function getEntry(id: string): RecorderAudioEntry | undefined {
	const e = _audioNodes.get(id);
	return e?.kind === 'recorder' ? e : undefined;
}

export const recorderHandler: NodeTypeHandler<RecorderNodeData> = {
	defaultData: { label: 'Recorder' },

	create(id) {
		const toneNode = new Recorder();
		_audioNodes.set(id, { kind: 'recorder', toneNode });
	},

	dispose(id) {
		const entry = getEntry(id);
		if (!entry) return;
		if (entry.toneNode.state === 'started') entry.toneNode.stop().catch(() => {});
		entry.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() { /* no live params — see ADR-0006 */ },
};

// ─── Recording operations ──────────────────────────────────────────────────────

export function isRecorderSupported(): boolean {
	return Recorder.supported;
}

export async function startRecordingNode(id: string): Promise<void> {
	const entry = getEntry(id);
	if (!entry) return;
	await toneStart();
	await entry.toneNode.start();
}

export function pauseRecordingNode(id: string): void {
	const entry = getEntry(id);
	if (!entry) return;
	entry.toneNode.pause();
}

export async function stopRecordingNode(id: string): Promise<Blob | null> {
	const entry = getEntry(id);
	if (!entry) return null;
	return entry.toneNode.stop();
}

export function getRecorderState(id: string): 'started' | 'stopped' | 'paused' {
	const entry = getEntry(id);
	return entry?.toneNode.state ?? 'stopped';
}
