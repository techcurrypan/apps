// 場面の前に置く物（tools-real/worlds/<名前>.json）から、模擬の世界を作る。
// 本物の記録（tools-real/record.ts）も同じ物を読んで、CI の機械に root で置く。
import { parentOf, type Fs, type FsNode } from '../fs.ts';
import { CLOCK_BASE } from './run.ts';
import type { NetState, NetWorld } from './networld.ts';
import { initialSys, type ProcSpec, type SysState, type SysUser } from './procs.ts';
import type { UnitMock } from './systemd.ts';
import { baseFs } from './world.ts';

export type WorldSpec = {
	dirs?: { path: string; mode: string; owner: string }[];
	files?: { path: string; mode: string; owner: string; data: string }[];
	net?: NetWorld;
	users?: SysUser[];
	procs?: ProcSpec[];
	units?: string[];
	unitMock?: Record<string, UnitMock>;
	docker?: { images: string[] };
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
	if (!w) return baseFs();
	let fs = applyWorld(baseFs(), w);
	// 網の世界は /etc に名前の引き方（resolv.conf・hosts）を置く
	if (w.net) {
		fs = applyWorld(fs, {
			dirs: [{ path: '/etc', mode: '755', owner: 'root' }],
			files: Object.entries(w.net.etc).map(([name, data]) => ({
				path: `/etc/${name}`,
				mode: '644',
				owner: 'root',
				data
			}))
		});
	}
	return fs;
}

// 世界の網の初めの状態。記録の機械は、初めに DNS の機械と話している（sudo が自分の名前を引くため）。模擬も同じに始める
export function worldNet(w: WorldSpec | null): NetState | undefined {
	if (!w?.net) return undefined;
	return { world: w.net, neigh: { [w.net.dns.server]: 'REACHABLE' } };
}

// 世界の機械の状態（利用者・動いているプロセス・サービス）。どれも無ければ置かない
export function worldSys(w: WorldSpec | null): SysState | undefined {
	if (!w?.users && !w?.procs && !w?.units) return undefined;
	return initialSys(w.users ?? [], w.procs ?? [], w.unitMock);
}
