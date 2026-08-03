#!/usr/bin/env node
/**
 * Long-running memory-footprint harness for the Scene Input play workflow.
 *
 * Launches its own independent Chromium (via @playwright/test, already a repo
 * devDependency — not the chrome-devtools-mcp browser, so this survives
 * independently of any editor/agent session), starts Scene Input, and samples
 * every SAMPLE_INTERVAL_SEC for DURATION_HOURS. Each sample is appended as one
 * JSON line to results/<run-id>.jsonl so a partial run is still readable if
 * the process is killed early.
 *
 * What each sample captures, and why:
 *   - totalPhysFootprintMB the same "physical memory footprint" accounting
 *                         Chrome's own Task Manager uses (summed across this
 *                         browser's whole process tree), via macOS `top`'s
 *                         `mem` stat / Linux `smaps_rollup`'s `Pss`. This is
 *                         the metric issue #3's research identified — plain
 *                         RSS (below) does NOT track it; a prior 23h run's
 *                         totalRssMB actually *fell* while Task Manager's
 *                         footprint was known to be climbing.
 *   - totalRssMB          naive resident-set-size sum via `ps` — kept as a
 *                         comparison point, not the primary signal.
 *   - jsHeapUsedMB/TotalMB JS heap only — won't move for a native/GPU leak,
 *                         included as a baseline to rule JS heap in or out.
 *   - cdpNodes/cdpDocuments  DOM node / document counts via CDP Performance
 *                         domain — climbs on a detached-DOM leak.
 *   - scopeRenderer/sceneRenderer  THREE.WebGLRenderer.info.memory for each of
 *                         the app's two canvases (oscilloscope vs. the scene
 *                         being scanned) — climbs on undisposed geometries/
 *                         textures/programs. null under `?isolate=audio`,
 *                         which unmounts both canvases.
 *   - audioNodeCount      size of the app's own live-Tone.js-object registry.
 *   - workletStats         processCallCount/frameSwapCount/nPoints from inside
 *                         the AudioWorklet itself — the one thing none of the
 *                         above can see, since it runs on the audio thread.
 *   - workerMountCount     how many times the scene's path-Worker has been
 *                         (re)created — proxies Canvas remount churn.
 *
 * Usage:
 *   node scripts/memory-leak-harness/monitor.mjs
 *   HARNESS_DURATION_HOURS=1 HARNESS_SAMPLE_INTERVAL_SEC=5 node scripts/memory-leak-harness/monitor.mjs   # quick smoke test
 *   HARNESS_ISOLATE=audio node scripts/memory-leak-harness/monitor.mjs   # audio engine only, no canvases
 *   HARNESS_ISOLATE=viz   node scripts/memory-leak-harness/monitor.mjs   # WebGL rendering only, no audio engine
 *
 * Stop early:
 *   kill <pid>   — SIGTERM/SIGINT are handled: the browser is closed cleanly
 *                  and a final 'end' event is logged before exit.
 */

import { chromium } from '@playwright/test';
import { execSync, execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'results');
mkdirSync(RESULTS_DIR, { recursive: true });

const DURATION_MS         = (Number(process.env.HARNESS_DURATION_HOURS) || 24) * 60 * 60 * 1000;
const SAMPLE_INTERVAL_MS  = (Number(process.env.HARNESS_SAMPLE_INTERVAL_SEC) || 30) * 1000;
const BASE_URL             = process.env.HARNESS_URL || 'http://localhost:5173';
const ISOLATE              = process.env.HARNESS_ISOLATE; // 'audio' | 'viz' | undefined
const URL                  = ISOLATE ? `${BASE_URL}?isolate=${ISOLATE}` : BASE_URL;

const runId  = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(RESULTS_DIR, `${runId}.jsonl`);

function log(obj) {
	appendFileSync(logPath, JSON.stringify(obj) + '\n');
}

