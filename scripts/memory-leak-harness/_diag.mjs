import { chromium } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

async function open(name, params, x) {
	const browser = await chromium.launch({
		headless: false,
		args: [
			'--autoplay-policy=no-user-gesture-required',
			'--disable-background-timer-throttling',
			'--disable-backgrounding-occluded-windows',
			'--disable-renderer-backgrounding',
			`--window-position=${x},0`,
			'--window-size=700,520',
		],
	});
	const page = await browser.newPage({ viewport: null });
	page.on('pageerror', err => console.log(`[${name}] pageerror:`, err.message));
	const url = new URL(APP_URL);
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	await page.goto(url.toString());
	console.log(`[${name}] loaded ${url.toString()}`);
	return { browser, page };
}

async function sample(name, page) {
	const text = await page.evaluate(() => document.body.innerText).catch(() => '');
	const meta = await page.evaluate(() => ({
		visibility: document.visibilityState,
		focused:    document.hasFocus(),
	})).catch(() => ({}));
	const ctx   = /ctx: (\S+)/.exec(text)?.[1] ?? 'n/a';
	const frame = /frame (\d+)/.exec(text)?.[1] ?? 'n/a';
	const fps   = /fps: (\d+)/.exec(text)?.[1] ?? 'n/a';
	const wave  = /L\s+min:(-?[\d.]+)\s+max:(-?[\d.]+)/.exec(text);
	console.log(`[${name}] frame=${frame} fps=${fps} vis=${meta.visibility} focused=${meta.focused} ctx=${ctx} waveL=${wave ? `${wave[1]},${wave[2]}` : 'n/a'}`);
}

const a = await open('first',  { sceneInput: '1', miniScope: '1', loadPatch: 'leak-test', debug: '1' }, 0);
await new Promise(r => setTimeout(r, 3000));
const b = await open('second', { sceneInput: '1', miniScope: '0', loadPatch: 'leak-test', debug: '1' }, 700);

for (let i = 0; i < 8; i++) {
	await new Promise(r => setTimeout(r, 3000));
	await sample('first',  a.page);
	await sample('second', b.page);
}

await a.browser.close();
await b.browser.close();
