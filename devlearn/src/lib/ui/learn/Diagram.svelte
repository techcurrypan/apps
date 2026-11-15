<script lang="ts">
	// 学習画面の図（screen-design.md 11.3・LS-D）。描くのは (出来事, 段階, t) から決まる物だけ。
	// 視点（拡大・縮小・移動）は見る人の操作で、状態ではない。
	import type { Lesson } from '../../lesson/types.ts';
	import { fit, lerpView, pan, percent, toWorld, zoomAt, type View } from '../../learn/camera.ts';
	import {
		at as curveAt,
		boundsOf,
		pairKey,
		tangent,
		textW,
		type Geometry
	} from '../../learn/geometry.ts';
	import { iconOf } from '../../learn/icons.ts';
	import { beatsOf, beatTarget, nodesAt, type Phase } from '../../learn/model.ts';

	type Props = {
		lesson: Lesson;
		geo: Geometry;
		k: number;
		phase: Phase;
		t: number;
		view: 'map' | 'seq';
		town: boolean;
		follow: boolean;
		kindOf: (kind: string) => number;
		reduced: boolean;
		/** 押せる出来事の上限（済んだ物だけ押せる） */
		reach: number;
		ongo: (k: number) => void;
		onnode?: (id: string) => void;
		onview: (v: 'map' | 'seq') => void;
		ontown: (on: boolean) => void;
		onfollow: (on: boolean) => void;
		/** 思い出すのとき：機械を押して答える。流れの番号は出さない */
		recall?: boolean;
		/** 図の名前（読み上げ） */
		alt: string;
	};
	let {
		lesson,
		geo,
		k,
		phase,
		t,
		view,
		town,
		follow,
		kindOf,
		reduced,
		reach,
		ongo,
		onnode,
		onview,
		ontown,
		onfollow,
		recall = false,
		alt
	}: Props = $props();

	const beats = $derived(beatsOf(lesson));
	const beat = $derived(beats[k] ?? beats[0]);
	const nodes = $derived(nodesAt(lesson, k, phase));
	const live = $derived(new Map(nodes.map((n) => [n.id, n])));
	const visibleLinks = $derived(geo.links.filter((l) => live.has(l.a) && live.has(l.b)));

	let box = $state<HTMLDivElement>();
	let pw = $state(800);
	let ph = $state(420);
	$effect(() => {
		if (!box) return;
		const ro = new ResizeObserver(() => {
			pw = box?.clientWidth ?? 800;
			ph = box?.clientHeight ?? 420;
		});
		ro.observe(box);
		return () => ro.disconnect();
	});
	const aspect = $derived(pw / Math.max(1, ph));
	const all = $derived(fit(geo.bounds, aspect));
	/** 字が 10px を割らない広さ（図の字は 12.5 以上。0.8 倍まで）。それより広い枠は中心に寄せる（LS-A7） */
	const MIN_SCALE = 0.8;
	const legible = (v: View): View =>
		pw / v.w >= MIN_SCALE
			? v
			: zoomAt(v, v.w / (pw / MIN_SCALE), { x: v.x + v.w / 2, y: v.y + v.h / 2 });

	// 視点。動きに寄る間は、章や出来事が変わったときだけ寄る（LS-D10）
	let shown = $state<View>({ x: 0, y: 0, w: 1000, h: 600 });
	let camAnim = 0;
	function focusIds(): string[] {
		if (k === 0 || !beat) return geo.nodes.map((n) => n.id);
		const st = lesson.explain[beat.step - 1];
		const ids: string[] = [];
		for (const b of beats) if (b.step === beat.step && b.move) ids.push(b.move.from, b.move.to);
		for (const o of st.scene) if (o.op !== 'move') ids.push(o.id);
		const have = ids.filter((id, i) => ids.indexOf(id) === i && geo.nodes.some((n) => n.id === id));
		return have.length >= 1 ? have : geo.nodes.map((n) => n.id);
	}
	function glide(to: View) {
		cancelAnimationFrame(camAnim);
		const from = { ...shown };
		if (reduced) {
			shown = to;
			return;
		}
		const t0 = performance.now();
		const tick = (now: number) => {
			const u = Math.min(1, (now - t0) / 420);
			const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
			shown = lerpView(from, to, e);
			if (u < 1) camAnim = requestAnimationFrame(tick);
		};
		camAnim = requestAnimationFrame(tick);
	}
	let lastFocus = '';
	$effect(() => {
		// 章・出来事・画面の大きさが変わったとき
		const key = `${lesson.id}:${k}:${Math.round(aspect * 100)}:${follow}`;
		if (key === lastFocus) return;
		const first = lastFocus === '' || !lastFocus.startsWith(lesson.id + ':');
		lastFocus = key;
		if (first) {
			shown = legible(all);
			return;
		}
		if (!follow) return;
		const ids = focusIds();
		const r = boundsOf(geo, ids);
		const target = fit(r, aspect);
		// 全体より大きくはしない・細かく寄りすぎない
		const sized =
			target.w > all.w
				? all
				: target.w < 360
					? zoomAt(target, target.w / 360, {
							x: target.x + target.w / 2,
							y: target.y + target.h / 2
						})
					: target;
		glide(legible(sized));
	});

	// ---- 操作（LS-D9・D11） ----
	// 押している指（見た目の操作だけに使う。描画は読まない）
	const fingers: Record<number, { x: number; y: number }> = {};
	const count = () => Object.keys(fingers).length;
	const both = () => Object.values(fingers);
	let dragged = false;
	let down: { x: number; y: number } | null = null;
	let pinch0 = 0;
	function userMoved() {
		if (follow) onfollow(false);
	}
	function setCam(v: View) {
		cancelAnimationFrame(camAnim);
		shown = v;
	}
	function onpointerdown(e: PointerEvent) {
		if (view !== 'map') return;
		(e.currentTarget as Element).setPointerCapture?.(e.pointerId);
		fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
		down = { x: e.clientX, y: e.clientY };
		dragged = false;
		if (count() === 2) {
			const [a, b] = both();
			pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
		}
	}
	function onpointermove(e: PointerEvent) {
		const p = fingers[e.pointerId];
		if (!p) return;
		if (count() === 2) {
			fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
			const [a, b] = both();
			const d = Math.hypot(a.x - b.x, a.y - b.y);
			if (pinch0 > 0 && d > 0) {
				const r = box?.getBoundingClientRect();
				const mid = toWorld(
					shown,
					(a.x + b.x) / 2 - (r?.left ?? 0),
					(a.y + b.y) / 2 - (r?.top ?? 0),
					pw,
					ph
				);
				setCam(zoomAt(shown, d / pinch0, mid));
				pinch0 = d;
				dragged = true;
				userMoved();
			}
			return;
		}
		const dx = e.clientX - p.x;
		const dy = e.clientY - p.y;
		fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
		if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) {
			dragged = true;
			userMoved();
		}
		if (dragged) setCam(pan(shown, dx, dy, pw));
	}
	function onpointerup(e: PointerEvent) {
		delete fingers[e.pointerId];
		if (count() < 2) pinch0 = 0;
		down = null;
	}
	function onclickcapture(e: MouseEvent) {
		// ドラッグの後に、指を離した所の物を押さない（LS-D11）
		if (dragged) {
			e.stopPropagation();
			e.preventDefault();
			dragged = false;
		}
	}
	function onwheel(e: WheelEvent) {
		if (view !== 'map') return;
		e.preventDefault();
		const r = box?.getBoundingClientRect();
		const p = toWorld(shown, e.clientX - (r?.left ?? 0), e.clientY - (r?.top ?? 0), pw, ph);
		setCam(zoomAt(shown, Math.exp(-e.deltaY * 0.0015), p));
		userMoved();
	}
	function ondblclick(e: MouseEvent) {
		if (view !== 'map') return;
		const r = box?.getBoundingClientRect();
		const p = toWorld(shown, e.clientX - (r?.left ?? 0), e.clientY - (r?.top ?? 0), pw, ph);
		setCam(zoomAt(shown, 1.6, p));
		userMoved();
	}
	$effect(() => {
		// ホイールは受け身でない聞き手にする（ページを動かさないため）
		const el = box;
		if (!el) return;
		el.addEventListener('wheel', onwheel, { passive: false });
		return () => el.removeEventListener('wheel', onwheel);
	});
	const zoomBy = (f: number) => {
		setCam(zoomAt(shown, f, { x: shown.x + shown.w / 2, y: shown.y + shown.h / 2 }));
		userMoved();
	};

	// ---- 荷物（LS-M1） ----
	const parcel = $derived.by(() => {
		if (phase !== 'moving' || !beat?.move) return null;
		const m = beat.move;
		if (m.from === m.to) return null;
		const g = geo.links.find((x) => pairKey(x.a, x.b) === pairKey(m.from, m.to));
		if (!g) return null;
		const u = g.a === m.from ? t : 1 - t;
		const p = curveAt(g.q, u);
		const label = m.payload;
		const w = Math.max(textW(label, 12.5), textW(m.kind, 11)) + 22;
		return { x: p.x, y: p.y, label, sub: m.kind, w, slot: kindOf(m.kind) };
	});
	const ring = $derived.by(() => {
		if (phase !== 'moving' || k === 0) return null;
		if (beat?.move && beat.move.from !== beat.move.to) return null;
		const id = beat ? beatTarget(beat) : null;
		const n = geo.nodes.find((x) => x.id === id);
		return n ? { x: n.c.x, y: n.c.y, r: 30 + 34 * t, o: 1 - t } : null;
	});
	const flowLink = $derived(
		beat?.move && phase !== 'after' ? pairKey(beat.move.from, beat.move.to) : null
	);
	const doneMarks = $derived(
		geo.marks.filter((m) => m.k <= (phase === 'after' ? k : k - 1) || m.k === k)
	);
	const slotOfBeat = (kk: number) => {
		const b = beats[kk];
		const st = b?.step ? lesson.explain[b.step - 1] : null;
		return kindOf(b?.move?.kind ?? st?.log.kind ?? '');
	};

	// ---- 時系列（LS-D12） ----
	const lanes = $derived.by(() => {
		const ids: string[] = [];
		for (const b of beats)
			if (b.move) for (const id of [b.move.from, b.move.to]) if (!ids.includes(id)) ids.push(id);
		for (const n of geo.nodes) if (ids.length < 2 && !ids.includes(n.id)) ids.push(n.id);
		return ids;
	});
	const seq = $derived.by(() => {
		const n = lanes.length;
		const x = new Map(lanes.map((id, i) => [id, 150 + (n === 1 ? 0 : (i * 760) / (n - 1))]));
		const rows:
			{ kind: 'head'; y: number; text: string } | { kind: 'row'; y: number; k: number }[] = [];
		const out: (
			{ kind: 'head'; y: number; text: string } | { kind: 'row'; y: number; k: number }
		)[] = [];
		let y = 110;
		let last = -1;
		const upto = phase === 'after' ? k : k - 1;
		for (const b of beats) {
			if (b.k === 0 || b.k > upto) continue;
			if (b.step !== last) {
				out.push({ kind: 'head', y, text: `${b.step} ・ ${lesson.explain[b.step - 1].title}` });
				y += 24;
				last = b.step;
			}
			out.push({ kind: 'row', y, k: b.k });
			y += 46;
		}
		void rows;
		return { x, rows: out, h: Math.max(420, y + 30) };
	});
	const labelOf = (id: string) => geo.nodes.find((n) => n.id === id);

	const arrow = (x: number, y: number, ang: number, s = 9) =>
		`${x},${y} ${x - s * Math.cos(ang - 0.45)},${y - s * Math.sin(ang - 0.45)} ${x - s * Math.cos(ang + 0.45)},${y - s * Math.sin(ang + 0.45)}`;
	const q2d = (q: {
		a: { x: number; y: number };
		c: { x: number; y: number };
		b: { x: number; y: number };
	}) => `M${q.a.x} ${q.a.y}Q${q.c.x} ${q.c.y} ${q.b.x} ${q.b.y}`;
	const viewBox = $derived(
		view === 'map' ? `${shown.x} ${shown.y} ${shown.w} ${shown.h}` : `0 0 1000 ${seq.h}`
	);
	const pct = $derived(percent(shown, all));
