// 行の差分（Myers の方法。git の既定と同じ）。
// 変更の数え方（insertion / deletion）と、git diff の塊を作るのに使う。

export type Edit = { op: 'keep' | 'del' | 'add'; line: string };

export function splitLines(text: string): string[] {
	if (text === '') return [];
	const lines = text.split('\n');
	if (lines.at(-1) === '') lines.pop();
	return lines;
}

export function diffLines(a: string[], b: string[]): Edit[] {
	const n = a.length;
	const m = b.length;
	const max = n + m;
	const v = new Map<number, number>([[1, 0]]);
	const trace: Map<number, number>[] = [];
	outer: for (let d = 0; d <= max; d++) {
		trace.push(new Map(v));
		for (let k = -d; k <= d; k += 2) {
			let x: number;
			if (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)))
				x = v.get(k + 1) ?? 0;
			else x = (v.get(k - 1) ?? 0) + 1;
			let y = x - k;
			while (x < n && y < m && a[x] === b[y]) {
				x++;
				y++;
			}
			v.set(k, x);
			if (x >= n && y >= m) break outer;
		}
	}
	// 辿り戻す
	const edits: Edit[] = [];
	let x = n;
	let y = m;
	for (let d = trace.length - 1; d >= 0; d--) {
		const vv = trace[d];
		const k = x - y;
		let prevK: number;
		if (k === -d || (k !== d && (vv.get(k - 1) ?? -1) < (vv.get(k + 1) ?? -1))) prevK = k + 1;
		else prevK = k - 1;
		const prevX = vv.get(prevK) ?? 0;
		const prevY = prevX - prevK;
		while (x > prevX && y > prevY) {
			edits.push({ op: 'keep', line: a[x - 1] });
			x--;
			y--;
		}
		if (d > 0) {
			if (x === prevX) edits.push({ op: 'add', line: b[y - 1] });
			else edits.push({ op: 'del', line: a[x - 1] });
		}
		x = prevX;
		y = prevY;
	}
	return edits.reverse();
}

export function countChanges(before: string, after: string): { add: number; del: number } {
	let add = 0;
	let del = 0;
	for (const e of diffLines(splitLines(before), splitLines(after))) {
		if (e.op === 'add') add++;
		else if (e.op === 'del') del++;
	}
	// 末尾の改行の有無だけが替わったときも 1 行の変更として数える
	if (before !== '' && after !== '' && before.endsWith('\n') !== after.endsWith('\n')) {
		const a = splitLines(before);
		const b = splitLines(after);
		if (a.at(-1) === b.at(-1)) {
			add++;
			del++;
		}
	}
	return { add, del };
}
