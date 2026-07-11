#!/usr/bin/env node
// Memory-leak diagnostic harness for reactoscope.
//
// Launches one or more isolated Chromium instances (each gets its own temp
// profile + own renderer/GPU processes via chromium.launch()), points each at
// the dev server with a distinct set of debug URL flags, and polls renderer +
// GPU process RSS (via `ps`, using PIDs from CDP SystemInfo.getProcessInfo)
// on an interval. Each scenario's samples land in results/<name>.csv.
//
// Runs headed (not headless) on purpose: headless Chromium renders via
// SwiftShader (software) by default, not the real GPU path, which would
// hide exactly the GPU-process behavior we're trying to observe.
//
// Usage:
//   node run.mjs                    # run all 4 scenarios, 30min @ 10s
//   node run.mjs baseline           # run just one scenario
//   node run.mjs --duration=10      # override run length (minutes)
//   node run.mjs --interval=5       # override sample interval (seconds)
//
// Windows are tiled on screen and titled by scenario name so several can run
// side by side. For interactions that aren't worth scripting, drive that
// scenario's window by hand and log `console.log('MARK: <what you did>')` in
// its devtools console — it's timestamped into results/<name>.markers.log
// alongside the RSS samples.

import { chromium } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname     = path.dirname(fileURLToPath(import.meta.url));

const APP_URL   = process.env.HARNESS_URL ?? 'http://localhost:5173';
const OUT_DIR   = path.join(__dirname, 'results');

const SCENARIOS = [
	{ name: 'baseline',      params: { sceneInput: '1', miniScope: '1', loadPatch: 'leak-test', debug: '1' } },
	{ name: 'no-inputpanel', params: { sceneInput: '0', miniScope: '1', loadPatch: 'leak-test' } },
	{ name: 'no-miniscope',  params: { sceneInput: '1', miniScope: '0', loadPatch: 'leak-test' } },
	{ name: 'neither',       params: { sceneInput: '0', miniScope: '0', loadPatch: 'leak-test' } },
];

function parseArgs(argv) {
	let durationMin = 30;
	let intervalSec = 10;
	let scenarioName = null;
	for (const arg of argv) {
		if (arg.startsWith('--duration=')) durationMin = Number(arg.split('=')[1]);
		else if (arg.startsWith('--interval=')) intervalSec = Number(arg.split('=')[1]);
		else if (!arg.startsWith('--')) scenarioName = arg;
	}
	return { durationMin, intervalSec, scenarioName };
}

async function sampleRssKb(pids) {
	if (pids.length === 0) return null;
	try {
		const { stdout } = await execFileAsync('ps', ['-o', 'rss=', '-p', pids.join(',')]);
		const values = stdout.split('\n').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
		return values.length ? values.reduce((a, b) => a + b, 0) : null;
	} catch {
		return null; // process(es) exited mid-sample
	}
}

// Grid layout for tiling scenario windows on screen, so when several are
// open at once (headed, for manual interaction) you can tell them apart by
// position alone without reading titles or logs.
const WINDOW_COLS   = 2;
const WINDOW_WIDTH  = 700;
const WINDOW_HEIGHT = 520;

