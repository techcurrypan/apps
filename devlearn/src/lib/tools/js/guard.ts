// 止まらない繰り返しへの備え。書いた物の while・for の条件に「見張り」__g() を、for of の繰り返す物に __gi() を入れる。
// 見張りは回った数を数え、決まった数を超えたら止める（時間で決めると、同じ物を走らせても結果が変わるため）。
// 文字・テンプレート・注釈・正規表現の中は読み飛ばす。

type Scan = { src: string; i: number };

const isId = (c: string | undefined) => !!c && /[A-Za-z0-9_$]/.test(c);

// 正規表現の / が来うる所か（直前の意味のある字で決める）
function regexAllowed(src: string, at: number): boolean {
	let j = at - 1;
	while (j >= 0 && /\s/.test(src[j])) j--;
	if (j < 0) return true;
	const c = src[j];
	if ('([{,;:=!&|?+-*%<>~^}'.includes(c)) return true;
	let k = j;
	while (k >= 0 && isId(src[k])) k--;
	const word = src.slice(k + 1, j + 1);
	return [
		'return',
		'typeof',
		'case',
		'do',
		'else',
		'in',
		'of',
		'new',
		'delete',
		'void',
		'throw'
	].includes(word);
}

// i にある文字・注釈・正規表現・テンプレートを読み飛ばす。読み飛ばしたら true
function skip(s: Scan): boolean {
	const { src } = s;
	const c = src[s.i];
	const d = src[s.i + 1];
	if (c === '/' && d === '/') {
		const end = src.indexOf('\n', s.i);
		s.i = end < 0 ? src.length : end;
		return true;
	}
	if (c === '/' && d === '*') {
		const end = src.indexOf('*/', s.i + 2);
		s.i = end < 0 ? src.length : end + 2;
		return true;
	}
	if (c === '"' || c === "'") {
		let j = s.i + 1;
		while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
		s.i = j + 1;
		return true;
	}
	if (c === '`') {
		let j = s.i + 1;
		while (j < src.length && src[j] !== '`') {
			if (src[j] === '\\') j += 2;
			else if (src[j] === '$' && src[j + 1] === '{') {
				const inner: Scan = { src, i: j + 2 };
				matchClose(inner, '{', '}');
				j = inner.i;
			} else j++;
		}
		s.i = j + 1;
		return true;
	}
	if (c === '/' && regexAllowed(src, s.i)) {
		let j = s.i + 1;
		let inClass = false;
		while (j < src.length && src[j] !== '\n') {
			if (src[j] === '\\') j++;
			else if (src[j] === '[') inClass = true;
			else if (src[j] === ']') inClass = false;
			else if (src[j] === '/' && !inClass) break;
			j++;
		}
		j++;
		while (isId(src[j])) j++;
		s.i = j;
		return true;
	}
	return false;
}

// 開きの次から読み、対になる閉じの次へ進む
function matchClose(s: Scan, open: string, close: string): void {
	let depth = 1;
	while (s.i < s.src.length) {
		if (skip(s)) continue;
		const c = s.src[s.i];
		if (c === open) depth++;
		else if (c === close) {
			depth--;
			if (depth === 0) {
				s.i++;
				return;
			}
		}
		s.i++;
	}
}

// ( … ) の中を、一番外の ; で分ける
function splitTop(src: string): string[] {
	const parts: string[] = [];
	const s: Scan = { src, i: 0 };
	let depth = 0;
	let from = 0;
	while (s.i < src.length) {
		if (skip(s)) continue;
		const c = src[s.i];
		if ('([{'.includes(c)) depth++;
		else if (')]}'.includes(c)) depth--;
		else if (c === ';' && depth === 0) {
			parts.push(src.slice(from, s.i));
			from = s.i + 1;
		}
		s.i++;
	}
	parts.push(src.slice(from));
	return parts;
}

function guardHeader(kw: 'for' | 'while', inner: string): string {
	if (kw === 'while') return `__g() && (${guardLoops(inner)})`;
	const parts = splitTop(inner);
	if (parts.length === 3) {
		const cond = parts[1].trim() === '' ? 'true' : guardLoops(parts[1].trim());
		return `${guardLoops(parts[0])}; __g() && (${cond});${guardLoops(parts[2])}`;
	}
	const m = /^(\s*(?:const|let|var)?\s*[^]*?\s)of(\s+)([^]*)$/.exec(inner);
	if (m) return `${m[1]}of${m[2]}__gi(${guardLoops(m[3])})`;
	return guardLoops(inner);
}

export function guardLoops(src: string): string {
	let out = '';
	const s: Scan = { src, i: 0 };
	let from = 0;
	while (s.i < src.length) {
		const at = s.i;
		if (skip(s)) continue;
		const rest = src.slice(at, at + 5);
		const kw = rest.startsWith('while') ? 'while' : rest.startsWith('for') ? 'for' : null;
		if (kw && !isId(src[at - 1]) && !isId(src[at + kw.length]) && src[at - 1] !== '.') {
			let j = at + kw.length;
			while (/\s/.test(src[j] ?? '')) j++;
			if (kw === 'for' && src.startsWith('await', j)) {
				s.i = j + 5;
				continue;
			}
			if (src[j] === '(') {
				const inner: Scan = { src, i: j + 1 };
				matchClose(inner, '(', ')');
				const header = src.slice(j + 1, inner.i - 1);
				out += src.slice(from, j + 1) + guardHeader(kw, header) + ')';
				from = inner.i;
				s.i = inner.i;
				continue;
			}
		}
		s.i++;
	}
	return out + src.slice(from);
}