// Returns { pids, totalRssKB } for rootPid and every descendant process —
// macOS/Linux `ps`, BSD/GNU-compatible flags.
function getProcessTree(rootPid) {
	const rows = execSync('ps -axo pid,ppid,rss')
		.toString()
		.trim()
		.split('\n')
		.slice(1)
		.map(line => line.trim().split(/\s+/).map(Number));

	const childrenOf = new Map();
	const rssOf      = new Map();
	for (const [pid, ppid, rss] of rows) {
		rssOf.set(pid, rss);
		if (!childrenOf.has(ppid)) childrenOf.set(ppid, []);
		childrenOf.get(ppid).push(pid);
	}

	const pids    = [];
	let totalRssKB = 0;
	const stack   = [rootPid];
	const visited = new Set();
	while (stack.length) {
		const pid = stack.pop();
		if (visited.has(pid)) continue;
		visited.add(pid);
		pids.push(pid);
		totalRssKB += rssOf.get(pid) || 0;
		for (const child of childrenOf.get(pid) || []) stack.push(child);
	}
	return { pids, totalRssKB };
}

// Sums each process's OS-reported *physical memory footprint* — the same
// accounting Chrome's own Task Manager "Memory footprint" column uses, and
// distinct from (usually smaller than) plain RSS. See docs/research/
// chrome-process-memory-sampling.md (issue #3) for why plain `ps -o rss` /
// `ps -o phys_footprint` (the latter isn't even a valid keyword on all macOS
// `ps` builds — verified empirically while building this harness) aren't the
// right tool: macOS's `top -stats pid,mem` documents `mem` as literally
// "Physical memory footprint of the process", confirmed against a real PID.
function sumPhysFootprintKB(pids) {
	if (pids.length === 0) return 0;

	if (process.platform === 'darwin') {
		const args = ['-l', '1', '-stats', 'pid,mem'];
		for (const pid of pids) args.push('-pid', String(pid));
		const output = execFileSync('top', args, { encoding: 'utf8' });
		let total = 0;
		for (const line of output.trim().split('\n')) {
			const m = line.trim().match(/^(\d+)\s+([\d.]+)([KMG]?)\s*$/);
			if (!m) continue;
			const value = parseFloat(m[2]);
			const unit  = m[3];
			total += unit === 'G' ? value * 1024 * 1024 : unit === 'M' ? value * 1024 : value;
		}
		return total;
	}

	// Linux: Pss from /proc/<pid>/smaps_rollup (kB), the shared-page-aware
	// analogue to macOS's phys_footprint — see the research doc, section 3.
	let total = 0;
	for (const pid of pids) {
		try {
			const rollup = readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
			const m = rollup.match(/^Pss:\s+(\d+)\s+kB/m);
			if (m) total += Number(m[1]);
		} catch {
			// process may have exited between tree walk and read — skip it
		}
	}
	return total;
}

let stopRequested = false;
process.on('SIGTERM', () => { stopRequested = true; });
process.on('SIGINT',  () => { stopRequested = true; });

