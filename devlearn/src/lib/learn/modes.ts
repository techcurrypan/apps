// 4 つの使い方（learn-standard.md 第 19 章・D-25）：見る / 試す / やってみる / 思い出す。
// 上の帯の釦で行き来し、各使い方の最後の釦は次の使い方へ進む。ロックはしない（どの釦もいつでも押せる）
export type Mode = 'watch' | 'lab' | 'try' | 'quiz';
export const MODES: { id: Mode; label: string; act: string; desc: string }[] = [
	{
		id: 'watch',
		label: '見る',
		act: 'ステップを進める',
		desc: '仕組みが動くのを、ステップごとに見る'
	},
	{
		id: 'lab',
		label: '試す',
		act: 'つまみを動かす',
		desc: 'つまみで数を変えて、結果がどう変わるか試す'
	},
	{
		id: 'try',
		label: 'やってみる',
		act: '端末で直す',
		desc: '端末に命令を打って、実際の困りごとを直す'
	},
	{ id: 'quiz', label: '思い出す', act: '答えて確かめる', desc: '答えて、覚えたかを確かめる' }
];

export function modeAfter(m: Mode): Mode | null {
	const i = MODES.findIndex((x) => x.id === m);
	return MODES[i + 1]?.id ?? null;
}

/** その使い方の最後の釦の文言（次の使い方：やること）。最後の使い方は null */
export function nextLabel(m: Mode): string | null {
	const n = modeAfter(m);
	const x = MODES.find((q) => q.id === n);
	return x ? `${x.label}：${x.act}` : null;
}
