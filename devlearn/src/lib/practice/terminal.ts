// 端末に描く形：改行で行に分け、復帰（CR）は行の頭に戻って上書きする（git rebase の進みの表示）。
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
