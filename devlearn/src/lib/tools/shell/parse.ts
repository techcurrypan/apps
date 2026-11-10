// シェルの 1 行を読む。模擬の道具（shell・git・docker）が共に使う。
// 扱う物：語・単引用符・二重引用符・バックスラッシュ・変数（$X ${X} $? $# $0〜$9）・語の頭の ~・
// パイプ・つなぎ（; && ||）・リダイレクト（> >> 2> 2>&1 >&2 <）・注釈（#）。
// 扱わない物（要るレッスンが無い）：ワイルドカード、$( )、ヒアドキュメント、変数の語分割。

// sub は $( 命令 )。quoted は "…" の中か（中でなければ、答えを空白で語に分ける）
export type Seg = { lit: string } | { var: string } | { sub: string; quoted: boolean };
export type Word = Seg[];
export type Redirect =
	{ fd: 0 | 1 | 2; op: '>' | '>>' | '<'; target: Word } | { fd: 1 | 2; op: '>&'; to: 1 | 2 };
export type Command = { words: Word[]; redirects: Redirect[] };
export type Pipeline = { commands: Command[] };
export type ListItem = { op: null | ';' | '&&' | '||'; pipeline: Pipeline };
export type Parsed = { items: ListItem[] };

type Tok =
	| { t: 'word'; w: Word }
	| { t: 'op'; v: '|' | ';' | '&&' | '||' }
	| { t: 'redir'; fd: 0 | 1 | 2; v: '>' | '>>' | '<' | '>&1' | '>&2' };

const isName = (c: string) => /[A-Za-z0-9_]/.test(c);

// ( の次から読み、対になる ) の位置。引用符の中の括弧は数えない。無ければ -1
function closeParen(line: string, from: number): number {
	let depth = 1;
	for (let j = from; j < line.length; j++) {
		const c = line[j];
		if (c === "'") {
			const e = line.indexOf("'", j + 1);
			if (e < 0) return -1;
			j = e;
		} else if (c === '"') {
			let k = j + 1;
			while (k < line.length && line[k] !== '"') k += line[k] === '\\' ? 2 : 1;
			if (k >= line.length) return -1;
			j = k;
		} else if (c === '\\') j++;
		else if (c === '(') depth++;
		else if (c === ')' && --depth === 0) return j;
	}
	return -1;
}

