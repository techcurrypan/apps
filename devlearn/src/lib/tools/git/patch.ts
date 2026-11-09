// git diff の見せ方：統合形式の塊（前後 3 行）と、変更の統計（a.txt | 2 +-）。
import { countChanges, diffLines, splitLines, type Edit } from './diff.ts';
import { abbrev } from './repo.ts';
import type { IndexEntry } from './repo.ts';

const NO_EOL = '\\ No newline at end of file';

function range(start: number, count: number): string {
	if (count === 0) return `${start},0`;
	return count === 1 ? `${start}` : `${start},${count}`;
}

// 塊を作る（git と同じく前後 3 行。間が 6 行以下なら 1 つの塊にまとめる）
export function hunks(before: string, after: string, ctx = 3): string {
	const a = splitLines(before);
	const b = splitLines(after);
	const edits: (Edit & { ai: number; bi: number })[] = [];
	let ai = 0;
	let bi = 0;
	for (const e of diffLines(a, b)) {
		edits.push({ ...e, ai, bi });
		if (e.op !== 'add') ai++;
		if (e.op !== 'del') bi++;
	}
	const changed = edits.map((e, i) => (e.op === 'keep' ? -1 : i)).filter((i) => i >= 0);
	if (changed.length === 0) return '';
	// 塊ごとの範囲（edits の添字）
	const groups: [number, number][] = [];
	for (const i of changed) {
		const lo = Math.max(0, i - ctx);
		const hi = Math.min(edits.length - 1, i + ctx);
		const last = groups.at(-1);
		if (last && lo <= last[1] + 1) last[1] = Math.max(last[1], hi);
		else groups.push([lo, hi]);
	}
	const aNoEol = before !== '' && !before.endsWith('\n');
	const bNoEol = after !== '' && !after.endsWith('\n');
	let out = '';
	for (const [lo, hi] of groups) {
		const part = edits.slice(lo, hi + 1);
		const aCount = part.filter((e) => e.op !== 'add').length;
		const bCount = part.filter((e) => e.op !== 'del').length;
		const aStart = aCount === 0 ? part[0].ai : part[0].ai + 1;
		const bStart = bCount === 0 ? part[0].bi : part[0].bi + 1;
		out += `@@ -${range(aStart, aCount)} +${range(bStart, bCount)} @@\n`;
		for (const e of part) {
			const mark = e.op === 'keep' ? ' ' : e.op === 'del' ? '-' : '+';
			out += `${mark}${e.line}\n`;
			const lastA = e.op !== 'add' && e.ai === a.length - 1 && aNoEol;
			const lastB = e.op !== 'del' && e.bi === b.length - 1 && bNoEol;
			if (
				(e.op === 'del' && lastA) ||
				(e.op === 'add' && lastB) ||
				(e.op === 'keep' && (lastA || lastB))
			)
				out += `${NO_EOL}\n`;
		}
	}
	return out;
}

export type Side = { entry: IndexEntry; data: string } | null;

// 1 つのファイルの差分（diff --git から）
export function filePatch(path: string, a: Side, b: Side): string {
	let out = `diff --git a/${path} b/${path}\n`;
	if (!a && b) {
		out += `new file mode ${b.entry.mode}\nindex 0000000..${abbrev(b.entry.id)}\n`;
		if (b.data === '') return out;
		out += `--- /dev/null\n+++ b/${path}\n`;
	} else if (a && !b) {
		out += `deleted file mode ${a.entry.mode}\nindex ${abbrev(a.entry.id)}..0000000\n`;
		if (a.data === '') return out;
		out += `--- a/${path}\n+++ /dev/null\n`;
	} else if (a && b) {
		if (a.entry.mode !== b.entry.mode) {
			out += `old mode ${a.entry.mode}\nnew mode ${b.entry.mode}\n`;
			if (a.entry.id === b.entry.id) return out;
			out += `index ${abbrev(a.entry.id)}..${abbrev(b.entry.id)}\n`;
		} else out += `index ${abbrev(a.entry.id)}..${abbrev(b.entry.id)} ${a.entry.mode}\n`;
		out += `--- a/${path}\n+++ b/${path}\n`;
	}
	return out + hunks(a?.data ?? '', b?.data ?? '');
}

export type FileChange = { path: string; a: Side; b: Side };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function summaryLine(files: number, add: number, del: number): string {
	let line = ` ${plural(files, 'file changed', 'files changed')}`;
	if (add > 0 || del === 0) line += `, ${plural(add, 'insertion(+)', 'insertions(+)')}`;
	if (del > 0 || add === 0) line += `, ${plural(del, 'deletion(-)', 'deletions(-)')}`;
	return line + '\n';
}

// --stat の形（端末の幅 80）
export function diffStat(changes: FileChange[], width = 80): string {
	if (changes.length === 0) return '';
	const rows = changes.map((c) => ({
		path: c.path,
		...countChanges(c.a?.data ?? '', c.b?.data ?? '')
	}));
	const nameW = Math.max(...rows.map((r) => r.path.length));
	const maxChange = Math.max(...rows.map((r) => r.add + r.del));
	const numW = String(maxChange).length;
	const room = Math.max(6, width - (1 + nameW + 3 + numW + 1));
	const scale = (n: number) => (maxChange > room ? Math.ceil((n * room) / maxChange) : n);
	let out = '';
	let add = 0;
	let del = 0;
	for (const r of rows) {
		add += r.add;
		del += r.del;
		const bar = '+'.repeat(scale(r.add)) + '-'.repeat(scale(r.del));
		out += ` ${r.path.padEnd(nameW)} | ${String(r.add + r.del).padStart(numW)}${bar ? ` ${bar}` : ''}\n`;
	}
	return out + summaryLine(rows.length, add, del);
}
