// 端末に描く形：改行で行に分け、復帰（CR）は行の頭に戻って上書きする（git rebase の進みの表示）。
// 行の終わりの CR（HTTP の見出しの CRLF）は、後ろに何も無いので上書きしない。
export function terminalLines(text: string): string[] {
	if (text === '') return [];
	const lines = text.split('\n');
	if (lines.at(-1) === '') lines.pop();
	return lines.map((line) => {
		let cur = '';
		for (const part of line.split('\r')) cur = part + cur.slice(part.length);
		return cur;
	});
}

// 字の飾り：curl 8.5 は端末に出すとき、見出しの名前を太字（ESC[1m … ESC[0m）にし、
// Location の値を押せる印（OSC 8：ESC]8;;行き先 ESC\ … ESC]8;; ESC\）で包む。
// 画面の端末は、この印を字として出さず、太字と行き先として読む。
export type Span = { text: string; bold: boolean; link?: string };

const ESC = String.fromCharCode(27);
// 太字の入り・切り（SGR）と、押せる印の入り・切り（OSC 8）
const MARK = new RegExp(`${ESC}\\[([0-9;]*)m|${ESC}\\]8;[^;${ESC}]*;([^${ESC}]*)${ESC}\\\\`, 'g');

export function terminalSpans(line: string): Span[] {
	const spans: Span[] = [];
	let bold = false;
	let link = '';
	let at = 0;
	const push = (text: string) => {
		if (text === '') return;
		const prev = spans.at(-1);
		if (prev && prev.bold === bold && (prev.link ?? '') === link) {
			prev.text += text;
			return;
		}
		spans.push(link ? { text, bold, link } : { text, bold });
	};
	for (const m of line.matchAll(MARK)) {
		push(line.slice(at, m.index));
		at = m.index + m[0].length;
		if (m[1] !== undefined) {
			const codes = m[1] === '' ? ['0'] : m[1].split(';');
			for (const c of codes) {
				if (c === '0' || c === '22') bold = false;
				else if (c === '1') bold = true;
			}
		} else link = m[2] ?? '';
	}
	push(line.slice(at));
	return spans;
}

// 飾りの印だけを外した字（改行・CR はそのまま）。合格の判定で、最後の出力を見える字で比べる
export function plainText(text: string): string {
	return text.replace(MARK, '');
}

// 飾りを外した、見える字だけの行
export function plainLine(line: string): string {
	return terminalSpans(line)
		.map((s) => s.text)
		.join('');
}

// 画面の端末に見える行（CR を解き、飾りを外した字）。例（Example.lines）はこの形で書き、道具の出力と比べる
export function screenLines(text: string): string[] {
	return terminalLines(text).map(plainLine);
}
