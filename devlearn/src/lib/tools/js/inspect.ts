// console.log が値を文字にする形。端末で JavaScript を走らせたとき（node）と同じ書き方に寄せる。
// 一番外の文字はそのまま、中の文字は単引用符。配列は [ 1, 2 ]、物は { a: 1 }。深さ 2 より下は [Object]・[Array]。

const quote = (s: string) =>
	`'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const key = (k: string) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : quote(k));

function list(open: string, items: string[], close: string, prefix = ''): string {
	if (items.length === 0) return `${prefix}${open}${close}`;
	return `${prefix}${open} ${items.join(', ')} ${close}`;
}

function show(v: unknown, depth: number, seen: Set<object>): string {
	if (typeof v === 'string') return quote(v);
	if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
	if (typeof v === 'bigint') return `${v}n`;
	if (typeof v === 'boolean' || v === undefined || v === null) return String(v);
	if (typeof v === 'symbol') return v.toString();
	if (typeof v === 'function') {
		const isClass = /^class\b/.test(Function.prototype.toString.call(v));
		const name = v.name || '(anonymous)';
		return isClass ? `[class ${name}]` : `[Function ${name === '(anonymous)' ? name : name}]`;
	}
	const o = v as object;
	if (seen.has(o)) return '[Circular *1]';
	if (v instanceof Error) return `${v.name}: ${v.message}`;
	if (v instanceof Date) return Number.isNaN(v.getTime()) ? 'Invalid Date' : v.toISOString();
	if (v instanceof RegExp) return String(v);
	if (v instanceof Promise) return 'Promise { <pending> }';
	const deeper = depth > 2;
	seen.add(o);
	try {
		if (Array.isArray(v)) {
			if (deeper) return '[Array]';
			return list(
				'[',
				v.map((x) => show(x, depth + 1, seen)),
				']'
			);
		}
		if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
			const arr = Array.from(v as unknown as ArrayLike<number>);
			const name = v.constructor.name;
			return list(
				'[',
				arr.map((x) => String(x)),
				']',
				`${name}(${arr.length}) `
			);
		}
		if (v instanceof Map) {
			if (deeper) return '[Map]';
			const items = [...v].map(
				([k, x]) => `${show(k, depth + 1, seen)} => ${show(x, depth + 1, seen)}`
			);
			return list('{', items, '}', `Map(${v.size}) `);
		}
		if (v instanceof Set) {
			if (deeper) return '[Set]';
			return list(
				'{',
				[...v].map((x) => show(x, depth + 1, seen)),
				'}',
				`Set(${v.size}) `
			);
		}
		if (deeper) return '[Object]';
		const ctor = Object.getPrototypeOf(o)?.constructor;
		const prefix = ctor && ctor !== Object && ctor.name ? `${ctor.name} ` : '';
		const items = Object.keys(o).map(
			(k) => `${key(k)}: ${show((o as Record<string, unknown>)[k], depth + 1, seen)}`
		);
		return list('{', items, '}', prefix);
	} finally {
		seen.delete(o);
	}
}

export function inspect(v: unknown, top = false): string {
	if (top && typeof v === 'string') return v;
	return show(v, 0, new Set());
}