async function runScenario(scenario, index, durationMin, intervalSec) {
	const winX = (index % WINDOW_COLS) * WINDOW_WIDTH;
	const winY = Math.floor(index / WINDOW_COLS) * WINDOW_HEIGHT;

	const browser = await chromium.launch({
		headless: false,
		args: [
			'--autoplay-policy=no-user-gesture-required',
			// Only the OS-focused window keeps full renderer/thread priority by
			// default; the rest get deprioritized even while visible, which
			// starves AudioWorklet processing in every window but the focused
			// one. These keep all instances running at full priority.
			'--disable-background-timer-throttling',
			'--disable-backgrounding-occluded-windows',
			'--disable-renderer-backgrounding',
			`--window-position=${winX},${winY}`,
			`--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
		],
	});
	const cdp  = await browser.newBrowserCDPSession();
	// viewport: null lets --window-size govern the content area instead of
	// Playwright forcing its own fixed viewport inside the window.
	const page = await browser.newPage({ viewport: null });

	mkdirSync(OUT_DIR, { recursive: true });
	const outFile     = path.join(OUT_DIR, `${scenario.name}.csv`);
	const markersFile = path.join(OUT_DIR, `${scenario.name}.markers.log`);
	writeFileSync(outFile, 'elapsed_s,renderer_rss_kb,gpu_rss_kb\n');
	writeFileSync(markersFile, 'elapsed_s,note\n');

	const start = Date.now();

	// Manual-interaction bridge: while driving a scenario by hand, open that
	// window's devtools console and log `MARK: <what you just did>` — it gets
	// timestamped against the same clock as the RSS samples and tagged with
	// the scenario name, so manual actions land in the same timeline as the
	// automated polling data. Everything else the page logs is ignored to
	// keep this from filling up with app/HMR noise.
	page.on('console', msg => {
		const text  = msg.text();
		const match = /^mark[:\s]+(.*)$/i.exec(text);
		if (!match) return;
		const elapsed = Math.round((Date.now() - start) / 1000);
		const note    = match[1];
		console.log(`[${scenario.name}] MARK t=${elapsed}s: ${note}`);
		appendFileSync(markersFile, `${elapsed},"${note.replace(/"/g, '""')}"\n`);
	});

	const url = new URL(APP_URL);
	for (const [k, v] of Object.entries(scenario.params)) url.searchParams.set(k, v);
	console.log(`[${scenario.name}] navigating to ${url.toString()}`);
	await page.goto(url.toString());
	await page.evaluate(name => { document.title = name; }, scenario.name);
	await page.waitForTimeout(3000); // let the app boot + load the fixture patch

	const durationMs = durationMin * 60_000;
	const intervalMs = intervalSec * 1000;

	while (Date.now() - start < durationMs) {
		const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
		const rendererPids = processInfo.filter(p => /renderer/i.test(p.type)).map(p => p.id);
		const gpuPids      = processInfo.filter(p => /gpu/i.test(p.type)).map(p => p.id);
		const [rendererRss, gpuRss] = await Promise.all([
			sampleRssKb(rendererPids),
			sampleRssKb(gpuPids),
		]);
		const elapsed = Math.round((Date.now() - start) / 1000);
		appendFileSync(outFile, `${elapsed},${rendererRss ?? ''},${gpuRss ?? ''}\n`);
		let debugSuffix = '';
		if (scenario.params.debug === '1') {
			const text  = await page.evaluate(() => document.body.innerText).catch(() => '');
			const ctx   = /ctx: (\S+)/.exec(text)?.[1] ?? 'n/a';
			const wave  = /L\s+min:(-?[\d.]+)\s+max:(-?[\d.]+)/.exec(text);
			debugSuffix = ` audioCtx=${ctx} waveL[${wave ? `${wave[1]},${wave[2]}` : 'n/a'}]`;
		}
		console.log(`[${scenario.name}] t=${elapsed}s renderer=${rendererRss ?? 'n/a'}KB gpu=${gpuRss ?? 'n/a'}KB${debugSuffix}`);
		await new Promise(r => setTimeout(r, intervalMs));
	}

	await browser.close();
	console.log(`[${scenario.name}] done -> ${outFile}`);
}

const { durationMin, intervalSec, scenarioName } = parseArgs(process.argv.slice(2));
const toRun = scenarioName ? SCENARIOS.filter(s => s.name === scenarioName) : SCENARIOS;

if (toRun.length === 0) {
	console.error(`Unknown scenario "${scenarioName}". Known: ${SCENARIOS.map(s => s.name).join(', ')}`);
	process.exit(1);
}

console.log(`Running ${toRun.map(s => s.name).join(', ')} for ${durationMin}min @ ${intervalSec}s intervals`);
await Promise.all(toRun.map((s, i) => runScenario(s, i, durationMin, intervalSec)));
console.log('All scenarios complete.');
