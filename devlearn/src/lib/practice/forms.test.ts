// 段 10-0：打つコマンドが無い題材の実戦の形 5 つ（explanation-standard.md 第 6 章・curriculum.md 3.2）
import { describe, expect, it } from 'vitest';
import type { Mistake, Practice } from '../lesson/types.ts';
import {
	cookieSent,
	firewall,
	judgeForm,
	pipeline,
	policy,
	renderHtml,
	route,
	type FormAnswer
} from './forms.ts';

const M = (match: string): Mistake => ({
	when: match,
	why: `why ${match}`,
	next: `next ${match}`,
	match
});
const P = (form: string, setup: unknown, success: unknown, mistakes: Mistake[] = []): Practice => ({
	goal: 'g',
	form,
	setup,
	success,
	mistakes
});

describe('calc 計算する', () => {
	const p = P(
		'calc',
		{ data: [{ k: 'IP', v: '192.168.10.37' }], steps: [{ label: '網' }, { label: '割合' }] },
		{ values: ['192.168.10.0', '0.25'], digits: 2 },
		[M('1=192.168.10.37')]
	);
	it('段ごとに正しい値なら合格。数は丸めの桁で比べる', () => {
		const a: FormAnswer = { kind: 'calc', values: ['192.168.10.0', '0.249'] };
		const r = judgeForm(p, a);
		expect(r.passed).toBe(true);
		expect(r.rows.map((x) => x.ok)).toEqual([true, true]);
	});
	it('よくある誤りの値は、その間違いの返事', () => {
		const r = judgeForm(p, { kind: 'calc', values: ['192.168.10.37', '0.25'] });
		expect(r.passed).toBe(false);
		expect(r.mistake?.why).toBe('why 1=192.168.10.37');
	});
});

describe('order 並べる', () => {
	const p = P(
		'order',
		{
			cards: [
				{ id: 'ack', text: 'ACK' },
				{ id: 'syn', text: 'SYN' },
				{ id: 'sa', text: 'SYN+ACK' }
			]
		},
		{ orders: [['syn', 'sa', 'ack']] },
		[M('ack<sa')]
	);
	it('正しい順なら合格。流すと、順が誤った所で止まる', () => {
		expect(judgeForm(p, { kind: 'order', order: ['syn', 'sa', 'ack'] }).passed).toBe(true);
		const r = judgeForm(p, { kind: 'order', order: ['syn', 'ack', 'sa'] });
		expect(r.passed).toBe(false);
		expect(r.rows.map((x) => x.ok)).toEqual([true, false, false]);
		expect(r.mistake?.match).toBe('ack<sa');
	});
});

describe('sort 振り分ける', () => {
	const p = P(
		'sort',
		{
			items: [
				{ id: 'pw', text: '合言葉' },
				{ id: 'role', text: '役割' }
			],
			bins: [
				{ id: 'authn', label: '認証' },
				{ id: 'authz', label: '認可' }
			]
		},
		{ bins: { pw: 'authn', role: 'authz' } },
		[M('pw:authz')]
	);
	it('全ての項目が正しい区分なら合格。誤った区分は返事', () => {
		expect(judgeForm(p, { kind: 'sort', bins: { pw: 'authn', role: 'authz' } }).passed).toBe(true);
		const r = judgeForm(p, { kind: 'sort', bins: { pw: 'authz', role: 'authz' } });
		expect(r.passed).toBe(false);
		expect(r.mistake?.match).toBe('pw:authz');
	});
	it('入れていない項目があると合格しない', () => {
		expect(judgeForm(p, { kind: 'sort', bins: { pw: 'authn' } }).passed).toBe(false);
	});
});

describe('pick 選ぶ', () => {
	const p = P(
		'pick',
		{
			situation: ['From: a'],
			choices: [
				{ id: 'a', text: 'A', result: '開いた' },
				{ id: 'b', text: 'B', result: '止めた' }
			]
		},
		{ choice: 'b' },
		[M('pick:a')]
	);
	it('正しい選択肢で合格。選んだ物の結果が流れる', () => {
		const r = judgeForm(p, { kind: 'pick', choice: 'b' });
		expect(r.passed).toBe(true);
		expect(r.rows[0].text).toContain('止めた');
		expect(judgeForm(p, { kind: 'pick', choice: 'a' }).mistake?.match).toBe('pick:a');
	});
});

