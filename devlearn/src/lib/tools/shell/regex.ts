// grep の正規表現（POSIX の基本 BRE・拡張 ERE と、GNU の足し分）を JavaScript の RegExp に直す。
// 直せない物は、grep と同じ言い方の誤りを返す。

const CLASSES: Record<string, string> = {
	alpha: 'A-Za-z',
	digit: '0-9',
	alnum: 'A-Za-z0-9',
	upper: 'A-Z',
	lower: 'a-z',
	space: ' \\t\\n\\r\\f\\v',
	blank: ' \\t',
	punct: '!-\\/:-@\\[-`{-~',
	xdigit: '0-9A-Fa-f'
};

const JS_SPECIAL = /[\\^$.*+?()[\]{}|/]/;
const lit = (c: string) => (JS_SPECIAL.test(c) ? '\\' + c : c);

export type Converted = { source: string } | { error: string };

// [ から ] までを読む。返すのは JS の書き方と、読み終えた位置
function bracket(p: string, at: number): { js: string; end: number } | null {
	let i = at + 1;
	let js = '[';
	if (p[i] === '^') {
		js += '^';
		i++;
	}
	let first = true;
	while (i < p.length) {
		const c = p[i];
		if (c === ']' && !first) return { js: js + ']', end: i + 1 };
		first = false;
		if (c === '[' && p[i + 1] === ':') {
			const close = p.indexOf(':]', i + 2);
			if (close < 0) return null;
			const name = p.slice(i + 2, close);
			const cls = CLASSES[name];
			if (!cls) return null;
			js += cls;
			i = close + 2;
			continue;
		}
		js += c === '\\' || c === ']' || c === '[' ? '\\' + c : c;
		i++;
	}
	return null;
}

export function toRegExp(p: string, extended: boolean): Converted {
	let out = '';
	let depth = 0;
	// 直前が「式の始まり」か（* を文字として読む・^ を行頭として読む所）
	let atStart = true;
	for (let i = 0; i < p.length; i++) {
		const c = p[i];
		const start = atStart;
		atStart = false;
		if (c === '[') {
			const b = bracket(p, i);
			if (!b) return { error: 'Invalid regular expression' };
			out += b.js;
			i = b.end - 1;
			continue;
		}
		if (c === '\\') {
			const d = p[i + 1];
			i++;
			if (d === undefined) return { error: 'Trailing backslash' };
			if (!extended && '|(){}+?'.includes(d)) {
				if (d === '(') {
					depth++;
					atStart = true;
				} else if (d === ')') {
					if (depth === 0) return { error: 'Unmatched ) or \\)' };
					depth--;
				} else if (d === '|') atStart = true;
				out += d;
				continue;
			}
			if (/[wWsSbB0-9]/.test(d)) out += '\\' + d;
			else if (d === '<' || d === '>') out += '\\b';
			else out += lit(d);
			continue;
		}
		if (c === '*' && start) {
			out += '\\*';
			continue;
		}
		if (c === '^') {
			out += extended || start ? '^' : '\\^';
			atStart = true;
			continue;
		}
		if (c === '$') {
			const next = p.slice(i + 1, i + 3);
			const end = i === p.length - 1 || (!extended && (next === '\\)' || next === '\\|'));
			out += extended || end ? '$' : '\\$';
			continue;
		}
		if (extended) {
			if (c === '(') {
				depth++;
				atStart = true;
				out += '(';
				continue;
			}
			if (c === ')') {
				if (depth === 0) {
					out += '\\)';
					continue;
				}
				depth--;
				out += ')';
				continue;
			}
			if (c === '|') {
				atStart = true;
				out += '|';
				continue;
			}
			if ('+?{}'.includes(c)) {
				out += c;
				continue;
			}
		}
		if (c === '.') out += '.';
		else if (c === '*') out += '*';
		else out += lit(c);
	}
	if (depth > 0) return { error: 'Unmatched ( or \\(' };
	try {
		new RegExp(out, 'u');
	} catch {
		return { error: 'Invalid regular expression' };
	}
	return { source: out };
}
