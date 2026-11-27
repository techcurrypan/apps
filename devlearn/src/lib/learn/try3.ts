// やってみる（learn-standard.md 第 19 章・LS-P5・L-3）の模型。頼み・やることの一覧・端末（履歴・補完・Ctrl+L）・命令の見本・公式の説明への道。
// 本物の道具が動かせない場面の模擬なので、出力は本物と同じ形で返す。状態は打った命令の並びだけから決まる純粋な関数（乱数なし）
export type TryLineKind = 'cmd' | 'out' | 'err' | 'hint' | 'note';
export type TryLine = { text: string; kind: TryLineKind };
export type TryState = {
	lines: TryLine[];
	hist: string[];
	/** 済んだ事の印（場面ごとに決める） */
	f: Record<string, boolean>;
	/** 場面ごとの設定の値（輻輳制御・qdisc など） */
	v: Record<string, string>;
};
/** 1 つの命令の結果：出す行と、変わった印・値 */
export type TryResult = { out: TryLine[]; f?: Record<string, boolean>; v?: Record<string, string> };
export type TryScene = {
	id: string;
	/** 端末の頭（プロンプト） */
	ps: string;
	who: string;
	req: string;
	/** 命令の見本（押すと入る・Tab の補完の元） */
	cards: string[];
	/** 公式の説明への道：[道具, URL] */
	refs: [string, string][];
	tasks: { t: string; done: (s: TryState) => boolean }[];
	init: () => Pick<TryState, 'lines' | 'f' | 'v'>;
	/** 1 つの命令を受けて、出す行と、変わった印・値を返す（s は変えない） */
	run: (cmd: string, s: TryState) => TryResult;
	/** 右の欄・指標に出す数（状態から決まる） */
	metrics: (s: TryState) => Record<string, string>;
};

export function startTry(sc: TryScene): TryState {
	const i = sc.init();
	return { lines: i.lines, hist: [], f: i.f, v: i.v };
}

/** 1 行を打つ。clear は画面の行を消す（Ctrl+L と同じ）。空の行は何もしない */
export function typeLine(sc: TryScene, s: TryState, raw: string): TryState {
	const line = raw.replace(/\s+/g, ' ').trim();
	if (!line) return s;
	const hist = [...s.hist, line];
	if (line === 'clear') return { ...s, lines: [], hist };
	const r = sc.run(line, s);
	return {
		lines: [...s.lines, { text: `${sc.ps} ${line}`, kind: 'cmd' }, ...r.out],
		hist,
		f: { ...s.f, ...r.f },
		v: { ...s.v, ...r.v }
	};
}

/** やることの一覧の済んだか（順に） */
export function tasksDone(sc: TryScene, s: TryState): boolean[] {
	return sc.tasks.map((t) => t.done(s));
}

/** 履歴：back 回 ↑ を押した時の行（0 は空。古い方は一番古い所で止まる） */
export function histAt(hist: string[], back: number): string {
	if (back <= 0 || hist.length === 0) return '';
	return hist[Math.max(0, hist.length - back)];
}

/** Tab の補完：見本の命令のうち、打った所から始まる物が 1 つならそれに、複数なら共通の頭まで */
export function completeLine(sc: TryScene, typed: string): string {
	const c = [...new Set([...sc.cards, 'help', 'clear'])].filter((x) => x.startsWith(typed));
	if (c.length === 0) return typed;
	let p = c[0];
	for (const x of c) while (!x.startsWith(p)) p = p.slice(0, -1);
	return p.length >= typed.length ? p : typed;
}
