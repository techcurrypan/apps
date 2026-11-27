// 第 3 版のレッスン（検査 41〜48 を当てる物）。10-P 手順 9 で見本の題から足す
import type { V3Lesson } from '../../learn/check-v3.ts';
import type { RecallSet } from '../../learn/recall3.ts';
import type { TryScene } from '../../learn/try3.ts';
import type { Term } from '../../learn/terms.ts';
import { NET_TERMS } from '../terms/net.ts';
import { NET_101_V3 } from './net-101.ts';
import { RECALL_TCP } from './recall-tcp.ts';
import { TRY_TCP } from './try-tcp.ts';

export const V3_LESSONS: V3Lesson[] = [NET_101_V3];

/** 第 3 版の画面で開くレッスンと、その 試す・やってみる・思い出す・言葉 */
export type V3Bundle = {
	lesson: V3Lesson;
	terms: readonly Term[];
	lab: 'tcp' | 'k8s';
	tryScene: TryScene;
	recall: RecallSet;
};
const BUNDLES: V3Bundle[] = [
	{ lesson: NET_101_V3, terms: NET_TERMS, lab: 'tcp', tryScene: TRY_TCP, recall: RECALL_TCP }
];

export const v3Of = (id: string): V3Bundle | undefined => BUNDLES.find((b) => b.lesson.id === id);
