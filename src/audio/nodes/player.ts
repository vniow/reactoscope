import { Player, Split, getTransport, start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PlayerNodeData, PlayerAudioEntry } from '../../store/dawTypes';

// ─── Player node ──────────────────────────────────────────────────────────────
// Playback is transport-coupled: position is derived from the Tone transport
// clock (startOffset + transport.seconds * rate), so play/pause/seek/rate all
// have to stop and restart the transport in lockstep with the Player. Those
// operations live here as the player module's own interface; the handler covers
// the shared lifecycle protocol (create/dispose).

function getEntry(id: string): PlayerAudioEntry | undefined {
	const e = _audioNodes.get(id);
	return e?.kind === 'player' ? e : undefined;
}

export const playerHandler: NodeTypeHandler<PlayerNodeData> = {
	defaultData: { label: 'Player', trackUrl: '' },

	create(id) {
		const toneNode = new Player();
		const split    = new Split(2);
		toneNode.connect(split);
		const entry: PlayerAudioEntry = {
			kind:           'player',
			toneNode,
			split,
			startOffset:    0,
			currentRate:    1,
			isExplicitStop: false,
			isPlaying:      false,
			playbackEndCb:  null,
		};

		toneNode.onstop = () => {
			if (entry.isExplicitStop) {
				entry.isExplicitStop = false;
				return;
			}
			// Natural end of track
			getTransport().stop();
			entry.startOffset = 0;
			entry.isPlaying   = false;
			entry.playbackEndCb?.();
		};

		_audioNodes.set(id, entry);
	},

	dispose(id) {
		const entry = getEntry(id);
		if (!entry) return;
		if (entry.toneNode.state === 'started') {
			entry.isExplicitStop = true;
			entry.toneNode.stop();
		}
		entry.toneNode.dispose();
		entry.split.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam() { /* playback is driven by the transport helpers below */ },
};

// ─── Transport-coupled playback operations ───────────────────────────────────

export async function playNode(id: string): Promise<void> {
	const entry = getEntry(id);
	if (!entry) return;

	const transport = getTransport();
	await toneStart();
	transport.stop();
	transport.seconds = 0;
	entry.toneNode.start('+0.01', entry.startOffset);
	transport.start('+0.01');
	entry.isPlaying = true;
}

export function pauseNode(id: string): void {
	const entry = getEntry(id);
	if (!entry) return;

	const transport = getTransport();
	entry.startOffset    = getNodePosition(id);
	entry.isExplicitStop = true;
	entry.toneNode.stop();
	transport.stop();
	entry.isPlaying = false;
}

export function seekNode(id: string, seconds: number): void {
	const entry = getEntry(id);
	if (!entry) return;

	const transport  = getTransport();
	const wasPlaying = entry.toneNode.state === 'started';
	entry.startOffset = seconds;
	if (wasPlaying) {
		entry.isExplicitStop = true;
		entry.toneNode.stop();
		transport.stop();
		transport.seconds = 0;
		entry.toneNode.start('+0.01', entry.startOffset);
		transport.start('+0.01');
	}
}

export async function loadTrackForNode(id: string, url: string): Promise<void> {
	const entry = getEntry(id);
	if (!entry) return;

	const transport = getTransport();
	if (entry.toneNode.state === 'started') {
		entry.isExplicitStop = true;
		entry.toneNode.stop();
		transport.stop();
	}
	transport.seconds    = 0;
	entry.startOffset    = 0;
	entry.isPlaying      = false;
	await entry.toneNode.load(url);
}

export function setNodeRate(id: string, rate: number): void {
	const entry = getEntry(id);
	if (!entry) return;

	const transport = getTransport();
	if (entry.toneNode.state === 'started') {
		entry.startOffset = getNodePosition(id);
		transport.stop();
		transport.seconds = 0;
		transport.start('+0.01');
	}
	entry.currentRate           = rate;
	entry.toneNode.playbackRate = rate;
}

export function setNodeMuted(id: string, muted: boolean): void {
	const entry = getEntry(id);
	if (!entry) return;
	entry.toneNode.mute = muted;
}

export function setNodeLoop(id: string, loop: boolean): void {
	const entry = getEntry(id);
	if (!entry) return;
	entry.toneNode.loop = loop;
}

export function getNodePosition(id: string): number {
	const entry = getEntry(id);
	if (!entry) return 0;
	if (!entry.isPlaying) return entry.startOffset;
	return entry.startOffset + getTransport().seconds * entry.currentRate;
}

export function getNodeDuration(id: string): number {
	const entry = getEntry(id);
	if (!entry) return 0;
	return entry.toneNode.loaded ? entry.toneNode.buffer.duration : 0;
}

export function getNodeIsLoaded(id: string): boolean {
	const entry = getEntry(id);
	if (!entry) return false;
	return entry.toneNode.loaded;
}

export function getNodeIsPlaying(id: string): boolean {
	const entry = getEntry(id);
	if (!entry) return false;
	return entry.isPlaying;
}

export function onNodePlaybackEnd(id: string, cb: () => void): void {
	const entry = getEntry(id);
	if (!entry) return;
	entry.playbackEndCb = cb;
}

export function clearNodePlaybackEndCallback(id: string): void {
	const entry = getEntry(id);
	if (!entry) return;
	entry.playbackEndCb = null;
}
