<script lang="ts">
	// 第 2 版の図（screen-design.md 11.3）。1 枚の絵（Frame）を描くだけで、状態を持たない。
	// 地図（区画・線・機械・状態の札・荷物）と層の図（帯・関数の箱・キュー・道・文脈）を同じ SVG に描く。
	import type { ImplContext, Lesson } from '../../lesson/types.ts';
	import { along, ITEM_H, ITEM_W, textW, type Geo, type View } from '../../learn2/geo.ts';
	import type { Frame } from '../../learn2/timeline.ts';
	import Machine from './Machine.svelte';

	type Props = {
		lesson: Lesson;
		geo: Geo;
		frame: Frame;
		view: View;
		town: boolean;
		/** 流れの種類 → 色の番号（1〜5）と線の形 */
		styleOf: (kind: string) => { slot: number; line: 'solid' | 'dash' | 'double' };
		contextOf: (box: string) => ImplContext | undefined;
		/** 機械・荷物・箱を押した（LS-I13） */
		onpick?: (what: { kind: 'node' | 'packet' | 'box'; id: string; x: number; y: number }) => void;
		desc: string;
		/** 機械に Tab で届き、Enter・Space で押せる（思い出すの「図の機械を押す」問い。LS-R1・X3） */
		keys?: boolean;
	};
	let {
		lesson,
		geo,
		frame,
		view,
		town,
		styleOf,
		contextOf,
		onpick,
		desc,
		keys = false
	}: Props = $props();

	const CTX_LABEL: Record<ImplContext, string> = {
		user: 'ユーザー空間',
		syscall: 'システムコール（プロセス）',
		hardirq: 'hardirq（割り込み）',
		softirq: 'softirq',
		tasklet: 'tasklet',
		kthread: 'カーネルスレッド',
		other: 'そのほか'
	};
	const nodeF = $derived(new Map(frame.nodes.map((n) => [n.id, n])));
	const linkF = $derived(new Map(frame.links.map((l) => [l.id, l])));
	const edgeF = $derived(new Map(frame.edges.map((e) => [e.id, e])));
	const qCount = $derived(new Map(frame.queues.map((q) => [q.id, q.count])));
	const fit = $derived(new Set(frame.fit));
	const kindOfLink = (a: string, b: string) => {
		for (const s of lesson.explain)
			for (const op of s.scene)
				if (op.op === 'move' && ((op.from === a && op.to === b) || (op.from === b && op.to === a)))
					return op.kind;
		return lesson.legend?.[0]?.kind ?? '';
	};
	const mid = (a: { x: number; y: number }, b: { x: number; y: number }, off: number) => {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		return { x: (a.x + b.x) / 2 + (-dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off };
	};
	const pick = (kind: 'node' | 'packet' | 'box', id: string) => (e: MouseEvent) => {
		const r = (e.currentTarget as Element).getBoundingClientRect();
		onpick?.({ kind, id, x: r.x + r.width / 2, y: r.y + r.height });
	};
</script>

<svg
	class="l2-svg"
	viewBox="{view.x} {view.y} {view.w} {view.h}"
	preserveAspectRatio="xMidYMid meet"
	role="img"
	aria-label={desc}
>
	<defs>
		{#each [1, 2, 3, 4, 5] as s (s)}
			<marker
				id="l2-arrow-{s}"
				viewBox="0 0 10 10"
				refX="8"
				refY="5"
				markerWidth="7"
				markerHeight="7"
				orient="auto-start-reverse"
			>
				<path d="M0,0L10,5L0,10z" class="ah k{s}" />
			</marker>
		{/each}
	</defs>

	<!-- 区画（床と点線の囲い。LS-D7） -->
	{#each geo.zones as z (z.label)}
		<g class="zone">
			<rect x={z.r.x} y={z.r.y} width={z.r.w} height={z.r.h} rx="16" />
			<text x={z.lr.x + 14} y={z.lr.y + 19} data-label="区画 {z.label}">{z.label}・{z.note}</text>
		</g>
	{/each}

	<!-- 層の帯（LS-D12） -->
	{#each geo.bands as b (b.id)}
		<g class="band">
			<rect x={b.r.x} y={b.r.y} width={b.r.w} height={b.r.h} rx="10" />
			<!-- 帯の名前は上の段に。寄りで帯の左端が外れても、見えている左端に付いてくる -->
			<text
				x={Math.min(Math.max(b.r.x + 16, view.x + 12 / view.scale), b.r.x + b.r.w - 16)}
				y={b.r.y + 25}
				data-label="層 {b.label}">{b.label}</text
			>
		</g>
	{/each}

	<!-- 線（LS-D3） -->
	{#each geo.links as k (k.id)}
		{@const f = linkF.get(k.id)}
		{@const st = styleOf(kindOfLink(k.a, k.b))}
		{#if f && f.draw > 0}
			{@const end = along(k.from, k.to, f.draw)}
			<path id={k.id} class="track" d="M{k.from.x},{k.from.y}L{k.to.x},{k.to.y}" />
			<g class="link k{st.slot} {st.line}">
				{#if st.line === 'double'}
					<path class="under" d="M{k.from.x},{k.from.y}L{end.x},{end.y}" />
				{/if}
				<path
					d="M{k.from.x},{k.from.y}L{end.x},{end.y}"
					marker-end={f.draw >= 1 && k.dir !== 'ba' ? `url(#l2-arrow-${st.slot})` : undefined}
					marker-start={f.draw >= 1 && k.dir !== 'ab' ? `url(#l2-arrow-${st.slot})` : undefined}
				/>
			</g>
			{#if f.draw >= 1}
				{@const m = mid(k.from, k.to, -18)}
				<text class="ll" x={m.x} y={m.y} text-anchor="middle" data-label="線 {k.label}"
					>{k.label}</text
				>
			{/if}
		{/if}
	{/each}

	<!-- 関数の箱とキュー（LS-D12〜D14） -->
	{#each [...geo.boxes.values()] as b (b.id)}
		{@const ctx = contextOf(b.id)}
		{@const on = frame.step === 0 || b.steps.includes(frame.step) || fit.has(b.id)}
		<g
			class="fbox ctx-{ctx ?? 'other'}"
			class:on
			data-fit={fit.has(b.id) ? b.id : undefined}
			role="button"
			tabindex="-1"
			onclick={pick('box', b.id)}
			onkeydown={() => {}}
		>
			<rect class="body" x={b.r.x} y={b.r.y} width={b.r.w} height={b.r.h} rx="10" />
			<rect class="strip" x={b.r.x} y={b.r.y} width="8" height={b.r.h} rx="4" />
			<text class="fn" x={b.r.x + 20} y={b.r.y + 30} data-label="関数 {b.impl}">{b.impl}</text>
			{#if ctx}
				<text class="cx" x={b.r.x + b.r.w - 12} y={b.r.y + 30} text-anchor="end">{ctx}</text>
			{/if}
		</g>
	{/each}
	{#each frame.boxRings as br (br.id)}
		{@const b = geo.boxes.get(br.id)}
		{#if b}
			{@const p = 4 + br.k * 18}
			<rect
				class="ring"
				x={b.r.x - p}
				y={b.r.y - p}
				width={b.r.w + p * 2}
				height={b.r.h + p * 2}
				rx={10 + p}
				style:opacity={1 - br.k}
			/>
		{/if}
	{/each}
	{#each [...geo.queues.values()] as q (q.id)}
		{@const box = geo.boxes.get(q.box)}
		{@const on = !!box && (frame.step === 0 || box.steps.includes(frame.step))}
		<g class="queue" class:on>
			<rect x={q.r.x} y={q.r.y} width={q.r.w} height={q.r.h} rx="8" />
			<text x={q.r.x + 10} y={q.r.y + 19} data-label="キュー {q.label}">{q.label}</text>
			<text class="qn" x={q.r.x + q.r.w - 10} y={q.r.y + 19} text-anchor="end"
				>{qCount.get(q.id) ?? 0}{q.limit ? ` / ${q.limit}` : ''}</text
			>
			{#each Array.from({ length: q.slots }, (_, i) => q.slot(i)) as r, i (i)}
				<rect class="slot" x={r.x} y={r.y} width={r.w} height={r.h} rx="5" />
			{/each}
		</g>
	{/each}
	{#each frame.items as it (it.id)}
		<g class="item" class:fresh={it.fresh} style:opacity={it.opacity}>
			<rect x={it.x} y={it.y - it.lift} width={ITEM_W} height={ITEM_H} rx="5" />
			<text x={it.x + ITEM_W / 2} y={it.y - it.lift + 21} text-anchor="middle">{it.id}</text>
		</g>
	{/each}

	<!-- 荷物の道（層の図。LS-D15：全て描き、このステップの道を濃く） -->
	{#each geo.edges as e (e.id)}
		{@const f = edgeF.get(e.id)}
		{@const st = styleOf(e.kind)}
		{#if f}
			{@const end = along(e.from, e.to, f.draw)}
			<path id={e.id} class="track" d="M{e.from.x},{e.from.y}L{e.to.x},{e.to.y}" />
			<g class="edge k{st.slot} {st.line}" class:active={f.active} class:broken={f.broken}>
				<path
					d="M{e.from.x},{e.from.y}L{end.x},{end.y}"
					marker-end={f.draw >= 1 ? `url(#l2-arrow-${st.slot})` : undefined}
				/>
			</g>
		{/if}
	{/each}

	<!-- 機械（LS-D2） -->
	{#each geo.nodes.values() as n (n.id)}
		{@const f = nodeF.get(n.id)}
		{#if f}
			<g
				class="node"
				class:gone={f.gone}
				class:dim={!f.hot && frame.step > 0}
				style:opacity={f.opacity}
				data-fit={fit.has(n.id) ? n.id : undefined}
			>
				{#if f.ring !== null}
					<circle
						class="ring"
						cx={n.c.x}
						cy={n.c.y - 6}
						r={40 + f.ring * 46}
						style:opacity={1 - f.ring}
					/>
				{/if}
				<g
					transform="translate({n.c.x},{n.c.y}) scale({f.scale})"
					role="button"
					tabindex={keys ? 0 : -1}
					aria-label={keys ? `機械 ${n.label}` : undefined}
					onclick={pick('node', n.id)}
					onkeydown={(e) => {
						if (keys && (e.key === 'Enter' || e.key === ' ')) {
							e.preventDefault();
							e.stopPropagation();
							(e.currentTarget as Element).dispatchEvent(
								new MouseEvent('click', { bubbles: true })
							);
						}
					}}
				>
					<Machine icon={n.icon} failed={f.failed} flash={f.flash} hot={f.hot} />
				</g>
				<g class="nl" data-label="機械 {n.label}">
					<text class="nm" x={n.c.x} y={n.c.y + 74} text-anchor="middle">{n.label}</text>
					{#if n.sub}
						<text class="sb" x={n.c.x} y={n.c.y + 94} text-anchor="middle">{n.sub}</text>
					{/if}
				</g>
				{#if town && n.town}
					{@const ty = n.c.y + (n.sub ? 104 : 84)}
					{@const tw = textW('町：' + n.town, 15) + 16}
					<g class="tn" data-label="名札 {n.town}">
						<rect x={n.c.x - tw / 2} y={ty} width={tw} height="24" rx="12" />
						<text x={n.c.x} y={ty + 17} text-anchor="middle">町：{n.town}</text>
					</g>
				{/if}
			</g>
		{/if}
	{/each}

	<!-- 状態の札（LS-D5） -->
	{#each frame.badges as b (b.id)}
		{@const n = geo.nodes.get(b.id)}
		{@const box = geo.boxes.get(b.id)}
		{@const at = n ? n.badgeAt : box ? { x: box.r.x + box.r.w - 150, y: box.r.y - 32 } : null}
		{#if at}
			{@const w = textW(b.text, 15) + 20}
			<g
				class="badge {b.tone}"
				data-label="札 {b.text}"
				transform="translate({at.x},{at.y}) scale({1 + b.pulse * 0.14})"
			>
				<rect x="0" y="0" width={w} height="27" rx="13" />
				<text x={w / 2} y="19" text-anchor="middle">{b.text}</text>
			</g>
		{/if}
	{/each}

	<!-- 文脈が変わる所（LS-D14・M15） -->
	{#each frame.contexts as c, i (i)}
		{@const box = geo.boxes.get(c.at)}
		{#if box}
			{@const txt = `ここで実行の文脈が変わる → ${CTX_LABEL[c.to]}`}
			{@const w = textW(txt, 15) + 20}
			<!-- 見えている右端からはみ出さないよう左へ寄せる（箱の左端より右には出さない） -->
			{@const tx = Math.max(
				Math.min(box.r.x, frame.view.x + frame.view.w - w - 12),
				Math.min(box.r.x, frame.view.x + 12)
			)}
			<g class="ctxtag ctx-{c.to}" style:opacity={Math.min(1, c.k * 3)} data-label="文脈 {c.at}">
				<rect x={tx} y={box.r.y - 36} width={w} height="28" rx="6" />
				<text x={tx + 10} y={box.r.y - 17}>{txt}</text>
			</g>
		{/if}
	{/each}

	<!-- 荷物（LS-M2・M8・M11） -->
	{#each frame.packets as p (p.key)}
		{@const st = styleOf(p.kind)}
		{@const w = textW(p.label, 15) + 22}
		<g
			class="packet k{st.slot} {p.state}"
			style:opacity={p.state === 'drop' ? 1 - p.fall : 1}
			data-packet={p.state === 'go' ? '' : undefined}
			data-falling={p.state === 'drop' ? '' : undefined}
			data-link={p.path}
			data-p={p.p.toFixed(4)}
			role="button"
			tabindex="-1"
			onclick={pick('packet', p.label)}
			onkeydown={() => {}}
		>
			<rect x={p.pos.x - w / 2} y={p.pos.y - 14} width={w} height="28" rx="14" />
			<text x={p.pos.x} y={p.pos.y + 5} text-anchor="middle">{p.label}</text>
			{#if p.state === 'drop' && p.fall > 0.2}
				<text class="x" x={p.pos.x + w / 2 + 6} y={p.pos.y + 5}>✕ 落ちた</text>
			{/if}
		</g>
	{/each}
</svg>

<style>
	.l2-svg {
		display: block;
		width: 100%;
		height: 100%;
		font-family: var(--dl-font);
		user-select: none;
	}
	text {
		fill: var(--dl-text);
		font-size: 15px;
		paint-order: stroke;
		stroke: var(--dl-bg);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.zone rect {
		fill: color-mix(in oklab, var(--dl-kind-5-bg) 55%, transparent);
		stroke: var(--dl-border-strong);
		stroke-dasharray: 7 6;
		stroke-width: 1.5;
	}
	.zone text {
		fill: var(--dl-text-muted);
		font-weight: 600;
	}
	.band rect {
		fill: color-mix(in oklab, var(--dl-surface) 80%, transparent);
		stroke: var(--dl-border);
	}
	.band text {
		font-weight: 700;
		fill: var(--dl-text-muted);
	}
	.track {
		fill: none;
		stroke: transparent;
	}
	.link path,
	.edge path {
		fill: none;
		stroke-width: 3;
		stroke-linecap: round;
	}
	.link.dash path,
	.edge.dash path {
		stroke-dasharray: 9 7;
	}
	.link.double path.under {
		stroke-width: 9;
		stroke: var(--dl-bg) !important;
	}
	.link.double path {
		stroke-width: 9;
	}
	.link.double path:not(.under) {
		stroke-width: 3;
	}
	.edge {
		opacity: 0.28;
	}
	.edge.active {
		opacity: 1;
	}
	.edge.active path {
		stroke-width: 4;
	}
	.edge.broken path {
		stroke-dasharray: 14 10 2 10;
	}
	.k1 path,
	.ah.k1 {
		stroke: var(--dl-kind-1-fg);
	}
	.k2 path,
	.ah.k2 {
		stroke: var(--dl-kind-2-fg);
	}
	.k3 path,
	.ah.k3 {
		stroke: var(--dl-kind-3-fg);
	}
	.k4 path,
	.ah.k4 {
		stroke: var(--dl-kind-4-fg);
	}
	.k5 path,
	.ah.k5 {
		stroke: var(--dl-kind-5-fg);
	}
	.ah {
		fill: currentColor;
	}
	.ah.k1 {
		fill: var(--dl-kind-1-fg);
	}
	.ah.k2 {
		fill: var(--dl-kind-2-fg);
	}
	.ah.k3 {
		fill: var(--dl-kind-3-fg);
	}
	.ah.k4 {
		fill: var(--dl-kind-4-fg);
	}
	.ah.k5 {
		fill: var(--dl-kind-5-fg);
	}
	.ll {
		fill: var(--dl-text-muted);
	}
	.fbox {
		opacity: 0.35;
		cursor: pointer;
	}
	.fbox.on {
		opacity: 1;
	}
	.fbox .body {
		fill: var(--dl-surface-raised);
		stroke: var(--dl-border-strong);
		stroke-width: 1.5;
	}
	.fbox .fn {
		font-family: var(--dl-font-code);
		font-size: 16px;
		font-weight: 700;
	}
	.fbox .cx {
		fill: var(--dl-text-muted);
	}
	.ctx-syscall {
		--c: var(--dl-kind-1-fg);
	}
	.ctx-hardirq {
		--c: var(--dl-wrong);
	}
	.ctx-softirq {
		--c: var(--dl-kind-4-fg);
	}
	.ctx-tasklet {
		--c: var(--dl-kind-2-fg);
	}
	.ctx-kthread {
		--c: var(--dl-kind-3-fg);
	}
	.ctx-user,
	.ctx-other {
		--c: var(--dl-kind-5-fg);
	}
	.fbox .strip {
		fill: var(--c);
	}
	.fbox.on .body {
		stroke: var(--c);
	}
	.queue {
		opacity: 0.35;
	}
	.queue.on {
		opacity: 1;
	}
	.queue > rect {
		fill: var(--dl-bg);
		stroke: var(--dl-border-strong);
		stroke-dasharray: 5 4;
	}
	.queue .slot {
		fill: none;
		stroke: var(--dl-border);
		stroke-dasharray: 3 3;
	}
	.queue .qn {
		font-family: var(--dl-font-code);
		fill: var(--dl-text-muted);
	}
	.item rect {
		fill: color-mix(in oklab, var(--dl-kind-1-fg) 30%, var(--dl-surface-raised));
		stroke: var(--dl-kind-1-fg);
		stroke-width: 1.5;
	}
	.item.fresh rect {
		stroke: var(--dl-done);
		stroke-width: 2.5;
	}
	.item text {
		font-family: var(--dl-font-code);
		font-size: 15px;
	}
	.node.dim {
		filter: saturate(0.55);
	}
	.node.gone {
		filter: grayscale(1);
	}
	.ring {
		fill: none;
		stroke: var(--dl-now);
		stroke-width: 3;
	}
	.nl .nm {
		font-size: 16px;
		font-weight: 700;
	}
	.nl .sb {
		font-family: var(--dl-font-code);
		fill: var(--dl-text-muted);
	}
	.tn rect {
		fill: var(--dl-kind-3-bg);
		stroke: var(--dl-kind-3-fg);
	}
	.tn text {
		fill: var(--dl-kind-3-fg);
		font-weight: 600;
	}
	.badge rect {
		fill: var(--dl-surface-raised);
		stroke: var(--dl-done);
		stroke-width: 2;
	}
	.badge.warn rect {
		stroke: var(--dl-warn);
	}
	.badge.bad rect {
		stroke: var(--dl-wrong);
		fill: color-mix(in oklab, var(--dl-wrong) 18%, var(--dl-surface-raised));
	}
	.badge text {
		font-family: var(--dl-font-code);
		font-weight: 700;
	}
	.ctxtag rect {
		fill: var(--dl-surface-raised);
		stroke: var(--c);
		stroke-width: 2;
	}
	.ctxtag text {
		font-weight: 700;
	}
	.packet {
		cursor: pointer;
	}
	.packet rect {
		stroke-width: 2;
		fill: var(--dl-surface-raised);
	}
	.packet.k1 rect {
		stroke: var(--dl-kind-1-fg);
		fill: var(--dl-kind-1-bg);
	}
	.packet.k2 rect {
		stroke: var(--dl-kind-2-fg);
		fill: var(--dl-kind-2-bg);
	}
	.packet.k3 rect {
		stroke: var(--dl-kind-3-fg);
		fill: var(--dl-kind-3-bg);
	}
	.packet.k4 rect {
		stroke: var(--dl-kind-4-fg);
		fill: var(--dl-kind-4-bg);
	}
	.packet.k5 rect {
		stroke: var(--dl-kind-5-fg);
		fill: var(--dl-kind-5-bg);
	}
	.packet text {
		font-family: var(--dl-font-code);
		font-weight: 700;
	}
	.packet.stall rect,
	.packet.drop rect {
		stroke: var(--dl-wrong);
	}
	.packet .x {
		fill: var(--dl-wrong);
		font-weight: 700;
	}
</style>
