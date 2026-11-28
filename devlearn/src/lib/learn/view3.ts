// 学習画面 第 3 版の右の欄と指標（learn-standard.md 第 19 章・16.4 LS3-M3）。純粋な関数
export type StepLike = { metrics?: Record<string, string>; at?: number[]; dur?: number };

/** 動きの長さの既定（ms） */
export const DEFAULT_DUR = 4000;
export const stepDur = (s: StepLike) => s.dur ?? DEFAULT_DUR;

/** そのステップまでの指標（前のステップの値を引き継ぐ） */
export function metricsUpTo(steps: readonly StepLike[], i: number): Record<string, string> {
	const out: Record<string, string> = {};
	for (let k = 0; k <= i && k < steps.length; k++) Object.assign(out, steps[k].metrics ?? {});
	return out;
}

/** 今光る段落（段落ごとの始まりの時刻 at。無ければ最初の段落） */
export function paraNow(s: StepLike, n: number, t: number): number {
	const at = s.at ?? [];
	let cur = 0;
	for (let i = 0; i < n; i++) if ((at[i] ?? Infinity) <= t) cur = i;
	return cur;
}

/** 数の前の部分と単位を分ける（数え上げ。'65,536 B' → [65536, ' B']） */
export function splitNum(v: string): { n: number; unit: string; comma: boolean } | null {
	const m = /^(-?[\d,]+(?:\.\d+)?)(.*)$/.exec(v);
	if (!m) return null;
	return { n: Number(m[1].replace(/,/g, '')), unit: m[2], comma: m[1].includes(',') };
}

type Change = readonly [string, string];
export type StripSrc = {
	paras: readonly string[];
	callout?: readonly [string, string];
	changes?: readonly Change[];
	intro?: { analogy: string };
};
export type Strip = {
	paras: boolean;
	note: readonly [string, string] | null;
	changes: readonly Change[];
};

/**
 * 図の下の帯に置く物（右の欄に内側のスクロールを作らない。CLAUDE.md 第 9 章・LS-A6）。
 * 囲み（たとえ・なぜ）と「変わったこと」は帯へ。言葉をそろえるステップは右の欄の一番上を言葉の一覧が占める（LS3-T4）ので、語りも帯へ
 */
export function stripOf(s: StripSrc): Strip | null {
	const note: readonly [string, string] | null = s.intro
		? ['たとえると', s.intro.analogy]
		: (s.callout ?? null);
	const changes = s.changes ?? [];
	const paras = !!s.intro;
	if (!note && !changes.length && !paras) return null;
	return { paras, note, changes };
}
