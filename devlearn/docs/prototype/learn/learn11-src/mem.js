// ================= レッスン 3：名前と物（Python のメモリ）—— 見せ方の型：memory（コード・フレーム・ヒープ・参照の矢印） =================
(() => {
  const p = (h, at) => ({ h, at });
  const CODE = ['a = [1, 2]', 'b = a', 'b.append(3)', 'print(a)', '', 'def add(xs):', '    xs = xs + [4]', '    return xs', '', 'c = add(a)', 'a = None', 'del b', '', 'd = []', 'd.append(d)', 'del d'];
  const CX = 20, CW = 300, LY = (n) => 70 + (n - 1) * 31;
  const FX = 346, FW = 240, OX = 614, OW = 366;
  const FY = { mod: 52, add: 330 }; const OY = { L1: 52, L2: 236, T: 420, L3: 420 };
  const ID = { L1: '0x7f3a…c0', L2: '0x7f3a…40', T: '0x7f3a…80', L3: '0x7f3a…00' };
  const rowY = (f, i) => FY[f] + 50 + i * 42;
  const anchor = (k) => ANC[k] || [OX, OY[k] + 90];
  function curve(a, b, c, k = 1, o = {}) { const [x1, y1] = a, [x2, y2] = b; const dx = Math.max(40, (x2 - x1) * .45);
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)}C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)} ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    return `<path d="${d}" pathLength="1" style="fill:none;stroke:${c};stroke-width:${o.w || 2.4};stroke-dasharray:1;stroke-dashoffset:${(1 - k).toFixed(3)};opacity:${o.op ?? 1};stroke-linecap:round"/>` + (k > .97 ? `<g style="opacity:${o.op ?? 1}">${head(x2, y2, 0, c, 10)}</g>` : ''); }
  function code(cur, done = [], out = []) { let s = slab(CX, 20, CW, 552, { c: '#3a3f4a', fill: '#16181d', stroke: '#2a2e36', d: 9, r: 16 }) + T(CX + 16, 42, 'main.py', { size: 12, w: 700, mono: true, fill: '#8a93a3' });
    const curs = [].concat(cur || []);
    CODE.forEach((ln, i) => { const n = i + 1, y = LY(n); const on = curs.includes(n);
      if (on) s += R(CX + 6, y - 19, CW - 12, 28, { r: 6, fill: 'rgba(217,162,27,.22)', stroke: C.yellow, sw: 1.5 });
      s += T(CX + 30, y, n, { a: 'end', size: 12, mono: true, fill: '#5f6775' }) + T(CX + 42, y, ln, { size: 15, mono: true, w: on ? 700 : 400, fill: on ? '#fff' : done.includes(n) ? '#c9d1dc' : '#8a93a3' }); });
    out.forEach(([txt, n, op]) => { s += `<g style="opacity:${op ?? 1}">${R(CX + 160, LY(n) - 18, 128, 26, { r: 6, fill: '#2b3a2f', stroke: C.green, sw: 1 })}${T(CX + 224, LY(n), '→ ' + txt, { a: 'middle', size: 13, mono: true, w: 700, fill: '#9fd3a8' })}</g>`; });
    return s; }
  // フレーム：等角の板。名前は板の上に立つ札、矢印はその頭から出る
  const FS = .78, VC = [C.blue, C.orange, C.green];
  const fctr = (f, dy = 0) => [FX + FW / 2 + 10, FY[f] + 120 + dy];
  const varTop = (f, i, dy = 0) => { const [cx, cy] = fctr(f, dy); return localProj(cx, cy, FS)(-75 + i * 75, 15, 12 + 34); };
  function frameCard(f, vars, o = {}) { const [cx, cy] = fctr(f, o.dy || 0); const L = localProj(cx, cy, FS); let s = `<g style="opacity:${o.op ?? 1}">`;
    s += rprism(rrectPts(-130, -75, 260, 150, 26), 0, 12, o.hl ? C.blue : C.gray, { topPct: o.hl ? 16 : 8 }, L);
    vars.forEach((v, i) => { const c = v.c || VC[i % 3]; const vo = v.op ?? 1; s += `<g style="opacity:${vo}">` + rprism(rrectPts(-75 + i * 75 - 20, 15 - 20, 40, 40, 9, 3), 12, 34, c, { topPct: v.hl ? 40 : 24, shadow: false }, L);
      const tp = varTop(f, i, o.dy || 0); s += T(tp[0], tp[1] - 12, v.n, { a: 'middle', size: 19, w: 800, mono: true, halo: true });
      if (v.val !== undefined) s += badge(tp[0], tp[1] - 40, v.val, C.gray, { center: true, mono: true, size: 12.5 }); s += '</g>'; });
    const bp = L(130, 75, 12); s += tag(bp[0] - 40, bp[1] + 22, f === 'mod' ? 'フレーム <module>' : 'フレーム add()', { size: 13.5, dot: o.hl ? C.blue : C.gray, mono: true });
    return s + '</g>'; }
  // リストの物：等角の台に、立方体のマスが並ぶ
  const OS = .84, ANC = {};
  function objCard(k, o) { const cap = Math.max(1, o.cap ?? o.vals.length); const freed = o.ref === 0; const Lc = cap * 44; const cx = OX + OW / 2 - 30, cy = OY[k] + 66; const L = localProj(cx, cy, OS);
    const c = freed ? C.red : o.hl ? C.blue : C.gray; let s = `<g style="opacity:${o.op ?? 1};cursor:help" data-term="list">`;
    s += rprism(rrectPts(-Lc / 2 - 14, -34, Lc + 28, 68, 18), 0, 12, c, { topPct: o.hl ? 16 : 8, dash: freed ? `${6 * UIK} ${5 * UIK}` : undefined }, L);
    for (let i = 0; i < cap; i++) { const x = -Lc / 2 + 22 + i * 44; const used = i < o.vals.length; const v = o.vals[i];
      if (used) { s += rprism(rrectPts(x - 17, -17, 34, 34, 7, 3), 12, 26, o.newIdx === i ? C.blue : C.yellow, { topPct: 34, shadow: false }, L); const tp = L(x, 0, 38);
        s += v === '↺' ? `<circle cx="${tp[0]}" cy="${tp[1]}" r="6" style="fill:${C.purple};stroke:var(--ink);stroke-width:1"/>` : T(tp[0], tp[1] + 6, v, { a: 'middle', size: 16, w: 800, mono: true, halo: true }); }
      else s += `<polygon points="${ptsS(rectPts(x - 15, -15, 30, 30).map((q) => L(q[0], q[1], 12)))}" style="fill:none;stroke:var(--dim);stroke-width:${1.2 * UIK};stroke-dasharray:${4 * UIK} ${3 * UIK}"/>`; }
    const tpt = L(-Lc / 2 - 14, -34, 12), rpt = L(Lc / 2 + 14, -34, 12), bpt = L(Lc / 2 + 14, 34, 12);
    s += tag(tpt[0] + 10, tpt[1] - 22, `list ・ id ${ID[k]}`, { size: 12.5, dot: c });
    s += badge(rpt[0] - 30, rpt[1] - 30, freed ? '参照 0 → 解放' : `参照 ${o.ref}`, freed ? C.red : o.ref > 1 ? C.orange : C.green, { center: true, size: 13 });
    s += T(bpt[0] - 10, bpt[1] + 22, `長さ ${o.vals.length} ・ 容量 ${cap} ・ ${56 + 8 * cap} B`, { a: 'end', size: 12.5, w: 700, mono: true, fill: 'var(--mut)', halo: true });
    if (o.note) s += badge(bpt[0] - 10, bpt[1] + 48, o.note, o.noteC || C.blue, { size: 12.5 });
    ANC[k] = L(-Lc / 2 - 14, 34, 6);
    return s + '</g>'; }
  const ptr = (f, i, k, c = C.blue, prog = 1, o = {}) => curve(varTop(f, i, o.dy || 0), o.to || anchor(k), c, prog, o);
  function heads() { return T(FX, 40, 'スタック（名前の置き場）', { size: 12, w: 700, fill: 'var(--mut)' }) + T(OX, 40, 'ヒープ（物の置き場）', { size: 12, w: 700, fill: 'var(--mut)' }); }
  const L12 = { vals: ['1', '2'], cap: 2 }, L123 = { vals: ['1', '2', '3'], cap: 8 };

  const steps = [
    { kind: 'problem', short: '問題', title: 'b に足したのに、a も変わった', cam: [0, 0, 1000, 600], dur: 5200,
      metrics: { objs: '1', ref: '2', frames: '1', heap: '120 B' },
      paras: [p('<code>a = [1, 2]</code>、<code>b = a</code>、<code>b.append(3)</code>。<code>print(a)</code> は <code>[1, 2, 3]</code> を出す。b にしか足していないのに。', 0),
        p('答えは図の右側にある。<b>a と b は同じ 1 つの物を指す 2 つの名前</b>で、物はヒープに 1 つしかない。', 2200),
        p('このレッスンで答える問い：<b>名前と物はどこにあり、いつ物が増え、いつ消えるのか。</b>', 3800)],
      callout: ['ポイント', 'Python の <code>=</code> は「写す」ではなく「名前を物に結ぶ」。同じ物に名前が何個付いても、物は 1 つ。'],
      changes: [['+', 'a・b → 同じリスト'], ['~', 'リスト [1, 2] → [1, 2, 3]']],
      draw(t) { const ln = t < 900 ? 1 : t < 1600 ? 2 : t < 2300 ? 3 : 4; let s = code(ln, [1, 2, 3, 4].filter((n) => n < ln), t > 2500 ? [['[1, 2, 3]', 4, P(t, 2500, 300)]] : []) + heads();
        s += frameCard('mod', [{ n: 'a' }, { n: 'b', op: P(t, 900, 300) }]);
        s += objCard('L1', t < 1600 ? { ...L12, ref: t < 900 ? 1 : 2 } : { ...L123, ref: 2, newIdx: 2, hl: t < 2300 });
        s += ptr('mod', 0, 'L1', C.blue, P(t, 200, 500)) + (t > 900 ? ptr('mod', 1, 'L1', C.orange, P(t, 900, 500)) : '');
        if (t > 3800) s += pulse(OX + 40, OY.L1 + 57, t, C.orange, 24);
        return s; } },
    { kind: 'mech', short: '名前と物', title: '1 行目：物をヒープに作り、名前を結ぶ', cam: [0, 0, 1000, 600], dur: 4400,
      metrics: { objs: '1', ref: '1', frames: '1', heap: '72 B' },
      paras: [p('<code>[1, 2]</code> を評価すると、<b>ヒープ</b>に list の物が 1 つできる。物には型・参照の数・中身がある。', 0),
        p('次に <code>a</code> という<b>名前</b>が、今のフレーム（<code>&lt;module&gt;</code>）に置かれ、物を指す。名前の側には物の場所（アドレス）しか入っていない。', 1500),
        p('物の参照の数は <span class="n">1</span>。大きさは <code>sys.getsizeof</code> で <span class="n">72 B</span>（空の list 56 B ＋ 場所 8 B × 2）。', 2900)],
      callout: ['知っておくと便利', '中の 1 と 2 も物。−5〜256 の小さな整数は最初から作ってあり、使い回される。リストの中にあるのは数そのものではなく、その物への場所。'],
      changes: [['+', 'list の物（id …c0・参照 1）'], ['+', '名前 a']],
      deep: '<p>CPython の list は <code>PyListObject</code>：頭（参照の数 <code>ob_refcnt</code>・型 <code>ob_type</code>・長さ <code>ob_size</code>）と、<code>PyObject **ob_item</code>（場所の並び）と <code>allocated</code>（容量）。2 つの定数の list は BUILD_LIST 2 でちょうど 2 つ分だけ取る。</p>',
      draw(t) { let s = code(1) + heads(); s += objCard('L1', { ...L12, ref: t > 1500 ? 1 : 0, op: P(t, 100, 500), note: t < 1500 ? 'できたて' : '', noteC: C.green });
        if (t < 1500) s = s.replace('参照 0 → 解放', '参照 0');
        s += frameCard('mod', [{ n: 'a', op: P(t, 1500, 300) }]); if (t > 1500) s += ptr('mod', 0, 'L1', C.blue, P(t, 1600, 600));
        return s; } },
    { kind: 'mech', short: 'b = a', title: '2 行目：b = a は写さない。矢印が 1 本増えるだけ', cam: [0, 0, 1000, 600], dur: 3800,
      metrics: { objs: '1', ref: '2', frames: '1', heap: '72 B' },
      paras: [p('<code>b = a</code> は、a が指している物を探し、<b>b という名前を同じ物に結ぶ</b>。物は作らない。', 0),
        p('物の参照の数が <span class="n">1 → 2</span> に上がる。<code>a is b</code> は <code>True</code>、<code>id(a) == id(b)</code>。', 1600)],
      callout: ['注意', '関数に渡す時も同じ。<code>f(a)</code> は物を写さず、引数の名前を同じ物に結ぶ。'],
      changes: [['+', '名前 b → 同じ物'], ['~', '参照 1 → 2']],
      draw(t) { let s = code(2, [1]) + heads(); s += frameCard('mod', [{ n: 'a' }, { n: 'b', op: P(t, 200, 300), hl: true }]);
        s += objCard('L1', { ...L12, ref: t > 1600 ? 2 : 1, hl: t > 1600 && t < 2600 }) + ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange, P(t, 500, 900));
        return s; } },
    { kind: 'inside', short: 'append', title: '3 行目：物を直す。容量が足りず、場所の並びを取り直す', cam: [0, 0, 1000, 600], dur: 5400,
      metrics: { objs: '1', ref: '2', frames: '1', heap: '120 B' },
      paras: [p('<code>b.append(3)</code> は b が指す<b>物そのもの</b>を直す。名前の矢印は動かない。', 0),
        p('長さ 2・容量 2 で満杯なので、場所の並びを取り直す。新しい容量は <span class="n">(3 + 3//8 + 6) &amp; ~3 = 8</span>。余分に取って、次の append を速くする。', 1400),
        p('3 が入り、<code>getsizeof</code> は <span class="n">72 → 120 B</span>。同じ物を a も指しているので、<code>print(a)</code> は <code>[1, 2, 3]</code>。', 3400)],
      callout: ['ポイント', '「直す」（append・sort・代入 a[0] = …）は物を変え、全ての名前から見える。「作る」（+・スライス・copy）は新しい物を返す。'],
      changes: [['~', '容量 2 → 8・大きさ 72 → 120 B'], ['+', '3 が入った']],
      deep: '<p><code>list_resize()</code> は <code>new_allocated = (newsize + (newsize &gt;&gt; 3) + 6) &amp; ~3</code> で容量を決め、<code>PyMem_Realloc</code> で場所の並びだけを取り直す。物の id（頭のアドレス）は変わらないので、指している名前はそのまま使える。</p>',
      draw(t) { const grown = t > 1400; let s = code(t < 3400 ? 3 : 4, [1, 2, 3].filter((n) => n < (t < 3400 ? 3 : 5)), t > 3600 ? [['[1, 2, 3]', 4, P(t, 3600, 300)]] : []) + heads();
        s += frameCard('mod', [{ n: 'a' }, { n: 'b', hl: t < 1400 }]);
        const o = grown ? { vals: t > 2600 ? ['1', '2', '3'] : ['1', '2'], cap: 8, ref: 2, hl: true, newIdx: t > 2600 ? 2 : -1, note: t < 2600 ? '容量 2 → 8' : '', noteC: C.orange } : { ...L12, ref: 2, hl: true, note: '満杯', noteC: C.red };
        s += objCard('L1', o) + ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange);
        if (t > 2200 && t < 2600) s += chip(OX + 14 + 2 * 42 + 19, OY.L1 + 57 - 40 * (1 - P(t, 2200, 400)), 30, 26, '3', C.blue);
        return s; } },
    { kind: 'mech', short: '呼ぶ', title: '10 行目：add(a) を呼ぶとフレームを積み、xs も同じ物を指す', cam: [0, 0, 1000, 600], dur: 4400,
      metrics: { objs: '1', ref: '3', frames: '2', heap: '120 B' },
      paras: [p('関数を呼ぶと、<b>新しいフレーム</b>がスタックの上に積まれる。そこに引数の名前 <code>xs</code> ができる。', 0),
        p('<code>xs</code> は a と同じ物を指す（写さない）。参照の数は <span class="n">2 → 3</span>。', 1600),
        p('この時 xs.append(4) と書けば、a にも見える。でも 7 行目は <code>xs = xs + [4]</code> と書いてある。次で違いを見る。', 2800)],
      callout: ['知っておくと便利', 'フレームには名前の置き場の他に「どの行まで進んだか」と「呼んだ元のフレーム」が入る。例外の Traceback は、この積み重ねを上から読んだもの。'],
      changes: [['+', 'フレーム add()'], ['+', '名前 xs → 同じ物'], ['~', '参照 2 → 3']],
      draw(t) { let s = code(t < 1200 ? 10 : 6, [1, 2, 3, 4]) + heads(); s += frameCard('mod', [{ n: 'a' }, { n: 'b' }]);
        s += frameCard('add', [{ n: 'xs', hl: true }], { op: P(t, 400, 500), dy: 30 * (1 - P(t, 400, 500)), hl: true });
        s += objCard('L1', { ...L123, ref: t > 1600 ? 3 : 2, hl: t > 1600 && t < 2600 }) + ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange);
        if (t > 1300) s += ptr('add', 0, 'L1', C.purple, P(t, 1300, 700));
        return s; } },
    { kind: 'inside', short: 'xs + [4]', title: '7 行目：+ は新しい物を作り、xs だけが向きを変える', cam: [0, 0, 1000, 600], dur: 6200,
      metrics: { objs: '2', ref: '2', frames: '2', heap: '208 B' },
      paras: [p('右側の <code>xs + [4]</code> が先に動く。まず <code>[4]</code> の物が一時的にでき、次に <b>新しい list</b>（長さ 4・容量 4・<span class="n">88 B</span>）ができて中身が写される。', 0),
        p('その後 <code>xs =</code> で、名前 xs が<b>新しい物</b>へ向きを変える。元の物の参照は <span class="n">3 → 2</span>。a も b も何も変わらない。', 2600),
        p('一時の <code>[4]</code> は誰にも指されなくなり、参照 <span class="n">0</span> になった瞬間に消える。', 4400)],
      callout: ['注意', '<code>xs += [4]</code> なら話が変わる。list の <code>+=</code> は物を直す（extend）ので、a にも 4 が入る。'],
      changes: [['+', '新しい list [1, 2, 3, 4]'], ['~', 'xs → 新しい物'], ['-', '一時の [4] が消えた']],
      deep: '<p><code>BINARY_OP (+)</code> → <code>list_concat()</code> は長さを足した分だけちょうど取り、場所を写す（中の物は共有で参照の数が上がる）。<code>STORE_FAST xs</code> が古い参照を減らし新しい参照を置く。一時の物は評価スタックから降りた時に <code>Py_DECREF</code> され、0 で <code>list_dealloc</code>。</p>',
      draw(t) { let s = code(7, [1, 2, 3, 4, 6, 10]) + heads(); s += frameCard('mod', [{ n: 'a' }, { n: 'b' }]) + frameCard('add', [{ n: 'xs', hl: t > 2600 && t < 3600 }], { hl: true });
        s += objCard('L1', { ...L123, ref: t > 2900 ? 2 : 3 }) + ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange);
        s += objCard('T', { vals: ['4'], cap: 1, ref: t > 4400 ? 0 : 1, op: P(t, 200, 300) * (t > 4800 ? 1 - P(t, 4800, 600) : 1), note: '一時の物', noteC: C.gray });
        s += objCard('L2', { vals: ['1', '2', '3', '4'].slice(0, Math.floor(clamp((t - 1000) / 1400) * 4.99)), cap: 4, ref: t > 2900 ? 1 : 0, op: P(t, 900, 300), hl: t > 2600, note: t < 2600 ? 'できている途中' : '', noteC: C.green });
        if (t < 2600) s = s.replace('参照 0 → 解放', '参照 0'); // L2 はまだ誰にも結ばれていない
        if (t < 2700) s += ptr('add', 0, 'L1', C.purple); else s += ptr('add', 0, 'L2', C.purple, P(t, 2700, 700));
        return s; } },
    { kind: 'mech', short: 'return', title: '8・10 行目：return でフレームが外れ、c が物を受け取る', cam: [0, 0, 1000, 600], dur: 4400,
      metrics: { objs: '2', ref: '2', frames: '1', heap: '208 B' },
      paras: [p('<code>return xs</code> は xs が指す物（新しい list）を呼んだ元に渡す。add() のフレームは<b>外れて捨てられる</b>。中の名前 xs も消える。', 0),
        p('呼んだ元の <code>c = …</code> で、名前 <code>c</code> が新しい物に結ばれる。新しい物の参照は xs → c に移っただけで <span class="n">1</span> のまま。', 1800),
        p('結果：a・b は <code>[1, 2, 3]</code>、c は <code>[1, 2, 3, 4]</code>。<b>関数の中で「作った」から、外の物は無事</b>。', 3000)],
      changes: [['-', 'フレーム add()・名前 xs'], ['+', '名前 c → 新しい物']],
      draw(t) { let s = code(t < 1600 ? 8 : 10, [1, 2, 3, 4, 6, 7]) + heads();
        s += frameCard('mod', [{ n: 'a' }, { n: 'b' }, { n: 'c', op: P(t, 1800, 300), hl: true }]);
        if (t < 1400) s += frameCard('add', [{ n: 'xs' }], { op: 1 - P(t, 800, 600), dy: 40 * P(t, 800, 600) }) + ptr('add', 0, 'L2', C.purple, 1, { op: 1 - P(t, 800, 600), dy: 40 * P(t, 800, 600) });
        s += objCard('L1', { ...L123, ref: 2 }) + objCard('L2', { vals: ['1', '2', '3', '4'], cap: 4, ref: 1 }) + ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange);
        if (t > 1900) s += ptr('mod', 2, 'L2', C.green, P(t, 1900, 700));
        return s; } },
    { kind: 'mech', short: '消える', title: '11・12 行目：最後の名前が離れた瞬間に物が消える', cam: [0, 0, 1000, 600], dur: 5200,
      metrics: { objs: '1', ref: '0', frames: '1', heap: '88 B' },
      paras: [p('<code>a = None</code> で a は別の物（None）を指す。元のリストの参照は <span class="n">2 → 1</span>。まだ b が指している。', 0),
        p('<code>del b</code> は<b>名前を消す</b>（物を消す命令ではない）。最後の参照が離れて <span class="n">0</span> になった<b>その場で</b>、物は解放される。', 1800),
        p('CPython は主に<b>参照の数</b>で片付ける。待ち時間がなく、いつ消えるかが決まっている。大きさ <span class="n">120 B</span> がメモリの空きに戻る。', 3400)],
      callout: ['よくある誤解', '<code>del x</code> は「物を消す」ではなく「名前 x を消す」。他の名前やリストの中から指されていれば、物は残る。'],
      changes: [['~', 'a → None'], ['-', '名前 b'], ['-', '元のリスト（参照 0）']],
      deep: '<p><code>Py_DECREF</code> が 0 にすると型の <code>tp_dealloc</code>（list なら <code>list_dealloc</code>）がすぐ呼ばれ、中の物の参照も 1 つずつ減らす。小さな物は pymalloc の空き場所の列に戻り、OS には返らないこともある（RSS が減らない理由）。</p>',
      draw(t) { const r = t < 900 ? 2 : t < 2200 ? 1 : 0; let s = code(t < 1800 ? 11 : 12, [1, 2, 3, 4, 6, 7, 8, 10]) + heads();
        s += frameCard('mod', [{ n: 'a', val: t > 600 ? 'None' : undefined, hl: t < 1800 }, { n: 'b', op: t > 2000 ? 1 - P(t, 2000, 400) : 1 }, { n: 'c' }]);
        s += objCard('L1', { ...L123, ref: r, op: t > 3400 ? 1 - P(t, 3400, 800) : 1 }) + objCard('L2', { vals: ['1', '2', '3', '4'], cap: 4, ref: 1 });
        if (t < 600) s += ptr('mod', 0, 'L1'); if (t < 2000) s += ptr('mod', 1, 'L1', C.orange, 1, { op: t > 1800 ? 1 - P(t, 1800, 300) : 1 });
        s += ptr('mod', 2, 'L2', C.green);
        if (t > 2200 && t < 3400) s += pulse(OX + OW - 60, OY.L1 + 20, t, C.red, 18);
        return s; } },
    { kind: 'fail', short: '輪', title: '失敗：自分を指す輪は、参照の数が 0 にならない', cam: [0, 0, 1000, 600], dur: 6400,
      metrics: { objs: '1', ref: '0', frames: '1', heap: '88 B' },
      paras: [p('<code>d = []</code>・<code>d.append(d)</code>。リストの中の場所が<b>自分自身</b>を指す。参照は名前 d と自分の中の 2 つ。', 0),
        p('<code>del d</code> で名前は消えたが、自分の中からの参照が残るので <span class="n">1</span>。<b>誰からも届かないのに消えない</b>。参照の数だけでは片付かない。', 2000),
        p('そこで<b>循環 GC</b>（<code>gc</code>）が時々回り、「外から届かない輪」を探して消す。<code>gc.collect()</code> は見つけて消した数を返す。', 3800)],
      callout: ['代償', '輪を作る物（親と子が互いを指す木・自分を覚えるクロージャ・例外と traceback）は、GC が回るまで残る。大きな輪を大量に作ると、GC の停止とメモリの山の原因になる。'],
      changes: [['+', '自分を指すリスト'], ['-', '名前 d'], ['-', 'GC が輪を片付けた']],
      deep: '<p>gc は「入れ物になれる物」（list・dict・クラスの物…）だけを列で追う。各物の参照の数を写し、列の中同士の参照を引いて、0 になった物の塊を「外から届かない」と判断する。弱い参照（<code>weakref</code>）を使うと輪を作らずに指せる。</p>',
      draw(t) { const ln = t < 900 ? 14 : t < 2000 ? 15 : 16; let s = code(ln, [1, 2, 3, 4, 6, 7, 8, 10, 11, 12].concat([14, 15].filter((n) => n < ln))) + heads();
        s += frameCard('mod', [{ n: 'a', val: 'None' }, { n: 'c' }, { n: 'd', op: t > 2200 ? 1 - P(t, 2200, 400) : P(t, 300, 300) }]);
        s += objCard('L2', { vals: ['1', '2', '3', '4'], cap: 4, ref: 1 }) + ptr('mod', 1, 'L2', C.green);
        const freed = t > 4800; const ref = t < 900 ? 1 : t < 2400 ? 2 : freed ? 0 : 1;
        s += objCard('L3', { vals: t > 900 ? ['↺'] : [], cap: t > 900 ? 4 : 0, ref, op: freed ? 1 - P(t, 5200, 700) : P(t, 200, 300), note: t > 2600 && !freed ? '届かないのに残る' : '', noteC: C.orange });
        if (t < 2400) s += ptr('mod', 2, 'L3', C.blue, P(t, 400, 500), { op: t > 2200 ? 1 - P(t, 2200, 200) : 1 });
        if (t > 1100) { const x = OX + 14 + 19, y = OY.L3 + 57; s += `<path d="M${x} ${y + 14} C${x} ${y + 60} ${OX - 30} ${y + 60} ${OX - 18} ${y - 8} L${OX} ${y - 4}" pathLength="1" style="fill:none;stroke:${C.purple};stroke-width:2.4;stroke-dasharray:1;stroke-dashoffset:${(1 - P(t, 1100, 600)).toFixed(3)};opacity:${freed ? 1 - P(t, 5200, 700) : 1}"/>`; }
        if (t > 3800 && t < 5200) s += badge(OX + 100, OY.L3 - 16, 'gc：外から届かない輪を発見', C.purple, { size: 11.5, h: 22 }) + pulse(OX + 180, OY.L3 + 52, t, C.purple, 30);
        return s; } },
    { kind: 'ops', short: '調べる', title: '運用：名前と物を、手で確かめる道具', cam: [0, 0, 1000, 600], dur: 5600,
      metrics: { objs: '2', ref: '2', frames: '1', heap: '208 B' },
      paras: [p('<code>a is b</code>・<code>id(a)</code>：同じ物か。<code>==</code> は中身が等しいか（違う物でも True になる）。', 0),
        p('<code>sys.getrefcount(a)</code>：参照の数。呼んだ時の引数の分 <span class="n">+1</span> 多く出る。', 1700),
        p('メモリが増え続ける時は <code>tracemalloc</code> で「どの行で作った物が残っているか」を数える。<code>gc.collect()</code> の戻り値が大きければ輪を疑う。', 3400)],
      callout: ['目安', '関数が引数の list を直してしまう事故は、関数の中で <code>xs = list(xs)</code> と写すか、直さずに新しい物を返すと防げる。'],
      changes: [['+', 'is・id・getrefcount・tracemalloc・gc']],
      draw(t) { let s = slab(CX, 20, CW, 552, { c: '#3a3f4a', fill: '#16181d', stroke: '#2a2e36', d: 9, r: 16 }) + T(CX + 16, 42, '>>> 対話', { size: 12, w: 700, mono: true, fill: '#8a93a3' }) + heads();
        const L = [['>>> a = [1, 2, 3]; b = a; c = a + [4]', 0], ['>>> a is b', 400], ['True', 600, 1], ['>>> a == [1, 2, 3], a is [1, 2, 3]', 900], ['(True, False)', 1100, 1], ['>>> sys.getrefcount(a)', 1700], ['3      # a・b・引数の分', 1900, 1], ['>>> import tracemalloc', 3400], ['>>> tracemalloc.start()', 3600], ['>>> top = tracemalloc.take_snapshot()', 3800], ['...  main.py:7  size=88 B count=1', 4100, 1], ['>>> gc.collect()', 4600], ['0      # 輪は無い', 4800, 1]];
        L.forEach(([x, at, out], i) => { s += T(CX + 14, 74 + i * 34, x, { size: 12.5, mono: true, w: out ? 400 : 700, fill: out ? '#9fd3a8' : '#e6e9ee', op: P(t, at, 250) }); });
        s += frameCard('mod', [{ n: 'a' }, { n: 'b' }, { n: 'c' }]) + objCard('L1', { ...L123, ref: 2, hl: t > 400 && t < 2600 }) + objCard('L2', { vals: ['1', '2', '3', '4'], cap: 4, ref: 1, hl: t > 4000 });
        s += ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange) + ptr('mod', 2, 'L2', C.green);
        return s; } },
    { kind: 'sum', short: 'まとめ', title: 'まとめ：名前・物・参照の数', cam: [0, 0, 1000, 600], dur: 3600,
      paras: [p('<b>名前</b>はフレーム（スタック）に、<b>物</b>はヒープにある。<code>=</code> は名前を物に結ぶだけで写さない。', 0),
        p('<b>直す</b>（append・+=・a[i] =）は全ての名前から見え、<b>作る</b>（+・スライス・copy）は新しい物。関数の引数も同じ規則。', 1000),
        p('<b>消える</b>のは参照の数が 0 になった瞬間。輪だけは循環 GC が後で片付ける。', 2000)],
      callout: ['教えるとき', '「変数は箱」ではなく「変数は名札」と教えると、別名の事故と del の誤解が一度に解ける。'],
      changes: [['+', '名前・物・参照の数']],
      draw(t) { let s = code([2, 3, 7, 12]) + heads(); s += frameCard('mod', [{ n: 'a' }, { n: 'b' }, { n: 'c' }]) + objCard('L1', { ...L123, ref: 2 }) + objCard('L2', { vals: ['1', '2', '3', '4'], cap: 4, ref: 1 });
        s += ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange) + ptr('mod', 2, 'L2', C.green);
        [['結ぶ', 2, C.orange], ['直す', 3, C.blue], ['作る', 7, C.green], ['消す', 12, C.red]].forEach(([w, n, c], i) => { s += badge(CX + 220, LY(n) - 4, w, c, { size: 11.5, h: 22, op: P(t, i * 500, 300) }); });
        return s; } }
  ];
  // ---- 試す：別名・浅い写し・深い写し ----
  const MODES = ['b = a（別名）', 'b = a.copy()（浅い写し）', 'b = copy.deepcopy(a)（深い写し）'];
  function labScene(Pm) { const n = Pm.n, nested = Pm.nested === 1, mode = Pm.mode; const inner = nested ? Math.min(n, 4) : 0;
    const objs = 1 + (nested ? n : 0) + (mode === 0 ? 0 : 1) + (mode === 2 && nested ? n : 0);
    const bytes = (56 + 8 * n) * (mode === 0 ? 1 : 2) + (nested ? 72 * n * (mode === 2 ? 2 : 1) : 0);
    const aChanges = mode === 0 || (mode === 1 && nested);
    return { n, nested, mode, inner, objs, bytes, aChanges }; }
  const lab = { title: '写したつもりが、写っていない', cam: [0, 0, 1000, 600],
    intro: 'a は長さ n のリスト。中身を数にするか、小さなリスト [i, i] にするかを選び、b の作り方を変える。その後 b[0] を直す（数なら b[0] = 9、リストなら b[0].append(9)）。a が巻き込まれるかが図と表に出る。',
    params: [{ k: 'n', label: '長さ n', min: 1, max: 32, step: 1, v: 4, unit: '' }, { k: 'mode', label: 'b の作り方', min: 0, max: 2, step: 1, v: 1, show: (v) => MODES[v] }, { k: 'nested', label: '中身', min: 0, max: 1, step: 1, v: 1, show: (v) => (v ? 'リスト [i, i]' : '数') }],
    results(Pm) { const r = labScene(Pm); return [['a is b', r.mode === 0 ? 'True' : 'False'], ['a[0] is b[0]', r.mode === 2 && r.nested ? 'False' : 'True'], ['b[0] を直すと a は', r.aChanges ? '変わる' : '変わらない'], ['list の物の数', r.objs + ' 個', 'objs'], ['getsizeof の合計', fmt(r.bytes) + ' B', 'heap']]; },
    preds: [{ q: '中身がリスト・浅い写し。b[0].append(9) すると a[0] は？', opts: ['変わらない', '変わる'], ans: 1, why: '浅い写しは外側の場所の並びだけを写す。中のリストは同じ物を共有している。', tryit: '作り方を深い写しにして「変わらない」になるのを見る' },
      { q: '中身がリスト・n = 4・深い写し。list の物は全部で何個？', opts: ['2 個', '6 個', '10 個'], ans: 2, why: 'a 側に外 1 ＋ 中 4、b 側にも外 1 ＋ 中 4 で 10 個。深い写しは手間もメモリも倍。', tryit: 'n を 32 にして物の数とバイトの増え方を見る' }],
    draw(Pm, t) { const r = labScene(Pm); let s = '';
      const k = P(t % 4200, 1800, 600); const edited = (t % 4200) > 1800;
      s += T(40, 50, MODES[r.mode] + ' → b[0] を直す', { size: 17, w: 800, mono: true });
      s += T(40, 76, r.aChanges ? 'a も巻き込まれる' : 'a は無事', { size: 14, w: 800, fill: r.aChanges ? C.red : C.green });
      // 名前
      const nameBox = (n, y, c) => slab(40, y - 22, 90, 40, { c, d: 6, r: 10 }) + T(60, y + 7, n, { size: 20, w: 800, mono: true }) + `<circle cx="112" cy="${y}" r="5" style="fill:${c}"/>`;
      s += nameBox('a', 170, C.blue) + nameBox('b', 400, C.orange);
      const cellsN = Math.min(r.n, 8);
      const outer = (y, lab2, hl) => { let q = slab(220, y - 54, 380, 100, { c: hl ? C.orange : C.gray, d: 10, r: 14, sw: hl ? 2.2 : 1.2 }) + T(234, y - 28, `list（外）長さ ${r.n}` + lab2, { size: 12.5, w: 700, mono: true });
        for (let i = 0; i < cellsN; i++) { const x = 234 + i * 44; q += bar3d(x, y - 12, 34, 32, C.yellow, { dx: 6 }); if (!r.nested) q += T(x + 19, y + 9, i === 0 && hl && edited ? '9' : String(i), { a: 'middle', size: 15, w: 700, mono: true, fill: i === 0 && hl && edited ? C.red : 'var(--ink)' }); else q += `<circle cx="${x + 19}" cy="${y + 3}" r="4.5" style="fill:${C.purple}"/>`; }
        if (r.n > 8) q += T(586, y + 9, '…', { a: 'end', size: 16, w: 700 }); return q; };
      const aY = 170, bY = r.mode === 0 ? 170 : 400;
      s += outer(aY, ' ・ a', r.mode === 0) + curve([112, 170], [220, 170], C.blue);
      if (r.mode === 0) s += curve([112, 400], [220, 200], C.orange); else s += outer(bY, ' ・ b', true) + curve([112, 400], [220, 400], C.orange);
      if (r.nested) { const inner = (i, y, side, hl) => { const x = 660, yy = y + i * 46 - 69; const v = i === 0 && hl && edited ? `[0, 0, 9]` : `[${i}, ${i}]`; return slab(x, yy - 20, 150, 36, { c: C.purple, d: 5, r: 8, stroke: i === 0 && hl && edited ? C.red : 'var(--ln)', sw: 1.5 }) + T(x + 12, yy + 6, v, { size: 14, w: 700, mono: true, fill: i === 0 && hl && edited ? C.red : 'var(--ink)' }) + T(x + 140, yy + 6, side, { a: 'end', size: 10.5, fill: 'var(--mut)' }); };
        const shareInner = r.mode !== 2; const aIn = 170, bIn = 400;
        for (let i = 0; i < r.inner; i++) { s += inner(i, aIn, shareInner ? 'a と b で共有' : 'a の中', shareInner); s += curve([234 + i * 44 + 19, aY + 3], [660, aIn + i * 46 - 69], C.purple, 1, { w: 1.6, op: .7 }); }
        if (r.mode === 1) for (let i = 0; i < r.inner; i++) s += curve([234 + i * 44 + 19, bY + 3], [660, aIn + i * 46 - 69], C.orange, 1, { w: 1.6, op: .7 });
        if (r.mode === 2) for (let i = 0; i < r.inner; i++) { s += inner(i, bIn, 'b の中（写し）', true); s += curve([234 + i * 44 + 19, bY + 3], [660, bIn + i * 46 - 69], C.orange, 1, { w: 1.6, op: .7 }); }
        if (r.n > 4) s += T(735, 250, `…ほか ${r.n - 4} 個`, { a: 'middle', size: 12, fill: 'var(--mut)' }); }
      s += T(40, 560, `list の物 ${r.objs} 個 ・ getsizeof の合計 ${fmt(r.bytes)} B`, { size: 13, mono: true, w: 700, fill: 'var(--mut)' });
      if (edited) s += badge(40, 520, r.nested ? 'b[0].append(9)' : 'b[0] = 9', C.orange, { size: 12, mono: true, op: k });
      return s; } };
  // ---- やってみる：小さな Python ----
  const tr = { cam: [0, 0, 1000, 600], ps: '>>>', who: '同じ班の新人', req: '設定の list を関数に渡したら、元の設定まで書き換わってしまった。名前と物の関係を手で確かめて、元を守る書き方を見せて。',
    cards: ['a = [1, 2]', 'b = a', 'b.append(3)', 'a', 'a is b', 'b = a.copy()', 'b.append(4)', 'sys.getrefcount(a)', 'id(a) == id(b)', 'del b'],
    refs: [['データモデル', 'https://docs.python.org/ja/3/reference/datamodel.html'], ['copy', 'https://docs.python.org/ja/3/library/copy.html'], ['sys.getrefcount', 'https://docs.python.org/ja/3/library/sys.html#sys.getrefcount'], ['gc', 'https://docs.python.org/ja/3/library/gc.html']],
    tasks: [{ t: 'a = [1, 2] を作り、b = a で別名にする', ok: (s) => s.f.alias }, { t: 'b を直して、a も変わったのを見る', ok: (s) => s.f.seen }, { t: 'a is b で同じ物か確かめる', ok: (s) => s.f.is }, { t: '写しを作る（a.copy()・a[:]・list(a)）', ok: (s) => s.f.copy }, { t: '写しを直しても a が変わらないのを見る', ok: (s) => s.f.safe }],
    init: () => ({ lines: [{ o: '# Python 3.12 の動きを写した小さな対話（list と数だけ）', k: 'd' }], hist: [], f: {}, vars: {}, objs: {}, next: 1, dirty: {} }),
    metrics: (s) => { const live = Object.values(s.objs).filter((o) => o.ref > 0); return { objs: String(live.length), ref: s.vars.a ? String(s.objs[s.vars.a].ref) : '—', frames: '1', heap: live.reduce((a, o) => a + 56 + 8 * o.cap, 0) + ' B' }; },
    run(cmd, s) { const c = cmd.trim(); const o = (x, k) => ({ o: x, k }); const V = s.vars, O = s.objs;
      const repr = (id) => '[' + O[id].vals.join(', ') + ']';
      const bind = (n, id) => { if (V[n]) unref(V[n]); V[n] = id; if (id) O[id].ref++; };
      const unref = (id) => { O[id].ref--; if (O[id].ref <= 0) delete O[id]; };
      const mk = (vals) => { const id = 'o' + s.next++; O[id] = { vals, cap: vals.length, ref: 0, id }; return id; };
      const grow = (ob) => { const n = ob.vals.length; if (n > ob.cap) ob.cap = (n + (n >> 3) + 6) & ~3; };
      const need = (n) => { if (!V[n]) throw new Error(`NameError: name '${n}' is not defined`); return V[n]; };
      try {
        let m;
        if ((m = c.match(/^(\w+)\s*=\s*\[([\d,\s-]*)\]$/))) { const vals = m[2].split(',').map((x) => x.trim()).filter(Boolean); bind(m[1], mk(vals)); return { out: [] }; }
        if ((m = c.match(/^(\w+)\s*=\s*(\w+)$/)) && m[2] !== 'None') { const id = need(m[2]); bind(m[1], id); if (V.a && V.a === V.b) s.f.alias = true; return { out: [] }; }
        if ((m = c.match(/^(\w+)\s*=\s*None$/))) { if (V[m[1]]) unref(V[m[1]]); delete V[m[1]]; return { out: [o(`# ${m[1]} は None を指す`, 'd')] }; }
        if ((m = c.match(/^(\w+)\s*=\s*(?:(\w+)\.copy\(\)|(\w+)\[:\]|list\((\w+)\))$/))) { const src = need(m[2] || m[3] || m[4]); bind(m[1], mk(O[src].vals.slice())); if (m[1] === 'b' && (m[2] || m[3] || m[4]) === 'a') { s.f.copy = true; s.copied = V.b; } return { out: [o('# 新しい物ができた', 'd')] }; }
        if ((m = c.match(/^(\w+)\.append\((-?\d+)\)$/))) { const id = need(m[1]); O[id].vals.push(m[2]); grow(O[id]); s.dirty = { id, v: m[2], by: m[1] }; return { out: [] }; }
        if ((m = c.match(/^(?:print\()?(\w+)\)?$/)) && V[m[1]] !== undefined) { const id = V[m[1]];
          if (m[1] === 'a' && s.dirty.by === 'b' && s.dirty.id === id) s.f.seen = true;
          if (m[1] === 'a' && s.f.copy && s.dirty.by === 'b' && s.dirty.id === s.copied && s.dirty.id !== id && !O[id].vals.includes(s.dirty.v)) s.f.safe = true;
          return { out: [o(repr(id), 'h')] }; }
        if ((m = c.match(/^(\w+) is (\w+)$/))) { const r = need(m[1]) === need(m[2]); if (m[1] === 'a' && m[2] === 'b' || m[1] === 'b' && m[2] === 'a') s.f.is = true; return { out: [o(r ? 'True' : 'False', 'h')] }; }
        if ((m = c.match(/^id\((\w+)\) == id\((\w+)\)$/))) return { out: [o(need(m[1]) === need(m[2]) ? 'True' : 'False', 'h')] };
        if ((m = c.match(/^id\((\w+)\)$/))) return { out: [o(String(139870000000000 + need(m[1]).slice(1) * 64))] };
        if ((m = c.match(/^sys\.getrefcount\((\w+)\)$/))) return { out: [o(String(O[need(m[1])].ref + 1)), o('# 呼んだ時の引数の分 +1', 'd')] };
        if ((m = c.match(/^len\((\w+)\)$/))) return { out: [o(String(O[need(m[1])].vals.length))] };
        if ((m = c.match(/^sys\.getsizeof\((\w+)\)$/))) return { out: [o(String(56 + 8 * O[need(m[1])].cap))] };
        if ((m = c.match(/^del (\w+)$/))) { const id = need(m[1]); const gone = O[id].ref === 1; unref(id); delete V[m[1]]; return { out: gone ? [o('# 参照 0：物も消えた', 'd')] : [o('# 名前だけ消えた。物は他から指されている', 'd')] }; }
        if (/^import (sys|copy|gc)$/.test(c)) return { out: [] };
        if (c === 'help') return { out: [o('使える形：x = [1, 2] ・ y = x ・ y = x.copy() ・ x.append(3) ・ x ・ x is y ・ id(x) ・ sys.getrefcount(x) ・ del x')] };
        return { out: [o('この対話で使えない形（help）', 'e')] };
      } catch (e) { return { out: [o(e.message, 'e')] }; } },
    draw(s, t) { let st = heads().replace('スタック（名前の置き場）', 'フレーム <module>'); const names = Object.keys(s.vars); const ids = [...new Set(Object.values(s.vars))].concat(Object.keys(s.objs).filter((k) => !Object.values(s.vars).includes(k)));
      const oy = (i) => 60 + i * 130; const ny = (i) => 80 + i * 70;
      names.forEach((n, i) => { st += slab(200, ny(i) - 24, 220, 44, { c: [C.blue, C.orange, C.green, C.purple][i % 4], d: 6, r: 10 }) + T(220, ny(i) + 8, n, { size: 20, w: 800, mono: true }) + `<circle cx="400" cy="${ny(i)}" r="5" style="fill:${[C.blue, C.orange, C.green, C.purple][i % 4]}"/>`; });
      ids.slice(0, 4).forEach((id, i) => { const ob = s.objs[id]; if (!ob) return; const y = oy(i); st += slab(OX, y, OW, 104, { c: s.dirty.id === id ? C.blue : C.gray, d: 10, r: 14, sw: s.dirty.id === id ? 2.2 : 1.5 }) + T(OX + 14, y + 24, 'list', { size: 14, w: 800, mono: true }) + T(OX + 54, y + 24, 'id …' + id.slice(1).padStart(2, '0') + '0', { size: 11.5, mono: true, fill: 'var(--mut)' });
        st += badge(OX + OW - 90, y + 20, `参照 ${ob.ref}`, ob.ref > 1 ? C.orange : C.green, { size: 11.5, h: 22 });
        for (let j = 0; j < Math.min(8, Math.max(ob.cap, 1)); j++) { const x = OX + 14 + j * 42; const used = j < ob.vals.length; st += used ? bar3d(x, y + 42, 34, 32, C.yellow, { dx: 6 }) : R(x, y + 42, 34, 32, { r: 4, fill: 'transparent', sw: 1.2, dash: used ? undefined : '3 3' }); if (used) st += T(x + 19, y + 63, ob.vals[j], { a: 'middle', size: 16, w: 700, mono: true }); }
        st += T(OX + 14, y + 94, `長さ ${ob.vals.length} ・ 容量 ${ob.cap} ・ getsizeof ${56 + 8 * ob.cap} B`, { size: 11.5, mono: true, fill: 'var(--mut)' });
        names.forEach((n, k) => { if (s.vars[n] === id) st += curve([400, ny(k)], [OX, y + 52], [C.blue, C.orange, C.green, C.purple][k % 4]); }); });
      if (!names.length) st += T(200, 90, 'まだ名前が無い。a = [1, 2] から始める', { size: 15, fill: 'var(--mut)' });
      return st; } };
  const quiz = [{ k: 'pick', q: '<code>b = a</code> の後 <code>b.append(3)</code>。<code>a</code>（元は [1, 2]）は？', opts: ['[1, 2]', '[1, 2, 3]', 'エラーになる'], ans: 1, why: 'a と b は同じ 1 つの物を指す名前。append は物そのものを直す。' },
    { k: 'hit', q: '7 行目 <code>xs = xs + [4]</code> を終えた直後、xs が指している物はどれ？', hits: ['L1', 'L2', 'T'], ans: 'L2', why: '+ は新しい list を作り、xs だけがそちらへ向きを変える。元の物（a・b が指す）はそのまま。' },
    { k: 'num', q: '空の list が 56 B、場所 1 つが 8 B。容量 8 の list の getsizeof は何 B？', ans: 120, why: '56 + 8 × 8 = 120。長さではなく容量で決まる。' },
    { k: 'pick', q: '<code>d = []; d.append(d); del d</code>。この list を片付けるのは？', opts: ['参照の数が 0 になってすぐ', '循環 GC が回った時', '片付かず永遠に残る'], ans: 1, why: '自分の中からの参照が残るので参照の数は 1。外から届かない輪は循環 GC が探して消す。' },
    { k: 'order', q: '<code>c = add(a)</code> の中で起きる順に並べる', items: ['add() のフレームを積む', 'xs が a と同じ物を指す', '新しい list を作る', 'xs が新しい物を指す', 'フレームが外れ c が受け取る'], shuffled: ['新しい list を作る', 'フレームが外れ c が受け取る', 'add() のフレームを積む', 'xs が新しい物を指す', 'xs が a と同じ物を指す'], why: '積む → 結ぶ → 作る → 向きを変える → 外れて渡す。' }];
  function drawQuiz(t, hits, a, q) { let s = code(7, [1, 2, 3, 4, 6, 10]) + heads() + frameCard('mod', [{ n: 'a' }, { n: 'b' }]) + frameCard('add', [{ n: 'xs' }]);
    s += objCard('L1', { ...L123, ref: 2 }) + objCard('L2', { vals: ['1', '2', '3', '4'], cap: 4, ref: 1 }) + objCard('T', { vals: ['4'], cap: 1, ref: 1, note: '一時の物', noteC: C.gray }) + ptr('mod', 0, 'L1') + ptr('mod', 1, 'L1', C.orange);
    if (!q || q.k !== 'hit' || a) s += ptr('add', 0, 'L2', C.purple);
    hits.forEach((id) => { s += R(OX - 4, OY[id] - 4, OW + 8, 112, { r: 16, fill: 'rgba(59,125,221,.06)', stroke: C.blue, sw: 2.5, id }) + pulse(OX + OW - 16, OY[id] + 12, t, C.blue, 6); });
    if (a && q && q.k === 'hit') s += R(OX - 4, OY[q.ans] - 4, OW + 8, 112, { r: 16, fill: 'transparent', stroke: C.green, sw: 3 }); return s; }
  const TERMS = {
    py: { t: 'Python', m: ['Python'], d: '広く使われているプログラミング言語。ここでは標準の実装 CPython の動きを見る。' },
    var: { t: '変数・名前', m: ['名前', '変数'], d: '物に付ける名札。a や b のこと。名札そのものには中身は入っていない。' },
    obj: { t: '物（オブジェクト）', m: ['物'], d: 'メモリの中にある実体。数・文字・リストなど。名前はこれを指す。' },
    list: { t: 'リスト', m: ['リスト', 'list'], d: '[1, 2] のように、物を順番に並べて入れておく入れ物。後から足したり変えたりできる。' },
    assign: { t: '=（代入）', m: ['='], d: '左の名前を、右の物に結ぶこと。物を写すのではない。' },
    mem: { t: 'メモリ', m: ['メモリ'], d: 'プログラムが動いている間、データを置いておく場所。' },
    frame: { t: 'フレーム', m: ['フレーム'], d: '関数を呼ぶたびに作られる、名前の置き場。関数が終わると捨てられる。' },
    stack: { t: 'スタック', m: ['スタック', '積'], d: 'フレームを積み重ねていく場所。新しい呼び出しが上に積まれ、終わると上から外れる。' },
    heap: { t: 'ヒープ', m: ['ヒープ'], d: '物を置いておく場所。誰からも指されなくなるまで残る。' },
    ref: { t: '参照', m: ['参照', '指'], d: '名前（やリストのマス）が物を指していること。図の矢印。' },
    refcnt: { t: '参照の数', m: ['参照の数'], d: 'その物を指している矢印の本数。0 になった瞬間に物は捨てられる。' },
    append: { t: 'append()', m: ['append'], d: 'リストの最後に物を 1 つ足す命令。物そのものを書き換える。' },
    fn: { t: '関数', m: ['関数', 'def '], d: '名前の付いた処理のまとまり。def で作り、名前(材料) で呼ぶ。' },
    arg: { t: '引数', m: ['引数'], d: '関数に渡す材料。関数の中では新しい名前（例：xs）がその物を指す。' },
    print: { t: 'print()', m: ['print'], d: '中身を画面に表示する関数。' },
    none: { t: 'None', m: ['None'], d: '「何もない」を表す特別な物。' },
    del: { t: 'del', m: ['del'], d: '名前を消す命令。物を消す命令ではない。' },
    id: { t: 'id()・is', m: ['id(', ' is '], d: 'id() は物の背番号を返す。a is b は「同じ物か」を調べる。' },
    capacity: { t: '容量', m: ['容量'], d: 'リストが今用意している席の数。長さより多めに取っておき、足すたびに取り直さずに済ませる。' },
    size: { t: 'getsizeof・バイト', m: ['getsizeof', ' B'], d: 'getsizeof は物の大きさをバイト（データ量の単位）で返す。' },
    gc: { t: '循環 GC', m: ['GC', 'gc'], d: '互いに指し合って参照の数が 0 にならない物の輪を探して捨てる掃除係。' },
    copy: { t: '写し（copy）', m: ['写し', 'copy'], d: '同じ中身の新しい物を作ること。浅い写しは外側だけ、深い写しは中の物まで写す。' }
  };
  const TALIAS = {};
  const INTRO = { kind: 'intro', short: '言葉', title: '始める前に：言葉をそろえる', cam: [0, 0, 1000, 600], dur: 6000,
    metrics: { objs: '1', ref: '1', frames: '1', heap: '72 B' },
    terms: ['py', 'var', 'obj', 'list', 'assign', 'mem', 'ref', 'frame', 'heap'],
    paras: [p('このレッスンは、Python で <code>a = [1, 2]</code> と書いた時に、メモリの中で何が起きるかを見る。', 0),
      p('<b>名前</b>（a）と<b>物</b>（[1, 2] というリスト）は別々の場所にある。名前は左の板（フレーム）に、物は右の台（ヒープ）に置かれる。', 1500),
      p('<b>=</b> は「写す」ではなく、<b>名前を物に結ぶ</b>（矢印を引く）という意味。上の黒い札で 3 つの部分を確かめてほしい。', 3000),
      p('この「名前と物は別」が分かると、「b に足したのに a も変わった」という不思議が解ける。', 4500)],
    callout: ['たとえると', '物は倉庫の荷物、名前は荷物に付けた名札のひも。= はひもを結ぶこと。同じ荷物に名札を何本付けても、荷物は 1 つ。'],
    changes: [['+', '名前 a と、リスト [1, 2]']],
    draw(t) { let s = code(1) + heads(); s += frameCard('mod', [{ n: 'a', op: P(t, 1500, 300) }], { dy: 230 }) + objCard('L2', { vals: ['1', '2'], cap: 2, ref: t > 3000 ? 1 : 0, op: P(t, 1500, 300) });
      if (t < 3000) s = s.replace('参照 0 → 解放', '参照 0');
      if (t > 3000) s += ptr('mod', 0, 'L2', C.blue, P(t, 3000, 700), { dy: 230 });
      s += anatomy(660, 90, [['a', '#7fb2ff', '名前（名札）', 'var'], [' = ', '#f5b46b', '結ぶ（写さない）', 'assign'], ['[1, 2]', '#f0d27a', 'リスト（物）', 'list']], t, { center: true, step: 700, size: 34, rows: [0, 1, 0] });
      return s; } };
  steps.unshift(INTRO);
  LESSONS.push({ terms: TERMS, termAlias: TALIAS, scene: true, id: 'mem', tab: 'Python（名前と物）', color: C.purple, kick: 'プログラミング ・ 段 1（入門）・ 見せ方：メモリと参照', title: '名前と物：= は写さない',
    goal: 'フレーム・ヒープ・参照の数で、別名の事故・関数の引数・物が消える時を説明し、写しを正しく作れる',
    metrics: [{ k: 'objs', label: '生きている list' }, { k: 'ref', label: '元の list の参照' }, { k: 'frames', label: 'フレーム' }, { k: 'heap', label: 'list の大きさ' }],
    legend: [['名前 a', C.blue], ['名前 b', C.orange], ['名前 c', C.green], ['関数の中・輪', C.purple], ['解放', C.red]], steps, lab, tr, quiz, drawQuiz, quizCam: [0, 0, 1000, 600], note: '= は名前を物に結ぶだけ。直すと全員に見え、作ると別の物になる' });
})();
