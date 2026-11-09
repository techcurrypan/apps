// 型検査の前に、組み立て結果を消す。
// svelte-check は .svelte-kit の中の組み立て結果まで型検査してしまうため。
import { rmSync } from 'node:fs';

for (const dir of ['.svelte-kit/output', '.svelte-kit/cloudflare', '.svelte-kit/cloudflare-tmp']) {
	rmSync(dir, { recursive: true, force: true });
}
