// 判定に渡す連続画像を、場面ごとに 1 枚の一覧（4 × 2、各コマは半分の大きさ）にまとめる（learn-standard.md 0.3）。
// 判定者が 1 場面を 1 枚で見比べられるように。字を読むための原寸は、最後のコマを別に渡す。
//   npx tsx scripts/judge-sheet.ts <連続画像の置き場> <一覧の置き場>
// 連続画像の名前は <場面>-<prod|proto>-<0..7>.png（look-judge.ts）か R-<n>-<0..7>.png（look-learn.ts --ref）。
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng, encodePng, type Img } from './lib/png.ts';

/** 2 × 2 の画素の平均で半分にする */
export function half(a: Img): Img {
	const w = Math.floor(a.width / 2);
	const h = Math.floor(a.height / 2);
	const d = new Uint8Array(w * h * 4);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++)
			for (let c = 0; c < 4; c++) {
				const p = (yy: number, xx: number) => a.data[(yy * a.width + xx) * 4 + c];
				d[(y * w + x) * 4 + c] =
					(p(2 * y, 2 * x) + p(2 * y, 2 * x + 1) + p(2 * y + 1, 2 * x) + p(2 * y + 1, 2 * x + 1)) >>
					2;
			}
	return { width: w, height: h, data: d };
}

/** コマを cols 列に並べる（間は 8px の灰色） */
export function sheet(frames: Img[], cols: number): Img {
	const gap = 8;
	const fw = Math.max(...frames.map((f) => f.width));
	const fh = Math.max(...frames.map((f) => f.height));
	const rows = Math.ceil(frames.length / cols);
	const w = cols * fw + (cols + 1) * gap;
	const h = rows * fh + (rows + 1) * gap;
	const d = new Uint8Array(w * h * 4).fill(128);
	frames.forEach((f, i) => {
		const ox = gap + (i % cols) * (fw + gap);
		const oy = gap + Math.floor(i / cols) * (fh + gap);
		for (let y = 0; y < f.height; y++)
			d.set(f.data.subarray(y * f.width * 4, (y + 1) * f.width * 4), ((oy + y) * w + ox) * 4);
	});
	return { width: w, height: h, data: d };
}

if (process.argv[1]?.endsWith('judge-sheet.ts')) {
	const [from, to] = process.argv.slice(2);
	if (!from || !to) {
		console.error('使い方：npx tsx scripts/judge-sheet.ts <連続画像の置き場> <一覧の置き場>');
		process.exit(1);
	}
	mkdirSync(to, { recursive: true });
	const groups = new Map<string, string[]>();
	for (const f of readdirSync(from)) {
		const m = /^(.+)-(\d+)\.png$/.exec(f);
		if (!m) continue;
		const g = groups.get(m[1]) ?? [];
		g[Number(m[2])] = f;
		groups.set(m[1], g);
	}
	for (const [name, files] of groups) {
		const frames = files.filter(Boolean).map((f) => decodePng(readFileSync(join(from, f))));
		const small = frames.map((f) => (f.width > 800 ? half(f) : f));
		writeFileSync(
			join(to, `${name}-sheet.png`),
			encodePng(sheet(small, small.length > 4 ? 4 : small.length), 1)
		);
		console.log(`${name}：${frames.length} コマ`);
	}
}
