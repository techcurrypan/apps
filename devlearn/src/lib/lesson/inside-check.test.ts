// 検査 16〜25（explanation-standard.md 第 3 章。D-21）。各項目に、落ちる例と通る例を置く。
import { describe, expect, it } from 'vitest';
import { readings, verifyGitId, verifyPacket } from './bytes.ts';
import { calcMatches, evaluate } from './calc.ts';
import { checkLesson, type Problem } from './check.ts';
import { formatOf } from './logformat.ts';
import { assemble, dnsPart, hexOf, tcpPacket, textPart, udpPacket, utf8 } from './packet.ts';
import { clone, validLesson } from './testing/fixture.ts';
import { seconds } from './inside-check.ts';
import type { Lesson, Packet } from './types.ts';
import { sha1Hex } from '../tools/sha1.ts';

const failed = (ps: Problem[]) => [...new Set(ps.map((p) => p.check))].sort((a, b) => a - b);
const run = (l: Lesson, opt = {}) => failed(checkLesson(l, new Set(['tst-001']), opt));

const PC = { mac: '02:00:00:00:00:10', ip: '192.168.1.10', port: 52814 };
const WEB = { mac: '02:00:00:00:00:80', ip: '203.0.113.80', port: 80 };
const syn = () =>
	tcpPacket({
		name: 'TCP SYN',
		src: PC,
		dst: WEB,
		seq: 1000,
		ack: 0,
		flags: ['SYN'],
		window: 64240,
		ipId: 0x1c46
	});

/** 中身を持つ、全ての検査を通るレッスン（分野 net として扱う） */
function insideLesson(): Lesson {
	const l = clone(validLesson());
	l.field = 'net';
	l.explain[0].scene = [
		{ op: 'appear', id: 'a', label: 'PC', sub: '192.168.1.10', at: [0, 0] },
		{ op: 'appear', id: 'b', label: 'Web', sub: '203.0.113.80', at: [1, 0] },
		{ op: 'change', id: 'a', k: '値', v: '10' }
	];
	l.explain[1].scene = [
		{ op: 'move', from: 'a', to: 'b', payload: 'SYN', kind: 'tcp' },
		{ op: 'change', id: 'a', k: '値', v: '20' }
	];
	l.explain[1].log.size = '54 B';
	l.map = {
		nodes: {
			a: { icon: 'pc', town: '家', addr: '192.168.1.10' },
			b: { icon: 'server', town: '店', addr: '203.0.113.80' }
		},
		links: [{ a: 'a', b: 'b', label: '店へ行く', dir: 'ab' }]
	};
	l.explain.forEach((s) => (s.town = '町では、家から店へ行く。'));
	l.explain[1].inside = {
		packet: syn(),
		hosts: [
			{
				name: 'Web',
				town: '店',
				addr: '203.0.113.80',
				rows: [{ id: 'nginx', depth: 0, what: 'nginx: master', state: 'pid 901' }]
			}
		],
		logs: [
			{
				t: '09:00:00',
				src: 'tcpdump',
				text: '09:00:00.000000 IP 192.168.1.10.52814 > 203.0.113.80.80: Flags [S], seq 1000, win 64240, length 0'
			}
		]
	};
	l.explain[2].inside = {
		hosts: [
			{
				name: 'Web',
				town: '店',
				addr: '203.0.113.80',
				rows: [
					{ id: 'nginx', depth: 0, what: 'nginx: master', state: 'pid 901' },
					{ id: 'conn', depth: 1, what: 'TCP 192.168.1.10:52814', state: 'SYN-RECV' }
				]
			}
		],
		logs: [
			{
				t: '09:00:01',
				src: 'tcpdump',
				text: '09:00:01.000000 IP 203.0.113.80.80 > 192.168.1.10.52814: Flags [S.], seq 5000, ack 1001, win 65160, length 0'
			}
		]
	};
	l.explain[3].inside = {
		logs: [
			{
				t: '09:00:02',
				src: 'nginx access.log',
				text: '192.168.1.10 - - [10/Nov/2026:09:00:02 +0900] "GET / HTTP/1.1" 200 612 "-" "curl/8.5.0"'
			}
		]
	};
	return l;
}
const NET = { insideFields: new Set(['net']) };

