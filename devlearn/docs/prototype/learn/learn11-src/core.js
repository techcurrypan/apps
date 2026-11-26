'use strict';
// ================= 道具 =================
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => (x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const P = (t, a, d) => ease(clamp((t - a) / d));          // a から d ミリ秒かけて 0→1
const Lin = (t, a, d) => clamp((t - a) / d);
const lerp = (a, b, p) => a + (b - a) * p;
const mix = (p1, p2, k) => [lerp(p1[0], p2[0], k), lerp(p1[1], p2[1], k)];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : (Math.round(n * 10) / 10).toString());
// 種つきの擬似乱数（同じ種で同じ並び）
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const C = { blue: '#3b7ddd', blue2: '#dbe7fb', orange: '#e0892b', org2: '#fbe7cf', green: '#2f9e6b', grn2: '#d6f0e3', red: '#d64545', red2: '#f8dada', purple: '#7a4cc2', pur2: '#e9def8', teal: '#1f8f8f', teal2: '#d4eeee', yellow: '#d9a21b', yel2: '#f8ecc8', gray: '#8a877f', gray2: '#e9e6df' };
// ---- 疑似 3D（等角）：図の座標（床の上の x・y と高さ z）を画面へ写す ----
const ISO = { ax: 0.894, ay: 0.447 };
let PJ = null, LIFT = 0, ISOK = 1, UIK = 1, INK = false, NOW = 0, HOV = null;   // UIK：画面 1 px が図の何単位か（文字を同じ大きさに保つ）。INK：濃い輪郭で描く          // PJ：今の写し方（null なら平面）。LIFT：荷物と線の高さ。ISOK：縮尺
function isoProj(k, ox, oy, ex = [ISO.ax, ISO.ay], ey = [-ISO.ax, ISO.ay]) { const f = (x, y, z = 0) => [ox + (x * ex[0] + y * ey[0]) * k, oy + (x * ex[1] + y * ey[1]) * k - z * k]; f.ex = ex; f.ey = ey; return f; }
const pj = (x, y, z = 0) => (PJ ? PJ(x, y, z) : [x, y - z]);
const face = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, var(--pn))`;
const edgeC = (c) => `color-mix(in srgb, ${c} 62%, var(--ink))`;
const ptsS = (a) => a.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
// 角柱：床の上の多角形 pts を z0 から高さ h だけ立てる（proj を渡すとその写し方で）
function prism(pts, z0, h, c, o = {}, proj = PJ || ((x, y, z = 0) => [x, y - z])) {
  let s = ''; const ex = proj.ex || [ISO.ax, ISO.ay], ey = proj.ey || [-ISO.ax, ISO.ay]; const n = pts.length; const cx = pts.reduce((a, q) => a + q[0], 0) / n, cy = pts.reduce((a, q) => a + q[1], 0) / n;
  const op = o.op ?? 1, sw = (o.sw ?? (INK ? 1.5 : 1.3)) * (INK ? UIK : 1), st = o.stroke || (INK ? 'var(--ink)' : edgeC(c)), dash = o.dash ? `stroke-dasharray:${o.dash};` : '';
  if (o.shadow !== false && z0 <= 12) s += `<polygon points="${ptsS(pts.map((q) => proj(q[0], q[1], 0)).map((q) => [q[0] + 7, q[1] + 6]))}" style="fill:#000;opacity:${.12 * op};filter:url(#isoblur)"/>`;
  const faces = [];
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; let nx = b[1] - a[1], ny = -(b[0] - a[0]); const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy; if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    const sy = nx * ex[1] + ny * ey[1], sx = nx * ex[0] + ny * ey[0]; if (sy > 1e-6 && h > 0) faces.push([a, b, sx < -.2 * Math.hypot(nx, ny) ? (INK ? 30 : 44) : sx > .2 * Math.hypot(nx, ny) ? (INK ? 48 : 64) : (INK ? 38 : 54)]); }
  for (const [a, b, pct] of faces) s += `<polygon points="${ptsS([proj(a[0], a[1], z0), proj(b[0], b[1], z0), proj(b[0], b[1], z0 + h), proj(a[0], a[1], z0 + h)])}" style="fill:${o.side || face(c, pct)};stroke:${st};stroke-width:${sw};stroke-linejoin:round;opacity:${op};${dash}"/>`;
  s += `<polygon points="${ptsS(pts.map((q) => proj(q[0], q[1], z0 + h)))}" style="fill:${o.top || face(c, o.topPct ?? (INK ? 13 : 20))};stroke:${st};stroke-width:${o.topSw ?? sw};stroke-linejoin:round;opacity:${op};${dash}"${o.id ? ` data-hit="${o.id}" class="hit"` : ''}/>`;
  return s;
}
const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function block(x, y, w, d, h, c, o = {}) { return prism(rectPts(x, y, w, d), o.z || 0, h, c, o); }
// 画面の点 (cx, cy) を中心に、等角の小物を置く（平面の図でも立体に見せる）
const localProj = (cx, cy, s = 1) => { const ex = (PJ && PJ.ex) || [ISO.ax, ISO.ay], ey = (PJ && PJ.ey) || [-ISO.ax, ISO.ay]; const f = (x, y, z = 0) => [cx + (x * ex[0] + y * ey[0]) * s, cy + (x * ex[1] + y * ey[1]) * s - z * s]; f.ex = ex; f.ey = ey; return f; };
function hexPts(r) { return Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i + Math.PI / 6; return [r * Math.cos(a), r * Math.sin(a)]; }); }
function hexPrism(cx, cy, r, h, c, o = {}) { return prism(hexPts(r), 0, h, c, o, localProj(cx, cy, o.s ?? 1)); }
function cube(cx, cy, w, h, c, o = {}) { return prism(rectPts(-w / 2, -w / 2, w, w), 0, h, c, o, localProj(cx, cy, o.s ?? 1)); }
function cylinder(cx, cy, r, h, c, o = {}) { const s = o.s ?? 1, rx = Math.SQRT2 * r * ISO.ax * s, ry = Math.SQRT2 * r * ISO.ay * s, H = h * s; const op = o.op ?? 1; const st = INK ? 'var(--ink)' : edgeC(c);
  return `<g style="opacity:${op}"><ellipse cx="${cx + 7}" cy="${cy + 6}" rx="${rx}" ry="${ry}" style="fill:#000;opacity:.12;filter:url(#isoblur)"/><path d="M${cx - rx} ${cy}V${cy - H}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy - H}V${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}Z" style="fill:${face(c, INK ? 36 : 48)};stroke:${st};stroke-width:${1.4 * UIK}"/>` +
    (o.bands ? Array.from({ length: o.bands }, (_, i) => `<path d="M${cx - rx} ${cy - H * (i + 1) / (o.bands + 1)}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy - H * (i + 1) / (o.bands + 1)}" style="fill:none;stroke:${st};stroke-width:1;opacity:.55"/>`).join('') : '') +
    `<ellipse cx="${cx}" cy="${cy - H}" rx="${rx}" ry="${ry}" style="fill:${face(c, o.hl ? 24 : 14)};stroke:${st};stroke-width:${(o.hl ? 2.2 : 1.4) * UIK}"/></g>`; }
function sphere(cx, cy, r, c, o = {}) { const id = 'sp' + c.replace('#', ''); return `<g style="opacity:${o.op ?? 1}"><defs><radialGradient id="${id}" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".85"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" style="fill:url(#${id});stroke:${edgeC(c)};stroke-width:.8"/></g>`; }
// 平面の図の「厚みのある板」：上の面と、手前に見える厚み
function slab(x, y, w, h, o = {}) { const d = o.d ?? 8, c = o.c || 'var(--ln)'; const r = o.r ?? 14; return `<g style="opacity:${o.op ?? 1}"><rect x="${x + 6}" y="${y + d + 6}" width="${w}" height="${h}" rx="${r}" style="fill:#000;opacity:.10;filter:url(#isoblur)"/><rect x="${x}" y="${y + d}" width="${w}" height="${h}" rx="${r}" style="fill:${o.side || face(c, INK ? 34 : 55)};stroke:${INK && !o.stroke ? 'var(--ink)' : edgeC(c)};stroke-width:${(INK ? 1.5 : 1.2) * UIK}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" style="fill:${o.fill || 'var(--pn)'};stroke:${o.stroke || (INK ? 'var(--ink)' : edgeC(c))};stroke-width:${(o.sw ?? (INK ? 1.5 : 1.2)) * UIK}"${o.id ? ` data-hit="${o.id}" class="hit"` : ''}/></g>`; }
// 平面の図の立体の棒（前の面・上の面・右の面）
function bar3d(x, y, w, h, c, o = {}) { if (h <= 0) return ''; const dx = o.dx ?? Math.min(10, w * .45), dy = -(o.dy ?? dx * .6); const st = INK && w > 14 ? 'var(--ink)' : edgeC(c);
  return `<g style="opacity:${o.op ?? 1}"><polygon points="${ptsS([[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + w, y + h]])}" style="fill:${face(c, 78)};stroke:${st};stroke-width:.8"/><polygon points="${ptsS([[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]])}" style="fill:${face(c, 38)};stroke:${st};stroke-width:.8"/><rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:${face(c, 62)};stroke:${st};stroke-width:.8"/></g>`; }
// 文字の札（画面に平行な、縁取りのある丸い札）
function tag(x, y, s, o = {}) { const k = o.k ?? UIK, sz = (o.size || 13.5) * k, h = o.h ? o.h * k : sz + 13 * k, w = tw(s, sz) + (o.dot ? 32 : 22) * k; const x0 = o.left ? x : x - w / 2;
  return `<g style="opacity:${o.op ?? 1}${o.term ? ';cursor:help' : ''}"${o.term ? ` data-term="${o.term}"` : ''}><rect x="${x0 + 1.5 * k}" y="${y - h / 2 + 2.5 * k}" width="${w}" height="${h}" rx="${h / 2}" style="fill:var(--ink);opacity:.18"/><rect x="${x0}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" style="fill:${o.fill || 'var(--pn)'};stroke:${o.stroke || 'var(--ink)'};stroke-width:${(o.sw ?? 1.6) * k}"/>${o.dot ? `<circle cx="${x0 + 15 * k}" cy="${y}" r="${5.5 * k}" style="fill:${o.dot};stroke:var(--ink);stroke-width:${k}"/>` : ''}<text x="${x0 + (o.dot ? 26 : 11) * k}" y="${y + sz * .36}" ${o.mono !== false ? 'class="m"' : ''} style="font-size:${sz}px;font-weight:700;fill:${o.tc || 'var(--ink)'}">${esc(s)}</text></g>`; }


// 角の丸い長方形（床の上の座標）
function rrectPts(x, y, w, h, r, n = 5) { r = Math.min(r, w / 2, h / 2); const pts = []; const cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * (i / n); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; }
// 角の丸い立体：横の面は左・中・右の 3 つの明るさにまとめ、輪郭は外側だけを描く
function rprism(pts, z0, h, c, o = {}, proj = PJ || ((x, y, z = 0) => [x, y - z])) { const ex = proj.ex || [ISO.ax, ISO.ay], ey = proj.ey || [-ISO.ax, ISO.ay]; const n = pts.length; const op = o.op ?? 1;
  const sw = (o.sw ?? 1.5) * (INK ? UIK : 1), st = o.stroke || (INK ? 'var(--ink)' : edgeC(c)); let s = '';
  if (o.shadow !== false && z0 <= 12) s += `<polygon points="${ptsS(pts.map((q) => proj(q[0], q[1], 0)).map((q) => [q[0] + 7, q[1] + 7]))}" style="fill:#000;opacity:${.13 * op};filter:url(#isoblur)"/>`;
  const vis = []; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const nx = b[1] - a[1], ny = -(b[0] - a[0]); const L = Math.hypot(nx, ny) || 1; const sy = (nx * ex[1] + ny * ey[1]) / L, sx = (nx * ex[0] + ny * ey[0]) / L; vis.push(sy > 1e-4 ? (sx < -.25 ? 30 : sx > .25 ? 48 : 39) : 0); }
  // 同じ明るさの続きをまとめて 1 枚に
  let start = vis.findIndex((v, i) => v && !vis[(i - 1 + n) % n]); if (start < 0) start = 0; const order = Array.from({ length: n }, (_, i) => (start + i) % n);
  let grp = null; const groups = []; for (const i of order) { const v = vis[i]; if (!v) { grp = null; continue; } if (!grp || grp.v !== v) { grp = { v, idx: [] }; groups.push(grp); } grp.idx.push(i); }
  for (const g of groups) { const bot = [], tp = []; for (const i of g.idx) { const a = pts[i], b = pts[(i + 1) % n]; if (!bot.length) bot.push(proj(a[0], a[1], z0)); bot.push(proj(b[0], b[1], z0)); }
    for (let j = g.idx.length - 1; j >= 0; j--) { const i = g.idx[j]; const a = pts[i], b = pts[(i + 1) % n]; if (j === g.idx.length - 1) tp.push(proj(b[0], b[1], z0 + h)); tp.push(proj(a[0], a[1], z0 + h)); }
    s += `<polygon points="${ptsS(bot.concat(tp))}" style="fill:${face(c, INK ? g.v : g.v + 14)};stroke:${face(c, INK ? g.v : g.v + 14)};stroke-width:.6;opacity:${op}"/>`; }
  // 外側の輪郭：見える横の面の下の線と、左右の縦の線
  const visIdx = order.filter((i) => vis[i]); if (visIdx.length) { const first = pts[visIdx[0]], last = pts[(visIdx[visIdx.length - 1] + 1) % n]; const chain = [proj(first[0], first[1], z0 + h), proj(first[0], first[1], z0)]; for (const i of visIdx) { const b = pts[(i + 1) % n]; chain.push(proj(b[0], b[1], z0)); } chain.push(proj(last[0], last[1], z0 + h));
    s += `<polyline points="${ptsS(chain)}" style="fill:none;stroke:${st};stroke-width:${sw};stroke-linejoin:round;opacity:${op}${o.dash ? `;stroke-dasharray:${o.dash}` : ''}"/>`; }
  s += `<polygon points="${ptsS(pts.map((q) => proj(q[0], q[1], z0 + h)))}" style="fill:${o.top || face(c, o.topPct ?? (INK ? 13 : 20))};stroke:${st};stroke-width:${sw};stroke-linejoin:round;opacity:${op}${o.dash ? `;stroke-dasharray:${o.dash}` : ''}"${o.id ? ` data-hit="${o.id}" class="hit"` : ''}/>`;
  return s; }
