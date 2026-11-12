<script lang="ts">
	// キーの一覧（screen-design.md 第 6 章）。
	let dialog = $state<HTMLDialogElement>();

	export function open() {
		dialog?.showModal();
	}

	const rows: [string, string][] = [
		['→ / ←', '次へ / 前へ（解説・例）'],
		['Home / End', '最初 / 最後のステップへ'],
		['1〜9', 'そのステップへ'],
		['R', '今の動きをもう一度'],
		['Space', '自動 / 停止'],
		['- / +', '遅く / 速く'],
		['Shift + ← / →', '前の段 / 次の段'],
		['Tab / Shift + Tab', '釦や欄を順に巡る'],
		['Enter / Space', '押す・選ぶ'],
		['M', '地図へ'],
		['G', '学習 ⇄ 街（街では地図へ、ほかでは街へ）'],
		['T', '配色を切り替える（端末に従う → 明 → 暗）'],
		['?', 'この一覧'],
		['Esc', '閉じる・欄の外へ']
	];
</script>

<dialog bind:this={dialog} aria-labelledby="help-title">
	<h2 id="help-title">キーの一覧</h2>
	<p>文字を打つ欄の中では、1 字のキーは効かない。</p>
	<table>
		<tbody>
			{#each rows as [k, v] (k)}
				<tr><th scope="row"><kbd>{k}</kbd></th><td>{v}</td></tr>
			{/each}
		</tbody>
	</table>
	<form method="dialog"><button>閉じる</button></form>
</dialog>

<style>
	dialog {
		background: var(--dl-surface);
		color: var(--dl-text);
		border: 1px solid var(--dl-border-strong);
		border-radius: var(--dl-radius-box);
		max-width: min(36rem, 92vw);
		padding: var(--dl-space-6);
	}
	dialog::backdrop {
		background: var(--color-overlay);
	}
	table {
		border-collapse: collapse;
		margin-bottom: var(--dl-space-4);
	}
	th {
		text-align: left;
		padding: var(--dl-space-1) var(--dl-space-4) var(--dl-space-1) 0;
		white-space: nowrap;
	}
	td {
		padding: var(--dl-space-1) 0;
	}
</style>