describe('荷物の組み立てと読み直し（LS-Q1）', () => {
	it('TCP の SYN は 54 B で、長さ・チェックサム・欄が全て読める', () => {
		const p = syn();
		expect(p.size).toBe('54 B');
		expect(verifyPacket(p)).toEqual([]);
	});
	it('HTTP を載せた TCP も、UDP の DNS も通る', () => {
		const http = tcpPacket({
			...{ name: 'HTTP GET /', src: PC, dst: WEB, seq: 1001, ack: 5001, window: 502, ipId: 2 },
			flags: ['PSH', 'ACK'],
			app: textPart('HTTP', [
				{ k: '要求の行', line: 'GET / HTTP/1.1', level: 1 },
				{ k: 'Host', line: 'Host: shop.example.com', level: 1 }
			])
		});
		expect(verifyPacket(http)).toEqual([]);
		const dns = udpPacket({
			name: 'DNS の答え',
			src: { ...WEB, port: 53 },
			dst: PC,
			ipId: 3,
			app: dnsPart({
				id: 0x1a2b,
				name: 'shop.example.com',
				answer: { ip: '203.0.113.80', ttl: 300 }
			})
		});
		expect(verifyPacket(dns)).toEqual([]);
	});
	it('1 バイト変えると、チェックサムが合わなくなる', () => {
		const p = syn();
		const b = p.hex ?? '';
		const q: Packet = { ...p, hex: b.slice(0, 80) + (b[80] === '0' ? '1' : '0') + b.slice(81) };
		expect(verifyPacket(q).join()).toMatch(/チェックサム|読めない/);
	});
	it('欄の値がバイトから読めなければ落ちる', () => {
		const p = syn();
		p.parts[2].fields[0].v = '9999';
		expect(verifyPacket(p).join()).toContain('送り元ポート');
	});
	it('size がバイトの数と合わなければ落ちる', () => {
		const p = { ...syn(), size: '60 B' };
		expect(verifyPacket(p).join()).toContain('54');
	});
	it('読み方は 10 進・0x・IP・MAC・文字・DNS の名前', () => {
		expect(readings([0, 80])).toContain('80');
		expect(readings([0, 80])).toContain('0x0050');
		expect(readings([192, 168, 1, 10])).toContain('192.168.1.10');
		expect(readings(utf8('GET / HTTP/1.1\r\n'))).toContain('GET / HTTP/1.1');
		expect(readings([4, ...utf8('shop'), 3, ...utf8('com'), 0])).toContain('shop.com');
	});
});

describe('Git の ID（LS-Q2）', () => {
	const content = 'hello world\n';
	const obj = [...utf8(`blob ${utf8(content).length}\0`), ...utf8(content)];
	const id = sha1Hex(new Uint8Array(obj));
	const pk = (v: string) => {
		const p = assemble('blob', [
			{ name: 'blob', fields: [{ k: '中身', v: `blob ${content.length}`, level: 1, bytes: obj }] }
		]);
		p.parts[0].fields.push({ k: 'ID', v, level: 1 });
		return p;
	};
	it('本物の git と同じ ID になる（hello world は 3b18e51）', () => {
		expect(id.startsWith('3b18e51')).toBe(true);
		expect(verifyGitId(pk(id))).toEqual([]);
		expect(verifyGitId(pk(id.slice(0, 7)))).toEqual([]);
	});
	it('ID がちがえば落ちる', () => {
		expect(verifyGitId(pk('0123456')).length).toBe(1);
	});
	it('中の物を指す ID（tree の行の「〜の中身の ID」）は、その物自身の ID として比べない', () => {
		const p = pk(id);
		p.parts[0].fields.push({
			k: 'hello.txt の中身の ID',
			v: '0123456789abcdef0123456789abcdef01234567',
			level: 1
		});
		expect(verifyGitId(p)).toEqual([]);
	});
	it('頭の大きさが中身と合わなければ落ちる', () => {
		const bad = assemble('blob', [
			{
				name: 'blob',
				fields: [
					{ k: '中身', v: 'blob 99', level: 1, bytes: [...utf8('blob 99\0'), ...utf8(content)] }
				]
			}
		]);
		expect(verifyPacket(bad).join()).toContain('99');
		expect(hexOf([1, 255])).toBe('01ff');
	});
});

