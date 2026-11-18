// やってみるの図（learn-standard.md LS-P4）。打った命令から作った出来事（learn/try.ts の tryLesson）に、第 2 版の動きの合図を付ける。
// 命令を打つ → 命令の荷物が線を流れる → 状態の札が変わる → 端末に出力、の順（LS-P4）。純粋な関数。
import type { Cue, Lesson, Step } from '../lesson/types.ts';

const PACKET_MS = 900;

export function withMotion(l: Lesson): Lesson {
	const nodes = Object.keys(l.map?.nodes ?? {});
	return {
		...l,
		explain: l.explain.map((s): Step => {
			if (s.motion?.length) return s;
			const ids = new Set<string>();
			for (const op of s.scene) {
				if (op.op === 'move') {
					ids.add(op.from);
					ids.add(op.to);
				} else if (op.op !== 'appear') ids.add(op.id);
			}
			const fit = ids.size ? [...ids] : nodes;
			const motion: Cue[] = [{ at: 0, dur: 700, para: 0, do: { op: 'camera', fit } }];
			let at = 500;
			for (const op of s.scene) {
				if (op.op === 'move' && op.from !== op.to) {
					motion.push({
						at,
						dur: PACKET_MS,
						para: 0,
						do: { op: 'packet', a: op.from, b: op.to, label: op.payload, kind: op.kind }
					});
					at += PACKET_MS;
				} else if (op.op === 'move') {
					motion.push({ at, dur: 500, para: 0, do: { op: 'pulse', id: op.from } });
					at += 500;
				} else if (op.op === 'change') {
					motion.push({
						at,
						dur: 450,
						para: 0,
						do: { op: 'badge', id: op.id, text: `${op.k} ${op.v}` }
					});
					at += 200;
				} else if (op.op === 'highlight') {
					motion.push({ at, dur: 500, para: 0, do: { op: 'pulse', id: op.id } });
				}
			}
			return { ...s, motion, loop: 'none', loopReason: '命令 1 つの出来事。続く流れは無い' };
		})
	};
}

/** 出力を端末に出してよい時刻（荷物が届いた後）。ms */
export function outputAt(s: Step | undefined): number {
	if (!s?.motion?.length) return 0;
	return Math.max(...s.motion.map((c) => c.at + c.dur));
}
