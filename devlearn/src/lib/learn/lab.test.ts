import { describe, expect, it } from 'vitest';
import { LABS, answerPred, k8sPlan, knobText, memLab, snapKnob, tcpSim, type LabKnob } from './lab';

// learn-standard.md 第 19 章「試す」・LS-L5：つまみの値で計算し直す（乱数なし。同じ値から同じ結果）
const k: LabKnob = { k: 'rtt', label: 'RTT', min: 5, max: 200, step: 5, v: 30, unit: ' ms', d: '' };

describe('つまみ（snapKnob）', () => {
	it('範囲の中に収め、刻みに合わせる', () => {
		expect(snapKnob(k, 2)).toBe(5);
		expect(snapKnob(k, 999)).toBe(200);
		expect(snapKnob(k, 33)).toBe(35);
		expect(snapKnob({ ...k, min: 0, max: 5, step: 0.5 }, 1.26)).toBe(1.5);
	});
});

describe('TCP：1 MB を送る時間（tcpSim）', () => {
	it('RTT 30 ms・喪失 0%・初期 cwnd 10 は 7 往復・210 ms（10→20→…→320 と育ち、725 個を送る）', () => {
		const r = tcpSim({ rtt: 30, loss: 0, icw: 10 });
		expect(r.rtts).toBe(7);
		expect(r.ms).toBe(210);
		expect(r.hist).toEqual([10, 20, 40, 80, 160, 320, 640]);
	});
	it('RTT を半分にすると時間も半分（往復の回数は同じ）', () => {
		const a = tcpSim({ rtt: 30, loss: 0, icw: 10 });
		const b = tcpSim({ rtt: 15, loss: 0, icw: 10 });
		expect(b.rtts).toBe(a.rtts);
		expect(b.ms).toBe(a.ms / 2);
	});
	it('喪失率 1% で往復の回数が増える', () => {
		expect(tcpSim({ rtt: 30, loss: 1, icw: 10 }).rtts).toBeGreaterThan(7);
	});
	it('同じ値から同じ結果', () => {
		expect(tcpSim({ rtt: 40, loss: 2, icw: 4 })).toEqual(tcpSim({ rtt: 40, loss: 2, icw: 4 }));
	});
});

describe('Kubernetes：置ける数と落ち続けるか（k8sPlan）', () => {
	it('上限 1024 Mi・3 台・8 個は、1 台に 2 個・置けた 6・Pending 2', () => {
		const r = k8sPlan({ rep: 8, lim: 1024, peak: 300, nodes: 3 });
		expect(r).toMatchObject({ cap: 2, sched: 6, pend: 2, oom: false, per: 0, total: 0 });
	});
	it('山 300 Mi が上限 256 Mi を超えると、10 分で 6 回落ち、4 個で 24 回', () => {
		const r = k8sPlan({ rep: 4, lim: 256, peak: 300, nodes: 3 });
		expect(r).toMatchObject({ oom: true, per: 6, total: 24 });
	});
});

describe('予想の問い（answerPred）', () => {
	const p = LABS.tcp.preds[0];
	it('当たり外れと理由と、試してみること', () => {
		expect(answerPred(p, p.ans)).toEqual({ ok: true, why: p.why, tryit: p.tryit });
		expect(answerPred(p, (p.ans + 1) % p.opts.length).ok).toBe(false);
	});
});

describe('試すの中身（LABS）', () => {
	it('どの試すも、つまみ 2〜4 個・予想の問い 2 つ・結果の表がある。つまみには説明（LS3-H5）', () => {
		for (const [id, lab] of Object.entries(LABS)) {
			expect(lab.knobs.length, id).toBeGreaterThanOrEqual(2);
			expect(lab.knobs.length, id).toBeLessThanOrEqual(4);
			expect(lab.preds.length, id).toBe(2);
			for (const kn of lab.knobs) expect(kn.d.length, `${id} ${kn.k}`).toBeGreaterThan(0);
			const v = Object.fromEntries(lab.knobs.map((x) => [x.k, x.v]));
			expect(lab.results(v).length, id).toBeGreaterThanOrEqual(3);
		}
	});
});

describe('JavaScript：写したつもりが写っていない（memLab）', () => {
	it('b = a は同じ物。b[0] を直すと a も変わる。物は増えない', () => {
		const r = memLab({ n: 4, mode: 0, nested: 1 });
		expect(r).toMatchObject({ same: true, innerSame: true, aChanges: true, arrays: 5, copied: 0 });
	});
	it('浅い写し [...a]：外は別の物。中が配列なら中は同じ物で、a も変わる', () => {
		expect(memLab({ n: 4, mode: 1, nested: 1 })).toMatchObject({
			same: false,
			innerSame: true,
			aChanges: true,
			arrays: 6,
			copied: 4
		});
		expect(memLab({ n: 4, mode: 1, nested: 0 })).toMatchObject({ aChanges: false, arrays: 2 });
	});
	it('structuredClone：中まで作り直す。n = 4・中が配列なら配列は 10 個、写した値は 4 + 8', () => {
		expect(memLab({ n: 4, mode: 2, nested: 1 })).toMatchObject({
			same: false,
			innerSame: false,
			aChanges: false,
			arrays: 10,
			copied: 12
		});
	});
	it('つまみの値を、選ぶつまみは名前で、数は単位つきで書く', () => {
		const mode = LABS.mem.knobs.find((k) => k.k === 'mode');
		expect(mode && knobText(mode, 2)).toBe('structuredClone(a)');
		expect(knobText(LABS.tcp.knobs[0], 30)).toBe('30 ms');
	});
});
