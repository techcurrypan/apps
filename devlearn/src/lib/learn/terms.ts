// 言葉の仕組み（explanation-standard.md 第 10 章・learn-standard.md 18.2・18.3）。
// 言葉は分野ごとに 1 か所で持ち、レッスンは ID で引く。本文に当てる時は長い書き方から、段落ごとに最初の 1 回だけ。
// 下線は本文を描く時に付ける（DOM を後から書き換えない。learn-standard.md 第 20 章）

export interface Term {
	id: string;
	/** 見出し */
	t: string;
	/** 本文で当てる書き方（長い物から当てる） */
	m: string[];
	/** 説明 1〜2 文・80 字以内（検査 43） */
	d: string;
	long?: string;
	analogy?: string;
	field: string;
	/** 一番やさしいレッスン（用語集から飛ぶ先） */
	first: string;
	related?: string[];
	refs?: string[];
}

export type Marked = { text: string; term: string | null };

/** 書き方 → 言葉。長い書き方が先（同じ長さは書き方の順） */
export function termIndex(terms: readonly Term[]): [string, Term][] {
	const out: [string, Term][] = [];
	for (const t of terms) for (const m of t.m) if (m) out.push([m, t]);
	return out.sort((a, b) => b[0].length - a[0].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

const WORD = /[A-Za-z0-9_]/;
/** 英字の書き方は、前後が英数字の時は当てない（sendmsg の send） */
function fits(text: string, i: number, m: string): boolean {
	if (!text.startsWith(m, i)) return false;
	if (WORD.test(m[0]) && i > 0 && WORD.test(text[i - 1])) return false;
	const j = i + m.length;
	if (WORD.test(m[m.length - 1]) && j < text.length && WORD.test(text[j])) return false;
	return true;
}

/** 段落を、言葉とそれ以外の切れ端に分ける。同じ言葉は段落で最初の 1 回だけ印を付ける */
export function markTerms(text: string, terms: readonly Term[]): Marked[] {
	const ix = termIndex(terms);
	const out: Marked[] = [];
	const seen = new Set<string>();
	let buf = '';
	let i = 0;
	while (i < text.length) {
		const hit = ix.find(([m, t]) => !seen.has(t.id) && fits(text, i, m));
		if (hit) {
			if (buf) out.push({ text: buf, term: null });
			buf = '';
			out.push({ text: hit[0], term: hit[1].id });
			seen.add(hit[1].id);
			i += hit[0].length;
		} else {
			buf += text[i];
			i++;
		}
	}
	if (buf) out.push({ text: buf, term: null });
	return out;
}

/** ステップごとの文（本文・図の物の名前など）から、そのステップで初めて出る言葉（18.2・検査 42） */
export function firstPerStep(
	steps: readonly (readonly string[])[],
	terms: readonly Term[]
): string[][] {
	const seen = new Set<string>();
	return steps.map((texts) => {
		const here: string[] = [];
		for (const tx of texts)
			for (const p of markTerms(tx, terms))
				if (p.term && !seen.has(p.term)) {
					seen.add(p.term);
					here.push(p.term);
				}
		return here;
	});
}
