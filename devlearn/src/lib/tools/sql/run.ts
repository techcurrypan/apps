// 本物の SQL を走らせる道具（docs/tools.md 3.4）。SQLite そのもの（sql.js）で、場面の表を作った状態から始める。
// 状態は「初めの SQL と、打った行の並び」。打つたびに、新しいデータベースで初めから打ち直す
// （同じ物を打てば同じ表になる。巻き戻すとは、k 件目までの並びに戻ること）。
// 結果の見せ方は sqlite3 の端末の .mode table、計画は EXPLAIN QUERY PLAN の木、行を変えたら changes: N。
// 乱数で決めない：random() は決まった種からの並びに替える（CLAUDE.md 8 章）。
import type { Database, SqlJsStatic, SqlValue } from 'sql.js';
import type { AsyncTool, Result } from '../session.ts';

export type SqlState = { setup: string; lines: string[] };

let loading: Promise<SqlJsStatic> | null = null;

// sql.js を読み込む。ブラウザでは wasm の置き場所を渡す（Node では sql.js が自分で見つける）
export function loadSql(wasmUrl?: string): Promise<SqlJsStatic> {
	loading ??= import('sql.js').then((m) =>
		m.default(wasmUrl ? { locateFile: () => wasmUrl } : undefined)
	);
	return loading;
}

const isNum = (v: SqlValue) => typeof v === 'number' || typeof v === 'bigint';
const cell = (v: SqlValue) =>
	v === null
		? 'NULL'
		: v instanceof Uint8Array
			? `x'${[...v].map((b) => b.toString(16).padStart(2, '0')).join('')}'`
			: String(v);

const width = (s: string) => {
	let w = 0;
	for (const ch of s) w += (ch.codePointAt(0) ?? 0) >= 0x1100 ? 2 : 1;
	return w;
};

export function formatTable(columns: string[], rows: SqlValue[][]): string {
	const texts = rows.map((r) => r.map(cell));
	const w = columns.map((c, i) => Math.max(width(c), ...texts.map((r) => width(r[i]))));
	const line = '+' + w.map((n) => '-'.repeat(n + 2)).join('+') + '+\n';
	const pad = (s: string, n: number, right: boolean) =>
		right ? ' '.repeat(n - width(s)) + s : s + ' '.repeat(n - width(s));
	const row = (cells: string[], nums: boolean[]) =>
		'| ' + cells.map((c, i) => pad(c, w[i], nums[i])).join(' | ') + ' |\n';
	let out =
		line +
		row(
			columns,
			columns.map(() => false)
		) +
		line;
	rows.forEach((r, k) => (out += row(texts[k], r.map(isNum))));
	return out + line;
}

// EXPLAIN QUERY PLAN の行（id, parent, notused, detail）を、sqlite3 の端末と同じ木にする
function planTree(rows: SqlValue[][]): string {
	const nodes = rows.map((r) => ({ id: Number(r[0]), parent: Number(r[1]), detail: String(r[3]) }));
	let out = 'QUERY PLAN\n';
	const walk = (parent: number, indent: string) => {
		const kids = nodes.filter((n) => n.parent === parent);
		kids.forEach((n, i) => {
			const last = i === kids.length - 1;
			out += `${indent}${last ? '`--' : '|--'}${n.detail}\n`;
			walk(n.id, indent + (last ? '   ' : '|  '));
		});
	};
	walk(0, '');
	return out;
}

// 決まった種からの 64 ビット風の整数（安全な整数の幅に収める）
function seededInts(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
		const hi = a;
		a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
		return (hi % 0x200000) * 0x100000000 + a - 0x10000000000000;
	};
}

const MODIFY = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i;
const PLAN = /^\s*EXPLAIN\s+QUERY\s+PLAN\b/i;

// 1 行（; で区切った文が複数あってもよい）を打つ。誤りが出たら、その行の残りは打たない
function runOne(db: Database, text: string): Result {
	let out = '';
	try {
		for (const stmt of db.iterateStatements(text)) {
			const sql = stmt.getSQL();
			const cols = stmt.getColumnNames();
			const rows: SqlValue[][] = [];
			while (stmt.step()) rows.push(stmt.get());
			stmt.free();
			if (PLAN.test(sql)) out += planTree(rows);
			else if (cols.length > 0 && rows.length > 0) out += formatTable(cols, rows);
			else if (MODIFY.test(sql)) out += `changes: ${db.getRowsModified()}\n`;
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { out, err: `Error: ${msg}\n`, code: 1 };
	}
	return { out, err: '', code: 0 };
}

export async function runSql(state: SqlState, line: string, wasmUrl?: string): Promise<Result> {
	const SQL = await loadSql(wasmUrl);
	const db = new SQL.Database();
	try {
		db.create_function('random', seededInts(20261110));
		db.exec(state.setup);
		for (const l of state.lines) runOne(db, l);
		return runOne(db, line);
	} finally {
		db.close();
	}
}

export function sqlTool(wasmUrl?: string): AsyncTool<SqlState> {
	return {
		async run(state, line) {
			const r = await runSql(state, line, wasmUrl);
			return { ...r, state: { setup: state.setup, lines: [...state.lines, line] } };
		}
	};
}
