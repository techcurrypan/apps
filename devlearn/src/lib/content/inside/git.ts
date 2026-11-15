// Git の物（blob・tree・commit）の本物のバイト列と ID。中身の板（Step.inside.packet）の材料。
// ID は中身の SHA-1（検査 22 が計算し直す）。git 2.54.0 で打った ID と一致することを、レッスンの facts と比べてある。
import { assemble, hexOf, utf8, type RawField } from '../../lesson/packet.ts';
import type { Packet } from '../../lesson/types.ts';
import { sha1Hex } from '../../tools/sha1.ts';

const head = (type: string, n: number): RawField => ({
	k: '頭（種類と大きさ）',
	v: `${type} ${n}\0`,
	level: 2,
	bytes: utf8(`${type} ${n}\0`)
});
const idOf = (bytes: number[]) => sha1Hex(new Uint8Array(bytes));
const hexBytes = (h: string) => (h.match(/../g) ?? []).map((x) => parseInt(x, 16));

function pack(
	name: string,
	type: string,
	body: RawField[],
	what: string
): { packet: Packet; id: string } {
	const n = body.reduce((a, f) => a + f.bytes.length, 0);
	const fields = [head(type, n), ...body];
	const id = idOf(fields.flatMap((f) => f.bytes));
	const packet = assemble(`${name} ${id.slice(0, 7)}`, [{ name: `${type}（${what}）`, fields }]);
	packet.parts.push({
		name: 'ID（中身の SHA-1）',
		fields: [{ k: 'ID', v: id, level: 1 }]
	});
	return { packet, id };
}

/** ファイルの中身だけを入れた blob。名前は持たない */
export function blob(text: string) {
	const lines = text.split('\n').filter((_, i, a) => i < a.length - 1);
	return pack(
		'blob',
		'blob',
		lines.map((l, i) => ({ k: `${i + 1} 行目`, v: l, level: 1 as const, bytes: utf8(l + '\n') })),
		'ファイルの中身'
	);
}

/** フォルダの一覧の tree。1 件は「種類 名前\0」と、中身の ID の 20 バイト */
export function tree(entries: { mode: string; name: string; id: string }[]) {
	return pack(
		'tree',
		'tree',
		entries.flatMap((e) => [
			{
				k: `${e.name} の種類と名前`,
				v: `${e.mode} ${e.name}\0`,
				level: 2 as const,
				bytes: utf8(`${e.mode} ${e.name}\0`)
			},
			{ k: `${e.name} の中身の ID`, v: e.id, level: 1 as const, bytes: hexBytes(e.id) }
		]),
		'フォルダの一覧'
	);
}

/** 記録の commit。tree・親・書いた人と日時・説明 */
export function commit(o: {
	tree: string;
	parent?: string;
	who: string;
	time: number;
	zone: string;
	message: string;
}) {
	const lines: RawField[] = [
		{ k: 'tree', v: `tree ${o.tree}`, level: 1, bytes: utf8(`tree ${o.tree}\n`) },
		...(o.parent
			? [
					{
						k: 'parent（前の記録）',
						v: `parent ${o.parent}`,
						level: 1 as const,
						bytes: utf8(`parent ${o.parent}\n`)
					}
				]
			: []),
		{
			k: 'author',
			v: `author ${o.who} ${o.time} ${o.zone}`,
			level: 2,
			bytes: utf8(`author ${o.who} ${o.time} ${o.zone}\n`)
		},
		{
			k: 'committer',
			v: `committer ${o.who} ${o.time} ${o.zone}`,
			level: 3,
			bytes: utf8(`committer ${o.who} ${o.time} ${o.zone}\n`)
		},
		{ k: '空の行', v: '\n', level: 3, bytes: utf8('\n') },
		{ k: '説明', v: o.message, level: 1, bytes: utf8(o.message + '\n') }
	];
	return pack('commit', 'commit', lines, '記録');
}

export { hexOf };
