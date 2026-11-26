// ================= レッスン 4：平均はどれくらいぶれるか（標本分布と中心極限定理）—— 見せ方の型：chart（母集団・標本・平均の分布が同じ目盛りで積もる） =================
(() => {
  const p = (h, at) => ({ h, at });
  const XMAX = 16, X = (v) => 80 + v * (840 / XMAX);
  const SH = ['指数（右に長い）', '一様（0〜8 分）', '二山'];
  const SIG = [4, 8 / Math.sqrt(12), Math.sqrt(.5 * (.36 + 6.25) + .5 * (.64 + 6.25))];
  function draw1(r, shape) { if (shape === 0) return -4 * Math.log(1 - r()); if (shape === 1) return 8 * r(); const u = r(), v = r(), z = Math.sqrt(-2 * Math.log(1 - u)) * Math.cos(2 * Math.PI * v); return r() < .5 ? 1.5 + .6 * z : 6.5 + .8 * z; }
  const pdf = (x, shape) => shape === 0 ? (x < 0 ? 0 : Math.exp(-x / 4) / 4) : shape === 1 ? (x >= 0 && x <= 8 ? 1 / 8 : 0) : .5 * nd(x, 1.5, .6) + .5 * nd(x, 6.5, .8);
  function nd(x, m, s) { return Math.exp(-.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)); }
  function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + .3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return s * y; }
  const Phi = (z) => .5 * (1 + erf(z / Math.SQRT2));
  const cache = {};
  function gen(n, cnt, shape = 0, seed = 7) { const key = [n, cnt, shape, seed].join('|'); if (cache[key]) return cache[key]; const r = rng(seed * 1000 + n * 7 + shape); const means = [], firsts = [];
    for (let k = 0; k < cnt; k++) { let s = 0; const row = []; for (let i = 0; i < n; i++) { const v = draw1(r, shape); s += v; if (k < 40) row.push(v); } means.push(s / n); if (k < 40) firsts.push(row); }
    const mm = means.reduce((a, b) => a + b, 0) / cnt; const sd = Math.sqrt(means.reduce((a, b) => a + (b - mm) ** 2, 0) / cnt);
    return (cache[key] = { means, firsts, mm, sd, n, shape }); }
  const BW = 0.2, NB = Math.round(XMAX / BW);
  function hist(means, k) { const h = new Array(NB).fill(0); for (let i = 0; i < k; i++) { const b = Math.floor(means[i] / BW); if (b >= 0 && b < NB) h[b]++; } return h; }
  // 絵
  const PY0 = 176, PH = 120, HY0 = 560, HH = 210;
  function popPanel(shape = 0, prog = 1, o = {}) { let s = `<g data-term="pop" style="cursor:help">` + slab(20, 14, 960, 176, { r: 16, d: 8, c: C.teal }) + T(36, 40, o.title || `母集団：窓口の待ち時間（${SH[shape]}・平均 4 分・SD ${SIG[shape].toFixed(2)} 分）`, { size: 13, w: 700 });
    let mx = 0; for (let x = 0; x <= XMAX; x += .05) mx = Math.max(mx, pdf(x, shape)); const pts = []; for (let x = 0; x <= XMAX * prog; x += .05) pts.push([X(x), PY0 - pdf(x, shape) / mx * PH]);
    if (pts.length > 1) s += `<path d="M${X(0) + 10} ${PY0 - 7}L${pts.map((q) => (q[0] + 10).toFixed(1) + ' ' + (q[1] - 7).toFixed(1)).join('L')}L${pts[pts.length - 1][0] + 10} ${PY0 - 7}Z" style="fill:${C.teal};fill-opacity:.35;stroke:${C.teal};stroke-width:1;opacity:.7"/>`;
    if (pts.length > 1) s += `<path d="M${X(0)} ${PY0}L${pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}L${pts[pts.length - 1][0].toFixed(1)} ${PY0}Z" style="fill:${C.teal};fill-opacity:.28;stroke:${C.teal};stroke-width:2"/>`;
    s += line([[X(0), PY0], [X(XMAX), PY0]], { c: 'var(--dim)', w: 1.2, head: false });
    if (o.mean !== false) s += line([[X(4), 52], [X(4), PY0]], { c: C.teal, w: 1.6, dash: '4 3', head: false }) + T(X(4) + 6, 62, '平均 4', { size: 11.5, w: 700, fill: C.teal });
    return s + '</g>'; }
  function axis(y) { let s = line([[X(0), y], [X(XMAX), y]], { c: 'var(--dim)', w: 1.2, head: false }); for (let v = 0; v <= XMAX; v += 2) s += line([[X(v), y], [X(v), y + 5]], { c: 'var(--dim)', w: 1, head: false }) + T(X(v), y + 18, v, { a: 'middle', size: 11, mono: true, fill: 'var(--mut)' }); return s + T(X(XMAX), y + 18, '分', { a: 'start', size: 11, fill: 'var(--mut)' }); }
  function tray(vals, t0, t, o = {}) { let s = `<g data-term="sample" style="cursor:help">` + slab(20, 204, 960, 88, { r: 16, d: 8, c: C.blue }) + T(36, 228, o.title || `標本：ある日の ${vals.length} 人`, { size: 12.5, w: 700, fill: 'var(--mut)' });
    const r = rng(11); vals.forEach((v, i) => { const a = t0 + i * (o.gap ?? 60); if (t < a) return; const k = P(t, a, 420); const jy = 254 + (r() - .5) * 30; const y = lerp(PY0 - 10, jy, k); s += sphere(X(Math.min(v, XMAX)), y, 6, C.blue, { op: .35 + .65 * k }); });
    const done = t0 + vals.length * (o.gap ?? 60) + 400; if (t > done && o.mean !== false) { const m = vals.reduce((a, b) => a + b, 0) / vals.length; s += `<g style="opacity:${P(t, done, 300)}">` + `<polygon points="${X(m) - 9},${290} ${X(m) + 9},${290} ${X(m)},${276}" style="fill:${C.orange}"/>` + T(X(m) + 12, 289, `平均 ${m.toFixed(2)}`, { size: 13, w: 800, fill: C.orange, mono: true }) + '</g>'; }
    return s + '</g>'; }
  function histPanel(h, maxC, o = {}) { let s = `<g data-term="hist" style="cursor:help">` + slab(20, 308, 960, 272, { r: 16, d: 8, c: C.orange }) + T(36, 334, o.title || '平均の分布（日ごとの平均を積む）', { size: 12.5, w: 700, fill: 'var(--mut)' });
    h.forEach((c, i) => { if (!c) return; const bh = c / maxC * HH; s += bar3d(X(i * BW) + .5, HY0 - bh, 840 / NB - 3, bh, o.c || C.orange, { dx: 3, dy: 2 }); });
    return s + '</g>' + axis(HY0); }
  function curve(m, se, cnt, maxC, c = C.blue, prog = 1, o = {}) { const pts = []; for (let x = Math.max(0, m - 4.5 * se); x <= Math.min(XMAX, m + 4.5 * se) && x <= m - 4.5 * se + 9 * se * prog; x += Math.max(.01, se / 30)) pts.push([X(x), HY0 - nd(x, m, se) * cnt * BW / maxC * HH]);
    return pts.length > 1 ? `<path d="M${pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}" style="fill:none;stroke:${c};stroke-width:${o.w || 2.6};opacity:${o.op ?? 1}"/>` : ''; }
  const maxOf = (h) => Math.max(...h, 1) * 1.08;
  const SET30 = () => gen(30, 600), SET5 = () => gen(5, 600), SET120 = () => gen(120, 600), SET2 = () => gen(2, 600);
  const story = () => { const v = SET30().firsts[0]; const m = v.reduce((a, b) => a + b, 0) / v.length; return v.map((x) => x * 4.6 / m); };

  const steps = [
    { kind: 'problem', short: '問題', title: '今日の平均は 4.6 分。待ち時間は長くなったのか', cam: [0, 0, 1000, 600], dur: 5600,
      metrics: { n: '30', cnt: '1', mm: '4.60', sd: '—', se: '?' },
      paras: [p('窓口の待ち時間は、長い目で見ると平均 <span class="n">4 分</span>。今日 <span class="n">30</span> 人を測ったら平均 <span class="n">4.6 分</span>だった。', 0),
        p('店長は「混むようになった、人を増やそう」と言う。でも 30 人を選び直せば、平均は毎日少しずつ違う。<b>0.6 分の差は、偶然のぶれの中か、外か。</b>', 2600),
        p('このレッスンで答える問い：<b>平均はどれくらいぶれるのか。その幅は何で決まるのか。</b>', 4400)],
      callout: ['ポイント', '1 日の平均だけを見ても判断できない。「平均というもの自体がどれくらいぶれるか」を知る必要がある。'],
      changes: [['+', '今日の 30 人と、その平均 4.6']],
      draw(t) { let s = popPanel(0) + tray(story(), 200, t, { gap: 70 }) + histPanel(new Array(NB).fill(0), 10, { title: '？ 平均はどれくらいぶれる' });
        if (t > 2800) s += `<g style="opacity:${P(t, 2800, 400)}">` + line([[X(4), 330], [X(4), HY0]], { c: C.teal, w: 1.6, dash: '4 3', head: false }) + line([[X(4.6), 330], [X(4.6), HY0]], { c: C.orange, w: 2, head: false }) + T(X(4.6) + 8, 420, '4.6 は外れている？', { size: 15, w: 800, fill: C.orange }) + T(X(4) - 8, 420, '4.0', { a: 'end', size: 15, w: 800, fill: C.teal, mono: true }) + '</g>';
        return s; } },
    { kind: 'mech', short: '母集団', title: '母集団：多くは短く、少しだけ長い人がいる', cam: [0, 0, 1000, 320], dur: 4600,
      metrics: { n: '30', cnt: '0', mm: '—', sd: '—', se: '—' },
      paras: [p('一人ひとりの待ち時間は<b>右に長い</b>形（指数分布）。すぐ終わる人が多く、たまに 10 分を超える人がいる。', 0),
        p('平均は <span class="n">4 分</span>、ばらつき（標準偏差 σ）も <span class="n">4 分</span>。真ん中の人（中央値）は <span class="n">4 × ln 2 ≈ 2.8 分</span>で、平均より短い。', 1800),
        p('この形は左右対称の山とはまるで違う。それでも<b>平均</b>を何度も取ると、話が変わる。', 3400)],
      callout: ['知っておくと便利', '右に長い分布では、平均は少数の長い人に引っ張られる。「平均 4 分」でも半分の人は 2.8 分以内に終わる。'],
      changes: [['+', '母集団：平均 4・σ 4・中央値 2.8']],
      draw(t) { let s = popPanel(0, P(t, 0, 1400)) + tray([], 0, 0, { mean: false, title: '標本（まだ取っていない）' });
        if (t > 1800) { const o = P(t, 1800, 400); s += `<g style="opacity:${o}">` + line([[X(4), 150], [X(8), 150]], { c: C.purple, w: 2.4, head: true }) + T(X(6), 144, 'σ = 4', { a: 'middle', size: 12.5, w: 800, fill: C.purple }) + line([[X(2.77), 100], [X(2.77), PY0]], { c: C.gray, w: 1.5, dash: '3 3', head: false }) + T(X(2.77) - 6, 112, '中央値 2.8', { a: 'end', size: 11.5, w: 700, fill: C.gray }) + '</g>'; }
        if (t > 3000) s += T(X(11), 120, '10 分を超える人：約 8%', { size: 12.5, w: 700, fill: C.teal, op: P(t, 3000, 400) });
        return s; } },
    { kind: 'mech', short: '1 日分', title: '30 人を取り、平均を 1 つ出し、下に積む', cam: [0, 0, 1000, 600], dur: 4800,
      metrics: { n: '30', cnt: '1', mm: '—', sd: '—', se: '—' },
      paras: [p('母集団から <span class="n">30</span> 人をでたらめに取る（標本）。点が 1 人ずつ落ちてくる。', 0),
        p('30 人の待ち時間を足して 30 で割ると、<b>平均が 1 つ</b>できる。これを下の段に 1 つ積む。', 2600),
        p('下の段は「一人の待ち時間」ではなく「<b>1 日の平均</b>」を並べる所。同じ目盛りで描くので、上と幅を比べられる。', 3800)],
      changes: [['+', '標本 1 組・平均 1 つ']],
      draw(t) { const v = SET30().firsts[1]; const m = v.reduce((a, b) => a + b, 0) / v.length; let s = popPanel(0) + tray(v, 100, t, { gap: 70 });
        const h = new Array(NB).fill(0); const land = 3000; if (t > land + 700) h[Math.floor(m / BW)] = 1; s += histPanel(h, 12);
        if (t > land && t < land + 700) { const y = lerp(283, HY0 - 10, P(t, land, 700)); s += `<polygon points="${X(m) - 9},${y} ${X(m) + 9},${y} ${X(m)},${y + 14}" style="fill:${C.orange}"/>`; }
        return s; } },
    { kind: 'mech', short: '繰り返す', title: '毎日繰り返すと、平均が山を作る', cam: [0, 0, 1000, 600], dur: 6400,
      get metrics() { return { n: '30', cnt: '600', mm: SET30().mm.toFixed(2), sd: SET30().sd.toFixed(2), se: '—' }; },
      paras: [p('同じことを何日も繰り返す。日ごとに 30 人は違い、平均も 3.2・4.5・3.9… と少しずつ違う。', 0),
        p('600 日分を積むと、平均の分布ができる。<b>真ん中は 4 分</b>（母集団の平均）に来る。', 2400),
        p('驚くのは形。<b>上の母集団は右に長いのに、平均の分布は左右対称の山</b>に近い。そして幅は上よりずっと狭い。', 4400)],
      callout: ['ポイント', 'これが中心極限定理：もとの形が何であれ（ばらつきが有限なら）、足し合わせた平均の分布は n が大きいほど正規分布に近づく。'],
      changes: [['+', '平均 600 個の分布'], ['~', '形：右に長い → 左右対称']],
      draw(t) { const S30 = SET30(); const k = Math.max(1, Math.floor(600 * Lin(t, 0, 5200) ** 2.2)); const H = hist(S30.means, 600); const mx = maxOf(H);
        const v = S30.firsts[Math.min(39, Math.floor(t / 160)) % 40]; let s = popPanel(0) + tray(v, -1e9, t, { gap: 0, title: `標本：${k} 日目の 30 人` }) + histPanel(hist(S30.means, k), mx);
        s += T(940, 360, `${k} 日分`, { a: 'end', size: 18, w: 800, mono: true, fill: C.orange });
        return s; } },
    { kind: 'inside', short: '幅', title: '幅は σ / √n。30 人なら 4 / √30 ≈ 0.73 分', cam: [0, 300, 1000, 300], dur: 5600,
      get metrics() { return { n: '30', cnt: '600', mm: SET30().mm.toFixed(2), sd: SET30().sd.toFixed(2), se: '0.73' }; },
      paras: [p('平均の分布に、正規分布の曲線を重ねる。中心 <span class="n">4</span>、幅（標準偏差）は <b>標準誤差 SE = σ / √n = 4 / √30 ≈ 0.73 分</b>。', 0),
        p('600 日分の平均の実際の標準偏差も約 <span class="n">0.73</span>。<b>計算した幅と、積んだ山の幅が合う</b>。', 2000),
        p('平均 ± 1.96 SE（<span class="n">2.57〜5.43 分</span>）に、日ごとの平均の約 <span class="n">95%</span> が入る。', 3600)],
      callout: ['知っておくと便利', '「SD」は一人ひとりのばらつき、「SE」は平均のばらつき。グラフのひげがどちらかで、見え方が 5 倍以上変わる（√30 ≈ 5.5）。'],
      changes: [['+', 'SE = 0.73・95% の幅 2.57〜5.43']],
      deep: '<p>独立に同じ分布から取った n 個の和の分散は nσ²。平均は和を n で割るので分散は σ²/n、標準偏差は σ/√n。正規に近づく速さは偏りの強さで決まり（Berry–Esseen）、指数分布なら n = 30 でもまだわずかに右に長い。</p>',
      draw(t) { const S30 = SET30(); const H = hist(S30.means, 600); const mx = maxOf(H); const se = 4 / Math.sqrt(30); let s = popPanel(0) + histPanel(H, mx);
        if (t > 3600) s += R(X(4 - 1.96 * se), 340, X(4 + 1.96 * se) - X(4 - 1.96 * se), HY0 - 340, { r: 4, fill: C.blue, stroke: 'none', op: .08 * P(t, 3600, 400) }) + T(X(4), 356, '95%：2.57〜5.43', { a: 'middle', size: 13, w: 800, fill: C.blue, op: P(t, 3600, 400) });
        s += curve(4, se, 600, mx, C.blue, P(t, 200, 1400));
        if (t > 2000) { const yb = HY0 - nd(4 + se, 4, se) * 600 * BW / mx * HH; s += `<g style="opacity:${P(t, 2000, 400)}">` + line([[X(4), yb], [X(4 + se), yb]], { c: C.purple, w: 2.4 }) + T(X(4 + se) + 8, yb + 4, 'SE 0.73', { size: 13, w: 800, fill: C.purple, mono: true }) + '</g>'; }
        return s; } },
    { kind: 'inside', short: 'n を変える', title: 'n を 4 倍にすると、幅は半分', cam: [0, 300, 1000, 300], dur: 6000,
      get metrics() { return { n: '120', cnt: '600', mm: SET120().mm.toFixed(2), sd: SET120().sd.toFixed(2), se: '0.37' }; },
      paras: [p('1 日 <span class="n">5</span> 人だけ測ると SE は <span class="n">4 / √5 ≈ 1.79</span>。広い山で、平均は 2 分にも 7 分にもなる。', 0),
        p('<span class="n">30</span> 人で <span class="n">0.73</span>、<span class="n">120</span> 人で <span class="n">0.37</span>。<b>√n で効くので、人数を 4 倍にしてやっと幅が半分</b>。', 2000),
        p('測る手間は人数に比例し、精度は √ でしか上がらない。「何人測れば足りるか」は、この式を逆に解いて決める。', 4000)],
      callout: ['代償', '幅を 1/10 にするには 100 倍の人数が要る。精度の目標を先に決めないと、測る費用が際限なく増える。'],
      changes: [['+', 'n = 5・30・120 の 3 つの山']],
      draw(t) { const mx = maxOf(hist(SET120().means, 600)); let s = popPanel(0);
        const cur = t < 2000 ? 5 : t < 4000 ? 30 : 120; const set = { 5: SET5(), 30: SET30(), 120: SET120() }[cur]; s += histPanel(hist(set.means, 600), mx, { title: `平均の分布（n = ${cur}）` });
        [[5, C.red, 0], [30, C.blue, 2000], [120, C.green, 4000]].forEach(([n, c, a]) => { if (t < a) return; const se = 4 / Math.sqrt(n); s += curve(4, se, 600, mx, c, P(t, a, 900), { op: n === cur ? 1 : .5 }); const yy = HY0 - nd(4, 4, se) * 600 * BW / mx * HH; s += T(X(4 + se * 1.1) + 6, Math.max(352, yy + 18), `n = ${n}・SE ${se.toFixed(2)}`, { size: 12.5, w: 800, fill: c, op: P(t, a + 400, 300) }); });
        return s; } },
    { kind: 'fix', short: '判断', title: '4.6 分は、偶然でも普通に出る', cam: [0, 300, 1000, 300], dur: 5600,
      get metrics() { return { n: '30', cnt: '600', mm: SET30().mm.toFixed(2), sd: SET30().sd.toFixed(2), se: '0.73' }; },
      paras: [p('今日の 4.6 は、中心から <span class="n">0.6</span> 分。SE で割ると <b>z = 0.6 / 0.73 ≈ 0.82</b>。', 0),
        p('これより外れる（両側）確率は約 <span class="n">41%</span>。<b>5 日に 2 日はこれくらいずれる</b>。混むようになった証拠にはならない。', 1800),
        p('もし 5.6 分なら z ≈ 2.19、両側で約 <span class="n">3%</span>。ここで初めて「偶然では起きにくい」と言える。600 日分の山でも、4.6 以上の日は ' + Math.round(SET30().means.filter((m) => m >= 4.6).length / 6) + '%。', 3600)],
      callout: ['注意', '「差がない」とは言っていない。「この 1 日のデータでは、偶然と見分けられない」と言っている。続けて測れば見分けられる差かもしれない。'],
      changes: [['+', 'z = 0.82・両側 p ≈ 0.41']],
      draw(t) { const S30 = SET30(); const H = hist(S30.means, 600); const mx = maxOf(H); const se = 4 / Math.sqrt(30); let s = popPanel(0) + histPanel(H, mx, { c: C.gray });
        const shade = (lo, hi, c, op) => { let q = ''; H.forEach((cnt, i) => { const x = i * BW; if (!cnt || x + BW / 2 < lo || x + BW / 2 > hi) return; const bh = cnt / mx * HH; q += bar3d(X(x) + .5, HY0 - bh, 840 / NB - 3, bh, c, { dx: 3, dy: 2, op }); }); return q; };
        if (t > 1000) s += shade(4.6, 99, C.orange, .9 * P(t, 1000, 400)) + shade(-1, 3.4, C.orange, .9 * P(t, 1000, 400));
        s += curve(4, se, 600, mx, C.blue);
        s += line([[X(4.6), 340], [X(4.6), HY0]], { c: C.orange, w: 2.4, head: false }) + T(X(4.6) + 8, 360, '今日 4.6（z = 0.82）', { size: 13, w: 800, fill: C.orange });
        if (t > 1800) { const frac = S30.means.filter((m) => Math.abs(m - 4) >= .6).length / 600; s += T(940, 470, `両側：理論 ${(2 * (1 - Phi(.6 / se)) * 100).toFixed(0)}% ・ 600 日では ${(frac * 100).toFixed(0)}%`, { a: 'end', size: 13, w: 700, fill: 'var(--mut)', op: P(t, 1800, 300) }); }
        if (t > 3600) s += `<g style="opacity:${P(t, 3600, 400)}">` + line([[X(5.6), 340], [X(5.6), HY0]], { c: C.red, w: 2, dash: '5 4', head: false }) + T(X(5.6) + 8, 404, `5.6 なら z = 2.19・両側 ${(2 * (1 - Phi(1.6 / se)) * 100).toFixed(0)}%`, { size: 12.5, w: 800, fill: C.red }) + '</g>';
        return s; } },
    { kind: 'fail', short: '崩れる時', title: '失敗：人数が少ないと山は崩れ、独立でないと幅が嘘になる', cam: [0, 300, 1000, 300], dur: 5600,
      get metrics() { return { n: '2', cnt: '600', mm: SET2().mm.toFixed(2), sd: SET2().sd.toFixed(2), se: '2.83' }; },
      paras: [p('1 日 <span class="n">2</span> 人だけだと、平均の分布はまだ<b>右に長い</b>。正規の曲線（青）は左に 0 分未満まではみ出し、合っていない。', 0),
        p('この時「± 1.96 SE」で幅を出すと、外れる確率は 5% にならない。偏った母集団で n が小さい時は、ブートストラップなど別の方法を使う。', 2000),
        p('もう一つの落とし穴は<b>独立でない</b>標本。同じ常連 30 人を毎日測れば、30 人分のばらつきの情報はない。式の n は「独立な人数」で、見かけの人数ではない。', 3600)],
      callout: ['注意', '時系列（今日の混雑は明日にも続く）・同じ人の繰り返し・クラスタ（同じ店の客）では、実際の幅は σ/√n より広い。'],
      changes: [['+', 'n = 2 の崩れた山']],
      draw(t) { const S2 = SET2(); const H = hist(S2.means, 600); const mx = maxOf(H); const se = 4 / Math.sqrt(2); let s = popPanel(0) + histPanel(H, mx, { c: C.red, title: '平均の分布（n = 2）' });
        s += curve(4, se, 600, mx, C.blue, P(t, 300, 1200), { w: 2 }); if (t > 1400) s += R(X(0) - 60, 340, 58, HY0 - 340, { r: 4, fill: C.blue, stroke: 'none', op: .1 }) + T(X(0) - 4, 356, '0 分未満？', { a: 'end', size: 11.5, w: 700, fill: C.blue });
        return s; } },
    { kind: 'sum', short: 'まとめ', title: 'まとめ：平均のぶれは σ / √n で読む', cam: [0, 0, 1000, 600], dur: 3600,
      paras: [p('<b>平均もぶれる</b>。日ごとに取り直すと、平均は母集団の平均の周りに山を作る。', 0),
        p('<b>幅</b>は SE = σ / √n。人数を 4 倍にして半分。<b>形</b>は n が大きいほど正規に近づく（中心極限定理）。', 1000),
        p('<b>判断</b>は「差 ÷ SE」で。小さな n・偏った形・独立でない標本では、この読み方自体が崩れる。', 2000)],
      callout: ['教えるとき', '「平均を 600 回取って積む」絵を一度見せると、SE・信頼区間・検定が同じ 1 つの山の話だと分かる。'],
      changes: [['+', 'ぶれる・幅・形・判断']],
      draw(t) { const S30 = SET30(); const H = hist(S30.means, 600); const mx = maxOf(H); let s = popPanel(0) + tray(SET30().firsts[3], -1e9, t, { gap: 0 }) + histPanel(H, mx) + curve(4, 4 / Math.sqrt(30), 600, mx, C.blue);
        return s; } }
  ];
  // ---- 試す ----
  const lab = { title: '人数・日数・母集団の形を変えて、山の幅と形を見る', cam: [0, 0, 1000, 600],
    intro: '1 日に測る人数 n、繰り返す日数、母集団の形を変える。下の段の山（実際の平均の分布）と、青い曲線（σ/√n で計算した正規分布）が合うかを見る。',
    params: [{ k: 'n', label: '1 日の人数 n', min: 1, max: 200, step: 1, v: 30, unit: ' 人' }, { k: 'cnt', label: '日数', min: 50, max: 3000, step: 50, v: 1000, unit: ' 日' }, { k: 'shape', label: '母集団の形', min: 0, max: 2, step: 1, v: 0, show: (v) => SH[v] }],
    results(Pm) { const g = gen(Pm.n, Pm.cnt, Pm.shape, 3); const se = SIG[Pm.shape] / Math.sqrt(Pm.n); const inside = g.means.filter((m) => Math.abs(m - 4) <= 1.96 * se).length / Pm.cnt;
      return [['平均の平均', g.mm.toFixed(2) + ' 分', 'mm'], ['平均の SD（実際）', g.sd.toFixed(3) + ' 分', 'sd'], ['σ / √n（計算）', se.toFixed(3) + ' 分', 'se'], ['実際 ÷ 計算', (g.sd / se).toFixed(2)], ['± 1.96 SE に入った', (inside * 100).toFixed(1) + ' %'], ['n', Pm.n + '', 'n'], ['日数', Pm.cnt + '', 'cnt']]; },
    preds: [{ q: '指数の母集団で n を 30 → 120 にすると、平均の SD は？', opts: ['ほぼ 1/4', 'ほぼ 1/2', 'ほとんど変わらない'], ans: 1, why: 'σ/√n なので √4 = 2 で割れる。4 倍の人数で半分。', tryit: 'n = 30 と 120 で「平均の SD（実際）」を見比べる' },
      { q: '日数を 1000 → 3000 にすると、山の幅は？', opts: ['狭くなる', 'ほとんど変わらない（山がなめらかになるだけ）'], ans: 1, why: '幅を決めるのは 1 日の人数 n。日数は「山をどれだけ正確に描けるか」を決めるだけ。', tryit: '日数を 50 にして、山がでこぼこになっても幅は同じなのを見る' }],
    draw(Pm, t) { const g = gen(Pm.n, Pm.cnt, Pm.shape, 3); const se = SIG[Pm.shape] / Math.sqrt(Pm.n); const k = Math.max(1, Math.floor(Pm.cnt * Lin(t, 0, 1400)));
      const Hf = hist(g.means, Pm.cnt); const mx = Math.max(maxOf(Hf), Pm.cnt * BW * nd(4, 4, se) * 1.08);
      let s = popPanel(Pm.shape) + tray(g.firsts[0].slice(0, 60), -1e9, t, { gap: 0, title: `標本：1 日 ${Pm.n} 人${Pm.n > 60 ? '（60 人まで表示）' : ''}` }) + histPanel(hist(g.means, k), mx, { title: `平均の分布：${k} 日分` });
      s += curve(4, se, Pm.cnt, mx, C.blue) + T(940, 360, `SE ${se.toFixed(3)}`, { a: 'end', size: 16, w: 800, mono: true, fill: C.blue });
      return s; } };
  // ---- やってみる：NumPy で確かめる ----
  const tr = { cam: [0, 0, 1000, 600], ps: '>>>', who: '窓口の店長', req: '今日の平均 4.6 分を見て人を増やすか迷っている。平均がどれくらいぶれるのか、数で見せて。',
    cards: ['import numpy as np', 'rng = np.random.default_rng(7)', 'x = rng.exponential(4, size=(1000, 30))', 'm = x.mean(axis=1)', 'm.mean(), m.std()', '4 / np.sqrt(30)', 'np.mean(np.abs(m - 4) >= 0.6)', 'x = rng.exponential(4, size=(1000, 120))'],
    refs: [['Generator.exponential', 'https://numpy.org/doc/stable/reference/random/generated/numpy.random.Generator.exponential.html'], ['numpy.mean', 'https://numpy.org/doc/stable/reference/generated/numpy.mean.html'], ['numpy.std', 'https://numpy.org/doc/stable/reference/generated/numpy.std.html']],
    tasks: [{ t: '30 人 × 1000 日の標本を作る', ok: (s) => s.f.x30 }, { t: '日ごとの平均 m を出す', ok: (s) => s.f.m }, { t: 'm の SD と 4 / √30 を比べる', ok: (s) => s.f.std30 && s.f.se30 }, { t: '0.6 分以上ずれる日の割合を出す', ok: (s) => s.f.tail }, { t: '120 人にして SD が約半分になるのを見る', ok: (s) => s.f.std120 }],
    init: () => ({ lines: [{ o: '# 試作の対話：数は手元の擬似乱数で出す（NumPy の実際の値とは違う）', k: 'd' }], hist: [], f: {}, np: false, rng: false, n: 0, K: 0, m: null }),
    metrics: (s) => { if (!s.m) return { n: s.n ? String(s.n) : '—', cnt: s.K ? String(s.K) : '0', mm: '—', sd: '—', se: '—' }; const g = gen(s.n, s.K, 0, 9); return { n: String(s.n), cnt: String(s.K), mm: g.mm.toFixed(2), sd: g.sd.toFixed(2), se: (4 / Math.sqrt(s.n)).toFixed(2) }; },
    run(cmd, s) { const c = cmd.replace(/\s+/g, ' ').trim(); const o = (x, k) => ({ o: x, k }); const f64 = (v) => `np.float64(${v.toFixed(16).replace(/0+$/, '').slice(0, 18)})`;
      if (c === 'import numpy as np') { s.np = true; return { out: [] }; }
      if (!s.np && /np\./.test(c)) return { out: [o("NameError: name 'np' is not defined", 'e')] };
      if (/^rng = np\.random\.default_rng\(\d*\)$/.test(c)) { s.rng = true; return { out: [] }; }
      let m;
      if ((m = c.match(/^x = rng\.exponential\(4(?:\.0)?, size=\((\d+), ?(\d+)\)\)$/))) { if (!s.rng) return { out: [o("NameError: name 'rng' is not defined", 'e')] }; s.K = Math.min(3000, +m[1]); s.n = Math.min(500, +m[2]); s.m = null; if (s.n === 30 && s.K >= 500) s.f.x30 = true; return { out: [] }; }
      if (/^m = x\.mean\(axis=1\)$/.test(c)) { if (!s.n) return { out: [o("NameError: name 'x' is not defined", 'e')] }; s.m = true; if (s.n === 30) s.f.m = true; return { out: [] }; }
      const g = s.m ? gen(s.n, s.K, 0, 9) : null;
      if (/^m\.mean\(\), ?m\.std\(\)$/.test(c) || /^m\.std\(\)$/.test(c) || /^m\.mean\(\)$/.test(c)) { if (!g) return { out: [o("NameError: name 'm' is not defined", 'e')] }; if (/std/.test(c)) { if (s.n === 30) s.f.std30 = true; if (s.n === 120 && s.f.std30) s.f.std120 = true; }
        const out = /^m\.mean\(\), ?m\.std\(\)$/.test(c) ? `(${f64(g.mm)}, ${f64(g.sd)})` : /std/.test(c) ? f64(g.sd) : f64(g.mm); return { out: [o(out, 'h')].concat(s.n === 120 && /std/.test(c) ? [o('# 30 人の時の約半分', 'd')] : []) }; }
      if ((m = c.match(/^4 ?\/ ?np\.sqrt\((\d+)\)$/))) { if (+m[1] === 30) s.f.se30 = true; return { out: [o(f64(4 / Math.sqrt(+m[1])), 'h')] }; }
      if ((m = c.match(/^np\.mean\((?:np\.abs\(m ?- ?4\) ?>= ?([\d.]+)|m ?>= ?([\d.]+))\)$/))) { if (!g) return { out: [o("NameError: name 'm' is not defined", 'e')] }; const two = m[1] !== undefined; const th = +(m[1] ?? m[2]); const fr = g.means.filter((v) => (two ? Math.abs(v - 4) >= th : v >= th)).length / g.means.length; if (s.n === 30 && ((two && th === .6) || (!two && th === 4.6))) s.f.tail = true; return { out: [o(f64(fr), 'h'), o(two ? '# 両側：これだけの日が 0.6 分以上ずれる' : '# 片側：4.6 分以上の日', 'd')] }; }
      if (c === 'help') return { out: [o('使える形：見本のカードを押す。size=(日数, 人数) の数は変えてよい')] };
      return { out: [o('この対話で使えない形（help）', 'e')] }; },
    draw(s, t) { let st = popPanel(0); if (!s.n) return st + tray([], 0, 0, { mean: false, title: '標本（x がまだ無い）' }) + histPanel(new Array(NB).fill(0), 10, { title: '平均の分布（m がまだ無い）' });
      const g = gen(s.n, s.K, 0, 9); st += tray(g.firsts[0].slice(0, 60), -1e9, t, { gap: 0, title: `x の 1 行目：${s.n} 人${s.n > 60 ? '（60 人まで表示）' : ''}` });
      if (!s.m) return st + histPanel(new Array(NB).fill(0), 10, { title: '平均の分布（m = x.mean(axis=1) で出す）' });
      const se = 4 / Math.sqrt(s.n); const H = hist(g.means, s.K); const mx = Math.max(maxOf(H), s.K * BW * nd(4, 4, se) * 1.08); st += histPanel(H, mx, { title: `m：${s.K} 日分の平均` }) + curve(4, se, s.K, mx, C.blue, 1, { op: s.f.se30 ? 1 : .35 });
      if (s.f.tail && s.n === 30) st += line([[X(4.6), 340], [X(4.6), HY0]], { c: C.orange, w: 2.4, head: false }) + line([[X(3.4), 340], [X(3.4), HY0]], { c: C.orange, w: 2.4, head: false }) + T(X(4.6) + 8, 360, '± 0.6', { size: 13, w: 800, fill: C.orange });
      st += T(940, 360, `SD ${g.sd.toFixed(3)}`, { a: 'end', size: 16, w: 800, mono: true, fill: C.orange });
      return st; } };
  // ---- 思い出す ----
  const QP = [[40, 'A', 30], [360, 'B', 120], [680, 'C', 5]];
  const quiz = [{ k: 'num', q: 'σ = 4 分、1 日 16 人。平均の標準誤差 SE は何分？', ans: 1, tol: .01, why: '4 / √16 = 4 / 4 = 1 分。' },
    { k: 'pick', q: '母集団が右に長い（指数）。1 日 30 人の平均を何日も積むと、山の形は？', opts: ['母集団と同じく右に長い', 'ほぼ左右対称の山（正規に近い）', '平らになる'], ans: 1, why: '中心極限定理。足し合わせた平均は、もとの形によらず n が大きいほど正規に近づく。' },
    { k: 'num', q: '平均の幅（SE）を半分にしたい。1 日の人数を何倍にする？', ans: 4, why: 'SE = σ/√n。√4 = 2 なので 4 倍。' },
    { k: 'hit', q: '3 つの山のうち、1 日 120 人の平均の分布はどれ？（目盛りは同じ）', hits: ['A', 'B', 'C'], ans: 'B', why: '120 人の SE は 0.37 分で一番狭い。5 人は 1.79 分で一番広く、まだ右に長い。' },
    { k: 'pick', q: '今日の平均 4.6 分・長い目の平均 4 分・SE 0.73 分。どう言える？', opts: ['明らかに長くなった', '偶然でも普通に出る幅（z ≈ 0.8・両側 4 割）', 'SE が分からないので何も言えない'], ans: 1, why: '差 0.6 ÷ SE 0.73 ≈ 0.82。両側で約 41% の日がこれくらいずれる。' }];
  function drawQuiz(t, hits, a, q) { if (!q || q.k !== 'hit') { const S30 = SET30(); const H = hist(S30.means, 600); const mx = maxOf(H); return popPanel(0) + tray(SET30().firsts[2], -1e9, t, { gap: 0 }) + histPanel(H, mx) + curve(4, 4 / Math.sqrt(30), 600, mx, C.blue); }
    let s = popPanel(0, 1, { title: '母集団：平均 4 分・SD 4 分（3 つとも同じ）' });
    QP.forEach(([x, id, n]) => { const set = { 5: SET5(), 30: SET30(), 120: SET120() }[n]; const H = hist(set.means, 600); const mx = maxOf(hist(SET120().means, 600)); const w = 280, y0 = 560, hh = 300;
      s += slab(x, 218, w + 20, 354, { r: 16, d: 8, c: C.orange }) + T(x + 16, 248, id, { size: 22, w: 800 });
      const X2 = (v) => x + 10 + v / 10 * w; H.forEach((c, i) => { if (!c || i * BW > 10) return; const bh = c / mx * hh; s += bar3d(X2(i * BW), y0 - bh, w * BW / 10 - 1.5, bh, C.orange, { dx: 2, dy: 1.5 }); });
      s += line([[X2(0), y0], [X2(10), y0]], { c: 'var(--dim)', w: 1.2, head: false }) + T(X2(0), y0 + 14, '0', { size: 10.5, mono: true, fill: 'var(--mut)' }) + T(X2(4), y0 + 14, '4', { a: 'middle', size: 10.5, mono: true, fill: 'var(--mut)' }) + T(X2(10), y0 + 14, '10 分', { a: 'end', size: 10.5, mono: true, fill: 'var(--mut)' });
      if (hits.includes(id)) s += R(x - 3, 217, w + 26, 366, { r: 18, fill: 'rgba(59,125,221,.05)', stroke: C.blue, sw: 2.5, id }) + pulse(x + w, 236, t, C.blue, 6);
      if (a && q.ans === id) s += R(x - 3, 217, w + 26, 366, { r: 18, fill: 'transparent', stroke: C.green, sw: 3 }); });
    return s; }
  const TERMS = {
    pop: { t: '母集団', m: ['母集団'], d: '知りたい対象の全部。ここでは「この窓口に来る全ての人の待ち時間」。' },
    sample: { t: '標本', m: ['標本'], d: '母集団から実際に選んで測った一部。ここでは「ある日の 30 人」。' },
    n: { t: 'n（標本の大きさ）', m: ['n =', '人数'], d: '1 回に測る人数。ここでは n = 30。' },
    mean: { t: '平均', m: ['平均'], d: '全部を足して、個数で割った値。' },
    sd: { t: '標準偏差（σ・SD）', m: ['σ', '標準偏差', 'SD', 'ばらつき'], d: '値が平均からどれくらい散らばっているかの目安。大きいほどバラバラ。' },
    dist: { t: '分布', m: ['分布'], d: 'どの値がどれくらいの多さで出るかの形。' },
    hist: { t: 'ヒストグラム', m: ['山', '積'], d: '値を区切りごとに数えて、棒の高さで表したグラフ。この教材の下の段。' },
    se: { t: '標準誤差（SE）', m: ['SE', '標準誤差'], d: '「平均」そのものがどれくらいぶれるかの目安。σ ÷ √n で求める。' },
    sqrt: { t: '√（ルート）', m: ['√'], d: '2 回掛けるとその数になる数。√4 = 2、√30 ≈ 5.5。' },
    clt: { t: '中心極限定理', m: ['中心極限定理'], d: '元の形が何であれ、平均を何度も取るとその分布は左右対称の山（正規分布）に近づく、という性質。' },
    normal: { t: '正規分布', m: ['正規'], d: '平均を中心に左右対称な、つり鐘の形の分布。' },
    median: { t: '中央値', m: ['中央値'], d: '小さい順に並べた時、真ん中に来る値。' },
    z: { t: 'z', m: ['z ='], d: '差が SE の何個分かを表す数。0.6 ÷ 0.73 ≈ 0.82 なら、SE 0.82 個分ずれている。' },
    p: { t: '確率・両側', m: ['確率', '両側'], d: '偶然でもこれくらい外れる割合。両側は「多い側にも少ない側にも」外れる場合を合わせた割合。' },
    indep: { t: '独立', m: ['独立'], d: '1 人の値が他の人の値に影響しないこと。同じ人を何度も測ると独立ではない。' },
    min: { t: '分', m: [' 分'], d: '時間の単位（minute）。待ち時間は分で表す。' }
  };
  const TALIAS = {};
  const INTRO = { kind: 'intro', short: '言葉', title: '始める前に：言葉をそろえる', cam: [0, 0, 1000, 600], dur: 6500,
    metrics: { n: '30', cnt: '1', mm: '4.60', sd: '—', se: '?' },
    terms: ['pop', 'sample', 'n', 'mean', 'sd', 'dist', 'hist'],
    paras: [p('このレッスンは「平均はどれくらいぶれるか」を見る。まず言葉をそろえる。', 0),
      p('上の段は<b>母集団</b>：窓口に来る全員の待ち時間の<b>分布</b>（どの長さの人がどれくらい多いか）。全員を測ることはできない。', 1400),
      p('真ん中の段は<b>標本</b>：ある日に測った 30 人。青い球 1 つが 1 人。この 30 人の<b>平均</b>（足して 30 で割った値）が 1 つ出る。', 3000),
      p('下の段には、日ごとの平均を積んでいく。下の黒い札で、言葉と数の対応を確かめてほしい。', 4600)],
    callout: ['たとえると', '鍋のスープ全部が母集団、味見のひとさじが標本。ひとさじの味（平均）は、すくうたびに少し違う。その違いの大きさを調べる。'],
    changes: [['+', '母集団・標本・平均']],
    draw(t) { let s = popPanel(0) + tray(story(), 1400, t, { gap: 40 }) + histPanel(new Array(NB).fill(0), 10, { title: '平均の分布（まだ空）' });
      s += anatomy(500, 420, [['30 人', '#7fb2ff', '標本（n = 30）', 'sample'], ['の', null], ['平均', '#f5b46b', '足して人数で割る', 'mean'], [' = ', null], ['4.6 分', '#8fd6a8', '今日の結果', 'min']], t, { center: true, step: 700, rows: [0, 0, 1, 0, 0] });
      return s; } };
  steps.unshift(INTRO);
  LESSONS.push({ terms: TERMS, termAlias: TALIAS, scene: true, id: 'stat', tab: '統計（平均のぶれ）', color: C.orange, kick: '統計 ・ 段 2（仕組み）・ 見せ方：分布が積もる図', title: '平均はどれくらいぶれるか',
    goal: '平均を何度も取って積む絵から、SE = σ/√n と中心極限定理を説明し、1 日の差が偶然の幅かを判断できる',
    metrics: [{ k: 'n', label: '1 日の人数' }, { k: 'cnt', label: '積んだ日数' }, { k: 'mm', label: '平均の平均' }, { k: 'sd', label: '平均の SD' }, { k: 'se', label: 'σ/√n' }],
    legend: [['母集団', C.teal], ['一人ひとり', C.blue], ['日ごとの平均', C.orange], ['σ/√n の曲線', C.blue]], steps, lab, tr, quiz, drawQuiz, quizCam: [0, 0, 1000, 600], note: '平均もぶれる。幅は σ/√n、人数 4 倍で半分。差 ÷ SE で偶然かを読む' });
})();
