// 再生の操作の状態。純粋な関数で次の状態を返す。
// run は「動きを 1 から再生した回数」。替わるたびに画面は前の図から再生し直す。

export type Speed = 0.5 | 1 | 2;
export type PlayerState = { n: number; total: number; auto: boolean; speed: Speed; run: number };

export type PlayerCommand =
	| { type: 'next' }
	| { type: 'prev' }
	| { type: 'first' }
	| { type: 'last' }
	| { type: 'go'; n: number }
	| { type: 'replay' }
	| { type: 'toggleAuto' }
	| { type: 'autoAdvance' }
	| { type: 'faster' }
	| { type: 'slower' };

const SPEEDS: readonly Speed[] = [0.5, 1, 2];

export function initial(total: number): PlayerState {
	return { n: 1, total, auto: false, speed: 1, run: 0 };
}

function goTo(s: PlayerState, n: number, auto: boolean): PlayerState {
	if (!Number.isInteger(n) || n < 1 || n > s.total) return { ...s, auto };
	if (n === s.n) return { ...s, auto };
	return { ...s, n, auto, run: s.run + 1 };
}

export function reduce(s: PlayerState, c: PlayerCommand): PlayerState {
	switch (c.type) {
		case 'next':
			return goTo(s, s.n + 1, false);
		case 'prev':
			return goTo(s, s.n - 1, false);
		case 'first':
			return goTo(s, 1, false);
		case 'last':
			return goTo(s, s.total, false);
		case 'go':
			return goTo(s, c.n, false);
		case 'replay':
			return { ...s, run: s.run + 1 };
		case 'toggleAuto':
			if (s.auto) return { ...s, auto: false };
			// 最後のステップで始めたら、最初から流す
			if (s.n === s.total) return { ...s, n: 1, auto: true, run: s.run + 1 };
			return { ...s, auto: true };
		case 'autoAdvance':
			if (!s.auto) return s;
			if (s.n >= s.total) return { ...s, auto: false };
			return { ...s, n: s.n + 1, run: s.run + 1 };
		case 'faster': {
			const i = SPEEDS.indexOf(s.speed);
			return { ...s, speed: SPEEDS[Math.min(SPEEDS.length - 1, i + 1)] };
		}
		case 'slower': {
			const i = SPEEDS.indexOf(s.speed);
			return { ...s, speed: SPEEDS[Math.max(0, i - 1)] };
		}
	}
}
