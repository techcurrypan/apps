// ---- Procedural city generator (all shapes made here; no external assets) ----
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const HX = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const jit = (c, k, r) => { const f = 1 + (r() - 0.5) * k; return [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)]; };
const mulc = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
function fbm(x, y, o) { let s = 0, a = 0.5; for (let i = 0; i < (o || 4); i++) { s += a * vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- terrain ----------
const HARBOR_X0 = -95;
function shoreZ(x) { if (x > HARBOR_X0 && x < 285) return 206; return 192 + 14 * Math.sin(x * 0.011 + 1.3) + 6 * Math.sin(x * 0.031); }
function terrainH(x, z) {
  // island
  const di = Math.hypot(x + 230, z - 560);
  const isl = di < 95 ? 26 * smooth(95, 15, di) * (0.8 + 0.4 * fbm(x * 0.03, z * 0.03, 3)) : 0;
  const sz = shoreZ(x);
  let h;
  if (z > sz) {
    const harbor = x > HARBOR_X0 && x < 285;
    h = harbor ? (z < sz + 1 ? 0 : -9) : Math.max(-12, -(z - sz) * 0.14);
    if (h < -9) h = -9 - (z - sz) * 0.005;
  } else {
    const d = Math.max(-272 - x, x - 560, -272 - z);
    h = 0;
    if (x > 272 && x < 560 && z > -272) h = 0.9 * fbm(x * 0.01, z * 0.01, 3) + 0.05;
    if (d > 0) h += 75 * smooth(0, 380, d) * (0.55 + 0.9 * fbm(x * 0.0035 + 4, z * 0.0035, 4)) + 10 * fbm(x * 0.018, z * 0.018, 3) * smooth(0, 90, d);
    if (z > sz - 30 && !(x > HARBOR_X0 && x < 285)) h = Math.min(h, (sz - z) * 0.06);
  }
  if (isl > 0) h = Math.max(h, isl - 3);
  return h;
}

// ---------- geometry buffer ----------
class Geo {
  constructor(n) { this.a = new Float32Array((n || 65536) * 12); this.n = 0; }
  v(x, y, z, nx, ny, nz, c, m, id, u) {
    if ((this.n + 1) * 12 > this.a.length) { const b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; }
    const o = this.n * 12, A = this.a;
    A[o] = x; A[o + 1] = y; A[o + 2] = z; A[o + 3] = nx; A[o + 4] = ny; A[o + 5] = nz; A[o + 6] = c[0]; A[o + 7] = c[1]; A[o + 8] = c[2]; A[o + 9] = m; A[o + 10] = id; A[o + 11] = u; this.n++;
  }
  out() { return this.a.slice(0, this.n * 12); }
  view() { return this.a.subarray(0, this.n * 12); }
  reset() { this.n = 0; return this; }
}
function nrm(a, b, c) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx; const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
// q: quad with optional per-vertex colors / u values
function q(g, a, b, c, d, col, m, id, u, n) {
  const N = n || nrm(a, b, c);
  const C = Array.isArray(col[0]) ? col : [col, col, col, col];
  const U = Array.isArray(u) ? u : [u || 0, u || 0, u || 0, u || 0];
  const P = [a, b, c, d];
  for (const k of [0, 1, 2, 0, 2, 3]) g.v(P[k][0], P[k][1], P[k][2], N[0], N[1], N[2], C[k], m || 0, id || 0, U[k]);
}
function tri(g, a, b, c, col, m, id, u) { const N = nrm(a, b, c); for (const p of [a, b, c]) g.v(p[0], p[1], p[2], N[0], N[1], N[2], col, m || 0, id || 0, u || 0); }
function box(g, x0, y0, z0, x1, y1, z1, col, o) {
  o = o || {}; const id = o.id || 0, m = o.m || 0, ao = o.ao === undefined ? 0.8 : o.ao;
  const cb = mulc(col, ao), ct = o.top || col;
  const s4 = [cb, cb, col, col];
  if (!o.noTop) q(g, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], ct, o.mt !== undefined ? o.mt : m, id, o.u || 0, [0, 1, 0]);
  q(g, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], s4, m, id, o.u || 0, [0, 0, 1]);
  q(g, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], s4, m, id, o.u || 0, [0, 0, -1]);
  q(g, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], s4, m, id, o.u || 0, [1, 0, 0]);
  q(g, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], s4, m, id, o.u || 0, [-1, 0, 0]);
  if (o.bottom) q(g, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col, m, id, 0, [0, -1, 0]);
}
// rotated box around (cx,cz) heading a (radians, 0 = +x)
function rbox(g, cx, cz, a, l0, l1, w, y0, y1, col, o) {
  o = o || {}; const ca = Math.cos(a), sa = Math.sin(a);
  const P = (l, s, y) => [cx + ca * l - sa * s, y, cz + sa * l + ca * s];
  const hw = w / 2; const id = o.id || 0, m = o.m || 0;
  const A = P(l0, -hw, y0), B = P(l1, -hw, y0), C = P(l1, hw, y0), D = P(l0, hw, y0);
  const A2 = P(l0, -hw, y1), B2 = P(l1, -hw, y1), C2 = P(l1, hw, y1), D2 = P(l0, hw, y1);
  const cb = mulc(col, o.ao === undefined ? 0.85 : o.ao), s4 = [cb, cb, col, col];
  q(g, A2, D2, C2, B2, o.top || col, m, id, 0, [0, 1, 0]);
  q(g, A, B, B2, A2, s4, m, id, 0, [sa, 0, -ca]);
  q(g, C, D, D2, C2, s4, m, id, 0, [-sa, 0, ca]);
  q(g, B, C, C2, B2, s4, o.mf !== undefined ? o.mf : m, id, 0, [ca, 0, sa]);
  q(g, D, A, A2, D2, s4, o.mb !== undefined ? o.mb : m, id, 0, [-ca, 0, -sa]);
}
function cyl(g, cx, cz, y0, y1, r, seg, col, o) {
  o = o || {}; const id = o.id || 0, m = o.m || 0; const r1 = o.r1 === undefined ? r : o.r1;
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
    const p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
    const p2 = [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], p3 = [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1];
    q(g, p0, p1, p2, p3, [mulc(col, 0.85), mulc(col, 0.85), col, col], m, id, 0, [Math.cos(am), 0, Math.sin(am)]);
    if (!o.noTop) tri(g, [cx, y1, cz], p3, p2, o.top || col, m, id);
  }
}
function cone(g, cx, cz, y0, h, r, seg, col, id) {
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
    const p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], t = [cx, y0 + h, cz];
    const sl = r / Math.hypot(r, h), up = h / Math.hypot(r, h);
    const N = [Math.cos(am) * up, sl, Math.sin(am) * up];
    for (const [p, c] of [[p0, mulc(col, 0.75)], [p1, mulc(col, 0.75)], [t, mulc(col, 1.15)]]) g.v(p[0], p[1], p[2], N[0], N[1], N[2], c, 0, id || 0, 0);
  }
}
// icosphere templates
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const lv0 = { V: V.slice(), F: F.slice() };
  const cache = {}; const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache[k] !== undefined) return cache[k]; const m = V[a].map((x, i) => (x + V[b][i]) / 2); const l = Math.hypot(...m); V.push(m.map((x) => x / l)); return cache[k] = V.length - 1; };
  const F2 = []; for (const [a, b, c] of F) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
  return { 0: lv0, 1: { V, F: F2 } };
})();
function blob(g, cx, cy, cz, rx, ry, rz, col, r, lv, id) {
  const T = ICO[lv]; const js = T.V.map((v, i) => 1 + (hash2(cx * 0.37 + i * 1.7, cz * 0.41 + i) - 0.5) * 0.28);
  const P = T.V.map((v, i) => [cx + v[0] * rx * js[i], cy + v[1] * ry * js[i], cz + v[2] * rz * js[i]]);
  const C = T.V.map((v, i) => mulc(col, (0.72 + 0.38 * (v[1] * 0.5 + 0.5)) * (0.92 + 0.16 * hash2(i, cx))));
  for (const f of T.F) for (const k of f) { const v = T.V[k]; g.v(P[k][0], P[k][1], P[k][2], v[0], v[1] * 0.8 + 0.2, v[2], C[k], 0, id || 0, 0); }
}
// roof with tile rows: u = distance along slope
function gable(g, x0, z0, x1, z1, y, r, ov, axis, roofCol, wallCol, id, solar) {
  const m = 9;
  if (axis === 'x') {
    const zm = (z0 + z1) / 2, hd = (z1 - z0) / 2, ye = y - r * ov / hd;
    const L = Math.hypot(hd + ov, r + r * ov / hd);
    if (solar) { const A = [x1 + ov, ye, z1 + ov], B = [x0 - ov, ye, z1 + ov], Cc = [x0 - ov, y + r, zm], D = [x1 + ov, y + r, zm];
      const N = nrm(A, B, Cc); const lp = (u, v) => { const p0 = A.map((a, i) => a + (B[i] - a) * u), p1 = D.map((d, i) => d + (Cc[i] - d) * u); return p0.map((a, i) => a + (p1[i] - a) * v + N[i] * 0.07); };
      const cols = 3, rows = 2; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const u0 = 0.18 + i * 0.22, v0 = 0.12 + j * 0.3; q(g, lp(u0, v0), lp(u0 + 0.2, v0), lp(u0 + 0.2, v0 + 0.27), lp(u0, v0 + 0.27), [0.12, 0.16, 0.26], 1, id, 9000.5 + i, N); } }
    q(g, [x0 - ov, ye, z0 - ov], [x1 + ov, ye, z0 - ov], [x1 + ov, y + r, zm], [x0 - ov, y + r, zm], mulc(roofCol, 0.93), m, id, [0, 0, L, L]);
    q(g, [x1 + ov, ye, z1 + ov], [x0 - ov, ye, z1 + ov], [x0 - ov, y + r, zm], [x1 + ov, y + r, zm], roofCol, m, id, [0, 0, L, L]);
    tri(g, [x0, y, z1], [x0, y, z0], [x0, y + r, zm], wallCol, 0, id); tri(g, [x1, y, z0], [x1, y, z1], [x1, y + r, zm], wallCol, 0, id);
  } else {
    const xm = (x0 + x1) / 2, hd = (x1 - x0) / 2, ye = y - r * ov / hd;
    const L = Math.hypot(hd + ov, r + r * ov / hd);
    q(g, [x0 - ov, ye, z1 + ov], [x0 - ov, ye, z0 - ov], [xm, y + r, z0 - ov], [xm, y + r, z1 + ov], mulc(roofCol, 0.93), m, id, [0, 0, L, L]);
    q(g, [x1 + ov, ye, z0 - ov], [x1 + ov, ye, z1 + ov], [xm, y + r, z1 + ov], [xm, y + r, z0 - ov], roofCol, m, id, [0, 0, L, L]);
    tri(g, [x0, y, z0], [x1, y, z0], [xm, y + r, z0], wallCol, 0, id); tri(g, [x1, y, z1], [x0, y, z1], [xm, y + r, z1], wallCol, 0, id);
  }
}
function hip(g, x0, z0, x1, z1, y, r, ov, roofCol, id) {
  const m = 9; x0 -= ov; z0 -= ov; x1 += ov; z1 += ov; const ye = y - r * 0.25;
  const w = x1 - x0, d = z1 - z0;
  let A, B;
  if (w >= d) { const i = d / 2; A = [x0 + i, y + r, (z0 + z1) / 2]; B = [x1 - i, y + r, (z0 + z1) / 2]; }
  else { const i = w / 2; A = [(x0 + x1) / 2, y + r, z0 + i]; B = [(x0 + x1) / 2, y + r, z1 - i]; }
  const c0 = [x0, ye, z0], c1 = [x1, ye, z0], c2 = [x1, ye, z1], c3 = [x0, ye, z1];
  const L = Math.min(w, d) / 2 + r;
  if (w >= d) {
    q(g, c0, c1, B, A, mulc(roofCol, 0.93), m, id, [0, 0, L, L]); q(g, c2, c3, A, B, roofCol, m, id, [0, 0, L, L]);
    for (const [a, b, c] of [[c3, c0, A], [c1, c2, B]]) { const N = nrm(a, b, c); g.v(a[0], a[1], a[2], N[0], N[1], N[2], mulc(roofCol, 0.96), m, id, 0); g.v(b[0], b[1], b[2], N[0], N[1], N[2], mulc(roofCol, 0.96), m, id, 0); g.v(c[0], c[1], c[2], N[0], N[1], N[2], mulc(roofCol, 0.96), m, id, L); }
  } else {
    q(g, c1, c2, B, A, mulc(roofCol, 0.93), m, id, [0, 0, L, L]); q(g, c3, c0, A, B, roofCol, m, id, [0, 0, L, L]);
    for (const [a, b, c] of [[c0, c1, A], [c2, c3, B]]) { const N = nrm(a, b, c); g.v(a[0], a[1], a[2], N[0], N[1], N[2], mulc(roofCol, 0.96), m, id, 0); g.v(b[0], b[1], b[2], N[0], N[1], N[2], mulc(roofCol, 0.96), m, id, 0); g.v(c[0], c[1], c[2], N[0], N[1], N[2], mulc(roofCol, 0.96), m, id, L); }
  }
}
// face frames: returns point fn along facade
function faces(x0, z0, x1, z1) {
  return [
    { o: [x0, z1], a: [1, 0], n: [0, 1], L: x1 - x0, k: 'S' },
    { o: [x1, z0], a: [-1, 0], n: [0, -1], L: x1 - x0, k: 'N' },
    { o: [x1, z1], a: [0, -1], n: [1, 0], L: z1 - z0, k: 'E' },
    { o: [x0, z0], a: [0, 1], n: [-1, 0], L: z1 - z0, k: 'W' }
  ];
}
const fp = (f, s, y, off) => [f.o[0] + f.a[0] * s + f.n[0] * off, y, f.o[1] + f.a[1] * s + f.n[1] * off];
function fquad(g, f, s0, s1, y0, y1, off, col, m, id, u) { q(g, fp(f, s0, y0, off), fp(f, s1, y0, off), fp(f, s1, y1, off), fp(f, s0, y1, off), col, m, id, u, [f.n[0], 0, f.n[1]]); }
let WSEED = 1;
let FRAME = [0.93, 0.92, 0.88];
function windows(g, f, y0, floors, fh, spacing, ww, wh, sill, glass, id, margin, frame) {
  const mg = margin === undefined ? 1.2 : margin; const n = Math.floor((f.L - mg * 2) / spacing); if (n < 1) return;
  const st = (f.L - n * spacing) / 2 + spacing / 2; const fc = frame || FRAME; const fw = 0.14;
  for (let fl = 0; fl < floors; fl++) { const yb = y0 + fl * fh + sill; for (let i = 0; i < n; i++) { const s = st + i * spacing;
    fquad(g, f, s - ww / 2 - fw, s + ww / 2 + fw, yb - fw - 0.08, yb + wh + fw, 0.035, fc, 0, id);
    fquad(g, f, s - ww / 2, s + ww / 2, yb, yb + wh, 0.07, glass, 1, id, (WSEED++) % 9973 + 0.5); } }
}

