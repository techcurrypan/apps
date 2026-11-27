// ステップの合図（learn-standard.md 第 20 章の Step.cues）：荷物が物から物へ進む。
// 置き場は (物の置き場, 経過時間) だけで決まる純粋な関数（CLAUDE.md 第 8 章）。乱数・Date.now を使わない
import type { Tone } from '../../ui/scene/kit/paint.ts';
import type { Place } from './layout.ts';

export type Pt = { x: number; y: number };
/** 荷物：path の物を順に、at（ms）から d（ms）かけて進む。終わると最後の物の上に残る */
export type Cue = { name: string; tone: Tone; path: string[]; at: number; d: number };
/** 荷物は物の上（図の単位。縮尺 1 の時）に乗る */
export const RIDE = 40;

const ease = (v: number) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);

/** 折れ線の上の、道のりの割合 k（0〜1）の点 */
export function alongPath(pts: Pt[], k: number): Pt {
	const first = pts[0];
	if (!first) return { x: 0, y: 0 };
	const kk = Math.max(0, Math.min(1, k));
	const seg: number[] = [];
	let total = 0;
	for (let i = 1; i < pts.length; i++) {
		const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
		seg.push(l);
		total += l;
	}
	if (total === 0) return { x: first.x, y: first.y };
	let left = kk * total;
	for (let i = 0; i < seg.length; i++) {
		if (left <= seg[i] || i === seg.length - 1) {
			const r = seg[i] === 0 ? 0 : Math.min(1, left / seg[i]);
			const a = pts[i];
			const b = pts[i + 1];
			return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
		}
		left -= seg[i];
	}
	const last = pts[pts.length - 1];
	return { x: last.x, y: last.y };
}

/** 時刻 t（ms）に図に出す荷物と、その置き場 */
export function tokensAt(
	cues: readonly Cue[],
	at: Record<string, Place>,
	t: number
): { name: string; tone: Tone; x: number; y: number; op: number }[] {
	const out: { name: string; tone: Tone; x: number; y: number; op: number }[] = [];
	for (const c of cues) {
		if (t < c.at) continue;
		const ps = c.path.map((id) => at[id]);
		if (ps.some((p) => !p)) continue;
		const pts = (ps as Place[]).map((p) => ({ x: p.x, y: p.y - RIDE * p.s }));
		const k = c.d > 0 ? ease(Math.min(1, (t - c.at) / c.d)) : 1;
		const p = alongPath(pts, k);
		const op = Math.min(...(ps as Place[]).map((q) => q.op));
		out.push({ name: c.name, tone: c.tone, x: p.x, y: p.y, op });
	}
	return out;
}
