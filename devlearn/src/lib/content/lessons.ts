// 全レッスンの一覧。content:check と画面はここから読む。
import type { Lesson } from '../lesson/types.ts';
import { git001 } from './lessons/git-001.ts';

export const lessons: readonly Lesson[] = [git001];
