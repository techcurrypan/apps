// npm run impl:verify（検査 39）。全レッスンの Step.impl の名前が、版の tag のソースのファイルにあることを確かめる。
// 取った物は .cache/impl/ に置き、2 回目からは取りに行かない。CI でも走らせる（plan.md 10-R 手順 8）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { lessons } from '../src/lib/content/lessons.ts';
import { hasName, wants } from './lib/impl.ts';

const CACHE = join(import.meta.dirname, '..', '.cache', 'impl');

async function source(url: string): Promise<string> {
	const file = join(CACHE, url.replace(/^https:\/\/raw\.githubusercontent\.com\//, ''));
	if (existsSync(file)) return readFileSync(file, 'utf8');
	// 取得先の一時的な失敗（429・5xx・通信の切れ）で公開が止まらないよう、1・2・4 秒おいて 4 回まで取り直す（D-24）
	let t: string;
	for (let k = 0; ; k++) {
		try {
			const r = await fetch(url);
			if (r.ok) {
				t = await r.text();
				break;
			}
			if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} ${url}`);
			if (k >= 3) throw new Error(`${r.status} ${url}`);
		} catch (e) {
			if (k >= 3 || /^\d{3} /.test((e as Error).message)) throw e;
		}
		await new Promise((ok) => setTimeout(ok, 1000 * 2 ** k));
	}
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, t);
	return t;
}

async function main() {
	const { list, skipped } = wants(lessons);
	let bad = 0;
	for (const w of list) {
		try {
			const src = await source(w.url);
			if (!hasName(src, w.impl.name)) {
				bad++;
				console.error(`${w.lesson} ステップ ${w.step}  「${w.impl.name}」が ${w.url} に無い`);
			}
		} catch (e) {
			bad++;
			console.error(`${w.lesson} ステップ ${w.step}  取れない：${(e as Error).message}`);
		}
	}
	for (const s of skipped) {
		bad++;
		console.error(`確かめられない（取得先の無い project か、ファイルの道でない）：${s}`);
	}
	if (bad) {
		console.error(`impl:verify: ${bad} 件落ちた（名前 ${list.length} 個）`);
		process.exit(1);
	}
	console.log(`impl:verify: 名前 ${list.length} 個を版の tag のソースで確かめた。落ちた物は無い`);
}

void main();
