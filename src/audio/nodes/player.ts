import { Player, Split, start as toneStart } from 'tone';
import { _audioNodes, getAudioCurrentTime } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { PlayerNodeData, PlayerAudioEntry } from '../../store/dawTypes';

// ─── Player node ──────────────────────────────────────────────────────────────
// Position is tracked against the AudioContext's own clock (startOffset +
// elapsed-since-startedAt * rate) — not Tone.Transport. Transport is a global
// singleton; an earlier version of this module used it as a shared stopwatch,
// which meant starting/seeking one Player node reset the position readout of
// every other Player node on the canvas. getAudioCurrentTime() is monotonic
// like Transport but not stateful/resettable, so nothing here can stomp on
// another node's tracking.

const START_LATENCY = 0.01; // matches the '+0.01' scheduling offset passed to toneNode.start()

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
			startedAt:      0,
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

	setAudioParam() { /* playback is driven by the operations below */ },
};

// ─── Playback operations ──────────────────────────────────────────────────────

export async function playNode(id: string): Promise<void> {
	const entry = getEntry(id);
	if (!entry) return;

	await toneStart();
	entry.toneNode.start('+0.01', entry.startOffset);
	entry.startedAt = getAudioCurrentTime() + START_LATENCY;
	entry.isPlaying = true;
}

export function pauseNode(id: string): void {
	const entry = getEntry(id);
	if (!entry) return;

	entry.startOffset    = getNodePosition(id);
	entry.isExplicitStop = true;
	entry.toneNode.stop();
	entry.isPlaying = false;
}

export function seekNode(id: string, seconds: number): void {
	const entry = getEntry(id);
	if (!entry) return;

	entry.startOffset = seconds;
	if (entry.toneNode.state === 'started') {
		entry.isExplicitStop = true;
		entry.toneNode.seek(seconds);
		entry.startedAt = getAudioCurrentTime();
	}
}

export async function loadTrackForNode(id: string, url: string): Promise<void> {
	const entry = getEntry(id);
	if (!entry) return;

	if (entry.toneNode.state === 'started') {
		entry.isExplicitStop = true;
		entry.toneNode.stop();
	}
	entry.startOffset = 0;
	entry.isPlaying   = false;
	await entry.toneNode.load(url);
}

export function setNodeRate(id: string, rate: number): void {
	const entry = getEntry(id);
	if (!entry) return;

	if (entry.toneNode.state === 'started') {
		entry.startOffset = getNodePosition(id);
		entry.startedAt   = getAudioCurrentTime();
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
	return entry.startOffset + (getAudioCurrentTime() - entry.startedAt) * entry.currentRate;
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
