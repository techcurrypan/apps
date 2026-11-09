// 1 ステップの再生の時間割（screen-design.md 3.3）。
// 前の図を HOLD_MS 見せ、動きを 1 つずつ OP_MS ずつ再生し、後の図で止まる。
// 経過時間を渡すと、その時点の段階を返す。純粋な関数なので、どの時点の絵も段階だけから描ける。

export const HOLD_MS = 400; // --dl-motion-hold
export const OP_MS = 700; // --dl-motion-op

export type Phase =
	| { kind: 'before' }
	| { kind: 'op'; index: number; t: number } // t は 0〜1
	| { kind: 'after' };

export function duration(opCount: number, speed: number): number {
	return (HOLD_MS + opCount * OP_MS) / speed;
}

export function phaseAt(elapsed: number, opCount: number, speed: number): Phase {
	const e = elapsed * speed;
	if (e < HOLD_MS) return { kind: 'before' };
	const k = (e - HOLD_MS) / OP_MS;
	if (k >= opCount) return { kind: 'after' };
	const index = Math.floor(k);
	return { kind: 'op', index, t: k - index };
}

export function phaseLabel(p: Phase, opCount: number): string {
	if (p.kind === 'before') return '前';
	if (p.kind === 'after') return '後';
	return `動き ${p.index + 1}/${opCount}`;
}
