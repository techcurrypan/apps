// 検査 16〜25（docs/explanation-standard.md 第 3 章。D-21 で足した物）。
// 16 と 20 は、中身を書き終えた分野（INSIDE_FIELDS）だけに当てる。17〜19・21〜25 は inside を持つレッスン全てに当てる。
import { verifyGitId, verifyPacket, sizeBytes, hexBytes } from './bytes.ts';
import { calcMatches } from './calc.ts';
import { formatOf } from './logformat.ts';
import type { Lesson, Step } from './types.ts';

export type InsideOptions = {
	/** inside を書き終えた分野（検査 16・20 を当てる） */
	insideFields?: ReadonlySet<string>;
	/** コマンドの参考の表（コマンド → 公式の説明の URL） */
	refs?: Readonly<Record<string, string>>;
	/** 実戦の解き方で実際に使うコマンド（レッスン ID → コマンド）。検査 20 で、commands に漏れが無いかを見る */
	used?: ReadonlyMap<string, readonly string[]>;
};

type Add = (check: number, where: string, message: string) => void;

const blank = (s: unknown) => typeof s !== 'string' || s.trim() === '';
const len = (s: string) => [...s].length;
const where = (s: Step, i: number) => `ステップ ${Number.isInteger(s.n) ? s.n : i + 1}`;
const IP = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;

/** 分野ごとに要る回数（2.1 の表） */
export type Need = { packetOnMoves: 'all' | 'one' | 'none'; hosts: number; logs: number };
export const NEED: Record<string, Need> = {
	net: { packetOnMoves: 'all', hosts: 2, logs: 3 },
	sec: { packetOnMoves: 'all', hosts: 2, logs: 3 },
	lnx: { packetOnMoves: 'one', hosts: 2, logs: 3 },
	ctr: { packetOnMoves: 'one', hosts: 2, logs: 3 },
	cld: { packetOnMoves: 'one', hosts: 2, logs: 3 },
	ci: { packetOnMoves: 'one', hosts: 2, logs: 3 },
	db: { packetOnMoves: 'none', hosts: 1, logs: 2 },
	git: { packetOnMoves: 'none', hosts: 1, logs: 2 },
	prg: { packetOnMoves: 'none', hosts: 0, logs: 0 },
	ai: { packetOnMoves: 'none', hosts: 0, logs: 0 },
	sta: { packetOnMoves: 'none', hosts: 0, logs: 0 }
};

/** 経過の時刻を秒に。"0.012s" "12ms" "3µs" "2min" は経過、"09:00:01.250" は時計。読めなければ null */
export function seconds(t: string): { kind: 'elapsed' | 'clock'; s: number } | null {
	const x = t.trim();
	let m = /^\+?([\d.]+)\s*(s|ms|µs|us|min|分|秒)$/.exec(x);
	if (m) {
		const k = { s: 1, ms: 1e-3, µs: 1e-6, us: 1e-6, min: 60, 分: 60, 秒: 1 }[m[2]] ?? 1;
		return { kind: 'elapsed', s: Number(m[1]) * k };
	}
	m = /^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/.exec(x);
	if (m) return { kind: 'clock', s: Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0) };
	return null;
}

function mapCheck(lesson: Lesson, add: Add): void {
	const map = lesson.map;
	if (!map) return;
	const appeared = new Map<string, { label: string; sub?: string }>();
	const pairs = new Map<string, Set<string>>(); // "a|b"（並べた組）→ 向き
	for (const s of lesson.explain)
		for (const op of s.scene) {
			if (op.op === 'appear') appeared.set(op.id, { label: op.label, sub: op.sub });
			if (op.op === 'move' && op.from !== op.to) {
				const [a, b] = [op.from, op.to].sort();
				const k = `${a}|${b}`;
				const set = pairs.get(k) ?? new Set<string>();
				set.add(op.from === a ? 'ab' : 'ba');
				pairs.set(k, set);
			}
		}
	for (const [id, ap] of appeared) {
		const n = map.nodes[id];
		if (!n) {
			add(16, 'map', `「${id}」の絵と町の呼び名（map.nodes）が無い`);
			continue;
		}
		if (blank(n.town)) add(16, 'map', `「${id}」の町の呼び名が空`);
		const a = n.addr?.match(IP)?.[0];
		const b = (ap.sub ?? '').match(IP)?.[0] ?? ap.label.match(IP)?.[0];
		if (a && b && a !== b) add(24, 'map', `「${id}」の番地が map は ${a}、図は ${b} で食い違う`);
	}
	for (const id of Object.keys(map.nodes))
		if (!appeared.has(id)) add(16, 'map', `map.nodes の「${id}」は appear していない`);
	for (const z of map.zones ?? [])
		for (const m of z.members)
			if (!appeared.has(m)) add(16, 'map', `区画「${z.label}」の「${m}」は appear していない`);
	const links = new Map<string, { dir: string; label: string }>();
	for (const l of map.links) {
		if (!appeared.has(l.a) || !appeared.has(l.b))
			add(16, 'map', `線 ${l.a}—${l.b} の端が appear していない`);
		if (blank(l.label)) add(16, 'map', `線 ${l.a}—${l.b} に名前が無い`);
		const [a, b] = [l.a, l.b].sort();
		const dir = l.dir === 'both' ? 'both' : (l.dir === 'ab') === (l.a === a) ? 'ab' : 'ba';
		if (links.has(`${a}|${b}`)) add(16, 'map', `線 ${a}—${b} が 2 本ある`);
		links.set(`${a}|${b}`, { dir, label: l.label });
	}
	for (const [k, dirs] of pairs) {
		const l = links.get(k);
		if (!l) {
			add(16, 'map', `動きのある組 ${k.replace('|', '—')} に線（map.links）が無い`);
			continue;
		}
		const need = dirs.size === 2 ? 'both' : [...dirs][0];
		if (l.dir !== 'both' && l.dir !== need)
			add(16, 'map', `線 ${k.replace('|', '—')} の向きが、動きの向きと合わない`);
	}
}