// ---- 場面の道具：画面の座標 (x, y) を床の中心にして、等角の物を置く ----
function pad(cx, cy, w, d, c, o = {}) { const L = localProj(cx, cy, 1); return `<polygon points="${ptsS(rectPts(-w / 2, -d / 2, w, d).map((q) => L(q[0], q[1], 0)))}" style="fill:${face(c, o.f ?? 9)};stroke:${face(c, 50)};stroke-width:${1.6 * UIK};opacity:${o.op ?? 1}"${o.id ? ` data-hit="${o.id}" class="hit"` : ''}/>`; }
const OBJH = { func: 46, queue: 16, ring: 20, nic: 12, laptop: 8, hex: 50, db: 70, block: 40, platform: 14 };
function objH(ob) { return ob.h ?? OBJH[ob.k] ?? 30; }
function objFoot(ob) { return { func: [124, 92], queue: [230, 84], ring: [120, 120], nic: [156, 100], laptop: [130, 92], hex: [130, 130], db: [120, 120], block: [130, 100], platform: [ob.w || 300, ob.d || 200] }[ob.k] || [120, 90]; }
const obS = (ob) => (typeof ob.s === 'number' ? ob.s : 1);
function drawObj(ob, o = {}) { const hov = HOV && ob.id && HOV === ob.id; const x = ob.x, y = ob.y - (hov ? 8 : 0), c = ob.c || C.gray, op = o.op ?? 1, h = objH(ob), sc = obS(ob); const hl = o.hl || hov; const L = localProj(x, y, sc);
  let s = `<g style="opacity:${op};cursor:help"${ob.id ? ` data-term="${ob.id}"` : ''}>`;
  const [fw, fd] = objFoot(ob); if (ob.k !== 'platform') s += `<g transform="translate(0 ${hov ? 8 : 0})">${padR(x, y, (fw + 46) * sc, (fd + 46) * sc, hl ? c : C.gray, { f: hl ? 20 : 7, r: 26 * sc })}</g>`;
  const rp = (pts, z0, hh, cc, oo = {}) => rprism(pts, z0, hh, cc, oo, L);
  const chipTop = (w, d, z, g, cc) => { let q = `<polygon points="${ptsS(rrectPts(-w / 2, -d / 2, w, d, 12).map((p) => L(p[0], p[1], z + .5)))}" style="fill:${face(cc, hl ? 30 : 22)};stroke:${edgeC(cc)};stroke-width:${1.1 * UIK};opacity:.95"/>`; if (g) { const tp = L(0, 0, z); q += `<text x="${tp[0]}" y="${tp[1] + 9 * sc}" text-anchor="middle" style="font-size:${26 * sc}px;font-weight:800;fill:${edgeC(cc)}">${esc(g)}</text>`; } return q; };
  if (ob.k === 'func' || ob.k === 'block') { s += rp(rrectPts(-fw / 2, -fd / 2, fw, fd, 22), 0, h, c, { topPct: hl ? 20 : 12 }); s += chipTop(fw * .62, fd * .62, h, ob.g, c); }
  else if (ob.k === 'queue') { s += rp(rrectPts(-fw / 2, -fd / 2, fw, fd, 20), 0, h, c, { topPct: hl ? 18 : 11 }); for (let i = 0; i < 4; i++) s += `<polygon points="${ptsS(rrectPts(-100 + i * 52, -30, 44, 60, 9).map((q) => L(q[0], q[1], h + .5)))}" style="fill:${face(c, 28)};stroke:${edgeC(c)};stroke-width:${1.2 * UIK};stroke-dasharray:${4 * UIK} ${3 * UIK}"/>`; if (ob.clock) s += clock(x + 80 * sc, y - (h + 50) * sc, '', c); }
  else if (ob.k === 'ring') { s += cylinder(x, y, 60, h, c, { s: sc, hl }); const rx = Math.SQRT2 * 30 * ISO.ax * sc, ry = Math.SQRT2 * 30 * ISO.ay * sc; s += `<ellipse cx="${x}" cy="${y - h * sc}" rx="${rx}" ry="${ry}" style="fill:var(--bg);stroke:var(--ink);stroke-width:${1.4 * UIK}"/>`; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const q = L(Math.cos(a) * 45, Math.sin(a) * 45, h); s += `<circle cx="${q[0]}" cy="${q[1]}" r="${4 * sc}" style="fill:${face(c, 60)};stroke:var(--ink);stroke-width:${.8 * UIK}"/>`; } }
  else if (ob.k === 'nic') { s += rp(rrectPts(-fw / 2, -fd / 2, fw, fd, 16), 0, h, C.green, { topPct: 18 }); s += rp(rrectPts(-30, -26, 60, 52, 10), h, 12, c, { topPct: 30, shadow: false }); s += rp(rrectPts(fw / 2 - 18, -fd / 2 + 10, 12, fd - 20, 4), h, 4, C.yellow, { topPct: 40, shadow: false });
    for (let i = 0; i < 3; i++) s += `<polygon points="${ptsS(rrectPts(-62, -36 + i * 26, 22, 16, 4).map((q) => L(q[0], q[1], h + .5)))}" style="fill:${face(C.gray, 30)};stroke:var(--ink);stroke-width:${.8 * UIK}"/>`; }
  else if (ob.k === 'laptop') { s += rp(rrectPts(-66, -46, 132, 92, 14), 0, 8, C.gray, { topPct: 8 }); s += `<polygon points="${ptsS(rrectPts(-52, -24, 104, 56, 8).map((q) => L(q[0], q[1], 8.5)))}" style="fill:${face(C.gray, 22)};stroke:var(--ink);stroke-width:${UIK}"/>`;
    s += rp(rrectPts(-62, -46, 124, 9, 4), 8, 84, C.gray, { topPct: 18, shadow: false }); s += `<polygon points="${ptsS([L(-54, -37, 16), L(54, -37, 16), L(54, -37, 86), L(-54, -37, 86)])}" style="fill:${face(c, 26)};stroke:var(--ink);stroke-width:${1.2 * UIK};stroke-linejoin:round"/>`;
    for (let i = 0; i < 3; i++) s += `<polygon points="${ptsS([L(-44, -37, 72 - i * 16), L(30 - i * 14, -37, 72 - i * 16), L(30 - i * 14, -37, 65 - i * 16), L(-44, -37, 65 - i * 16)])}" style="fill:${face(c, 60)}"/>`; }
  else if (ob.k === 'hex') s += hexPrism(x, y, ob.r || 62, h, c, { s: sc, topPct: hl ? 26 : 16 }) + (ob.g ? `<text x="${x}" y="${y - h * sc + 9 * sc}" text-anchor="middle" style="font-size:${26 * sc}px;font-weight:800;fill:${edgeC(c)}">${esc(ob.g)}</text>` : '');
  else if (ob.k === 'db') s += cylinder(x, y, ob.r || 56, h, c, { s: sc, bands: 2, hl });
  else if (ob.k === 'platform') s += rp(rrectPts(-fw / 2, -fd / 2, fw, fd, 34), 0, h, c, { topPct: hl ? 12 : 7, dash: o.dash });
  return s + '</g>'; }
