// 打つコマンドが無い題材の実戦の形 5 つ（explanation-standard.md 第 6 章・curriculum.md 3.2）。
// 判定は決まった値との比べだけで、乱数を使わない。答えを入れると、結果を 1 行ずつ流す行（rows）を返す。
// 間違いは、答えから作った印（下の signals）に mistakes の match が含まれるかで選ぶ：
//   calc  段の番号=入れた値（誤った段だけ）       例 3=192.168.10.37
//   order 先に置いた札<後に置いた札（誤った組だけ）  例 ack<sa
//   sort  項目:入れた区分（誤った物だけ）           例 pw:authz
//   pick  pick:選んだ選択肢                        例 pick:a
//   fix   行:替えた候補（替えた行）と case:例:結果（期待と違った物）
import type { Mistake, Practice } from '../lesson/types.ts';

export type Card = { id: string; text: string };
export type CalcSetup = {
	data: { k: string; v: string }[];
	steps: { label: string; unit?: string }[];
};
export type CalcSuccess = { values: string[]; digits?: number };
export type OrderSetup = { cards: Card[] };
export type OrderSuccess = { orders: string[][] };
export type SortSetup = { items: Card[]; bins: { id: string; label: string }[] };
export type SortSuccess = { bins: Record<string, string> };
export type PickSetup = { situation: string[]; choices: (Card & { result: string })[] };
export type PickSuccess = { choice: string };
export type Packet = { proto: string; port: number; from: string };
export type FixSetup = {
	engine: 'firewall';
	lines: Card[];
	options: (Card & { line: string })[];
	cases: { id: string; name: string; packet: Packet }[];
};
export type FixSuccess = { expect: Record<string, string> };

export type FormAnswer =
	| { kind: 'calc'; values: string[] }
	| { kind: 'order'; order: string[] }
	| { kind: 'sort'; bins: Record<string, string> }
	| { kind: 'pick'; choice: string }
	| { kind: 'fix'; lines: Record<string, string> };

/** 流す 1 行。before / after は fix の直す前と後の結果 */
export type FlowRow = { key: string; text: string; ok: boolean; before?: string; after?: string };
export type FormJudge = {
	passed: boolean;
	rows: FlowRow[];
	signals: string[];
	mistake: Mistake | null;
};

const pickMistake = (ms: Mistake[], signals: string[]) =>
	ms.find((m) => m.match && signals.some((s) => s === m.match)) ?? null;

const NUM = /^-?\d+(\.\d+)?$/;
/** 入れた値と正しい値を比べる。両方が数なら、丸めの桁で比べる（桁の指定が無ければ一致） */
export function sameValue(got: string, want: string, digits?: number): boolean {
	const g = got.trim().replace(/,/g, '');
	const w = want.trim().replace(/,/g, '');
	if (NUM.test(g) && NUM.test(w)) {
		if (digits === undefined) return Number(g) === Number(w);
		const f = 10 ** digits;
		return Math.round(Number(g) * f) === Math.round(Number(w) * f);
	}
	return g === w;
}

// ---- fix の規則（上から当て、最初に当たった物で決まる。何にも当たらなければ止める） ----
const ip4 = (s: string) => s.split('.').reduce((a, x) => a * 256 + Number(x), 0);
function inCidr(addr: string, cidr: string) {
	if (cidr === 'any') return true;
	const [net, bits = '32'] = cidr.split('/');
	const b = Number(bits);
	const size = 2 ** (32 - b);
	return Math.floor(ip4(addr) / size) === Math.floor(ip4(net) / size);
}
/** 規則の 1 行：allow|deny 運び方 ポート|any from 送り元|any */
export function firewall(rules: string[], p: Packet): { result: 'allow' | 'deny'; line: number } {
	for (let i = 0; i < rules.length; i++) {
		const [act, proto, port, , from] = rules[i].trim().split(/\s+/);
		if (proto !== 'any' && proto !== p.proto) continue;
		if (port !== 'any' && Number(port) !== p.port) continue;
		if (!inCidr(p.from, from)) continue;
		return { result: act === 'allow' ? 'allow' : 'deny', line: i + 1 };
	}
	return { result: 'deny', line: 0 };
}

const rec = (x: unknown) =>
	typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};

