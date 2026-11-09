// 組み立て結果を消す。検査の前に走る（precheck）。
// svelte-check は .svelte-kit の中の生成物まで検査してしまうため。
import { rmSync } from 'node:fs';

for (const dir of ['.svelte-kit/output', '.svelte-kit/cloudflare', '.svelte-kit/cloudflare-tmp']) {
	rmSync(dir, { recursive: true, force: true });
}
