// 字の大きさを画面の上で一定にする（learn-standard.md 16.3）。
// 図は viewBox（既定 1000×600）を枠に収めて描く。図の 1 単位が画面で何 px になるかの逆数が UIK。
// 字の大きさ・札の余白・線の太さに UIK を掛けて図の単位で書くと、画面の上ではいつも同じ px になる。

/** 札の字の大きさ（画面の px） */
export const LABEL_PX = { name: 14, sub: 12.5, num: 13, line: 12.5, note: 13 } as const;

/** viewBox の幅と高さ、図の枠の幅と高さ（画面の px）から UIK を求める。枠がまだ測れない時は 1 */
export function uikOf(viewW: number, viewH: number, boxW: number, boxH: number): number {
	if (!(boxW > 0) || !(boxH > 0)) return 1;
	return Math.max(viewW / boxW, viewH / boxH);
}

/** 札の種類ごとの、画面の上の字の大きさの範囲（px。16.3） */
export const LABEL_RANGE = {
	name: [13, 15],
	sub: [12, 13],
	num: [12, 14],
	line: [12, 13],
	note: [12, 15]
} as const satisfies Record<keyof typeof LABEL_PX, readonly [number, number]>;

export type LabelKind = keyof typeof LABEL_RANGE;

/** 画面の上の字の大きさ px が、札の種類の範囲に入るか（小数の誤差 0.05 を許す） */
export function labelOk(kind: LabelKind, px: number): boolean {
	const [lo, hi] = LABEL_RANGE[kind];
	return px >= lo - 0.05 && px <= hi + 0.05;
}

/** 図（w×h）を中心を保って zoom 倍に寄せた viewBox [x, y, 幅, 高さ]。zoom < 1 は引く */
export function zoomView(w: number, h: number, zoom: number): [number, number, number, number] {
	const vw = w / zoom;
	const vh = h / zoom;
	return [(w - vw) / 2, (h - vh) / 2, vw, vh];
}
