// git の物（blob・tree・commit）。本物と同じ形に並べ、SHA-1 で ID を作る。
import { concat, hexToBytes, sha1Hex, utf8 } from '../sha1.ts';

export type Sig = { name: string; email: string; time: number; tz: string };
export type TreeEntry = { mode: '100644' | '100755' | '40000'; name: string; id: string };
export type Blob = { type: 'blob'; data: string };
export type Tree = { type: 'tree'; entries: TreeEntry[] };
export type Commit = {
	type: 'commit';
	tree: string;
	parents: string[];
	author: Sig;
	committer: Sig;
	message: string;
};
export type GitObject = Blob | Tree | Commit;

const sigText = (s: Sig) => `${s.name} <${s.email}> ${s.time} ${s.tz}`;

// 物の中身（見出しの前）のバイト
export function body(o: GitObject): Uint8Array {
	switch (o.type) {
		case 'blob':
			return utf8(o.data);
		case 'tree':
			return concat(...o.entries.flatMap((e) => [utf8(`${e.mode} ${e.name}\0`), hexToBytes(e.id)]));
		case 'commit':
			return utf8(
				[
					`tree ${o.tree}`,
					...o.parents.map((p) => `parent ${p}`),
					`author ${sigText(o.author)}`,
					`committer ${sigText(o.committer)}`,
					'',
					o.message
				].join('\n')
			);
	}
}

export function idOf(o: GitObject): string {
	const b = body(o);
	return sha1Hex(concat(utf8(`${o.type} ${b.length}\0`), b));
}

// tree の並び：名前のバイトの順。ただし tree は名前の後ろに / があるものとして比べる
export function sortEntries(entries: TreeEntry[]): TreeEntry[] {
	const key = (e: TreeEntry) => (e.mode === '40000' ? `${e.name}/` : e.name);
	return [...entries].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

// cat-file -p の見せ方
export function pretty(o: GitObject): string {
	switch (o.type) {
		case 'blob':
			return o.data;
		case 'tree':
			return o.entries
				.map(
					(e) =>
						`${e.mode === '40000' ? '040000' : e.mode} ${e.mode === '40000' ? 'tree' : 'blob'} ${e.id}\t${e.name}\n`
				)
				.join('');
		case 'commit':
			return new TextDecoder().decode(body(o));
	}
}

// commit -m の説明文の整え方：行末の空白と、前後の空行を除き、末尾に改行を 1 つ
export function cleanMessage(msg: string): string {
	const lines = msg.split('\n').map((l) => l.replace(/\s+$/, ''));
	while (lines.length > 0 && lines[0] === '') lines.shift();
	while (lines.length > 0 && lines.at(-1) === '') lines.pop();
	return lines.length === 0 ? '' : lines.join('\n') + '\n';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// git log の日時：その commit の時差で "Tue Nov 10 09:00:00 2026 +0900"
export function logDate(s: Sig): string {
	const sign = s.tz.startsWith('-') ? -1 : 1;
	const off = sign * (Number(s.tz.slice(1, 3)) * 3600 + Number(s.tz.slice(3, 5)) * 60);
	const d = new Date((s.time + off) * 1000);
	const p = (n: number) => String(n).padStart(2, '0');
	return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${d.getUTCFullYear()} ${s.tz}`;
}
