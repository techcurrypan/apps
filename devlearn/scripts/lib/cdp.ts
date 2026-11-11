// 手元の Chrome を DevTools の口から操作する小さな道具（scripts/look.ts と scripts/look-town.ts が使う。CI では走らせない）
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Msg = { id?: number; result?: Record<string, unknown>; error?: { message: string } };

export class Tab {
	private next = 1;
	private waiting = new Map<number, (m: Msg) => void>();
	constructor(private ws: WebSocket) {
		ws.addEventListener('message', (ev) => {
			const m = JSON.parse(String(ev.data)) as Msg;
			if (m.id && this.waiting.has(m.id)) {
				this.waiting.get(m.id)?.(m);
				this.waiting.delete(m.id);
			}
		});
	}
	send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
		const id = this.next++;
		this.ws.send(JSON.stringify({ id, method, params }));
		return new Promise((resolve, reject) => {
			this.waiting.set(id, (m) =>
				m.error ? reject(new Error(m.error.message)) : resolve(m.result ?? {})
			);
		});
	}
	async eval<T>(expr: string): Promise<T> {
		const r = await this.send('Runtime.evaluate', {
			expression: expr,
			returnByValue: true,
			awaitPromise: true
		});
		return (r.result as { value: T }).value;
	}
	async key(key: string, shift = false) {
		const codes: Record<string, [string, number]> = {
			ArrowRight: ['ArrowRight', 39],
			ArrowLeft: ['ArrowLeft', 37],
			Home: ['Home', 36],
			End: ['End', 35],
			Tab: ['Tab', 9],
			' ': ['Space', 32]
		};
		const [code, kc] = codes[key] ?? [`Key${key.toUpperCase()}`, key.toUpperCase().charCodeAt(0)];
		const text = key.length === 1 ? key : undefined;
		const modifiers = shift ? 8 : 0;
		await this.send('Input.dispatchKeyEvent', {
			type: 'keyDown',
			key,
			code,
			windowsVirtualKeyCode: kc,
			text,
			modifiers
		});
		await this.send('Input.dispatchKeyEvent', {
			type: 'keyUp',
			key,
			code,
			windowsVirtualKeyCode: kc,
			modifiers
		});
	}
	async size(width: number, height: number, mobile: boolean) {
		await this.send('Emulation.setDeviceMetricsOverride', {
			width,
			height,
			deviceScaleFactor: 1,
			mobile
		});
	}
	async scheme(dark: boolean) {
		await this.send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]
		});
	}
	async go(url: string) {
		await this.send('Page.navigate', { url });
		for (let i = 0; i < 100; i++) {
			await sleep(100);
			if ((await this.eval<string>('document.readyState')) === 'complete') break;
		}
		await sleep(600);
	}
	async shot(file: string) {
		const r = await this.send('Page.captureScreenshot', {
			format: 'png',
			captureBeyondViewport: false
		});
		writeFileSync(file, Buffer.from(String(r.data), 'base64'));
	}
}

/** 頭の無い Chrome を立ち上げ、最初の頁につなぐ。gpu を true にすると、手元の GPU で描く（街の重さを測るとき） */
export async function openChrome(
	port: number,
	opts: { gpu?: boolean; headless?: boolean } = {}
): Promise<{ tab: Tab; chrome: ChildProcess }> {
	const profile = mkdtempSync(join(tmpdir(), 'devlearn-look-'));
	const args = [
		`--remote-debugging-port=${port}`,
		`--user-data-dir=${profile}`,
		'--no-first-run',
		'--allow-file-access-from-files'
	];
	if (opts.headless !== false) args.unshift('--headless=new');
	if (opts.gpu) args.push('--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11');
	else args.push('--disable-gpu');
	args.push('about:blank');
	const chrome = spawn(CHROME, args);
	let wsUrl = '';
	for (let i = 0; i < 50 && !wsUrl; i++) {
		await sleep(200);
		try {
			const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
				type: string;
				webSocketDebuggerUrl: string;
			}[];
			wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? '';
		} catch {
			// まだ立ち上がっていない
		}
	}
	const ws = new WebSocket(wsUrl);
	await new Promise((r) => ws.addEventListener('open', r));
	const tab = new Tab(ws);
	await tab.send('Page.enable');
	await tab.send('Runtime.enable');
	return { tab, chrome };
}
