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
import { lnx002 } from './lessons/lnx-002.ts';
import { lnx003 } from './lessons/lnx-003.ts';
import { lnx004 } from './lessons/lnx-004.ts';
import { lnx005 } from './lessons/lnx-005.ts';
import { lnx006 } from './lessons/lnx-006.ts';
import { lnx007 } from './lessons/lnx-007.ts';
import { lnx008 } from './lessons/lnx-008.ts';
import { lnx009 } from './lessons/lnx-009.ts';
import { lnx010 } from './lessons/lnx-010.ts';
import { lnx011 } from './lessons/lnx-011.ts';
import { net001 } from './lessons/net-001.ts';
import { net002 } from './lessons/net-002.ts';
import { net003 } from './lessons/net-003.ts';
import { net004 } from './lessons/net-004.ts';
import { net005 } from './lessons/net-005.ts';
import { net006 } from './lessons/net-006.ts';
import { net007 } from './lessons/net-007.ts';
import { net008 } from './lessons/net-008.ts';
import { net009 } from './lessons/net-009.ts';
import { net010 } from './lessons/net-010.ts';
import { net011 } from './lessons/net-011.ts';
import { net012 } from './lessons/net-012.ts';
import { net013 } from './lessons/net-013.ts';
import { sec001 } from './lessons/sec-001.ts';
import { sec002 } from './lessons/sec-002.ts';
import { sec003 } from './lessons/sec-003.ts';
import { sec004 } from './lessons/sec-004.ts';
import { sec005 } from './lessons/sec-005.ts';
import { sec006 } from './lessons/sec-006.ts';
import { sec007 } from './lessons/sec-007.ts';
import { sec008 } from './lessons/sec-008.ts';
import { sec009 } from './lessons/sec-009.ts';
import { sec010 } from './lessons/sec-010.ts';
import { sec011 } from './lessons/sec-011.ts';
import { sec012 } from './lessons/sec-012.ts';
import { sec013 } from './lessons/sec-013.ts';
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
	lnx002,
	lnx003,
	lnx004,
	lnx005,
	lnx006,
	lnx007,
	lnx008,
	lnx009,
	lnx010,
	lnx011,
	net001,
	net002,
	net003,
	net004,
	net005,
	net006,
	net007,
	net008,
	net009,
	net010,
	net011,
	net012,
	net013,
	sec001,
	sec002,
	sec003,
	sec004,
	sec005,
	sec006,
	sec007,
	sec008,
	sec009,
	sec010,
	sec011,
	sec012,
	sec013,
	db001,
	git001,
	ctr001
];
