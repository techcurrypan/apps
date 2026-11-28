// 第 3 版のレッスン（検査 41〜48 を当てる物）。10-P 手順 9 で見本の題から足す
import type { V3Lesson } from '../../learn/check-v3.ts';
import type { LabId } from '../../learn/lab.ts';
import type { RecallSet } from '../../learn/recall3.ts';
import type { TryScene } from '../../learn/try3.ts';
import type { Term } from '../../learn/terms.ts';
import { K8S_TERMS } from '../terms/k8s.ts';
import { NET_TERMS } from '../terms/net.ts';
import { PRG_TERMS } from '../terms/prg.ts';
import { K8S_101_V3 } from './k8s-101.ts';
import { NET_101_V3 } from './net-101.ts';
import { PRG_006_V3 } from './prg-006.ts';
import { RECALL_K8S } from './recall-k8s.ts';
import { RECALL_MEM } from './recall-mem.ts';
import { RECALL_TCP } from './recall-tcp.ts';
import { TRY_K8S } from './try-k8s.ts';
import { TRY_MEM } from './try-mem.ts';
import { TRY_TCP } from './try-tcp.ts';

export const V3_LESSONS: V3Lesson[] = [NET_101_V3, K8S_101_V3, PRG_006_V3];

/** 第 3 版の画面で開くレッスンと、その 試す・やってみる・思い出す・言葉 */
export type V3Bundle = {
	lesson: V3Lesson;
	terms: readonly Term[];
	lab: LabId;
	tryScene: TryScene;
	recall: RecallSet;
};
const BUNDLES: V3Bundle[] = [
	{ lesson: NET_101_V3, terms: NET_TERMS, lab: 'tcp', tryScene: TRY_TCP, recall: RECALL_TCP },
	{ lesson: K8S_101_V3, terms: K8S_TERMS, lab: 'k8s', tryScene: TRY_K8S, recall: RECALL_K8S },
	{ lesson: PRG_006_V3, terms: PRG_TERMS, lab: 'mem', tryScene: TRY_MEM, recall: RECALL_MEM }
];

export const v3Of = (id: string): V3Bundle | undefined => BUNDLES.find((b) => b.lesson.id === id);