describe('式（LS-Q3）', () => {
	it('四則・累乗・関数', () => {
		expect(evaluate('(2-1.5)^2 + (3-2.2)^2')).toBeCloseTo(0.89);
		expect(evaluate('exp(2)/(exp(2)+exp(1)+1)')).toBeCloseTo(0.6652, 3);
		expect(evaluate('-3 * -2')).toBe(6);
		expect(() => evaluate('2 + foo(1)')).toThrow();
	});
	it('v の桁に丸めて比べる', () => {
		expect(calcMatches('0.67', 'exp(2)/(exp(2)+exp(1)+1)').ok).toBe(true);
		expect(calcMatches('0.66', 'exp(2)/(exp(2)+exp(1)+1)').ok).toBe(false);
		expect(calcMatches('−0.15（下げた）', '0.70-0.85').ok).toBe(true);
	});
});

describe('時刻', () => {
	it('経過と時計を読む', () => {
		expect(seconds('12ms')).toEqual({ kind: 'elapsed', s: 0.012 });
		expect(seconds('09:00:01.5')?.s).toBe(32401.5);
		expect(seconds('あとで')).toBeNull();
	});
});

describe('ログの書式（LS-Q4）', () => {
	it('nginx の access.log の本物の形は当たり、作った形は当たらない', () => {
		const f = formatOf('nginx access.log');
		expect(
			f?.line.test(
				'192.168.1.10 - - [10/Nov/2026:09:00:02 +0900] "GET / HTTP/1.1" 200 612 "-" "curl/8.5.0"'
			)
		).toBe(true);
		expect(f?.line.test('GET / → 200')).toBe(false);
	});
	it('表に無い書き手は null', () => {
		expect(formatOf('my app')).toBeNull();
	});
});