</script>

<div class="tools" role="toolbar" aria-label="図の操作">
	<div class="seg" role="group" aria-label="表し方">
		<button type="button" aria-pressed={view === 'map'} onclick={() => onview('map')}>◇ 図</button>
		<button type="button" aria-pressed={view === 'seq'} onclick={() => onview('seq')}
			>⇄ 時系列</button
		>
	</div>
	<label class="chk"
		><input type="checkbox" checked={town} onchange={(e) => ontown(e.currentTarget.checked)} /> 名札（町）</label
	>
	<span class="sp"></span>
	{#if view === 'map'}
		<button type="button" class="sq" aria-label="縮める" onclick={() => zoomBy(1 / 1.25)}>−</button>
		<span class="pct" aria-live="polite">{pct}%</span>
		<button type="button" class="sq" aria-label="広げる" onclick={() => zoomBy(1.25)}>＋</button>
		<button
			type="button"
			onclick={() => {
				setCam(all);
			}}>全体</button
		>
		<label class="chk"
			><input
				type="checkbox"
				checked={follow}
				onchange={(e) => onfollow(e.currentTarget.checked)}
			/> 動きに寄る</label
		>
	{/if}
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="dia"
	class:seq={view === 'seq'}
	bind:this={box}
	style:height={view === 'seq' ? `${Math.round((pw * seq.h) / 1000)}px` : undefined}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
	onpointercancel={onpointerup}
	{onclickcapture}
	{ondblclick}
>
	<svg
		{viewBox}
		preserveAspectRatio={view === 'map' ? 'xMidYMid meet' : 'xMidYMin meet'}
		role="img"
		aria-label={alt}
	>
		{#if view === 'map'}
			<!-- 区画 -->
			{#each geo.zones as z (z.label)}
				<g class="zone">
					<rect x={z.r.x} y={z.r.y} width={z.r.w} height={z.r.h} rx="12" />
					<text class="zt" x={z.r.x + 14} y={z.r.y + 22}>{z.label}</text>
					<text class="zs" x={z.r.x + 14} y={z.r.y + 38}>{z.note}</text>
				</g>
			{/each}
			<!-- 線（向きの矢印） -->
			{#each visibleLinks as l (pairKey(l.a, l.b))}
				{@const flow = flowLink === pairKey(l.a, l.b)}
				<g class="link" class:flow>
					<path d={q2d(l.q)} class:dash={flow && !reduced} />
					{#if l.dir !== 'ba'}
						<polygon points={arrow(l.q.b.x, l.q.b.y, tangent(l.q, 1))} />
					{/if}
					{#if l.dir !== 'ab'}
						<polygon points={arrow(l.q.a.x, l.q.a.y, tangent(l.q, 0) + Math.PI)} />
					{/if}
				</g>
			{/each}
			<!-- 線の名前 -->
			{#each visibleLinks as l (pairKey(l.a, l.b))}
				<g class="ll" transform="translate({l.tag.x} {l.tag.y})">
					<rect width={l.tag.w} height={l.tag.h} rx="4" />
					<text x={l.tag.w / 2} y="16.5">{l.label}</text>
				</g>
			{/each}
			<!-- 機械 -->
			{#each geo.nodes as g (g.id)}
				{@const n = live.get(g.id)}
				{#if n}
					<g
						class="node"
						class:hot={n.hot}
						class:dim={beat?.move && !n.hot && phase !== 'after'}
						class:gone={n.gone}
						class:fresh={n.fresh && phase !== 'after' && !reduced}
						data-node={g.id}
					>
						<g transform="translate({g.c.x} {g.c.y})" class="ico">
							{#each iconOf(g.icon) as s, i (i)}
								<path d={s.d} class:soft={s.soft} class:dot={s.dot} />
							{/each}
						</g>
						<text class="nl" x={g.c.x} y={g.boxes.text.y + 17}>{n.label}</text>
						{#if g.addr}
							<text class="na" x={g.c.x} y={g.boxes.text.y + 34}>{g.addr}</text>
						{/if}
						{#if town && g.town}
							{@const ty = g.boxes.text.y + (g.addr ? 56 : 39)}
							{@const tw = textW('町：' + g.town, 12) + 18}
							<g class="tag" transform="translate({g.c.x - tw / 2} {ty - 13})">
								<rect width={tw} height="22" rx="11" />
								<text x={tw / 2} y="15.5">町：{g.town}</text>
							</g>
						{/if}
						{#each n.props.slice(-2) as p, i (p.k)}
							{@const py =
								g.boxes.text.y + 22 + (g.addr ? 16 : 0) + (town && g.town ? 24 : 0) + i * 16 + 10}
							<text class="np" class:chg={p.old !== null} x={g.c.x} y={py}>
								{p.k}：{#if p.old !== null}<tspan class="old">{p.old}</tspan> →
								{/if}{p.v.length > 20 ? p.v.slice(0, 19) + '…' : p.v}
							</text>
						{/each}
						{#if recall}
							<rect
								class="hit"
								role="button"
								tabindex="0"
								aria-label="{n.label}（町：{g.town}）を選ぶ"
								x={g.boxes.all.x}
								y={g.boxes.all.y}
								width={g.boxes.all.w}
								height={g.boxes.all.h}
								onclick={() => onnode?.(g.id)}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onnode?.(g.id)}
							/>
						{:else if onnode}
							<rect
								class="hit"
								role="button"
								tabindex="-1"
								aria-label="{n.label} の説明"
								x={g.boxes.icon.x}
								y={g.boxes.icon.y}
								width={g.boxes.icon.w}
								height={g.boxes.icon.h}
								onclick={() => onnode?.(g.id)}
								onkeydown={() => {}}
							/>
						{/if}
					</g>
				{/if}
			{/each}
			<!-- 起きたことの番号（LS-D6・D7） -->
			{#if !recall}
				{#each doneMarks as m (m.k)}
					{@const on = m.k === k}
					<g
						class="mark kind-{slotOfBeat(m.k)}"
						class:on
						role="button"
						tabindex="-1"
						aria-label="出来事 {m.k} へ"
						onclick={() => m.k <= reach && ongo(m.k)}
						onkeydown={() => {}}
					>
						{#if on}<circle cx={m.x} cy={m.y} r="17" class="halo" />{/if}
						<circle cx={m.x} cy={m.y} r="12" />
						<text x={m.x} y={m.y + 4}>{m.k}</text>
						{#if m.ang !== null}
							<polygon
								points={arrow(m.x + Math.cos(m.ang) * 20, m.y + Math.sin(m.ang) * 20, m.ang, 7)}
							/>
						{/if}
					</g>
				{/each}
			{/if}
			<!-- 自分への出来事の輪（LS-M3） -->
			{#if ring}
				<circle
					class="ring kind-{slotOfBeat(k)}"
					cx={ring.x}
					cy={ring.y}
					r={ring.r}
					opacity={ring.o}
				/>
			{/if}
			<!-- 荷物 -->
			{#if parcel}
				<g class="parcel kind-{parcel.slot}" pointer-events="none">
					<circle cx={parcel.x} cy={parcel.y} r="15" class="glow" />
					<circle cx={parcel.x} cy={parcel.y} r="7" />
					<g transform="translate({parcel.x - parcel.w / 2} {parcel.y - 64})">
						<rect width={parcel.w} height="40" rx="5" />
						<text x="11" y="17" class="pl">{parcel.label}</text>
						<text x="11" y="32" class="ps">{parcel.sub}</text>
					</g>
				</g>
			{/if}
		{:else}
			<!-- 時系列 -->
			{#each lanes as id (id)}
				{@const g = labelOf(id)}
				{@const x = seq.x.get(id) ?? 0}
				<text class="nl" {x} y="34">{g?.label ?? id}</text>
				{#if g?.addr}<text class="na" {x} y="50">{g.addr}</text>{/if}
				{#if town && g?.town}<text class="lt" {x} y="68">町：{g.town}</text>{/if}
				<line class="lane" x1={x} y1="80" x2={x} y2={seq.h} />
			{/each}
			{#each seq.rows as r, i (i)}
				{#if r.kind === 'head'}
					<text class="sh" x="14" y={r.y}>{r.text}</text>
				{:else}
					{@const b = beats[r.k]}
					{@const st = lesson.explain[b.step - 1]}
					{@const from = b.move?.from ?? lanes[0]}
					{@const to = b.move?.to ?? from}
					{@const x1 = seq.x.get(from) ?? seq.x.get(lanes[0]) ?? 150}
					{@const x2 = seq.x.get(to) ?? x1}
					{@const label = b.move?.payload ?? st.log.info}
					<g
						class="srow kind-{slotOfBeat(r.k)}"
						class:on={r.k === k}
						role="button"
						tabindex="-1"
						aria-label="出来事 {r.k} へ"
						onclick={() => ongo(r.k)}
						onkeydown={() => {}}
					>
						<text class="st" x="14" y={r.y + 14}>{st.log.t}</text>
						<circle cx={Math.min(x1, x2) - 24} cy={r.y + 10} r="11" />
						<text class="sn" x={Math.min(x1, x2) - 24} y={r.y + 14}>{r.k}</text>
						{#if x1 === x2}
							<path d="M{x1} {r.y} h40 v20 h-34" />
							<polygon points={arrow(x1 + 2, r.y + 20, Math.PI, 8)} />
							<text class="slab" x={x1 + 50} y={r.y + 14}>{label}</text>
						{:else}
							<line {x1} y1={r.y} {x2} y2={r.y + 22} />
							<polygon points={arrow(x2, r.y + 22, Math.atan2(22, x2 - x1), 10)} />
							<text class="slab" x={(x1 + x2) / 2} y={r.y + 4} text-anchor="middle">{label}</text>
						{/if}
					</g>
				{/if}
			{/each}
			{#if seq.rows.length === 0}
				<text class="empty" x="500" y="200">まだ何も起きていない</text>
			{/if}
		{/if}
	</svg>
</div>

<style>
	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--dl-border);
	}
	.sp {
		flex: 1;
	}
	.seg {
		display: flex;
		gap: 2px;
		padding: 2px;
		border: 1px solid var(--dl-border);
		border-radius: 6px;
	}
	.seg button,
	.tools > button {
		min-height: 34px;
		padding: 0 10px;
		font-size: 13px;
	}
	.seg button[aria-pressed='true'] {
		background: var(--dl-surface-raised);
		color: var(--dl-text);
		font-weight: 700;
		box-shadow: inset 0 0 0 1px var(--dl-border-strong);
	}
	.sq {
		width: 34px;
		padding: 0;
	}
	.pct {
		font-family: var(--dl-font-code);
		font-size: 12px;
		color: var(--dl-text-muted);
		min-width: 3.4em;
		text-align: center;
	}
	.chk {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--dl-text-muted);
		min-height: 34px;
		padding: 0 4px;
		cursor: pointer;
	}
	.dia {
		position: relative;
		height: min(40vh, 420px);
		min-height: 384px;
		background:
			linear-gradient(color-mix(in srgb, var(--dl-text) 4%, transparent) 1px, transparent 1px) 0 0 /
				32px 32px,
			linear-gradient(
					90deg,
					color-mix(in srgb, var(--dl-text) 4%, transparent) 1px,
					transparent 1px
				)
				0 0 / 32px 32px,
			var(--dl-surface);
		touch-action: none;
		cursor: grab;
		user-select: none;
	}
	.dia.seq {
		min-height: 300px;
		cursor: default;
		touch-action: auto;
	}
	svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.zone rect {
		fill: color-mix(in srgb, var(--dl-now) 4%, transparent);
		stroke: color-mix(in srgb, var(--dl-now) 45%, transparent);
		stroke-width: 1.3;
		stroke-dasharray: 5 5;
	}
	.zt {
		font: 700 14px var(--dl-font);
		fill: var(--dl-now);
	}
	.zs {
		font: 500 12.5px var(--dl-font-code);
		fill: var(--dl-text-muted);
	}
	.link path {
		fill: none;
		stroke: var(--dl-border-strong);
		stroke-width: 1.8;
	}
	.link polygon {
		fill: var(--dl-text-muted);
	}
	.link.flow path {
		stroke: var(--dl-now);
		stroke-width: 3;
	}
	.link.flow polygon {
		fill: var(--dl-now);
	}
	.dash {
		stroke-dasharray: 7 7;
		animation: dash 1s linear infinite;
	}
	@keyframes dash {
		to {
			stroke-dashoffset: -14;
		}
	}
	.ll rect {
		fill: var(--dl-surface);
		stroke: var(--dl-border);
	}
	.ll text {
		font: 500 12.5px var(--dl-font);
		fill: var(--dl-text-muted);
		text-anchor: middle;
	}
	.ico path {
		fill: none;
		stroke: var(--dl-text);
		stroke-width: 1.8;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.ico path.soft {
		fill: color-mix(in srgb, var(--dl-text) 6%, transparent);
	}
	.ico path.dot {
		fill: var(--dl-text);
	}
	.node.hot .ico path {
		stroke: var(--dl-now);
	}
	.node.hot .ico path.soft {
		fill: color-mix(in srgb, var(--dl-now) 14%, transparent);
	}
	.node.hot .ico path.dot {
		fill: var(--dl-now);
	}
	.node.dim {
		opacity: 0.55;
	}
	.node.gone {
		opacity: 0.4;
	}
	.node.gone .ico path {
		stroke-dasharray: 4 4;
	}
	.node.fresh {
		animation: fadein 0.5s ease-out;
	}
	@keyframes fadein {
		from {
			opacity: 0;
		}
	}
	.nl {
		font: 700 15px var(--dl-font);
		fill: var(--dl-text);
		text-anchor: middle;
	}
	.node.hot .nl {
		fill: var(--dl-now);
	}
	.na {
		font: 500 12.5px var(--dl-font-code);
		fill: var(--dl-text-muted);
		text-anchor: middle;
	}
	.tag rect {
		fill: color-mix(in srgb, var(--dl-warn) 10%, var(--dl-surface));
		stroke: var(--dl-warn);
	}
	.tag text,
	.lt {
		font: 700 12.5px var(--dl-font);
		fill: var(--dl-warn);
		text-anchor: middle;
	}
	.np {
		font: 500 12.5px var(--dl-font-code);
		fill: var(--dl-text-muted);
		text-anchor: middle;
	}
	.np.chg {
		fill: var(--dl-done);
		font-weight: 700;
	}
	.np .old {
		text-decoration: line-through;
		fill: var(--dl-text-muted);
	}
	.hit {
		fill: transparent;
		cursor: pointer;
	}
	.hit:focus-visible {
		outline: none;
		stroke: var(--dl-focus);
		stroke-width: 3;
	}
	.mark {
		cursor: pointer;
	}
	.mark circle:not(.halo),
	.mark polygon {
		fill: var(--k-fg);
	}
	.mark text {
		font: 700 12.5px var(--dl-font-code);
		fill: var(--dl-surface);
		text-anchor: middle;
	}
	.halo {
		fill: none;
		stroke: var(--dl-warn);
		stroke-width: 2.5;
	}
	.ring {
		fill: none;
		stroke: var(--k-fg);
		stroke-width: 2.5;
	}
	.parcel circle {
		fill: var(--k-fg);
	}
	.parcel .glow {
		opacity: 0.25;
	}
	.parcel rect {
		fill: var(--dl-surface);
		stroke: var(--k-fg);
		stroke-width: 1.5;
	}
	.pl {
		font: 700 13.5px var(--dl-font);
		fill: var(--k-fg);
	}
	.ps {
		font: 500 12.5px var(--dl-font-code);
		fill: var(--dl-text-muted);
	}
	.lane {
		stroke: var(--dl-border-strong);
		stroke-dasharray: 3 5;
	}
	.sh {
		font: 500 13px var(--dl-font);
		fill: var(--dl-text-muted);
	}
	.srow {
		cursor: pointer;
	}
	.srow line,
	.srow path {
		stroke: var(--k-fg);
		stroke-width: 1.8;
		fill: none;
	}
	.srow.on line,
	.srow.on path {
		stroke-width: 3.2;
	}
	.srow polygon,
	.srow circle {
		fill: var(--k-fg);
	}
	.st {
		font: 500 12.5px var(--dl-font-code);
		fill: var(--dl-text-muted);
	}
	.sn {
		font: 700 12.5px var(--dl-font-code);
		fill: var(--dl-surface);
		text-anchor: middle;
	}
	.slab {
		font: 700 13px var(--dl-font-code);
		fill: var(--k-fg);
	}
	.empty {
		font: 14px var(--dl-font);
		fill: var(--dl-text-muted);
		text-anchor: middle;
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
	@media (prefers-reduced-motion: reduce) {
		.dash,
		.node.fresh {
			animation: none;
		}
	}
	@media (max-width: 860px) {
		.dia:not(.seq) {
			height: 38vh;
			min-height: 230px;
		}
	}
</style>