function padR(cx, cy, w, d, c, o = {}) { const L = localProj(cx, cy, 1); return `<polygon points="${ptsS(rrectPts(-w / 2, -d / 2, w, d, o.r ?? 24).map((q) => L(q[0], q[1], 0)))}" style="fill:${face(c, o.f ?? 9)};stroke:${face(c, 50)};stroke-width:${1.6 * UIK};opacity:${o.op ?? 1}"${o.id ? ` data-hit="${o.id}" class="hit"` : ''}/>`; }
function objTop(ob, up = 18) { return [ob.x, ob.y - objH(ob) * obS(ob) - up]; }
function objLabel(ob, o = {}) { const [fw, fd] = objFoot(ob); const yb = ob.y + ((fw + fd) / 2 * ISO.ay + 6) * obS(ob); const sub = ob.sub ?? (typeof ob.s === 'string' ? ob.s : ''); let s = tag(ob.x, yb + 16 * UIK, ob.f, { dot: ob.c || C.gray, size: o.size || 14, op: o.op, term: o.term ?? ob.id }); if (o.sub && sub) s += T(ob.x, yb + 44 * UIK, sub, { a: 'middle', size: 12.5, w: 700, fill: 'var(--mut)', halo: true, op: o.op }); return s; }
// 動く荷物：等角の小箱と名前
function tok(p, lab, c = C.blue, o = {}) { const sc = o.scale ?? 1, w = (o.w ?? 44) * .7 * sc, hh = 24 * sc; let s = `<g style="opacity:${o.op ?? 1}">` + rprism(rrectPts(-w / 2, -w / 2, w, w, w * .22, 3), 0, hh, c, { topPct: 45, shadow: false }, localProj(p[0], p[1] + hh * .6, 1));
  if (lab) s += T(p[0], p[1] - hh * .55 - 8 * UIK, lab, { a: 'middle', size: o.size || 12.5, w: 800, mono: true, fill: edgeC(c), halo: true });
  return s + '</g>'; }
const pkt = (p, c = C.blue, o = {}) => `<g style="opacity:${o.op ?? 1}">${rprism(rrectPts(-8, -8, 16, 16, 4, 2), 0, 12, c, { topPct: 50, shadow: false }, localProj(p[0], p[1] + 6, 1))}</g>`;
// 画面に平行な札（説明のカード）。x, y は左上、中身は UIK で同じ大きさに保つ
function card(x, y, lines, o = {}) { const k = UIK, lh = (o.lh || 20) * k, w = (o.w || 240) * k, h = lines.length * lh + 18 * k; const dark = o.dark;
  let s = `<g style="opacity:${o.op ?? 1}"><rect x="${x + 3 * k}" y="${y + 5 * k}" width="${w}" height="${h}" rx="${12 * k}" style="fill:var(--ink);opacity:.16"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${12 * k}" style="fill:${dark ? '#15171c' : 'var(--pn)'};stroke:${dark ? '#2b2f37' : 'var(--ink)'};stroke-width:${1.6 * k}"/>`;
  lines.forEach((ln, i) => { const [txt, col, op2] = Array.isArray(ln) ? ln : [ln]; s += `<text x="${x + 14 * k}" y="${y + 9 * k + (i + 1) * lh - 5 * k}" class="m" style="font-size:${(o.size || 13) * k}px;font-weight:700;fill:${col || (dark ? '#d7dae0' : 'var(--ink)')};opacity:${op2 ?? 1}">${esc(txt)}</text>`; });
  return s + '</g>'; }