export function judgeForm(p: Practice, a: FormAnswer): FormJudge {
	const setup = rec(p.setup);
	const success = rec(p.success);
	let rows: FlowRow[] = [];
	const signals: string[] = [];
	switch (a.kind) {
		case 'calc': {
			const s = setup as unknown as CalcSetup;
			const w = success as unknown as CalcSuccess;
			rows = s.steps.map((st, i) => {
				const got = a.values[i] ?? '';
				const ok = sameValue(got, w.values[i] ?? '', w.digits);
				if (!ok) signals.push(`${i + 1}=${got.trim()}`);
				return { key: `s${i}`, text: `${st.label}：${got.trim() || '（空）'}${st.unit ?? ''}`, ok };
			});
			break;
		}
		case 'order': {
			const s = setup as unknown as OrderSetup;
			const w = success as unknown as OrderSuccess;
			const best =
				w.orders.find((o) => o.join() === a.order.join()) ??
				// 一番長く頭が合う正しい順で、どこから誤ったかを見る
				[...w.orders].sort(
					(x, y) =>
						y.findIndex((v, i) => v !== a.order[i]) - x.findIndex((v, i) => v !== a.order[i])
				)[0];
			let broken = false;
			rows = a.order.map((id, i) => {
				if (best[i] !== id) broken = true;
				return { key: id, text: s.cards.find((c) => c.id === id)?.text ?? id, ok: !broken };
			});
			for (let i = 0; i < a.order.length; i++)
				for (let j = i + 1; j < a.order.length; j++)
					if (best.indexOf(a.order[i]) > best.indexOf(a.order[j]))
						signals.push(`${a.order[i]}<${a.order[j]}`);
			break;
		}
		case 'sort': {
			const s = setup as unknown as SortSetup;
			const w = success as unknown as SortSuccess;
			rows = s.items.map((it) => {
				const bin = a.bins[it.id] ?? '';
				const ok = bin === w.bins[it.id];
				if (!ok && bin) signals.push(`${it.id}:${bin}`);
				const label = s.bins.find((b) => b.id === bin)?.label ?? '（まだ入れていない）';
				return { key: it.id, text: `${it.text} → ${label}`, ok };
			});
			break;
		}
		case 'pick': {
			const s = setup as unknown as PickSetup;
			const w = success as unknown as PickSuccess;
			const c = s.choices.find((x) => x.id === a.choice);
			const ok = a.choice === w.choice;
			if (!ok) signals.push(`pick:${a.choice}`);
			rows = [
				{
					key: a.choice,
					text: c ? `${c.text} → ${c.result}` : '（まだ選んでいない）',
					ok: ok && !!c
				}
			];
			break;
		}
		case 'fix': {
			const s = setup as unknown as FixSetup;
			const w = success as unknown as FixSuccess;
			const before = s.lines.map((l) => l.text);
			const after = s.lines.map((l) => {
				const o = s.options.find((x) => x.line === l.id && x.id === a.lines[l.id]);
				if (o) signals.push(`${l.id}:${o.id}`);
				return o ? o.text : l.text;
			});
			rows = s.cases.map((c) => {
				const b = firewall(before, c.packet).result;
				const r = firewall(after, c.packet).result;
				const ok = r === w.expect[c.id];
				if (!ok) signals.push(`case:${c.id}:${r}`);
				return { key: c.id, text: c.name, ok, before: b, after: r };
			});
			break;
		}
	}
	const passed = rows.length > 0 && rows.every((r) => r.ok);
	return { passed, rows, signals, mistake: passed ? null : pickMistake(p.mistakes, signals) };
}

/** 初めの答え（何もしていない状態）。order は崩した札の並び、fix は何も替えない */
export function blankAnswer(p: Practice): FormAnswer {
	const s = rec(p.setup);
	switch (p.form) {
		case 'calc':
			return { kind: 'calc', values: (s as unknown as CalcSetup).steps.map(() => '') };
		case 'order':
			return { kind: 'order', order: (s as unknown as OrderSetup).cards.map((c) => c.id) };
		case 'sort':
			return { kind: 'sort', bins: {} };
		case 'pick':
			return { kind: 'pick', choice: '' };
		case 'fix':
			return { kind: 'fix', lines: {} };
	}
	throw new Error(`形 ${p.form ?? '無し'} は無い`);
}

export const formNames: Record<string, string> = {
	calc: '計算する',
	order: '並べる',
	sort: '振り分ける',
	pick: '選ぶ',
	fix: '直す'
};