describe('fix 直す（規則を上から当てる）', () => {
	it('規則は上から当て、最初に当たった物で決まる', () => {
		const rules = [
			'allow tcp 22 from 203.0.113.0/24',
			'deny tcp any from any',
			'allow tcp 80 from any'
		];
		expect(firewall(rules, { proto: 'tcp', port: 22, from: '203.0.113.5' })).toEqual({
			result: 'allow',
			line: 1
		});
		expect(firewall(rules, { proto: 'tcp', port: 80, from: '198.51.100.7' })).toEqual({
			result: 'deny',
			line: 2
		});
		expect(firewall(rules, { proto: 'udp', port: 53, from: '198.51.100.7' })).toEqual({
			result: 'deny',
			line: 0
		});
	});
	const p = P(
		'fix',
		{
			engine: 'firewall',
			lines: [
				{ id: 'r1', text: 'allow tcp 22 from 203.0.113.0/24' },
				{ id: 'r2', text: 'deny tcp any from any' },
				{ id: 'r3', text: 'allow tcp 80 from any' }
			],
			options: [
				{ line: 'r2', id: 'web', text: 'allow tcp 80 from any' },
				{ line: 'r3', id: 'deny', text: 'deny tcp any from any' },
				{ line: 'r2', id: 'all', text: 'allow tcp any from any' }
			],
			cases: [
				{ id: 'ssh', name: '管理の SSH', packet: { proto: 'tcp', port: 22, from: '203.0.113.5' } },
				{ id: 'web', name: '客の Web', packet: { proto: 'tcp', port: 80, from: '198.51.100.7' } },
				{ id: 'db', name: '外から DB', packet: { proto: 'tcp', port: 5432, from: '198.51.100.7' } }
			]
		},
		{ expect: { ssh: 'allow', web: 'allow', db: 'deny' } },
		[M('r2:all')]
	);
	it('直した後に流して、期待どおりなら合格。直す前と後の両方の結果を返す', () => {
		const r = judgeForm(p, { kind: 'fix', lines: { r2: 'web', r3: 'deny' } });
		expect(r.passed).toBe(true);
		expect(r.rows.map((x) => [x.before, x.after])).toEqual([
			['allow', 'allow'],
			['deny', 'allow'],
			['deny', 'deny']
		]);
	});
	it('誤った替え方は返事。結果が期待と違う行に印', () => {
		const r = judgeForm(p, { kind: 'fix', lines: { r2: 'all' } });
		expect(r.passed).toBe(false);
		expect(r.mistake?.match).toBe('r2:all');
		expect(r.rows.find((x) => x.key === 'db')?.ok).toBe(false);
	});
});

describe('fix の html（入力を頁に埋める。XSS）', () => {
	it('{名前} はそのまま埋め、{名前|escape} は < > & " \' を文字の印に替える', () => {
		const tpl = ['<p>{name}</p>', '<p>{msg|escape}</p>'];
		const input = { name: '<b>花</b>', msg: '<script>x()</script>' };
		expect(renderHtml(tpl, input).html).toBe(
			'<p><b>花</b></p>\n<p>&lt;script&gt;x()&lt;/script&gt;</p>'
		);
	});
	it('入力から <script や on…= の属性が頁に入ると、動く', () => {
		expect(renderHtml(['<p>{c}</p>'], { c: '<script>steal()</script>' }).result).toBe('runs');
		expect(renderHtml(['<p>{c}</p>'], { c: '<img src=x onerror=steal()>' }).result).toBe('runs');
		expect(renderHtml(['<p>{c|escape}</p>'], { c: '<img src=x onerror=steal()>' }).result).toBe(
			'text'
		);
		expect(renderHtml(['<p>{c}</p>'], { c: 'こんにちは' }).result).toBe('text');
	});
});

describe('fix の cookie（Cookie の SameSite。CSRF）', () => {
	const req = (site: string, method: string, top: string) => ({ site, method, top });
	it('Strict は同じサイトからだけ。Lax は他のサイトからの頁の移動（GET）にも付く。None は Secure と合わせて全てに付く', () => {
		const line = (s: string) => `Set-Cookie: session=7f3a; ${s}`;
		expect(cookieSent(line('SameSite=Strict'), req('other', 'GET', 'yes'))).toBe(false);
		expect(cookieSent(line('SameSite=Strict'), req('same', 'POST', 'no'))).toBe(true);
		expect(cookieSent(line('SameSite=Lax'), req('other', 'GET', 'yes'))).toBe(true);
		expect(cookieSent(line('SameSite=Lax'), req('other', 'POST', 'yes'))).toBe(false);
		expect(cookieSent(line('SameSite=Lax'), req('other', 'GET', 'no'))).toBe(false);
		expect(cookieSent(line('SameSite=None; Secure'), req('other', 'POST', 'no'))).toBe(true);
		// Secure の無い SameSite=None は、ブラウザが受け取らない
		expect(cookieSent(line('SameSite=None'), req('same', 'GET', 'yes'))).toBe(false);
	});
	it('受け付けは、Cookie が付き、確かめの値を見る決まりなら値もそろったときに通る', () => {
		const p = P(
			'fix',
			{
				engine: 'cookie',
				lines: [
					{ id: 'c', text: 'Set-Cookie: session=7f3a; SameSite=None; Secure' },
					{ id: 't', text: '確かめの値：見ない' }
				],
				options: [
					{ line: 'c', id: 'lax', text: 'Set-Cookie: session=7f3a; SameSite=Lax; Secure' },
					{ line: 't', id: 'look', text: '確かめの値：見る' }
				],
				cases: [
					{
						id: 'shop',
						name: '店の画面から送金',
						input: { site: 'same', method: 'POST', top: 'yes', token: 'yes' }
					},
					{
						id: 'trap',
						name: '罠から送金',
						input: { site: 'other', method: 'POST', top: 'yes', token: 'no' }
					},
					// 頁を見るだけ（op: view）は、確かめの値を見ない
					{
						id: 'link',
						name: '他のサイトのリンクから頁を開く',
						input: { site: 'other', method: 'GET', top: 'yes', token: 'no', op: 'view' }
					}
				]
			},
			{ expect: { shop: 'pass', trap: 'stop', link: 'pass' } },
			[M('case:trap:pass')]
		);
		expect(judgeForm(p, { kind: 'fix', lines: {} }).mistake?.match).toBe('case:trap:pass');
		expect(judgeForm(p, { kind: 'fix', lines: { c: 'lax' } }).passed).toBe(true);
		expect(judgeForm(p, { kind: 'fix', lines: { t: 'look' } }).passed).toBe(true);
	});
});

