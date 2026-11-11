// 要望の解き方（game-design.md 第 4〜7 章・11 章、街での読み替えは 15.2〜15.5・15.7）。
// 症状 1 つと候補 4 つ → 学んだ手で調べる・示す・直す／いつでもの手 5 つ。依頼主の満足度（段 4 の信頼）と章の締め。
// DOM・WebGL・実時間を知らない。日は「章の何日目か」（1〜7）。時計と資金と街は town.ts が持ち、ここへは ctx で渡す。
import { CAUSES, GROUPS, MOVES, TITLES } from './data.ts';
import type { GroupRow, MoveRow } from './data-parse.ts';
import type { FeatKey } from './map.ts';

export type Chapter = 1 | 2 | 3 | 4 | 'free';
export type Status = 'open' | 'solved' | 'temp' | 'outsourced' | 'expired';
export type Grade = '合格' | '良' | '優';
export type How = 'learned' | 'grope' | 'out' | 'temp';

export type Req = {
	id: string;
	group: string;
	/** 届いた日・期限の日（章の何日目か。期限の日の終わりまで） */
	arrived: number;
	due: number;
	/** 4 つ。症状の原因の一覧の並び */
	candidates: string[];
	truth: string;
	truthRestartable: boolean;
	ruledOut: string[];
	confirmed: boolean;
	/** 学んだ手で確定したときの根拠 */
	evidence: string | null;
	doubt: number;
	status: Status;
	doneDay: number | null;
	how: How | null;
	/** 一時解決のとき、再び届く日 */
	recurDay: number | null;
	/** この要望で打った手の理由の文（板の「記録」） */
	notes: string[];
};

export type DeskState = {
	seed: number;
	chapter: Chapter;
	/** 自由の章の何回目か（1 から。章 1〜4 では 0） */
	freeRound: number;
	/** 依頼主の満足度（段 4 の信頼。0〜100） */
	clientSat: number;
	requests: Req[];
	result: 'playing' | 'failed' | 'passed';
	grade: Grade | null;
};

export type DeskAction =
	| { type: 'test' | 'fix'; move: string; request: string }
	| {
			type: 'show' | 'ask' | 'plead' | 'grope' | 'restart' | 'outsource';
			request: string;
	  };

/** 手を打つときに、街から渡す物 */
export type DeskCtx = {
	/** 章の何日目か */
	day: number;
	/** 今日の勤務の残り（コマ） */
	slots: number;
	money: number;
	/** 建っている仕組みの建物の分野 */
	systems: ReadonlySet<string>;
};

export type Change =
	| {
			what: 'clientSat' | 'doubt';
			before: number;
			after: number;
			why: string;
			request?: string;
	  }
	| { what: 'ruledOut'; request: string; causes: string[]; why: string }
	| { what: 'status'; request: string; before: string; after: string; why: string }
	| { what: 'arrive' | 'expire'; request: string; why: string };

// ---------------- 決まったデータ ----------------

/** 依頼主と建物（15.3） */
const CLIENT_TABLE: [string, FeatKey, string[]][] = [
	[
		'商店街のパン屋の店主',
		'shopMain',
		['G01', 'G02', 'G03', 'G04', 'G05', 'G08', 'G09', 'G18', 'G20']
	],
	['町内会長', 'board', ['G06', 'G07', 'G11']],
	['港の学校の先生', 'school', ['G10']],
	['診療所の受付', 'clinic', ['G12', 'G13', 'G15', 'G16', 'G17', 'G30']],
	['港の倉庫の番頭', 'warehouse', ['G14']],
	['運送屋の配車係', 'warehouse', ['G19', 'G21', 'G22', 'G23', 'G24', 'G25', 'G26', 'G27']],
	['組合の事務長', 'hall', ['G28', 'G29', 'G31', 'G32', 'G33', 'G34']]
];
export const CLIENTS: Record<string, { who: string; at: FeatKey }> = {};
for (const [who, at, gs] of CLIENT_TABLE) for (const g of gs) CLIENTS[g] = { who, at };