// ---- 場面の配置：ステップごとに物の置き場所を決め、間は滑らかに動かす ----
const SCN = { from: {}, to: {}, t: 1e9 };
function scnPos(id) { const a = SCN.from[id], b = SCN.to[id]; if (!a && !b) return null; if (!a) return b; if (!b) return a; const k = ease(clamp(SCN.t / 900)); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k), op: lerp(a.op, b.op, k) }; }
function sceneTo(layout, instant) { const now = {}; for (const id of new Set([...Object.keys(SCN.from), ...Object.keys(SCN.to)])) { const c = scnPos(id); if (c && c.op > .01) now[id] = c; }
  const to = {}; for (const [id, v] of Object.entries(layout || {})) to[id] = { x: v[0], y: v[1], s: v[2] ?? 1, op: 1 };
  for (const id of Object.keys(now)) if (!to[id]) to[id] = { ...now[id], op: 0 };
  for (const id of Object.keys(to)) if (!now[id]) now[id] = { ...to[id], op: 0, s: to[id].s * .85, y: to[id].y + 20 };
  SCN.from = instant ? to : now; SCN.to = to; SCN.t = instant ? 1e9 : 0; }
function layoutFor(l) { if (S.mode === 'watch') return l.steps[S.step].layout; if (S.mode === 'try') return l.tr.layout; if (S.mode === 'quiz') return l.quizLayout; return null; }
// ---- 絵の部品（SVG の文字列を返す）。PJ がある時は、渡す座標は床の上の座標 ----
const st = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}:${v}`).join(';');
function T(x, y, s, o = {}) {
  let halo = ''; const k = o.k ?? UIK; if (PJ && !o.flat) { [x, y] = PJ(x, y, o.z ?? LIFT); } if ((PJ && !o.flat) || o.halo) halo = `paint-order:stroke;stroke:var(--pn);stroke-width:${3.5 * k}px;stroke-linejoin:round;`;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${o.a || 'start'}"${o.mono ? ' class="m"' : ''} style="${halo}${st({ 'font-size': (o.size || 13) * k + 'px', 'font-weight': o.w || 400, fill: o.fill || 'var(--ink)', opacity: o.op ?? 1 })}">${o.raw ? s : esc(s)}</text>`;
}
function R(x, y, w, h, o = {}) {
  if (PJ && !o.flat) { if (o.h) return prism(rectPts(x, y, w, h), o.z || 0, o.h, o.c || 'var(--ln)', o);
    return `<polygon points="${ptsS(rectPts(x, y, w, h).map((q) => PJ(q[0], q[1], o.z ?? 0)))}" style="${st({ fill: o.fill || 'var(--pn)', stroke: o.stroke || 'var(--ln)', 'stroke-width': o.sw ?? 1.5, opacity: o.op ?? 1, 'stroke-dasharray': o.dash, 'stroke-linejoin': 'round' })}"${o.id ? ` data-hit="${o.id}" class="hit"` : ''}/>`; }
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${o.r ?? 8}" style="${st({ fill: o.fill || 'var(--pn)', stroke: o.stroke || 'var(--ln)', 'stroke-width': o.sw ?? 1.5, opacity: o.op ?? 1, 'stroke-dasharray': o.dash })}"${o.id ? ` data-hit="${o.id}" class="hit"` : ''}/>`;
}
function head(x, y, ang, c, s = 9) { const a1 = ang + 2.6, a2 = ang - 2.6; return `<polygon points="${x},${y} ${x + Math.cos(a1) * s},${y + Math.sin(a1) * s} ${x + Math.cos(a2) * s},${y + Math.sin(a2) * s}" style="fill:${c}"/>`; }
function line(pts, o = {}) {
  const c = o.c || 'var(--dim)', k = o.k ?? UIK; if (PJ && !o.flat) pts = pts.map((q) => (q[2] === 's' ? q : PJ(q[0], q[1], o.z ?? LIFT)));
  let d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  let s = `<path d="${d}" style="${st({ fill: 'none', stroke: c, 'stroke-width': (o.w || 2) * k, 'stroke-dasharray': o.dash ? o.dash.split(' ').map((v) => v * k).join(' ') : undefined, opacity: o.op ?? 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })}"/>`;
  if (o.head !== false && pts.length > 1) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; s += `<g style="opacity:${o.op ?? 1}">${head(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), c, 10 * k)}</g>`; }
  if (o.flow) s += `<path d="${d}" style="fill:none;stroke:${o.flowC || c};stroke-width:${(o.w || 2) * 2.8 * k};stroke-linecap:round;stroke-dasharray:0.1 ${22 * k};stroke-dashoffset:${(-(NOW / 28) * k % (22 * k)).toFixed(2)};opacity:${(o.op ?? 1) * .9}"/>`;
  if (o.both && pts.length > 1) { const a = pts[1], b = pts[0]; s += `<g style="opacity:${o.op ?? 1}">${head(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), c, 10 * k)}</g>`; }
  return s;
}
// 折れ線の途中 p（0〜1）の位置
function along(pts, p) {
  let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); L += d; }
  let x = clamp(p) * L; for (let i = 0; i < seg.length; i++) { if (x <= seg[i] || i === seg.length - 1) return mix(pts[i], pts[i + 1], seg[i] ? clamp(x / seg[i]) : 0); x -= seg[i]; }
  return pts[pts.length - 1];
}
// 一部分だけ引いた線（線を引く動き）
function partial(pts, p) { if (p >= 1) return pts; const out = [pts[0]]; let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { seg.push(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])); L += seg[i]; }
  let x = p * L; for (let i = 0; i < seg.length; i++) { if (x <= seg[i]) { out.push(mix(pts[i], pts[i + 1], seg[i] ? x / seg[i] : 0)); return out; } x -= seg[i]; out.push(pts[i + 1]); } return out; }
// 荷物：立体の小箱と、上に乗る名前
function chip(cx, cy, w, h, label, c, o = {}) {
  const sc = o.scale ?? 1;
  if (PJ && !o.flat) { const [sx, sy] = PJ(cx, cy, o.z ?? LIFT - 14); const fw = Math.max(16, w * .42) * sc, fd = Math.max(12, h * .62) * sc, fh = 12 * sc;
    let s = `<g style="opacity:${o.op ?? 1}">` + prism(rectPts(-fw / 2, -fd / 2, fw, fd), 0, fh, c, { topPct: 70, shadow: false, top: o.fill || c, stroke: edgeC(c) }, localProj(sx, sy, ISOK * 1.25));
    if (label) s += `<text x="${sx.toFixed(1)}" y="${(sy - fh * ISOK * 1.25 - 7).toFixed(1)}" text-anchor="middle" class="m" style="paint-order:stroke;stroke:var(--pn);stroke-width:3.5px;stroke-linejoin:round;font-size:${(o.size || 12) * Math.min(1, sc)}px;font-weight:800;fill:${edgeC(c)}">${esc(label)}</text>`;
    return s + '</g>'; }
  const W = w * sc, H = h * sc;
  return `<g style="opacity:${o.op ?? 1}">${bar3d(cx - W / 2, cy - H / 2, W, H, c, { dx: 5, dy: 3 })}${label ? `<text x="${cx}" y="${cy + 4.5 * Math.min(1, sc)}" text-anchor="middle"${o.mono !== false ? ' class="m"' : ''} style="font-size:${(o.size || 12) * Math.min(1, sc)}px;font-weight:700;fill:${o.tc || '#fff'}">${esc(label)}</text>` : ''}</g>`;
}
const tw = (s, size) => [...String(s)].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2000 ? size : size * .6), 0);
function badge(x, y, s, c, o = {}) { if (PJ && !o.flat) [x, y] = PJ(x, y, o.z ?? LIFT); const k = o.k ?? UIK, sz = (o.size || 12) * k, h = (o.h || 24) * k, w = tw(s, sz) + 18 * k; const x0 = x - (o.center ? w / 2 : 0); const f = o.fill || c;
  return `<g style="opacity:${o.op ?? 1}"><rect x="${x0 + 1.5 * k}" y="${y - h / 2 + 2.5 * k}" width="${w}" height="${h}" rx="${h / 2}" style="fill:var(--ink);opacity:.2"/><rect x="${x0}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" style="fill:${INK ? face(f, 22) : f};stroke:${INK ? 'var(--ink)' : edgeC(f)};stroke-width:${(INK ? 1.6 : 1) * k}"/><text x="${x0 + w / 2}" y="${y + sz * .36}" text-anchor="middle"${o.mono ? ' class="m"' : ''} style="font-size:${sz}px;font-weight:800;fill:${INK ? edgeC(f) : o.tc || '#fff'}">${esc(s)}</text></g>`; }
