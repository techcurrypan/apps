// 分野ごとの言葉の一覧（explanation-standard.md 10.1）。分野 ID → 言葉
import type { Term } from '../../learn/terms.ts';
import { NET_TERMS } from './net.ts';

export const TERMS: Record<string, Term[]> = { net: NET_TERMS };
