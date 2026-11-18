// 本物のバイト列で荷物の中身（Inside.packet）を組み立てる。
// レッスンのデータが使う。長さとチェックサムは、ここで本物の決まり（RFC 791・793・768）どおりに計算する。
// 検査 21（bytes.ts の verifyPacket）は、ここで作った物を別の道筋で読み直して確かめる。
import type { Packet, PacketField, PacketPart } from './types.ts';

type Level = 1 | 2 | 3;
/** 組み立て途中の欄。bytes はこの欄のバイト */
export type RawField = { k: string; v: string; level: Level; bytes: number[] };
export type RawPart = { name: string; fields: RawField[] };

export const utf8 = (s: string): number[] => [...new TextEncoder().encode(s)];
export const u8 = (v: number): number[] => [v & 255];
export const u16 = (v: number): number[] => [(v >> 8) & 255, v & 255];
export const u32 = (v: number): number[] => [
	(v >>> 24) & 255,
	(v >>> 16) & 255,
	(v >>> 8) & 255,
	v & 255
];
export const ipBytes = (s: string): number[] => s.split('.').map(Number);
export const macBytes = (s: string): number[] => s.split(':').map((h) => parseInt(h, 16));
const hex2 = (v: number, n: number) => '0x' + v.toString(16).padStart(n, '0');

/** インターネットのチェックサム（16 ビットの 1 の補数和の補数） */
export function checksum(bytes: readonly number[]): number {
	let s = 0;
	for (let i = 0; i < bytes.length; i += 2) s += (bytes[i] << 8) + (bytes[i + 1] ?? 0);
	while (s >> 16) s = (s & 0xffff) + (s >> 16);
	return ~s & 0xffff;
}

const sum = (fs: RawField[]) => fs.flatMap((f) => f.bytes);
const f = (k: string, v: string, level: Level, bytes: number[]): RawField => ({
	k,
	v,
	level,
	bytes
});

/** 文字の層（HTTP の頭など）。1 行が 1 欄。行の終わりに \r\n を付ける */
export function textPart(
	name: string,
	lines: { k: string; line: string; level: Level }[],
	body?: { k: string; text: string; level: Level }
): RawPart {
	const fields = lines.map((l) => f(l.k, l.line, l.level, utf8(l.line + '\r\n')));
	fields.push(f('頭の終わり', '\\r\\n', 3, utf8('\r\n')));
	if (body) fields.push(f(body.k, body.text, body.level, utf8(body.text)));
	return { name, fields };
}

export type Ends = { mac: string; ip: string; port: number };
export type TcpSpec = {
	name: string;
	src: Ends;
	dst: Ends;
	seq: number;
	ack: number;
	flags: string[]; // "SYN" "ACK" "PSH" "FIN" "RST"
	window: number;
	ipId: number;
	ttl?: number;
	app?: RawPart; // TCP の上に載る物
	options?: RawField[]; // TCP の選択肢（tcpOptions で作る）。頭の長さに入る
};
const FLAG_BITS: Record<string, number> = { FIN: 1, SYN: 2, RST: 4, PSH: 8, ACK: 16 };

function ethPart(src: Ends, dst: Ends): RawPart {
	return {
		name: 'Ethernet II',
		fields: [
			f('宛先 MAC', dst.mac, 3, macBytes(dst.mac)),
			f('送り元 MAC', src.mac, 3, macBytes(src.mac)),
			f('中身の種類', '0x0800（IPv4）', 3, u16(0x0800))
		]
	};
}

