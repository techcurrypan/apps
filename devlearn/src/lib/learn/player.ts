// 学習画面 第 3 版の再生（learn-standard.md 第 16.4 LS3-M1〜M3。試作 learn11 の frame・tickMetrics）。
// 時計は純粋な関数で進める。画面は (ステップ, 時計の t) から描く（CLAUDE.md 第 8 章）。乱数・Date.now は使わない。

/** 動きが終わってから流し直すまでの間（LS3-M1） */
export const LOOP_GAP = 2600;
/** 指標の数え上げの長さ（LS3-M3） */
export const COUNT_MS = 900;
/** 線の点が 1 周する長さ */
export const FLOW_MS = 1600;
/** 1 コマで進める最大の時間（タブを隠した後に飛ばない） */
const MAX_DT = 60;

export type Clock = { t: number; playing: boolean; speed: 0.5 | 1 | 2; loops: number };

export const start = (): Clock => ({ t: 0, playing: true, speed: 1, loops: 0 });
export const togglePlay = (c: Clock): Clock => ({ ...c, playing: !c.playing });
export const replay = (c: Clock): Clock => ({ ...c, t: 0, playing: true });

/** 描画の 1 コマの間（ms）を、進めてよい長さにそろえる（タブを隠した後に飛ばない）。画面は tick の前にこれを通す */
export const frameDt = (dt: number) => Math.min(MAX_DT, Math.max(0, dt));

/** dt（ms）だけ進める。dur はステップの動きの長さ */
export function tick(c: Clock, dt: number, dur: number, o: { reduce?: boolean } = {}): Clock {
	if (!c.playing) return c;
	const d = dt * c.speed * (o.reduce ? 6 : 1);
	const t = c.t + d;
	if (t > dur + LOOP_GAP) return { ...c, t: 0, loops: c.loops + 1 };
	return { ...c, t };
}

const decimals = (v: number) => (Number.isInteger(v) ? 0 : (String(v).split('.')[1]?.length ?? 0));
const ease = (v: number) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);

/** 指標の数え上げ：ステップに入ってから mT ms の時の値 */
export function countAt(from: number, to: number, mT: number): number {
	const k = Math.max(0, Math.min(1, mT / COUNT_MS));
	const v = from + (to - from) * (k < 1 ? ease(k) : 1);
	const dp = Math.max(decimals(from), decimals(to));
	const p = 10 ** dp;
	return Math.round(v * p) / p;
}

/** 線の点の位置（0〜1 の周の位置）。描画の時刻 now で回る。動きを減らす設定では null（点を出さず矢じりだけ） */
export function flowAt(now: number, o: { reduce?: boolean; period?: number } = {}): number | null {
	if (o.reduce) return null;
	const p = o.period ?? FLOW_MS;
	return (((now % p) + p) % p) / p;
}

/** 主役の物の下の輪が 1 回広がる長さ（試作 learn11 の pulse と同じ 1.4 秒） */
export const PULSE_MS = 1400;

/** 主役の物の下の輪（LS3-M1：動きが終わって留まっている間も動き続ける）。k は広がり 0〜1、op は濃さ。
 * ステップの時計 t で回すので、一時停止で止まる。動きを減らす設定では null */
export function pulseAt(t: number, o: { reduce?: boolean } = {}): { k: number; op: number } | null {
	if (o.reduce) return null;
	const k = (((t % PULSE_MS) + PULSE_MS) % PULSE_MS) / PULSE_MS;
	return { k, op: 1 - k };
}
