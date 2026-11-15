// 荷物のバイト列を読み直して確かめる（検査 21・22。LS-Q1・LS-Q2）。
// packet.ts の組み立てとは別の道筋で、長さ・チェックサム・欄の値・Git の ID を計算し直す。
import { sha1Hex } from '../tools/sha1.ts';
import type { Packet } from './types.ts';

export function hexBytes(hex: string): number[] | null {
	const h = hex.replace(/\s+/g, '');
	if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) return null;
	const out: number[] = [];
	for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
	return out;
}

function sum16(b: readonly number[]): number {
	let s = 0;
	for (let i = 0; i < b.length; i += 2) s += (b[i] << 8) + (b[i + 1] ?? 0);
	while (s >> 16) s = (s & 0xffff) + (s >> 16);
	return s;
}
/** 正しいチェックサムを含めて足すと 0xffff になる */
const sumsOk = (b: readonly number[]) => sum16(b) === 0xffff;

/** "66 B" "1,234 B" の数。読めなければ null */
export function sizeBytes(size: string): number | null {
	const m = /^([\d,]+)\s*B$/.exec(size.trim());
	return m ? Number(m[1].replace(/,/g, '')) : null;
}

const toHex = (b: readonly number[]) => b.map((x) => x.toString(16).padStart(2, '0')).join('');

/** バイトの読み方の候補（10 進・0x・IP・MAC・文字・DNS の名前・16 進） */
export function readings(b: readonly number[]): string[] {
	const out: string[] = [];
	if (b.length > 0 && b.length <= 6) {
		const n = b.reduce((a, x) => a * 256 + x, 0);
		out.push(String(n), '0x' + n.toString(16).padStart(b.length * 2, '0'));
	}
	if (b.length === 4) out.push(b.join('.'));
	if (b.length === 6) out.push(b.map((x) => x.toString(16).padStart(2, '0')).join(':'));
	const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(b));
	const vis = text.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\0/g, '\\0');
	out.push(text.replace(/\r?\n$/, '').replace(/\0+$/, ''), vis);
	// DNS の名前（長さ + 文字 の並び、0 で終わる）
	const labels: string[] = [];
	let i = 0;
	while (i < b.length && b[i] !== 0 && b[i] < 64) {
		labels.push(String.fromCharCode(...b.slice(i + 1, i + 1 + b[i])));
		i += b[i] + 1;
	}
	if (labels.length > 0 && i === b.length - 1) out.push(labels.join('.'));
	out.push(toHex(b));
	return out.filter((x) => x !== '');
}

/** 欄の値が、そのバイトの読み方のどれかで始まる */
export function fieldMatches(v: string, b: readonly number[]): boolean {
	const lv = v.toLowerCase();
	return readings(b).some((r) => lv.startsWith(r.toLowerCase()));
}

const ascii = (b: readonly number[]) => String.fromCharCode(...b);

/** Git の物（blob / tree / commit）なら、その ID（中身の SHA-1）。ちがえば null */
export function gitObjectId(b: readonly number[]): string | null {
	const head = /^(blob|tree|commit|tag) (\d+)\0/.exec(ascii(b.slice(0, 32)));
	if (!head) return null;
	return sha1Hex(new Uint8Array(b));
}

/** 荷物を確かめる。問題の文の並び（無ければ空） */
export function verifyPacket(p: Packet): string[] {
	const out: string[] = [];
	if (p.hex === undefined) return out;
	const b = hexBytes(p.hex);
	if (!b) return ['hex が 16 進のバイト列でない'];
	const size = sizeBytes(p.size);
	if (size === null) out.push(`size「${p.size}」が「n B」の形でない`);
	else if (size !== b.length) out.push(`size は ${size} B だが、hex は ${b.length} B`);

	for (const part of p.parts)
		for (const fl of part.fields) {
			if (!fl.at) continue;
			const [s, n] = fl.at;
			const bytes = b.slice(s, s + n);
			if (bytes.length !== n) continue; // 検査 18 が受け持つ
			if (!fieldMatches(fl.v, bytes))
				out.push(
					`${part.name} の「${fl.k}」の値「${fl.v}」が、バイト ${toHex(bytes)} から読めない`
				);
		}

	// 層の決まりを、外側から読む
	let ip = -1;
	if (p.parts[0]?.name === 'Ethernet II' && b[12] === 0x08 && b[13] === 0x00) ip = 14;
	else if (p.parts[0]?.name === 'IPv4') ip = 0;
	if (ip >= 0) {
		const ihl = (b[ip] & 15) * 4;
		const total = (b[ip + 2] << 8) | b[ip + 3];
		if (b[ip] >> 4 !== 4) out.push('IPv4 の版が 4 でない');
		if (ip + total !== b.length)
			out.push(`IPv4 の全体の長さ ${total} が、残りのバイト ${b.length - ip} と合わない`);
		if (!sumsOk(b.slice(ip, ip + ihl))) out.push('IPv4 のチェックサムが合わない');
		const proto = b[ip + 9];
		const seg = b.slice(ip + ihl, ip + total);
		const pseudo = [...b.slice(ip + 12, ip + 20), 0, proto, seg.length >> 8, seg.length & 255];
		if (proto === 6 && !sumsOk([...pseudo, ...seg])) out.push('TCP のチェックサムが合わない');
		if (proto === 17) {
			const ulen = (seg[4] << 8) | seg[5];
			if (ulen !== seg.length) out.push(`UDP の長さ ${ulen} が ${seg.length} と合わない`);
			if (!sumsOk([...pseudo, ...seg])) out.push('UDP のチェックサムが合わない');
		}
	}

	// Git の物：頭の大きさと、ID
	const head = /^(blob|tree|commit|tag) (\d+)\0/.exec(ascii(b.slice(0, 32)));
	if (head) {
		const len = Number(head[2]);
		const rest = b.length - head[0].length;
		if (len !== rest) out.push(`Git の物の頭の大きさ ${len} が、中身 ${rest} B と合わない`);
	}
	return out;
}

/** 検査 22：Git の物の荷物は、ID の欄（7〜40 字）が中身の SHA-1 と一致する */
export function verifyGitId(p: Packet): string[] {
	if (p.hex === undefined) return [];
	const b = hexBytes(p.hex);
	if (!b) return [];
	const id = gitObjectId(b);
	if (!id) return [];
	const fields = p.parts.flatMap((x) => x.fields);
	const named = fields.filter((x) => /ID/.test(x.k));
	if (named.length === 0) return [`Git の物（${id.slice(0, 7)}）に ID の欄が無い`];
	const bad = named.filter((x) => {
		const m = /^[0-9a-f]{7,40}/.exec(x.v);
		return !m || !id.startsWith(m[0]);
	});
	return bad.map((x) => `ID の欄「${x.v}」が、中身から計算した ${id} と合わない`);
}