function ipPart(src: Ends, dst: Ends, proto: number, id: number, ttl: number, inner: number) {
	const total = 20 + inner;
	const head = (ck: number) => [
		f('版と頭の長さ', '0x45（版 4・20 バイト）', 3, u8(0x45)),
		f('扱いの印', '0x00', 3, u8(0)),
		f('全体の長さ', `${total}`, 2, u16(total)),
		f('番号', `${hex2(id, 4)}`, 3, u16(id)),
		f('分け方の印', '0x4000（分けない）', 3, u16(0x4000)),
		f('寿命（TTL）', `${ttl}`, 2, u8(ttl)),
		f('中身の決まり', `${proto}（${proto === 6 ? 'TCP' : 'UDP'}）`, 2, u8(proto)),
		f('チェックサム', hex2(ck, 4), 3, u16(ck)),
		f('送り元 IP', src.ip, 1, ipBytes(src.ip)),
		f('宛先 IP', dst.ip, 1, ipBytes(dst.ip))
	];
	const ck = checksum(sum(head(0)));
	return { name: 'IPv4', fields: head(ck) } satisfies RawPart;
}

function pseudo(src: Ends, dst: Ends, proto: number, len: number): number[] {
	return [...ipBytes(src.ip), ...ipBytes(dst.ip), 0, proto, ...u16(len)];
}

/** TCP の選択肢（RFC 9293 3.2・RFC 7323）。並びは Linux の tcp_options_write() と同じ */
export function tcpOptions(o: {
	mss?: number;
	sack?: boolean;
	ts?: [number, number];
	ws?: number;
}): RawField[] {
	const out: RawField[] = [];
	if (o.mss !== undefined)
		out.push(
			f('選択肢 MSS', `0x0204${o.mss.toString(16).padStart(4, '0')}（MSS ${o.mss}）`, 3, [
				2,
				4,
				...u16(o.mss)
			])
		);
	if (o.sack && o.ts) out.push(f('選択肢 SACK 可', '0x0402（SACK を使える）', 3, [4, 2]));
	if (o.ts) {
		if (!o.sack || o.mss === undefined)
			out.push(f('選択肢 NOP', '0x0101（詰め物 2 つ）', 3, [1, 1]));
		const [v, e] = o.ts;
		out.push(
			f(
				'選択肢 時刻の印',
				`080a${[...u32(v), ...u32(e)].map((x) => x.toString(16).padStart(2, '0')).join('')}（TSval ${v}・TSecr ${e}）`,
				3,
				[8, 10, ...u32(v), ...u32(e)]
			)
		);
	}
	if (o.ws !== undefined)
		out.push(
			f(
				'選択肢 窓の倍率',
				`0x010303${o.ws.toString(16).padStart(2, '0')}（NOP と 2^${o.ws} 倍）`,
				3,
				[1, 3, 3, o.ws]
			)
		);
	return out;
}

export function tcpPacket(s: TcpSpec): Packet {
	const app = s.app ? sum(s.app.fields) : [];
	const opts = s.options ?? [];
	const optLen = sum(opts).length;
	if (optLen % 4 !== 0) throw new Error(`TCP の選択肢が 4 バイトの倍数でない：${optLen}`);
	const hlen = 20 + optLen;
	const bits = s.flags.reduce((a, x) => a | (FLAG_BITS[x] ?? 0), 0);
	const head = (ck: number) => [
		f('送り元ポート', `${s.src.port}`, 1, u16(s.src.port)),
		f('宛先ポート', `${s.dst.port}`, 1, u16(s.dst.port)),
		f('順番の番号（seq）', `${s.seq}`, 2, u32(s.seq)),
		f('受け取った番号（ack）', `${s.ack}`, 2, u32(s.ack)),
		f('頭の長さ', `${hex2((hlen / 4) << 4, 2)}（${hlen} バイト）`, 3, u8((hlen / 4) << 4)),
		f('印', `${hex2(bits, 2)}（${s.flags.join('・')}）`, 1, u8(bits)),
		f('受け取れる量（窓）', `${s.window}`, 2, u16(s.window)),
		f('チェックサム', hex2(ck, 4), 3, u16(ck)),
		f('急ぎの位置', '0', 3, u16(0)),
		...opts
	];
	const seg0 = [...sum(head(0)), ...app];
	const ck = checksum([...pseudo(s.src, s.dst, 6, seg0.length), ...seg0]);
	const tcp: RawPart = { name: 'TCP', fields: head(ck) };
	const ip = ipPart(s.src, s.dst, 6, s.ipId, s.ttl ?? 64, seg0.length);
	return assemble(s.name, [ethPart(s.src, s.dst), ip, tcp, ...(s.app ? [s.app] : [])]);
}

