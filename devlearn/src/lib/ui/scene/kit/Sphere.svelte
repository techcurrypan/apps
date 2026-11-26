<svelte:options namespace="svg" />

<script lang="ts">
	// 標本の 1 人・粒：光の当たった球（第 17 章 sphere）
	import { edge, type Tone } from './paint';
	type Props = { x: number; y: number; r?: number; tone?: Tone; op?: number };
	let { x, y, r = 7, tone = 'blue', op = 1 }: Props = $props();
	const gid = $derived(`dl-sp-${tone}`);
</script>

<g opacity={op}>
	<defs>
		<radialGradient id={gid} cx="35%" cy="30%" r="70%">
			<stop offset="0" stop-color="#fff" stop-opacity="0.9" />
			<stop offset="0.35" style:stop-color="var(--dl-obj-{tone})" />
			<stop offset="1" style:stop-color="var(--dl-obj-{tone})" stop-opacity="0.85" />
		</radialGradient>
	</defs>
	<circle cx={x} cy={y} {r} fill="url(#{gid})" style:stroke={edge(tone)} stroke-width="0.8" />
</g>
