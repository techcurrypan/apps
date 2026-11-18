// 撮った画面（PNG）を読み、2 枚の画素の差の割合を数える（learn-standard.md LS-M1・M4。look-learn.ts --motion が使う）。
// 外の部品を足さないため、Chrome が書く 8 ビットの RGB・RGBA だけを読む。
import { deflateSync, inflateSync } from 'node:zlib';

export type Img = { width: number; height: number; data: Uint8Array }; // data は RGBA

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function paeth(a: number, b: number, c: number): number {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(buf: Uint8Array): Img {
	for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) throw new Error('PNG ではない');
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	let pos = 8;
	let width = 0;
	let height = 0;
	let colorType = 0;
	const idat: Uint8Array[] = [];
	while (pos < buf.length) {
		const len = view.getUint32(pos);
		const type = String.fromCharCode(...buf.subarray(pos + 4, pos + 8));
		const body = buf.subarray(pos + 8, pos + 8 + len);
		if (type === 'IHDR') {
			width = view.getUint32(pos + 8);
			height = view.getUint32(pos + 12);
			if (body[8] !== 8) throw new Error('8 ビットだけ読む');
			colorType = body[9];
			if (colorType !== 2 && colorType !== 6) throw new Error('RGB と RGBA だけ読む');
			if (body[12] !== 0) throw new Error('飛び越し（interlace）は読まない');
		} else if (type === 'IDAT') idat.push(body);
		else if (type === 'IEND') break;
		pos += 12 + len;
	}
	const raw = inflateSync(Buffer.concat(idat));
	const bpp = colorType === 6 ? 4 : 3;
	const stride = width * bpp;
	const out = new Uint8Array(width * height * 4);
	let prev = new Uint8Array(stride);
	for (let y = 0; y < height; y++) {
		const f = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		const cur = new Uint8Array(stride);
		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? cur[x - bpp] : 0;
			const b = prev[x];
			const c = x >= bpp ? prev[x - bpp] : 0;
			const v = line[x];
			cur[x] =
				f === 0
					? v
					: f === 1
						? v + a
						: f === 2
							? v + b
							: f === 3
								? v + ((a + b) >> 1)
								: v + paeth(a, b, c);
		}
		for (let x = 0; x < width; x++) {
			const o = (y * width + x) * 4;
			out[o] = cur[x * bpp];
			out[o + 1] = cur[x * bpp + 1];
			out[o + 2] = cur[x * bpp + 2];
			out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
		}
		prev = cur;
	}
	return { width, height, data: out };
}

/** テストのための書き手。filter は全ての行に同じ物を使う */
export function encodePng(img: Img, filter: 0 | 1 | 2 | 3 | 4 = 0): Uint8Array {
	const { width, height, data } = img;
	const stride = width * 4;
	const raw = new Uint8Array(height * (stride + 1));
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = filter;
		for (let x = 0; x < stride; x++) {
			const v = data[y * stride + x];
			const a = x >= 4 ? data[y * stride + x - 4] : 0;
			const b = y > 0 ? data[(y - 1) * stride + x] : 0;
			const c = x >= 4 && y > 0 ? data[(y - 1) * stride + x - 4] : 0;
			const pred =
				filter === 0
					? 0
					: filter === 1
						? a
						: filter === 2
							? b
							: filter === 3
								? (a + b) >> 1
								: paeth(a, b, c);
			raw[y * (stride + 1) + 1 + x] = (v - pred) & 255;
		}
	}
	const chunk = (type: string, body: Uint8Array) => {
		const b = Buffer.alloc(12 + body.length);
		b.writeUInt32BE(body.length, 0);
		b.write(type, 4, 'ascii');
		Buffer.from(body).copy(b, 8);
		b.writeUInt32BE(0, 8 + body.length); // 読み手は CRC を見ない
		return b;
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from(SIG),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', new Uint8Array())
	]);
}

/** 2 枚の画素のうち、どれかの色が 8 を超えて違う画素の割合（大きさが違えば 1） */
export function diffRatio(a: Img, b: Img): number {
	if (a.width !== b.width || a.height !== b.height) return 1;
	let n = 0;
	for (let i = 0; i < a.data.length; i += 4)
		if (
			Math.abs(a.data[i] - b.data[i]) > 8 ||
			Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 ||
			Math.abs(a.data[i + 2] - b.data[i + 2]) > 8
		)
			n++;
	return n / (a.width * a.height);
}
