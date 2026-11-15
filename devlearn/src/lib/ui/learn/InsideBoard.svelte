<script lang="ts">
	// 中身の板（screen-design.md 11.4・LS-I）。荷物の中身・OS の中・ログを、タブにせず 1 画面に並べる。
	// 出来事を 1 つ進めると 3 つが一緒に変わる。内側のスクロールを作らず、長い物は畳む。
	import type { Packet } from '../../lesson/types.ts';
	import type { InsideView } from '../../learn/model.ts';
	import type { Depth } from '../../learn/prefs.ts';

	type Props = {
		inside: InsideView;
		depth: Depth;
		/** 荷物の番号・送り元 → 宛先・種類（荷物の出来事の） */
		head: { k: number; from: string; to: string; kind: string; slot: number } | null;
		reduced: boolean;
		slotOfStep: (step: number) => number;
		ongo: (k: number) => void;
		/** 荷物が無い出来事で出す、直前の荷物 */
		lastPacket: {
			packet: Packet;
			k: number;
			from: string;
			to: string;
			kind: string;
			slot: number;
		} | null;
	};
	let { inside, depth, head, reduced, slotOfStep, ongo, lastPacket }: Props = $props();

	const shown = $derived(
		inside.packet && head
			? { packet: inside.packet, ...head, now: true }
			: lastPacket
				? { ...lastPacket, now: false }
				: null
	);
	const bytes = $derived.by(() => {
		const h = shown?.packet.hex?.replace(/\s+/g, '') ?? '';
		const out: number[] = [];
		for (let i = 0; i + 1 < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
		return out;
	});
	const partBytes = (p: Packet['parts'][number]) =>
		p.fields.reduce((a, f) => a + (f.at?.[1] ?? 0), 0);
	const totalBytes = $derived(shown ? shown.packet.parts.reduce((a, p) => a + partBytes(p), 0) : 0);
	const PART_COLORS = [
		'var(--dl-kind-5-fg)',
		'var(--dl-kind-1-fg)',
		'var(--dl-kind-3-fg)',
		'var(--dl-kind-4-fg)',
		'var(--dl-kind-2-fg)'
	];

	let hl = $state<[number, number] | null>(null);
	let hexOpen = $state(false);
	let logOpen = $state(false);
	$effect(() => {
		void shown?.k;
		hl = null;
		hexOpen = false;
	});
	const ROW = 16;
	const hexRows = $derived(Math.ceil(bytes.length / ROW));
	const hexLimit = $derived(depth >= 3 || hexOpen ? hexRows : 4);
	const isHl = (i: number) => hl !== null && i >= hl[0] && i < hl[0] + hl[1];
	const ch = (b: number) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·');

	const LOG_MAX = 6;
	const logs = $derived(logOpen ? inside.logs : inside.logs.slice(0, LOG_MAX));
	const markText = {
		new: 'いまの出来事で増えた',
		chg: 'いまの出来事で変わった',
		gone: 'いまの出来事で消えた',
		same: ''
	};
</script>

<section class="inside" aria-label="中身の板（荷物の中身・OS の中・ログ）">
	<div class="col pk">
		<div class="ih">
			<h3>荷物の中身</h3>
			<small
				>{shown
					? inside.sending
						? '送っている途中…'
						: shown.now
							? '届いた'
							: '直前に運んだ物'
					: '町：運ばれる物の中身'}</small
			>
		</div>
		{#if shown}
			{@const p = shown.packet}
			<div class="pkh">
				<span class="n kind-{shown.slot}">{shown.k}</span>
				<b>{p.name}</b>
				<span class="pr">{shown.from} → {shown.to} ・ {shown.kind} ・ {p.size}</span>
			</div>
			<div class="pbar" class:go={inside.sending && !reduced} aria-hidden="true">
				{#each p.parts as part, i (i)}
					{@const n = partBytes(part)}
					<i
						style:flex-grow={n}
						style:background={PART_COLORS[i % PART_COLORS.length]}
						title="{part.name} {n} B"
						data-bytes={n}
					>
						<span>{part.name}</span>
					</i>
				{/each}
				<span class="sweep"></span>
			</div>
			<div class="pbl"><span>外側</span><span>{totalBytes} B</span><span>中身</span></div>
			<div class="pfl">
				{#each p.parts as part, i (i)}
					{@const fs = part.fields.filter((f) => f.level <= depth)}
					{@const hidden = part.fields.length - fs.length}
					<div class="pl" style:--c={PART_COLORS[i % PART_COLORS.length]}>
						<h5>{part.name} <small>{partBytes(part)} B</small></h5>
						{#each fs as f (f.k)}
							<div
								class="pf"
								class:hl={hl !== null && f.at !== undefined && hl[0] === f.at[0]}
								role="button"
								tabindex="0"
								onmouseenter={() => (hl = f.at ?? null)}
								onfocus={() => (hl = f.at ?? null)}
								onmouseleave={() => (hl = null)}
								onblur={() => (hl = null)}
								onkeydown={() => {}}
							>
								<span class="fn">{f.k}</span><span class="fv">{f.v}</span>
							</div>
						{/each}
						{#if hidden > 0}
							<div class="more">ほか {hidden} 欄（詳しさを上げると出る）</div>
						{/if}
					</div>
				{/each}
			</div>
			{#if depth >= 2 && bytes.length > 0}
				<div class="hexs" aria-label="16 進のバイト列">
					{#each Array.from({ length: Math.min(hexRows, hexLimit) }, (_, r) => r) as r (r)}
						<div class="hx">
							<span class="o">{(r * ROW).toString(16).padStart(4, '0')}</span>
							<span class="h"
								>{#each bytes.slice(r * ROW, r * ROW + ROW) as b, j (j)}<i
										class:hl={isHl(r * ROW + j)}>{b.toString(16).padStart(2, '0')}</i
									>{/each}</span
							>
							<span class="a"
								>{#each bytes.slice(r * ROW, r * ROW + ROW) as b, j (j)}<i
										class:hl={isHl(r * ROW + j)}>{ch(b)}</i
									>{/each}</span
							>
						</div>
					{/each}
					{#if hexLimit < hexRows}
						<button type="button" class="more" onclick={() => (hexOpen = true)}
							>ほか {hexRows - hexLimit} 行（{bytes.length - hexLimit * ROW} バイト）を出す</button
						>
					{/if}
				</div>
			{:else if bytes.length > 0}
				<div class="more">16 進のバイト列は、詳しさ「現場」から出る</div>
			{/if}
		{:else}
			<p class="none">この出来事までに、運ばれた荷物は無い。</p>
		{/if}
	</div>

	<div class="col os">
		<div class="ih">
			<h3>OS の中</h3>
			<small>プロセス・つながり・ファイル ・ 町：機械の中で働く人と回線</small>
		</div>
		{#if inside.hosts.length === 0}
			<p class="none">この出来事では、OS の中を見る物が無い。</p>
		{/if}
		<div class="hosts">
			{#each inside.hosts as h (h.name)}
				<div class="host" class:changed={h.changed}>
					<div class="hn"><b>{h.name}（{h.town}）</b><span>{h.addr}</span></div>
					{#each h.rows as r (r.id + r.mark)}
						<div class="row {r.mark} {r.tone ?? ''}" class:anim={!reduced} style:--d={r.depth}>
							<span class="pt">{r.depth > 0 ? '└ ' : ''}{r.what}</span>
							<span class="ps"
								>{#if r.was}<s>{r.was}</s> →
								{/if}{r.state}</span
							>
							{#if r.mark !== 'same'}<span class="mk">{markText[r.mark]}</span>{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<div class="col lg">
		<div class="ih">
			<h3>ログ</h3>
			<small>新しい行が上 ・ 町：管理人と各機械の日誌</small>
		</div>
		{#if inside.waiting}
			<div class="lwait" class:anim={!reduced}>届くと、ここに 1 行増える…</div>
		{/if}
		{#if inside.logs.length === 0 && !inside.waiting}
			<p class="none">まだ書かれた行は無い。</p>
		{/if}
		<div class="logs">
			{#each logs as l, i (l.step + ':' + i + ':' + l.text)}
				<button
					type="button"
					class="lrow kind-{slotOfStep(l.step)}"
					class:new={l.fresh}
					class:anim={!reduced}
					onclick={() => ongo(l.k)}
				>
					<span class="n">{l.k}</span>
					<span class="tm">{l.t}</span>
					<span class="src">{l.src}</span>
					<span class="lt">{l.text}</span>
				</button>
			{/each}
		</div>
		{#if inside.logs.length > LOG_MAX && !logOpen}
			<button type="button" class="more" onclick={() => (logOpen = true)}
				>前に {inside.logs.length - LOG_MAX} 行</button
			>
		{/if}
	</div>
</section>

<style>
	.inside {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		background: var(--dl-surface);
		border: 1px solid var(--dl-border);
		border-radius: 8px;
		min-width: 0;
	}
	.col {
		padding: 10px 12px 12px;
		min-width: 0;
		border-left: 1px solid var(--dl-border);
	}
	.col:first-child {
		border-left: 0;
	}
	.ih {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 8px;
	}
	.ih h3 {
		margin: 0;
		font-size: 14px;
		white-space: nowrap;
	}
	.ih small {
		font-size: 11px;
		color: var(--dl-text-muted);
		text-align: right;
	}
	.none {
		margin: 0;
		font-size: 12.5px;
		color: var(--dl-text-muted);
	}
	.pkh {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		margin-bottom: 8px;
	}
	.pkh b {
		font-size: 13.5px;
	}
	.pr {
		font: 500 11.5px var(--dl-font-code);
		color: var(--dl-text-muted);
		width: 100%;
	}
	.n {
		display: inline-grid;
		place-items: center;
		min-width: 20px;
		height: 20px;
		border-radius: 10px;
		font: 700 11px var(--dl-font-code);
		color: var(--dl-surface);
		background: var(--k-fg);
	}
	.pbar {
		position: relative;
		display: flex;
		height: 22px;
		gap: 2px;
		border-radius: 4px;
		overflow: hidden;
	}
	.pbar i {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-basis: 0;
		min-width: 0;
		font: 700 10px var(--dl-font-code);
		color: var(--dl-surface);
		font-style: normal;
		overflow: hidden;
		white-space: nowrap;
	}
	.pbar i span {
		overflow: hidden;
		padding: 0 2px;
	}
	.sweep {
		position: absolute;
		inset: 0;
		width: 30%;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--dl-surface) 80%, transparent),
			transparent
		);
		transform: translateX(-100%);
		display: none;
	}
	.pbar.go .sweep {
		display: block;
		animation: sweep 0.9s linear infinite;
	}
	.pbar.go i {
		opacity: 0.45;
	}
	@keyframes sweep {
		to {
			transform: translateX(340%);
		}
	}
	.pbl {
		display: flex;
		justify-content: space-between;
		font: 500 10.5px var(--dl-font-code);
		color: var(--dl-text-muted);
		margin: 2px 0 8px;
	}
	.pfl {
		display: grid;
		gap: 6px;
	}
	.pl h5 {
		margin: 0 0 2px;
		font-size: 12px;
		padding-left: 6px;
		border-left: 3px solid var(--c);
	}
	.pl h5 small {
		color: var(--dl-text-muted);
		font: 500 10.5px var(--dl-font-code);
	}
	.pf {
		display: grid;
		grid-template-columns: minmax(80px, 40%) 1fr;
		gap: 8px;
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 3px;
		cursor: default;
	}
	.pf:hover,
	.pf.hl,
	.pf:focus-visible {
		background: color-mix(in srgb, var(--dl-warn) 16%, transparent);
	}
	.fn {
		color: var(--dl-text-muted);
	}
	.fv {
		font-family: var(--dl-font-code);
		word-break: break-all;
	}
	.more {
		display: block;
		font-size: 11px;
		color: var(--dl-text-muted);
		padding: 2px 6px;
		text-align: left;
	}
	button.more {
		color: var(--dl-now);
		min-height: 28px;
		background: none;
		border: 0;
		cursor: pointer;
	}
	.hexs {
		margin-top: 8px;
		font: 500 11px var(--dl-font-code);
		border-top: 1px dashed var(--dl-border);
		padding-top: 6px;
	}
	.hx {
		display: grid;
		grid-template-columns: 36px auto 1fr;
		gap: 8px;
		line-height: 1.55;
	}
	.hx .o {
		color: var(--dl-text-muted);
	}
	.hx i {
		font-style: normal;
	}
	.hx .h i {
		margin-right: 4px;
	}
	.hx i.hl {
		background: var(--dl-warn);
		color: var(--dl-surface);
		border-radius: 2px;
	}
	.hosts {
		display: grid;
		gap: 8px;
	}
	.host {
		border: 1px solid var(--dl-border);
		border-radius: 6px;
		overflow: hidden;
	}
	.host.changed {
		border-color: var(--dl-border-strong);
	}
	.hn {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding: 4px 8px;
		background: var(--dl-surface-raised);
		font-size: 12px;
	}
	.hn span {
		font: 500 11px var(--dl-font-code);
		color: var(--dl-text-muted);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		column-gap: 10px;
		padding: 3px 8px 3px calc(8px + var(--d) * 14px);
		font-size: 12px;
		align-items: baseline;
		border-top: 1px solid color-mix(in srgb, var(--dl-border) 50%, transparent);
	}
	.pt {
		font-family: var(--dl-font-code);
		min-width: 0;
		word-break: break-all;
	}
	.ps {
		margin-left: auto;
		text-align: right;
		color: var(--dl-text-muted);
		font-size: 11.5px;
	}
	.row.ok .ps {
		color: var(--dl-done);
	}
	.row.warn .ps {
		color: var(--dl-warn);
	}
	.row.bad .ps,
	.row.bad .pt {
		color: var(--dl-wrong);
	}
	.row.new,
	.row.chg {
		box-shadow: inset 3px 0 0 var(--dl-now);
		background: color-mix(in srgb, var(--dl-now) 8%, transparent);
	}
	.row.new.anim,
	.row.chg.anim {
		animation: rowin 1.6s ease-out;
	}
	.row.gone {
		box-shadow: inset 3px 0 0 var(--dl-wrong);
	}
	.row.gone .pt {
		text-decoration: line-through;
		color: var(--dl-wrong);
	}
	.row.gone .ps {
		color: var(--dl-wrong);
	}
	.mk {
		flex-basis: 100%;
		font: 700 10.5px var(--dl-font);
		color: var(--dl-now);
	}
	.row.gone .mk {
		color: var(--dl-wrong);
	}
	@keyframes rowin {
		from {
			background: color-mix(in srgb, var(--dl-now) 35%, transparent);
			transform: translateX(-6px);
		}
	}
	.logs {
		display: grid;
		gap: 2px;
	}
	.lrow {
		display: grid;
		grid-template-columns: 22px auto 1fr;
		gap: 2px 6px;
		align-items: baseline;
		text-align: left;
		padding: 3px 6px;
		border-radius: 4px;
		border: 0;
		background: transparent;
		color: var(--dl-text-muted);
		cursor: pointer;
		font: 500 11.5px/1.45 var(--dl-font-code);
		min-height: 0;
		width: 100%;
	}
	.lrow .n {
		grid-row: span 2;
		height: 18px;
		min-width: 18px;
		font-size: 10px;
	}
	.lrow .tm {
		font-size: 10.5px;
	}
	.lrow .src {
		color: var(--k-fg);
		text-align: right;
	}
	.lrow .lt {
		grid-column: 2 / 4;
		color: var(--dl-text);
		word-break: break-all;
	}
	.lrow:hover {
		background: var(--dl-surface-raised);
	}
	.lrow.new {
		background: color-mix(in srgb, var(--k-fg) 12%, transparent);
	}
	.lrow.new.anim {
		animation: login 0.9s ease-out;
	}
	@keyframes login {
		from {
			transform: translateY(8px);
			opacity: 0;
		}
	}
	.lwait {
		font-size: 12px;
		color: var(--dl-text-muted);
		padding: 6px;
		border: 1px dashed var(--dl-border-strong);
		border-radius: 4px;
		margin-bottom: 4px;
	}
	.lwait.anim {
		animation: blink 1.2s ease-in-out infinite alternate;
	}
	@keyframes blink {
		to {
			opacity: 0.45;
		}
	}
	.kind-1 {
		--k-fg: var(--dl-kind-1-fg);
	}
	.kind-2 {
		--k-fg: var(--dl-kind-2-fg);
	}
	.kind-3 {
		--k-fg: var(--dl-kind-3-fg);
	}
	.kind-4 {
		--k-fg: var(--dl-kind-4-fg);
	}
	.kind-5 {
		--k-fg: var(--dl-kind-5-fg);
	}
	@media (max-width: 1280px) {
		.inside {
			grid-template-columns: 1fr 1fr;
		}
		.lg {
			grid-column: 1 / -1;
			border-left: 0;
			border-top: 1px solid var(--dl-border);
		}
	}
	@media (max-width: 860px) {
		.inside {
			grid-template-columns: 1fr;
		}
		.col {
			border-left: 0;
			border-top: 1px solid var(--dl-border);
		}
		.col:first-child {
			border-top: 0;
		}
		.lrow {
			grid-template-columns: 22px 1fr;
		}
		.lrow .tm {
			display: none;
		}
		.lrow .lt {
			grid-column: 2;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.anim,
		.pbar.go .sweep {
			animation: none !important;
		}
	}
</style>
