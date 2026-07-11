import { start as toneStart } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { AudioNodeEntry } from '../dawTypes';

// ─── Single-use source handler factory ────────────────────────────────────────
// Tone.js sources (Oscillator, Noise, LFO, FM/AM/Fat/Pulse/PWM oscillators) are
// single-use: once stop()ed they can never start() again. Every handler built
// here hides that quirk the same way: on start(), a stopped node has its live
// param values captured, is disposed, and is rebuilt from those values; `true`
// is returned so the coordinator re-wires the node's outgoing edges.
//
// The param spec maps node-data keys to property paths on the live Tone node —
// 'frequency.value' for signal params, 'type' for plain properties. The spec
// drives setAudioParam and the pre-recreation capture; construction stays in
// `createTone` so each handler keeps its own constructor shape.

interface ToneSourceLike {
	state: string;
	start(): unknown;
	stop(): unknown;
	dispose(): unknown;
}

type ParamSpec<N> =
	| string
	| {
		path: string;
		/** Transform the incoming value before writing (e.g. FatOscillator rounds count). */
		coerce?: (value: unknown) => unknown;
		/** Skip the write when the live node would reject it (e.g. LFO needs min < max). */
		guard?: (node: N, value: unknown) => boolean;
	};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readPath(obj: any, path: string): unknown {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return path.split('.').reduce((o: any, k) => o?.[k], obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writePath(obj: any, path: string, value: unknown): void {
	const keys = path.split('.');
	const last = keys.pop()!;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const target = keys.reduce((o: any, k) => o?.[k], obj);
	if (target != null) target[last] = value;
}

export function makeSingleUseSourceHandler<
	D extends { label: string },
	N extends ToneSourceLike,
>(opts: {
	kind: AudioNodeEntry['kind'];
	defaultData: D;
	createTone: (data: D) => N;
	params: { [K in Exclude<keyof D, 'label'>]: ParamSpec<N> };
}): NodeTypeHandler<D> {
	const { kind, defaultData, createTone, params } = opts;
	const paramEntries = Object.entries(params) as [string, ParamSpec<N>][];

	function getEntry(id: string): { kind: string; toneNode: N } | undefined {
		const e = _audioNodes.get(id);
		return e?.kind === kind ? (e as unknown as { kind: string; toneNode: N }) : undefined;
	}

	function captureParams(node: N): Partial<D> {
		const out: Record<string, unknown> = {};
		for (const [key, spec] of paramEntries) {
			out[key] = readPath(node, typeof spec === 'string' ? spec : spec.path);
		}
		return out as Partial<D>;
	}

	return {
		defaultData,

		create(id, data) {
			const toneNode = createTone({ ...defaultData, ...data });
			_audioNodes.set(id, { kind, toneNode } as unknown as AudioNodeEntry);
		},

		dispose(id) {
			const e = getEntry(id);
			if (!e) return;
			if (e.toneNode.state === 'started') e.toneNode.stop();
			e.toneNode.dispose();
			_audioNodes.delete(id);
		},

		setAudioParam(id, update) {
			const e = getEntry(id);
			if (!e) return;
			for (const [key, spec] of paramEntries) {
				const raw = (update as Record<string, unknown>)[key];
				if (raw === undefined) continue;
				const s = typeof spec === 'string' ? { path: spec } as Exclude<ParamSpec<N>, string> : spec;
				const value = s.coerce ? s.coerce(raw) : raw;
				if (s.guard && !s.guard(e.toneNode, value)) continue;
				writePath(e.toneNode, s.path, value);
			}
		},

		async start(id) {
			const e = getEntry(id);
			if (!e) return false;

			await toneStart();

			let recreated = false;
			if (e.toneNode.state === 'stopped') {
				const captured = captureParams(e.toneNode);
				e.toneNode.dispose();
				e.toneNode = createTone({ ...defaultData, ...captured });
				recreated = true;
			}

			if (e.toneNode.state !== 'started') e.toneNode.start();
			return recreated;
		},

		stop(id) {
			const e = getEntry(id);
			if (!e) return;
			if (e.toneNode.state === 'started') e.toneNode.stop();
		},
	};
}