/** 分野ごとの仕組みの建物の名前（15.4） */
export const SYSTEM_NAMES: Record<string, string> = {
	git: '記録庫',
	db: '帳簿の倉庫',
	sec: '門番の小屋',
	net: '中継器',
	prg: '工房',
	lnx: '機械室',
	ctr: '荷箱の置き場',
	cld: '計算機の貸し場',
	ci: '検査場',
	ai: '予測の部屋',
	sta: '集計所'
};

const GROUP = new Map<string, GroupRow>(GROUPS.map((g) => [g.id, g]));
const CAUSE = new Map(CAUSES.map((c) => [c.id, c]));
const MOVE = new Map<string, MoveRow>(MOVES.map((m) => [m.lesson, m]));
export const groupOf = (id: string): GroupRow => {
	const g = GROUP.get(id);
	if (!g) throw new Error('症状が無い: ' + id);
	return g;
};
export const causeLabel = (id: string) => CAUSE.get(id)?.label ?? id;
export const fieldOf = (lesson: string) => lesson.split('-')[0];
export const reward = (g: GroupRow) => g.weight * 200;
export const outCost = (g: GroupRow) => g.weight * 300;

// 数（7.1・7.3・15.5）
export const DUE_DAYS = 3;
export const RECUR_DAYS = 2;
export const SAT = {
	start: 50,
	solved: 3,
	sameDay: 1,
	outsourced: 1,
	temp: 1,
	recur: -3,
	expired: -5,
	plead: -1,
	fail: 20,
	pass: 40,
	good: 70,
	best: 90
};
export const CHAPTER_REWARD: Record<Grade, number> = { 合格: 300, 良: 600, 優: 900 };
export const DAYS_PER_CHAPTER = 7;

// ---------------- 届き方（7.1・15.3） ----------------

const prefix = (chapter: Chapter, freeRound: number) =>
	chapter === 'free' ? `f${freeRound}` : `w${chapter}`;

export function newRequests(seed: number, chapter: Chapter, freeRound: number, day: number): Req[] {
	const G = chapter === 'free' ? GROUPS : GROUPS.filter((g) => g.week === chapter);
	const out: Req[] = [];
	for (let k = 0; k < 3; k++) {
		const i = 3 * (day - 1) + k + (chapter === 'free' ? 21 * (freeRound - 1) : 0);
		const g = G[(seed + i) % G.length];
		const m = g.causes.length;
		const t = (seed + 11 * i) % m;
		const four = new Set([0, 1, 2, 3].map((j) => g.causes[(t + j) % m]));
		const truth = g.causes[t];
		out.push({
			id: `${prefix(chapter, freeRound)}-d${day}-k${k}`,
			group: g.id,
			arrived: day,
			due: day + DUE_DAYS - 1,
			candidates: g.causes.filter((c) => four.has(c)),
			truth,
			truthRestartable: CAUSE.get(truth)?.restartable ?? false,
			ruledOut: [],
			confirmed: false,
			evidence: null,
			doubt: g.doubt,
			status: 'open',
			doneDay: null,
			how: null,
			recurDay: null,
			notes: []
		});
	}
	return out;
}

