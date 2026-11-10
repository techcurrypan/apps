// 模擬のシェルの命令の表（docs/tools.md 3.2）。git・docker の道具も、この表の上に自分の命令を足す。
import { basicCommands } from './basic.ts';
import { envCommands } from './env.ts';
import { fileCommands } from './files.ts';
import type { Commands } from './run.ts';
import { textCommands } from './text.ts';
import { userCommands } from './users.ts';

export function shellCommands<X>(): Commands<X> {
	const all = {
		...basicCommands<unknown>(),
		...fileCommands,
		...textCommands,
		...envCommands,
		...userCommands
	};
	return all as Commands<unknown> as unknown as Commands<X>;
}
