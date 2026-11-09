// 出来事の種類（log.kind と move.kind）に、色の枠 1〜5 を割り当てる（screen-design.md 4.2）。
// レッスンの中で初めて出た順。ステップの中では、図の動き → 記録 の順に見る。
import type { Lesson } from '../lesson/types.ts';

export const KIND_SLOTS = 5;

export function kindSlots(lesson: Lesson): Map<string, number> {
	const m = new Map<string, number>();
	const add = (k: string) => {
		if (!m.has(k)) m.set(k, Math.min(KIND_SLOTS, m.size + 1));
	};
	for (const step of lesson.explain) {
		for (const op of step.scene) if (op.op === 'move') add(op.kind);
		add(step.log.kind);
	}
	return m;
}
