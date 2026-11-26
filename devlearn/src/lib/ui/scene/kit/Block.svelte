<svelte:options namespace="svg" />

<script lang="ts">
	// 制御の係（scheduler・controller）：func と同じ形で青。記号は ⌖・↻ など（第 17 章 block）
	import Func from './Func.svelte';
	import type { Tone } from './paint';
	type Props = {
		x: number;
		y: number;
		s?: number;
		uik?: number;
		hl?: boolean;
		lift?: number;
		op?: number;
		id?: string;
		term?: string;
		tone?: Tone;
		glyph?: string;
	};
	let { tone = 'blue', ...rest }: Props = $props();
</script>

<Func {...rest} {tone} kind="block" />