// ---------- palettes ----------
const PAL = {
  wallHouse: ['#efe8da', '#f3f0e8', '#e6dccb', '#dcd6cc', '#e9e1d2', '#d8dde0', '#e4e0d0', '#cfc6b5', '#f0e6d0', '#c9cfc9'].map(HX),
  roofHouse: ['#4a5560', '#3b4450', '#5a4a40', '#8c4a32', '#2f3a3f', '#6b5b4b', '#55606a', '#7a3c2c', '#3f4e46'].map(HX),
  apt: ['#e9e3d6', '#d7c3a5', '#b9c3c6', '#c9906f', '#e2d1b3', '#a97d63', '#d9d4c8', '#c4b49a', '#9fb0b3', '#e8dcc4'].map(HX),
  office: ['#c7b9a5', '#8c5a48', '#6f7b84', '#d5d1c6', '#a35f4a', '#5b6670', '#b49a7a', '#8f969b', '#c4a98a', '#4f5a63'].map(HX),
  glass: ['#1d3346', '#22404f', '#263848', '#22423f', '#2a3550', '#1f3a4a'].map(HX),
  shop: ['#e8d8c0', '#d9b48a', '#e3e0d6', '#b98a6a', '#efe3cf', '#c9a58a', '#a8b9a5', '#d8c9b0'].map(HX),
  roofFlat: ['#6c6d6b', '#5e6466', '#7a6f64', '#6a7068', '#827c72'].map(HX),
  awning: ['#c8553d', '#2f7f74', '#d9a33a', '#3f6aa0', '#8a4f7d', '#4f8a3c', '#b23a3a'].map(HX),
  sign: ['#e94f37', '#f2c14e', '#2fa4a8', '#5b8def', '#e86aa6', '#7bc96f', '#ff8c42'].map(HX),
  leafG: ['#4f8a3c', '#5e9a45', '#3f7a3a', '#6b9e4a', '#4a7f45', '#588f3f'].map(HX),
  leafA: ['#d9b23a', '#e3c24a', '#d07a2c', '#c2502f', '#b8452e', '#dd9a35'].map(HX),
  car: ['#f2f2f2', '#e8e8e8', '#1f1f22', '#9aa3ab', '#c0392b', '#2e5c8a', '#d8d2c0', '#5a6b4f', '#e6b33a', '#3d3d42', '#ffffff', '#7f8c8d'].map(HX),
  cont: ['#b03a2e', '#2e6f9e', '#3e8e5a', '#d9822b', '#7a7f85', '#c9a23a', '#5a3e7a', '#1f5c66'].map(HX)
};
const C = {
  asphalt: HX('#4a4e54'), asphalt2: HX('#55595f'), walk: HX('#b9b5ab'), curb: HX('#a19d94'), line: HX('#ece8dc'), yline: HX('#e0b84a'),
  grass: HX('#5c7d42'), lawn: HX('#66854a'), dirt: HX('#a89474'), sand: HX('#e3d3a8'), paving: HX('#cfc6b4'), paving2: HX('#bdb3a0'),
  concrete: HX('#a8a8a2'), concrete2: HX('#8f8f8a'), trunk: HX('#5c4532'), conifer: HX('#3f6e47'), water: HX('#3a7fa0'), wood: HX('#7a5a3e'),
  white: HX('#f4f4f0'), red: HX('#c0392b'), dark: HX('#2b2f33'), door: HX('#5b4636'), rail: HX('#d8dcdc'), lamp: HX('#e8e2c8'), pole: HX('#5d6166')
};

