// 全レッスンの一覧。content:check と画面はここから読む。
import type { Lesson } from '../lesson/types.ts';
import { ctr001 } from './lessons/ctr-001.ts';
import { db001 } from './lessons/db-001.ts';
import { git001 } from './lessons/git-001.ts';
import { lnx001 } from './lessons/lnx-001.ts';
import { prg001 } from './lessons/prg-001.ts';
import { net001 } from './lessons/net-001.ts';
import { net005 } from './lessons/net-005.ts';
import { sec001 } from './lessons/sec-001.ts';
import { sec009 } from './lessons/sec-009.ts';
import { sec011 } from './lessons/sec-011.ts';

export const lessons: readonly Lesson[] = [
	git001,
	lnx001,
	ctr001,
	prg001,
	db001,
	net001,
	net005,
	sec001,
	sec009,
	sec011
];
