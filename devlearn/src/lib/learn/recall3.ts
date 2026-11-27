// 思い出す（learn-standard.md 第 19 章・mastery-standard.md EV-1）の模型：選ぶ・並べる・図を押す・数・説明（短い文）。
// 答えると当たり外れと理由を返す。最後に点と手帳の 1 枚。乱数を使わない（並べる問いの崩した並びはデータに書く）
export type Recall3 =
	| { k: 'pick'; q: string; opts: string[]; ans: number; why: string }
	| { k: 'order'; q: string; items: string[]; start: string[]; why: string }
	| { k: 'hit'; q: string; hits: string[]; ans: string; why: string }
	| { k: 'num'; q: string; ans: number; unit: string; why: string }
	/** 説明：keys は「どれか 1 つが入っていればよい言葉の組」の並び。model は手本の答え */
	| { k: 'text'; q: string; keys: string[][]; model: string; why: string };
export type RecallSet = { qs: Recall3[]; note: string[] };
export type RecallAnswer = number | string | string[];
export type RecallResult = { ok: boolean; why: string; missing?: string[] };

/** 全角の数字・桁の区切りを読んで、最初の数を返す。無ければ null */
function readNum(s: string): number | null {
	const t = s.replace(/[０-９．，]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
	const m = /\d[\d,]*(?:\.\d+)?/.exec(t);
	return m ? Number(m[0].replace(/,/g, '')) : null;
}

export function checkRecall(q: Recall3, a: RecallAnswer): RecallResult {
	switch (q.k) {
		case 'pick':
			return { ok: a === q.ans, why: q.why };
		case 'hit':
			return { ok: a === q.ans, why: q.why };
		case 'order':
			return {
				ok: Array.isArray(a) && a.length === q.items.length && a.every((x, i) => x === q.items[i]),
				why: q.why
			};
		case 'num':
			return { ok: typeof a === 'string' && readNum(a) === q.ans, why: q.why };
		case 'text': {
			const s = typeof a === 'string' ? a : '';
			const missing = q.keys.filter((g) => !g.some((w) => s.includes(w))).map((g) => g[0]);
			return { ok: s.trim() !== '' && missing.length === 0, why: q.why, missing };
		}
	}
}

/** 並べる問い：i 番目を d（-1 上・+1 下）へ動かした新しい並び。端では動かない */
export function moveItem(xs: string[], i: number, d: -1 | 1): string[] {
	const j = i + d;
	if (j < 0 || j >= xs.length) return [...xs];
	const r = [...xs];
	[r[i], r[j]] = [r[j], r[i]];
	return r;
}

export function recallScore(oks: (boolean | undefined)[]): { right: number; total: number } {
	return { right: oks.filter((x) => x === true).length, total: oks.length };
}