describe('fix の policy（権限の方針。最小権限）', () => {
	it('止める行が 1 つでも当たれば止める。無ければ、許す行が当たれば許す。どれにも当たらなければ止める', () => {
		const lines = [
			'allow read /data/sales/*',
			'allow write /reports/*',
			'deny write /reports/secret/*'
		];
		expect(policy(lines, { action: 'read', target: '/data/sales/2026-11.csv' })).toBe('allow');
		expect(policy(lines, { action: 'write', target: '/data/sales/2026-11.csv' })).toBe('deny');
		expect(policy(lines, { action: 'write', target: '/reports/secret/a' })).toBe('deny');
		expect(policy(lines, { action: 'delete', target: '/reports/a' })).toBe('deny');
		expect(policy(['allow * *'], { action: 'delete', target: '/x' })).toBe('allow');
	});
});

describe('fix の route（公開と非公開のサブネット）', () => {
	const ok = ['place web public', 'place db private', 'route public igw', 'route private nat'];
	it('外から届くのは、外への門（igw）の経路を持つサブネットだけ', () => {
		expect(route(ok, { from: 'internet', to: 'web' })).toBe('reach');
		expect(route(ok, { from: 'internet', to: 'db' })).toBe('blocked');
	});
	it('外への出口（nat）は、中から外へだけ通す。経路が無ければ外へ出られない', () => {
		expect(route(ok, { from: 'db', to: 'internet' })).toBe('reach');
		const none = ['place db private', 'route private none'];
		expect(route(none, { from: 'db', to: 'internet' })).toBe('blocked');
		expect(route(['place db private'], { from: 'db', to: 'internet' })).toBe('blocked');
	});
	it('同じ網の中どうしは届く。置き場の無い機械は届かない', () => {
		expect(route(ok, { from: 'web', to: 'db' })).toBe('reach');
		expect(route(ok, { from: 'internet', to: 'mail' })).toBe('blocked');
	});
});

describe('fix の pipeline（検査と配信の設定）', () => {
	const base = [
		'on push',
		'job lint run=npm run lint',
		'job test after=lint run=npm test',
		'job deploy after=test branch=main key=DEPLOY_TOKEN run=./deploy --token $DEPLOY_TOKEN'
	];
	it('走った段を順に返す。branch の合わない段は走らない', () => {
		expect(pipeline(base, { event: 'push', branch: 'main' })).toBe('lint→test→deploy');
		expect(pipeline(base, { event: 'push', branch: 'feature' })).toBe('lint→test');
	});
	it('落ちた段の後に依る段は走らない', () => {
		expect(pipeline(base, { event: 'push', branch: 'main', fail: 'test' })).toBe(
			'lint→test（失敗）'
		);
	});
	it('どの on にも当たらなければ走らない。branch 付きの on は、その枝だけ', () => {
		expect(pipeline(base, { event: 'pull', branch: 'feature' })).toBe('none');
		const onMain = ['on push branch=main', 'job lint run=npm run lint'];
		expect(pipeline(onMain, { event: 'push', branch: 'feature' })).toBe('none');
	});
	it('知らない言葉と、無い段への after は、設定の誤りで何も走らない', () => {
		expect(pipeline(['on psuh', ...base.slice(1)], { event: 'push', branch: 'main' })).toBe('none');
		expect(pipeline(['jb lint run=x', 'on push'], { event: 'push', branch: 'main' })).toBe('error');
		const bad = ['on push', 'job lint run=x', 'job test after=lnt run=y'];
		expect(pipeline(bad, { event: 'push', branch: 'main' })).toBe('error');
	});
	it('鍵：$名前 を使う段に key が無いと失敗。鍵をそのまま書くと記録に出る。pull の段に鍵を渡すと外に渡る', () => {
		const noKey = ['on push', 'job deploy run=./deploy --token $DEPLOY_TOKEN'];
		expect(pipeline(noKey, { event: 'push', branch: 'main' })).toBe('deploy（失敗）');
		const raw = ['on push', 'job deploy run=./deploy --token s3cr3t'];
		expect(pipeline(raw, { event: 'push', branch: 'main' })).toBe('deploy／鍵が記録に出る');
		const pull = ['on pull', 'job test key=DEPLOY_TOKEN run=npm test'];
		expect(pipeline(pull, { event: 'pull', branch: 'feature' })).toBe(
			'test／鍵が外からの変更に渡る'
		);
	});
});
