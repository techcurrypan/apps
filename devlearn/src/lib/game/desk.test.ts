import { describe, expect, it } from 'vitest';
import { GROUPS, MOVES } from './data.ts';
import {
	CLIENTS,
	closeDay,
	movesFor,
	morning,
	newRequests,
	playMove,
	startDesk,
	type DeskCtx,
	type DeskState,
	type Req
} from './desk.ts';

const NONE = new Set<string>();
const ALL = new Set(MOVES.map((m) => m.lesson));
const ctx = (over: Partial<DeskCtx> = {}): DeskCtx => ({
	day: 1,
	slots: 8,
	money: 600,
	systems: new Set<string>(),
	...over
});
const groupOf = (id: string) => GROUPS.find((g) => g.id === id)!;

describe('依頼の届き方（game-design.md 7.1・15.3）', () => {
	it('章 1 の 1 日目：G_1 の (s + i) 番目の症状、本当の原因は (s + 11i) 番目、候補は続く 4 つを一覧の並びに', () => {
		const rs = newRequests(1, 1, 0, 1);
		const g1 = GROUPS.filter((g) => g.week === 1);
		expect(rs.map((r) => r.group)).toEqual([g1[1].id, g1[2].id, g1[3].id]);
		const r = rs[1]; // i = 1
		const g = groupOf(r.group);
		const t = (1 + 11) % g.causes.length;
		expect(r.truth).toBe(g.causes[t]);
		const four = [0, 1, 2, 3].map((k) => g.causes[(t + k) % g.causes.length]);
		expect(r.candidates).toEqual(g.causes.filter((c) => four.includes(c)));
		expect(r).toMatchObject({
			id: 'w1-d1-k1',
			arrived: 1,
			due: 3,
			doubt: g.doubt,
			status: 'open'
		});
	});

	it('自由の章は全ての症状から、回ごとに通し番号を 21 ずらす', () => {
		const a = newRequests(0, 'free', 1, 1);
		const b = newRequests(0, 'free', 2, 1);
		expect(a[0].group).toBe(GROUPS[0].id);
		expect(b[0].group).toBe(GROUPS[21].id);
		expect(a[0].id).toBe('f1-d1-k0');
	});

	it('依頼主と建物は症状で決まる（G18 はパン屋の店主・G14 は港の倉庫の番頭）', () => {
		expect(CLIENTS.G18).toEqual({ who: '商店街のパン屋の店主', at: 'shopMain' });
		expect(CLIENTS.G14).toEqual({ who: '港の倉庫の番頭', at: 'warehouse' });
		for (const g of GROUPS) expect(CLIENTS[g.id], g.id).toBeTruthy();
	});
});

const open1 = (): { d: DeskState; r: Req } => {
	const d = morning(startDesk(1, 1), 1).desk;
	return { d, r: d.requests[0] };
};