function pulse(x, y, t, c, r0 = 14, o = {}) { const k = (t % 1400) / 1400; const r = r0 + 26 * k;
  if (PJ && !o.flat) { const [sx, sy] = PJ(x, y, o.z ?? LIFT - 14); return `<ellipse cx="${sx}" cy="${sy}" rx="${r * 1.2}" ry="${r * .6}" style="fill:none;stroke:${c};stroke-width:2.2;opacity:${1 - k}"/>`; }
  if (o.iso) return `<ellipse cx="${x}" cy="${y}" rx="${r * 1.5}" ry="${r * .75}" style="fill:none;stroke:${c};stroke-width:${2.4 * UIK};opacity:${1 - k}"/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" style="fill:none;stroke:${c};stroke-width:${2 * UIK};opacity:${1 - k}"/>`; }
function clock(x, y, label, c = C.orange, o = {}) { if (PJ && !o.flat) [x, y] = PJ(x, y, o.z ?? LIFT); const k = UIK; return `<g><circle cx="${x}" cy="${y}" r="${11 * k}" style="fill:var(--pn);stroke:${INK ? 'var(--ink)' : c};stroke-width:${2 * k}"/><path d="M${x} ${y - 6 * k}V${y}l${4 * k} ${3 * k}" style="fill:none;stroke:${c};stroke-width:${2.2 * k};stroke-linecap:round"/>${label ? `<text x="${x + 17 * k}" y="${y + 4.5 * k}" class="m" style="paint-order:stroke;stroke:var(--pn);stroke-width:${4 * k}px;font-size:${13 * k}px;font-weight:800;fill:${edgeC(c)}">${esc(label)}</text>` : ''}</g>`; }
function cross(x, y, s, c = C.red, o = {}) { if (PJ && !o.flat) [x, y] = PJ(x, y, o.z ?? LIFT); return `<path d="M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}" style="stroke:${c};stroke-width:3.5;stroke-linecap:round"/>`; }

// ================= 画面の回り =================
const LESSONS = [];
const S = { li: 0, mode: 'watch', step: 0, t: 0, playing: true, speed: 1, cam: [0, 0, 1000, 600], camFrom: null, camTo: null, camT: 0, lab: {}, labT: 0, tryst: null, tryT: 0, q: 0, qa: {}, qT: 0, ord: null, mFrom: {}, mT: 0, seen: {} };
const L = () => LESSONS[S.li];
const MODES = [['watch', '見る'], ['lab', '試す'], ['try', 'やってみる'], ['quiz', '思い出す']];
let paraState = '';
function setLesson(i) { S.li = i; S.step = 0; S.t = 0; S.mode = 'watch'; S.playing = true; S.lab = Object.fromEntries(L().lab.params.map((p) => [p.k, p.v])); S.labAns = {}; S.tryst = null; S.q = 0; S.qa = {}; S.ord = null; S.mFrom = {}; S.mT = 0; S.camFrom = null; S.cam = camScreen(L().steps[0].cam); if (L().scene) sceneTo(L().steps[0].layout, true); buildAll(); }
function setMode(m) { S.mode = m; document.body.className = m === 'try' ? 'try' : ''; if (m === 'try' && !S.tryst) S.tryst = L().tr.init(); if (m === 'quiz') { S.q = 0; S.qa = {}; S.ord = null; } S.t = 0; S.labT = 0; S.tryT = 0; S.qT = 0; S.playing = true; moveCam(camFor()); if (L().scene) sceneTo(layoutFor(L())); buildAll(); }
function camFor() { const l = L(); if (S.mode === 'watch') return l.steps[S.step].cam; if (S.mode === 'lab') return l.lab.cam; if (S.mode === 'try') return l.tr.cam; return l.quizCam; }
function useProj(mode = S.mode) { const l = L(); const iso = mode === 'lab' ? l.lab.iso : l.iso; if (iso) { if (!iso.p) iso.p = isoProj(iso.k, iso.ox, iso.oy, iso.ex, iso.ey); PJ = iso.p; LIFT = iso.lift ?? 30; ISOK = iso.k; } else { PJ = null; LIFT = 0; ISOK = 1; } }
function camScreen(cam) { useProj(); if (!PJ) return cam; const [x, y, w, h] = cam; const pts = []; for (const [a, b] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { pts.push(PJ(a, b, 0), PJ(a, b, LIFT + 30)); }
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]); const x0 = Math.min(...xs) - 12, y0 = Math.min(...ys) - 16; return [x0, y0, Math.max(...xs) + 12 - x0, Math.max(...ys) + 12 - y0]; }
function moveCam(to) { to = camScreen(to); S.camFrom = S.cam.slice(); S.camTo = to.slice(); S.camT = 0; const st = $('#stage'); if (st && st.scrollWidth > st.clientWidth + 4) st.scrollTo({ left: 0, behavior: 'smooth' }); }
function go(i) { const l = L(); if (i < 0 || i >= l.steps.length) return; const prevM = curMetrics(); S.step = i; S.t = 0; S.playing = true; S.mFrom = prevM; S.mT = 0; moveCam(l.steps[i].cam); if (l.scene) sceneTo(l.steps[i].layout); S.seen[l.id + ':' + i] = true; buildAll(); }
function curMetrics() { const l = L(); const out = {}; for (let i = 0; i <= S.step; i++) Object.assign(out, l.steps[i].metrics || {}); return out; }
function toast(s) { const el = $('#toast'); el.textContent = s; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2600); }

function buildAll() {
  const l = L();
  $('#lessons').innerHTML = LESSONS.map((x, i) => `<button type="button" data-l="${i}" aria-pressed="${i === S.li}"><i style="background:${x.color}"></i>${esc(x.tab)}</button>`).join('');
  $$('#lessons [data-l]').forEach((b) => (b.onclick = () => setLesson(+b.dataset.l)));
  const MD = { watch: '仕組みが動くのを、ステップごとに見る', lab: 'つまみで数を変えて、結果がどう変わるか試す', try: '端末に命令を打って、実際の困りごとを直す', quiz: '答えて、覚えたかを確かめる' };
  $('#modes').innerHTML = MODES.map(([k, n], i) => `<button type="button" data-m="${k}" aria-pressed="${k === S.mode}" class="hov" data-d="${MD[k]}"><b>${i + 1}</b>${n}</button>`).join('');
  $$('#modes [data-m]').forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
  $('#kick').textContent = l.kick; $('#title').textContent = l.title; $('#goal').textContent = l.goal;
  $('#legend').innerHTML = l.legend.map(([n, c, d]) => `<span><i style="background:${d ? `repeating-linear-gradient(90deg,${c} 0 5px,transparent 5px 8px)` : c}"></i>${n}</span>`).join('');
  $('#steps').style.display = S.mode === 'watch' ? '' : 'none';
  $('#steps').innerHTML = l.steps.map((s, i) => `<button type="button" data-s="${i}" data-d="${esc(KINDS[s.kind] + '：' + s.title)}" class="hov up ${i === S.step ? 'on' : i < S.step ? 'done' : ''}"><b>${i < S.step ? '✓' : i + 1}</b>${esc(s.short)}</button>`).join('');
  $$('#steps [data-s]').forEach((b) => (b.onclick = () => go(+b.dataset.s)));
  buildMetrics(); buildSide(); paraState = '';
}
function buildMetrics() {
  const l = L(); let vals = {};
  if (S.mode === 'watch') vals = curMetrics(); else if (S.mode === 'lab') vals = Object.fromEntries(l.lab.results(S.lab).filter((r) => r[2]).map((r) => [r[2], r[1]])); else if (S.mode === 'try') vals = l.tr.metrics ? l.tr.metrics(S.tryst) : {}; else vals = curMetricsAll();
  const wid = (k) => Math.max(3, ...l.steps.map((st) => String((st.metrics || {})[k] ?? '').length), String(vals[k] ?? '').length);
  $('#metrics').innerHTML = l.metrics.map((m) => `<div class="met" data-k="${m.k}"${termTip(l, m.label)}><small${termTip(l, m.label) ? ' class="tl"' : ''}>${m.label}</small><b style="min-width:${wid(m.k) * .62}em">${vals[m.k] ?? '—'}</b></div>`).join('');
}
function curMetricsAll() { const out = {}; L().steps.forEach((s) => Object.assign(out, s.metrics || {})); return out; }
function tickMetrics() { // 数え上げ
  if (S.mode !== 'watch') return; const l = L(); const to = curMetrics(); const k = clamp(S.mT / 900);
  for (const m of l.metrics) { const el = $(`.met[data-k="${m.k}"] b`); if (!el) continue; const a = S.mFrom[m.k], b = to[m.k]; if (b === undefined) continue;
    const na = parseFloat(String(a ?? '').replace(/,/g, '')), nb = parseFloat(String(b).replace(/,/g, ''));
    let txt = b; if (!isNaN(na) && !isNaN(nb) && na !== nb && k < 1) { const unit = String(b).replace(/^[\d.,\s-]+/, ''); txt = fmt(lerp(na, nb, ease(k))) + (unit ? ' ' + unit.trim() : ''); }
    if (el.textContent !== txt) el.textContent = txt; el.parentElement.classList.toggle('chg', a !== b && k < 1); }
}

