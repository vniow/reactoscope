#!/usr/bin/env node
/**
 * Prints a first-sample vs. latest-sample delta report for a monitor.mjs run.
 *
 * Usage:
 *   node scripts/memory-leak-harness/summarize.mjs                 # latest run in results/
 *   node scripts/memory-leak-harness/summarize.mjs results/<file>.jsonl
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'results');

function latestLogFile() {
	const files = readdirSync(RESULTS_DIR)
		.filter(f => f.endsWith('.jsonl'))
		.map(f => ({ f, mtime: statSync(path.join(RESULTS_DIR, f)).mtimeMs }))
		.sort((a, b) => b.mtime - a.mtime);
	if (!files.length) throw new Error(`No .jsonl files in ${RESULTS_DIR}`);
	return path.join(RESULTS_DIR, files[0].f);
}

const logPath = process.argv[2]
	? path.resolve(process.argv[2])
	: latestLogFile();

const lines = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const samples = lines.filter(l => l.sampleIndex !== undefined && !l.error);

if (samples.length < 2) {
	console.log(`${logPath}: only ${samples.length} usable sample(s) so far — nothing to diff yet.`);
	process.exit(0);
}

const first = samples[0];
const last  = samples[samples.length - 1];
const elapsedH = (last.elapsedSec - first.elapsedSec) / 3600;

function delta(path_, label, unit = '') {
	const get = (o) => path_.split('.').reduce((v, k) => v?.[k], o);
	// Renderer/worklet/worker fields can be null on the very first sample or two
	// (taken before React's effects have fired) — use the first valid reading
	// per metric rather than always sample 0, so a real startup transient
	// doesn't hide an otherwise-complete trend.
	const a = samples.map(get).find(v => v !== undefined && v !== null);
	const b = get(last);
	if (a === undefined || b === undefined || a === null || b === null) return;
	const d = typeof a === 'number' && typeof b === 'number' ? b - a : null;
	const arrow = d === null ? '' : d > 0 ? ' ▲' : d < 0 ? ' ▼' : ' =';
	console.log(`  ${label.padEnd(28)} ${String(a).padStart(10)} → ${String(b).padEnd(10)}${d !== null ? `  (Δ ${d > 0 ? '+' : ''}${d}${unit})` : ''}${arrow}`);
}

console.log(`\n${path.basename(logPath)}`);
console.log(`${samples.length} samples over ${elapsedH.toFixed(2)}h (${first.ts} → ${last.ts})\n`);

console.log('Native / OS memory:');
delta('totalPhysFootprintMB', 'Total physical footprint', 'MB');
delta('totalRssMB', 'Total process-tree RSS (comparison)', 'MB');
console.log('\nJS heap:');
delta('jsHeapUsedMB', 'JS heap used', 'MB');
delta('cdpNodes', 'DOM nodes (CDP)');
delta('cdpDocuments', 'Documents (CDP)');
delta('cdpListeners', 'JS event listeners (CDP)');
delta('domNodeCount', 'DOM nodes (in-page count)');
console.log('\nGPU (scene canvas — the one being scanned):');
delta('sceneRenderer.geometries', 'geometries');
delta('sceneRenderer.textures', 'textures');
delta('sceneRenderer.programs', 'programs');
console.log('\nGPU (scope/oscilloscope canvas):');
delta('scopeRenderer.geometries', 'geometries');
delta('scopeRenderer.textures', 'textures');
delta('scopeRenderer.programs', 'programs');
console.log('\nAudio engine:');
delta('audioNodeCount', 'live Tone.js node count');
delta('workerMountCount', 'path-worker (re)mount count');
console.log('\nAudioWorklet (audio thread — invisible elsewhere):');
delta('workletStats.processCallCount', 'process() calls');
delta('workletStats.frameSwapCount', 'coord-buffer swaps');
delta('workletStats.nPoints', 'current nPoints');
delta('workletStats.maxNPointsSeen', 'max nPoints ever seen');
console.log();