function countCheck(lesson: Lesson, add: Add): void {
	const need = NEED[lesson.field];
	if (!need) return;
	if (!lesson.map) add(16, 'map', 'map（図の絵・町の呼び名・線の名前）が無い');
	const moveSteps = lesson.explain.filter((s) =>
		s.scene.some((o) => o.op === 'move' && o.from !== o.to)
	);
	const withPacket = moveSteps.filter((s) => s.inside?.packet);
	if (need.packetOnMoves === 'all')
		lesson.explain.forEach((s, i) => {
			if (moveSteps.includes(s) && !s.inside?.packet)
				add(16, where(s, i), '動きのあるステップに inside.packet が無い');
		});
	if (need.packetOnMoves === 'one' && moveSteps.length > 0 && withPacket.length === 0)
		add(16, 'inside', '物が流れるステップに inside.packet が 1 つも無い');
	const hosts = lesson.explain.filter((s) => (s.inside?.hosts?.length ?? 0) > 0).length;
	if (hosts < need.hosts)
		add(16, 'inside', `inside.hosts が ${hosts} 回。${need.hosts} 回以上にする`);
	const logs = lesson.explain.filter((s) => (s.inside?.logs?.length ?? 0) > 0).length;
	if (logs < need.logs) add(16, 'inside', `inside.logs が ${logs} 回。${need.logs} 回以上にする`);
	if (lesson.explain.some((s) => blank(s.town)))
		add(16, 'town', '「町では」（town）の無いステップがある');
}

function stepTextCheck(lesson: Lesson, add: Add): void {
	lesson.explain.forEach((s, i) => {
		const w = where(s, i);
		if (s.town !== undefined && (blank(s.town) || len(s.town) > 60))
			add(16, w, 'town は 1〜60 字にする');
		if (s.work !== undefined && (blank(s.work) || len(s.work) > 60))
			add(16, w, 'work は 1〜60 字にする');
		if (s.ask) {
			const a = s.ask;
			if (blank(a.q) || blank(a.why)) add(16, w, '予想の問いの q と why を埋める');
			if (a.opts.length < 2 || a.opts.length > 4) add(16, w, '予想の問いの選択肢は 2〜4 個');
			if (!Number.isInteger(a.a) || a.a < 0 || a.a >= a.opts.length)
				add(16, w, '予想の問いの答えの番号が選択肢の外');
		}
	});
}