// ---- 右の欄 ----
function buildSide() {
  const l = L(), side = $('#side');
  if (S.mode === 'watch') {
    const s = l.steps[S.step], n = l.steps.length, last = S.step === n - 1;
    side.innerHTML = `<div class="sbody"><div class="sn"><span>ステップ ${S.step + 1} / ${n}</span><span class="kind ${s.kind}">${KINDS[s.kind]}</span></div><h2>${esc(s.title)}</h2>
      ${s.kind === 'intro' ? termBox(l, S.step) : ''}${s.paras.map((p, i) => `<p class="para" data-i="${i}">${p.h}</p>`).join('')}
      ${s.kind === 'intro' ? '' : termBox(l, S.step)}
      ${s.callout ? `<div class="callout"><b>${s.callout[0]}</b>${s.callout[1]}</div>` : ''}
      ${s.changes ? `<div class="chg"><h4>変わったこと</h4><ul>${s.changes.map(([m, t]) => `<li><i class="${m === '+' ? 'p' : m === '-' ? 'm' : 't'}">${m === '-' ? '−' : m === '~' ? '〜' : '+'}</i><span>${t}</span></li>`).join('')}</ul></div>` : ''}
      ${s.deep ? `<details class="deep"><summary>中身まで（実装の名前と数）</summary>${s.deep}</details>` : ''}</div>
      <div class="keys">← → ステップ ・ R もう一度 ・ Space 一時停止</div>
      <div class="sfoot"><button class="back" type="button" id="bk" ${S.step ? '' : 'disabled'}>←</button><button class="next" type="button" id="nx"><span><small>${last ? '見るは終わり' : '次へ'}</small>${last ? '試す：つまみを動かす' : esc(l.steps[S.step + 1].title)}</span><span>→</span></button></div>`;
    $('#bk').onclick = () => go(S.step - 1); $('#nx').onclick = () => (last ? setMode('lab') : go(S.step + 1));
    paraState = ''; markTerms(l, S.step); return;
  }
  if (S.mode === 'lab') return buildLab();
  if (S.mode === 'try') return buildTry();
  return buildQuiz();
}
const KINDS = { intro: '準備', problem: '問題', mech: '仕組み', inside: '中身', fail: '失敗', fix: '解決', cost: '代償', ops: '運用', sum: 'まとめ' };
function tickParas() {
  if (S.mode !== 'watch') return; const s = L().steps[S.step]; const ps = s.paras; let st = '';
  const tt = S.t; for (let i = 0; i < ps.length; i++) { const seen = tt >= ps[i].at; const now = seen && (i === ps.length - 1 || tt < ps[i + 1].at); st += (seen ? 's' : '-') + (now ? 'n' : '-'); }
  if (st === paraState) return; paraState = st;
  $$('.para').forEach((el, i) => { el.classList.toggle('seen', st[i * 2] === 's'); el.classList.toggle('now', st[i * 2 + 1] === 'n'); });
}
// ---- 試す ----
function buildLab() {
  const l = L(), lab = l.lab;
  $('#side').innerHTML = `<div class="sbody lab"><div class="sn"><span>試す：つまみを動かして確かめる</span><span class="kind mech">実験</span></div><h2>${esc(lab.title)}</h2><p style="font-size:13.5px;margin:0 0 8px">${lab.intro}</p>
    ${lab.params.map((p) => `<label><span>${p.label}<b id="pv-${p.k}">${p.show ? p.show(S.lab[p.k]) : S.lab[p.k] + (p.unit || '')}</b></span><input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${S.lab[p.k]}" data-p="${p.k}"></label>`).join('')}
    <div class="res" id="res"></div>
    ${lab.preds.map((q, i) => `<div class="pred" data-q="${i}"><p>予想：${q.q}</p>${q.opts.map((o, j) => `<button type="button" data-o="${j}" class="${S.labAns[i] !== undefined ? (j === q.ans ? 'ok' : j === S.labAns[i] ? 'ng' : '') : ''}">${o}</button>`).join('')}${S.labAns[i] !== undefined ? `<div class="fb"><b>${S.labAns[i] === q.ans ? '当たり。' : '外れ。'}</b>${q.why}<br><span class="hint">→ ${q.tryit}</span></div>` : ''}</div>`).join('')}</div>
    <div class="sfoot"><button class="back" type="button" id="bk">← 見る</button><button class="next" type="button" id="nx"><span><small>次へ</small>やってみる：端末で直す</span><span>→</span></button></div>`;
  $$('#side [data-p]').forEach((inp) => (inp.oninput = () => { const p = lab.params.find((x) => x.k === inp.dataset.p); S.lab[p.k] = +inp.value; $('#pv-' + p.k).textContent = p.show ? p.show(+inp.value) : inp.value + (p.unit || ''); S.labT = 0; showRes(); buildMetrics(); }));
  $$('#side .pred').forEach((d) => $$('[data-o]', d).forEach((b) => (b.onclick = () => { S.labAns[+d.dataset.q] = +b.dataset.o; buildLab(); })));
  $('#bk').onclick = () => setMode('watch'); $('#nx').onclick = () => setMode('try'); showRes();
}
function showRes() { $('#res').innerHTML = `<dl>${L().lab.results(S.lab).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`; }
// ---- やってみる ----
function buildTry() {
  const l = L(), tr = l.tr, s = S.tryst;
  const done = tr.tasks.map((t) => t.ok(s)); const cur = done.indexOf(false);
  $('#side').innerHTML = `<div class="sbody" style="flex:0 0 auto;padding-bottom:6px"><div class="req"><b>${tr.who}</b>「${tr.req}」</div>
    <ul class="tasks">${tr.tasks.map((t, i) => `<li class="${done[i] ? 'ok' : i === cur ? 'cur' : ''}"><span>${done[i] ? '✓' : i === cur ? '▶' : '・'}</span><span>${t.t}</span></li>`).join('')}</ul></div>
    <div class="term"><div class="tout" id="tout"></div><div class="tin"><span>${tr.ps}</span><input id="tin" autocomplete="off" spellcheck="false" aria-label="命令を打つ" placeholder="命令を打って Enter（↑↓ で履歴、Tab で補完）"></div></div>
    <div class="cards">${tr.cards.map((c) => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="refs">コマンドの公式の説明：${tr.refs.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(n)} ↗</a>`).join(' ・ ')}</div>
    <div class="sfoot"><button class="back" type="button" id="bk">← 試す</button><button class="next" type="button" id="nx" ${cur === -1 ? '' : 'disabled'}><span><small>${cur === -1 ? '直せた' : 'やることを全部終えると進める'}</small>思い出す：答えて確かめる</span><span>→</span></button></div>`;
  renderTerm();
  const inp = $('#tin'); inp.focus({ preventScroll: true }); let hi = s.hist.length;
  inp.onkeydown = (e) => {
    if (e.key === 'Enter') { const v = inp.value.trim(); inp.value = ''; if (!v) return; s.hist.push(v); const before = tr.tasks.map((t) => t.ok(s)); s.lines.push({ ps: tr.ps, c: v }); const r = tr.run(v, s); (r.out || []).forEach((o) => s.lines.push(o)); S.tryT = 0; const after = tr.tasks.map((t) => t.ok(s));
      if (after.some((x, i) => x && !before[i])) toast('✓ ' + tr.tasks[after.findIndex((x, i) => x && !before[i])].t); if (after.every(Boolean) && !before.every(Boolean)) toast('直せた。思い出すへ進める'); buildTry(); buildMetrics(); }
    else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); inp.value = s.hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(s.hist.length, hi + 1); inp.value = s.hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') { e.preventDefault(); const m = tr.cards.find((c) => c.startsWith(inp.value) && c !== inp.value); if (m) inp.value = m; }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); s.lines = []; renderTerm(); }
  };
  $$('#side [data-c]').forEach((b) => (b.onclick = () => { inp.value = b.dataset.c; inp.focus(); }));
  $('#bk').onclick = () => setMode('lab'); $('#nx').onclick = () => setMode('quiz');
}
function renderTerm() { const o = $('#tout'); o.innerHTML = S.tryst.lines.map((x) => (x.c !== undefined ? `<div><span class="ps">${esc(x.ps)}</span> <span class="c">${esc(x.c)}</span></div>` : `<div class="${x.k || ''}">${esc(x.o)}</div>`)).join(''); o.scrollTop = o.scrollHeight; }
// ---- 思い出す ----
function buildQuiz() {
  const l = L(), Q = l.quiz, i = S.q, side = $('#side');
  if (i >= Q.length) { const ok = Object.values(S.qa).filter((x) => x.ok).length;
    side.innerHTML = `<div class="sbody"><div class="qbar"><i style="width:100%"></i></div><h2>${ok} / ${Q.length} 正解</h2><p>手帳に 1 枚残した：<b>${esc(l.note)}</b></p><p style="color:var(--mut);font-size:13px">3 日後にもう一度答えると忘れにくくなる。</p></div>
      <div class="sfoot"><button class="back" type="button" id="bk">もう一度</button><button class="next" type="button" id="nx"><span><small>次のレッスン</small>${esc(LESSONS[(S.li + 1) % LESSONS.length].title)}</span><span>→</span></button></div>`;
    $('#bk').onclick = () => setMode('quiz'); $('#nx').onclick = () => setLesson((S.li + 1) % LESSONS.length); return; }
  const q = Q[i], a = S.qa[i];
  let body = '';
  if (q.k === 'pick') body = `<div class="pred" style="border:0;padding:0">${q.opts.map((o, j) => `<button type="button" data-o="${j}" class="${a ? (j === q.ans ? 'ok' : j === a.v ? 'ng' : '') : ''}" ${a ? 'disabled' : ''}>${o}</button>`).join('')}</div>`;
  if (q.k === 'order') { const cur = S.ord || (S.ord = q.shuffled.slice()); body = `<div class="ord">${cur.map((t, j) => `<div><span>${j + 1}. ${t}</span><button type="button" data-u="${j}" aria-label="上へ" ${a ? 'disabled' : ''}>↑</button><button type="button" data-d="${j}" aria-label="下へ" ${a ? 'disabled' : ''}>↓</button></div>`).join('')}</div>${a ? '' : '<button class="next" type="button" id="chk" style="margin-top:8px;flex:0"><span>これで答える</span><span>✓</span></button>'}`; }
  if (q.k === 'hit') body = `<p class="hint">▶ 左の図で<b>光っている物から 1 つ</b>を押す（Tab で選んで Enter でも押せる）</p>${a ? '' : ''}`;
  if (q.k === 'num') body = `<div style="display:flex;gap:8px"><input id="qn" style="flex:1;font:15px var(--m);padding:8px 10px;border:1px solid var(--ln);border-radius:8px;background:var(--pn);color:var(--ink)" ${a ? 'disabled' : ''} placeholder="数を打つ"><button class="back" type="button" id="qnb" ${a ? 'disabled' : ''}>答える</button></div>`;
  side.innerHTML = `<div class="sbody"><div class="qbar"><i style="width:${(i / Q.length) * 100}%"></i></div><div class="sn"><span>思い出す ${i + 1} / ${Q.length}</span><span class="kind">${{ pick: '選ぶ', order: '並べる', hit: '図を押す', num: '数' }[q.k]}</span></div><h2>${q.q}</h2>${body}
    ${a ? `<div class="fb"><b>${a.ok ? '当たり。' : '外れ。'}</b>${q.why}</div>` : ''}</div>
    <div class="sfoot"><button class="back" type="button" id="bk">← やってみる</button><button class="next" type="button" id="nx" ${a ? '' : 'disabled'}><span><small>${a ? '次へ' : 'まず答える'}</small>${i + 1 < Q.length ? '次の問い' : '結果を見る'}</span><span>→</span></button></div>`;
  $$('#side [data-o]').forEach((b) => (b.onclick = () => { S.qa[i] = { v: +b.dataset.o, ok: +b.dataset.o === q.ans }; buildQuiz(); }));
  $$('#side [data-u]').forEach((b) => (b.onclick = () => { const j = +b.dataset.u; if (j) { [S.ord[j - 1], S.ord[j]] = [S.ord[j], S.ord[j - 1]]; buildQuiz(); } }));
  $$('#side [data-d]').forEach((b) => (b.onclick = () => { const j = +b.dataset.d; if (j < S.ord.length - 1) { [S.ord[j + 1], S.ord[j]] = [S.ord[j], S.ord[j + 1]]; buildQuiz(); } }));
  const chk = $('#chk'); if (chk) chk.onclick = () => { S.qa[i] = { ok: S.ord.join('|') === q.items.join('|') }; buildQuiz(); };
  const qnb = $('#qnb'); if (qnb) qnb.onclick = () => { const v = parseFloat(($('#qn').value || '').replace(/[,，\s]/g, '').replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))); S.qa[i] = { v, ok: Math.abs(v - q.ans) <= (q.tol || 0) }; buildQuiz(); };
  $('#bk').onclick = () => setMode('try'); $('#nx').onclick = () => { S.q++; S.ord = null; S.qT = 0; buildQuiz(); };
}
function quizHit(id) { const q = L().quiz[S.q]; if (!q || q.k !== 'hit' || S.qa[S.q]) return; S.qa[S.q] = { v: id, ok: id === q.ans }; buildQuiz(); }


