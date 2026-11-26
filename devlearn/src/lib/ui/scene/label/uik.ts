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
