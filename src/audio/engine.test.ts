import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('tone', async () => await import('../test/mockTone'));

import * as engine from './engine';
import type { MockToneNode, UserMedia, Player } from '../test/mockTone';
import type { AppEdge } from '../store/dawTypes';

function toneNodeOf(id: string): MockToneNode {
	const entry = engine._audioNodes.get(id);
	if (!entry || !('toneNode' in entry)) throw new Error(`no toneNode entry for ${id}`);
	return entry.toneNode as unknown as MockToneNode;
}

afterEach(() => {
	engine.shutdownAudioEngine();
});

describe('createNode', () => {
	it('creates the audio entry and returns handler defaults merged with extra data', () => {
		const data = engine.createNode('oscillator', 'osc1', { frequency: 220 });
		expect(data).toMatchObject({ label: 'Oscillator', frequency: 220, type: 'sine' });
		expect(engine._audioNodes.has('osc1')).toBe(true);
	});

	it('returns null for unknown node types and creates nothing', () => {
		expect(engine.createNode('flanger', 'x1')).toBeNull();
		expect(engine._audioNodes.has('x1')).toBe(false);
	});
});

describe('setNodeParam', () => {
	it('writes signal params through to the Tone node', () => {
		engine.createNode('oscillator', 'osc1');
		engine.setNodeParam('oscillator', 'osc1', { frequency: 880 });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect((toneNodeOf('osc1') as any).frequency.value).toBe(880);
	});

	it('applies the LFO min/max guards', () => {
		engine.createNode('lfo', 'lfo1'); // defaults: min -1, max 1
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const node = toneNodeOf('lfo1') as any;
		engine.setNodeParam('lfo', 'lfo1', { min: 2 });   // >= max — rejected
		expect(node.min).toBe(-1);
		engine.setNodeParam('lfo', 'lfo1', { min: 0.5 }); // < max — applied
		expect(node.min).toBe(0.5);
	});

	it('rounds FatOscillator voice count', () => {
		engine.createNode('fatOscillator', 'fat1');
		engine.setNodeParam('fatOscillator', 'fat1', { count: 2.7 });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect((toneNodeOf('fat1') as any).count).toBe(3);
	});
});

describe('single-use source lifecycle', () => {
	const cases: [type: string, param: Record<string, number>, read: (n: never) => number][] = [
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['oscillator',      { frequency: 220 },          n => (n as any).frequency.value],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['noiseGenerator',  { volume: -12 },             n => (n as any).volume.value],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['lfo',             { frequency: 4 },            n => (n as any).frequency.value],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['fmOscillator',    { frequency: 220 },          n => (n as any).frequency.value],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['amOscillator',    { frequency: 220 },          n => (n as any).frequency.value],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['fatOscillator',   { spread: 33 },              n => (n as any).spread],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['pulseOscillator', { width: 0.25 },             n => (n as any).width.value],
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		['pwmOscillator',   { modulationFrequency: 2 },  n => (n as any).modulationFrequency.value],
	];

	it.each(cases)('%s: restart recreates the node and preserves live params', async (type, param, read) => {
		const id = `${type}-test`;
		engine.createNode(type, id);
		engine.setNodeParam(type, id, param);
		const [key, value] = Object.entries(param)[0];

		const handled = await engine.startNode(type, id, []);
		expect(handled).toBe(true);
		const first = toneNodeOf(id);
		expect(first.state).toBe('started');

		engine.stopNode(type, id);
		expect(first.state).toBe('stopped');

		// Tone sources are single-use: restarting must produce a NEW node that
		// carries over the live params — this is the quirk the factory hides.
		await engine.startNode(type, id, []);
		const second = toneNodeOf(id);
		expect(second).not.toBe(first);
		expect(first.disposed).toBe(true);
		expect(second.state).toBe('started');
		expect(read(second as never)).toBe(value);
		expect(key).toBeTruthy();
	});

	it('re-wires outgoing edges after a restart recreates the source', async () => {
		engine.createNode('oscillator', 'osc1');
		engine.createNode('gain', 'g1');
		const edges = [
			{ id: 'e1', source: 'osc1', sourceHandle: 'out-0', target: 'g1', targetHandle: 'in-0' },
		] as AppEdge[];

		engine.connectAudioNodes('osc1', 'out-0', 'g1', 'in-0');
		await engine.startNode('oscillator', 'osc1', edges); // fresh node starts stopped → recreated

		const gainNode = toneNodeOf('g1');
		const oscNode  = toneNodeOf('osc1');
		expect(oscNode.connections).toContain(gainNode);
	});

	it('returns false for types with no start behaviour', async () => {
		engine.createNode('gain', 'g1');
		expect(await engine.startNode('gain', 'g1', [])).toBe(false);
	});
});