export function checkInside(lesson: Lesson, add: Add, opt: InsideOptions = {}): void {
	const steps = lesson.explain;
	const gated = opt.insideFields?.has(lesson.field) ?? false;
	mapCheck(lesson, add);
	stepTextCheck(lesson, add);
	if (gated) countCheck(lesson, add);

	// 20
	if (gated && lesson.practice?.tool) {
		const cmds = lesson.practice.commands ?? [];
		if (cmds.length === 0) add(20, 'practice.commands', '実戦で使うコマンドが書かれていない');
		for (const c of cmds)
			if (!opt.refs?.[c])
				add(20, 'practice.commands', `「${c}」の公式の説明のリンクが参考の表に無い`);
		for (const c of opt.used?.get(lesson.id) ?? [])
			if (!cmds.includes(c)) add(20, 'practice.commands', `解き方で使う「${c}」が commands に無い`);
	}

	const hasInside = steps.some((s) => s.inside);
	if (!hasInside) return;

	const hostOf = new Map<string, string>();
	let lastLog: ReturnType<typeof seconds> = null;
	let lastStep: ReturnType<typeof seconds> = null;
	let calcFacts = 0;
	steps.forEach((s, i) => {
		const w = where(s, i);
		const ins = s.inside;
		// 24（時刻は進むだけ。ステップの記録）
		const st = seconds(s.log.t);
		if (st && lastStep && st.kind === lastStep.kind && st.s < lastStep.s)
			add(24, w, `記録の時刻 ${s.log.t} が前のステップより前`);
		if (st) lastStep = st;
		// 25
		for (const f of Array.isArray(s.facts) ? s.facts : []) {
			if (f.calc === undefined) continue;
			calcFacts++;
			try {
				const r = calcMatches(f.v, f.calc);
				if (!r.ok) add(25, w, `「${f.k}」は ${f.v} だが、式 ${f.calc} は ${r.got}`);
			} catch (e) {
				add(25, w, `「${f.k}」の式が読めない：${(e as Error).message}`);
			}
		}
		if (!ins) return;
		// 17
		const seen = new Set<string>();
		for (const h of ins.hosts ?? []) {
			for (const r of h.rows) {
				if (seen.has(r.id)) add(17, w, `hosts の id「${r.id}」が同じステップに 2 回ある`);
				seen.add(r.id);
				const was = hostOf.get(r.id);
				if (was !== undefined && was !== h.name)
					add(
						17,
						w,
						`id「${r.id}」が「${was}」から「${h.name}」へ移っている。別の物なら id を変える`
					);
				hostOf.set(r.id, h.name);
			}
			// 24（機械の番地は図と同じ）
			for (const [id, n] of Object.entries(lesson.map?.nodes ?? {})) {
				const ap = steps.flatMap((x) => x.scene).find((o) => o.op === 'appear' && o.id === id);
				if (ap?.op === 'appear' && ap.label === h.name && n.addr && n.addr !== h.addr)
					add(24, w, `「${h.name}」の番地が中身の板は ${h.addr}、図は ${n.addr}`);
			}
		}
		// 18・21・22
		const p = ins.packet;
		if (p) {
			const b = p.hex === undefined ? null : hexBytes(p.hex);
			const ats = p.parts.flatMap((x) => x.fields).filter((x) => x.at);
			if (p.hex !== undefined && ats.length === 0)
				add(18, w, 'hex があるのに、欄に at が 1 つも無い');
			if (p.hex === undefined && ats.length > 0) add(18, w, 'hex が無いのに at がある');
			if (b)
				for (const x of ats) {
					const [a, n] = x.at ?? [0, 0];
					if (a < 0 || n < 1 || a + n > b.length)
						add(18, w, `「${x.k}」の at [${a}, ${n}] が hex の長さ ${b.length} を超える`);
				}
			for (const m of verifyPacket(p)) add(21, w, m);
			for (const m of verifyGitId(p)) add(22, w, m);
			// 24（大きさは記録と同じ）
			const a = sizeBytes(p.size);
			const c = s.log.size === undefined ? null : sizeBytes(s.log.size);
			if (a !== null && c !== null && a !== c)
				add(24, w, `荷物は ${p.size} だが、記録の大きさは ${s.log.size}`);
		}
		// 19・23・24（ログ）
		const logs = ins.logs;
		if (logs) {
			if (logs.length < 1 || logs.length > 4)
				add(19, w, `logs が ${logs.length} 行。1〜4 行にする`);
			for (const l of logs) {
				if (blank(l.t) || blank(l.src) || blank(l.text))
					add(19, w, 'logs の t / src / text を埋める');
				if (len(l.text) > 120) add(19, w, `logs の 1 行が ${len(l.text)} 字。120 字以内にする`);
				const fmt = formatOf(l.src);
				if (!fmt) add(23, w, `ログの書き手「${l.src}」の書式が表に無い`);
				else if (!fmt.line.test(l.text))
					add(23, w, `「${l.src}」の行が本物の書式（${fmt.from}）に当たらない：${l.text}`);
				const t = seconds(l.t);
				if (t && lastLog && t.kind === lastLog.kind && t.s < lastLog.s)
					add(24, w, `ログの時刻 ${l.t} が前の行より前`);
				if (t) lastLog = t;
			}
		}
	});
	if (lesson.practice?.form === 'calc' && calcFacts === 0)
		add(25, 'facts', '計算の題材なのに、式（calc）を持つ facts が無い');
}