// ---------- the city ----------
function generateCity() {
  const r = mulberry(20261110);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const G = new Geo(1 << 20);     // static world
  const GL = new Geo(4096);       // glow pools
  const B = [];                   // buildings
  const lots = [];                // empty lots for zoning
  let NID = 1;
  const newB = (o) => { o.id = NID++; B.push(o); return o; };
  const trees = [];

  // --- terrain mesh ---
  const T0x = -1300, T1x = 1300, T0z = -1300, T1z = 900, cs = 10;
  const nx = (T1x - T0x) / cs, nz = (T1z - T0z) / cs;
  const Hc = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) Hc[j * (nx + 1) + i] = terrainH(T0x + i * cs, T0z + j * cs);
  const hAt = (i, j) => Hc[j * (nx + 1) + i];
  const gcol = (x, z, h, slope) => {
    const n = fbm(x * 0.006, z * 0.006, 3), n2 = vnoise(x * 0.05, z * 0.05);
    let c = mixc(HX('#4b6b35'), HX('#6d8745'), n); c = mixc(c, HX('#8c8c58'), smooth(0.5, 0.85, n2) * 0.4);
    if (Math.abs(x) < 262 && z > -262 && z < 200) c = mixc(HX('#5a7b40'), HX('#6c8749'), n2);
    if (h > 18) c = mixc(c, HX('#5d7f45'), smooth(18, 50, h));
    c = mixc(c, mixc(HX('#b08a4a'), HX('#a5683a'), n2), smooth(0.45, 0.75, fbm(x * 0.004 + 9, z * 0.004, 3)) * smooth(8, 30, h) * 0.55);
    if (slope > 0.55) c = mixc(c, HX('#8a8274'), smooth(0.55, 0.9, slope));
    const sz = shoreZ(x);
    if (z > sz - 34 && !(x > HARBOR_X0 && x < 285)) c = mixc(c, C.sand, smooth(sz - 34, sz - 18, z));
    if (h < -0.2) c = mixc(C.sand, HX('#8f8a70'), smooth(-0.2, -6, h));
    return c;
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x0 = T0x + i * cs, z0 = T0z + j * cs, x1 = x0 + cs, z1 = z0 + cs;
    const h00 = hAt(i, j), h10 = hAt(i + 1, j), h11 = hAt(i + 1, j + 1), h01 = hAt(i, j + 1);
    const P = [[x0, h00, z0], [x0, h01, z1], [x1, h11, z1], [x1, h10, z0]];
    const N = nrm(P[0], P[1], P[2]); const sl = 1 - N[1];
    const cols = P.map((p) => gcol(p[0], p[2], p[1], sl * 6));
    q(G, P[0], P[1], P[2], P[3], cols, 0, 0, 0, N);
  }
  // water mesh
  const GW = new Geo(1 << 15);
  const wcs = 20;
  for (let z = 140; z < 1600; z += wcs) for (let x = -1300; x < 1300; x += wcs) {
    const hs = [[x, z], [x, z + wcs], [x + wcs, z + wcs], [x + wcs, z]].map(([a, b]) => terrainH(a, b));
    if (Math.min(...hs) > 0.4) continue;
    const P = [[x, -0.4, z], [x, -0.4, z + wcs], [x + wcs, -0.4, z + wcs], [x + wcs, -0.4, z]];
    q(GW, P[0], P[1], P[2], P[3], C.water, 2, 0, hs.map((h) => Math.max(0, Math.min(1, -h / 8))), [0, 1, 0]);
  }

  // --- roads ---
  const XS = [-240, -160, -80, 0, 80, 160, 240], ZS = [-240, -160, -80, 0, 80, 160];
  const wX = (x) => x === 0 ? 18 : 11, wZ = (z) => z === 0 ? 18 : (z === 160 ? 13 : 11);
  const RY = 0.04;
  const roadSegs = []; // for traffic: {a:[x,z], b:[x,z], w}
  const asph = (x0, z0, x1, z1) => q(G, [x0, RY, z0], [x0, RY, z1], [x1, RY, z1], [x1, RY, z0], C.asphalt, 0, 0, 0, [0, 1, 0]);
  const mark = (x0, z0, x1, z1, col) => q(G, [x0, RY + 0.02, z0], [x0, RY + 0.02, z1], [x1, RY + 0.02, z1], [x1, RY + 0.02, z0], col || C.line, 0, 0, 0, [0, 1, 0]);
  for (const x of XS) {
    const w = wX(x); asph(x - w / 2, -240 - wZ(-240) / 2, x + w / 2, 160 + wZ(160) / 2);
    for (let k = 0; k < ZS.length - 1; k++) {
      const za = ZS[k] + wZ(ZS[k]) / 2, zb = ZS[k + 1] - wZ(ZS[k + 1]) / 2;
      roadSegs.push({ a: [x, ZS[k]], b: [x, ZS[k + 1]], w });
      if (x === 0) { mark(x - 0.35, za + 3, x - 0.15, zb - 3, C.yline); mark(x + 0.15, za + 3, x + 0.35, zb - 3, C.yline);
        for (let z = za + 4; z < zb - 4; z += 9) { mark(x - 4.6, z, x - 4.4, z + 4.5); mark(x + 4.4, z, x + 4.6, z + 4.5); } }
      else for (let z = za + 4; z < zb - 4; z += 8) mark(x - 0.12, z, x + 0.12, z + 4);
      // crosswalks
      for (const [zz, dir] of [[za, 1], [zb, -1]]) for (let s = -w / 2 + 0.8; s < w / 2 - 0.6; s += 1.1) mark(x + s, zz + dir * 0.8, x + s + 0.55, zz + dir * 3.6);
      for (const [zz, dir] of [[za, 1], [zb, -1]]) mark(x - w / 2 + 0.3, zz + dir * 4.2, x + w / 2 - 0.3, zz + dir * 4.5);
    }
  }
  for (const z of ZS) {
    const w = wZ(z);
    for (let k = 0; k < XS.length - 1; k++) {
      const xa = XS[k] + wX(XS[k]) / 2, xb = XS[k + 1] - wX(XS[k + 1]) / 2;
      asph(xa, z - w / 2, xb, z + w / 2);
      roadSegs.push({ a: [XS[k], z], b: [XS[k + 1], z], w });
      if (z === 0) { mark(xa + 3, z - 0.35, xb - 3, z - 0.15, C.yline); mark(xa + 3, z + 0.15, xb - 3, z + 0.35, C.yline);
        for (let x = xa + 4; x < xb - 4; x += 9) { mark(x, z - 4.6, x + 4.5, z - 4.4); mark(x, z + 4.4, x + 4.5, z + 4.6); } }
      else for (let x = xa + 4; x < xb - 4; x += 8) mark(x, z - 0.12, x + 4, z + 0.12);
      for (const [xx, dir] of [[xa, 1], [xb, -1]]) for (let s = -w / 2 + 0.8; s < w / 2 - 0.6; s += 1.1) mark(xx + dir * 0.8, z + s, xx + dir * 3.6, z + s + 0.55);
    }
  }
  // outbound roads following terrain
  const terrainRoad = (pts, w) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz * w / 2, pz = ux * w / 2;
      const ha = Math.max(0, terrainH(ax, az)) + 0.25, hb = Math.max(0, terrainH(bx, bz)) + 0.25;
      q(G, [ax + px, ha, az + pz], [ax - px, ha, az - pz], [bx - px, hb, bz - pz], [bx + px, hb, bz + pz], C.asphalt2, 0, 0, 0, [0, 1, 0]);
      if (k % 2 === 0) { const mx = ax + dx * 0.25, mz = az + dz * 0.25, ex = ax + dx * 0.6, ez = az + dz * 0.6, hm = (ha * 0.75 + hb * 0.25) + 0.02, he = (ha * 0.4 + hb * 0.6) + 0.02;
        q(G, [mx - uz * 0.12, hm, mz + ux * 0.12], [mx + uz * 0.12, hm, mz - ux * 0.12], [ex + uz * 0.12, he, ez - ux * 0.12], [ex - uz * 0.12, he, ez + ux * 0.12], C.line, 0, 0, 0, [0, 1, 0]); }
    }
  };
  const outN = []; for (let z = -249; z >= -1250; z -= 10) outN.push([0 + 40 * Math.sin((z + 249) * 0.004), z]);
  const outE = []; for (let x = 249; x <= 1250; x += 10) outE.push([x, 0 + 30 * Math.sin((x - 249) * 0.005)]);
  const outW = []; for (let x = -249; x >= -1250; x -= 10) outW.push([x, -60 * Math.sin((x + 249) * 0.003)]);
  terrainRoad([[0, -249], ...outN], 11); terrainRoad([[249, 0], ...outE], 11); terrainRoad([[-249, 0], ...outW], 11);

  // --- blocks ---
  const blocks = [];
  for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < ZS.length - 1; j++) {
    const x0 = XS[i] + wX(XS[i]) / 2, x1 = XS[i + 1] - wX(XS[i + 1]) / 2, z0 = ZS[j] + wZ(ZS[j]) / 2, z1 = ZS[j + 1] - wZ(ZS[j + 1]) / 2;
    blocks.push({ i, j, x0, x1, z0, z1 });
  }
  const BH = 0.18; // curb height
  const slab = (b, inner) => {
    box(G, b.x0, 0, b.z0, b.x1, BH, b.z1, C.walk, { ao: 0.75, top: C.walk });
    // curb lip
    for (const [a0, c0, a1, c1] of [[b.x0, b.z0, b.x1, b.z0 + 0.3], [b.x0, b.z1 - 0.3, b.x1, b.z1], [b.x0, b.z0, b.x0 + 0.3, b.z1], [b.x1 - 0.3, b.z0, b.x1, b.z1]]) q(G, [a0, BH + 0.005, c0], [a0, BH + 0.005, c1], [a1, BH + 0.005, c1], [a1, BH + 0.005, c0], C.curb, 0, 0, 0, [0, 1, 0]);
    if (inner) q(G, [b.x0 + 3, BH + 0.01, b.z0 + 3], [b.x0 + 3, BH + 0.01, b.z1 - 3], [b.x1 - 3, BH + 0.01, b.z1 - 3], [b.x1 - 3, BH + 0.01, b.z0 + 3], inner, 0, 0, 0, [0, 1, 0]);
  };
  const Y = BH + 0.01;
  const ground = (x0, z0, x1, z1, col, y) => q(G, [x0, (y || Y) + 0.005, z0], [x0, (y || Y) + 0.005, z1], [x1, (y || Y) + 0.005, z1], [x1, (y || Y) + 0.005, z0], col, 0, 0, 0, [0, 1, 0]);

  const tree = (x, z, s, kind, y0) => trees.push({ x, z, s, kind: kind || 'mix', y: y0 === undefined ? Y : y0 });

  // ---- building makers ----
  function house(x0, z0, x1, z1, front, extra) {
    const w = x1 - x0, d = z1 - z0;
    const floors = r() < 0.75 ? 2 : 1; const fh = 2.9; const h = floors * fh + 0.4;
    const wall = jit(pick(PAL.wallHouse), 0.08, r), roof = jit(pick(PAL.roofHouse), 0.15, r);
    const b = newB({ kind: 'house', name: '住宅', x0, z0, x1, z1, h: h + 3, residents: floors * 2 + Math.floor(r() * 3), ...extra });
    box(G, x0, Y, z0, x1, Y + h, z1, wall, { id: b.id, noTop: true, ao: 0.78 });
    // foundation band
    box(G, x0 - 0.05, Y, z0 - 0.05, x1 + 0.05, Y + 0.45, z1 + 0.05, HX('#9b958a'), { id: b.id, ao: 0.9 });
    const rr = 1.6 + r() * 1.4;
    if (r() < 0.55) gable(G, x0, z0, x1, z1, Y + h, rr, 0.55, w > d ? 'x' : 'z', roof, wall, b.id, w > d && r() < 0.35);
    else hip(G, x0, z0, x1, z1, Y + h, rr, 0.55, roof, b.id);
    const glass = pick(PAL.glass); FRAME = mixc(wall, [1, 1, 1], 0.55);
    for (const f of faces(x0, z0, x1, z1)) {
      windows(G, f, Y + 0.45, floors, fh, 2.6, 1.1, 1.25, 0.85, glass, b.id, 1.2);
      if (f.k === front) {
        fquad(G, f, f.L * 0.5 - 0.5, f.L * 0.5 + 0.5, Y + 0.45, Y + 2.5, 0.07, C.door, 0, b.id);
        // small canopy over door
        const p0 = fp(f, f.L * 0.5 - 0.9, Y + 2.7, 0), p1 = fp(f, f.L * 0.5 + 0.9, Y + 2.7, 0.9);
        box(G, Math.min(p0[0], p1[0]), Y + 2.65, Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), Y + 2.8, Math.max(p0[2], p1[2]), mulc(wall, 0.9), { id: b.id });
        if (floors === 2 && r() < 0.6) { // balcony
          const s0 = 0.6, s1 = Math.min(f.L - 0.6, f.L * 0.55); const q0 = fp(f, s0, 0, 0), q1 = fp(f, s1, 0, 1.0);
          const bx0 = Math.min(q0[0], q1[0]), bx1 = Math.max(q0[0], q1[0]), bz0 = Math.min(q0[2], q1[2]), bz1 = Math.max(q0[2], q1[2]);
          box(G, bx0, Y + fh + 0.3, bz0, bx1, Y + fh + 0.45, bz1, HX('#d9d6cf'), { id: b.id });
          const e0 = fp(f, s0, 0, 1.0), e1 = fp(f, s1, 0, 1.0);
          box(G, Math.min(e0[0], e1[0]) - 0.03, Y + fh + 0.45, Math.min(e0[2], e1[2]) - 0.03, Math.max(e0[0], e1[0]) + 0.03, Y + fh + 1.4, Math.max(e0[2], e1[2]) + 0.03, HX('#c8ccce'), { id: b.id, ao: 0.95 });
        }
      }
    }
    // AC unit
    if (r() < 0.6) { const f = faces(x0, z0, x1, z1)[Math.floor(r() * 4)]; const p = fp(f, 0.8 + r() * (f.L - 1.6), 0, 0.35); box(G, p[0] - 0.4, Y + 0.45, p[2] - 0.35, p[0] + 0.4, Y + 1.05, p[2] + 0.35, HX('#e4e4e0'), { id: b.id }); }
    return b;
  }
  function parkedCar(x, z, a) { const col = pick(PAL.car); rbox(G, x, z, a, -2.1, 2.1, 1.75, Y + 0.25, Y + 1.0, col, { ao: 0.6 }); rbox(G, x, z, a, -1.2, 0.9, 1.55, Y + 1.0, Y + 1.5, HX('#2a3540'), { m: 1 }); }
  function residentialBlock(b, opt) {
    slab(b, mixc(C.lawn, C.grass, r()));
    const depth = 21, inset = 2.6;
    const rows = [];
    // north & south rows across full width
    const nLots = Math.max(3, Math.round((b.x1 - b.x0 - 2 * inset) / (12 + r() * 3)));
    const lw = (b.x1 - b.x0 - 2 * inset) / nLots;
    for (let k = 0; k < nLots; k++) {
      rows.push({ x0: b.x0 + inset + k * lw, x1: b.x0 + inset + (k + 1) * lw, z0: b.z0 + inset, z1: b.z0 + inset + depth, front: 'N' });
      rows.push({ x0: b.x0 + inset + k * lw, x1: b.x0 + inset + (k + 1) * lw, z0: b.z1 - inset - depth, z1: b.z1 - inset, front: 'S' });
    }
    const zA = b.z0 + inset + depth, zB = b.z1 - inset - depth, nS = Math.max(1, Math.round((zB - zA) / 13)), lh = (zB - zA) / nS;
    for (let k = 0; k < nS; k++) {
      rows.push({ x0: b.x0 + inset, x1: b.x0 + inset + depth, z0: zA + k * lh, z1: zA + (k + 1) * lh, front: 'W' });
      rows.push({ x0: b.x1 - inset - depth, x1: b.x1 - inset, z0: zA + k * lh, z1: zA + (k + 1) * lh, front: 'E' });
    }
    for (const L of rows) {
      if (opt && opt.empty && opt.empty(L)) { lots.push({ ...L, cx: (L.x0 + L.x1) / 2, cz: (L.z0 + L.z1) / 2 }); ground(L.x0 + 0.3, L.z0 + 0.3, L.x1 - 0.3, L.z1 - 0.3, mixc(C.dirt, C.grass, 0.25)); continue; }
      ground(L.x0 + 0.3, L.z0 + 0.3, L.x1 - 0.3, L.z1 - 0.3, jit(C.lawn, 0.1, r));
      const lw2 = L.x1 - L.x0, ld = L.z1 - L.z0;
      // house footprint, set back from front
      let hx0, hx1, hz0, hz1; const sb = 4 + r() * 1.5;
      const hw = Math.min(lw2, ld) - 3.4 - r() * 1.5, hd = 8 + r() * 2.5;
      if (L.front === 'N' || L.front === 'S') {
        const W2 = Math.min(lw2 - 2.4, 8 + r() * 2.5), D2 = Math.min(ld - sb - 3, hd);
        hx0 = L.x0 + 1.2 + r() * (lw2 - 2.4 - W2); hx1 = hx0 + W2;
        if (L.front === 'N') { hz0 = L.z0 + sb; hz1 = hz0 + D2; } else { hz1 = L.z1 - sb; hz0 = hz1 - D2; }
      } else {
        const W2 = Math.min(ld - 2.4, 8 + r() * 2.5), D2 = Math.min(lw2 - sb - 3, hd);
        hz0 = L.z0 + 1.2 + r() * (ld - 2.4 - W2); hz1 = hz0 + W2;
        if (L.front === 'W') { hx0 = L.x0 + sb; hx1 = hx0 + D2; } else { hx1 = L.x1 - sb; hx0 = hx1 - D2; }
      }
      void hw;
      if (opt && opt.apt && r() < opt.apt) { apartment(L.x0 + 1.2, L.z0 + 1.2, L.x1 - 1.2, L.z1 - 1.2, L.front, 3 + Math.floor(r() * 3)); continue; }
      house(hx0, hz0, hx1, hz1, L.front);
      // driveway + car
      if (r() < 0.55) {
        if (L.front === 'N' || L.front === 'S') { const cx = hx1 + 1.6 < L.x1 - 0.3 ? hx1 + 1.6 : hx0 - 1.6; const cz = L.front === 'N' ? L.z0 + 2.6 : L.z1 - 2.6; ground(cx - 1.4, Math.min(cz - 2.5, cz + 2.5), cx + 1.4, cz + 2.5, C.paving2, Y + 0.01); parkedCar(cx, cz, Math.PI / 2); }
        else { const cz = hz1 + 1.6 < L.z1 - 0.3 ? hz1 + 1.6 : hz0 - 1.6; const cx = L.front === 'W' ? L.x0 + 2.6 : L.x1 - 2.6; ground(cx - 2.5, cz - 1.4, cx + 2.5, cz + 1.4, C.paving2, Y + 0.01); parkedCar(cx, cz, 0); }
      }
      // hedge or block wall at front edge
      const hedge = r() < 0.5; const hc = hedge ? HX('#4d7a3a') : HX('#b7b2a6'), hh = hedge ? 1.1 : 0.9;
      if (L.front === 'N') box(G, L.x0 + 0.3, Y, L.z0 + 0.2, L.x0 + lw2 * 0.45, Y + hh, L.z0 + 0.6, hc);
      if (L.front === 'S') box(G, L.x0 + 0.3, Y, L.z1 - 0.6, L.x0 + lw2 * 0.45, Y + hh, L.z1 - 0.2, hc);
      if (L.front === 'W') box(G, L.x0 + 0.2, Y, L.z0 + 0.3, L.x0 + 0.6, Y + hh, L.z0 + ld * 0.45, hc);
      if (L.front === 'E') box(G, L.x1 - 0.6, Y, L.z0 + 0.3, L.x1 - 0.2, Y + hh, L.z0 + ld * 0.45, hc);
      // back yard tree
      if (r() < 0.65) {
        let tx, tz;
        if (L.front === 'N') { tx = L.x0 + 1.5 + r() * (lw2 - 3); tz = L.z1 - 2.2; } else if (L.front === 'S') { tx = L.x0 + 1.5 + r() * (lw2 - 3); tz = L.z0 + 2.2; }
        else if (L.front === 'W') { tx = L.x1 - 2.2; tz = L.z0 + 1.5 + r() * (ld - 3); } else { tx = L.x0 + 2.2; tz = L.z0 + 1.5 + r() * (ld - 3); }
        tree(tx, tz, 0.55 + r() * 0.35);
      }
    }
    // inner shared green
    const ix0 = b.x0 + inset + depth + 1, ix1 = b.x1 - inset - depth - 1, iz0 = b.z0 + inset + depth + 1, iz1 = b.z1 - inset - depth - 1;
    if (ix1 > ix0 + 4 && iz1 > iz0 + 4) { ground(ix0, iz0, ix1, iz1, HX('#6b9348')); for (let k = 0; k < 4; k++) tree(ix0 + 2 + r() * (ix1 - ix0 - 4), iz0 + 2 + r() * (iz1 - iz0 - 4), 0.8 + r() * 0.4); }
  }
  function apartment(x0, z0, x1, z1, front, floors) {
    const fh = 3.0, h = floors * fh + 0.6; const wall = jit(pick(PAL.apt), 0.06, r);
    const b = newB({ kind: 'apt', name: 'マンション', x0, z0, x1, z1, h: h + 1, residents: floors * Math.round((x1 - x0) * (z1 - z0) / 60) });
    box(G, x0, Y, z0, x1, Y + h, z1, wall, { id: b.id, top: pick(PAL.roofFlat), mt: 10, ao: 0.75 });
    // parapet
    for (const [a0, c0, a1, c1] of [[x0, z0, x1, z0 + 0.3], [x0, z1 - 0.3, x1, z1], [x0, z0, x0 + 0.3, z1], [x1 - 0.3, z0, x1, z1]]) box(G, a0, Y + h, c0, a1, Y + h + 0.8, c1, mulc(wall, 0.95), { id: b.id });
    // rooftop: elevator house, water tank, AC units
    box(G, x0 + 1.5, Y + h, z0 + 1.5, x0 + 5, Y + h + 3, z0 + 4.5, mulc(wall, 0.92), { id: b.id, top: HX('#8a8a86') });
    cyl(G, x1 - 3, z1 - 3, Y + h, Y + h + 2.4, 1.2, 10, HX('#cfd3d4'), { id: b.id });
    for (let k = 0; k < 3; k++) box(G, x0 + 7 + k * 2.2, Y + h, z1 - 2.6, x0 + 8.4 + k * 2.2, Y + h + 1, z1 - 1.4, HX('#dcdcd8'), { id: b.id });
    // stone base band
    const stone = mixc(wall, [0.45, 0.42, 0.38], 0.45);
    box(G, x0 - 0.12, Y, z0 - 0.12, x1 + 0.12, Y + fh + 0.2, z1 + 0.12, stone, { id: b.id, ao: 0.8, top: stone });
    const glass = pick(PAL.glass); FRAME = mixc(wall, [1, 1, 1], 0.5);
    for (const f of faces(x0, z0, x1, z1)) {
      const fb = { ...f, o: [f.o[0] + f.n[0] * 0.12, f.o[1] + f.n[1] * 0.12] };
      const isF = f.k === front || (front === 'N' && f.k === 'S') || (front === 'W' && f.k === 'E');
      if (!isF) windows(G, fb, Y + 0.3, 1, fh, 3.0, 1.2, 1.3, 0.9, glass, b.id, 1.2);
      if (isF) {
        // balconies continuous per floor
        for (let fl = 1; fl < floors; fl++) {
          const yb = Y + fl * fh + 0.3; const e0 = fp(f, 0.4, 0, 0), e1 = fp(f, f.L - 0.4, 0, 1.3);
          box(G, Math.min(e0[0], e1[0]), yb - 0.15, Math.min(e0[2], e1[2]), Math.max(e0[0], e1[0]), yb, Math.max(e0[2], e1[2]), HX('#d8d5ce'), { id: b.id });
          const g0 = fp(f, 0.4, 0, 1.25), g1 = fp(f, f.L - 0.4, 0, 1.35);
          box(G, Math.min(g0[0], g1[0]), yb, Math.min(g0[2], g1[2]), Math.max(g0[0], g1[0]), yb + 1.05, Math.max(g0[2], g1[2]), mulc(wall, 0.88), { id: b.id, ao: 0.95 });
        }
        windows(G, f, Y + fh + 0.3, floors - 1, fh, 3.4, 2.2, 2.0, 0.3, glass, b.id, 0.8);
        // entrance: glass doors and canopy
        fquad(G, f, f.L / 2 - 1.6, f.L / 2 + 1.6, Y + 0.2, Y + 2.6, 0.2, HX('#3b5466'), 1, b.id, (WSEED++) % 9973 + 0.5);
        const c0 = fp(f, f.L / 2 - 2.4, 0, 0.1), c1 = fp(f, f.L / 2 + 2.4, 0, 2.2);
        box(G, Math.min(c0[0], c1[0]), Y + 2.8, Math.min(c0[2], c1[2]), Math.max(c0[0], c1[0]), Y + 3.05, Math.max(c0[2], c1[2]), HX('#e8e6e0'), { id: b.id });
        windows(G, { ...fb, L: f.L / 2 - 2.2 }, Y + 0.3, 1, fh, 3.2, 1.8, 1.6, 0.6, glass, b.id, 0.6);
        windows(G, { ...fb, o: [fb.o[0] + f.a[0] * (f.L / 2 + 2.2), fb.o[1] + f.a[1] * (f.L / 2 + 2.2)], L: f.L / 2 - 2.2 }, Y + 0.3, 1, fh, 3.2, 1.8, 1.6, 0.6, glass, b.id, 0.6);
        // AC units on balconies
        for (let fl = 1; fl < floors; fl++) for (let s2 = 2.2; s2 < f.L - 1.5; s2 += 6.8) { if (r() < 0.4) continue; const p0 = fp(f, s2, 0, 0.3), p1 = fp(f, s2 + 0.8, 0, 0.9); box(G, Math.min(p0[0], p1[0]), Y + fl * fh + 0.32, Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), Y + fl * fh + 0.9, Math.max(p0[2], p1[2]), HX('#e2e2de'), { id: b.id }); }
      } else windows(G, f, Y + fh + 0.3, floors - 1, fh, 3.0, 1.2, 1.3, 0.9, glass, b.id, 1.2);
    }
    return b;
  }
  function office(x0, z0, x1, z1, floors, style, base) {
    if (style === 0 && floors > 9 && r() < 0.6) { // podium + set-back tower
      const pod = newB({ kind: 'office', name: 'オフィス', x0, z0, x1, z1, h: 9, residents: 0, jobs: 40 });
      const pw = jit(pick(PAL.office), 0.06, r);
      box(G, x0, Y, z0, x1, Y + 8.2, z1, pw, { id: pod.id, top: pick(PAL.roofFlat), mt: 10, ao: 0.7 });
      for (const f of faces(x0, z0, x1, z1)) { fquad(G, f, 0.6, f.L - 0.6, Y + 0.3, Y + 3.8, 0.06, HX('#3b5466'), 1, pod.id, (WSEED++) % 9973 + 0.5); windows(G, f, Y + 4.4, 1, 3.8, 2.6, 2.0, 2.4, 0.4, HX('#2a3a48'), pod.id, 0.8); }
      const sbk = 3 + r() * 2;
      return office(x0 + sbk, z0 + sbk, x1 - sbk, z1 - sbk, floors - 2, 1 + Math.floor(r() * 2), 8.2);
    }
    const fh = 3.6, h = floors * fh + 1; const Yb = Y + (base || 0); const wall = jit(pick(PAL.office), 0.07, r); const glass = jit(pick(PAL.glass), 0.15, r);
    const b = newB({ kind: 'office', name: 'オフィス', x0, z0, x1, z1, h: h + 3 + (base || 0), residents: 0, jobs: floors * 20 }); FRAME = mixc(wall, [0.15, 0.17, 0.2], 0.35);
    box(G, x0, Yb, z0, x1, Yb + h, z1, wall, { id: b.id, top: pick(PAL.roofFlat), mt: 10, ao: 0.7 });
    for (const f of faces(x0, z0, x1, z1)) {
      if (style === 0) { // ribbon windows split into panes
        for (let fl = 0; fl < floors; fl++) { const yb = Yb + 0.6 + fl * fh + 0.9; const n = Math.max(1, Math.floor(f.L / 3)); const sw = (f.L - 1) / n;
          for (let i = 0; i < n; i++) fquad(G, f, 0.5 + i * sw + 0.12, 0.5 + (i + 1) * sw - 0.12, yb, yb + 2.1, 0.06, glass, 1, b.id, (WSEED++) % 9973 + 0.5); }
        for (let fl = 1; fl < floors; fl++) { const yb = Yb + 0.6 + fl * fh; const e0 = fp(f, -0.2, 0, 0), e1 = fp(f, f.L + 0.2, 0, 0.35);
          box(G, Math.min(e0[0], e1[0]), yb - 0.15, Math.min(e0[2], e1[2]), Math.max(e0[0], e1[0]), yb + 0.2, Math.max(e0[2], e1[2]), mulc(wall, 1.08), { id: b.id, ao: 1 }); }
      } else if (style === 1) { // full glass with vertical fins
        fquad(G, f, 0.3, f.L - 0.3, Yb + 4, Yb + h - 0.6, 0.05, glass, 1, b.id, (WSEED++) % 9973 + 0.5);
        for (let fl = 1; fl < floors; fl++) fquad(G, f, 0.3, f.L - 0.3, Yb + 0.4 + fl * fh - 0.08, Yb + 0.4 + fl * fh + 0.08, 0.07, mulc(wall, 0.8), 0, b.id);
        for (let s = 1.5; s < f.L - 0.5; s += 3) { const e0 = fp(f, s - 0.12, 0, 0), e1 = fp(f, s + 0.12, 0, 0.6);
          box(G, Math.min(e0[0], e1[0]), Yb + 4, Math.min(e0[2], e1[2]), Math.max(e0[0], e1[0]), Yb + h - 0.4, Math.max(e0[2], e1[2]), mulc(wall, 1.05), { id: b.id, ao: 1 }); }
        fquad(G, f, 0.3, f.L - 0.3, Yb + 0.2, Yb + 3.6, 0.05, mulc(glass, 1.3), 1, b.id, (WSEED++) % 9973 + 0.5);
      } else { windows(G, f, Yb + 0.6, floors, fh, 2.4, 1.5, 2.0, 0.8, glass, b.id, 1.0); }
    }
    if (!base) { const st2 = mixc(wall, [0.35, 0.34, 0.33], 0.4); box(G, x0 - 0.15, Yb, z0 - 0.15, x1 + 0.15, Yb + 4.2, z1 + 0.15, st2, { id: b.id, ao: 0.8, top: st2 });
      for (const f of faces(x0, z0, x1, z1)) fquad(G, f, 0.8, f.L - 0.8, Yb + 0.3, Yb + 3.6, 0.2, HX('#34495a'), 1, b.id, (WSEED++) % 9973 + 0.5); }
    box(G, x0 - 0.2, Yb + h - 0.4, z0 - 0.2, x1 + 0.2, Yb + h + 0.5, z1 + 0.2, mulc(wall, 1.12), { id: b.id, ao: 1, top: mulc(wall, 1.05) });
    if (floors > 8 && r() < 0.45) { const f = faces(x0, z0, x1, z1)[r() < 0.5 ? 0 : 2]; const sg = pick(PAL.sign); const p0 = fp(f, f.L * 0.2, 0, 0.3), p1 = fp(f, f.L * 0.8, 0, 0.5);
      box(G, Math.min(p0[0], p1[0]), Yb + h + 0.5, Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), Yb + h + 3.2, Math.max(p0[2], p1[2]), sg, { id: b.id, m: 8, ao: 1 }); }
    // roof equipment
    const rx0 = x0 + 2, rz0 = z0 + 2, rx1 = x1 - 2, rz1 = z1 - 2;
    for (const [a0, c0, a1, c1] of [[x0, z0, x1, z0 + 0.3], [x0, z1 - 0.3, x1, z1], [x0, z0, x0 + 0.3, z1], [x1 - 0.3, z0, x1, z1]]) box(G, a0, Yb + h, c0, a1, Yb + h + 1, c1, mulc(wall, 0.9), { id: b.id });
    if (rx1 > rx0 + 6) {
      box(G, rx0, Yb + h, rz0, rx0 + Math.min(7, (rx1 - rx0) * 0.4), Yb + h + 3.2, rz0 + Math.min(6, (rz1 - rz0) * 0.4), HX('#c9c9c4'), { id: b.id });
      for (let k = 0; k < 3; k++) { const ax = rx0 + 2 + r() * (rx1 - rx0 - 4), az = rz0 + 2 + r() * (rz1 - rz0 - 4); box(G, ax - 0.8, Yb + h, az - 0.8, ax + 0.8, Yb + h + 1.2, az + 0.8, HX('#d9d9d4'), { id: b.id }); }
      if (floors > 9) cyl(G, rx1 - 2, rz1 - 2, Yb + h, Yb + h + 4, 1.4, 10, HX('#b9bcbf'), { id: b.id });
      if (floors > 12) { box(G, (x0 + x1) / 2 - 0.1, Yb + h, (z0 + z1) / 2 - 0.1, (x0 + x1) / 2 + 0.1, Yb + h + 9, (z0 + z1) / 2 + 0.1, HX('#d0d0d0'), { id: b.id }); box(G, (x0 + x1) / 2 - 0.18, Yb + h + 8.6, (z0 + z1) / 2 - 0.18, (x0 + x1) / 2 + 0.18, Yb + h + 9.1, (z0 + z1) / 2 + 0.18, HX('#ff4a3a'), { id: b.id, m: 8 }); }
    }
    return b;
  }
  function shop(x0, z0, x1, z1, front, floors, extra) {
    const fh = 3.2, h = 3.6 + (floors - 1) * fh + 0.5; const wall = jit(pick(PAL.shop), 0.08, r); const glass = pick(PAL.glass);
    const b = newB({ kind: 'shop', name: '商店', x0, z0, x1, z1, h: h + 2, residents: (floors - 1) * 2, jobs: 6, ...extra });
    box(G, x0, Y, z0, x1, Y + h, z1, wall, { id: b.id, top: pick(PAL.roofFlat), mt: 10, ao: 0.75 });
    for (const [a0, c0, a1, c1] of [[x0, z0, x1, z0 + 0.25], [x0, z1 - 0.25, x1, z1], [x0, z0, x0 + 0.25, z1], [x1 - 0.25, z0, x1, z1]]) box(G, a0, Y + h, c0, a1, Y + h + 0.6, c1, mulc(wall, 0.92), { id: b.id });
    const aw = pick(PAL.awning), sg = pick(PAL.sign);
    for (const f of faces(x0, z0, x1, z1)) {
      if (f.k === front) {
        fquad(G, f, 0.5, f.L - 0.5, Y + 0.3, Y + 3.0, 0.06, mulc(glass, 1.4), 1, b.id, (WSEED++) % 9973 + 0.5);
        // awning sloped
        const a0 = fp(f, 0.3, Y + 3.5, 0.05), a1 = fp(f, f.L - 0.3, Y + 3.5, 0.05), a2 = fp(f, f.L - 0.3, Y + 2.9, 1.8), a3 = fp(f, 0.3, Y + 2.9, 1.8);
        q(G, a0, a1, a2, a3, aw, 0, b.id);
        // sign band
        fquad(G, f, 0.4, f.L - 0.4, Y + 3.6, Y + 4.4, 0.08, sg, 8, b.id);
        if (floors > 1) windows(G, f, Y + 3.6, floors - 1, fh, 2.6, 1.3, 1.5, 1.0, glass, b.id, 1.0);
        // vertical sign
        if (floors > 2 && r() < 0.7) { const p = fp(f, 0.6, 0, 0.1), p2 = fp(f, 0.6, 0, 1.4); const vs = pick(PAL.sign);
          box(G, Math.min(p[0], p2[0]) - (f.n[0] ? 0 : 0.12), Y + 4.8, Math.min(p[2], p2[2]) - (f.n[1] ? 0 : 0.12), Math.max(p[0], p2[0]) + (f.n[0] ? 0 : 0.12), Y + 4.8 + (floors - 1) * fh * 0.8, Math.max(p[2], p2[2]) + (f.n[1] ? 0 : 0.12), vs, { id: b.id, m: 8, ao: 1 }); }
      } else if (floors > 1) windows(G, f, Y + 3.6, floors - 1, fh, 2.8, 1.2, 1.4, 1.0, glass, b.id, 1.2);
    }
    if (r() < 0.6) box(G, x0 + 1, Y + h, z0 + 1, x0 + 2.4, Y + h + 1.1, z0 + 2.2, HX('#d8d8d4'), { id: b.id });
    return b;
  }

  // ---- landmarks ----
  const FEAT = {};
  function townHall(b) {
    slab(b, null);
    ground(b.x0 + 2.5, b.z0 + 2.5, b.x1 - 2.5, b.z1 - 2.5, C.paving);
    // paving pattern
    for (let x = b.x0 + 4; x < b.x1 - 4; x += 6) for (let z = b.z0 + 26; z < b.z1 - 4; z += 6) if (((x + z) / 6 | 0) % 2 === 0) ground(x, z, x + 6, z + 6, C.paving2, Y + 0.012);
    const hx0 = b.x0 + 6, hx1 = b.x1 - 16, hz0 = b.z0 + 4, hz1 = b.z0 + 22;
    const stone = HX('#e3ded2');
    const hb = newB({ kind: 'hall', name: '町役場', x0: hx0, z0: hz0, x1: hx1, z1: hz1, h: 36, residents: 0, jobs: 80 });
    box(G, hx0, Y, hz0, hx1, Y + 14, hz1, stone, { id: hb.id, top: HX('#9e9a90'), ao: 0.72 });
    box(G, hx0 - 0.4, Y + 13.6, hz0 - 0.4, hx1 + 0.4, Y + 14.6, hz1 + 0.4, HX('#cfc8b8'), { id: hb.id });
    const glass = HX('#2e4252');
    for (const f of faces(hx0, hz0, hx1, hz1)) windows(G, f, Y, 3, 4.4, 3.2, 1.6, 2.6, 1.0, glass, hb.id, 2);
    // entrance portico with columns on south
    const cx = (hx0 + hx1) / 2;
    box(G, cx - 9, Y, hz1, cx + 9, Y + 0.6, hz1 + 5, HX('#d8d2c4'), { id: hb.id });
    for (let k = 0; k < 6; k++) cyl(G, cx - 7.5 + k * 3, hz1 + 4, Y + 0.6, Y + 9, 0.45, 10, HX('#f1ede4'), { id: hb.id });
    box(G, cx - 9, Y + 9, hz1 - 0.2, cx + 9, Y + 10.4, hz1 + 5, HX('#e8e2d6'), { id: hb.id });
    tri(G, [cx - 9, Y + 10.4, hz1 + 5], [cx + 9, Y + 10.4, hz1 + 5], [cx, Y + 13.4, hz1 + 5], HX('#ebe5d9'), 0, hb.id);
    q(G, [cx - 9, Y + 10.4, hz1 - 0.2], [cx - 9, Y + 10.4, hz1 + 5], [cx, Y + 13.4, hz1 + 5], [cx, Y + 13.4, hz1 - 0.2], HX('#7b8a92'), 0, hb.id);
    q(G, [cx + 9, Y + 10.4, hz1 + 5], [cx + 9, Y + 10.4, hz1 - 0.2], [cx, Y + 13.4, hz1 - 0.2], [cx, Y + 13.4, hz1 + 5], HX('#7b8a92'), 0, hb.id);
    // clock tower
    const tx0 = cx - 4, tx1 = cx + 4, tz0 = hz0 + 5, tz1 = hz0 + 13;
    box(G, tx0, Y + 14, tz0, tx1, Y + 30, tz1, stone, { id: hb.id, ao: 0.85 });
    box(G, tx0 - 0.4, Y + 29.6, tz0 - 0.4, tx1 + 0.4, Y + 30.6, tz1 + 0.4, HX('#cfc8b8'), { id: hb.id });
    for (const f of faces(tx0, tz0, tx1, tz1)) {
      const ccx = f.L / 2; const N = 16; const pc = fp(f, ccx, Y + 25.5, 0.08);
      for (let k = 0; k < N; k++) { const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2; const P = (a) => [pc[0] + f.a[0] * Math.cos(a) * 2.6, pc[1] + Math.sin(a) * 2.6, pc[2] + f.a[1] * Math.cos(a) * 2.6];
        tri(G, pc, P(a0), P(a1), HX('#f7f3e6'), 7, hb.id); }
      const ph = fp(f, ccx, Y + 25.5, 0.12), ph2 = fp(f, ccx + 0.12, Y + 27.4, 0.12), ph3 = fp(f, ccx - 0.12, Y + 27.4, 0.12);
      tri(G, ph, ph2, ph3, C.dark, 0, hb.id);
      windows(G, f, Y + 16, 2, 4, 3, 1.2, 2.4, 0.6, glass, hb.id, 1.5);
    }
    // pyramid roof
    const ap = [cx, Y + 37, (tz0 + tz1) / 2]; const rc = HX('#3f6b62');
    for (const [a, b2] of [[[tx0 - 0.6, Y + 30.6, tz0 - 0.6], [tx1 + 0.6, Y + 30.6, tz0 - 0.6]], [[tx1 + 0.6, Y + 30.6, tz0 - 0.6], [tx1 + 0.6, Y + 30.6, tz1 + 0.6]], [[tx1 + 0.6, Y + 30.6, tz1 + 0.6], [tx0 - 0.6, Y + 30.6, tz1 + 0.6]], [[tx0 - 0.6, Y + 30.6, tz1 + 0.6], [tx0 - 0.6, Y + 30.6, tz0 - 0.6]]]) tri(G, a, b2, ap, rc, 0, hb.id);
    box(G, cx - 0.06, Y + 37, (tz0 + tz1) / 2 - 0.06, cx + 0.06, Y + 41, (tz0 + tz1) / 2 + 0.06, HX('#cccccc'), { id: hb.id });
    // flag poles in front
    for (const fx of [cx - 14, cx + 14]) { box(G, fx - 0.08, Y, hz1 + 9 - 0.08, fx + 0.08, Y + 11, hz1 + 9 + 0.08, HX('#dedede')); FEAT.flags = FEAT.flags || []; FEAT.flags.push([fx, Y + 11, hz1 + 9]); }
    FEAT.hall = hb;
    // annex lot (reserved for 記録庫)
    const ax0 = hx1 + 2.5, ax1 = b.x1 - 3, az0 = hz0 + 1, az1 = hz0 + 13;
    const an = newB({ kind: 'vault', name: '記録庫', x0: ax0, z0: az0, x1: ax1, z1: az1, h: 10, residents: 0, hidden: true });
    FEAT.annex = an;
    const ag = HX('#e6e1f2');
    box(G, ax0, Y, az0, ax1, Y + 8, az1, ag, { id: an.id, top: HX('#6d55b8'), ao: 0.7 });
    for (const f of faces(ax0, az0, ax1, az1)) fquad(G, f, 0.6, f.L - 0.6, Y + 5.6, Y + 7.2, 0.06, HX('#4a3a7a'), 1, an.id, 77.5);
    fquad(G, faces(ax0, az0, ax1, az1)[0], 1, 4, Y, Y + 3, 0.07, HX('#3a2f5c'), 0, an.id);
    fquad(G, faces(ax0, az0, ax1, az1)[0], 0.4, 9.4, Y + 4.0, Y + 4.8, 0.08, HX('#b48cff'), 7, an.id);
    // plaza: fountain, trees, benches, bulletin board
    const fx = cx, fz = (hz1 + b.z1) / 2 + 4;
    cyl(G, fx, fz, Y, Y + 0.7, 7, 24, HX('#cfc8b8'));
    cyl(G, fx, fz, Y + 0.5, Y + 0.72, 6.3, 24, HX('#4a90b0'), { m: 2, noTop: false, top: HX('#4a90b0') });
    cyl(G, fx, fz, Y + 0.7, Y + 2.2, 1.2, 12, HX('#d8d2c4'));
    cyl(G, fx, fz, Y + 2.2, Y + 2.5, 2.4, 16, HX('#d8d2c4'));
    FEAT.fountain = [fx, Y + 2.5, fz];
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; tree(fx + Math.cos(a) * 15, fz + Math.sin(a) * 11, 0.85, k % 2 ? 'yellow' : 'red'); }
    for (const [bx, bz, a] of [[fx - 10, fz, Math.PI / 2], [fx + 10, fz, Math.PI / 2], [fx, fz - 9, 0], [fx, fz + 9, 0]]) { rbox(G, bx, bz, a, -1.2, 1.2, 0.5, Y + 0.4, Y + 0.5, C.wood); rbox(G, bx, bz, a, -1.1, -0.9, 0.4, Y, Y + 0.4, C.dark); rbox(G, bx, bz, a, 0.9, 1.1, 0.4, Y, Y + 0.4, C.dark); }
    // bulletin board
    const bbx = b.x0 + 12, bbz = b.z1 - 10;
    const bb = newB({ kind: 'board', name: '掲示板', x0: bbx - 2, z0: bbz - 0.5, x1: bbx + 2, z1: bbz + 0.5, h: 3, residents: 0 });
    box(G, bbx - 1.9, Y, bbz - 0.1, bbx - 1.7, Y + 2.4, bbz + 0.1, C.wood, { id: bb.id }); box(G, bbx + 1.7, Y, bbz - 0.1, bbx + 1.9, Y + 2.4, bbz + 0.1, C.wood, { id: bb.id });
    box(G, bbx - 1.8, Y + 1.0, bbz - 0.08, bbx + 1.8, Y + 2.3, bbz + 0.08, HX('#f4ecd8'), { id: bb.id });
    box(G, bbx - 2.0, Y + 2.3, bbz - 0.35, bbx + 2.0, Y + 2.5, bbz + 0.35, HX('#6b4a32'), { id: bb.id });
    for (let k = 0; k < 4; k++) q(G, [bbx - 1.6 + k * 0.85, Y + 1.2, bbz + 0.1], [bbx - 1.0 + k * 0.85, Y + 1.2, bbz + 0.1], [bbx - 1.0 + k * 0.85, Y + 2.0, bbz + 0.1], [bbx - 1.6 + k * 0.85, Y + 2.0, bbz + 0.1], pick(PAL.sign), 0, bb.id, 0, [0, 0, 1]);
    FEAT.board = bb;
  }
  function school(b) {
    slab(b, null);
    ground(b.x0 + 2.5, b.z0 + 2.5, b.x1 - 2.5, b.z1 - 2.5, HX('#c2ae8a'));
    const cream = HX('#ece2cc'), glass = HX('#30485a');
    const s = newB({ kind: 'school', name: '港の学校', x0: b.x0 + 4, z0: b.z0 + 4, x1: b.x1 - 4, z1: b.z0 + 17, h: 18, residents: 0, jobs: 40 });
    const mk = (x0, z0, x1, z1, fl) => { box(G, x0, Y, z0, x1, Y + fl * 3.8 + 0.6, z1, cream, { id: s.id, top: HX('#8f8a80'), ao: 0.75 });
      for (const f of faces(x0, z0, x1, z1)) { windows(G, f, Y + 0.3, fl, 3.8, 3.2, 2.4, 1.9, 1.0, glass, s.id, 1.0);
        for (let k = 1; k < fl; k++) { const e0 = fp(f, 0, 0, 0), e1 = fp(f, f.L, 0, 0.5); box(G, Math.min(e0[0], e1[0]), Y + 0.3 + k * 3.8 - 0.1, Math.min(e0[2], e1[2]), Math.max(e0[0], e1[0]), Y + 0.3 + k * 3.8 + 0.12, Math.max(e0[2], e1[2]), HX('#d8ccb2'), { id: s.id, ao: 1 }); } } };
    mk(b.x0 + 4, b.z0 + 4, b.x1 - 4, b.z0 + 17, 4);
    mk(b.x0 + 4, b.z0 + 17, b.x0 + 16, b.z0 + 40, 3);
    // clock on facade
    const fS = faces(b.x0 + 4, b.z0 + 4, b.x1 - 4, b.z0 + 17)[0]; const pc = fp(fS, fS.L / 2, Y + 14.5, 0.08);
    for (let k = 0; k < 16; k++) { const a0 = k / 16 * Math.PI * 2, a1 = (k + 1) / 16 * Math.PI * 2; tri(G, pc, [pc[0] + Math.cos(a0) * 1.4, pc[1] + Math.sin(a0) * 1.4, pc[2]], [pc[0] + Math.cos(a1) * 1.4, pc[1] + Math.sin(a1) * 1.4, pc[2]], C.white, 7, s.id); }
    // gym
    const g0x = b.x1 - 26, g1x = b.x1 - 4, g0z = b.z1 - 24, g1z = b.z1 - 4;
    box(G, g0x, Y, g0z, g1x, Y + 8, g1z, HX('#dfe3e4'), { id: s.id, ao: 0.75, noTop: true });
    gable(G, g0x, g0z, g1x, g1z, Y + 8, 2.2, 0.4, 'x', HX('#3d6e8a'), HX('#dfe3e4'), s.id);
    for (const f of faces(g0x, g0z, g1x, g1z)) windows(G, f, Y + 4.5, 1, 3, 3, 2.2, 1.6, 0.6, glass, s.id, 1);
    // pool
    box(G, b.x0 + 20, Y, g0z, g0x - 4, Y + 0.6, g1z, HX('#d9d9d4'));
    q(G, [b.x0 + 21, Y + 0.62, g0z + 1], [b.x0 + 21, Y + 0.62, g1z - 1], [g0x - 5, Y + 0.62, g1z - 1], [g0x - 5, Y + 0.62, g0z + 1], HX('#4fb3d0'), 2, 0, 0.15, [0, 1, 0]);
    // field with track
    const fx0 = b.x0 + 20, fx1 = b.x1 - 4, fz0 = b.z0 + 20, fz1 = g0z - 3;
    ground(fx0, fz0, fx1, fz1, HX('#b8875a'), Y + 0.01);
    const tcx = (fx0 + fx1) / 2, tcz = (fz0 + fz1) / 2, trx = (fx1 - fx0) / 2 - 1.5, trz = (fz1 - fz0) / 2 - 1.5;
    const ring = (rx, rz, w, col, y) => { for (let k = 0; k < 40; k++) { const a0 = k / 40 * Math.PI * 2, a1 = (k + 1) / 40 * Math.PI * 2;
      q(G, [tcx + Math.cos(a0) * rx, y, tcz + Math.sin(a0) * rz], [tcx + Math.cos(a1) * rx, y, tcz + Math.sin(a1) * rz], [tcx + Math.cos(a1) * (rx - w), y, tcz + Math.sin(a1) * (rz - w)], [tcx + Math.cos(a0) * (rx - w), y, tcz + Math.sin(a0) * (rz - w)], col, 0, 0, 0, [0, 1, 0]); } };
    ring(trx, trz, 4, HX('#b5523c'), Y + 0.03); ring(trx - 1.9, trz - 1.9, 0.15, C.white, Y + 0.04);
    // inner grass ellipse
    for (let k = 0; k < 40; k++) { const a0 = k / 40 * Math.PI * 2, a1 = (k + 1) / 40 * Math.PI * 2; tri(G, [tcx, Y + 0.035, tcz], [tcx + Math.cos(a1) * (trx - 4), Y + 0.035, tcz + Math.sin(a1) * (trz - 4)], [tcx + Math.cos(a0) * (trx - 4), Y + 0.035, tcz + Math.sin(a0) * (trz - 4)], HX('#79a653')); }
    // fence trees
    for (let x = b.x0 + 4; x < b.x1 - 4; x += 9) tree(x, b.z1 - 1.5, 0.7, 'mix');
    FEAT.school = s;
  }
  function park(b) {
    slab(b, HX('#6f9a4c'));
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    // paths (cross + ring)
    ground(cx - 1.6, b.z0 + 2, cx + 1.6, b.z1 - 2, HX('#d8c9a6'), Y + 0.012); ground(b.x0 + 2, cz - 1.6, b.x1 - 2, cz + 1.6, HX('#d8c9a6'), Y + 0.012);
    // pond (irregular)
    const pcx = cx + 14, pcz = cz - 12; const N = 28; const pr = (a) => 11 + 3 * Math.sin(a * 3 + 1) + 2 * Math.sin(a * 5);
    for (let k = 0; k < N; k++) { const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2;
      q(G, [pcx + Math.cos(a0) * (pr(a0) + 1.4), Y + 0.02, pcz + Math.sin(a0) * (pr(a0) + 1.4)], [pcx + Math.cos(a1) * (pr(a1) + 1.4), Y + 0.02, pcz + Math.sin(a1) * (pr(a1) + 1.4)], [pcx + Math.cos(a1) * pr(a1), Y + 0.02, pcz + Math.sin(a1) * pr(a1)], [pcx + Math.cos(a0) * pr(a0), Y + 0.02, pcz + Math.sin(a0) * pr(a0)], HX('#9a8f78'), 0, 0, 0, [0, 1, 0]);
      const P0 = [pcx + Math.cos(a0) * pr(a0), Y + 0.05, pcz + Math.sin(a0) * pr(a0)], P1 = [pcx + Math.cos(a1) * pr(a1), Y + 0.05, pcz + Math.sin(a1) * pr(a1)];
      for (const [p, u] of [[[pcx, Y + 0.05, pcz], 0.5], [P0, 0.02], [P1, 0.02]]) G.v(p[0], p[1], p[2], 0, 1, 0, C.water, 2, 0, u); }
    // gazebo
    const gx = cx - 18, gz = cz + 16;
    for (const [dx, dz] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) box(G, gx + dx - 0.15, Y, gz + dz - 0.15, gx + dx + 0.15, Y + 2.6, gz + dz + 0.15, C.wood);
    hip(G, gx - 2.2, gz - 2.2, gx + 2.2, gz + 2.2, Y + 2.6, 1.6, 0.4, HX('#6b3b2a'), 0);
    box(G, gx - 2.4, Y, gz - 2.4, gx + 2.4, Y + 0.3, gz + 2.4, HX('#cdbb98'));
    // trees
    for (let k = 0; k < 70; k++) { const x = b.x0 + 4 + r() * (b.x1 - b.x0 - 8), z = b.z0 + 4 + r() * (b.z1 - b.z0 - 8);
      if (Math.hypot(x - pcx, z - pcz) < 16 || Math.abs(x - cx) < 3.5 || Math.abs(z - cz) < 3.5 || Math.hypot(x - gx, z - gz) < 5) continue; tree(x, z, 0.8 + r() * 0.6, 'park'); }
    FEAT.park = { x: cx, z: cz };
  }
  function shrine(b) {
    slab(b, HX('#6f9450'));
    for (let k = 0; k < 120; k++) { const x = b.x0 + 3 + r() * (b.x1 - b.x0 - 6), z = b.z0 + 3 + r() * (b.z1 - b.z0 - 6); if (Math.abs(x - (b.x0 + b.x1) / 2) < 5 && z > b.z0 + 20) continue; tree(x, z, 0.9 + r() * 0.7, r() < 0.5 ? 'conifer' : 'mix'); }
    const cx = (b.x0 + b.x1) / 2;
    ground(cx - 2, b.z0 + 18, cx + 2, b.z1 - 1, HX('#cfc0a0'), Y + 0.012);
    // torii at road edge (south)
    const tz = b.z1 - 3, red = HX('#c8402a');
    cyl(G, cx - 2.6, tz, Y, Y + 5.2, 0.28, 10, red); cyl(G, cx + 2.6, tz, Y, Y + 5.2, 0.28, 10, red);
    box(G, cx - 3.8, Y + 5.2, tz - 0.35, cx + 3.8, Y + 5.7, tz + 0.35, HX('#2b2622')); box(G, cx - 3.2, Y + 4.4, tz - 0.2, cx + 3.2, Y + 4.75, tz + 0.2, red);
    // shrine hall
    const s = newB({ kind: 'shrine', name: '港の社', x0: cx - 6, z0: b.z0 + 8, x1: cx + 6, z1: b.z0 + 18, h: 9, residents: 0 });
    box(G, cx - 6.5, Y, b.z0 + 7.5, cx + 6.5, Y + 0.8, b.z0 + 18.5, HX('#9b958a'), { id: s.id });
    box(G, cx - 5.5, Y + 0.8, b.z0 + 8.5, cx + 5.5, Y + 4.4, b.z0 + 17.5, HX('#e9dfc9'), { id: s.id });
    for (const [dx] of [[-5.5], [-1.8], [1.8], [5.5]]) box(G, cx + dx - 0.2, Y + 0.8, b.z0 + 17.3, cx + dx + 0.2, Y + 4.4, b.z0 + 17.7, red, { id: s.id });
    gable(G, cx - 5.5, b.z0 + 8.5, cx + 5.5, b.z0 + 17.5, Y + 4.4, 3.4, 1.6, 'x', HX('#3a3f3a'), HX('#e9dfc9'), s.id);
  }
  function harbor() {
    // quay slab
    const qz0 = 160 + wZ(160) / 2, qz1 = 206;
    box(G, HARBOR_X0, -9, qz0, 285, BH, qz1, C.concrete, { ao: 0.6, top: C.concrete });
    q(G, [HARBOR_X0, BH + 0.01, qz1 - 1.2], [HARBOR_X0, BH + 0.01, qz1], [285, BH + 0.01, qz1], [285, BH + 0.01, qz1 - 1.2], HX('#d9c23a'), 0, 0, 0, [0, 1, 0]);
    for (let x = HARBOR_X0 + 5; x < 285; x += 14) cyl(G, x, qz1 - 0.6, BH, BH + 0.7, 0.3, 8, HX('#2b2b2b'));
    // warehouses
    const wc = [HX('#5b8a8c'), HX('#9a5a3e'), HX('#7d8a99'), HX('#b9b39f')];
    [[-85, -30], [-20, 35], [45, 100]].forEach(([a, b2], k) => {
      const w = newB({ kind: 'warehouse', name: '港の倉庫', x0: a, z0: qz0 + 6, x1: b2, z1: qz0 + 30, h: 12, residents: 0, jobs: 25 });
      if (k === 0) FEAT.warehouse = w;
      box(G, a, BH, qz0 + 6, b2, BH + 9, qz0 + 30, wc[k], { id: w.id, m: 5, ao: 0.7, noTop: true });
      gable(G, a, qz0 + 6, b2, qz0 + 30, BH + 9, 2.4, 0.5, 'x', HX('#8e9396'), wc[k], w.id);
      for (const f of faces(a, qz0 + 6, b2, qz0 + 30)) if (f.k === 'S' || f.k === 'N') for (let s = 6; s < f.L - 4; s += 13) fquad(G, f, s, s + 6, BH, BH + 6, 0.07, HX('#c9c3b2'), 5, w.id);
      fquad(G, faces(a, qz0 + 6, b2, qz0 + 30)[1], 3, f2(b2 - a) - 3, BH + 7.2, BH + 8.6, 0.08, HX('#f2efe6'), 0, w.id);
    });
    function f2(x) { return x; }
    // gate house (reserved for the 門番 request)
    { const gx0 = -28.5, gx1 = -21.5, gz0 = qz0 + 8, gz1 = qz0 + 15;
      const gt = newB({ kind: 'gate', name: '門番の小屋', x0: gx0, z0: gz0, x1: gx1, z1: gz1, h: 6, residents: 0, hidden: true });
      box(G, gx0, BH, gz0, gx1, BH + 4, gz1, HX('#f1ebe0'), { id: gt.id, top: HX('#c8553d'), ao: 0.7 });
      for (const f of faces(gx0, gz0, gx1, gz1)) fquad(G, f, 0.6, f.L - 0.6, BH + 1.6, BH + 3.2, 0.06, HX('#2a3a48'), 1, gt.id, 99.5);
      box(G, gx0 - 0.4, BH + 4, gz0 - 0.4, gx1 + 0.4, BH + 4.5, gz1 + 0.4, HX('#c8553d'), { id: gt.id });
      box(G, gx1 + 0.2, BH + 0.9, gz0 + 2, gx1 + 9, BH + 1.15, gz0 + 2.3, HX('#ffb000'), { id: gt.id, m: 8, ao: 1 });
      box(G, gx1 + 9, BH, gz0 + 1.9, gx1 + 9.3, BH + 1.2, gz0 + 2.4, HX('#5d6166'), { id: gt.id });
      FEAT.gate = gt; }
    // container yard
    for (let x = 118; x < 270; x += 7.2) for (let z = qz0 + 6; z < qz0 + 30; z += 2.6) {
      if ((Math.floor((z - qz0 - 6) / 2.6)) % 4 === 3) continue;
      const bay = Math.floor((x - 118) / 21.6); const hgt = Math.max(1, Math.min(4, Math.round(2.6 + 1.4 * Math.sin(bay * 1.7 + z * 0.3) + (r() - 0.5))));
      for (let l = 0; l < hgt; l++) box(G, x, BH + l * 2.6, z, x + 6.1, BH + l * 2.6 + 2.5, z + 2.45, jit(pick(PAL.cont), 0.12, r), { m: 5, ao: 0.85 });
    }
    // gantry cranes
    for (const cx of [140, 195, 245]) {
      const cc = HX('#d9533b'), cw = HX('#f0f0ec');
      const cr = newB({ kind: 'crane', name: 'ガントリークレーン', x0: cx - 9, z0: qz1 - 14, x1: cx + 9, z1: qz1 + 32, h: 42, residents: 0, jobs: 4 });
      for (const lx of [cx - 8, cx + 8]) for (const lz of [qz1 - 13, qz1 - 2]) box(G, lx - 0.6, BH, lz - 0.6, lx + 0.6, BH + 30, lz + 0.6, cc, { id: cr.id, ao: 0.9 });
      box(G, cx - 8.8, BH + 28, qz1 - 14, cx + 8.8, BH + 31, qz1 - 0.5, cc, { id: cr.id });
      box(G, cx - 1.6, BH + 31, qz1 - 22, cx + 1.6, BH + 33, qz1 + 34, cw, { id: cr.id });
      box(G, cx - 2.5, BH + 33, qz1 - 12, cx + 2.5, BH + 37, qz1 - 4, cw, { id: cr.id });
      box(G, cx - 1.2, BH + 25, qz1 + 6, cx + 1.2, BH + 31, qz1 + 9, HX('#3b4a56'), { id: cr.id });
      box(G, cx - 0.15, BH + 33, qz1 + 33, cx + 0.15, BH + 40, qz1 + 33.3, cw, { id: cr.id });
    }
    // container ship moored
    ship(G, 195, 230, 0, 120, 22, true);
    // fishing pier
    box(G, -55, -1.5, qz1, -49, 0.6, qz1 + 46, C.wood, { ao: 0.6 });
    for (let z = qz1 + 4; z < qz1 + 46; z += 6) { cyl(G, -55.3, z, -6, 0.6, 0.25, 6, HX('#4a3a2a')); cyl(G, -48.7, z, -6, 0.6, 0.25, 6, HX('#4a3a2a')); }
    // breakwater + lighthouse
    box(G, 278, -9, 206, 290, 1.4, 340, HX('#9a9a92'), { ao: 0.55 });
    box(G, 200, -9, 334, 290, 1.4, 346, HX('#9a9a92'), { ao: 0.55 });
    cyl(G, 206, 340, 1.4, 16, 2.4, 14, C.white, { r1: 1.8 });
    for (let k = 0; k < 3; k++) cyl(G, 206, 340, 2.6 + k * 4.4, 4.6 + k * 4.4, 2.42 - k * 0.2, 14, C.red, { r1: 2.25 - k * 0.2, noTop: true });
    cyl(G, 206, 340, 16, 18, 1.4, 12, HX('#ffe9a8'), { m: 3 }); cone(G, 206, 340, 18, 2.4, 1.9, 12, C.red);
    FEAT.light = [206, 17, 340];
  }
  function ship(g, cx, cz, a, L, W, moored) {
    // hull: tapered bow at +x
    const hull = HX('#2f3e4e'), hull2 = HX('#b33a2e'); const y0 = -2, y1 = 4;
    const P = (l, s, y) => [cx + Math.cos(a) * l - Math.sin(a) * s, y, cz + Math.sin(a) * l + Math.cos(a) * s];
    const hl = L / 2, hw = W / 2, bow = hl - W * 0.9;
    const ring = [[-hl, -hw], [bow, -hw], [hl, 0], [bow, hw], [-hl, hw]];
    for (let k = 0; k < ring.length; k++) { const [l0, s0] = ring[k], [l1, s1] = ring[(k + 1) % ring.length];
      q(g, P(l0, s0, y0), P(l1, s1, y0), P(l1, s1, y1), P(l0, s0, y1), [hull2, hull2, hull, hull], 0, 0, 0);
    }
    q(g, P(-hl, -hw, y1), P(bow, -hw, y1), P(bow, hw, y1), P(-hl, hw, y1), HX('#7a2f28'), 0, 0, 0, [0, 1, 0]); tri(g, P(bow, -hw, y1), P(hl, 0, y1), P(bow, hw, y1), HX('#7a2f28'));
    // bridge
    rbox(g, cx, cz, a, -hl + 2, -hl + 14, W - 2, y1, y1 + 14, HX('#f2f0ea'));
    for (let fl = 0; fl < 4; fl++) rbox(g, cx, cz, a, -hl + 1.9, -hl + 14.1, W - 1.9, y1 + 2 + fl * 3.2, y1 + 3.2 + fl * 3.2, HX('#2b3a48'), { m: 1 });
    rbox(g, cx, cz, a, -hl + 4, -hl + 8, 3, y1 + 14, y1 + 20, HX('#c0392b'));
    if (moored) for (let l = -hl + 17; l < bow - 4; l += 6.4) for (let s = -hw + 1.5; s < hw - 3; s += 2.6) { const hh = 1 + Math.floor(hash2(l, s) * 3); for (let k = 0; k < hh; k++) rbox(g, cx, cz, a, l, l + 6.1, 2.45, y1 + k * 2.6, y1 + k * 2.6 + 2.5, pick(PAL.cont), { m: 5, ao: 0.85 }); void s; }
  }
  function radioTower(x, z) {
    const h0 = terrainH(x, z); const H = 70; const red = HX('#d6402f'), wh = HX('#f2f2ee');
    const t = newB({ kind: 'tower', name: '通信の塔', x0: x - 6, z0: z - 6, x1: x + 6, z1: z + 6, h: H + h0, residents: 0, jobs: 2, y0: h0 });
    const lv = 7;
    for (let k = 0; k < lv; k++) { const ya = h0 + k * H / lv, yb = h0 + (k + 1) * H / lv; const wa = 5 * (1 - k / lv * 0.85), wb = 5 * (1 - (k + 1) / lv * 0.85); const col = k % 2 ? wh : red;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const a = [x + sx * wa, ya, z + sz * wa], b2 = [x + sx * wb, yb, z + sz * wb];
        q(G, [a[0] - 0.3, ya, a[2]], [a[0] + 0.3, ya, a[2]], [b2[0] + 0.3, yb, b2[2]], [b2[0] - 0.3, yb, b2[2]], col, 0, 0);
        q(G, [a[0], ya, a[2] - 0.3], [a[0], ya, a[2] + 0.3], [b2[0], yb, b2[2] + 0.3], [b2[0], yb, b2[2] - 0.3], col, 0, 0);
      }
      box(G, x - wb - 0.2, yb - 0.4, z - wb - 0.2, x + wb + 0.2, yb, z + wb + 0.2, col);
    }
    box(G, x - 0.3, h0 + H, z - 0.3, x + 0.3, h0 + H + 8, z + 0.3, wh); box(G, x - 0.5, h0 + H + 7.4, z - 0.5, x + 0.5, h0 + H + 8.2, z + 0.5, HX('#ff3b2a'), { m: 8 });
    FEAT.tower = { x, z, y: h0 + H + 8, b: t };
  }

  // ---- district plan ----
  const at = (i, j) => blocks.find((b) => b.i === i && b.j === j);
  const used = new Set();
  const use = (i, j) => { used.add(i + ',' + j); return at(i, j); };
  townHall(use(3, 2));
  school(use(1, 3));
  park(use(4, 1));
  shrine(use(0, 0));
  // downtown offices
  for (const [i, j, minF, maxF] of [[2, 2, 8, 18], [3, 1, 6, 14], [2, 1, 5, 10], [4, 2, 5, 11]]) {
    const b = use(i, j); slab(b, C.paving);
    const halfX = (b.x0 + b.x1) / 2, halfZ = (b.z0 + b.z1) / 2;
    const cells = [[b.x0 + 3, b.z0 + 3, halfX - 2, halfZ - 2], [halfX + 2, b.z0 + 3, b.x1 - 3, halfZ - 2], [b.x0 + 3, halfZ + 2, halfX - 2, b.z1 - 3], [halfX + 2, halfZ + 2, b.x1 - 3, b.z1 - 3]];
    cells.forEach((c, k) => {
      const fl = Math.round(minF + r() * (maxF - minF)); const st = Math.floor(r() * 3);
      const sh = 2 + r() * 3;
      office(c[0] + (r() < 0.5 ? sh : 0), c[1] + (r() < 0.5 ? sh : 0), c[2] - (r() < 0.5 ? sh : 0), c[3] - (r() < 0.5 ? sh : 0), fl, st);
      tree(c[0] - 0.5, c[1] - 0.5, 0.6, 'yellow');
    });
    for (let x = b.x0 + 5; x < b.x1 - 3; x += 10) { tree(x, b.z0 + 1.3, 0.55, 'yellow'); tree(x, b.z1 - 1.3, 0.55, 'yellow'); }
  }
  // shopping street blocks (row j=3 north side faces z=0 avenue)
  for (const i of [2, 3, 4]) {
    const b = use(i, 3); slab(b, C.paving2);
    const n = Math.round((b.x1 - b.x0 - 4) / 9); const w = (b.x1 - b.x0 - 4) / n;
    for (let k = 0; k < n; k++) { const x0 = b.x0 + 2 + k * w + 0.4, x1 = x0 + w - 0.8;
      const sb = shop(x0, b.z0 + 2.4, x1, b.z0 + 2.4 + 13 + r() * 5, 'N', 2 + Math.floor(r() * 3), { street: true });
      if (i === 3 && k === 2) FEAT.shopMain = sb;
      shop(x0, b.z1 - 2.4 - 12 - r() * 4, x1, b.z1 - 2.4, 'S', 1 + Math.floor(r() * 3)); }
    // middle: apartments
    const mz0 = b.z0 + 24, mz1 = b.z1 - 20;
    if (mz1 > mz0 + 10) { apartment(b.x0 + 4, mz0, (b.x0 + b.x1) / 2 - 2, mz1, 'S', 5 + Math.floor(r() * 4)); apartment((b.x0 + b.x1) / 2 + 2, mz0, b.x1 - 4, mz1, 'S', 4 + Math.floor(r() * 4)); }
  }
  // apartment districts
  for (const [i, j] of [[1, 1], [1, 2], [5, 2], [2, 4], [3, 4]]) {
    const b = use(i, j); slab(b, C.lawn);
    const midX = (b.x0 + b.x1) / 2;
    if (i === 1 && j === 2) { // clinic + apartments
      const c = newB({ kind: 'clinic', name: '診療所', x0: b.x0 + 4, z0: b.z0 + 4, x1: midX - 3, z1: b.z0 + 22, h: 12, residents: 0, jobs: 20 });
      box(G, c.x0, Y, c.z0, c.x1, Y + 11, c.z1, HX('#f6f7f6'), { id: c.id, top: HX('#a0a4a6'), ao: 0.75 });
      for (const f of faces(c.x0, c.z0, c.x1, c.z1)) windows(G, f, Y + 0.3, 3, 3.5, 2.6, 1.8, 1.6, 1.0, HX('#3a5a6a'), c.id, 1);
      const fS = faces(c.x0, c.z0, c.x1, c.z1)[1]; const pc = fp(fS, fS.L / 2, Y + 9.2, 0.1);
      q(G, [pc[0] - 0.3, pc[1] - 1, pc[2]], [pc[0] + 0.3, pc[1] - 1, pc[2]], [pc[0] + 0.3, pc[1] + 1, pc[2]], [pc[0] - 0.3, pc[1] + 1, pc[2]], HX('#2fa36b'), 7, c.id, 0, [0, 0, -1]);
      q(G, [pc[0] - 1, pc[1] - 0.3, pc[2]], [pc[0] + 1, pc[1] - 0.3, pc[2]], [pc[0] + 1, pc[1] + 0.3, pc[2]], [pc[0] - 1, pc[1] + 0.3, pc[2]], HX('#2fa36b'), 7, c.id, 0, [0, 0, -1]);
      FEAT.clinic = c;
      { const vx0 = c.x0 + 1, vz0 = c.z1 + 2, vx1 = c.x0 + 13, vz1 = c.z1 + 8.5;
        const dv = newB({ kind: 'dbvault', name: '帳簿の倉庫', x0: vx0, z0: vz0, x1: vx1, z1: vz1, h: 7, residents: 0, hidden: true });
        box(G, vx0, Y, vz0, vx1, Y + 6, vz1, HX('#dff3ef'), { id: dv.id, top: HX('#2fa39a'), ao: 0.7 });
        for (const f of faces(vx0, vz0, vx1, vz1)) fquad(G, f, 0.5, f.L - 0.5, Y + 4.2, Y + 5.4, 0.06, HX('#1f5f5a'), 1, dv.id, 88.5);
        fquad(G, faces(vx0, vz0, vx1, vz1)[0], 0.4, 11.6, Y + 3.2, Y + 3.8, 0.08, HX('#3fd0c0'), 7, dv.id);
        FEAT.dbvault = dv; }
      apartment(midX + 3, b.z0 + 4, b.x1 - 4, b.z0 + 20, 'S', 6);
      apartment(b.x0 + 4, b.z0 + 32, b.x1 - 4, b.z0 + 46, 'S', 7);
      for (let x = b.x0 + 6; x < b.x1 - 4; x += 8) tree(x, b.z1 - 6, 0.7);
      continue;
    }
    const nA = 2; const span = (b.z1 - b.z0 - 8) / nA;
    for (let k = 0; k < nA; k++) { const z0 = b.z0 + 4 + k * span + 2, z1 = z0 + span - 12; apartment(b.x0 + 5, z0, midX - 3, z1, 'S', 4 + Math.floor(r() * 6)); apartment(midX + 3, z0, b.x1 - 5, z1, 'S', 4 + Math.floor(r() * 6));
      for (let x = b.x0 + 6; x < b.x1 - 4; x += 7) tree(x, z1 + 4 + r() * 3, 0.6 + r() * 0.3); }
  }
  // residential remainder
  for (const b of blocks) {
    if (used.has(b.i + ',' + b.j)) continue;
    if (b.i === 5 && b.j === 4) residentialBlock(b, { empty: (L) => L.z0 > b.z0 + 8 || L.front === 'E' });
    else residentialBlock(b, { apt: b.j === 3 || b.i === 1 ? 0.15 : 0.03 });
  }
  harbor();
  // beach promenade
  for (let x = -268; x < HARBOR_X0 - 4; x += 9) { const z = shoreZ(x) - 30 + (hash2(x, 1) - 0.5) * 3; tree(x, z, 0.85, 'pine', terrainH(x, z)); }
  radioTower(-120, -520);
  // farmland east
  for (let x = 285; x < 560; x += 46) for (let z = -255; z < 150; z += 34) {
    if (Math.abs(z) < 10) continue;
    const fx0 = x + 1.5, fx1 = x + 44.5, fz0 = z + 1.5, fz1 = z + 32.5; if (Math.abs(fz0) < 9 || Math.abs(fz1) < 9 || (fz0 < 9 && fz1 > -9)) continue;
    const kind = hash2(x, z); const cc = kind < 0.35 ? HX('#c9b46a') : kind < 0.6 ? HX('#8a6a48') : kind < 0.85 ? HX('#6f9a3e') : HX('#4f7a36');
    const hh = (a, b2) => terrainH(a, b2) + 0.08;
    q(G, [fx0, hh(fx0, fz0), fz0], [fx0, hh(fx0, fz1), fz1], [fx1, hh(fx1, fz1), fz1], [fx1, hh(fx1, fz0), fz0], cc, 0, 0, 0, [0, 1, 0]);
    for (let s = fz0 + 2; s < fz1 - 1; s += 2.4) q(G, [fx0 + 1, hh(fx0, s) + 0.02, s], [fx0 + 1, hh(fx0, s) + 0.02, s + 0.6], [fx1 - 1, hh(fx1, s) + 0.02, s + 0.6], [fx1 - 1, hh(fx1, s) + 0.02, s], mulc(cc, 0.86), 0, 0, 0, [0, 1, 0]);
    if (hash2(x + 3, z) < 0.18) { const hx = fx0 + 6, hz = fz0 + 6, hy = terrainH(hx, hz); const hb = newB({ kind: 'farm', name: '農家', x0: hx, z0: hz, x1: hx + 10, z1: hz + 8, h: 9, residents: 4, y0: hy });
      box(G, hx, hy, hz, hx + 10, hy + 4, hz + 8, HX('#e2d6bf'), { id: hb.id, noTop: true }); gable(G, hx, hz, hx + 10, hz + 8, hy + 4, 3, 0.6, 'x', HX('#3c4650'), HX('#e2d6bf'), hb.id); tree(hx - 3, hz + 2, 0.9, 'mix', hy); tree(hx + 13, hz + 4, 0.8, 'mix', hy); }
  }
  // forest on hills
  for (let z = -1250; z < 880; z += 13) for (let x = -1250; x < 1250; x += 13) {
    const jx = x + (hash2(x, z) - 0.5) * 11, jz = z + (hash2(z, x) - 0.5) * 11;
    const h = terrainH(jx, jz); if (h < 2.5) continue;
    if (jx > 268 && jx < 565 && jz > -270 && jz < 200) continue;
    if (Math.abs(jx - (40 * Math.sin((jz + 249) * 0.004))) < 10 && jz < -240) continue;
    const dens = fbm(jx * 0.006, jz * 0.006, 3); if (dens < 0.38 + 0.1 * hash2(jx, jz)) continue;
    if (Math.hypot(jx + 120, jz + 520) < 14) continue;
    tree(jx, jz, 0.9 + hash2(jx, 3) * 0.7, dens > 0.6 ? 'conifer' : 'forest', h);
  }
  // street trees on avenues
  for (let z = -232; z < 156; z += 11) for (const x of [-11, 11]) { if (Math.abs(z) < 14) continue; tree(x, z, 0.62, 'yellow', BH); }
  for (let x = -232; x < 236; x += 11) for (const z of [-11, 11]) { if (Math.abs(x) < 14) continue; tree(x, z, 0.62, 'yellow', BH); }

  // ---- trees geometry ----
  const fN = (x, z) => fbm(x * 0.01 + 3, z * 0.01, 2);
  for (const t of trees) {
    const s = t.s; const y = t.y;
    if (t.kind === 'conifer') { const hh = 9 * s + hash2(t.x, t.z) * 4; const cc = jit(C.conifer, 0.25, r); box(G, t.x - 0.25, y, t.z - 0.25, t.x + 0.25, y + 2, t.z + 0.25, C.trunk); cone(G, t.x, t.z, y + 1.5, hh * 0.7, 2.6 * s, 7, cc); cone(G, t.x, t.z, y + 1.5 + hh * 0.35, hh * 0.65, 1.9 * s, 7, mulc(cc, 1.08)); continue; }
    if (t.kind === 'pine') { box(G, t.x - 0.25, y, t.z - 0.25, t.x + 0.25, y + 5.5 * s, t.z + 0.25, C.trunk); blob(G, t.x + 0.6, y + 6 * s, t.z, 3.6 * s, 1.5 * s, 3 * s, jit(HX('#3c5f3a'), 0.2, r), r, 0); blob(G, t.x - 1.2, y + 4.8 * s, t.z + 0.6, 2.4 * s, 1.1 * s, 2.2 * s, jit(HX('#3c5f3a'), 0.2, r), r, 0); continue; }
    let col;
    const rv = hash2(t.x * 1.3, t.z * 0.7);
    if (t.kind === 'yellow') col = rv < 0.85 ? jit(HX('#e0b93c'), 0.12, r) : pick(PAL.leafG);
    else if (t.kind === 'red') col = jit(HX('#c4482e'), 0.12, r);
    else if (t.kind === 'park') col = rv < 0.45 ? pick(PAL.leafG) : pick(PAL.leafA);
    else if (t.kind === 'forest') { const au = fN(t.x, t.z); col = au > 0.55 && rv < 0.7 ? pick(PAL.leafA) : jit(pick(PAL.leafG), 0.2, r); }
    else col = rv < 0.62 ? jit(pick(PAL.leafG), 0.15, r) : pick(PAL.leafA);
    const lv = t.kind === 'forest' ? 0 : 1;
    const th = 2.2 * s + 0.6;
    box(G, t.x - 0.18 * s - 0.08, y, t.z - 0.18 * s - 0.08, t.x + 0.18 * s + 0.08, y + th + 1.2 * s, t.z + 0.18 * s + 0.08, C.trunk, { ao: 0.7 });
    if (lv === 1) {
      const a0 = rv * 6.28;
      blob(G, t.x, y + th + 2.4 * s, t.z, 2.3 * s, 2.2 * s, 2.3 * s, col, r, 1);
      for (let k = 0; k < 3; k++) { const a = a0 + k * 2.1; blob(G, t.x + Math.cos(a) * 1.5 * s, y + th + (1.3 + 0.5 * k) * s, t.z + Math.sin(a) * 1.5 * s, 1.6 * s, 1.5 * s, 1.6 * s, mulc(col, 0.86 + 0.08 * k), r, 0); }
    } else {
      blob(G, t.x, y + th + 2.2 * s, t.z, 2.6 * s, 2.4 * s, 2.6 * s, col, r, 0);
      blob(G, t.x + 1.1 * s, y + th + 1.4 * s, t.z + 0.6 * s, 1.8 * s, 1.6 * s, 1.8 * s, mulc(col, 0.88), r, 0);
    }
  }

  // ---- street lamps & glow pools ----
  const lamps = [];
  const lamp = (x, z, nx, nz) => {
    box(G, x - 0.09, BH, z - 0.09, x + 0.09, BH + 6.2, z + 0.09, C.pole, { ao: 0.9 });
    const ex = x + nx * 1.4, ez = z + nz * 1.4;
    box(G, Math.min(x, ex) - 0.06, BH + 6.0, Math.min(z, ez) - 0.06, Math.max(x, ex) + 0.06, BH + 6.15, Math.max(z, ez) + 0.06, C.pole);
    box(G, ex - 0.35, BH + 5.75, ez - 0.2, ex + 0.35, BH + 6.0, ez + 0.2, C.lamp, { m: 3, ao: 1 });
    const R = 7.5; const gy = 0.12;
    const c0 = [0, 0, 1], c1 = [1, 0, 1], c2 = [1, 1, 1], c3 = [0, 1, 1];
    q(GL, [ex - R, gy, ez - R], [ex - R, gy, ez + R], [ex + R, gy, ez + R], [ex + R, gy, ez - R], [c0, c3, c2, c1], 0, 0, 0, [0, 1, 0]);
    lamps.push([ex, BH + 5.9, ez]);
  };
  for (const s of roadSegs) {
    const [ax, az] = s.a, [bx, bz] = s.b; const vert = ax === bx; const L = vert ? bz - az : bx - ax;
    for (let t = 14; t < L - 10; t += 30) {
      if (vert) { lamp(ax - s.w / 2 - 0.8, az + t, 1, 0); lamp(ax + s.w / 2 + 0.8, az + t + 15, -1, 0); }
      else { lamp(ax + t, az - s.w / 2 - 0.8, 0, 1); lamp(ax + t + 15, az + s.w / 2 + 0.8, 0, -1); }
    }
  }
  // quay lamps
  for (let x = HARBOR_X0 + 10; x < 280; x += 24) lamp(x, 203.5, 0, -1);

  // traffic graph
  const nodes = new Map(); const key = (x, z) => x + ',' + z;
  const addN = (x, z) => { const k = key(x, z); if (!nodes.has(k)) nodes.set(k, { x, z, nb: [], w: 11 }); return nodes.get(k); };
  for (const s of roadSegs) { const a = addN(...s.a), b = addN(...s.b); a.nb.push(b); b.nb.push(a); a.w = Math.max(a.w, s.w); b.w = Math.max(b.w, s.w); }
  // traffic signals at junctions
  const signals = [];
  for (const n of nodes.values()) {
    if (n.nb.length < 3) continue;
    const hx = wX(n.x) / 2 + 0.9, hz = wZ(n.z) / 2 + 0.9; n.sig = true; n.off = (Math.abs(n.x * 7 + n.z * 13) % 28);
    const cs2 = [[n.x + hx, n.z - hz], [n.x - hx, n.z + hz], [n.x + hx, n.z + hz], [n.x - hx, n.z - hz]];
    for (const [px, pz] of cs2) { box(G, px - 0.1, BH, pz - 0.1, px + 0.1, BH + 5.2, pz + 0.1, HX('#6a6e72'), { ao: 0.9 }); box(G, px - 0.25, BH + 4.2, pz - 0.25, px + 0.25, BH + 5.3, pz + 0.25, HX('#2f3337')); }
    signals.push({ n, cs: cs2 });
  }
  // utility poles with wires along ordinary streets
  const poleC = HX('#8d8a82'), wireC = HX('#2a2a2a');
  for (const sg of roadSegs) {
    if (sg.w > 14) continue; const [ax, az] = sg.a, [bx, bz] = sg.b; const vert = ax === bx; const L = vert ? bz - az : bx - ax;
    const pts = [];
    for (let t = 9; t < L - 8; t += 26) { const px = vert ? ax + sg.w / 2 + 1.6 : ax + t, pz = vert ? az + t : az - sg.w / 2 - 1.6; pts.push([px, pz]);
      box(G, px - 0.16, BH, pz - 0.16, px + 0.16, BH + 9, pz + 0.16, poleC, { ao: 0.85 });
      if (vert) box(G, px - 0.9, BH + 8.2, pz - 0.07, px + 0.9, BH + 8.35, pz + 0.07, poleC); else box(G, px - 0.07, BH + 8.2, pz - 0.9, px + 0.07, BH + 8.35, pz + 0.9, poleC);
      if ((t / 26 | 0) % 3 === 1) cyl(G, px + (vert ? 0.35 : 0), pz + (vert ? 0 : 0.35), BH + 6.2, BH + 7.2, 0.3, 8, HX('#9a9890'));
    }
    for (let k = 0; k < pts.length - 1; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1];
      for (const o of [-0.8, 0.8]) { if (vert) box(G, x0 + o - 0.025, BH + 8.0, z0, x0 + o + 0.025, BH + 8.05, z1, wireC, { ao: 1 }); else box(G, x0, BH + 8.0, z0 + o - 0.025, x1, BH + 8.05, z0 + o + 0.025, wireC, { ao: 1 }); }
      if (vert) box(G, x0 - 0.025, BH + 7.0, z0, x0 + 0.025, BH + 7.05, z1, wireC, { ao: 1 }); else box(G, x0, BH + 7.0, z0 - 0.025, x1, BH + 7.05, z0 + 0.025, wireC, { ao: 1 }); }
  }
  // bus stops on the avenues
  for (const z of [-200, -120, -40, 40, 120]) { const x = 9 + 1.4; box(G, x - 0.05, BH, z - 2.5, x + 1.6, BH + 2.6, z + 2.5, HX('#9fb7c4'), { m: 1, ao: 1 }); box(G, x - 0.2, BH + 2.6, z - 2.8, x + 1.9, BH + 2.8, z + 2.8, HX('#3d6e8a')); box(G, x + 0.4, BH, z - 2.2, x + 1.2, BH + 0.45, z + 2.2, C.wood); }
  // vending machines near houses
  for (let k = 0; k < 40; k++) { const b = blocks[Math.floor(r() * blocks.length)]; const x = b.x0 + 3 + r() * (b.x1 - b.x0 - 6); const z = b.z0 + 0.6;
    box(G, x - 0.5, BH, z, x + 0.5, BH + 1.8, z + 0.7, r() < 0.5 ? HX('#c8372d') : HX('#f2f2ee'), { ao: 0.9 }); q(G, [x - 0.4, BH + 0.9, z - 0.01], [x + 0.4, BH + 0.9, z - 0.01], [x + 0.4, BH + 1.6, z - 0.01], [x - 0.4, BH + 1.6, z - 0.01], HX('#e8f4ff'), 8, 0, 0, [0, 0, -1]); }

  // sidewalk rings for pedestrians
  const rings = blocks.map((b) => ({ x0: b.x0 + 1.2, z0: b.z0 + 1.2, x1: b.x1 - 1.2, z1: b.z1 - 1.2 }));

  return {
    G: G.out(), W: GW.out(), GL: GL.out(), B, lots, FEAT, nodes: [...nodes.values()], signals, rings, lamps, blocks, terrainH, BH, Y,
    stats: { tris: G.n / 3, trees: trees.length, buildings: B.length }
  };
}
// helpers re-exported for dynamic builds
const GEN = { Geo, q, box, rbox, cyl, gable, hip, faces, fp, fquad, windows, blob, HX, mulc, jit, PAL, C, mulberry };
