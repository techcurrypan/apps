// 吹き出しの置き場（learn-standard.md 18.3 H1）。物の上の空いた所に置き、入らなければ下、図の枠から出さない
export const TIP_MAX_W = 300;
const GAP = 10;
const PAD = 8;

type Rect = { x: number; y: number; w: number; h: number };

/** anchor（物の外枠。枠の中の px）・吹き出しの大きさ・枠の大きさから、吹き出しの左上 */
export function placeTip(
	anchor: Rect,
	tip: { w: number; h: number },
	box: { w: number; h: number }
): { left: number; top: number; below: boolean } {
	const cx = anchor.x + anchor.w / 2;
	const left = Math.max(PAD, Math.min(box.w - tip.w - PAD, cx - tip.w / 2));
	const above = anchor.y - tip.h - GAP;
	if (above >= PAD) return { left, top: above, below: false };
	const below = anchor.y + anchor.h + GAP;
	if (below + tip.h <= box.h - PAD) return { left, top: below, below: true };
	return { left, top: Math.max(PAD, Math.min(box.h - tip.h - PAD, above)), below: false };
}

/** 画面の上の外枠（getBoundingClientRect）を、枠の左上からの外枠にする */
export function localRect(
	r: { left: number; top: number; width: number; height: number },
	box: { left: number; top: number }
): Rect {
	return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
}
