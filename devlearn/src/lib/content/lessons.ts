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
import { db002 } from './lessons/db-002.ts';
import { db003 } from './lessons/db-003.ts';
import { db004 } from './lessons/db-004.ts';
import { db005 } from './lessons/db-005.ts';
import { db006 } from './lessons/db-006.ts';
import { db007 } from './lessons/db-007.ts';
import { db008 } from './lessons/db-008.ts';
import { db009 } from './lessons/db-009.ts';
import { db010 } from './lessons/db-010.ts';
import { db011 } from './lessons/db-011.ts';
import { git001 } from './lessons/git-001.ts';
import { git002 } from './lessons/git-002.ts';
import { git003 } from './lessons/git-003.ts';
import { git004 } from './lessons/git-004.ts';
import { git005 } from './lessons/git-005.ts';
import { git006 } from './lessons/git-006.ts';
import { git007 } from './lessons/git-007.ts';
import { git008 } from './lessons/git-008.ts';
import { git009 } from './lessons/git-009.ts';
import { git010 } from './lessons/git-010.ts';
import { ctr001 } from './lessons/ctr-001.ts';
import { ctr002 } from './lessons/ctr-002.ts';
import { ctr003 } from './lessons/ctr-003.ts';
import { ctr004 } from './lessons/ctr-004.ts';
import { ctr005 } from './lessons/ctr-005.ts';
import { ctr006 } from './lessons/ctr-006.ts';
import { ctr007 } from './lessons/ctr-007.ts';
import { ctr008 } from './lessons/ctr-008.ts';
import { ctr009 } from './lessons/ctr-009.ts';
import { cld001 } from './lessons/cld-001.ts';
import { cld002 } from './lessons/cld-002.ts';
import { cld003 } from './lessons/cld-003.ts';
import { cld004 } from './lessons/cld-004.ts';
import { cld005 } from './lessons/cld-005.ts';
import { cld006 } from './lessons/cld-006.ts';
import { cld007 } from './lessons/cld-007.ts';
import { cld008 } from './lessons/cld-008.ts';
import { cld009 } from './lessons/cld-009.ts';
import { cld010 } from './lessons/cld-010.ts';
import { ci001 } from './lessons/ci-001.ts';
import { ci002 } from './lessons/ci-002.ts';
import { ci003 } from './lessons/ci-003.ts';
import { ci004 } from './lessons/ci-004.ts';
import { ci005 } from './lessons/ci-005.ts';
import { ci006 } from './lessons/ci-006.ts';
import { ci007 } from './lessons/ci-007.ts';
import { ci008 } from './lessons/ci-008.ts';
import { ai001 } from './lessons/ai-001.ts';
import { ai002 } from './lessons/ai-002.ts';
import { ai003 } from './lessons/ai-003.ts';
import { ai004 } from './lessons/ai-004.ts';
import { ai005 } from './lessons/ai-005.ts';
import { ai006 } from './lessons/ai-006.ts';
import { ai007 } from './lessons/ai-007.ts';
import { ai008 } from './lessons/ai-008.ts';
import { ai009 } from './lessons/ai-009.ts';
import { ai010 } from './lessons/ai-010.ts';
import { ai011 } from './lessons/ai-011.ts';
import { ai012 } from './lessons/ai-012.ts';
import { ai013 } from './lessons/ai-013.ts';
import { ai014 } from './lessons/ai-014.ts';
import { ai015 } from './lessons/ai-015.ts';
import { ai016 } from './lessons/ai-016.ts';
import { ai017 } from './lessons/ai-017.ts';
import { ai018 } from './lessons/ai-018.ts';
import { ai019 } from './lessons/ai-019.ts';
import { ai020 } from './lessons/ai-020.ts';
import { ai037 } from './lessons/ai-037.ts';

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
	db002,
	db003,
	db004,
	db005,
	db006,
	db007,
	db008,
	db009,
	db010,
	db011,
	git001,
	git002,
	git003,
	git004,
	git005,
	git006,
	git007,
	git008,
	git009,
	git010,
	ctr001,
	ctr002,
	ctr003,
	ctr004,
	ctr005,
	ctr006,
	ctr007,
	ctr008,
	ctr009,
	cld001,
	cld002,
	cld003,
	cld004,
	cld005,
	cld006,
	cld007,
	cld008,
	cld009,
	cld010,
	ci001,
	ci002,
	ci003,
	ci004,
	ci005,
	ci006,
	ci007,
	ci008,
	ai001,
	ai002,
	ai003,
	ai004,
	ai005,
	ai006,
	ai007,
	ai008,
	ai009,
	ai010,
	ai011,
	ai012,
	ai013,
	ai014,
	ai015,
	ai016,
	ai017,
	ai018,
	ai019,
	ai020,
	ai037
];