function tokenize(line: string): Tok[] | { error: string } {
	const toks: Tok[] = [];
	let i = 0;
	let word: Word | null = null;
	const lit = (s: string) => {
		word ??= [];
		const last = word.at(-1);
		if (last && 'lit' in last) last.lit += s;
		else word.push({ lit: s });
	};
	const flush = () => {
		if (word) toks.push({ t: 'word', w: word });
		word = null;
	};
	// $ の後の変数名・$( 命令 ) を読む。読めたら進んだ数、読めなければ 0（閉じない $( は -1）
	const readVar = (at: number, quoted: boolean): number => {
		const c = line[at + 1];
		if (c === '(') {
			const end = closeParen(line, at + 2);
			if (end < 0) return -1;
			word ??= [];
			word.push({ sub: line.slice(at + 2, end), quoted });
			return end - at + 1;
		}
		if (c === '{') {
			const end = line.indexOf('}', at + 2);
			if (end < 0) return 0;
			word ??= [];
			word.push({ var: line.slice(at + 2, end) });
			return end - at + 1;
		}
		if (c === '?' || c === '#' || /[0-9]/.test(c ?? '')) {
			word ??= [];
			word.push({ var: c });
			return 2;
		}
		let j = at + 1;
		while (j < line.length && isName(line[j])) j++;
		if (j === at + 1) return 0;
		word ??= [];
		word.push({ var: line.slice(at + 1, j) });
		return j - at;
	};

	while (i < line.length) {
		const c = line[i];
		if (c === ' ' || c === '\t') {
			flush();
			i++;
		} else if (c === '#' && word === null) {
			break;
		} else if (c === "'") {
			const end = line.indexOf("'", i + 1);
			if (end < 0) return { error: "unexpected EOF while looking for matching `''" };
			lit(line.slice(i + 1, end));
			if (end === i + 1) word ??= [{ lit: '' }];
			i = end + 1;
		} else if (c === '"') {
			let j = i + 1;
			word ??= [{ lit: '' }];
			for (;;) {
				if (j >= line.length) return { error: 'unexpected EOF while looking for matching `"\'' };
				const d = line[j];
				if (d === '"') break;
				if (d === '\\' && ['"', '\\', '$', '`'].includes(line[j + 1])) {
					lit(line[j + 1]);
					j += 2;
				} else if (d === '$') {
					const n = readVar(j, true);
					if (n < 0) return { error: "unexpected EOF while looking for matching `)'" };
					if (n === 0) {
						lit('$');
						j++;
					} else j += n;
				} else {
					lit(d);
					j++;
				}
			}
			i = j + 1;
		} else if (c === '\\') {
			if (i + 1 < line.length) lit(line[i + 1]);
			i += 2;
		} else if (c === '$') {
			const n = readVar(i, false);
			if (n < 0) return { error: "unexpected EOF while looking for matching `)'" };
			if (n === 0) {
				lit('$');
				i++;
			} else i += n;
		} else if (c === '|' || c === ';' || c === '&') {
			flush();
			const two = line.slice(i, i + 2);
			if (two === '&&' || two === '||') {
				toks.push({ t: 'op', v: two });
				i += 2;
			} else if (c === '&') {
				return { error: "syntax error near unexpected token `&'" };
			} else {
				toks.push({ t: 'op', v: c });
				i++;
			}
		} else if (
			c === '>' ||
			c === '<' ||
			((c === '1' || c === '2') && word === null && (line[i + 1] === '>' || false))
		) {
			flush();
			let fd: 0 | 1 | 2 = c === '<' ? 0 : 1;
			if (c === '1' || c === '2') {
				fd = c === '2' ? 2 : 1;
				i++;
			}
			const rest = line.slice(i);
			if (rest.startsWith('>&1') || rest.startsWith('>&2')) {
				toks.push({ t: 'redir', fd, v: rest.startsWith('>&1') ? '>&1' : '>&2' });
				i += 3;
			} else if (rest.startsWith('>>')) {
				toks.push({ t: 'redir', fd, v: '>>' });
				i += 2;
			} else {
				toks.push({ t: 'redir', fd, v: rest[0] === '<' ? '<' : '>' });
				i += 1;
			}
		} else if (c === '~' && word === null && /^$|^[/ \t;|&<>]/.test(line.slice(i + 1, i + 2))) {
			// 語の頭の ~ は家（$HOME）
			word = [{ var: 'HOME' }];
			i++;
		} else {
			lit(c);
			i++;
		}
	}
	flush();
	return toks;
}

const tokName = (t: Tok) => (t.t === 'op' ? t.v : t.t === 'redir' ? t.v : 'word');

export function parseLine(line: string): Parsed | { error: string } {
	const toks = tokenize(line);
	if ('error' in toks) return toks;
	const items: ListItem[] = [];
	let op: ListItem['op'] = null;
	let commands: Command[] = [];
	let cmd: Command = { words: [], redirects: [] };
	const unexpected = (t: Tok) => ({ error: `syntax error near unexpected token \`${tokName(t)}'` });

	for (let i = 0; i < toks.length; i++) {
		const t = toks[i];
		if (t.t === 'word') cmd.words.push(t.w);
		else if (t.t === 'redir') {
			if (t.v === '>&1' || t.v === '>&2') {
				const to = t.v === '>&1' ? 1 : 2;
				const fd = t.fd === 2 ? 2 : 1;
				if (fd !== to) cmd.redirects.push({ fd, op: '>&', to });
				continue;
			}
			const next = toks[i + 1];
			if (!next) return { error: "syntax error near unexpected token `newline'" };
			if (next.t !== 'word') return unexpected(next);
			cmd.redirects.push({ fd: t.fd, op: t.v, target: next.w });
			i++;
		} else {
			if (cmd.words.length === 0 && cmd.redirects.length === 0) return unexpected(t);
			commands.push(cmd);
			cmd = { words: [], redirects: [] };
			if (t.v !== '|') {
				items.push({ op, pipeline: { commands } });
				commands = [];
				op = t.v;
			}
		}
	}
	if (cmd.words.length > 0 || cmd.redirects.length > 0) commands.push(cmd);
	else if (commands.length > 0 || (op !== null && op !== ';'))
		return { error: 'syntax error: unexpected end of file' };
	if (commands.length > 0) items.push({ op, pipeline: { commands } });
	return { items };
}
