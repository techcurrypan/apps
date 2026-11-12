// 全レッスンの一覧。content:check と画面はここから読む。
// 書き出した物。手で直さない。作り直すとき: npx tsx scripts/graph-sync.ts
import type { Lesson } from '../lesson/types.ts';
import { prg001 } from './lessons/prg-001.ts';
import { prg002 } from './lessons/prg-002.ts';
import { prg003 } from './lessons/prg-003.ts';
import { prg004 } from './lessons/prg-004.ts';
import { prg005 } from './lessons/prg-005.ts';
import { prg006 } from './lessons/prg-006.ts';
import { prg007 } from './lessons/prg-007.ts';
import { prg008 } from './lessons/prg-008.ts';
import { prg009 } from './lessons/prg-009.ts';
import { prg010 } from './lessons/prg-010.ts';
import { prg011 } from './lessons/prg-011.ts';
import { prg012 } from './lessons/prg-012.ts';
import { lnx001 } from './lessons/lnx-001.ts';
import { net001 } from './lessons/net-001.ts';
import { net005 } from './lessons/net-005.ts';
import { sec001 } from './lessons/sec-001.ts';
import { sec009 } from './lessons/sec-009.ts';
import { sec011 } from './lessons/sec-011.ts';
import { db001 } from './lessons/db-001.ts';
import { git001 } from './lessons/git-001.ts';
import { ctr001 } from './lessons/ctr-001.ts';

export const lessons: readonly Lesson[] = [
	prg001,
	prg002,
	prg003,
	prg004,
	prg005,
	prg006,
	prg007,
	prg008,
	prg009,
	prg010,
	prg011,
	prg012,
	lnx001,
	net001,
	net005,
	sec001,
	sec009,
	sec011,
	db001,
	git001,
	ctr001
];
