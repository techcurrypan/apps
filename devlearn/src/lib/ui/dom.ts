// 画面の要素についての小さな判定。

// 文字を打つ欄に焦点があるか（1 字のキー操作を効かせないため）。
export function inField(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

// 動きを減らす設定か。
export function prefersReducedMotion(): boolean {
	return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 2 列になる幅（60rem 以上）かを問う。ブラウザの外では null。
export function wideQuery(): MediaQueryList | null {
	return typeof matchMedia === 'function' ? matchMedia('(min-width: 60rem)') : null;
}
