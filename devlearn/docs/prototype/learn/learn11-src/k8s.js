// ================= レッスン 2：Pod が落ちても戻る（Kubernetes の制御ループ）—— 見せ方の型：cluster（制御面・ノード・六角の Pod・監視の流れ） =================
(() => {
  const p = (h, at) => ({ h, at });
  // 物の種類。置き場所はステップごとの layout（画面 1000 × 600）
  const OB = {
    kubectl: { k: 'laptop', c: C.gray, f: 'kubectl', s: 'あなたの端末' },
    api: { k: 'hex', c: C.teal, r: 66, h: 54, f: 'kube-apiserver', s: 'ただ 1 つの入口' },
    etcd: { k: 'db', c: C.purple, r: 58, h: 86, f: 'etcd', s: '望む状態の帳簿' },
    sched: { k: 'block', c: C.blue, f: 'kube-scheduler', s: '置くノードを決める', g: '⌖' },
    ctrl: { k: 'block', c: C.blue, f: 'controller-manager', s: '数を合わせ続ける', g: '↻' },
    n1: { k: 'platform', w: 380, d: 270, h: 14, c: C.green, f: 'node-1', node: true, cpu: 3.8 },
    n2: { k: 'platform', w: 380, d: 270, h: 14, c: C.green, f: 'node-2', node: true, cpu: 0.5 },
    n3: { k: 'platform', w: 380, d: 270, h: 14, c: C.green, f: 'node-3', node: true, cpu: 1.0 }
  };
  const NW = 380, ND = 270, PLH = 14;
  const SLOTS = [[-80, 80], [80, -80], [-80, -80], [80, 80]];
  const at = (id) => { const q = scnPos(id); return q ? { ...OB[id], ...q, sub: OB[id].s, id } : null; };
  const pos = (id) => { const o = at(id); return o ? [o.x, o.y] : [-500, -500]; };
  const top = (id, up = 18) => { const o = at(id); return o ? objTop(o, up) : [-500, -500]; };
  const slot = (n, i) => { const b = at(n); if (!b) return [-500, -500]; return localProj(b.x, b.y, b.s)(SLOTS[i][0], SLOTS[i][1], PLH); };
  const nsc = (n) => (at(n) ? at(n).s : 1);
  const KL = (n) => { const b = at(n); if (!b) return [-500, -500]; return localProj(b.x, b.y, b.s)(-NW / 2 + 40, -ND / 2 + 40, PLH); };
  const nfront = (n) => { const b = at(n); return localProj(b.x, b.y, b.s)(NW / 2, ND / 2, PLH); };
  const TRAY = (i) => { const e = pos('etcd'); return [e[0] - 70 + i * 70, e[1] + 120]; };
  const ST = { run: [C.green, '動いている'], ready: [C.green, 'Ready'], pend: [C.blue, '置き場が決まった'], create: [C.orange, '起動中'], dead: [C.red, '落ちた'], gray: [C.gray, ''], unk: [C.gray, '見えない'], obj: [C.purple, 'nodeName なし'] };
  function pod(c, name, st, o = {}) { const sc = o.s ?? 1; const r = (o.r || 56) * sc; const [col, lab] = ST[st] || ST.run; const dashed = st === 'pend' || st === 'unk' || st === 'obj'; const [sx, sy] = c;
    const h = dashed ? 3 : (o.h ?? (r > 22 ? 54 : 14)) * sc; const k = INK ? UIK : 1;
    let s = `<g style="opacity:${o.op ?? 1};cursor:help" data-term="pod">` + hexPrism(sx, sy, r, h, col, { s: 1, dash: dashed ? `${6 * k} ${4 * k}` : undefined, topPct: dashed ? 8 : st === 'gray' ? 14 : 26, shadow: !dashed, sw: dashed ? 2 : undefined });
    if (name) s += T(sx, sy - h + 5 * k, name, { a: 'middle', size: r > 30 ? 13 : 11, w: 800, mono: true, halo: true });
    const lb = o.label ?? lab; if (r > 22 && lb) s += T(sx, sy + r * .6 + 18 * k, lb, { a: 'middle', size: 12.5, w: 800, fill: edgeC(col), halo: true });
    if (st === 'dead') s += cross(sx + 22 * k, sy - h - 16 * k, 8 * k, C.red, { flat: true });
    return s + '</g>'; }
  function loopIcon(x, y, t, c, r = 14, spin = true) { const a = spin ? (t / 900) % (2 * Math.PI) : 0; const k = INK ? UIK : 1; r *= k;
    return `<g transform="rotate(${(a * 180 / Math.PI).toFixed(1)} ${x} ${y})"><path d="M${x + r} ${y}A${r} ${r} 0 1 1 ${x} ${y - r}" style="fill:none;stroke:${c};stroke-width:${3 * k};stroke-linecap:round"/>${head(x, y - r, 0, c, 8 * k)}</g>`; }
  function base(o = {}) { const hl = o.hl || []; const t = o.t || 0; let s = ''; const k = UIK; const ids = Object.keys(OB).filter((id) => { const q = scnPos(id); return q && q.op > .01; });
    for (const [a, b, kind] of o.links || []) { const A = at(a), B = at(b); if (!A || !B) continue; const op = Math.min(A.op, B.op); const dx = B.x - A.x, dy = B.y - A.y, Ln = Math.hypot(dx, dy) || 1;
      const ra = (A.node ? 150 : 95) * A.s, rb = (B.node ? 150 : 100) * B.s; s += line([[A.x + dx / Ln * ra, A.y + dy / Ln * ra * .6], [B.x - dx / Ln * rb, B.y - dy / Ln * rb * .6]], { c: kind === 'watch' ? 'var(--mut)' : 'var(--ink)', w: 1.8, op: op * .85, dash: kind === 'watch' ? '6 5' : undefined, both: kind === 'both', flow: true, flowC: kind === 'watch' ? C.purple : C.blue }); }
    const nodes = ids.filter((id) => OB[id].node), others = ids.filter((id) => !OB[id].node).sort((a, b) => at(a).y - at(b).y);
    for (const id of nodes) { const q = at(id); const nr = (o.notReady || []).includes(id); s += `<g style="opacity:${q.op}">` + prism(rectPts(-NW / 2, -ND / 2, NW, ND), 0, PLH, nr ? C.gray : hl.includes(id) ? C.blue : C.green, { topPct: nr ? 22 : 8, dash: nr ? `${8 * k} ${6 * k}` : undefined }, localProj(q.x, q.y, q.s)) + '</g>'; }
    if (at('n1')) s += pod(slot('n1', 0), 'batch-1', 'gray', { label: 'CPU 1.9', s: nsc('n1'), op: at('n1').op }) + pod(slot('n1', 1), 'batch-2', 'gray', { label: 'CPU 1.9', s: nsc('n1'), op: at('n1').op });
    for (const id of others) { const q = at(id); s += drawObj(q, { op: q.op, hl: hl.includes(id) }); }
    if (at('ctrl') && at('ctrl').op > .5) { const q = top('ctrl', 30); s += loopIcon(q[0] + 70, q[1], t, hl.includes('ctrl') ? C.blue : C.gray, 14, hl.includes('ctrl')); }
    if (at('sched') && at('sched').op > .5) { const q = top('sched', 30); s += loopIcon(q[0] + 70, q[1], t, hl.includes('sched') ? C.blue : C.gray, 14, hl.includes('sched')); }
    s += o.under || '';
    for (const id of others) { const q = at(id); const nm = (o.names || {})[id]; if (q.op > .3) s += objLabel(nm ? { ...q, f: nm[0], sub: nm[1] } : q, { sub: true, op: q.op, term: id }); }
    for (const id of nodes) { const q = at(id); if (q.op < .3) continue; const nr = (o.notReady || []).includes(id); const fl = nfront(id); const cpu = OB[id].cpu + (o.cpuAdd?.[id] || 0);
      s += tag(fl[0], fl[1] + 26 * k, OB[id].f, { size: 15, dot: nr ? C.red : C.green, op: q.op, term: 'node' }) + tag(fl[0], fl[1] + 58 * k, `CPU 要求 ${cpu.toFixed(2).replace(/0$/, '')} / 4`, { size: 12, dot: cpu > 3.6 ? C.red : C.teal, op: q.op, sw: 1.2 });
      const kq = KL(id); s += badge(kq[0], kq[1] - 8 * k, 'kubelet', hl.includes('k' + id) ? C.blue : C.gray, { center: true, size: 12.5, op: q.op });
      if (nr) s += badge(fl[0] + 80 * k, fl[1] + 26 * k, 'NotReady', C.red, { size: 12.5 }); }
    return s; }
  const tray = (names, t0 = 0, t = 1e9) => names.map((n, i) => (n ? pod(TRAY(i), '', 'obj', { r: 24, label: '', op: P(t, t0 + i * 250, 300) }) : '')).join('') + (names.some(Boolean) ? T(TRAY(1)[0], TRAY(1)[1] + 46, '置き場未定の Pod', { a: 'middle', size: 12.5, w: 800, fill: C.purple, halo: true, op: P(t, t0, 300) }) : '');
  const fly = (pts, t, a, d) => along(pts, P(t, a, d));
  const toSlot = (n, i, from = TRAY(0)) => { const s2 = slot(n, i); return [from, [(from[0] + s2[0]) / 2, Math.min(from[1], s2[1]) - 80], s2]; };
  const START = [['n2', 0, 'web-a'], ['n3', 0, 'web-b'], ['n2', 1, 'web-c']];
  const startPods = (st = 'ready', skip = '') => START.filter((x) => x[2] !== skip && at(x[0])).map(([n, i, name]) => pod(slot(n, i), name, st, { s: nsc(n) })).join('');
  const doc = (pt, lab, c = C.blue) => tok(pt, lab, c, { w: 34 });
  const scoreBadge = (n, txt, c, op) => { const q = top(n, 0); return badge(q[0], q[1] - 150 * nsc(n), txt, c, { center: true, size: 14, op }); };
  const pk3 = (pts, k, c = C.blue) => pkt(along(pts, k), c);
  const top2 = (n, i) => [slot(n, i)[0], slot(n, i)[1] - 50];
  const steps = [
    { kind: 'problem', short: '問題', title: 'Pod が 1 つ消えた。誰が戻したのか', cam: [0, 0, 1000, 600], layout: { etcd: [430, 140, .7], ctrl: [770, 140, .8], n2: [290, 420, .66], n3: [720, 430, .66] }, links: [['etcd', 'ctrl', 'watch']], dur: 6400,
      metrics: { want: '3', ready: '3', rs: '0 回', bo: '—' },
      paras: [p('web を <span class="n">3</span> つ動かしている。node-2 の <code>web-a</code> が突然消えた（プロセスが死んだ、または Pod が消された）。', 0),
        p('誰も命令していないのに、数秒後には新しい Pod が node-3 で動き出し、数は <span class="n">3</span> に戻る。', 2400),
        p('このレッスンで答える問い：<b>「3 つ」と書いた紙はどこにあり、誰が見比べて、誰が置き場を決め、誰が起こしたのか。</b>', 4600)],
      callout: ['ポイント', 'Kubernetes に「Pod を作れ」と命令する人はいない。<b>望む状態</b>を書くと、複数の制御ループがそれぞれ今の状態と比べて差を埋める。'],
      changes: [['-', 'web-a が消えた'], ['+', 'web-d が node-3 で動き出した']],
      draw(t) { let s = base({ t, links: this.links, hl: t > 2400 && t < 4400 ? ['ctrl'] : [] });
        s += pod(slot('n3', 0), 'web-b', 'ready', { s: nsc('n3') }) + pod(slot('n2', 1), 'web-c', 'ready', { s: nsc('n2') });
        if (t < 1400) s += pod(slot('n2', 0), 'web-a', 'ready', { s: nsc('n2') }); else s += pod(slot('n2', 0), 'web-a', 'dead', { s: nsc('n2'), op: 1 - P(t, 1800, 700) });
        if (t > 2400 && t < 3000) s += pulse(...top('ctrl', 0), t, C.blue, 30, { iso: true });
        if (t > 2900 && t < 3500) s += pod(TRAY(0), '', 'obj', { r: 24 });
        if (t >= 3500) { const pt = fly(toSlot('n3', 1), t, 3500, 1400); const done = t > 4900; s += pod(pt, done ? 'web-d' : '', t > 5000 ? 'ready' : done ? 'create' : 'pend', { s: lerp(.45, nsc('n3'), P(t, 3500, 1400)), label: done ? undefined : '' }); }
        if (t > 4900 && t < 5800) s += pulse(...slot('n3', 1), t, C.green, 40, { iso: true });
        return s; } },
    { kind: 'mech', short: 'apply', title: 'kubectl apply：望む状態を帳簿に書くだけ', cam: [0, 0, 1000, 600], layout: { kubectl: [150, 330], api: [480, 300], etcd: [820, 300] }, links: [['kubectl', 'api'], ['api', 'etcd', 'both']], dur: 5600,
      metrics: { want: '3', ready: '0', rs: '0 回', bo: '—' },
      paras: [p('<code>kubectl apply -f web.yaml</code> は、YAML を HTTP で <b>kube-apiserver</b> に送る（サーバー側 apply なら <code>PATCH</code>）。', 0),
        p('apiserver は順に<b>認証</b>（誰か）→ <b>認可</b>（してよいか・RBAC）→ <b>受付制御</b>（足りない値を補う・規則に合うか）を通す。', 1500),
        p('通れば <b>etcd</b> に書く（キーは <code>/registry/deployments/default/web</code>）。返事は <code>201 Created</code>。ここで kubectl は終わる。<b>まだどこでも何も動いていない。</b>', 2900)],
      callout: ['よくある誤解', '「apply が成功した＝Pod が動いた」ではない。apply が約束するのは「帳簿に書けた」だけ。動いたかは <code>kubectl rollout status</code> で待って確かめる。'],
      changes: [['+', 'etcd に Deployment「web・replicas 3」が入った']],
      deep: '<p>apiserver は etcd に直接触る唯一の部品。他の部品はみな apiserver の API を読み書きし、<b>watch</b>（変化の知らせを流し続ける長い接続）で変化を受け取る。書くたびに <code>resourceVersion</code> が上がり、同時に書いた時は古い版の書き込みが 409 Conflict で負ける。</p>',
      draw(t) { let s = base({ t, links: this.links, hl: t < 1300 ? ['kubectl'] : t < 2900 ? ['api'] : t < 3900 ? ['etcd'] : ['kubectl'] });
        if (t < 2700) s += doc(fly([top('kubectl'), top('api')], t, 200, 1100), 'web.yaml');
        [['認証', -110, 1500], ['認可', 0, 1900], ['受付制御', 120, 2300]].forEach(([n, dx, a]) => { if (t > a) s += badge(pos('api')[0] + dx, pos('api')[1] - 170, (t > a + 350 ? '✓ ' : '') + n, t > a + 350 ? C.green : C.gray, { center: true, size: 13.5, op: P(t, a, 250) }); });
        if (t > 2700 && t < 3500) s += doc(fly([top('api'), top('etcd')], t, 2700, 700), 'web.yaml');
        if (t > 3300) s += badge(pos('etcd')[0], pos('etcd')[1] - 170, '/registry/deployments/default/web', C.purple, { center: true, mono: true, op: P(t, 3300, 400) }) + pulse(pos('etcd')[0], pos('etcd')[1] - 40, t, C.purple, 40, { iso: true });
        if (t > 3800) s += doc(fly([top('api'), top('kubectl')], t, 3800, 900), '201 Created', C.green);
        if (t > 4700) s += badge(pos('kubectl')[0] + 40, pos('kubectl')[1] - 170, 'deployment.apps/web created', C.green, { center: true, mono: true, op: P(t, 4700, 300) });
        return s; } },
    { kind: 'mech', short: '数を合わせる', title: 'controller が差を見つけて Pod の紙を作る', cam: [0, 0, 1000, 600], layout: { api: [160, 330, .9], etcd: [470, 380, .9], ctrl: [800, 250, .9] }, links: [['api', 'etcd', 'both'], ['api', 'ctrl', 'watch']], dur: 6000,
      metrics: { want: '3', ready: '0', rs: '0 回', bo: '—' },
      paras: [p('<b>controller-manager</b> の中で何十もの制御ループが回っている。どれも同じ形：<b>観る</b>（watch）→ <b>比べる</b>（望む ↔ 今）→ <b>動く</b>（差を埋める）。', 0),
        p('Deployment のループが「web に対応する ReplicaSet が無い」と見て <code>web-7d9f</code> を作る。', 1500),
        p('次に ReplicaSet のループが「望む <span class="n">3</span>・今 <span class="n">0</span>」と見て、Pod の<b>紙</b>を 3 枚 apiserver に書く。この時点では <code>nodeName</code> が空。どこで動くかはまだ誰も決めていない。', 3000)],
      callout: ['ポイント', 'controller は Pod を「起こさない」。作るのは API 上の紙（オブジェクト）だけ。置き場を決めるのも起こすのも、別のループの仕事。'],
      changes: [['+', 'ReplicaSet web-7d9f'], ['+', 'Pod の紙 3 枚（置き場未定）']],
      deep: '<p>ReplicaSet controller は ownerReferences で「自分の子」を数え、<code>replicas − 今の数</code> だけ作る（一度に作る数は 1, 2, 4… と倍に増やす slow start）。差が負なら消す。Informer が watch の結果を手元に写して持つので、ループは毎回 apiserver に全件を聞きに行かない。</p>',
      draw(t) { let s = base({ t, links: this.links, hl: ['ctrl'] }); const W = [top('api'), top('ctrl')];
        s += pk3(W, (t / 900) % 1);
        ['観る', '比べる', '動く'].forEach((w, i) => { const on = Math.floor(t / 700) % 3 === i; s += badge(pos('ctrl')[0] - 100 + i * 95, pos('ctrl')[1] + 170, w, on ? C.blue : C.gray, { size: 14, op: on ? 1 : .6 }); });
        if (t > 1500 && t < 2900) s += doc(fly([top('ctrl'), top('api'), top('etcd')], t, 1500, 1300), 'RS web-7d9f', C.teal);
        if (t > 2800) s += badge(pos('etcd')[0], pos('etcd')[1] - 180, 'want 3 ・ have 0', C.orange, { center: true, mono: true, size: 14, op: P(t, 2800, 300) });
        for (let i = 0; i < 3; i++) { const a = 3000 + i * 450; if (t > a && t < a + 1100) s += doc(fly([top('ctrl'), top('api'), TRAY(i)], t, a, 1100), 'Pod', C.purple); }
        s += tray(['a', 'b', 'c'].map((x, i) => (t > 4100 + i * 450 ? x : '')), 4100, t);
        return s; } },
    { kind: 'inside', short: '置き場', title: 'scheduler：ふるいにかけ、点を付け、結ぶ', cam: [0, 0, 1000, 600], layout: { etcd: [150, 150, .62], sched: [500, 130, .75], n1: [175, 450, .52], n2: [500, 460, .52], n3: [825, 450, .52] }, links: [['etcd', 'sched', 'watch']], dur: 6000,
      metrics: { want: '3', ready: '0', rs: '0 回', bo: '—' },
      paras: [p('<b>kube-scheduler</b> は「nodeName が空の Pod」を watch している。web-a を見つけると、まず<b>ふるい</b>（Filter）：要求 CPU <span class="n">0.25</span> が入らないノードを外す。node-1 は <span class="n">3.8 + 0.25 &gt; 4</span> で外れる。', 0),
        p('残った node-2・node-3 に<b>点</b>（Score）を付ける。空きの多さ・同じ仲間を散らすか、などの点を足す。高い方に決め、<b>bind</b>（Pod の nodeName を書く）だけをする。', 1600),
        p('web-b は散らすための点で node-3 へ、web-c は node-2 へ。scheduler は起こさない。<b>紙に置き場を書いただけ</b>。', 3200)],
      callout: ['知っておくと便利', '<code>kubectl describe pod</code> の Events に「0/3 nodes are available: 1 Insufficient cpu…」と出るのは、このふるいの結果そのもの。'],
      changes: [['~', 'Pod の nodeName：空 → node-2・node-3・node-2'], ['+', 'Events：Scheduled']],
      deep: '<p>処理は scheduling framework の拡張点で組まれる：PreFilter → Filter（NodeResourcesFit・NodeAffinity・TaintToleration…）→ PostFilter（入らなければ優先度の低い Pod を押し出す preemption）→ Score（NodeResourcesBalancedAllocation・PodTopologySpread…）→ Reserve → Permit → Bind。判断に使うのは実際の使用量ではなく <b>requests</b>。</p>',
      draw(t) { const placed = [t > 2600, t > 3900, t > 5200]; let s = base({ t, links: this.links, hl: ['sched'], cpuAdd: { n2: (placed[0] ? .25 : 0) + (placed[2] ? .25 : 0), n3: placed[1] ? .25 : 0 } });
        s += tray([t < 1800 ? 'a' : '', t < 3100 ? 'b' : '', t < 4400 ? 'c' : '']);
        if (t > 400) s += `<g style="opacity:${P(t, 400, 300)}">${cross(pos('n1')[0], pos('n1')[1] - 10, 50, C.red, { flat: true })}</g>` + scoreBadge('n1', 'ふるい：CPU 不足', C.red, P(t, 400, 300));
        const sc = t < 3000 ? ['点 81', '点 74'] : t < 4300 ? ['点 66', '点 79'] : ['点 77', '点 70'];
        if (t > 1000) { const pick2 = t < 3000 || t > 4300; s += scoreBadge('n2', '✓ ' + sc[0], pick2 ? C.green : C.gray, P(t, 1000, 300)) + scoreBadge('n3', '✓ ' + sc[1], pick2 ? C.gray : C.green, P(t, 1000, 300)); }
        [['n2', 0, 'web-a', 1800], ['n3', 0, 'web-b', 3100], ['n2', 1, 'web-c', 4400]].forEach(([n, i, name, a], j) => { if (t > a) { const kk = P(t, a, 900); s += pod(along(toSlot(n, i, TRAY(j)), kk), kk > .98 ? name : '', 'pend', { s: lerp(.45, nsc(n), kk) }); } });
        if (t > 1800 && t < 2700) s += badge(pos('sched')[0], pos('sched')[1] + 150, 'bind → node-2', C.blue, { center: true, mono: true });
        return s; } },
    { kind: 'inside', short: 'kubelet', title: 'kubelet：自分のノードに来た Pod を起こす', cam: [0, 0, 1000, 600], layout: { api: [870, 130, .65], n2: [610, 390, .9] }, links: [['api', 'n2', 'watch']], dur: 6200,
      metrics: { want: '3', ready: '3', rs: '0 回', bo: '—' },
      paras: [p('各ノードの <b>kubelet</b> は「nodeName が自分」の Pod を watch している。web-a に気づくと、コンテナランタイム（containerd）に <b>CRI</b> で頼む。', 0),
        p('① イメージを取る ② sandbox を作る（CNI が IP <code>10.244.1.7</code> を配る）③ コンテナを起こす。ここまでの状態は <code>ContainerCreating</code>。', 1200),
        p('起きても、すぐ客は来ない。④ <b>readiness probe</b>（<code>GET /healthz</code>）が通って初めて <b>Ready</b> になり、Service の行き先に加わる。kubelet はこの状態を apiserver に書き戻す。', 3600)],
      callout: ['注意', '「Running」と「Ready」は別。Running はプロセスが居るだけ。Ready でない Pod には Service が客を送らない。'],
      changes: [['~', 'web-a：Pending → ContainerCreating → Running → Ready'], ['+', 'Pod の IP 10.244.1.7']],
      deep: '<p>kubelet は syncPod の中で、RunPodSandbox（pause コンテナとネットワーク名前空間）→ PullImage → CreateContainer → StartContainer を CRI の gRPC で呼ぶ。startupProbe が通るまで liveness/readiness は始まらない。状態は Pod の <code>status.conditions</code>（PodScheduled・Initialized・ContainersReady・Ready）に書かれる。</p>',
      draw(t) { let s = base({ t, links: this.links, hl: ['kn2'], cpuAdd: { n2: .5 } }); s += pod(slot('n2', 1), 'web-c', 'ready', { s: nsc('n2') });
        const A = [300, 1300, 2400, 3600, 4800, 5400]; const stg = t < 300 ? 0 : t < 2400 ? 1 : t < 3600 ? 2 : t < 5400 ? 3 : 4;
        const st = ['pend', 'create', 'create', 'run', 'ready'][stg]; const lab = ['Pending', 'ContainerCreating', 'ContainerCreating', 'Running（まだ Ready でない）', 'Ready'][stg];
        s += pod(slot('n2', 0), 'web-a', st, { label: lab, s: nsc('n2') });
        if (t < 1200) s += pulse(...KL('n2'), t, C.blue, 20, { iso: true });
        const items = ['① イメージを取る  nginx:1.27', '② sandbox と IP 10.244.1.7', '③ コンテナを起こす', '④ readiness  GET /healthz → 200', '⑤ apiserver に Ready と書く'];
        s += card(20, 70, [['kubelet がすること', 'var(--mut)']].concat(items.map((x, i) => { const done = t > A[i + 1], now = t > A[i] && !done; return [(done ? '✓ ' : now ? '▶ ' : '・ ') + x, done ? C.green : now ? C.blue : 'var(--dim)']; })), { w: 330, lh: 26, size: 14 });
        if (t > 3600 && t < 5400) s += pk3([top2('n2', 0), [slot('n2', 0)[0] + 120, slot('n2', 0)[1] - 140]], ((t - 3600) % 600) / 600, C.green);
        if (t > 5400) s += badge(KL('n2')[0] + 60, KL('n2')[1] - 60, 'status を apiserver へ', C.green, { center: true, op: P(t, 5500, 300) });
        return s; } },
    { kind: 'fail', short: 'OOMKilled', title: '失敗：メモリ上限で殺され、待ち時間が倍に伸びる', cam: [0, 0, 1000, 600], layout: { n2: [620, 380, .9] }, links: [], dur: 7200,
      metrics: { want: '3', ready: '2', rs: '3 回', bo: '40 s' },
      paras: [p('web-c の <code>limits.memory</code> は <span class="n">256 Mi</span>。使う量が上限に届くと、cgroup の中で<b>カーネルの OOM killer</b> がプロセスを殺す。', 0),
        p('終わり方は <code>OOMKilled</code>・終了コード <span class="n">137</span>（<span class="n">128 + 9</span>：SIGKILL）。kubelet はすぐ起こし直す（restartPolicy: Always）。', 1600),
        p('また落ちると、待ち時間を <span class="n">10 → 20 → 40 → 80 → 160 → 300 s</span> と倍に延ばす（上限 5 分）。これが <code>CrashLoopBackOff</code>。直すのは「上限を上げる」か「使う量を減らす」。再起動では直らない。', 3400)],
      callout: ['注意', 'CrashLoopBackOff は原因ではなく「待っている」という状態の名前。原因は <code>describe</code> の Last State と <code>logs --previous</code> にある。'],
      changes: [['~', 'web-c：Running → OOMKilled（137）→ 起こし直し × 3'], ['~', '待ち時間 10 → 20 → 40 s']],
      deep: '<p>上限は cgroup v2 の <code>memory.max</code> に書かれる。超えるとカーネルが cgroup 内で oom_kill を起こす（ノード全体の OOM とは別）。待ち時間は 10 分間問題なく動けば元に戻る。終了コード 137 は「外から SIGKILL」なので、上限が原因かは Reason: OOMKilled で見分ける。</p>',
      draw(t) { let s = base({ t, links: this.links, hl: ['kn2'], cpuAdd: { n2: .5 } }); s += pod(slot('n2', 0), 'web-a', 'ready', { s: nsc('n2') });
        const cyc = [[0, 1500], [2000, 2900], [3600, 4300]]; let st = 'run', mem = 120, lab = 'Running';
        cyc.forEach(([a, b], i) => { if (t >= a) { mem = lerp(120, 256, Lin(t, a, b - a)); if (t >= b) { st = 'dead'; lab = 'OOMKilled ・ exit 137'; } else { st = 'run'; lab = `Running（起こし直し ${i} 回）`; } } });
        if (t > 4600) { st = 'dead'; lab = 'CrashLoopBackOff'; mem = 0; }
        const c = slot('n2', 1); s += pod(c, 'web-c', st, { label: lab, s: nsc('n2') }); const k = UIK;
        const bx = c[0] - 60 * k, by = c[1] + 66 * k; s += R(bx, by, 120 * k, 10 * k, { r: 5 * k, fill: 'var(--ln)', stroke: 'var(--ink)', sw: k }) + R(bx, by, 120 * k * mem / 256, 10 * k, { r: 5 * k, fill: mem > 240 ? C.red : C.orange, stroke: 'none' }) + T(c[0], by + 28 * k, `メモリ ${Math.round(mem)} / 256 Mi`, { a: 'middle', size: 12.5, w: 800, mono: true, halo: true });
        const X0 = 20, Y = 80; s += card(X0, Y, [['起こし直すまでの待ち（秒）', 'var(--mut)'], [''], [''], ['上限 300 s・10 分無事なら元に戻る', 'var(--dim)']], { w: 330, lh: 26, size: 13.5 });
        const waits = [10, 20, 40, 80, 160, 300]; const tot = waits.reduce((a, b) => a + b, 0); let x = X0 + 14 * k; const ww0 = 300 * k;
        waits.forEach((w, i) => { const ww = ww0 * w / tot; const shown = t > [1500, 2900, 4300, 5000, 5600, 6200][i]; s += bar3d(x, Y + 42 * k, ww - 4 * k, 28 * k, shown ? (i < 3 ? C.orange : C.red) : C.gray, { op: shown ? 1 : .3, dx: 5 * k }); if (ww > 24 * k) s += T(x + ww / 2, Y + 61 * k, w, { a: 'middle', size: 12.5, mono: true, w: 800, fill: shown ? 'var(--ink)' : 'var(--dim)' }); x += ww; });
        if (t > 4600) s += clock(c[0] + 60 * k, c[1] - 100 * k, '次まで 40 s', C.red);
        return s; } },
    { kind: 'fail', short: 'ノードが消える', title: '失敗：ノードが黙ると、待ってから別の所で作り直す', cam: [0, 0, 1000, 600], layout: { etcd: [180, 130, .62], ctrl: [500, 120, .7], n2: [280, 430, .64], n3: [730, 430, .64] }, links: [['etcd', 'ctrl', 'watch']], dur: 7200,
      metrics: { want: '3', ready: '3', rs: '0 回', bo: '—' },
      paras: [p('node-3 の kubelet は数秒ごとに <b>Lease</b>（生きている印）を更新している。電源が落ちると、それが止まる。', 0),
        p('約 <span class="n">40〜50 s</span>（node-monitor-grace-period・版で違う）届かないと、node controller が node-3 を <b>NotReady</b> にし、<code>unreachable:NoExecute</code> の taint を付ける。', 1400),
        p('Pod は既定で <span class="n">300 s</span> この taint に耐える（すぐ消すと、一時的な切断で大量に作り直してしまうため）。過ぎると追い出され、ReplicaSet のループが「2 つしかない」と見て紙を作り、scheduler が node-2 に置く。', 3200)],
      callout: ['代償', '既定のままだと、ノードが死んでから作り直しまで<b>約 6 分</b>。速くしたいなら Pod の tolerationSeconds を短くする。ただし一時的な切断でも動くので、短すぎると揺れる。'],
      changes: [['~', 'node-3：Ready → NotReady'], ['-', 'web-b を追い出した'], ['+', 'web-e を node-2 に作った']],
      draw(t) { const dead = t > 1000; const nr = t > 2200; let s = base({ t, links: this.links, hl: t > 2200 && t < 3200 ? ['ctrl'] : [], notReady: nr ? ['n3'] : [], cpuAdd: { n2: .5 + (t > 6000 ? .25 : 0), n3: t < 4200 ? .25 : 0 } });
        s += pod(slot('n2', 0), 'web-a', 'ready', { s: nsc('n2') }) + pod(slot('n2', 1), 'web-c', 'ready', { s: nsc('n2') });
        const k3 = KL('n3'); if (!dead) s += pulse(k3[0], k3[1], t, C.green, 16, { iso: true }); else s += cross(k3[0] + 50 * UIK, k3[1] - 10, 8 * UIK, C.red, { flat: true });
        const n3 = pos('n3');
        if (t > 1000 && t < 2200) s += clock(n3[0] - 80, n3[1] - 150, `知らせなし ${Math.round(lerp(0, 40, Lin(t, 1000, 1200)))} s`, C.red);
        if (nr) s += badge(n3[0], n3[1] - 175, 'taint unreachable:NoExecute', C.red, { center: true, mono: true, op: P(t, 2200, 300) });
        if (t < 4200) s += pod(slot('n3', 0), 'web-b', nr ? 'unk' : 'ready', { s: nsc('n3'), op: t > 3800 ? 1 - P(t, 3800, 400) : 1 });
        if (t > 3000 && t < 4200) s += clock(n3[0] - 80, n3[1] - 130, `耐える ${Math.round(lerp(0, 300, Lin(t, 3000, 900)))} / 300 s`, C.orange);
        if (t > 4200 && t < 4800) s += pod(TRAY(0), '', 'obj', { r: 24 }) + badge(pos('etcd')[0] + 160, pos('etcd')[1] - 40, 'want 3 ・ have 2', C.orange, { center: true, mono: true });
        if (t > 4800) { const kk = P(t, 4800, 1200); s += pod(along(toSlot('n2', 2), kk), kk > .98 ? 'web-e' : '', t > 6400 ? 'ready' : t > 6000 ? 'create' : 'pend', { s: lerp(.45, nsc('n2'), kk) }); }
        return s; } },
    { kind: 'ops', short: 'describe', title: '運用：describe の Events を、出した部品に結ぶ', cam: [0, 0, 1000, 600], layout: { sched: [830, 130, .7], n2: [650, 410, .82] }, links: [], dur: 6000,
      metrics: { want: '3', ready: '2', rs: '3 回', bo: '40 s' },
      paras: [p('<code>kubectl describe pod web-c</code> の Events は、<b>どの部品が</b>何をしたかの記録。From の欄を見ると、図のどこで起きたかが分かる。', 0),
        p('<code>Scheduled</code> は scheduler、<code>Pulling・Created・Started</code> は node-2 の kubelet、<code>BackOff</code> も kubelet。', 1800),
        p('原因は Events ではなく上の <b>Last State</b>：<code>Terminated ・ Reason: OOMKilled ・ Exit Code: 137</code>。ここを読めば「上限」の問題だと分かる。', 3600)],
      callout: ['目安', 'Pending のまま → scheduler の Events（ふるいの理由）。ContainerCreating のまま → kubelet（イメージ・ボリューム・CNI）。再起動を繰り返す → Last State と logs --previous。'],
      changes: [['+', 'Events と部品の対応']],
      draw(t) { let s = base({ t, links: this.links, hl: ['sched', 'kn2'], cpuAdd: { n2: .5 } }); s += startPods('ready', 'web-c'); s += pod(slot('n2', 1), 'web-c', 'dead', { label: 'CrashLoopBackOff', s: nsc('n2') });
        const rows = [['Last State: Terminated', C.red, 3600], ['  Reason:    OOMKilled', C.red, 3600, 'pod'], ['  Exit Code: 137', C.red, 3600], ['Events:', '#9aa3b2', 0], ['Scheduled  default-scheduler', '#9fd3a8', 300, 'sched'], ['Pulling    kubelet', '#9fd3a8', 1800, 'k'], ['Created    kubelet', '#9fd3a8', 2200], ['Started    kubelet', '#9fd3a8', 2600], ['BackOff    kubelet', '#f2a7a7', 3000, 'k']];
        const X = 20, Y = 60, k = UIK; s += card(X, Y, rows.map(([a, c, at]) => [a, c, P(t, at, 300)]), { dark: true, w: 330, lh: 28, size: 14 });
        rows.forEach(([a, c, at, tgt], i) => { if (tgt && t > at + 200) { const to = tgt === 'sched' ? top('sched', 0) : tgt === 'k' ? KL('n2') : slot('n2', 1); const y = Y + (9 + (i + 1) * 28 - 9) * k; s += line(partial([[X + 330 * k, y], to], P(t, at + 200, 600)), { c: c === '#f2a7a7' || c === C.red ? C.red : C.orange, w: 2, dash: '5 4' }); } });
        return s; } },
    { kind: 'sum', short: 'まとめ', title: 'まとめ：3 つのループが差を埋め続ける', cam: [0, 0, 1000, 600], layout: { etcd: [150, 130, .6], sched: [470, 120, .65], ctrl: [800, 120, .65], n2: [300, 440, .6], n3: [720, 440, .6] }, links: [['etcd', 'sched', 'watch'], ['sched', 'ctrl', 'watch']], dur: 4000,
      paras: [p('<b>書く</b>：kubectl → apiserver → etcd。望む状態を帳簿に書くだけ。', 0),
        p('<b>回る</b>：controller（数を合わせる）・scheduler（置き場を決める）・kubelet（起こして見張る）。どれも watch で観て、比べて、差だけ動く。', 1000),
        p('<b>落ちたら</b>：コンテナは kubelet が待ち時間を倍にしつつ起こし直す。ノードは 40〜50 s で NotReady、300 s で追い出し、ReplicaSet が作り直す。', 2200)],
      callout: ['教えるとき', '「誰が命令したか」ではなく「どのループが差を見たか」で考えると、障害の Events が読める。'],
      changes: [['+', '書く・回る・落ちたら']],
      draw(t) { let s = base({ t, links: this.links, hl: ['ctrl', 'sched', 'kn2', 'kn3', 'etcd'], cpuAdd: { n2: .5, n3: .25 } }); s += startPods();
        [['ctrl', '数を合わせる'], ['sched', '置き場を決める'], ['etcd', '望む状態']].forEach(([id, w]) => { const q = top(id, 0); s += badge(q[0], q[1] - 60, w, C.blue, { center: true, size: 13.5 }); });
        [['n2', '起こして見張る'], ['n3', '起こして見張る']].forEach(([id, w], i) => { const q = KL(id); s += loopIcon(q[0] - 80, q[1] - 40, t + i * 300, C.blue, 12) + badge(q[0], q[1] - 40, w, C.blue, { center: true, size: 13 }); });
        return s; } }
  ];
  // ---- 試す ----
  function plan(Pm) { const cap = Math.floor(2048 / Pm.lim); const sched = Math.min(Pm.rep, Pm.nodes * cap); const pend = Pm.rep - sched; const oom = Pm.peak > Pm.lim;
    let tt = 0, b = 10, n = 0; if (oom) while (true) { tt += 15; if (tt > 600) break; n++; tt += b; b = Math.min(300, b * 2); }
    return { cap, sched, pend, oom, per: n, total: n * sched }; }
  const lab = { title: '置ける数と、落ち続けるかを決めるもの', cam: [0, 0, 1000, 600],
    intro: 'ノード 1 台に web 用の空き 2 Gi（2,048 Mi）がある。Pod 1 つの requests = limits を決め、アプリが使うメモリの山を動かす。置けない Pod は Pending、山が上限を超える Pod は OOMKilled を繰り返す（10 分で数える）。',
    params: [{ k: 'rep', label: 'replicas', min: 1, max: 12, step: 1, v: 4, unit: '' }, { k: 'lim', label: 'メモリ上限（1 Pod）', min: 128, max: 1024, step: 64, v: 256, unit: ' Mi' }, { k: 'peak', label: 'アプリの山', min: 100, max: 900, step: 50, v: 300, unit: ' Mi' }, { k: 'nodes', label: 'ノードの数', min: 2, max: 4, step: 1, v: 3, unit: ' 台' }],
    results(Pm) { const r = plan(Pm); return [['置けた Pod', r.sched + ' 個'], ['Ready で居続ける', (r.oom ? 0 : r.sched) + ' 個', 'ready'], ['Pending', r.pend + ' 個'], ['1 Pod の 10 分の落ちた回数', r.per + ' 回'], ['全体の再起動（10 分）', r.total + ' 回', 'rs'], ['1 台に置ける数', r.cap + ' 個'], ['望む数', Pm.rep + '', 'want']]; },
    preds: [{ q: '上限 256 Mi・山 300 Mi のまま、replicas を 4 → 8 にすると？', opts: ['再起動が止まる', '再起動の合計が倍になる', '変わらない'], ans: 1, why: 'どの Pod も同じ上限で落ちる。数を増やしても 1 つ当たりの足りなさは直らない。', tryit: '上限を 320 Mi 以上にして 0 回になるのを見る' },
      { q: '上限 1024 Mi・ノード 3 台・replicas 8 だと Pending は？', opts: ['0 個', '2 個', '5 個'], ans: 1, why: '1 台に 2,048 ÷ 1,024 = 2 個、3 台で 6 個。残り 2 個は置き場がない。', tryit: 'ノードを 4 台にして Pending が 0 になるのを見る' }],
    draw(Pm, t) { const r = plan(Pm); const N = Pm.nodes; const gap = 16, X0 = 40, W = (920 - gap * (N - 1)) / N, Y0 = 200, H = 370; let s = '';
      s += slab(20, 20, 960, 160, { r: 16 }) + T(40, 50, `Pod 1 つ：上限 ${Pm.lim} Mi ・ 山 ${Pm.peak} Mi`, { size: 16, w: 800 });
      s += T(40, 74, r.oom ? `山が上限を ${Pm.peak - Pm.lim} Mi 超える → どの Pod も OOMKilled を繰り返す` : `山は上限に ${Pm.lim - Pm.peak} Mi 余る → 落ちない`, { size: 13, w: 700, fill: r.oom ? C.red : C.green });
      s += T(40, 104, 'Pending（置き場がない）', { size: 12, w: 700, fill: r.pend ? C.purple : 'var(--dim)' });
      for (let i = 0; i < r.pend; i++) s += pod([58 + i * 40, 140], '', 'obj', { r: 16 });
      if (!r.pend) s += T(40, 144, 'なし', { size: 12, fill: 'var(--dim)' });
      let idx = 0; const cnt = (n) => Math.floor(r.sched / N) + (n < r.sched % N ? 1 : 0);
      for (let n = 0; n < N; n++) { const x = X0 + n * (W + gap); const here = cnt(n); s += slab(x, Y0, W, H, { r: 16 }) + T(x + 14, Y0 + 26, `node-${n + 1}`, { size: 14, w: 800, mono: true });
        const used = here * Pm.lim; s += R(x + 14, Y0 + 40, W - 28, 8, { r: 4, fill: 'var(--ln)', stroke: 'none' }) + R(x + 14, Y0 + 40, (W - 28) * used / 2048, 8, { r: 4, fill: C.teal, stroke: 'none' }) + T(x + 14, Y0 + 64, `メモリ ${used} / 2048 Mi`, { size: 11, mono: true, fill: 'var(--mut)' });
        const cols = Math.max(1, Math.floor((W - 20) / 64)); for (let j = 0; j < here; j++) { const cx = x + 44 + (j % cols) * 64, cy = Y0 + 120 + Math.floor(j / cols) * 70; const ph = ((t + (idx + j) * 530) % 2600) / 2600; const st = r.oom ? (ph < .55 ? 'run' : ph < .7 ? 'dead' : 'create') : 'ready';
          s += pod([cx, cy], 'w' + (idx + j + 1), st, { r: 26, label: '' }); }
        idx += here; }
      return s; } };
  // ---- やってみる ----
  const PODN = ['checkout-6c9f8-x2kq', 'checkout-6c9f8-p7tw', 'checkout-6c9f8-m4zd'];
  const tr = { cam: [0, 0, 1000, 600], layout: { n2: [290, 370, .7], n3: [720, 370, .7] }, ps: 'ops@admin:~$', who: '決済チーム', req: 'checkout の Pod が何度も再起動していて、時々 502 が出る。原因を見つけて直して。',
    cards: ['kubectl get pods -l app=checkout', 'kubectl describe pod ' + PODN[0], 'kubectl logs ' + PODN[0] + ' --previous', 'kubectl top pod -l app=checkout', 'kubectl set resources deploy/checkout --requests=memory=512Mi --limits=memory=512Mi', 'kubectl rollout status deploy/checkout', 'kubectl get events --sort-by=.lastTimestamp'],
    refs: [['kubectl', 'https://kubernetes.io/docs/reference/kubectl/'], ['Pod の一生', 'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/'], ['リソース', 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/']],
    tasks: [{ t: 'Pod の状態を見る', ok: (s) => s.f.get }, { t: '落ちた理由を describe で見る', ok: (s) => s.f.desc }, { t: '落ちる直前のログを見る', ok: (s) => s.f.logs }, { t: 'メモリの上限を上げる', ok: (s) => s.f.set }, { t: '入れ替えが終わり、全部 Running か確かめる', ok: (s) => s.f.get2 }],
    init: () => ({ lines: [{ o: '# 本番クラスタ。checkout は replicas 3、上限 256Mi', k: 'd' }], hist: [], f: {}, fixed: false, rolled: false }),
    metrics: (s) => ({ want: '3', ready: s.rolled ? '3' : '1', rs: s.rolled ? '0 回' : '14 回', bo: s.rolled ? '—' : '160 s' }),
    run(cmd, s) { const c = cmd.replace(/\s+/g, ' ').trim(); const o = (x, k) => ({ o: x, k });
      if (/^kubectl get (pods?|po)( -l app=checkout)?( -o wide)?$/.test(c)) { s.f.get = true; if (s.rolled) { s.f.get2 = true; return { out: [o('NAME                        READY   STATUS    RESTARTS   AGE'), ...['5b7d2-q9vn', '5b7d2-k3xs', '5b7d2-w8hd'].map((n) => o(`checkout-${n}          1/1     Running   0          ${40 + n.length}s`, 'h'))] }; }
        return { out: [o('NAME                        READY   STATUS             RESTARTS        AGE'), o(PODN[0] + '   0/1     CrashLoopBackOff   5 (82s ago)     12m', 'e'), o(PODN[1] + '   1/1     Running            4 (3m ago)      12m'), o(PODN[2] + '   0/1     OOMKilled          5 (9s ago)      12m', 'e')] }; }
      if (c.startsWith('kubectl describe pod')) { s.f.desc = true; return { out: [o('Limits:    memory: ' + (s.fixed ? '512Mi' : '256Mi')), o('Last State:  Terminated', 'e'), o('  Reason:     OOMKilled', 'e'), o('  Exit Code:  137', 'e'), o('Events:'), o('  Normal   Pulled   kubelet  Container image "shop/checkout:2.4.1" already present'), o('  Warning  BackOff  kubelet  Back-off restarting failed container checkout', 'e'), o('# 上限 256Mi で殺されている（137 = 128 + SIGKILL 9）', 'd')] }; }
      if (c.startsWith('kubectl logs')) { if (!/--previous|-p\b/.test(c)) return { out: [o('INFO starting checkout 2.4.1'), o('# 今のコンテナは起きたばかり。落ちる前を見るには --previous', 'd')] }; s.f.logs = true; return { out: [o('INFO cache warmup: loading 180000 price rows'), o('INFO cache warmup: 61% (heap 231MiB)'), o('INFO cache warmup: 88% (heap 252MiB)'), o('# ここで途切れている：起動時の読み込みで上限に届く', 'd')] }; }
      if (c.startsWith('kubectl top pod')) return { out: [o('NAME                        CPU(cores)   MEMORY(bytes)'), o(PODN[1] + '   210m         249Mi', 'e'), o('# 動いている Pod も上限ぎりぎり', 'd')] };
      if (/^kubectl set resources (deploy|deployment)\/checkout .*--limits=memory=(\d+)(Mi|Gi)/.test(c)) { const m = c.match(/--limits=memory=(\d+)(Mi|Gi)/); const mi = +m[1] * (m[2] === 'Gi' ? 1024 : 1); if (mi < 320) return { out: [o('deployment.apps/checkout resource requirements updated'), o('# ' + mi + 'Mi では起動時の山（約 300Mi）に足りない', 'e')] }; s.fixed = true; s.f.set = true; return { out: [o('deployment.apps/checkout resource requirements updated', 'h'), o('# 新しい ReplicaSet が作られ、1 つずつ入れ替わる', 'd')] }; }
      if (c.startsWith('kubectl rollout status')) { if (!s.fixed) return { out: [o('Waiting for deployment "checkout" rollout to finish: 1 of 3 updated replicas are available...', 'e'), o('# 上限を直していないので終わらない', 'd')] }; s.rolled = true; return { out: [o('Waiting for deployment "checkout" rollout to finish: 1 of 3 updated replicas are available...'), o('Waiting for deployment "checkout" rollout to finish: 2 of 3 updated replicas are available...'), o('deployment "checkout" successfully rolled out', 'h')] }; }
      if (c.startsWith('kubectl get events')) return { out: [o('LAST SEEN  TYPE     REASON    OBJECT                     MESSAGE'), o('9s         Warning  BackOff   pod/' + PODN[0] + '  Back-off restarting failed container', 'e'), o('2m         Normal   Killing   pod/' + PODN[2] + '  Container checkout ...', 'e')] };
      if (c === 'help') return { out: [o('使える命令：下の見本を押すと入る')] };
      return { out: [o('この場面では使えない命令（help）', 'e')] }; },
    draw(s, t) { let st = base({ t, hl: s.rolled ? [] : ['kn2', 'kn3'], cpuAdd: { n2: .5, n3: .25 } });
      const posn = [['n2', 0], ['n3', 0], ['n2', 1]];
      posn.forEach(([n, i], j) => { if (s.rolled) { st += pod(slot(n, i), 'new-' + (j + 1), 'ready', { s: nsc(n) }); return; } const ph = ((t + j * 900) % 3000) / 3000; const state = j === 1 ? (ph < .8 ? 'run' : 'dead') : ph < .45 ? 'create' : ph < .6 ? 'run' : 'dead'; st += pod(slot(n, i), 'chk-' + (j + 1), state, { s: nsc(n), label: state === 'dead' ? 'OOMKilled' : state === 'create' ? '待って起こす' : 'Running' }); });
      st += badge(500, 80, s.rolled ? '上限 512 Mi ・ 新しい ReplicaSet' : '上限 256 Mi ・ 起動時に約 300 Mi 使う', s.rolled ? C.green : C.red, { center: true, size: 14 });
      if (s.fixed && !s.rolled) st += badge(500, 120, '入れ替え待ち：rollout status で見届ける', C.orange, { center: true, size: 13 });
      return st; } };
  const quiz = [{ k: 'order', q: 'kubectl apply から、コンテナが動くまでを順に並べる', items: ['apiserver が etcd に書く', 'ReplicaSet のループが Pod の紙を作る', 'scheduler が置くノードを決める', 'kubelet がコンテナを起こす', 'readiness が通り Ready になる'], shuffled: ['kubelet がコンテナを起こす', 'scheduler が置くノードを決める', 'readiness が通り Ready になる', 'apiserver が etcd に書く', 'ReplicaSet のループが Pod の紙を作る'], why: '書く → 紙を作る → 置き場を決める → 起こす → Ready。どれも別の部品の別のループ。' },
    { k: 'hit', q: 'Pod をどのノードに置くか決める部品はどれ？', hits: ['api', 'etcd', 'sched', 'ctrl'], ans: 'sched', why: 'kube-scheduler。ふるい（Filter）と点（Score）で決め、nodeName を書く（bind）だけをする。' },
    { k: 'pick', q: 'Last State が Terminated・Exit Code 137。意味は？', opts: ['アプリが 137 を返して終わった', '外から SIGKILL で殺された（128 + 9）。Reason が OOMKilled なら上限', 'イメージが見つからない'], ans: 1, why: '128 + シグナル番号。9 は SIGKILL。Reason: OOMKilled なら cgroup のメモリ上限。' },
    { k: 'num', q: 'CrashLoopBackOff の待ちが 10 → 20 → 40 s と来た。次は何秒？', ans: 80, why: '倍に延びる。上限は 300 s。' },
    { k: 'pick', q: 'ノードが電源ごと落ちた。そこにあった Pod を別のノードで作り直すのは？', opts: ['落ちたノードの kubelet', 'taint で追い出された後、ReplicaSet のループ', 'scheduler が自分で気づいて動かす'], ans: 1, why: 'kubelet は落ちている。node controller が NotReady と taint、300 s 後に追い出し、ReplicaSet が足りない分を作り、scheduler が置き場を決める。' }];
  function drawQuiz(t, hits, a, q) { let s = base({ t, links: [['kubectl', 'api'], ['api', 'etcd', 'both'], ['api', 'sched', 'watch'], ['api', 'ctrl', 'watch']] });
    hits.forEach((id) => { const o = at(id); if (!o) return; const [fw, fd] = objFoot(o); s += pad(o.x, o.y, (fw + 80) * o.s, (fd + 80) * o.s, C.blue, { f: 14, id }) + pulse(o.x, o.y, t, C.blue, 34, { iso: true }); });
    if (a && q && q.k === 'hit') { const o = at(q.ans); const [fw, fd] = objFoot(o); s += pad(o.x, o.y, (fw + 80) * o.s, (fd + 80) * o.s, C.green, { f: 24 }); } return s; }
  const TERMS = {
    server: { t: 'サーバ', m: ['サーバ', 'マシン'], d: 'ネットワークの向こうで、頼まれた仕事をし続けるコンピュータ。' },
    container: { t: 'コンテナ', m: ['コンテナ'], d: 'アプリと、それが動くのに要る物（ライブラリなど）をひとまとめにして、どのサーバでも同じように動かせるようにした箱。' },
    pod: { t: 'Pod', m: ['Pod'], d: 'Kubernetes が動かす最小の単位。中に 1 つ（時に複数）のコンテナが入っている。図では六角の柱。' },
    node: { t: 'ノード', m: ['ノード', 'node-'], d: 'Pod を実際に動かすサーバ 1 台。図では緑の台。' },
    cluster: { t: 'クラスタ', m: ['クラスタ'], d: '何台ものノードと、それをまとめて管理する部品の集まり。' },
    k8s: { t: 'Kubernetes', m: ['Kubernetes'], d: 'たくさんのサーバの上で、コンテナを決めた数だけ動かし続けてくれる仕組み。落ちたら勝手に戻す。' },
    kubectl: { t: 'kubectl', m: ['kubectl'], d: 'Kubernetes に命令を送るための道具（コマンド）。あなたの端末で打つ。' },
    yaml: { t: 'YAML（web.yaml）', m: ['YAML', 'web.yaml'], d: '設定を書くための書き方の一つ。ここでは「web を 3 つ動かしたい」という望みを書いた紙（ファイル）。' },
    apply: { t: 'apply', m: ['apply'], d: '「この紙に書いた通りの状態にして」という kubectl の命令。' },
    desired: { t: '望む状態', m: ['望む状態'], d: '「こうなっていてほしい」という目標（例：web が 3 つ）。今の状態とずれていたら、Kubernetes が直す。' },
    deploy: { t: 'Deployment', m: ['Deployment'], d: '「このアプリを何個動かすか・どう入れ替えるか」を書く設定の種類。' },
    replicas: { t: 'replicas', m: ['replicas'], d: '同じ Pod をいくつ動かすかの数。ここでは 3。' },
    rs: { t: 'ReplicaSet', m: ['ReplicaSet'], d: 'Pod の数を replicas に合わせ続ける係の設定。Deployment が作る。' },
    api: { t: 'kube-apiserver', m: ['apiserver'], d: 'Kubernetes のただ 1 つの受付。命令も状態の読み書きも、全部ここを通る。' },
    etcd: { t: 'etcd', m: ['etcd'], d: '望む状態と今の状態を記録しておく帳簿（データベース）。apiserver だけが直接さわる。' },
    sched: { t: 'kube-scheduler', m: ['scheduler'], d: '置き場所が決まっていない Pod を見つけて、どのノードで動かすかを決める係。' },
    ctrl: { t: 'controller-manager', m: ['controller'], d: '「望む数」と「今の数」を比べ続け、足りなければ Pod の紙を作る係（制御ループの集まり）。' },
    kubelet: { t: 'kubelet', m: ['kubelet'], d: '各ノードにいる係。自分のノードに来た Pod のコンテナを起こし、見張り、状態を報告する。' },
    loop: { t: '制御ループ', m: ['ループ'], d: '「観る → 比べる → 差を埋める」を繰り返し続ける仕組み。Kubernetes の部品はみなこの形。' },
    watch: { t: 'watch', m: ['watch'], d: '「変わったらすぐ知らせて」と頼んでおく仕組み。部品は apiserver を watch して動く。' },
    cpu: { t: 'CPU 要求', m: ['CPU', '要求'], d: '「この Pod は CPU をこれだけ使う」という予約（requests）。scheduler はこの合計で入るかを判断する。' },
    mem: { t: 'メモリ上限（limits）', m: ['上限', 'limits'], d: '「この Pod はメモリをここまでしか使ってはいけない」という線。超えると強制的に止められる。' },
    mib: { t: 'Mi・Gi', m: ['Mi', 'Gi'], d: 'メモリの量の単位。1 Mi ＝ 1,048,576 バイト、1 Gi ＝ 1,024 Mi。' },
    oom: { t: 'OOMKilled', m: ['OOM'], d: 'メモリ不足（Out Of Memory）で、カーネルにプロセスを強制終了された状態。' },
    exitcode: { t: '終了コード', m: ['終了コード', 'exit', 'Exit Code'], d: 'プロセスが終わる時に残す番号。0 は正常、137 は外から強制終了（SIGKILL）された印。' },
    backoff: { t: 'CrashLoopBackOff', m: ['CrashLoopBackOff', 'BackOff'], d: '落ちては起こし直すのを繰り返しているので、次に起こすまで待っている状態の名前。原因ではない。' },
    ready: { t: 'Ready', m: ['Ready'], d: '起動して検査（readiness probe）にも通り、客を受けてよい状態。' },
    probe: { t: 'readiness probe', m: ['readiness', 'probe'], d: 'kubelet が「客を受けられるか」を定期的に確かめる検査（例：GET /healthz）。' },
    image: { t: 'イメージ', m: ['イメージ', 'nginx'], d: 'コンテナの元になる、アプリ一式を固めたファイル。ここから起動する。' },
    taint: { t: 'taint', m: ['taint'], d: 'ノードに付ける「近寄るな」の印。NotReady のノードには自動で付き、Pod が追い出される。' },
    notready: { t: 'NotReady', m: ['NotReady'], d: 'ノードから生きている知らせが届かなくなった状態。' },
    events: { t: 'Events', m: ['Events', 'describe'], d: 'どの部品が何をしたかの記録。kubectl describe で見られる。' },
    n1: { t: 'node-1', m: [], d: 'ノード（サーバ）1 台目。重いバッチ処理で CPU がほぼ埋まっている。' },
    n2: { t: 'node-2', m: [], d: 'ノード（サーバ）2 台目。' }, n3: { t: 'node-3', m: [], d: 'ノード（サーバ）3 台目。' }
  };
  const TALIAS = {};
  const INTRO = { kind: 'intro', short: '言葉', title: '始める前に：言葉をそろえる', cam: [0, 0, 1000, 600], dur: 6500,
    layout: { kubectl: [150, 430, .9], api: [460, 440, .85], n2: [790, 440, .62] }, links: [['kubectl', 'api'], ['api', 'n2']],
    metrics: { want: '3', ready: '3', rs: '0 回', bo: '—' },
    terms: ['server', 'container', 'pod', 'node', 'cluster', 'k8s', 'kubectl', 'apply', 'yaml', 'desired', 'replicas'],
    paras: [p('このレッスンは「サーバの上でアプリを動かし続ける仕組み」Kubernetes の中身を追う。まず言葉をそろえる。', 0),
      p('アプリは<b>コンテナ</b>という箱に入れて動かす。Kubernetes はコンテナを <b>Pod</b>（図の六角の柱）という単位で扱い、<b>ノード</b>（サーバ 1 台・緑の台）の上に置いて動かす。', 1400),
      p('あなたは「web を 3 つ動かしたい」と<b>望む状態</b>を紙（YAML）に書き、上の黒い札の命令で Kubernetes に渡すだけ。どこで動かすか・落ちたらどうするかは Kubernetes が決める。', 3000),
      p('図の真ん中の六角の台が Kubernetes の受付（apiserver）。右の台がノードで、上に Pod が乗っている。', 4600)],
    callout: ['たとえると', 'あなたは店長、YAML は「棚に商品を 3 つ並べておいて」というメモ。Kubernetes は店員たちで、減ったら補充し、棚が壊れたら別の棚に並べ直す。'],
    changes: [['+', '登場する物：kubectl・Kubernetes の受付・ノード・Pod']],
    draw(t) { let s = base({ t, links: this.links, hl: ['api'], names: { api: ['Kubernetes の受付', 'kube-apiserver'], kubectl: ['kubectl', '命令を送る道具'] } }); s += pod(slot('n2', 0), 'Pod', 'ready', { s: nsc('n2'), label: '' }) + pod(slot('n2', 1), 'Pod', 'ready', { s: nsc('n2'), label: '' }) + pod(slot('n2', 3), 'Pod', 'ready', { s: nsc('n2'), label: '' });
      s += anatomy(500, 80, [['kubectl', '#9aa3b2', '命令を送る道具', 'kubectl'], [' ', null], ['apply', '#7fb2ff', '書いた通りにして', 'apply'], [' ', null], ['-f', '#f5b46b', 'ファイルから読む'], [' ', null], ['web.yaml', '#8fd6a8', '望む状態を書いた紙', 'yaml']], t, { center: true, step: 600, rows: [0, 0, 1, 0, 2, 0, 0] });
      if (t > 3000) { const k = Lin((t - 3000) % 2600, 0, 2000); s += doc(along([top('kubectl'), top('api'), top2('n2', 0)], k), 'web.yaml', C.green); }
      return s; } };
  steps.unshift(INTRO);
  LESSONS.push({ terms: TERMS, termAlias: TALIAS, id: 'k8s', tab: 'Kubernetes（制御ループ）', color: C.teal, kick: 'コンテナ基盤 ・ 段 2（仕組み）・ 見せ方：クラスタと制御ループ', title: 'Pod が落ちても戻るのはなぜか',
    goal: '望む状態・3 つのループ・待ち時間の伸び方で、Pod の起動と復旧を説明し、Events から原因の部品を当てられる',
    metrics: [{ k: 'want', label: '望む数' }, { k: 'ready', label: 'Ready' }, { k: 'rs', label: '再起動' }, { k: 'bo', label: '次の再試行' }],
    legend: [['Ready', C.green], ['起動中', C.orange], ['落ちた', C.red], ['置き場未定の紙', C.purple], ['他の Pod', C.gray]], scene: true, steps, lab, tr, quiz, drawQuiz, quizCam: [0, 0, 1000, 600], quizLayout: { kubectl: [120, 330, .72], api: [330, 190, .72], etcd: [560, 330, .72], sched: [770, 180, .72], ctrl: [860, 430, .66] }, note: 'Kubernetes は命令でなく、望む状態と今の差を 3 つのループが埋め続ける' });
})();
