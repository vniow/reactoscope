import { GrainPlayer, Split, start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { GrainPlayerNodeData, GrainPlayerAudioEntry } from '../../store/dawTypes';

function getEntry(id: string): GrainPlayerAudioEntry | undefined {
	const e = _audioNodes.get(id);
	return e?.kind === 'grainPlayer' ? e : undefined;
}

export const grainPlayerHandler: NodeTypeHandler<GrainPlayerNodeData> = {
	defaultData: {
		label: 'Grain Player', trackUrl: '',
		grainSize: 0.2, overlap: 0.1, playbackRate: 1, detune: 0,
		loop: true, loopStart: 0, loopEnd: 0, reverse: false,
	},

	create(id, data) {
		const toneNode = new GrainPlayer({
			url:          data.trackUrl     ?? '',
			grainSize:    data.grainSize    ?? 0.2,
			overlap:      data.overlap      ?? 0.1,
			playbackRate: data.playbackRate ?? 1,
			detune:       data.detune       ?? 0,
			loop:         data.loop         ?? true,
			loopStart:    data.loopStart    ?? 0,
			loopEnd:      data.loopEnd      ?? 0,
			reverse:      data.reverse      ?? false,
		});
		const split = new Split(2);
		toneNode.connect(split);
		_audioNodes.set(id, { kind: 'grainPlayer', toneNode, split });
	},

	dispose(id) {
		const entry = getEntry(id);
		if (!entry) return;
		if (entry.toneNode.state === 'started') entry.toneNode.stop();
		entry.toneNode.dispose();
		entry.split.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const entry = getEntry(id);
		if (!entry) return;
		if (update.grainSize    !== undefined) entry.toneNode.grainSize    = update.grainSize;
		if (update.overlap      !== undefined) entry.toneNode.overlap      = update.overlap;
		if (update.playbackRate !== undefined) entry.toneNode.playbackRate = update.playbackRate;
		if (update.detune       !== undefined) entry.toneNode.detune       = update.detune;
		if (update.loop         !== undefined) entry.toneNode.loop         = update.loop;
		if (update.loopStart    !== undefined) entry.toneNode.loopStart    = update.loopStart;
		if (update.loopEnd      !== undefined) entry.toneNode.loopEnd      = update.loopEnd;
		if (update.reverse      !== undefined) entry.toneNode.reverse      = update.reverse;
	},

	async start(id) {
		const entry = getEntry(id);
		if (!entry) return false;
		await toneStart();
		if (entry.toneNode.state !== 'started') entry.toneNode.start();
		return false;
	},

	stop(id) {
		const entry = getEntry(id);
		if (!entry) return;
		if (entry.toneNode.state === 'started') entry.toneNode.stop();
	},
};

// ─── GrainPlayer operations beyond the handler protocol ──────────────────────

export async function startGrainPlayer(id: string): Promise<void> {
	await grainPlayerHandler.start!(id);
}

export function stopGrainPlayer(id: string): void {
	grainPlayerHandler.stop!(id);
}

export async function loadTrackForGrainPlayer(id: string, url: string): Promise<void> {
	const entry = getEntry(id);
	if (!entry) return;
	if (entry.toneNode.state === 'started') entry.toneNode.stop();
	await entry.toneNode.buffer.load(url);
}

export function getGrainPlayerBufferDuration(id: string): number {
	const entry = getEntry(id);
	if (!entry) return 0;
	return entry.toneNode.buffer.loaded ? entry.toneNode.buffer.duration : 0;
}

/** Mute is UI-session state, not part of GrainPlayerNodeData — set it directly. */
export function setGrainPlayerMuted(id: string, muted: boolean): void {
	const entry = getEntry(id);
	if (!entry) return;
	entry.toneNode.mute = muted;
}

export const setGrainPlayerGrainSize    = (id: string, seconds: number) => grainPlayerHandler.setAudioParam(id, { grainSize: seconds });
export const setGrainPlayerOverlap      = (id: string, overlap: number) => grainPlayerHandler.setAudioParam(id, { overlap });
export const setGrainPlayerPlaybackRate = (id: string, rate: number)    => grainPlayerHandler.setAudioParam(id, { playbackRate: rate });
export const setGrainPlayerDetune       = (id: string, cents: number)   => grainPlayerHandler.setAudioParam(id, { detune: cents });
export const setGrainPlayerLoop         = (id: string, loop: boolean)   => grainPlayerHandler.setAudioParam(id, { loop });
export const setGrainPlayerLoopStart    = (id: string, time: number)    => grainPlayerHandler.setAudioParam(id, { loopStart: time });
export const setGrainPlayerLoopEnd      = (id: string, time: number)    => grainPlayerHandler.setAudioParam(id, { loopEnd: time });
export const setGrainPlayerReverse      = (id: string, reverse: boolean) => grainPlayerHandler.setAudioParam(id, { reverse });