describe('手（4.2）', () => {
	it('学ばない道：様子を聞く × 3 → 頼み込む × 疑い → 手探りで直す で必ず片付く', () => {
		for (let seed = 0; seed < 8; seed++) {
			let d = morning(startDesk(seed, 1), 1).desk;
			for (const r0 of d.requests.slice()) {
				const go = (type: 'ask' | 'plead' | 'grope') =>
					(d = playMove(d, { type, request: r0.id }, NONE, ctx()).desk);
				for (let k = 0; k < 3; k++) go('ask');
				let r = d.requests.find((x) => x.id === r0.id)!;
				expect(r.confirmed).toBe(true);
				for (let k = r.doubt; k > 0; k--) go('plead');
				go('grope');
				r = d.requests.find((x) => x.id === r0.id)!;
				expect(r.status).toBe('solved');
			}
		}
	});

	it('学んだ手で調べる：当たれば確定し根拠が残る。外れれば調べられる候補が全て消える', () => {
		const { d, r } = open1();
		const hit = MOVES.find((m) => m.tests.includes(r.truth))!;
		const a = playMove(d, { type: 'test', move: hit.lesson, request: r.id }, ALL, ctx());
		expect(a.ok).toBe(true);
		const ra = a.desk.requests[0];
		expect(ra.confirmed).toBe(true);
		expect(ra.evidence).toContain(hit.name);
		expect(a.slots).toBe(1);
		const miss = MOVES.find(
			(m) =>
				!m.tests.includes(r.truth) && m.tests.some((c) => c !== r.truth && r.candidates.includes(c))
		)!;
		const b = playMove(d, { type: 'test', move: miss.lesson, request: r.id }, ALL, ctx());
		const rb = b.desk.requests[0];
		expect(rb.confirmed).toBe(false);
		expect(rb.ruledOut).toEqual(r.candidates.filter((c) => miss.tests.includes(c)));
	});

	it('学んでいない手は打てず、理由を返す。当て直し（learned = null）では問わない', () => {
		const { d, r } = open1();
		const hit = MOVES.find((m) => m.tests.includes(r.truth))!;
		const no = playMove(d, { type: 'test', move: hit.lesson, request: r.id }, NONE, ctx());
		expect(no.ok).toBe(false);
		expect(no.why).toContain('学ぶと使える');
		expect(no.desk).toBe(d);
		expect(playMove(d, { type: 'test', move: hit.lesson, request: r.id }, null, ctx()).ok).toBe(
			true
		);
	});

	it('疑いがあると直せない。示す（根拠が要る）で 0 にする', () => {
		const s = morning(startDesk(1, 1), 1).desk;
		const r = s.requests.find((x) => x.doubt > 0)!;
		const t = MOVES.find((m) => m.tests.includes(r.truth))!;
		const noShow = playMove(s, { type: 'show', request: r.id }, ALL, ctx());
		expect(noShow.ok).toBe(false);
		let d = playMove(s, { type: 'test', move: t.lesson, request: r.id }, ALL, ctx()).desk;
		const f = MOVES.find((m) => m.fixes.includes(r.truth));
		if (f) {
			const no = playMove(d, { type: 'fix', move: f.lesson, request: r.id }, ALL, ctx());
			expect(no.ok).toBe(false);
			expect(no.why).toContain('疑い');
		}
		d = playMove(d, { type: 'show', request: r.id }, ALL, ctx()).desk;
		expect(d.requests.find((x) => x.id === r.id)!.doubt).toBe(0);
	});

	it('学んだ手で直す：解決。満足度 +3、届いた日のうちなら +1、報酬。仕組みがまだ無ければ建つ', () => {
		const { d, r } = open1();
		const t = MOVES.find((m) => m.tests.includes(r.truth))!;
		let x = playMove(d, { type: 'test', move: t.lesson, request: r.id }, ALL, ctx()).desk;
		if (x.requests[0].doubt) x = playMove(x, { type: 'show', request: r.id }, ALL, ctx()).desk;
		const f = MOVES.find((m) => m.fixes.includes(r.truth))!;
		const field = f.lesson.split('-')[0];
		const y = playMove(x, { type: 'fix', move: f.lesson, request: r.id }, ALL, ctx());
		expect(y.ok).toBe(true);
		expect(y.desk.requests[0].status).toBe('solved');
		expect(y.desk.clientSat).toBe(x.clientSat + 4);
		expect(y.money).toBe(groupOf(r.group).weight * 200);
		expect(y.builds).toBe(field);
		expect(y.slots).toBe(1);
		const z = playMove(
			x,
			{ type: 'fix', move: f.lesson, request: r.id },
			ALL,
			ctx({ systems: new Set([field]) })
		);
		expect(z.slots).toBe(0);
		expect(z.builds).toBeUndefined();
		expect(z.links).toBe(field);
		expect(z.changes.map((c) => c.why).join()).toContain('つなぐだけ');
	});

	it('外に頼む：資金 − 費用（報酬の 1.5 倍）、次の朝に片付いて満足度 +1、箱が建つ', () => {
		const { d, r } = open1();
		const w = groupOf(r.group).weight;
		const a = playMove(d, { type: 'outsource', request: r.id }, NONE, ctx());
		expect(a.money).toBe(-300 * w);
		expect(a.slots).toBe(0);
		expect(
			playMove(d, { type: 'outsource', request: r.id }, NONE, ctx({ money: 10 })).why
		).toContain('資金が足りない');
		const m = morning(a.desk, 2);
		expect(m.desk.requests.find((x) => x.id === r.id)!.status).toBe('solved');
		expect(m.desk.clientSat).toBe(a.desk.clientSat + 1);
		expect(m.boxes).toEqual([CLIENTS[r.group].at]);
	});

	it('期限（届いた日を含めて 3 日）を過ぎると、1 件 −5', () => {
		let d = morning(startDesk(1, 1), 1).desk;
		d = morning(d, 2).desk;
		d = morning(d, 3).desk;
		const m = morning(d, 4);
		const ex = m.desk.requests.filter((x) => x.status === 'expired');
		expect(ex.map((x) => x.arrived)).toEqual([1, 1, 1]);
		expect(m.desk.clientSat).toBe(50 - 15);
		expect(m.changes.filter((c) => c.what === 'clientSat').map((c) => c.why)[0]).toContain('期限');
	});

	it('再起動：原因が再起動で直る物なら一時解決（報酬は半分）。2 日後に、疑いを 1 増やして再び届く（−3）', () => {
		for (let seed = 0; seed < 60; seed++) {
			const d0 = morning(startDesk(seed, 1), 1).desk;
			const r = d0.requests.find((x) => x.doubt === 0 && x.truthRestartable);
			if (!r) continue;
			const a = playMove(d0, { type: 'restart', request: r.id }, NONE, ctx());
			expect(a.desk.requests.find((x) => x.id === r.id)!.status).toBe('temp');
			expect(a.money).toBe(100 * groupOf(r.group).weight);
			const m2 = morning(a.desk, 2).desk;
			const m = morning(m2, 3);
			const back = m.desk.requests.find((x) => x.id.endsWith('-r0'));
			expect(back).toMatchObject({ group: r.group, truth: r.truth, doubt: 1, arrived: 3 });
			expect(m.changes.some((c) => c.what === 'clientSat' && c.after - c.before === -3)).toBe(true);
			return;
		}
		throw new Error('再起動で直る原因の依頼が見つからない');
	});

	it('打てる手の一覧：学んだ手といつでもの手 5 つ。打てない手には理由がある', () => {
		const { d, r } = open1();
		const list = movesFor(d, r.id, NONE, ctx());
		expect(list.filter((m) => m.kind === 'any').map((m) => m.action.type)).toEqual([
			'ask',
			'plead',
			'grope',
			'restart',
			'outsource'
		]);
		for (const m of list) if (!m.ok) expect(m.why.length).toBeGreaterThan(0);
		const learned = list.filter((m) => m.kind === 'learned' && m.lesson);
		expect(learned.length).toBeGreaterThan(0);
		expect(learned.every((m) => !m.ok && m.why.includes('学ぶと使える'))).toBe(true);
		expect(learned[0].lessonTitle).toBeTruthy();
	});

	it('コマが足りない手は打てない（今日の勤務の残り）', () => {
		const { d, r } = open1();
		const no = playMove(d, { type: 'ask', request: r.id }, NONE, ctx({ slots: 0 }));
		expect(no.ok).toBe(false);
		expect(no.why).toContain('勤務');
		expect(playMove(d, { type: 'outsource', request: r.id }, NONE, ctx({ slots: 0 })).ok).toBe(
			true
		);
	});
});

describe('締め（11 章 3・15.7）', () => {
	it('依頼主の満足度が 20 以下で失敗。7 日目に 40 以上で合格、70 で良、90 で優', () => {
		const d = startDesk(1, 1);
		expect(closeDay({ ...d, clientSat: 20 }, 3).desk.result).toBe('failed');
		expect(closeDay({ ...d, clientSat: 60 }, 3).desk.result).toBe('playing');
		expect(closeDay({ ...d, clientSat: 39 }, 7).desk.result).toBe('failed');
		expect(closeDay({ ...d, clientSat: 40 }, 7).desk).toMatchObject({
			result: 'passed',
			grade: '合格'
		});
		expect(closeDay({ ...d, clientSat: 70 }, 7).desk.grade).toBe('良');
		const top = closeDay({ ...d, clientSat: 90 }, 7);
		expect(top.desk.grade).toBe('優');
		expect(top.money).toBe(900);
	});
});
