// 実験のつまみ（learn-standard.md LS-L5）。「予想する → つまみを動かす → 動きと指標が計算し直される → 結果を読む」。
// 計算は決まった式の純粋な関数（乱数なし。同じ値なら同じ結果）。式はレッスンごとに 1 つ（KNOB_CALC）。
import type { Cue, Step } from '../lesson/types.ts';

export type KnobOut = {
	rows: { k: string; v: string }[]; // 計算し直した指標
	note: string; // 結果の読み方（1〜2 文）
	/** 続く流れの荷物の数（1 周に何個流すか） */
	count: number;
	/** 続く流れの 1 個の長さ（ms） */
	dur: number;
	/** 落ちる荷物の番号（0 から。無ければ空） */
	drops: number[];
};
export type KnobCalc = {
	ask: string;
	opts: string[];
	a: number;
	run: (v: Record<string, number>) => KnobOut;
};

/** TCP：1 往復で送れる量は min(cwnd, 受信窓)。速さ ＝ 窓 ÷ RTT、喪失があると cwnd が減る */
export function tcpWindow(v: Record<string, number>): KnobOut {
	const rtt = v.rtt ?? 20; // ms
	const cwnd = v.cwnd ?? 10; // セグメント
	const loss = v.loss ?? 0; // %
	const mss = 1448;
	const bytes = cwnd * mss;
	const mbps = (bytes * 8) / (rtt / 1000) / 1e6;
	// 喪失 p のときの CUBIC 以前の Reno の目安（Mathis の式）：速さ ≈ MSS / RTT × 1.22 / √p
	const capped =
		loss > 0
			? Math.min(mbps, ((mss * 8) / (rtt / 1000) / 1e6) * (1.22 / Math.sqrt(loss / 100)))
			: mbps;
	const count = Math.max(1, Math.min(12, Math.round(cwnd / 2)));
	const drops = loss > 0 ? [Math.min(count - 1, Math.max(0, Math.round(count * 0.6)))] : [];
	return {
		rows: [
			{ k: '1 往復で送れる量', v: `${bytes.toLocaleString('en-US')} B（${cwnd} × ${mss} B）` },
			{ k: '窓だけで決まる速さ', v: `${mbps.toFixed(1)} Mbps` },
			{ k: '喪失を入れた目安', v: `${capped.toFixed(1)} Mbps` }
		],
		note:
			loss > 0
				? `喪失 ${loss}% で、窓が同じでも速さは ${capped.toFixed(1)} Mbps まで下がる。落ちるたびに cwnd が減るため。`
				: `RTT が ${rtt} ms なら、cwnd ${cwnd} で ${mbps.toFixed(1)} Mbps。RTT が倍なら速さは半分になる。`,
		count,
		dur: Math.max(300, Math.min(1600, rtt * 20)),
		drops
	};
}

/** Kubernetes：落ちてから戻るまで。再起動の待ちは 10 秒から倍に伸び、上限 300 秒 */
export function k8sBackoff(v: Record<string, number>): KnobOut {
	const restarts = Math.max(0, Math.round(v.restarts ?? 0));
	const replicas = Math.max(1, Math.round(v.replicas ?? 3));
	const wait = Math.min(300, 10 * Math.pow(2, Math.max(0, restarts - 1)));
	const total =
		restarts === 0
			? 0
			: Array.from({ length: restarts }, (_, i) => Math.min(300, 10 * 2 ** i)).reduce(
					(a, b) => a + b,
					0
				);
	const up = Math.round(((replicas - 1) / replicas) * 1000) / 10;
	return {
		rows: [
			{ k: '次の再起動までの待ち', v: restarts === 0 ? '0 秒（初回はすぐ）' : `${wait} 秒` },
			{ k: 'ここまでの待ちの合計', v: `${total} 秒` },
			{ k: '1 つ落ちても動く割合', v: `${up}%（${replicas - 1} / ${replicas}）` }
		],
		note:
			restarts >= 5
				? `5 回目からは待ちが 160 秒、さらに 300 秒で頭打ち。落ち続ける Pod は CrashLoopBackOff のまま。`
				: `再起動 ${restarts} 回なら次の待ちは ${restarts === 0 ? 0 : wait} 秒。レプリカ ${replicas} なら 1 つ落ちても ${up}% が残る。`,
		count: replicas,
		dur: 700,
		drops: restarts > 0 ? [0] : []
	};
}

export const KNOB_CALC: Record<string, KnobCalc> = {};

/** 続く流れを、つまみの結果で作り直す（最初の packet の合図を count 個ずらして流す） */
export function knobLoop(s: Step, out: KnobOut): Step {
	const base = Array.isArray(s.loop) ? s.loop.find((c) => c.do.op === 'packet') : undefined;
	if (!base || base.do.op !== 'packet') return s;
	const d = base.do;
	const gap = Math.max(80, Math.round(out.dur / 3));
	const loop: Cue[] = Array.from({ length: out.count }, (_, i) => ({
		at: i * gap,
		dur: out.dur,
		do: {
			...d,
			label: `${d.label}${out.count > 1 ? ` ${i + 1}` : ''}`,
			drop: out.drops.includes(i) || undefined
		}
	}));
	return { ...s, loop };
}
