// 用語の札（learn-standard.md LS-L3）。本文を、用語とそれ以外の切れ端に分ける。長い用語を先に当てる。
export type Piece = { text: string; term: string | null };

export function segment(text: string, words: readonly string[]): Piece[] {
	const ws = [...new Set(words)].filter((w) => w.length > 0).sort((a, b) => b.length - a.length);
	const out: Piece[] = [];
	const seen = new Set<string>();
	let i = 0;
	let buf = '';
	while (i < text.length) {
		const w = ws.find((x) => !seen.has(x) && text.startsWith(x, i));
		if (w) {
			if (buf) out.push({ text: buf, term: null });
			buf = '';
			out.push({ text: w, term: w });
			seen.add(w); // 1 つの段落で同じ用語は最初の 1 回だけ札にする
			i += w.length;
		} else {
			buf += text[i];
			i++;
		}
	}
	if (buf) out.push({ text: buf, term: null });
	return out;
}

/** 用語が出るレッスン（本文・題に用語を含む物） */
export function lessonsWith(
	word: string,
	lessons: readonly { id: string; title: string; text: string }[]
): { id: string; title: string }[] {
	return lessons.filter((l) => l.text.includes(word)).map(({ id, title }) => ({ id, title }));
}