describe('検査 16〜25', () => {
	it('中身を持つ見本は全て通る', () => {
		const l = insideLesson();
		l.practice.commands = ['show'];
		const opt = { ...NET, refs: { show: 'https://example.org/show' } };
		expect(checkLesson(l, new Set(['tst-001']), opt)).toEqual([]);
	});
	it('16：書き終えた分野で map が無ければ落ちる。分野の表に無ければ当てない', () => {
		const l = insideLesson();
		delete l.map;
		expect(run(l, NET)).toContain(16);
		const k = clone(validLesson());
		expect(run(k, NET)).not.toContain(16);
	});
	it('16：動きのある組に線が無い・名前が無い・向きが逆なら落ちる', () => {
		const l = insideLesson();
		l.map!.links = [];
		expect(run(l)).toContain(16);
		const m = insideLesson();
		m.map!.links[0].label = '';
		expect(run(m)).toContain(16);
		const n = insideLesson();
		n.map!.links[0].dir = 'ba';
		expect(run(n)).toContain(16);
	});
	it('16：net で動きのあるステップに packet が無い・hosts が 1 回・logs が 2 回なら落ちる', () => {
		const a = insideLesson();
		delete a.explain[1].inside!.packet;
		expect(run(a, NET)).toContain(16);
		const b = insideLesson();
		delete b.explain[2].inside!.hosts;
		expect(run(b, NET)).toContain(16);
		const c = insideLesson();
		delete c.explain[3].inside;
		expect(run(c, NET)).toContain(16);
	});
	it('16：予想の問いの答えが選択肢の外なら落ちる', () => {
		const l = insideLesson();
		l.explain[1].ask = { q: '次は？', opts: ['返事', '無視'], a: 2, why: '返事が来る' };
		expect(run(l)).toContain(16);
		l.explain[1].ask.a = 0;
		expect(run(l)).not.toContain(16);
	});
	it('20：flow の機械が図に無い・線の無い組・読めない型なら落ちる（LS-P9）', () => {
		const ok = insideLesson();
		ok.practice.commands = ['show'];
		ok.practice.flow = [
			{ match: '^show ', from: 'a', to: 'b' },
			{ match: '^ls', from: 'a', to: 'a' }
		];
		const opt = { ...NET, refs: { show: 'https://example.org/show' } };
		expect(checkLesson(ok, new Set(['tst-001']), opt)).toEqual([]);
		for (const f of [
			{ match: '^show ', from: 'a', to: 'zz' },
			{ match: '^show ', from: 'b', to: 'b2' },
			{ match: '(', from: 'a', to: 'b' }
		]) {
			const l = clone(ok);
			l.practice.flow = [f];
			expect(run(l, opt)).toContain(20);
		}
	});
	it('16：世界の状態の near が図の機械に無ければ落ちる（LS-D8）', () => {
		const l = insideLesson();
		l.explain[1].world = { kind: 'chain', near: 'a', items: [{ id: 'abc1234', text: 'x' }] };
		expect(run(l)).not.toContain(16);
		l.explain[1].world = { kind: 'chain', near: 'zz', items: [{ id: 'abc1234', text: 'x' }] };
		expect(run(l)).toContain(16);
	});
	it('17：同じステップで id が重なる・別の機械へ移ると落ちる', () => {
		const l = insideLesson();
		l.explain[2].inside!.hosts![0].rows[1].id = 'nginx';
		expect(run(l)).toContain(17);
		const m = insideLesson();
		m.explain[2].inside!.hosts![0].name = 'PC';
		expect(run(m)).toContain(17);
	});
	it('18：at が hex を超える・hex があるのに at が無いと落ちる', () => {
		const l = insideLesson();
		l.explain[1].inside!.packet!.parts[0].fields[0].at = [50, 10];
		expect(run(l)).toContain(18);
		const m = insideLesson();
		for (const p of m.explain[1].inside!.packet!.parts) for (const f of p.fields) delete f.at;
		expect(run(m)).toContain(18);
	});
	it('19：ログが 5 行・120 字を超えると落ちる', () => {
		const l = insideLesson();
		const one = l.explain[1].inside!.logs![0];
		l.explain[1].inside!.logs = [one, one, one, one, one];
		expect(run(l)).toContain(19);
		const m = insideLesson();
		m.explain[3].inside!.logs![0].text += 'x'.repeat(120);
		expect(run(m)).toContain(19);
	});
	it('20：書き終えた分野の道具の実戦は、全てのコマンドに参考のリンクが要る', () => {
		const l = insideLesson();
		expect(run(l, NET)).toContain(20);
		l.practice.commands = ['show'];
		expect(run(l, { ...NET, refs: {} })).toContain(20);
		expect(run(l, { ...NET, refs: { show: 'https://example.org/show' } })).not.toContain(20);
		const used = new Map([['tst-001', ['show', 'set']]]);
		expect(run(l, { ...NET, refs: { show: 'x' }, used })).toContain(20);
	});
	it('21：荷物の値が読めなければ落ちる', () => {
		const l = insideLesson();
		l.explain[1].inside!.packet!.parts[1].fields[8].v = '10.0.0.1';
		expect(run(l)).toContain(21);
	});
	it('23：書式の表に無い書き手・形の合わない行は落ちる', () => {
		const l = insideLesson();
		l.explain[3].inside!.logs![0].src = 'web';
		expect(run(l)).toContain(23);
		const m = insideLesson();
		m.explain[3].inside!.logs![0].text = 'GET / 200';
		expect(run(m)).toContain(23);
	});
	it('24：番地・大きさ・時刻が食い違うと落ちる', () => {
		const a = insideLesson();
		a.map!.nodes.b.addr = '203.0.113.81';
		expect(run(a)).toContain(24);
		const b = insideLesson();
		b.explain[1].log.size = '60 B';
		expect(run(b)).toContain(24);
		const c = insideLesson();
		c.explain[3].inside!.logs![0].t = '08:59:00';
		expect(run(c)).toContain(24);
		const d = insideLesson();
		d.explain[2].log.t = '0.0001s';
		expect(run(d)).toContain(24);
	});
	it('25：式の値が v と合わない・計算の題材に式が無いと落ちる', () => {
		const l = insideLesson();
		l.explain[0].facts = [{ k: '損失', v: '0.47', calc: '(1-0.5)^2' }];
		expect(run(l)).toContain(25);
		l.explain[0].facts = [{ k: '損失', v: '0.25', calc: '(1-0.5)^2' }];
		expect(run(l)).not.toContain(25);
		const m = insideLesson();
		m.practice.form = 'calc';
		delete m.practice.tool;
		expect(run(m)).toContain(25);
	});
});