// ---- 言葉の説明：各ステップで初めて出る言葉を並べ、本文と図の言葉に説明を付ける ----
const plain = (h) => String(h).replace(/<[^>]+>/g, '');
function termList(l) { return Object.entries(l.terms || {}); }
function termsIn(l, st) { if (st.terms) return st.terms; const txt = st.paras.map((p) => plain(p.h)).join(' ') + ' ' + st.title; return termList(l).filter(([, v]) => (v.m || [v.t]).some((m) => txt.includes(m))).map(([k]) => k); }
function stepTerms(l, i) { const seen = new Set(); for (let j = 0; j < i; j++) termsIn(l, l.steps[j]).forEach((k) => seen.add(k)); return termsIn(l, l.steps[i]).filter((k) => !seen.has(k) && l.terms[k]); }
function termBox(l, i) { const ks = stepTerms(l, i); if (!ks.length) return ''; const intro = l.steps[i].kind === 'intro';
  return `<div class="terms${intro ? ' big' : ''}"><h4>${intro ? 'この教材で使う言葉' : 'このステップで初めて出る言葉'}</h4><dl>${ks.map((k) => `<dt>${esc(l.terms[k].t)}</dt><dd>${l.terms[k].d}</dd>`).join('')}</dl><p class="th">本文の<span class="tw">点線の言葉</span>と図の名前は、指を置く（押す）と説明が出る。</p></div>`; }
function termTip(l, label) { const e = termList(l).find(([, v]) => v.t === label || (v.m || []).includes(label)); return e ? ` title="${esc(plain(e[1].d))}"` : ''; }
function markTerms(l, i) { const ks = []; for (let j = 0; j <= i; j++) termsIn(l, l.steps[j]).forEach((k) => { if (!ks.includes(k) && l.terms[k]) ks.push(k); });
  const pats = []; ks.forEach((k) => (l.terms[k].m || [l.terms[k].t]).forEach((m) => pats.push([m, k]))); pats.sort((a, b) => b[0].length - a[0].length);
  $$('#side .para').forEach((el) => { const done = new Set(); const walk = (node) => { for (const ch of [...node.childNodes]) { if (ch.nodeType === 1) { if (!ch.classList.contains('tw')) walk(ch); continue; } if (ch.nodeType !== 3) continue;
      for (const [m, k] of pats) { if (done.has(k)) continue; const idx = ch.data.indexOf(m); if (idx < 0) continue; done.add(k);
        const r = document.createRange(); r.setStart(ch, idx); r.setEnd(ch, idx + m.length); const sp = document.createElement('span'); sp.className = 'tw'; sp.tabIndex = 0; sp.dataset.d = `${l.terms[k].t}：${plain(l.terms[k].d)}`; r.surroundContents(sp); walk(node); return; } } }; walk(el); }); }
