// 測る道具の窓口 window.__l3（10-P 手順 9。scripts/look-learn.ts の --scene・--loop・--hover・--terms・--perf が読む）。
// 形は scripts/lib/learn3-measure.ts の PROTO_SHIM（試作 learn11 に後から付ける窓口）と同じ。頁の状態は変えず、読むだけ（go・mode は画面の釦と同じ動き）
import type { Mode } from '../../learn/modes.ts';

export type L3Ctx = {
	steps: readonly { kind: string; first: readonly string[] }[];
	termName: (id: string) => string | undefined;
	kindName: (kind: string) => string;
	state: () => { step: number; t: number; playing: boolean };
	go: (i: number) => void;
	mode: (m: Mode) => void;
	/** 学習画面の根（図は .fig svg） */
	root: () => HTMLElement | null;
};

export type L3 = ReturnType<typeof makeL3>;

const MODE_OF: Record<string, Mode> = { watch: 'watch', lab: 'lab', try: 'try', recall: 'quiz' };

export function makeL3(c: L3Ctx) {
	const svg = (): SVGSVGElement | null => c.root()?.querySelector('.fig svg') ?? null;
	/** 今の図に出ている物（外側の data-obj。Pod は台に乗る部材なので数えない。薄い物・小さな物は出ていないとする） */
	function els(): SVGGElement[] {
		const s = svg();
		if (!s) return [];
		const out: SVGGElement[] = [];
		for (const g of s.querySelectorAll<SVGGElement>('g[data-obj]')) {
			if (g.parentElement?.closest('g[data-obj]')) continue;
			if (g.dataset.term === 'pod') continue;
			let op = 1;
			for (let n: Element | null = g; n && n !== s; n = n.parentElement)
				op *= Number(getComputedStyle(n).opacity);
			if (op < 0.5) continue;
			if (g.getBoundingClientRect().width < 20) continue;
			out.push(g);
		}
		return out;
	}
	return {
		get steps() {
			return c.steps.length;
		},
		get step() {
			return c.state().step;
		},
		get t() {
			return c.state().t;
		},
		get playing() {
			return c.state().playing;
		},
		go(i: number) {
			c.mode('watch');
			c.go(i);
		},
		mode(m: string) {
			c.mode(MODE_OF[m] ?? (m as Mode));
		},
		/** 本番は 1 頁 1 レッスン。別のレッスンは道で開く */
		lesson(id: string) {
			if (!location.pathname.endsWith(`/lesson/${id}`)) location.assign(`/lesson/${id}`);
		},
		kindLabel(i: number) {
			const s = c.steps[i];
			return s ? c.kindName(s.kind) : '';
		},
		get type() {
			return c.root()?.dataset.view ?? 'stack';
		},
		objs(): string[] {
			return els().map((g) => g.dataset.obj ?? '');
		},
		objEl(id: string): SVGGElement | null {
			return els().find((g) => g.dataset.obj === id) ?? null;
		},
		/** 物の外枠：下の台を除いた立体の部分（data-body） */
		objBox(id: string) {
			const g = els().find((e) => e.dataset.obj === id);
			if (!g) return null;
			return (g.querySelector('[data-body]') ?? g).getBoundingClientRect();
		},
		svg,
		fresh(i: number): string[] {
			return (c.steps[i]?.first ?? []).map((id) => c.termName(id)).filter((t): t is string => !!t);
		}
	};
}
