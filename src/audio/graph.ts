/**
 * Legacy audio graph singleton — kept for its playback API (play, pause, seek, etc.)
 * which is no longer the primary audio path.
 *
 * The DAW store (src/store/daw.ts) now owns the audio graph.
 * getWaveformData is re-exported from there so WoahcopeSceneR3F continues
 * to import it from this module without changes.
 *
 * Signal chain (legacy, connected to Destination directly):
 *   Player → Destination
 */

import { Player, getTransport, start as toneStart } from 'tone';
import { disposeSharedTextures } from '../woahscope/materials';

// ─── getWaveformData is now owned by the DAW store ───────────────────────────
export { getWaveformData } from '../store/daw';

// ─── Lazy graph initialisation ────────────────────────────────────────────────

interface AudioGraph {
	player:    Player;
	transport: ReturnType<typeof getTransport>;
}

let _graph: AudioGraph | null = null;

function getGraph(): AudioGraph {
	if (_graph) return _graph;

	// Instantiated here rather than at module scope so that constructing Tone.js
	// nodes (which may touch AudioContext) never happens at import time.
	const transport = getTransport();
	const player    = new Player();

	player.toDestination();

	player.onstop = () => {
		if (_isExplicitStop) {
			_isExplicitStop = false;
			return;
		}
		// Natural end of track
		transport.stop();
		_startOffset = 0;
		_playbackEndCb?.();
	};

	_graph = { player, transport };
	return _graph;
}

// ─── Internal playback state ──────────────────────────────────────────────────

let _startOffset     = 0;    // track position (s) at the last play() or seek()
let _currentRate     = 1;    // mirrors player.playbackRate
let _isExplicitStop  = false; // true when stop/pause/seek initiated the onstop
let _playbackEndCb: (() => void) | null = null;

// ─── Track loading ────────────────────────────────────────────────────────────

export async function loadTrack(url: string): Promise<void> {
	const { player, transport } = getGraph();
	if (player.state === 'started') {
		_isExplicitStop = true;
		player.stop();
		transport.stop();
	}
	transport.seconds = 0;
	_startOffset = 0;
	await player.load(url);
}

// ─── Playback control ─────────────────────────────────────────────────────────

export async function play(): Promise<void> {
	const { player, transport } = getGraph();
	await toneStart();
	// Reset transport so elapsed = transport.seconds starts from 0
	transport.stop();
	transport.seconds = 0;
	player.start('+0.01', _startOffset);
	transport.start('+0.01');
}

export function pause(): void {
	const { player, transport } = getGraph();
	_startOffset = getPosition();
	_isExplicitStop = true;
	player.stop();
	transport.stop();
}

export function seek(seconds: number): void {
	const { player, transport } = getGraph();
	const wasPlaying = player.state === 'started';
	_startOffset = seconds;
	if (wasPlaying) {
		_isExplicitStop = true;
		player.stop();
		transport.stop();
		transport.seconds = 0;
		player.start('+0.01', _startOffset);
		transport.start('+0.01');
	}
}

export function setMuted(muted: boolean): void {
	getGraph().player.mute = muted;
}

export function setRate(rate: number): void {
	const { player, transport } = getGraph();
	if (player.state === 'started') {
		// Commit current position before changing rate, so the formula
		// _startOffset + transport.seconds * _currentRate stays continuous.
		_startOffset = getPosition();
		transport.stop();
		transport.seconds = 0;
		transport.start('+0.01');
	}
	_currentRate = rate;
	player.playbackRate = rate;
}

// ─── State queries ────────────────────────────────────────────────────────────

/**
 * Current playback position in seconds.
 * Uses transport.seconds × playbackRate for high-accuracy elapsed time.
 */
export function getPosition(): number {
	const { player, transport } = getGraph();
	if (player.state !== 'started') return _startOffset;
	return _startOffset + transport.seconds * _currentRate;
}

export function getDuration(): number {
	const { player } = getGraph();
	return player.loaded ? player.buffer.duration : 0;
}

export function getIsLoaded(): boolean {
	return getGraph().player.loaded;
}

export function getIsPlaying(): boolean {
	return getGraph().player.state === 'started';
}

/** Register a callback invoked when the track ends naturally (not on explicit stop/pause). */
export function onPlaybackEnd(cb: () => void): void {
	_playbackEndCb = cb;
}

/** Clear the end-of-track callback (call on component unmount to prevent stale closures). */
export function clearPlaybackEndCallback(): void {
	_playbackEndCb = null;
}

/**
 * Dispose all Tone.js nodes and stop playback.
 * Call once when the audio system is no longer needed (e.g. page unload).
 */
export function dispose(): void {
	if (!_graph) return;
	const { player, transport } = _graph;
	if (player.state === 'started') {
		_isExplicitStop = true;
		player.stop();
		transport.stop();
	}
	_playbackEndCb = null;
	player.dispose();
	_graph = null;
	disposeSharedTextures();
}

// Tear down on page unload to release AudioContext resources.
window.addEventListener('beforeunload', dispose, { once: true });
