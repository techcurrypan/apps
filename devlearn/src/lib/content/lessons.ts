// 全レッスンの一覧。content:check と画面はここから読む。
import type { Lesson } from '../lesson/types.ts';
import { ctr001 } from './lessons/ctr-001.ts';
import { db001 } from './lessons/db-001.ts';
import { git001 } from './lessons/git-001.ts';
import { lnx001 } from './lessons/lnx-001.ts';
import { prg001 } from './lessons/prg-001.ts';

export const lessons: readonly Lesson[] = [git001, lnx001, ctr001, prg001, db001];
