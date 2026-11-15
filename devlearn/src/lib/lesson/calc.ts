// 検査 25 の式の計算（LS-Q3）。Fact.calc の式を計算し直して、v の数と比べる。
// 使える物：数・+ - * / ^・括弧・exp ln log2 log10 sqrt abs。変数は無い（式に値を書く）。

const FUNCS: Record<string, (x: number) => number> = {
	exp: Math.exp,
	ln: Math.log,
	log2: Math.log2,
	log10: Math.log10,
	sqrt: Math.sqrt,
	abs: Math.abs
};

/** 式を計算する。読めなければ例外 */
export function evaluate(src: string): number {
	const s = src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
	let i = 0;
	const peek = () => s[i];
	function expr(): number {
		let v = term();
		while (peek() === '+' || peek() === '-') v = s[i++] === '+' ? v + term() : v - term();
		return v;
	}
	function term(): number {
		let v = power();
		while (peek() === '*' || peek() === '/') v = s[i++] === '*' ? v * power() : v / power();
		return v;
	}
	function power(): number {
		const b = unary();
		if (peek() === '^') {
			i++;
			return b ** power();
		}
		return b;
	}
	function unary(): number {
		if (peek() === '-') {
			i++;
			return -unary();
		}
		if (peek() === '+') {
			i++;
			return unary();
		}
		return atom();
	}
	function atom(): number {
		if (peek() === '(') {
			i++;
			const v = expr();
			if (s[i++] !== ')') throw new SyntaxError(`閉じ括弧が無い：${src}`);
			return v;
		}
		const name = /^[a-z][a-z0-9]*/.exec(s.slice(i));
		if (name) {
			const fn = FUNCS[name[0]];
			if (!fn) throw new SyntaxError(`知らない関数「${name[0]}」：${src}`);
			i += name[0].length;
			if (s[i] !== '(') throw new SyntaxError(`関数の後に括弧が無い：${src}`);
			return fn(atom());
		}
		const num = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
		if (!num) throw new SyntaxError(`読めない所がある（${i} 字目）：${src}`);
		i += num[0].length;
		return Number(num[0]);
	}
	const v = expr();
	if (i !== s.length) throw new SyntaxError(`読めない所がある（${i} 字目）：${src}`);
	return v;
}

/** v の頭の数（"0.47" "−0.15（下げた）" "1,250 円"）と、その小数の桁 */
export function leadingNumber(v: string): { n: number; digits: number } | null {
	const m = /^[-−+]?[\d,]*\.?\d+/.exec(v.trim());
	if (!m) return null;
	const t = m[0].replace(/,/g, '').replace('−', '-');
	const dot = t.indexOf('.');
	return { n: Number(t), digits: dot < 0 ? 0 : t.length - dot - 1 };
}

/** 式の値を v の桁に丸めて、v の数と一致するか */
export function calcMatches(v: string, calc: string): { ok: boolean; got: number } {
	const want = leadingNumber(v);
	const got = evaluate(calc);
	if (!want) return { ok: false, got };
	const half = 0.5 * 10 ** -want.digits;
	return { ok: Math.abs(got - want.n) <= half + 1e-9, got };
}