async function main() {
	const browserServer = await chromium.launchServer({ headless: true });
	const rootPid = browserServer.process().pid;
	const browser = await chromium.connect(browserServer.wsEndpoint());
	const context = await browser.newContext();
	const page    = await context.newPage();
	const cdp     = await context.newCDPSession(page);
	await cdp.send('Performance.enable');

	await page.goto(URL, { waitUntil: 'load' });

	await page.waitForFunction(() => {
		const w = window.__reactoscope;
		return !!(w && w.store && w.store.getState().nodes.length > 0);
	}, { timeout: 30000 });

	await page.evaluate(() => window.__reactoscope.store.getState().startScene());

	const pageIsolationMode = await page.evaluate(() => window.__reactoscope.isolationMode ?? null);
	if (pageIsolationMode !== (ISOLATE ?? null)) {
		throw new Error(`isolation mode mismatch: requested ${JSON.stringify(ISOLATE ?? null)}, app reports ${JSON.stringify(pageIsolationMode)}`);
	}

	log({ event: 'start', runId, url: URL, isolationMode: pageIsolationMode, rootPid, durationHours: DURATION_MS / 3600000, sampleIntervalSec: SAMPLE_INTERVAL_MS / 1000, ts: new Date().toISOString() });
	console.log(`[monitor] started run ${runId} — logging to ${logPath}`);
	console.log(`[monitor] isolation mode: ${pageIsolationMode ?? '(none)'}`);
	console.log(`[monitor] browser root pid ${rootPid}, duration ${DURATION_MS / 3600000}h, interval ${SAMPLE_INTERVAL_MS / 1000}s`);

	const startTime = Date.now();
	let sampleIndex = 0;

	while (!stopRequested && Date.now() - startTime < DURATION_MS) {
		const sample = {
			ts:         new Date().toISOString(),
			elapsedSec: Math.round((Date.now() - startTime) / 1000),
			sampleIndex,
		};
		try {
			const pageMetrics = await page.evaluate(() => {
				const w = window.__reactoscope;
				const m = performance.memory;
				const rendererInfo = (gl) => gl ? {
					geometries: gl.info.memory.geometries,
					textures:   gl.info.memory.textures,
					programs:   gl.info.programs ? gl.info.programs.length : null,
				} : null;
				return {
					sceneRunning:     w.store.getState().sceneRunning,
					audioNodeCount:   w.audioNodes.size,
					audioNodeKinds:   [...w.audioNodes.values()].map(e => e.kind),
					jsHeapUsedMB:     +(m.usedJSHeapSize / 1048576).toFixed(2),
					jsHeapTotalMB:    +(m.totalJSHeapSize / 1048576).toFixed(2),
					scopeRenderer:    rendererInfo(w.scopeRenderer),
					sceneRenderer:    rendererInfo(w.sceneRenderer),
					workletStats:     w.getWorkletStats ? w.getWorkletStats() : null,
					workerMountCount: w.workerMountCount ?? null,
					domNodeCount:     document.getElementsByTagName('*').length,
				};
			});

			const cdpMetrics = await cdp.send('Performance.getMetrics');
			const cdpByName  = Object.fromEntries(cdpMetrics.metrics.map(m => [m.name, m.value]));

			const { pids, totalRssKB } = getProcessTree(rootPid);

			Object.assign(sample, pageMetrics, {
				cdpJSHeapUsedMB:     +(cdpByName.JSHeapUsedSize / 1048576).toFixed(2),
				cdpDocuments:        cdpByName.Documents,
				cdpNodes:            cdpByName.Nodes,
				cdpListeners:        cdpByName.JSEventListeners,
				totalRssMB:          +(totalRssKB / 1024).toFixed(2),
				totalPhysFootprintMB: +(sumPhysFootprintKB(pids) / 1024).toFixed(2),
			});
		} catch (err) {
			sample.error = String((err && err.message) || err);
		}

		log(sample);
		sampleIndex++;

		const remaining = SAMPLE_INTERVAL_MS - ((Date.now() - startTime) % SAMPLE_INTERVAL_MS);
		await new Promise(r => setTimeout(r, Math.max(0, remaining)));
	}

	log({ event: 'end', reason: stopRequested ? 'signal' : 'duration-elapsed', ts: new Date().toISOString(), samples: sampleIndex });
	console.log(`[monitor] finished (${stopRequested ? 'stopped by signal' : 'duration elapsed'}), ${sampleIndex} samples`);

	await browser.close().catch(() => {});
	await browserServer.close().catch(() => {});
}

main().catch(err => {
	appendFileSync(logPath, JSON.stringify({ event: 'fatal', error: String((err && err.stack) || err), ts: new Date().toISOString() }) + '\n');
	console.error('[monitor] fatal error', err);
	process.exit(1);
});