describe('disposeNode', () => {
	it('disposes the Tone node and removes the entry', () => {
		engine.createNode('gain', 'g1');
		const node = toneNodeOf('g1');
		engine.disposeNode('g1');
		expect(node.disposed).toBe(true);
		expect(engine._audioNodes.has('g1')).toBe(false);
	});

	it('never disposes the master output', () => {
		engine.getWaveformData(); // lazily creates the master chain
		expect(engine._audioNodes.has(engine.MASTER_NODE_ID)).toBe(true);
		engine.disposeNode(engine.MASTER_NODE_ID);
		expect(engine._audioNodes.has(engine.MASTER_NODE_ID)).toBe(true);
	});
});

describe('waveform tap', () => {
	it('returns six equal-length channels', () => {
		const wf = engine.getWaveformData();
		const channels = [wf.x, wf.y, wf.r, wf.g, wf.b, wf.a];
		for (const ch of channels) {
			expect(ch).toBeInstanceOf(Float32Array);
			expect(ch.length).toBe(wf.x.length);
		}
		expect(wf.x.length).toBeGreaterThan(0);
	});
});

describe('player', () => {
	it('tracks playing state through play and pause', async () => {
		engine.createNode('player', 'p1');
		expect(engine.getNodeIsPlaying('p1')).toBe(false);

		await engine.playNode('p1');
		expect(engine.getNodeIsPlaying('p1')).toBe(true);
		expect((toneNodeOf('p1') as unknown as Player).state).toBe('started');

		engine.pauseNode('p1');
		expect(engine.getNodeIsPlaying('p1')).toBe(false);
	});

	it('fires the playback-end callback on natural stop only', async () => {
		engine.createNode('player', 'p1');
		const onEnd = vi.fn();
		engine.onNodePlaybackEnd('p1', onEnd);

		await engine.playNode('p1');
		engine.pauseNode('p1'); // explicit stop — no callback
		expect(onEnd).not.toHaveBeenCalled();

		await engine.playNode('p1');
		toneNodeOf('p1').stop(); // natural end of track
		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(engine.getNodeIsPlaying('p1')).toBe(false);
	});
});

describe('mic input', () => {
	it('opens on start and closes on stop', async () => {
		engine.createNode('micInput', 'm1');
		const handled = await engine.startNode('micInput', 'm1', []);
		expect(handled).toBe(true);
		expect((toneNodeOf('m1') as unknown as UserMedia).opened).toBe(true);
		engine.stopNode('micInput', 'm1');
		expect((toneNodeOf('m1') as unknown as UserMedia).opened).toBe(false);
	});
});

describe('grain player', () => {
	it('creates from data, updates params, disposes cleanly', () => {
		engine.createNode('grainPlayer', 'gp1', { grainSize: 0.4 });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const node = toneNodeOf('gp1') as any;
		expect(node.grainSize).toBe(0.4);
		engine.setNodeParam('grainPlayer', 'gp1', { playbackRate: 2 });
		expect(node.playbackRate).toBe(2);
		engine.disposeNode('gp1');
		expect(engine._audioNodes.has('gp1')).toBe(false);
	});
});

describe('shutdown', () => {
	it('disposes every entry including engine infrastructure', () => {
		engine.createNode('oscillator', 'osc1');
		engine.createNode('gain', 'g1');
		engine.getWaveformData(); // master chain
		expect(engine._audioNodes.size).toBeGreaterThanOrEqual(3);
		engine.shutdownAudioEngine();
		expect(engine._audioNodes.size).toBe(0);
	});
});