export function startDesk(seed: number, chapter: Chapter, freeRound = 0): DeskState {
	return {
		seed,
		chapter,
		freeRound,
		clientSat: SAT.start,
		requests: [],
		result: 'playing',
		grade: null
	};
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const sign = (v: number) => (v >= 0 ? '+' + v : String(v));
const title = (r: Req) => `『${groupOf(r.group).symptom}』`;

/** 依頼主の満足度を動かし、理由を changes に積む */
function bump(d: DeskState, v: number, why: string, ch: Change[], request?: string): DeskState {
	const after = clamp(d.clientSat + v);
	ch.push({
		what: 'clientSat',
		before: d.clientSat,
		after,
		why: `依頼主の満足度 ${sign(v)}：${why}`,
		request
	});
	return { ...d, clientSat: after };
}
const put = (d: DeskState, r: Req): DeskState => ({
	...d,
	requests: d.requests.map((x) => (x.id === r.id ? r : x))
});

// ---------------- 朝（11 章 1） ----------------

/** 朝 8:00：外に頼んだ物が片付く → 期限切れ → 再発 → 新しい要望 3 件 */
export function morning(
	desk: DeskState,
	day: number
): { desk: DeskState; changes: Change[]; boxes: FeatKey[] } {
	const ch: Change[] = [];
	const boxes: FeatKey[] = [];
	let d = desk;
	for (const r of d.requests)
		if (r.status === 'outsourced') {
			d = put(d, { ...r, status: 'solved', doneDay: day });
			ch.push({
				what: 'status',
				request: r.id,
				before: 'outsourced',
				after: 'solved',
				why: `${title(r)}を、外の業者が片付けた`
			});
			d = bump(d, SAT.outsourced, `${title(r)}を外に頼んで片付いた`, ch, r.id);
			boxes.push(CLIENTS[r.group].at);
		}
	for (const r of d.requests)
		if (r.status === 'open' && r.due < day) {
			d = put(d, { ...r, status: 'expired' });
			ch.push({ what: 'expire', request: r.id, why: `${title(r)}が期限の ${DUE_DAYS} 日を過ぎた` });
			d = bump(d, SAT.expired, `${title(r)}が期限の ${DUE_DAYS} 日を過ぎた`, ch, r.id);
		}
	let n = 0;
	for (const r of d.requests)
		if (r.status === 'temp' && r.recurDay === day) {
			const g = groupOf(r.group);
			const back: Req = {
				...r,
				id: `${prefix(d.chapter, d.freeRound)}-d${day}-r${n++}`,
				arrived: day,
				due: day + DUE_DAYS - 1,
				ruledOut: [],
				confirmed: false,
				evidence: null,
				doubt: Math.min(2, g.doubt + 1),
				status: 'open',
				doneDay: null,
				how: null,
				recurDay: null,
				notes: []
			};
			d = put(d, { ...r, recurDay: null });
			d = { ...d, requests: [...d.requests, back] };
			ch.push({
				what: 'arrive',
				request: back.id,
				why: `${title(r)}が再び起きた（一時しのぎの付け）`
			});
			d = bump(d, SAT.recur, `${title(r)}が再び起きた`, ch, back.id);
		}
	const fresh = newRequests(d.seed, d.chapter, d.freeRound, day);
	for (const r of fresh)
		ch.push({ what: 'arrive', request: r.id, why: `${CLIENTS[r.group].who}：${title(r)}` });
	d = { ...d, requests: [...d.requests, ...fresh] };
	return { desk: d, changes: ch, boxes };
}

// ---------------- 締め（11 章 3・15.7） ----------------

export function closeDay(
	desk: DeskState,
	day: number
): { desk: DeskState; changes: Change[]; money: number } {
	const ch: Change[] = [];
	const s = desk.clientSat;
	if (s <= SAT.fail) {
		ch.push({
			what: 'status',
			request: '',
			before: 'playing',
			after: 'failed',
			why: `依頼主の満足度が ${s}（${SAT.fail} 以下）になった。この章は失敗`
		});
		return { desk: { ...desk, result: 'failed' }, changes: ch, money: 0 };
	}
	if (day < DAYS_PER_CHAPTER) return { desk, changes: ch, money: 0 };
	if (s < SAT.pass) {
		ch.push({
			what: 'status',
			request: '',
			before: 'playing',
			after: 'failed',
			why: `7 日目の締めで依頼主の満足度 ${s}（合格は ${SAT.pass} 以上）`
		});
		return { desk: { ...desk, result: 'failed' }, changes: ch, money: 0 };
	}
	const grade: Grade = s >= SAT.best ? '優' : s >= SAT.good ? '良' : '合格';
	ch.push({
		what: 'status',
		request: '',
		before: 'playing',
		after: 'passed',
		why: `7 日目の締めで依頼主の満足度 ${s}。評価「${grade}」`
	});
	return {
		desk: { ...desk, result: 'passed', grade },
		changes: ch,
		money: CHAPTER_REWARD[grade]
	};
}

/** 合格した章の次の章（4 章の後は自由の章） */
export function nextDesk(desk: DeskState): DeskState {
	const c = desk.chapter;
	if (c === 'free') return startDesk(desk.seed, 'free', desk.freeRound + 1);
	if (c === 4) return startDesk(desk.seed, 'free', 1);
	return startDesk(desk.seed, (c + 1) as Chapter);
}

// ---------------- 手（4.2） ----------------

export type MoveResult = {
	ok: boolean;
	why: string;
	desk: DeskState;
	changes: Change[];
	/** 使ったコマ */
	slots: number;
	/** 資金の出入り（報酬は +、外に頼む費用は −） */
	money: number;
	moneyWhy: string;
	/** 学んだ手で直して、まだ無い分野の仕組みの建物が建つ */
	builds?: string;
	/** 学んだ手で直して、その分野の仕組みの建物へ依頼主の建物をつなぐ */
	links?: string;
};

const NO_SLOTS = '今日の勤務は残り 0 時間。明日 9:00 から';
const remaining = (r: Req) => r.candidates.filter((c) => !r.ruledOut.includes(c));

/** 手が打てるか。打てないときは理由（1 行） */
function check(
	r: Req | undefined,
	a: DeskAction,
	learned: ReadonlySet<string> | null,
	ctx: DeskCtx
): { why: string; slots: number } {
	if (!r) return { why: '届いていない要望', slots: 0 };
	if (r.status !== 'open') return { why: '片付いた要望', slots: 0 };
	const g = groupOf(r.group);
	let slots = 1;
	let why = '';
	switch (a.type) {
		case 'test': {
			const m = MOVE.get(a.move);
			if (!m) return { why: '無い手', slots: 0 };
			if (learned && !learned.has(m.lesson))
				why = `「${TITLES[m.lesson]}」（${m.lesson}）を学ぶと使える`;
			else if (r.confirmed) why = '原因はもう確定している';
			else if (!m.tests.some((c) => remaining(r).includes(c)))
				why = 'この手で調べられる候補が残っていない';
			break;
		}
		case 'fix': {
			const m = MOVE.get(a.move);
			if (!m) return { why: '無い手', slots: 0 };
			if (ctx.systems.has(fieldOf(m.lesson))) slots = 0;
			if (learned && !learned.has(m.lesson))
				why = `「${TITLES[m.lesson]}」（${m.lesson}）を学ぶと使える`;
			else if (!r.confirmed) why = '原因が確定していない。先に調べる';
			else if (!m.fixes.includes(r.truth)) why = 'この手では、確定した原因を直せない';
			else if (r.doubt > 0) why = `疑いが ${r.doubt} 残っている。示すか頼み込む`;
			break;
		}
		case 'show':
			if (r.doubt === 0) why = '疑いはもう無い';
			else if (!r.evidence) why = '見せる根拠が無い。学んだ手で調べて確定すると示せる';
			break;
		case 'ask':
			if (r.confirmed) why = '原因はもう確定している';
			break;
		case 'plead':
			if (r.doubt === 0) why = '疑いはもう無い';
			break;
		case 'grope':
			slots = 2;
			if (!r.confirmed) why = '原因が確定していない。先に調べるか様子を聞く';
			else if (r.doubt > 0) why = `疑いが ${r.doubt} 残っている。示すか頼み込む`;
			break;
		case 'restart':
			if (r.doubt > 0) why = `店を止めるには了承が要る（疑いが ${r.doubt} 残っている）`;
			break;
		case 'outsource':
			slots = 0;
			if (ctx.money < outCost(g)) why = `資金が足りない（あと ${outCost(g) - ctx.money}）`;
			break;
	}
	if (!why && slots > ctx.slots) why = NO_SLOTS;
	return { why, slots };
}

/** 手を 1 つ打つ。learned が null のときは当て直し（学んだ手の可否を問わない。10 章） */
export function playMove(
	desk: DeskState,
	a: DeskAction,
	learned: ReadonlySet<string> | null,
	ctx: DeskCtx
): MoveResult {
	const r0 = desk.requests.find((x) => x.id === a.request);
	const c = check(r0, a, learned, ctx);
	const base = { desk, changes: [] as Change[], slots: 0, money: 0, moneyWhy: '' };
	if (c.why || !r0) return { ok: false, why: c.why, ...base };
	const g = groupOf(r0.group);
	const ch: Change[] = [];
	let d = desk;
	let r: Req = r0;
	let money = 0;
	let moneyWhy = '';
	let builds: string | undefined;
	let links: string | undefined;
	const note = (text: string) => (r = { ...r, notes: [...r.notes, text] });
	const ruleOut = (cs: string[], why: string) => {
		r = { ...r, ruledOut: [...r.ruledOut, ...cs] };
		ch.push({ what: 'ruledOut', request: r.id, causes: cs, why });
		note(why);
		if (remaining(r).length === 1 && !r.confirmed) {
			r = { ...r, confirmed: true };
			const w = `原因が確定した：${causeLabel(r.truth)}（ほかの候補が全て消えた）`;
			ch.push({ what: 'status', request: r.id, before: 'open', after: 'confirmed', why: w });
			note(w);
		}
	};
	const solve = (how: How, why: string) => {
		const sameDay = r.arrived === ctx.day;
		r = { ...r, status: how === 'temp' ? 'temp' : 'solved', doneDay: ctx.day, how };
		ch.push({ what: 'status', request: r.id, before: 'open', after: r.status, why });
		note(why);
		if (how === 'temp') {
			r = { ...r, recurDay: ctx.day + RECUR_DAYS };
			money = reward(g) / 2;
			moneyWhy = `${title(r)}の報酬の半分（一時しのぎ）`;
			return SAT.temp;
		}
		money = reward(g);
		moneyWhy = `${title(r)}の報酬`;
		return sameDay ? SAT.solved + SAT.sameDay : SAT.solved;
	};
	let satV = 0;
	let satWhy = '';
	switch (a.type) {
		case 'test': {
			const m = MOVE.get(a.move) as MoveRow;
			const can = remaining(r).filter((x) => m.tests.includes(x));
			if (can.includes(r.truth)) {
				const ev = `${m.name}：${causeLabel(r.truth)}、が当たり`;
				r = { ...r, confirmed: true, evidence: ev };
				const w = `「${m.name}」で調べた。${causeLabel(r.truth)}、が当たり`;
				ch.push({ what: 'status', request: r.id, before: 'open', after: 'confirmed', why: w });
				note(w);
			} else
				ruleOut(
					can,
					`候補が ${can.length} つ消えた：「${m.name}」で調べ、${can.map(causeLabel).join('・')}、ではなかった`
				);
			break;
		}
		case 'fix': {
			const m = MOVE.get(a.move) as MoveRow;
			const f = fieldOf(m.lesson);
			const reuse = ctx.systems.has(f);
			if (reuse) links = f;
			else builds = f;
			satV = solve(
				'learned',
				reuse
					? `解決：${SYSTEM_NAMES[f]}がもうあるので、${CLIENTS[r.group].who}の所をつなぐだけで済んだ（0 時間）`
					: `解決：「${m.name}」で直した。${SYSTEM_NAMES[f]}が建つ`
			);
			satWhy = `${CLIENTS[r.group].who}の${title(r)}を直した`;
			break;
		}
		case 'show': {
			const w = `疑い ${r.doubt} → 0：根拠（${r.evidence}）を見せた`;
			ch.push({ what: 'doubt', before: r.doubt, after: 0, why: w, request: r.id });
			r = { ...r, doubt: 0 };
			note(w);
			break;
		}
		case 'ask': {
			const x = remaining(r).find((c2) => c2 !== r.truth) as string;
			ruleOut([x], `候補が 1 つ消えた：様子を聞くと、${causeLabel(x)}、ではなかった`);
			break;
		}
		case 'plead': {
			const w = `疑い ${r.doubt} → ${r.doubt - 1}：頼み込んだ`;
			ch.push({ what: 'doubt', before: r.doubt, after: r.doubt - 1, why: w, request: r.id });
			r = { ...r, doubt: r.doubt - 1 };
			note(w);
			satV = SAT.plead;
			satWhy = `${title(r)}で頼み込んだ`;
			break;
		}
		case 'grope':
			satV = solve('grope', `解決：手探りで直した（2 時間。建物は建たない）`);
			satWhy = `${CLIENTS[r.group].who}の${title(r)}を直した`;
			break;
		case 'restart':
			if (r.truthRestartable) {
				satV = solve(
					'temp',
					`一時解決：再起動でしのいだ。報酬は半分。${RECUR_DAYS} 日後に再び届く`
				);
				satWhy = `${title(r)}がひとまず動いた`;
			} else {
				const cs = remaining(r).filter((x) => CAUSE.get(x)?.restartable);
				if (cs.length)
					ruleOut(
						cs,
						`何も変わらなかった：再起動では直らない。${cs.map(causeLabel).join('・')}、ではない`
					);
				else note('何も変わらなかった：再起動では直らない');
			}
			break;
		case 'outsource': {
			money = -outCost(g);
			moneyWhy = `${title(r)}を外に頼んだ（報酬 ${reward(g)} の 1.5 倍）`;
			r = { ...r, status: 'outsourced', how: 'out' };
			const w = '外に頼んだ。次の朝に片付く（中身の見えない箱が建つ）';
			ch.push({ what: 'status', request: r.id, before: 'open', after: 'outsourced', why: w });
			note(w);
			break;
		}
	}
	d = put(d, r);
	if (satV) {
		const why =
			satV === SAT.solved + SAT.sameDay
				? `${satWhy}。届いた日のうちに（+${SAT.solved}、早さ +${SAT.sameDay}）`
				: satWhy;
		d = bump(d, satV, why, ch, r.id);
	}
	return {
		ok: true,
		why: '',
		desk: d,
		changes: ch,
		slots: c.slots,
		money,
		moneyWhy,
		builds,
		links
	};
}

// ---------------- 打てる手の一覧（10 章 usable） ----------------

export type MoveOption = {
	kind: 'learned' | 'any';
	action: DeskAction;
	label: string;
	slots: number;
	ok: boolean;
	why: string;
	lesson?: string;
	lessonTitle?: string;
};

const ANY: { type: 'ask' | 'plead' | 'grope' | 'restart' | 'outsource'; label: string }[] = [
	{ type: 'ask', label: '様子を聞く' },
	{ type: 'plead', label: '頼み込む' },
	{ type: 'grope', label: '手探りで直す' },
	{ type: 'restart', label: '再起動する' },
	{ type: 'outsource', label: '外に頼む' }
];

/** その要望に効く学んだ手（調べる・直す）と、示す、いつでもの手 5 つ。打てない手には理由 */
export function movesFor(
	desk: DeskState,
	id: string,
	learned: ReadonlySet<string>,
	ctx: DeskCtx
): MoveOption[] {
	const r = desk.requests.find((x) => x.id === id);
	if (!r) return [];
	const out: MoveOption[] = [];
	const opt = (kind: MoveOption['kind'], action: DeskAction, label: string, m?: MoveRow) => {
		const c = check(r, action, learned, ctx);
		out.push({
			kind,
			action,
			label,
			slots: c.slots,
			ok: !c.why,
			why: c.why,
			lesson: m?.lesson,
			lessonTitle: m ? TITLES[m.lesson] : undefined
		});
	};
	for (const m of MOVES) {
		if (!r.confirmed && m.tests.some((c) => r.candidates.includes(c)))
			opt('learned', { type: 'test', move: m.lesson, request: id }, `${m.name}（調べる）`, m);
		if (r.confirmed && m.fixes.includes(r.truth))
			opt('learned', { type: 'fix', move: m.lesson, request: id }, `${m.name}（直す）`, m);
	}
	opt('learned', { type: 'show', request: id }, '示す（根拠を見せる）');
	for (const x of ANY) opt('any', { type: x.type, request: id }, x.label);
	return out;
}

/** その要望に効くレッスン（候補を調べられる・直せる手のレッスン。学んでいない物も含む） */
export function lessonsFor(r: Req): { lesson: string; title: string; move: string }[] {
	return MOVES.filter((m) => [...m.tests, ...m.fixes].some((c) => r.candidates.includes(c))).map(
		(m) => ({ lesson: m.lesson, title: TITLES[m.lesson], move: m.name })
	);
}
