#!/usr/bin/env node
/**
 * Native memory-infra tracing — the fallback flagged in docs/research/
 * chrome-process-memory-sampling.md (issue #3) and Wayfinder issue #11.
 *
 * Unlike monitor.mjs's phys_footprint sampling (one aggregate number per
 * poll), this drives Chrome's memory-infra system via raw CDP
 * (Tracing.start with the disabled-by-default-memory-infra category) to get
 * a breakdown BY ALLOCATOR CATEGORY per process — the goal is to see WHAT
 * is growing, not just confirm THAT something is.
 *
 * The trace schema is not a stable public CDP contract (unlike protocol.json
 * itself) — this script writes the raw dump events to disk for inspection,
 * plus a best-effort per-category summary if the expected shape is present.
 *
 * Usage:
 *   node scripts/memory-leak-harness/trace-memory-infra.mjs
 *   HARNESS_DURATION_MIN=10 node scripts/memory-leak-harness/trace-memory-infra.mjs
 *   HARNESS_ISOLATE=audio HARNESS_EXCLUDE=waveformCapture node scripts/memory-leak-harness/trace-memory-infra.mjs
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'results');
mkdirSync(RESULTS_DIR, { recursive: true });

const DURATION_MS = (Number(process.env.HARNESS_DURATION_MIN) || 10) * 60 * 1000;
const BASE_URL    = process.env.HARNESS_URL || 'http://localhost:5173';
const ISOLATE     = process.env.HARNESS_ISOLATE;
const EXCLUDE     = process.env.HARNESS_EXCLUDE;
const TEST_TONE   = process.env.HARNESS_TEST_TONE === '1';
const URL = (() => {
	const params = new URLSearchParams();
	if (ISOLATE)   params.set('isolate', ISOLATE);
	if (EXCLUDE)   params.set('exclude', EXCLUDE);
	if (TEST_TONE) params.set('testTone', '1');
	const qs = params.toString();
	return qs ? `${BASE_URL}?${qs}` : BASE_URL;
})();

async function main() {
	const browserServer = await chromium.launchServer({ headless: true });
	const browser = await chromium.connect(browserServer.wsEndpoint());
	const page    = await browser.newPage();
	const cdp     = await page.context().newCDPSession(page);

	await page.goto(URL, { waitUntil: 'load' });
	await page.waitForFunction(() => {
		const w = window.__reactoscope;
		return !!(w && w.store && w.store.getState().nodes.length > 0);
	}, { timeout: 30000 });
	await page.evaluate(() => window.__reactoscope.store.getState().startScene());

	const pageIsolationMode = await page.evaluate(() => window.__reactoscope.isolationMode ?? null);
	const pageExcluded      = await page.evaluate(() => (window.__reactoscope.excludedAudioComponents ?? []).slice().sort());
	console.log(`[trace] isolation mode: ${pageIsolationMode ?? '(none)'}, excluded: ${pageExcluded.length ? pageExcluded.join(',') : '(none)'}`);

	const events = [];
	cdp.on('Tracing.dataCollected', (e) => {
		events.push(...e.value);
	});

	let onComplete;
	const tracingComplete = new Promise((resolve) => { onComplete = resolve; });
	cdp.on('Tracing.tracingComplete', () => onComplete());

	await cdp.send('Tracing.start', {
		transferMode: 'ReportEvents',
		traceConfig: {
			recordMode:         'recordContinuously',
			includedCategories: ['disabled-by-default-memory-infra'],
		},
	});

	console.log(`[trace] recording for ${DURATION_MS / 60000} min...`);
	await new Promise((r) => setTimeout(r, DURATION_MS));

	await cdp.send('Tracing.end');
	await tracingComplete;

	const runId  = new Date().toISOString().replace(/[:.]/g, '-');
	const outPath = path.join(RESULTS_DIR, `trace-${runId}.json`);
	writeFileSync(outPath, JSON.stringify(events));
	console.log(`[trace] wrote ${events.length} raw trace events to ${outPath}`);

	// Best-effort: memory-infra dumps are typically two paired events per
	// process per dump — a 'v8.gc'/'disabled-by-default-memory-infra' category
	// event with ph:'v' (memory dump) and a nested 'process_totals' object.
	// Schema is not a stable contract — log a sample so a human can adapt this.
	const memoryDumps = events.filter((e) => e.cat && e.cat.includes('memory-infra'));
	console.log(`[trace] ${memoryDumps.length} events tagged memory-infra`);
	if (memoryDumps.length > 0) {
		console.log('[trace] sample event (first memory-infra event):');
		console.log(JSON.stringify(memoryDumps[0], null, 2));
	}

	await browser.close().catch(() => {});
	await browserServer.close().catch(() => {});
}

main().catch((err) => {
	console.error('[trace] fatal error', err);
	process.exit(1);
});