export type UdpSpec = {
	name: string;
	src: Ends;
	dst: Ends;
	ipId: number;
	ttl?: number;
	app: RawPart;
};

export function udpPacket(s: UdpSpec): Packet {
	const app = sum(s.app.fields);
	const len = 8 + app.length;
	const head = (ck: number) => [
		f('送り元ポート', `${s.src.port}`, 1, u16(s.src.port)),
		f('宛先ポート', `${s.dst.port}`, 1, u16(s.dst.port)),
		f('長さ', `${len}`, 2, u16(len)),
		f('チェックサム', hex2(ck, 4), 3, u16(ck))
	];
	let ck = checksum([...pseudo(s.src, s.dst, 17, len), ...sum(head(0)), ...app]);
	if (ck === 0) ck = 0xffff;
	const udp: RawPart = { name: 'UDP', fields: head(ck) };
	const ip = ipPart(s.src, s.dst, 17, s.ipId, s.ttl ?? 64, len);
	return assemble(s.name, [ethPart(s.src, s.dst), ip, udp, s.app]);
}

/** DNS の問い・答え（A の 1 件）。RFC 1035 の形 */
export function dnsPart(o: {
	id: number;
	name: string;
	answer?: { ip: string; ttl: number };
}): RawPart {
	const qname = o.name.split('.').flatMap((p) => [p.length, ...utf8(p)]);
	qname.push(0);
	const flags = o.answer ? 0x8180 : 0x0100;
	const fields: RawField[] = [
		f('問いの番号', hex2(o.id, 4), 2, u16(o.id)),
		f('印', `${hex2(flags, 4)}（${o.answer ? '答え' : '問い'}）`, 2, u16(flags)),
		f('問いの数', '1', 3, u16(1)),
		f('答えの数', o.answer ? '1' : '0', 2, u16(o.answer ? 1 : 0)),
		f('権威の数', '0', 3, u16(0)),
		f('追加の数', '0', 3, u16(0)),
		f('問う名前', o.name, 1, qname),
		f('問う種類', '1（A）', 2, u16(1)),
		f('問う組', '1（IN）', 3, u16(1))
	];
	if (o.answer) {
		fields.push(
			f('答えの名前', '0xc00c（問いの名前を指す）', 3, u16(0xc00c)),
			f('答えの種類', '1（A）', 3, u16(1)),
			f('答えの組', '1（IN）', 3, u16(1)),
			f('覚えてよい秒（TTL）', `${o.answer.ttl}`, 2, u32(o.answer.ttl)),
			f('答えの長さ', '4', 3, u16(4)),
			f('答えの番地', o.answer.ip, 1, ipBytes(o.answer.ip))
		);
	}
	return { name: 'DNS', fields };
}

export const hexOf = (b: readonly number[]): string =>
	b.map((x) => x.toString(16).padStart(2, '0')).join('');

/** 層を並べて Packet にする。at はバイトの位置 */
export function assemble(name: string, parts: RawPart[]): Packet {
	let off = 0;
	const all: number[] = [];
	const out: PacketPart[] = parts.map((p) => ({
		name: p.name,
		fields: p.fields.map((x): PacketField => {
			const at: [number, number] = [off, x.bytes.length];
			off += x.bytes.length;
			all.push(...x.bytes);
			return { k: x.k, v: x.v, level: x.level, at };
		})
	}));
	return { name, size: `${all.length} B`, parts: out, hex: hexOf(all) };
}
