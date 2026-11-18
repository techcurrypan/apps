// TCP の選択肢（MSS・SACK・時刻の印・窓の倍率）を持つ区切り。Linux の SYN は頭が 40 バイトになる。
import { describe, expect, it } from 'vitest';
import { hexBytes, verifyPacket } from './bytes.ts';
import { tcpOptions, tcpPacket } from './packet.ts';

const syn = () =>
	tcpPacket({
		name: 'TCP SYN',
		src: { mac: '52:54:00:00:00:05', ip: '10.0.0.5', port: 43210 },
		dst: { mac: '52:54:00:00:00:09', ip: '10.0.0.9', port: 9000 },
		seq: 2717001000,
		ack: 0,
		flags: ['SYN'],
		window: 64240,
		ipId: 0x6a1c,
		options: tcpOptions({ mss: 1460, sack: true, ts: [3000, 0], ws: 7 })
	});

describe('TCP の選択肢', () => {
	it('SYN は 74 B（Ethernet 14・IP 20・TCP 40）', () => {
		const p = syn();
		expect(p.size).toBe('74 B');
		expect(hexBytes(p.hex!)!.length).toBe(74);
	});
	it('頭の長さが 0xa0（40 バイト）で、チェックサムと欄が読み直せる', () => {
		const p = syn();
		const tcp = p.parts.find((x) => x.name === 'TCP')!;
		expect(tcp.fields.find((f) => f.k === '頭の長さ')!.v).toBe('0xa0（40 バイト）');
		expect(verifyPacket(p)).toEqual([]);
	});
	it('選択肢の並びは Linux の SYN と同じ（MSS・SACK 可・時刻の印・NOP・窓の倍率）', () => {
		const b = hexBytes(syn().hex!)!;
		expect(
			b
				.slice(54, 74)
				.map((x) => x.toString(16).padStart(2, '0'))
				.join('')
		).toBe('020405b40402080a00000bb800000000' + '01030307');
	});
	it('ACK の選択肢は NOP・NOP・時刻の印（12 バイト）', () => {
		const o = tcpOptions({ ts: [5003, 4003] });
		expect(o.flatMap((f) => f.bytes)).toHaveLength(12);
	});
});
