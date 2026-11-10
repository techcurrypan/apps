// 場面の前に置く物（tools-real/worlds/<名前>.json）から、模擬の世界を作る。
// 本物の記録（tools-real/record.ts）も同じ物を読んで、CI の機械に root で置く。
import { parentOf, type Fs, type FsNode } from '../fs.ts';
import { CLOCK_BASE } from './run.ts';
import { baseFs } from './world.ts';

export type WorldSpec = {
	dirs?: { path: string; mode: string; owner: string }[];
	files?: { path: string; mode: string; owner: string; data: string }[];
};

const LEARNER_HOME = '/home/learner';

// 持ち主が既定（家の下は learner、外は root）と同じなら書かない
function ownerField(path: string, owner: string): { owner?: string } {
	const inHome = path === LEARNER_HOME || path.startsWith(`${LEARNER_HOME}/`);
	return owner === (inHome ? 'learner' : 'root') ? {} : { owner };
}

export function applyWorld(fs: Fs, w: WorldSpec): Fs {
	const out: Record<string, FsNode> = { ...fs };
	for (const d of w.dirs ?? []) {
		if (!out[parentOf(d.path)]) throw new Error(`no parent: ${d.path}`);
		out[d.path] = {
			kind: 'dir',
			mode: Number.parseInt(d.mode, 8),
			mtime: CLOCK_BASE,
			...ownerField(d.path, d.owner)
		};
	}
	for (const f of w.files ?? []) {
		if (!out[parentOf(f.path)]) throw new Error(`no parent: ${f.path}`);
		out[f.path] = {
			kind: 'file',
			data: f.data,
			mode: Number.parseInt(f.mode, 8),
			mtime: CLOCK_BASE,
			...ownerField(f.path, f.owner)
		};
	}
	return out;
}

export function worldFs(w: WorldSpec | null): Fs {
	return w ? applyWorld(baseFs(), w) : baseFs();
}