function showTip(x, y, k) { const l = L(); const v = l.terms && (l.terms[k] || l.terms[(l.termAlias || {})[k]]); let tip = $('#tip'); if (!v) { if (tip) tip.remove(); return; } if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.className = 'tip'; $('#stage').appendChild(tip); }
  tip.innerHTML = `<b>${esc(v.t)}</b>${v.d}`; const r = $('#stage').getBoundingClientRect(); tip.style.left = Math.min(r.width - 320, Math.max(8, x - r.left + 12)) + 'px'; tip.style.top = Math.min(r.height - 120, Math.max(8, y - r.top + 12)) + 'px'; }

// 式を部品に分けて、部品ごとに意味の札を付ける（例：send(fd, buf, 65536)）
function anatomy(x, y, parts, t = 1e9, o = {}) { const k = UIK, sz = (o.size || 30) * k; let s = '', cx = x; const pos = [];
  parts.forEach(([txt, c, note], i) => { const w = tw(txt, sz); pos.push([cx, w, c, note, i]); cx += w; });
  const W = cx - x; const x0 = x - (o.center ? W / 2 : 0); const sh = (q) => q + x0 - x;
  s += `<rect x="${sh(x) - 20 * k}" y="${y - sz - 14 * k}" width="${W + 40 * k}" height="${sz + 28 * k}" rx="${12 * k}" style="fill:#15171c;stroke:var(--ink);stroke-width:${1.6 * k}"/>`;
  pos.forEach(([px, w, c, note, i]) => { const on = !o.step || t > o.step * i; s += `<text x="${sh(px)}" y="${y}" class="m" style="font-size:${sz}px;font-weight:800;fill:${c || '#9aa3b2'}">${esc(parts[i][0]).replace(/ /g, '\u00a0')}</text>`;
    if (note) { const row = o.rows ? o.rows[i] ?? 0 : 0; const ny = y + 44 * k + row * 46 * k; const nx = sh(px) + w / 2; const op = o.step ? P(t, o.step * i, 400) : 1;
      s += `<g style="opacity:${op}">` + `<path d="M${nx} ${y + 8 * k}V${ny - 14 * k}" style="stroke:${c};stroke-width:${2 * k}"/>` + tag(nx, ny, note, { size: 13.5, dot: c, mono: false, term: parts[i][3] }) + '</g>'; } });
  return s; }
// ---- 描く回り ----
let last = 0;
function frame(now) {
  const dt = last ? Math.min(60, now - last) : 16; last = now;
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (S.playing) { const d = dt * S.speed; S.t += rm ? d * 6 : d; S.labT += d; S.tryT += d; S.qT += d; }
  NOW = now; if (S.mode === 'watch' && S.playing) { const du = L().steps[S.step].dur || 5000; if (S.t > du + 2600) { S.t = 0; S.looped = true; } }
  S.mT += dt; S.camT += dt; SCN.t += dt;
  if (S.camTo) { const k = rm ? 1 : P(S.camT, 0, 800); S.cam = S.camFrom.map((v, i) => lerp(v, S.camTo[i], k)); if (k >= 1) S.camTo = null; }
  const l = L(); useProj(); INK = !!l.scene && S.mode !== 'lab'; { const r = $('#svg').getBoundingClientRect(); UIK = INK && r.width ? Math.max(S.cam[2] / r.width, S.cam[3] / r.height) : 1; } let svg = '<defs><filter id="isoblur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter></defs>';
  try {
    if (S.mode === 'watch') svg = l.steps[S.step].draw(S.t);
    else if (S.mode === 'lab') svg = l.lab.draw(S.lab, S.labT);
    else if (S.mode === 'try') svg = l.tr.draw(S.tryst, S.tryT);
    else { const q = l.quiz[S.q]; svg = l.drawQuiz(S.qT, q && q.k === 'hit' && !S.qa[S.q] ? q.hits : [], q && S.qa[S.q] ? S.qa[S.q] : null, q); }
  } catch (e) { svg = T(20, 30, 'エラー: ' + e.message, { fill: C.red }); console.error(e); }
  if (S.mode === 'watch') { const [x, y, w, h] = S.cam; const pc = l.steps[S.step].cam; if (!l.scene && (pc[2] < 990 || pc[3] < 590)) svg += `<path d="M-3000 -3000H4000V4000H-3000Z M${x - 6} ${y - 6}h${w + 12}v${h + 12}h${-w - 12}Z" fill-rule="evenodd" style="fill:var(--pn);opacity:.72;pointer-events:none"/>`; }
  const el = $('#svg'); el.setAttribute('viewBox', S.cam.map((v) => v.toFixed(1)).join(' ')); el.innerHTML = svg;
  tickParas(); tickMetrics();
  requestAnimationFrame(frame);
}
$('#svg').addEventListener('click', (e) => { const h = e.target.closest('[data-hit]'); if (h && S.mode === 'quiz') quizHit(h.dataset.hit); });
$('#svg').addEventListener('click', (e) => { const g = e.target.closest('[data-term]'); if (g) showTip(e.clientX, e.clientY, g.dataset.term); else showTip(0, 0, null); });
$('#svg').addEventListener('mousemove', (e) => { const g = e.target.closest('[data-term]'); HOV = g ? g.dataset.term : null; if (g) showTip(e.clientX, e.clientY, g.dataset.term); else if ($('#tip')) $('#tip').remove(); });
$('#svg').addEventListener('mouseleave', () => { HOV = null; if ($('#tip')) $('#tip').remove(); });
$('#svg').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const h = e.target.closest('[data-hit]'); if (h) quizHit(h.dataset.hit); } });
$('#replay').onclick = () => { if (S.mode === 'watch') S.t = 0; S.labT = 0; S.tryT = 0; S.playing = true; $('#pause').textContent = '❚❚ 一時停止'; };
$('#pause').onclick = () => { S.playing = !S.playing; $('#pause').textContent = S.playing ? '❚❚ 一時停止' : '▶ 再生'; };
$('#speed').onclick = () => { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 0.5 : 1; $('#speed').textContent = S.speed + '×'; };
$('#thm').onclick = () => { const r = document.documentElement; const cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); r.dataset.theme = cur === 'dark' ? 'light' : 'dark'; };
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea')) return;
  if (S.mode === 'watch' && e.key === 'ArrowRight') { S.step < L().steps.length - 1 ? go(S.step + 1) : setMode('lab'); e.preventDefault(); }
  if (S.mode === 'watch' && e.key === 'ArrowLeft') { go(S.step - 1); e.preventDefault(); }
  if (e.key === 'r' || e.key === 'R') $('#replay').click();
  if (e.key === ' ') { $('#pause').click(); e.preventDefault(); }
});
function guide() {
  let seen = false; try { seen = localStorage.getItem('dl11.guide') === '1'; } catch (_) { /* 無ければ毎回 */ }
  if (seen || /still/.test(location.hash)) return;
  const pages = [['図が主役', '左の大きな図で、仕組みが動く。ステップに入ると、関わる物へ寄り、物が順に現れ、荷物が線の上を進む。拡大しなくても読める大きさで出る。'], ['右は語り', '今動いている所の段落が光る。「中身まで」を開くと、実装の名前と数が出る。'], ['右下の「次へ」で進む', '「次へ」の釦か → キーで次のステップへ。見る → 試す（つまみ）→ やってみる（端末）→ 思い出す（問い）の順に進む。']];
  let i = 0; const g = document.createElement('div'); g.className = 'guide';
  const draw = () => { g.innerHTML = `<div><div class="sn"><span>はじめに ${i + 1} / 3</span></div><h3>${pages[i][0]}</h3><p>${pages[i][1]}</p><div class="gn"><button class="back" type="button" id="gs">飛ばす</button><button class="next" type="button" id="gx" style="flex:0 0 160px"><span>${i < 2 ? '次へ' : '始める'}</span><span>→</span></button></div></div>`;
    $('#gs', g).onclick = close; $('#gx', g).onclick = () => (i < 2 ? (i++, draw()) : close()); };
  const close = () => { g.remove(); try { localStorage.setItem('dl11.guide', '1'); } catch (_) { /* 残せなくてよい */ } };
  draw(); document.body.appendChild(g);
}
function start() { const h = location.hash.match(/#(\w+)/); const i = h ? LESSONS.findIndex((l) => l.id === h[1]) : 0; setLesson(Math.max(0, i)); guide(); requestAnimationFrame(frame); }
window.__s = { S, go, setMode, setLesson, L, LESSONS };
