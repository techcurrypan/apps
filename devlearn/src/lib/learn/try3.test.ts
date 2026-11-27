import { describe, expect, it } from 'vitest';
import { completeLine, histAt, startTry, tasksDone, typeLine } from './try3';
import { TRY_TCP } from '../content/v3/try-tcp';

// learn-standard.md 第 19 章「やってみる」：頼み・やることの一覧（済むと ✓）・端末（履歴・補完・Ctrl+L）・命令の見本・公式の説明への道。
// 状態は打った命令だけから決まる（乱数なし。CLAUDE.md 第 8 章）
describe('やってみる（TCP：大きなファイルの配信だけ遅い）', () => {
	it('始めは頼みの 1 行だけ。やることは 1 つも済んでいない', () => {
		const s = startTry(TRY_TCP);
		expect(s.lines).toHaveLength(1);
		expect(tasksDone(TRY_TCP, s).every((x) => !x)).toBe(true);
	});
	it('ss -tin で cwnd 9・再送 412 が出て、1 つ目のやることが済む', () => {
		const s = typeLine(TRY_TCP, startTry(TRY_TCP), 'ss -tin dst 203.0.113.80');
		const out = s.lines.map((l) => l.text).join('\n');
		expect(out).toContain('ops@web-1:~$ ss -tin dst 203.0.113.80');
		expect(out).toContain('cwnd:9');
		expect(out).toContain('retrans:1/412');
		expect(tasksDone(TRY_TCP, s)[0]).toBe(true);
	});
	it('BBR と fq にしてから ss を打つと cwnd が 86 に育ち、全てのやることが済む', () => {
		let s = startTry(TRY_TCP);
		for (const c of [
			'ss -tin dst 203.0.113.80',
			'nstat -az TcpExtTCPLostRetransmit',
			'tc -s qdisc show dev eth0',
			'sysctl -w net.ipv4.tcp_congestion_control=bbr',
			'tc qdisc replace dev eth0 root fq',
			'ss -tin dst 203.0.113.80'
		])
			s = typeLine(TRY_TCP, s, c);
		expect(s.lines.map((l) => l.text).join('\n')).toContain('cwnd:86');
		expect(tasksDone(TRY_TCP, s).every(Boolean)).toBe(true);
		expect(TRY_TCP.metrics(s).cwnd).toBe('86 MSS');
	});
	it('知らない命令は、なぜ駄目かと次の一手（help）を返す', () => {
		const s = typeLine(TRY_TCP, startTry(TRY_TCP), 'ping 203.0.113.80');
		const reply = s.lines.slice(2);
		expect(reply[0].kind).toBe('err');
		expect(reply[0].text).toContain('使えない');
		expect(reply[1].text).toContain('次の一手');
		expect(reply[1].text).toContain('help');
	});
	it('clear（Ctrl+L と同じ）で画面の行を消す。履歴は残る', () => {
		let s = typeLine(TRY_TCP, startTry(TRY_TCP), 'help');
		s = typeLine(TRY_TCP, s, 'clear');
		expect(s.lines).toHaveLength(0);
		expect(s.hist).toEqual(['help', 'clear']);
	});
	it('同じ命令の並びから同じ状態', () => {
		const a = typeLine(TRY_TCP, startTry(TRY_TCP), 'tc -s qdisc show dev eth0');
		const b = typeLine(TRY_TCP, startTry(TRY_TCP), 'tc -s qdisc show dev eth0');
		expect(a).toEqual(b);
	});
});

describe('端末の履歴と補完', () => {
	it('↑ で 1 つ前、さらに ↑ でその前。↓ で戻り、一番新しいの次は空', () => {
		const h = ['a', 'b', 'c'];
		expect(histAt(h, 1)).toBe('c');
		expect(histAt(h, 2)).toBe('b');
		expect(histAt(h, 9)).toBe('a');
		expect(histAt(h, 0)).toBe('');
	});
	it('Tab：見本の命令の中で、打った所から始まる物が 1 つならそれに、複数なら共通の所まで', () => {
		expect(completeLine(TRY_TCP, 'nst')).toBe('nstat -az TcpExtTCPLostRetransmit');
		expect(completeLine(TRY_TCP, 'tc ')).toBe('tc ');
		expect(completeLine(TRY_TCP, 'sysctl -w')).toBe(
			'sysctl -w net.ipv4.tcp_congestion_control=bbr'
		);
		expect(completeLine(TRY_TCP, 'zzz')).toBe('zzz');
	});
	it('見本の命令は全て、知らない命令の返事にならない（打てば何か意味のある出力が出る）', () => {
		for (const c of TRY_TCP.cards) {
			const s = typeLine(TRY_TCP, startTry(TRY_TCP), c);
			expect(s.lines.slice(1).some((l) => l.kind === 'err' && l.text.includes('使えない'))).toBe(
				false
			);
		}
	});
	it('公式の説明への道は https で、命令の見本の道具を全て含む', () => {
		const tools = new Set(TRY_TCP.cards.map((c) => c.split(' ')[0]));
		for (const t of tools) expect(TRY_TCP.refs.some(([n]) => n.startsWith(t))).toBe(true);
		expect(TRY_TCP.refs.every(([, u]) => u.startsWith('https://'))).toBe(true);
	});
});
