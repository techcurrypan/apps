// ---- みなと町: game layer ----
(function () {
  const $ = (s) => document.querySelector(s);
  const canvas = $('#view');
  let E;
  try { E = createEngine(canvas); } catch (e) { $('#boot').textContent = 'この端末では 3D 表示（WebGL2）が使えません。'; return; }
  const city = generateCity();
  E.setMesh('city', city.G); E.setMesh('water', city.W); E.setMesh('glow', city.GL);
  const { Geo, q, box, rbox, cyl, faces, fp, fquad, windows, gable, HX, mulc, jit, PAL } = GEN;
  const Y = city.Y;
  const R = mulberry(7);
  const pick = (a) => a[Math.floor(R() * a.length)];

  // hide reserved buildings
  for (const b of city.B) if (b.hidden) E.setData(b.id, 0, 0, 0, 0);

  // ---------------- state ----------------
  const S = {
    day: 10, month: 11, minute: 15 * 60 + 30, speed: 1, money: 5000,
    view: 'ground', tool: 'select', sel: null,
    learned: {}, answered: {}, requests: [], toasts: [],
    buildingsHappy: new Map(), built: [], nextId: 4000,
    infra: 0, infraTarget: 0
  };
  for (const b of city.B) S.buildingsHappy.set(b.id, 0.55 + R() * 0.25);
  const pop = () => city.B.concat(S.built).reduce((s, b) => s + (b.residents || 0) * (E.getRise(b.id) > 0.99 ? 1 : 0), 0);
  const jobs = () => city.B.concat(S.built).reduce((s, b) => s + (b.jobs || 0), 0);
  const avgHappy = () => { let s = 0, n = 0; for (const b of city.B.concat(S.built)) { if (b.hidden && E.getRise(b.id) < 0.5) continue; s += S.buildingsHappy.get(b.id) || 0.6; n++; } return s / n; };

  // ---------------- camera ----------------
  const cam = { tx: 30, tz: -10, yaw: 0.75, pitch: 0.52, dist: 260, v: { tx: 30, tz: -10, yaw: 0.75, pitch: 0.52, dist: 260 }, fly: null };
  function eyeOf(c) { return [c.tx + c.dist * Math.cos(c.pitch) * Math.sin(c.yaw), Math.max(4, c.dist * Math.sin(c.pitch)), c.tz + c.dist * Math.cos(c.pitch) * Math.cos(c.yaw)]; }
  function flyTo(x, z, dist, pitch, yaw) { cam.fly = { t: 0, from: { ...cam.v }, to: { tx: x, tz: z, dist: dist || cam.v.dist, pitch: pitch === undefined ? cam.v.pitch : pitch, yaw: yaw === undefined ? cam.v.yaw : yaw } }; }
  const clampCam = () => { cam.v.dist = Math.max(35, Math.min(950, cam.v.dist)); cam.v.pitch = Math.max(0.18, Math.min(1.38, cam.v.pitch)); cam.v.tx = Math.max(-700, Math.min(700, cam.v.tx)); cam.v.tz = Math.max(-700, Math.min(500, cam.v.tz)); };

  // ---------------- lighting by hour ----------------
  const KEYS = [
    [0, [0.1, 0.13, 0.22], [0.006, 0.01, 0.03], [0.02, 0.03, 0.06], 0.55, 1],
    [4.8, [0.1, 0.13, 0.22], [0.006, 0.01, 0.03], [0.02, 0.03, 0.06], 0.55, 1],
    [6.0, [1.5, 0.8, 0.45], [0.07, 0.11, 0.26], [0.72, 0.46, 0.36], 0.45, 0.35],
    [7.5, [2.3, 2.0, 1.6], [0.07, 0.16, 0.4], [0.45, 0.52, 0.65], 0.55, 0],
    [12, [2.6, 2.35, 1.95], [0.06, 0.16, 0.42], [0.42, 0.53, 0.7], 0.55, 0],
    [15.5, [2.5, 2.1, 1.6], [0.06, 0.15, 0.4], [0.5, 0.53, 0.62], 0.55, 0],
    [16.8, [2.3, 1.35, 0.65], [0.11, 0.16, 0.34], [0.88, 0.56, 0.38], 0.75, 0.05],
    [17.7, [1.5, 0.6, 0.27], [0.08, 0.09, 0.22], [0.8, 0.36, 0.25], 0.7, 0.45],
    [18.6, [0.12, 0.14, 0.25], [0.015, 0.02, 0.07], [0.09, 0.06, 0.13], 0.5, 0.92],
    [24, [0.1, 0.13, 0.22], [0.006, 0.01, 0.03], [0.02, 0.03, 0.06], 0.55, 1]
  ];
  function lightAt(h) {
    let a = KEYS[0], b = KEYS[1];
    for (let i = 0; i < KEYS.length - 1; i++) if (h >= KEYS[i][0] && h <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break; }
    const t = (h - a[0]) / (b[0] - a[0] || 1); const L = (u, v) => u.map((x, i) => x + (v[i] - x) * t);
    const sun = L(a[1], b[1]), sky = L(a[2], b[2]), hor = L(a[3], b[3]);
    let sd;
    if (h > 5.6 && h < 18.4) { const ph = (h - 6) / 12 * Math.PI; const el = Math.max(0.04, Math.sin(ph) * 0.92); let hx = Math.cos(ph), hz = 0.5 + 0.45 * Math.sin(ph); const hl = Math.hypot(hx, hz); hx /= hl; hz /= hl; sd = [hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)]; }
    else sd = (() => { const v = [-0.35, 0.75, 0.45]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
    return { sun, sky, hor, gnd: [sky[0] * 0.5 + 0.03, sky[1] * 0.45 + 0.03, sky[2] * 0.3 + 0.02].map((x) => x * (1 - (a[5] + (b[5] - a[5]) * t) * 0.6)), amb: a[4] + (b[4] - a[4]) * t, night: a[5] + (b[5] - a[5]) * t, sd };
  }

  // ---------------- traffic ----------------
  const NODES = city.nodes;
  const cars = [];
  function laneLeft(dx, dz) { return [dz, -dx]; }
  function segFor(car) {
    const A = car.a, B = car.b; const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz); const ux = dx / L, uz = dz / L; const [lx, lz] = laneLeft(ux, uz);
    const off = (Math.max(A.w, B.w) > 14 ? 4.2 : 2.0); const rA = A.w / 2 + 3, rB = B.w / 2 + 3;
    return { ux, uz, lx, lz, off, S: [A.x + ux * rA + lx * off, A.z + uz * rA + lz * off], E: [B.x - ux * rB + lx * off, B.z - uz * rB + lz * off], L: L - rA - rB };
  }
  function chooseNext(car) { const opts = car.b.nb.filter((n) => n !== car.a); car.c = opts.length ? opts[Math.floor(R() * opts.length)] : car.a; }
  function initCar(type) {
    const a = NODES[Math.floor(R() * NODES.length)]; const b = a.nb[Math.floor(R() * a.nb.length)];
    const car = { a, b, c: null, t: R(), phase: 'seg', type, col: type === 'bus' ? pick([HX('#2f8f6b'), HX('#e0a92e'), HX('#3b6fb0')]) : (type === 'truck' ? pick([HX('#f2f2f2'), HX('#3a6ea5'), HX('#c94f3a')]) : pick(PAL.car)), sp: type === 'bus' ? 8 : 9 + R() * 5, x: 0, z: 0, h: 0 };
    car.seg = segFor(car); car.t = R() * car.seg.L; chooseNext(car); cars.push(car);
  }
  for (let i = 0; i < 150; i++) initCar(i < 8 ? 'bus' : (i < 22 ? 'truck' : 'car'));
  const greenX = (n) => n.sig ? (Math.floor((TIME + n.off) / 14) % 2 === 0) : true;
  function stepCar(c, dt) {
    let d = c.sp * dt;
    if (c.phase === 'seg') {
      const rem = c.seg.L - c.t; const alongX = Math.abs(c.seg.ux) > 0.5;
      if (c.b.sig && rem > 0.3 && rem < 9 && (greenX(c.b) !== alongX)) d = Math.min(d, Math.max(0, rem - 1.2));
      if (c.lead !== undefined && c.lead !== null) d = Math.min(d, Math.max(0, c.lead - 7.5));
    }
    while (d > 0) {
      if (c.phase === 'seg') {
        const rem = c.seg.L - c.t;
        if (d < rem) { c.t += d; d = 0; }
        else { d -= rem; c.phase = 'turn'; c.tt = 0;
          const nxt = { a: c.b, b: c.c }; const ns = segFor(nxt);
          c.turn = { P0: c.seg.E, P2: ns.S, P1: [c.b.x + c.seg.lx * c.seg.off + ns.lx * ns.off, c.b.z + c.seg.lz * c.seg.off + ns.lz * ns.off], ns };
          if (c.c === c.a) c.turn.P1 = [c.b.x, c.b.z];
          c.turn.L = Math.hypot(c.turn.P1[0] - c.turn.P0[0], c.turn.P1[1] - c.turn.P0[1]) + Math.hypot(c.turn.P2[0] - c.turn.P1[0], c.turn.P2[1] - c.turn.P1[1]);
        }
      } else {
        const rem = c.turn.L * (1 - c.tt);
        if (d < rem) { c.tt += d / c.turn.L; d = 0; }
        else { d -= rem; c.a = c.b; c.b = c.c; c.seg = c.turn.ns; c.t = 0; c.phase = 'seg'; chooseNext(c); }
      }
    }
    if (c.phase === 'seg') { c.x = c.seg.S[0] + c.seg.ux * c.t; c.z = c.seg.S[1] + c.seg.uz * c.t; c.h = Math.atan2(c.seg.uz, c.seg.ux); }
    else { const { P0, P1, P2 } = c.turn, t = c.tt, u = 1 - t;
      c.x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0]; c.z = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1];
      const tx = 2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]), tz = 2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]); c.h = Math.atan2(tz, tx); }
  }
  // pedestrians on sidewalks
  const peds = [];
  for (let i = 0; i < 320; i++) {
    const rg = city.rings[Math.floor(R() * city.rings.length)];
    const per = 2 * ((rg.x1 - rg.x0) + (rg.z1 - rg.z0));
    peds.push({ rg, per, s: R() * per, v: (0.9 + R() * 0.7) * (R() < 0.5 ? 1 : -1), shirt: pick([HX('#3b5ba5'), HX('#c0392b'), HX('#f2f2f2'), HX('#2d2d2d'), HX('#e6b33a'), HX('#5a8f5a'), HX('#8e5ba5'), HX('#d97b3a')]), legs: pick([HX('#2b2f3a'), HX('#3a3f4a'), HX('#6b5a4a')]), h: 1.55 + R() * 0.25, bob: R() * 6 });
  }
  function pedPos(p) {
    const { rg } = p; const w = rg.x1 - rg.x0, d = rg.z1 - rg.z0; let s = ((p.s % p.per) + p.per) % p.per;
    if (s < w) return [rg.x0 + s, rg.z0, 0]; s -= w;
    if (s < d) return [rg.x1, rg.z0 + s, Math.PI / 2]; s -= d;
    if (s < w) return [rg.x1 - s, rg.z1, Math.PI]; s -= w;
    return [rg.x0, rg.z1 - s, -Math.PI / 2];
  }
  // boats
  const boats = [
    { kind: 'ferry', path: [[-52, 262], [-110, 380], [-200, 470], [-110, 380]], t: 0, sp: 6, L: 26, W: 7 },
    { kind: 'fish', cx: 40, cz: 300, r: 60, a: 0, sp: 0.05, L: 10, W: 3.2 },
    { kind: 'fish', cx: -150, cz: 280, r: 45, a: 2, sp: -0.06, L: 9, W: 3 },
    { kind: 'yacht', cx: 120, cz: 420, r: 90, a: 4, sp: 0.03, L: 8, W: 2.6 }
  ];

  // ---------------- dynamic geometry each frame ----------------
  const DYN = new Geo(1 << 15);
  function buildDyn(night) {
    const g = DYN.reset();
    for (const c of cars) {
      const yb = 0.05;
      if (c.type === 'bus') {
        rbox(g, c.x, c.z, c.h, -5.6, 5.6, 2.5, yb + 0.35, yb + 3.1, c.col, { ao: 0.7, top: HX('#e8e8e4') });
        rbox(g, c.x, c.z, c.h, -5.3, 5.5, 2.54, yb + 1.5, yb + 2.6, HX('#26323c'), { m: 1 });
        rbox(g, c.x, c.z, c.h, 5.55, 5.62, 2.0, yb + 0.8, yb + 1.1, HX('#fff4d0'), { m: 8 });
        rbox(g, c.x, c.z, c.h, -5.62, -5.55, 2.0, yb + 0.8, yb + 1.1, HX('#ff3a2a'), { m: 8 });
      } else if (c.type === 'truck') {
        rbox(g, c.x, c.z, c.h, -3.6, 1.4, 2.3, yb + 0.5, yb + 3.0, c.col, { ao: 0.75 });
        rbox(g, c.x, c.z, c.h, 1.5, 3.4, 2.2, yb + 0.4, yb + 2.3, HX('#e9e9e4'), { ao: 0.75 });
        rbox(g, c.x, c.z, c.h, 2.6, 3.42, 2.0, yb + 1.3, yb + 2.1, HX('#26323c'), { m: 1 });
        rbox(g, c.x, c.z, c.h, 3.4, 3.46, 1.8, yb + 0.6, yb + 0.85, HX('#fff4d0'), { m: 8 });
      } else {
        rbox(g, c.x, c.z, c.h, -2.15, 2.15, 1.75, yb + 0.28, yb + 0.95, c.col, { ao: 0.6 });
        rbox(g, c.x, c.z, c.h, -1.25, 0.85, 1.58, yb + 0.95, yb + 1.45, mulc(c.col, 0.9), { mf: 1, mb: 1 });
        rbox(g, c.x, c.z, c.h, -1.2, 0.8, 1.6, yb + 1.0, yb + 1.38, HX('#26323c'), { m: 1 });
        rbox(g, c.x, c.z, c.h, 2.13, 2.18, 1.4, yb + 0.6, yb + 0.8, HX('#fff4d0'), { m: 8 });
        rbox(g, c.x, c.z, c.h, -2.18, -2.13, 1.4, yb + 0.62, yb + 0.8, HX('#ff3a2a'), { m: 8 });
      }
    }
    for (const p of peds) {
      const [x, z, a] = pedPos(p); const y = city.BH; const k = 0.06 * Math.abs(Math.sin(p.bob));
      rbox(g, x, z, a, -0.15, 0.15, 0.36, y, y + p.h * 0.5, p.legs, { ao: 0.8 });
      rbox(g, x, z, a, -0.17, 0.17, 0.46, y + p.h * 0.5, y + p.h * 0.84 + k, p.shirt, { ao: 0.9 });
      rbox(g, x, z, a, -0.12, 0.12, 0.24, y + p.h * 0.84 + k, y + p.h + k, HX('#e0b593'), { ao: 1 });
    }
    for (const b of boats) {
      const hull = b.kind === 'ferry' ? HX('#f4f4f0') : (b.kind === 'yacht' ? HX('#ffffff') : HX('#3a6ea5'));
      const bob = Math.sin(b.ph || 0) * 0.15;
      rbox(g, b.x, b.z, b.h, -b.L / 2, b.L / 2 - b.W * 0.4, b.W, -0.9 + bob, 0.9 + bob, hull, { ao: 0.7 });
      rbox(g, b.x, b.z, b.h, b.L / 2 - b.W * 0.4, b.L / 2, b.W * 0.55, -0.9 + bob, 0.9 + bob, hull, { ao: 0.7 });
      rbox(g, b.x, b.z, b.h, -b.L / 2, b.L / 2, b.W * 1.01, -0.95 + bob, -0.4 + bob, HX('#b33a2e'), { ao: 1 });
      if (b.kind === 'ferry') { rbox(g, b.x, b.z, b.h, -b.L * 0.35, b.L * 0.25, b.W * 0.86, 0.9 + bob, 3.6 + bob, HX('#e9ecef')); rbox(g, b.x, b.z, b.h, -b.L * 0.34, b.L * 0.24, b.W * 0.88, 1.8 + bob, 2.9 + bob, HX('#26323c'), { m: 1 }); rbox(g, b.x, b.z, b.h, -b.L * 0.1, 0, b.W * 0.4, 3.6 + bob, 6 + bob, HX('#2f6f9e')); }
      else if (b.kind === 'fish') { rbox(g, b.x, b.z, b.h, -b.L * 0.3, b.L * 0.05, b.W * 0.7, 0.9 + bob, 2.8 + bob, HX('#f2f2ee')); rbox(g, b.x, b.z, b.h, -b.L * 0.05, 0.0, 0.2, 2.8 + bob, 5.5 + bob, HX('#dddddd')); }
      else { rbox(g, b.x, b.z, b.h, -0.1, 0.1, 0.12, 0.9 + bob, 9 + bob, HX('#dddddd')); q(g, [b.x, 1.6 + bob, b.z], [b.x, 8.5 + bob, b.z], [b.x - Math.cos(b.h) * 3.5, 1.8 + bob, b.z - Math.sin(b.h) * 3.5], [b.x - Math.cos(b.h) * 3.5, 1.8 + bob, b.z - Math.sin(b.h) * 3.5], HX('#fbfbf6')); }
    }
    // signal heads
    for (const sg of city.signals) { const gx = greenX(sg.n);
      sg.cs.forEach(([px, pz], k) => { const on = k < 2 ? gx : !gx; box(g, px - 0.27, city.BH + (on ? 4.35 : 4.85), pz - 0.27, px + 0.27, city.BH + (on ? 4.7 : 5.2), pz + 0.27, on ? HX('#3dff8a') : HX('#ff3b2a'), { m: 7, ao: 1, top: HX('#2f3337') }); }); }
    // flags
    if (city.FEAT.flags) for (const [fx, fy, fz] of city.FEAT.flags) { const t = TIME * 3; const pts = []; for (let k = 0; k <= 4; k++) pts.push([fx + k * 0.9, fy - 0.2 + Math.sin(t + k) * 0.15 * k * 0.4, fz + Math.sin(t * 1.3 + k * 0.9) * 0.25 * k]);
      for (let k = 0; k < 4; k++) q(g, [pts[k][0], pts[k][1] - 1.4, pts[k][2]], [pts[k + 1][0], pts[k + 1][1] - 1.4, pts[k + 1][2]], [pts[k + 1][0], pts[k + 1][1], pts[k + 1][2]], [pts[k][0], pts[k][1], pts[k][2]], fx < 34 ? HX('#2f6fae') : HX('#f2f2ee')); }
    // construction effects
    for (const cn of constructions) {
      const b = cn.b; const p = cn.p; if (p >= 1) continue;
      const sc = HX('#d98a3a'), h = b.h * Math.min(1, p * 1.3 + 0.1);
      for (const [x, z] of [[b.x0 - 0.6, b.z0 - 0.6], [b.x1 + 0.6, b.z0 - 0.6], [b.x1 + 0.6, b.z1 + 0.6], [b.x0 - 0.6, b.z1 + 0.6]]) box(g, x - 0.12, Y, z - 0.12, x + 0.12, Y + h, z + 0.12, sc, { ao: 1 });
      for (let yy = Y + 2; yy < Y + h; yy += 2.2) { box(g, b.x0 - 0.7, yy, b.z0 - 0.7, b.x1 + 0.7, yy + 0.12, b.z0 - 0.5, sc, { ao: 1 }); box(g, b.x0 - 0.7, yy, b.z1 + 0.5, b.x1 + 0.7, yy + 0.12, b.z1 + 0.7, sc, { ao: 1 }); box(g, b.x0 - 0.7, yy, b.z0 - 0.7, b.x0 - 0.5, yy + 0.12, b.z1 + 0.7, sc, { ao: 1 }); box(g, b.x1 + 0.5, yy, b.z0 - 0.7, b.x1 + 0.7, yy + 0.12, b.z1 + 0.7, sc, { ao: 1 }); }
      for (let k = 0; k < 14; k++) { const a = k * 2.4 + TIME * 0.8, rr = 2 + ((k * 7.3 + TIME * 3) % 7); const px = (b.x0 + b.x1) / 2 + Math.cos(a) * (b.x1 - b.x0) * 0.4 * rr / 5, pz = (b.z0 + b.z1) / 2 + Math.sin(a) * (b.z1 - b.z0) * 0.4 * rr / 5; const s = 0.6 + (k % 3) * 0.3; const yy = Y + ((k * 1.7 + TIME * 2) % 3);
        box(g, px - s, yy, pz - s, px + s, yy + s, pz + s, HX('#cbbf9f'), { ao: 1 }); }
    }
    return g.view();
  }

  // ---------------- infra network (地下の仕組み) ----------------
  const F = city.FEAT;
  const cx = (b) => (b.x0 + b.x1) / 2, cz = (b) => (b.z0 + b.z1) / 2;
  function tube(g, pts, w, col, y) {
    let acc = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1]; const L = Math.hypot(bx - ax, bz - az); const n = Math.max(1, Math.ceil(L / 6));
      const ux = (bx - ax) / L, uz = (bz - az) / L, px = -uz * w / 2, pz = ux * w / 2;
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1; const u0 = acc + L * t0, u1 = acc + L * t1;
        q(g, [x0 + px, y + w * 0.5, z0 + pz], [x0 - px, y + w * 0.5, z0 - pz], [x1 - px, y + w * 0.5, z1 - pz], [x1 + px, y + w * 0.5, z1 + pz], col, 4, 0, [u0, u0, u1, u1], [0, 1, 0]);
        q(g, [x0 + px, y, z0 + pz], [x0 + px, y + w * 0.5, z0 + pz], [x1 + px, y + w * 0.5, z1 + pz], [x1 + px, y, z1 + pz], mulc(col, 0.7), 4, 0, [u0, u0, u1, u1]);
        q(g, [x0 - px, y, z0 - pz], [x0 - px, y + w * 0.5, z0 - pz], [x1 - px, y + w * 0.5, z1 - pz], [x1 - px, y, z1 - pz], mulc(col, 0.7), 4, 0, [u0, u0, u1, u1]); }
      acc += L;
    }
  }
  function node(g, x, z, r, col, h) { cyl(g, x, z, 0.2, h || 1.6, r, 18, col, { m: 4 }); }
  function buildInfra() {
    const g = new Geo(1 << 14);
    const BLUE = HX('#4aa3ff'), VIO = HX('#b48cff'), RED = HX('#ff5a3c'), GRN = HX('#56d68a');
    const hall = [cx(F.hall), cz(F.hall)];
    // trunk lines along roads
    tube(g, [[0, -500], [0, -250], [0, 0], [-240, 0]], 1.6, BLUE, 0.4);
    tube(g, [[0, 0], [240, 0]], 1.6, BLUE, 0.4);
    tube(g, [[0, -80], [80, -80]], 1.1, BLUE, 0.4);
    tube(g, [[40, -80], [hall[0], hall[1]]], 1.1, BLUE, 0.4);
    tube(g, [[-80, 0], [-80, 40], [cx(F.school), cz(F.school)]], 1.1, S.answered.school ? GRN : RED, 0.4);
    tube(g, [[-160, -80], [-160, -40], [cx(F.clinic), cz(F.clinic)]], 1.1, BLUE, 0.4);
    tube(g, [[80, 0], [80, 160], [150, 180]], 1.1, BLUE, 0.4);
    tube(g, [[F.tower.x, F.tower.z], [0, -500]], 1.6, BLUE, 0.4);
    node(g, F.tower.x, F.tower.z, 4, BLUE, 3); node(g, hall[0], hall[1], 3.2, BLUE);
    node(g, cx(F.clinic), cz(F.clinic), 2.4, BLUE); node(g, 150, 180, 2.4, BLUE);
    node(g, cx(F.school), cz(F.school), S.answered.school ? 2.6 : 3.6, S.answered.school ? GRN : RED, S.answered.school ? 1.6 : 2.4);
    if (S.answered.school === 'learned') { node(g, cx(F.school) - 22, cz(F.school) + 12, 2.0, GRN); tube(g, [[cx(F.school), cz(F.school)], [cx(F.school) - 22, cz(F.school) + 12]], 0.9, GRN, 0.4); }
    if (S.answered.board) {
      const an = [cx(F.annex), cz(F.annex)]; const col = S.answered.board === 'learned' ? VIO : HX('#8a9099');
      tube(g, [[cx(F.board), cz(F.board)], [cx(F.board), cz(F.board) - 8], [an[0], cz(F.board) - 8], an], 1.2, col, 0.6);
      node(g, an[0], an[1], 3, col, 2.2);
      if (S.answered.shop) tube(g, [[cx(F.shopMain), cz(F.shopMain)], [cx(F.shopMain), 0], [an[0], 0], an], 1.0, col, 0.6);
    }
    const TEAL = HX('#3fd0c0'), ORG = HX('#ffb000');
    if (S.answered.clinic) { const dv = [cx(F.dbvault), cz(F.dbvault)]; const col = S.answered.clinic === 'learned' ? TEAL : HX('#8a9099'); tube(g, [[F.clinic.x1 + 1.6, cz(F.clinic)], [F.clinic.x1 + 1.6, dv[1]], [F.dbvault.x1 + 0.6, dv[1]]], 1.2, col, 0.6); tube(g, [[-80, cz(F.clinic)], [F.clinic.x1 + 1.6, cz(F.clinic)]], 1.0, BLUE, 0.4); node(g, dv[0], dv[1], 2.8, col, 2); }
    const wh = [cx(F.warehouse), cz(F.warehouse)], gt = [cx(F.gate), cz(F.gate)];
    if (S.answered.harbor === 'learned') { tube(g, [[250, 0], [250, 150], [gt[0], 150], gt], 1.2, ORG, 0.4); node(g, gt[0], gt[1], 3, ORG, 2.2); tube(g, [gt, wh], 1.1, GRN, 0.5); tube(g, [[80, 160], [80, 150], [gt[0] + 4, 150], [gt[0] + 4, gt[1]]], 1.0, GRN, 0.45); }
    else if (S.answered.harbor) { tube(g, [[250, 0], [250, 150], [wh[0], 150], wh], 1.2, HX('#8a9099'), 0.4); node(g, wh[0], wh[1], 2.6, HX('#8a9099'), 2); }
    else { tube(g, [[250, 0], [250, 150], [wh[0], 150], wh], 1.2, RED, 0.4); node(g, wh[0], wh[1], 3.2, RED, 2.4); }
    E.setMesh('infra', g.out(), true);
  }
  buildInfra();
  function applyInfoColors() {
    for (const b of city.B.concat(S.built)) {
      const rise = Math.round(E.getRise(b.id) * 255);
      if (S.view === 'happy') { const h = S.buildingsHappy.get(b.id) || 0.6; const t = Math.max(0, Math.min(1, (h - 0.35) / 0.55));
        const c = t < 0.5 ? [1, 0.35 + t * 1.1, 0.25] : [1 - (t - 0.5) * 1.3, 0.9, 0.35 + (t - 0.5) * 0.3]; E.setData(b.id, c[0] * 255, c[1] * 255, c[2] * 255, rise); }
      else if (S.view === 'infra') {
        let c = [0, 0, 0];
        if (b === F.annex) c = S.answered.board === 'learned' ? [0.75, 0.6, 1] : [0.55, 0.58, 0.62];
        if (b === F.school) c = S.answered.school ? [0.4, 0.85, 0.55] : [1, 0.45, 0.35];
        if (b === F.hall || b === F.clinic || b.kind === 'tower') c = [0.4, 0.65, 1];
        if (b === F.board) c = S.answered.board ? [0.75, 0.6, 1] : [1, 0.75, 0.4];
        if (b === F.shopMain) c = S.answered.shop ? [0.75, 0.6, 1] : [1, 0.85, 0.45];
        if (b === F.dbvault) c = [0.3, 0.85, 0.78];
        if (b === F.gate) c = [1, 0.7, 0.2];
        if (b === F.warehouse) c = S.answered.harbor === 'learned' ? [0.4, 0.85, 0.55] : (S.answered.harbor ? [0.55, 0.58, 0.62] : [1, 0.45, 0.35]);
        E.setData(b.id, c[0] * 255, c[1] * 255, c[2] * 255, rise);
      } else E.setData(b.id, 0, 0, 0, rise);
    }
  }

  // ---------------- constructions ----------------
  const constructions = [];
  function construct(b, dur, onDone) {
    E.setData(b.id, 0, 0, 0, 0);
    constructions.push({ b, p: 0, dur: dur || 3.2, onDone });
  }

  // ---------------- player buildings (zoning) ----------------
  let dynBuilt = new Float32Array(0);
  function rebuildBuilt() {
    const g = new Geo(1 << 14);
    // player roads and the lots they opened
    for (const rd of S.roads) roadGeo(g, rd);
    for (const L of city.lots) if (L.y0 !== undefined) { const y = L.y0; q(g, [L.x0 + 0.3, y, L.z0 + 0.3], [L.x0 + 0.3, y, L.z1 - 0.3], [L.x1 - 0.3, y, L.z1 - 0.3], [L.x1 - 0.3, y, L.z0 + 0.3], L.taken ? HX('#66854a') : HX('#9c8f6e'), 0, 0, 0, [0, 1, 0]); }
    for (const L of city.lots) if (L.zone && !L.taken) { const y = (L.y0 !== undefined ? L.y0 : city.Y) + 0.04; const c = L.zone === 'home' ? HX('#5fae6a') : HX('#5a8fd0');
      q(g, [L.x0 + 0.6, y, L.z0 + 0.6], [L.x0 + 0.6, y, L.z1 - 0.6], [L.x1 - 0.6, y, L.z1 - 0.6], [L.x1 - 0.6, y, L.z0 + 0.6], c, 0, 0, 0, [0, 1, 0]);
      const sx = (L.x0 + L.x1) / 2, sz = L.z0 + 1.5; box(g, sx - 0.06, y, sz - 0.06, sx + 0.06, y + 1.6, sz + 0.06, HX('#8a6a48')); box(g, sx - 0.7, y + 1.0, sz - 0.04, sx + 0.7, y + 1.7, sz + 0.04, HX('#f4efe0')); }
    for (const b of S.built) {
      const id = b.id; const Y = b.lot && b.lot.y0 !== undefined ? b.lot.y0 : city.Y;
      if (b.kind === 'house') {
        const w = b.x1 - b.x0, d = b.z1 - b.z0; const wall = b.wall, roof = b.roof; const h = b.floors * 2.9 + 0.4;
        box(g, b.x0, Y, b.z0, b.x1, Y + h, b.z1, wall, { id, noTop: true, ao: 0.78 });
        box(g, b.x0 - 0.05, Y, b.z0 - 0.05, b.x1 + 0.05, Y + 0.45, b.z1 + 0.05, HX('#9b958a'), { id, ao: 0.9 });
        gable(g, b.x0, b.z0, b.x1, b.z1, Y + h, 2.2, 0.55, w > d ? 'x' : 'z', roof, wall, id);
        for (const f of faces(b.x0, b.z0, b.x1, b.z1)) windows(g, f, Y + 0.45, b.floors, 2.9, 2.6, 1.1, 1.25, 0.85, HX('#2a3a48'), id, 1.2);
      } else if (b.kind === 'shop') {
        const h = 3.6 + 3.2 + 0.5;
        box(g, b.x0, Y, b.z0, b.x1, Y + h, b.z1, b.wall, { id, top: HX('#6c6d6b'), mt: 10, ao: 0.75 });
        for (const f of faces(b.x0, b.z0, b.x1, b.z1)) { fquad(g, f, 0.5, f.L - 0.5, Y + 0.3, Y + 3.0, 0.06, HX('#3a5568'), 1, id, (b.id * 7) % 997 + 0.5);
          const a0 = fp(f, 0.3, Y + 3.5, 0.05), a1 = fp(f, f.L - 0.3, Y + 3.5, 0.05), a2 = fp(f, f.L - 0.3, Y + 2.9, 1.6), a3 = fp(f, 0.3, Y + 2.9, 1.6); q(g, a0, a1, a2, a3, b.roof, 0, id);
          fquad(g, f, 0.4, f.L - 0.4, Y + 3.6, Y + 4.4, 0.08, b.sign, 8, id); windows(g, f, Y + 3.6, 1, 3.2, 2.6, 1.3, 1.5, 1.0, HX('#2a3a48'), id, 1.0); }
      } else if (b.kind === 'park') {
        q(g, [b.x0, Y + 0.03, b.z0], [b.x0, Y + 0.03, b.z1], [b.x1, Y + 0.03, b.z1], [b.x1, Y + 0.03, b.z0], HX('#6fa04a'), 0, id, 0, [0, 1, 0]);
        for (const [tx, tz, cc] of b.trees) { box(g, tx - 0.2, Y, tz - 0.2, tx + 0.2, Y + 2.6, tz + 0.2, HX('#5c4532'), { id }); GEN.blob(g, tx, Y + 4.2, tz, 2.4, 2.2, 2.4, cc, R, 1, id); }
        rbox(g, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, 0, -1.2, 1.2, 0.5, Y + 0.4, Y + 0.5, HX('#7a5a3e'), { id });
      }
    }
    dynBuilt = g.out(); E.setMesh('built', dynBuilt, true);
  }
  function lotMarkers() {
    const g = new Geo(4096); const col = S.tool === 'home' ? HX('#56d68a') : S.tool === 'shop' ? HX('#4aa3ff') : HX('#e7d36b');
    for (const L of city.lots) { if (L.taken || (L.zone && S.tool !== 'park')) continue; const p = 0.6; const Y = L.y0 !== undefined ? L.y0 : city.Y; for (let gx = L.x0 + p + 2; gx < L.x1 - p - 1; gx += 3) for (let gz = L.z0 + p + 2; gz < L.z1 - p - 1; gz += 3) q(g, [gx - 0.18, Y + 0.06, gz - 0.18], [gx - 0.18, Y + 0.06, gz + 0.18], [gx + 0.18, Y + 0.06, gz + 0.18], [gx + 0.18, Y + 0.06, gz - 0.18], mulc(col, 0.8), 6, 0, 0, [0, 1, 0]);
      for (const [a0, c0, a1, c1] of [[L.x0 + p, L.z0 + p, L.x1 - p, L.z0 + p + 0.4], [L.x0 + p, L.z1 - p - 0.4, L.x1 - p, L.z1 - p], [L.x0 + p, L.z0 + p, L.x0 + p + 0.4, L.z1 - p], [L.x1 - p - 0.4, L.z0 + p, L.x1 - p, L.z1 - p]]) q(g, [a0, Y + 0.08, c0], [a0, Y + 0.08, c1], [a1, Y + 0.08, c1], [a1, Y + 0.08, c0], col, 6, 0, 0, [0, 1, 0]); }
    E.setMesh('lots', g.out(), true);
  }
  const COST = { home: 120, shop: 180, park: 80 };
  // ---------------- roads (player) ----------------
  S.roads = []; S.roadStart = null;
  const RW = 11, ROAD_COST = 2;
  const TH = city.terrainH;
  const nearNode = (x, z, r) => { let best = null, bd = r; for (const n of NODES) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } } return best; };
  function snapPoint(g) { const n = nearNode(g[0], g[1], 16); if (n) return { x: n.x, z: n.z, node: n }; return { x: Math.round(g[0] / 10) * 10, z: Math.round(g[1] / 10) * 10, node: null }; }
  function roadPlan(a, p) {
    const dx = p.x - a.x, dz = p.z - a.z; let b;
    if (Math.abs(dx) >= Math.abs(dz)) b = { x: a.x + Math.round(dx / 10) * 10, z: a.z }; else b = { x: a.x, z: a.z + Math.round(dz / 10) * 10 };
    const en = nearNode(b.x, b.z, 8); if (en && (en.x === a.x || en.z === a.z)) { b.x = en.x; b.z = en.z; b.node = en; }
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const res = { a, b, L, cost: Math.round(L * ROAD_COST), ok: true, why: '' };
    if (L < 20) { res.ok = false; res.why = '短すぎる（20 m 以上）'; return res; }
    if (L > 400) { res.ok = false; res.why = '長すぎる（400 m まで）'; return res; }
    const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
    for (let t = 0; t <= L; t += 5) for (const o of [-RW / 2, 0, RW / 2]) {
      const x = a.x + ux * t - uz * o, z = a.z + uz * t + ux * o;
      const nearEnd = (t < 10 && a.node) || (t > L - 10 && b.node);
      if (!nearEnd && x > -248 && x < 248 && z > -248 && z < 208) { res.ok = false; res.why = '街の中には引けない（今ある道の端から外へ伸ばす）'; return res; }
      if (x > 249 && Math.abs(z - 30 * Math.sin((x - 249) * 0.005)) < 12) { res.ok = false; res.why = '町の外へ出る道と重なる'; return res; }
      const h = TH(x, z); if (h < -0.5) { res.ok = false; res.why = '水の上には引けない'; return res; } if (h > 3.5) { res.ok = false; res.why = '坂が急すぎる'; return res; }
      for (const bd of city.B.concat(S.built)) if (x > bd.x0 - 1 && x < bd.x1 + 1 && z > bd.z0 - 1 && z < bd.z1 + 1) { res.ok = false; res.why = '建物に当たる'; return res; }
      for (const L2 of city.lots) if (L2.taken && x > L2.x0 && x < L2.x1 && z > L2.z0 && z < L2.z1) { res.ok = false; res.why = '建てた区画に当たる'; return res; }
      for (const rd of S.roads) { const rx0 = Math.min(rd.a.x, rd.b.x) - RW / 2, rx1 = Math.max(rd.a.x, rd.b.x) + RW / 2, rz0 = Math.min(rd.a.z, rd.b.z) - RW / 2, rz1 = Math.max(rd.a.z, rd.b.z) + RW / 2;
        if (!nearEnd && t > 8 && t < L - 8 && x > rx0 && x < rx1 && z > rz0 && z < rz1) { res.ok = false; res.why = '引いた道と重なる'; return res; } }
    }
    if (S.money < res.cost) { res.ok = false; res.why = '資金が足りない（¥' + res.cost + '）'; }
    return res;
  }
  function roadY(x, z) { return Math.max(TH(x, z), TH(x + 4, z), TH(x - 4, z), TH(x, z + 4), TH(x, z - 4), 0) + 0.14; }
  function roadGeo(g, rd, col) {
    const { a, b, L } = rd; const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, px = -uz, pz = ux; const n = Math.ceil(L / 10);
    for (let i = 0; i < n; i++) { const t0 = i / n * L, t1 = (i + 1) / n * L; const x0 = a.x + ux * t0, z0 = a.z + uz * t0, x1 = a.x + ux * t1, z1 = a.z + uz * t1; const y0 = roadY(x0, z0), y1 = roadY(x1, z1);
      for (const [o0, o1, c, dy] of [[-RW / 2 - 2, -RW / 2, HX('#b9b5ab'), 0.12], [RW / 2, RW / 2 + 2, HX('#b9b5ab'), 0.12], [-RW / 2, RW / 2, col || HX('#4a4e54'), 0]])
        q(g, [x0 + px * o0, y0 + dy, z0 + pz * o0], [x0 + px * o1, y0 + dy, z0 + pz * o1], [x1 + px * o1, y1 + dy, z1 + pz * o1], [x1 + px * o0, y1 + dy, z1 + pz * o0], c, col ? 6 : 0, 0, 0, [0, 1, 0]);
      if (!col && i % 2 === 0) { const mx0 = x0 + ux * 2, mz0 = z0 + uz * 2, mx1 = x0 + ux * 6, mz1 = z0 + uz * 6; q(g, [mx0 - px * 0.12, y0 + 0.02, mz0 - pz * 0.12], [mx0 + px * 0.12, y0 + 0.02, mz0 + pz * 0.12], [mx1 + px * 0.12, y1 + 0.02, mz1 + pz * 0.12], [mx1 - px * 0.12, y1 + 0.02, mz1 - pz * 0.12], HX('#ece8dc'), 0, 0, 0, [0, 1, 0]); }
    }
    if (!col) for (let t = 12; t < L - 6; t += 30) { const x = a.x + ux * t + px * (RW / 2 + 1), z = a.z + uz * t + pz * (RW / 2 + 1), y = roadY(x, z);
      box(g, x - 0.09, y, z - 0.09, x + 0.09, y + 6.2, z + 0.09, HX('#5d6166'), { ao: 0.9 }); box(g, x - px * 1.4 - 0.35, y + 5.75, z - pz * 1.4 - 0.35, x - px * 1.4 + 0.35, y + 6.0, z - pz * 1.4 + 0.35, HX('#e8e2c8'), { m: 3, ao: 1 }); }
  }
  function addRoad(plan) {
    const { a, b } = plan; S.money -= plan.cost; ledger('道路を引いた（' + Math.round(plan.L) + ' m）', -plan.cost);
    const na = a.node || (() => { const n = { x: a.x, z: a.z, nb: [], w: RW }; NODES.push(n); return n; })();
    const nb2 = b.node || (() => { const n = { x: b.x, z: b.z, nb: [], w: RW }; NODES.push(n); return n; })();
    na.nb.push(nb2); nb2.nb.push(na);
    const rd = { a: { x: a.x, z: a.z }, b: { x: b.x, z: b.z }, L: plan.L }; S.roads.push(rd);
    // open lots on both sides
    const ux = (b.x - a.x) / plan.L, uz = (b.z - a.z) / plan.L, px = -uz, pz = ux; let opened = 0;
    for (let t = 9; t + 14 <= plan.L - 8; t += 15) for (const side of [-1, 1]) {
      const c0 = [a.x + ux * t + px * side * (RW / 2 + 2.5), a.z + uz * t + pz * side * (RW / 2 + 2.5)], c1 = [a.x + ux * (t + 14) + px * side * (RW / 2 + 24.5), a.z + uz * (t + 14) + pz * side * (RW / 2 + 24.5)];
      const L = { x0: Math.min(c0[0], c1[0]), x1: Math.max(c0[0], c1[0]), z0: Math.min(c0[1], c1[1]), z1: Math.max(c0[1], c1[1]), front: '' };
      let ok = true, hs = [];
      for (const [x, z] of [[L.x0, L.z0], [L.x1, L.z0], [L.x0, L.z1], [L.x1, L.z1], [(L.x0 + L.x1) / 2, (L.z0 + L.z1) / 2]]) { const h = TH(x, z); hs.push(h); if (h < -0.5 || h > 3) ok = false; if (x > -248 && x < 248 && z > -248 && z < 208) ok = false; }
      if (!ok) continue;
      const hit = (o) => !(o.x1 < L.x0 || o.x0 > L.x1 || o.z1 < L.z0 || o.z0 > L.z1);
      if (city.B.some(hit) || city.lots.some(hit)) continue;
      if (S.roads.some((r2) => hit({ x0: Math.min(r2.a.x, r2.b.x) - RW / 2 - 2, x1: Math.max(r2.a.x, r2.b.x) + RW / 2 + 2, z0: Math.min(r2.a.z, r2.b.z) - RW / 2 - 2, z1: Math.max(r2.a.z, r2.b.z) + RW / 2 + 2 }))) continue;
      L.y0 = Math.max(...hs, 0) + 0.25; L.cx = (L.x0 + L.x1) / 2; L.cz = (L.z0 + L.z1) / 2; city.lots.push(L); opened++;
    }
    for (let k = 0; k < 4; k++) { const car = { a: na, b: nb2, c: null, t: k * plan.L / 5, phase: 'seg', type: 'car', col: pick(PAL.car), sp: 9 + R() * 4, x: 0, z: 0, h: 0 }; car.seg = segFor(car); car.t = Math.min(car.t, car.seg.L - 1); chooseNext(car); cars.push(car); }
    rebuildBuilt(); lotMarkers(); E.meshes.lots.visible = true;
    toast('道路を引いた', Math.round(plan.L) + ' m ・ ¥' + plan.cost + ' ・ 沿いに空き区画が ' + opened + ' つできた。住宅地や商業地を建てられる', '');
    sfxNote();
  }
  function previewRoad(plan) {
    const g = new Geo(2048);
    if (plan) roadGeo(g, plan, plan.ok ? HX('#56d68a') : HX('#ff6a45'));
    if (S.roadStart) { const x = S.roadStart.x, z = S.roadStart.z, y = roadY(x, z) + 0.3; GEN.cyl(g, x, z, y, y + 0.4, 3, 16, HX('#ffc35a'), { m: 6 }); }
    E.setMesh('preview', g.out(), true);
  }
  let lastPlanKey = '';
  const ZONE_COST = 20;
  S.ledger = [];
  function ledger(text, v) { S.ledger.unshift({ t: String(Math.floor(S.minute / 60) % 24).padStart(2, '0') + ':' + String(Math.floor(S.minute % 60)).padStart(2, '0'), text, v }); S.ledger.length = Math.min(S.ledger.length, 12); }
  function placeOnLot(L) {
    const kind = S.tool;
    if (kind === 'park') { if (S.money < COST.park) { toast('資金が足りない', '必要 ¥' + COST.park, 'warn'); return; } S.money -= COST.park; ledger('公園を作った', -COST.park); spawn(L, 'park'); return; }
    if (L.zone) { toast('指定済みの区画', (L.zone === 'home' ? '住宅地' : '商業地') + 'に指定してある。需要があると建物が建つ', 'warn'); return; }
    if (S.money < ZONE_COST) { toast('資金が足りない', '必要 ¥' + ZONE_COST, 'warn'); return; }
    S.money -= ZONE_COST; L.zone = kind; ledger((kind === 'home' ? '住宅地' : '商業地') + 'に指定した', -ZONE_COST);
    floater(L.cx || (L.x0 + L.x1) / 2, 4 + (L.y0 || Y), L.cz || (L.z0 + L.z1) / 2, kind === 'home' ? '住宅地' : '商業地', 'good');
    rebuildBuilt(); lotMarkers(); sfxNote();
  }
  function spawn(L, kind) {
    L.taken = true;
    const pad = 3.5; const id = S.nextId++;
    let b;
    if (kind === 'park') { const trees = []; for (let k = 0; k < 4; k++) trees.push([L.x0 + 3 + R() * (L.x1 - L.x0 - 6), L.z0 + 3 + R() * (L.z1 - L.z0 - 6), pick(PAL.leafA.concat(PAL.leafG))]);
      b = { id, kind: 'park', name: '小さな公園', x0: L.x0 + 0.6, z0: L.z0 + 0.6, x1: L.x1 - 0.6, z1: L.z1 - 0.6, h: 7, residents: 0, trees, player: true, lot: L }; }
    else {
      const w = L.x1 - L.x0, d = L.z1 - L.z0; const sw = Math.min(w, d) - 2 * pad, sd = Math.max(8, Math.min(11, Math.max(w, d) - 2 * pad));
      const x0 = (L.x0 + L.x1) / 2 - (w < d ? sw : sd) / 2, z0 = (L.z0 + L.z1) / 2 - (w < d ? sd : sw) / 2;
      b = { id, kind, name: kind === 'home' ? '新しい住宅' : '新しい商店', x0, z0, x1: x0 + (w < d ? sw : sd), z1: z0 + (w < d ? sd : sw), floors: 2, h: kind === 'home' ? 9.5 : 8, residents: kind === 'home' ? 5 : 2, jobs: kind === 'shop' ? 6 : 0,
        wall: jit(pick(PAL.wallHouse), 0.08, R), roof: kind === 'home' ? jit(pick(PAL.roofHouse), 0.15, R) : pick(PAL.awning), sign: pick(PAL.sign), player: true, lot: L };
      if (kind === 'home') b.kind = 'house';
    }
    b.bornH = S.day * 24 + Math.floor(S.minute / 60); S.built.push(b); S.buildingsHappy.set(id, kind === 'park' ? 0.7 : 0.72 + 0.06 * (S.goal > 2 ? 1 : 0));
    rebuildBuilt(); lotMarkers();
    construct(b, 2.6, () => { floater(cx(b), b.h + 2, cz(b), kind === 'park' ? '満足度 ↑' : (kind === 'home' ? '+' + b.residents + ' 人' : '+6 仕事'), 'good'); if (kind === 'park') for (const o of city.B) if (Math.hypot(cx(o) - cx(b), cz(o) - cz(b)) < 60) S.buildingsHappy.set(o.id, Math.min(1, (S.buildingsHappy.get(o.id) || 0.6) + 0.06)); });
    sfxNote();
  }
  function bulldoze(b) {
    if (!b.player) { toast('取り壊せない', '自分で建てた建物だけ取り壊せる', 'warn'); return; }
    S.built = S.built.filter((x) => x !== b); b.lot.taken = false; S.money += 30; ledger('取り壊して資材を売った', 30); rebuildBuilt(); lotMarkers(); select(null);
  }

  // ---------------- requests & lessons ----------------
  const REQ = {
    board: { id: 'board', who: '町内会長', icon: '町', color: '#ff9d4d', at: () => F.board, builds: () => F.annex, view: [-8, 6, 105, 0.62, -0.4], title: '掲示板を、誰がいつ直したか残したい', due: 3,
      quote: '「お祭りの日付が、いつの間にか書き換わっていたんです。誰が直したのか分かるようにしてもらえませんか。前の文面にも戻せると助かります」',
      conds: ['直した人と日時が残る', '前の文面に戻せる'], reward: '満足度 最大 +6', lesson: 'git',
      learnedOpt: { label: '役場の隣に記録庫を建てる', note: '学んだ手 ・ 中身が見える ・ 後の要望にも使える', cost: 200 },
      outOpt: { label: '外の業者に任せる', note: '学ばなくても選べる ・ 中身は見えない', cost: 900 } },
    school: { id: 'school', who: '港の学校の先生', icon: '学', color: '#6fb3ff', at: () => F.school, title: '昼休みになると校内の無線が止まる', due: 4,
      quote: '「昼休みにみんなが一斉につなぐと、授業の資料が開かなくなるんです。午後の授業までに何とかなりませんか」',
      conds: ['昼休みでも資料が開く', '新しい機械は最小限'], reward: '満足度 最大 +5', lesson: 'net',
      learnedOpt: { label: '中継器を 1 台足して振り分ける', note: '学んだ手 ・ 混む理由が見える', cost: 300 },
      outOpt: { label: '業者に回線を太くしてもらう', note: '学ばなくても選べる ・ 費用が高い', cost: 1200 } },
    shop: { id: 'shop', who: '商店街の会長', icon: '店', color: '#f2c14e', at: () => F.shopMain, title: '売上の控えを、なくさず残したい', due: 5, needs: 'board',
      quote: '「帳面が雨で濡れて、先月の売上が分からなくなりました。役場の記録庫みたいに残せませんか」',
      conds: ['毎日の控えが残る', '誰が書いたか分かる'], reward: '満足度 最大 +5', lesson: 'git',
      learnedOpt: { label: '記録庫に商店街の帳面をつなぐ', note: '前に学んだ記録庫をそのまま使える', cost: 100 },
      outOpt: { label: '外の業者に任せる', note: '学ばなくても選べる', cost: 800 } },
    clinic: { id: 'clinic', who: '診療所の受付', icon: '診', color: '#3fd0c0', at: () => F.clinic, builds: () => F.dbvault, view: [0, 0, 85, 0.62, -2.4], title: '予約の数が、帳面と合わない', due: 4,
      quote: '「同じ人の予約が 2 回書いてあったり、数えるたびに数が違ったりするんです。明日の予約が何件か、すぐ分かるようにしたい」',
      conds: ['日ごとの予約の数がすぐ分かる', '二重の予約を見つけられる'], reward: '満足度 最大 +5', lesson: 'db',
      learnedOpt: { label: '診療所の隣に帳簿の倉庫を建てる', note: '学んだ手 ・ 表にして数えられる', cost: 250 },
      outOpt: { label: '外の業者に予約の機械を入れてもらう', note: '学ばなくても選べる ・ 中身は見えない', cost: 1000 } },
    harbor: { id: 'harbor', who: '港の倉庫の番頭', icon: '港', color: '#ff7a59', at: () => F.warehouse, builds: () => F.gate, view: [0, 10, 110, 0.6, 2.6], title: '夜中に、知らない所から記録へつながろうとする', due: 4,
      quote: '「荷の記録を見る機械に、夜中に知らない所から何度もつなごうとした跡があるんです。うちの事務所からだけ見られるようにできませんか」',
      conds: ['事務所からは今まで通り見られる', '知らない所からは届かない'], reward: '満足度 最大 +5', lesson: 'sec',
      learnedOpt: { label: '港の入口に門番の小屋を建てる', note: '学んだ手 ・ 断った記録が残る', cost: 300 },
      outOpt: { label: '外の業者に見張ってもらう', note: '学ばなくても選べる ・ 毎月の費用がかさむ', cost: 1100 } }
  };
  const LESSONS = {
    git: { title: '変更を記録して共有する', tool: 'Git', edges: [['desk', 'vault', '記録する'], ['vault', 'shelf', '送る']], vh: 180, nodes: [{ id: 'desk', x: 95, y: 82, label: '手元の机', sub: '作業中の文面' }, { id: 'vault', x: 300, y: 82, label: '記録庫', sub: '直した履歴' }, { id: 'shelf', x: 505, y: 82, label: 'みんなの棚', sub: '町で共有' }],
      steps: [
        { t: '掲示板の文面を直す', d: '机の上にある「祭り 10/12」を「祭り 10/19」に書き換える。まだどこにも残っていない。', cmd: '（文面を編集）', facts: [['机', '10/19（直した）'], ['記録庫', 'まだ空'], ['棚', '10/12 のまま']],
          tok: { v1: ['desk', '10/12', 0, -36, 0], v2: ['desk', '10/19', 1, 36, 0] } },
        { t: '直した内容を記録する', d: '直した文面を記録庫に入れる。前の文面も消えずに一緒に残る。', cmd: 'git commit -m "祭りの日付を直す"', facts: [['机', '10/19'], ['記録庫', '10/12 → 10/19 の 2 件'], ['棚', '10/12 のまま']],
          tok: { v1: ['vault', '10/12', 1, -36, 0], v2: ['vault', '10/19', 1, 36, 0] } },
        { t: '記録には名前と日時がつく', d: '1 件ごとに「誰が・いつ・何を」が付く。あとから見れば、書き換えた人が分かる。', cmd: 'git log', facts: [['10/19 の記録', '会長 ・ 11/10 15:42'], ['10/12 の記録', '事務 ・ 10/01 09:10']],
          tok: { v1: ['vault', '10/12', 0, -36, 0], v2: ['vault', '10/19', 1, 36, 0], tag: ['vault', '会長 11/10', 1, 36, 30] } },
        { t: 'みんなの棚に送る', d: '記録庫の最新をみんなの棚に送る。町の誰が見ても 10/19 になる。', cmd: 'git push', facts: [['棚', '10/19（最新）'], ['記録庫', '2 件のまま']],
          tok: { v1: ['vault', '10/12', 0, -36, 0], v2: ['shelf', '10/19', 1, 0, 0], tag: ['vault', '会長 11/10', 0, 36, 30] } },
        { t: '前の文面に戻す', d: '間違いだったら、記録庫から 10/12 を取り出して戻せる。戻したこと自体も記録に残る。', cmd: 'git revert HEAD', facts: [['机', '10/12（戻した）'], ['記録庫', '3 件（戻した記録も残る）']],
          tok: { v1: ['desk', '10/12', 1, 0, 0], v2: ['shelf', '10/19', 0, 0, 0], tag: ['vault', '戻した記録', 1, 0, 30] } }
      ] },
    net: { title: '混む通り道を分ける', tool: 'ネットワーク', edges: [['room', 'ap1', ''], ['room', 'ap2', ''], ['ap1', 'net', ''], ['ap2', 'net', '']], vh: 240, nodes: [{ id: 'room', x: 95, y: 120, label: '教室の端末', sub: '30 台' }, { id: 'ap1', x: 300, y: 70, label: '中継器 1', sub: '1 台で受ける' }, { id: 'ap2', x: 300, y: 175, label: '中継器 2', sub: 'まだ無い' }, { id: 'net', x: 505, y: 120, label: '資料の置き場', sub: '学校の中' }],
      steps: [
        { t: '端末が 1 台の中継器に集まる', d: '昼休み、30 台が同じ中継器に一斉につなぐ。', cmd: '（観察）', facts: [['中継器 1', '30 台'], ['中継器 2', '無し']], tok: { a: ['room', '端末', 1, -28, 0], b: ['room', '端末', 1, 28, 0], c: ['room', '端末', 1, 80, 0] } },
        { t: '順番待ちができる', d: '中継器は一度に少しずつしか送れないので、待ち行列ができて資料が開かない。', cmd: 'ping 資料の置き場 → 遅い', facts: [['待ち', '長い'], ['応答', '2 秒以上']], tok: { a: ['ap1', '待ち', 1, -44, 0], b: ['ap1', '待ち', 1, 0, 0], c: ['ap1', '待ち', 1, 44, 0] } },
        { t: '中継器をもう 1 台置く', d: '廊下の反対側に中継器 2 を置く。電源とケーブルだけで済む。', cmd: '（中継器 2 を設置）', facts: [['中継器 2', '設置した']], tok: { a: ['ap1', '待ち', 1, -44, 0], b: ['ap1', '待ち', 1, 0, 0], c: ['ap1', '待ち', 1, 44, 0] } },
        { t: '近い方へ振り分ける', d: '端末を近い中継器へ分ける。1 台あたり 15 台になり、待ちが半分になる。', cmd: '（振り分けを設定）', facts: [['中継器 1', '15 台'], ['中継器 2', '15 台']], tok: { a: ['ap1', '端末', 1, -20, 0], b: ['ap2', '端末', 1, -20, 0], c: ['ap2', '端末', 1, 28, 0] } },
        { t: '資料がすぐ開く', d: '待ちが減って、昼休みでも資料が開くようになる。', cmd: 'ping 資料の置き場 → 速い', facts: [['応答', '0.1 秒'], ['待ち', 'ほぼ無し']], tok: { a: ['net', '届いた', 1, -36, 0], b: ['net', '届いた', 1, 16, 0], c: ['net', '届いた', 1, 68, 0] } }
      ] }
  };

  LESSONS.db = { title: '帳簿の数を数える', tool: 'SQL', vh: 180, edges: [['paper', 'table', '入れる'], ['table', 'ask', '数える']],
    nodes: [{ id: 'paper', x: 95, y: 82, label: '受付の帳面', sub: '紙に手書き' }, { id: 'table', x: 300, y: 82, label: '予約の表', sub: '1 行 1 件' }, { id: 'ask', x: 505, y: 82, label: '問い合わせ', sub: '数を出す' }],
    steps: [
      { t: '帳面に予約が書いてある', d: '紙の帳面に予約がばらばらに書いてある。数えるたびに数え間違える。', cmd: '（帳面を見る）', facts: [['帳面', '3 件の書き込み'], ['表', 'まだ無い']], tok: { a: ['paper', '佐藤 11/12', 0, -40, -8], b: ['paper', '田中 11/12', 0, 40, -8], c: ['paper', '佐藤 11/12', 1, 0, 24] } },
      { t: '表に 1 行ずつ入れる', d: '1 件を 1 行にして表に入れる。名前と日付の欄に分ける。', cmd: "INSERT INTO yoyaku (name, day) VALUES ('佐藤', '11/12');", facts: [['表', '3 行'], ['欄', 'name ・ day']], tok: { a: ['table', '佐藤 11/12', 0, -40, -8], b: ['table', '田中 11/12', 0, 40, -8], c: ['table', '佐藤 11/12', 0, 0, 24] } },
      { t: '日付で絞る', d: '明日（11/12）の行だけを取り出す。', cmd: "SELECT * FROM yoyaku WHERE day = '11/12';", facts: [['当たった行', '3 行']], tok: { a: ['table', '佐藤 11/12', 1, -40, -8], b: ['table', '田中 11/12', 1, 40, -8], c: ['table', '佐藤 11/12', 1, 0, 24] } },
      { t: '数を数える', d: '絞った行の数を数える。紙で数えるより速く、何度数えても同じ数になる。', cmd: "SELECT COUNT(*) FROM yoyaku WHERE day = '11/12';", facts: [['答え', '3']], tok: { a: ['table', '佐藤 11/12', 0, -40, -8], b: ['table', '田中 11/12', 0, 40, -8], c: ['table', '佐藤 11/12', 0, 0, 24], n: ['ask', '3 件', 1, 0, 0] } },
      { t: '二重の予約を見つける', d: '同じ名前でまとめて、2 回以上ある人を探す。佐藤さんが二重だった。', cmd: 'SELECT name, COUNT(*) FROM yoyaku GROUP BY name HAVING COUNT(*) > 1;', facts: [['二重', '佐藤 2 件'], ['本当の数', '2 人']], tok: { a: ['table', '佐藤 11/12', 1, -40, -8], b: ['table', '田中 11/12', 0, 40, -8], c: ['table', '佐藤 11/12', 1, 0, 24], n: ['ask', '佐藤が二重', 1, 0, 0] } }
    ] };
  LESSONS.sec = { title: '入口を絞る', tool: 'ファイアウォール', vh: 180, edges: [['out', 'gate', 'つなぐ'], ['gate', 'rec', '通す']],
    nodes: [{ id: 'out', x: 95, y: 82, label: '外の網', sub: '事務所と知らない所' }, { id: 'gate', x: 300, y: 82, label: '門番', sub: 'まだ無い' }, { id: 'rec', x: 505, y: 82, label: '荷の記録', sub: '倉庫の機械' }],
    steps: [
      { t: '全ての口が開いている', d: '記録の機械は、どこからつないでも返事をする。', cmd: '（観察）', facts: [['開いている口', '全部']], tok: { a: ['out', '事務所', 0, -40, -8], b: ['out', '知らない所', 1, 40, -8], c: ['out', '知らない所', 1, 0, 24] } },
      { t: '知らない所から記録まで届く', d: '夜中の知らない所からの接続が、そのまま記録まで届いてしまう。', cmd: '（記録の機械の跡を見る）', facts: [['届いた接続', '3 件'], ['うち知らない所', '2 件']], tok: { a: ['rec', '事務所', 0, -40, -8], b: ['rec', '知らない所', 1, 40, -8], c: ['rec', '知らない所', 1, 0, 24] } },
      { t: '門番を置く', d: '記録の前に門番を置く。決まりに当たる接続だけを通す。', cmd: 'deny all', facts: [['門番', '置いた ・ まず全部断る']], tok: { a: ['gate', '事務所', 0, -40, -8], b: ['gate', '知らない所', 1, 40, -8], c: ['gate', '知らない所', 1, 0, 24] } },
      { t: '事務所だけ通す', d: '事務所から記録の口への接続だけを許す決まりを足す。', cmd: 'allow from 事務所 to 記録 port 443', facts: [['通した', '事務所 1 件'], ['断った', '知らない所 2 件']], tok: { a: ['rec', '事務所', 1, 0, 0], b: ['gate', '断った', 1, 40, -8], c: ['gate', '断った', 1, 0, 24] } },
      { t: '断った記録を残す', d: '断った接続を記録に残す。何度来たか、どこからかが後で分かる。', cmd: 'log deny', facts: [['断った記録', '2 件 ・ 夜中 2:10 と 2:12']], tok: { a: ['rec', '事務所', 0, 0, 0], b: ['gate', '断った 2 件', 1, 0, 8] } }
    ] };
  function addRequest(id) { if (S.requests.find((r) => r.id === id) || S.answered[id]) return; S.requests.push({ id, dayIn: S.day, due: S.day + REQ[id].due }); toast('要望が届いた', REQ[id].who + '：' + REQ[id].title, 'req'); renderReqs(); sfxNote(); }

  // ---------------- UI ----------------
  const ui = {
    clock: $('#clock'), date: $('#date'), pop: $('#pop'), money: $('#money'), income: $('#income'), sat: $('#sat'), satBar: $('#satBar'),
    reqList: $('#reqList'), reqCount: $('#reqCount'), markers: $('#markers'), toasts: $('#toasts'), info: $('#info'), dlg: $('#dlg'), lesson: $('#lesson'), floaters: $('#floaters'), hint: $('#hint')
  };
  document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
  function setSpeed(v) { S.speed = v; document.querySelectorAll('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.speed === v ? 'true' : 'false')); }
  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  function setTool(t) {
    S.tool = S.tool === t && t !== 'select' ? 'select' : t;
    document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.tool === S.tool ? 'true' : 'false'));
    const hints = { select: '', road: '街の端の交差点（または引いた道の端）を押し、伸ばしたい先を押す。東の畑の方へ引ける ・ ¥2/m ・ 右クリックでやめる', home: '空き区画を押すと住宅地に指定する（¥20）。住の需要があると、家が少しずつ建っていく', shop: '空き区画を押すと商業地に指定する（¥20）。商の需要があると、店が少しずつ建っていく', park: '光っている空き地を押すと公園ができる（¥80）', bulldoze: '自分で建てた建物を押すと取り壊す' };
    ui.hint.textContent = hints[S.tool]; ui.hint.hidden = !hints[S.tool];
    E.meshes.lots && (E.meshes.lots.visible = ['home', 'shop', 'park', 'road'].includes(S.tool));
    S.roadStart = null; previewRoad(null); lastPlanKey = '';
    if (S.tool === 'road') { E.meshes.lots.visible = true; lotMarkers(); }
    if (['home', 'shop', 'park'].includes(S.tool)) { lotMarkers(); E.meshes.lots.visible = true; }
  }
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  function setView(v) {
    S.view = v; S.infraTarget = v === 'ground' ? 0 : 1;
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === v ? 'true' : 'false'));
    $('#legendInfra').hidden = v !== 'infra'; $('#legendHappy').hidden = v !== 'happy';
    E.meshes.infra.visible = v === 'infra';
    applyInfoColors();
  }
  function fmt(n) { return Math.round(n).toLocaleString('ja-JP'); }
  function renderHUD() {
    const h = Math.floor(S.minute / 60) % 24, m = Math.floor(S.minute % 60);
    ui.clock.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    ui.date.textContent = S.month + '月' + S.day + '日';
    ui.pop.textContent = fmt(pop()); ui.money.textContent = '¥' + fmt(S.money); ui.income.textContent = (income() >= 0 ? '+' : '') + fmt(income()) + '/時';
    const sv = Math.round(avgHappy() * 100); ui.sat.textContent = sv; ui.satBar.style.width = sv + '%';
    ui.satBar.style.background = sv > 70 ? '#56d68a' : sv > 55 ? '#f2c14e' : '#ff7a59';
    const dm = demand();
    $('#dRes').style.height = dm.res + '%'; $('#dCom').style.height = dm.com + '%'; $('#dJob').style.height = dm.job + '%';
    if (!$('#budget').hidden) renderBudget();
  }
  function demand() {
    const sat = avgHappy(); const nH = S.built.filter((b) => b.kind === 'house').length, nS = S.built.filter((b) => b.kind === 'shop').length;
    const cl = (v) => Math.round(Math.max(5, Math.min(95, v)));
    return { res: cl(50 + (sat - 0.6) * 120 + nS * 5 - nH * 3), com: cl(30 + nH * 4 - nS * 9 + pop() / 300), job: cl(40 + pop() / 300 - jobs() / 200) };
  }
  function incomeParts() {
    const roadLen = S.roads.reduce((a, r2) => a + r2.L, 0); const outs = Object.values(S.answered).filter((v) => v === 'out').length;
    return [
      ['住民税（人口 × 0.018）', pop() * 0.018], ['店と会社の税（働く場所 × 0.012）', jobs() * 0.012],
      ['町の施設の維持費', -14], ['引いた道路の維持費（1 km あたり 8）', -roadLen / 1000 * 8], ['業者に任せた仕組みの使用料（1 件 3）', -outs * 3]
    ].filter((x) => Math.abs(x[1]) > 0.01);
  }
  function income() { return Math.round(incomeParts().reduce((a, x) => a + x[1], 0)); }
  function renderBudget() {
    const el = $('#budget'); const parts = incomeParts();
    el.innerHTML = `<header><strong>資金の内訳</strong><button type="button" class="x" aria-label="閉じる" data-x>×</button></header>
      <h4>1 時間ごとの収支</h4><table>${parts.map((p) => `<tr><th>${p[0]}</th><td class="${p[1] < 0 ? 'neg' : 'pos'}">${p[1] < 0 ? '−' : '+'}${fmt(Math.abs(p[1]))}</td></tr>`).join('')}<tr class="sum"><th>計</th><td>${income() >= 0 ? '+' : '−'}${fmt(Math.abs(income()))}</td></tr></table>
      <h4>最近の出入り</h4>${S.ledger.length ? `<ul>${S.ledger.map((l) => `<li><span>${l.t}</span><span>${l.text}</span><b class="${l.v < 0 ? 'neg' : 'pos'}">${l.v < 0 ? '−' : '+'}${fmt(Math.abs(l.v))}</b></li>`).join('')}</ul>` : '<p class="empty">まだ無い</p>'}`;
    el.querySelector('[data-x]').addEventListener('click', () => { el.hidden = true; });
  }
  $('#moneyBtn').addEventListener('click', () => { const el = $('#budget'); el.hidden = !el.hidden; if (!el.hidden) renderBudget(); });
  function onHour(hr) {
    for (const b of S.built) if (b.kind === 'house') { const parkNear = S.built.some((p2) => p2.kind === 'park' && Math.hypot(cx(p2) - cx(b), cz(p2) - cz(b)) < 70); const shopNear = S.built.some((p2) => p2.kind === 'shop' && Math.hypot(cx(p2) - cx(b), cz(p2) - cz(b)) < 90); const tgt = 0.62 + (parkNear ? 0.1 : 0) + (shopNear ? 0.08 : 0) + answeredN() * 0.015; const h0 = S.buildingsHappy.get(b.id) || 0.6; S.buildingsHappy.set(b.id, h0 + (tgt - h0) * 0.15); }
    const v = income(); S.money += v; if (hr % 6 === 0) ledger('6 時間ぶんの収支を受け取った（1 時間 ' + (v >= 0 ? '+' : '') + v + '）', v * 6);
    growBuildings(hr); checkGoal();
    const dm = demand(); let grown = 0;
    city.lots.forEach((L, i) => {
      if (!L.zone || L.taken || grown >= 2) return;
      const d = L.zone === 'home' ? dm.res : dm.com; const p = Math.max(0, (d - 30) / 120);
      const hsh = Math.abs(Math.sin((i + 1) * 12.9898 + (S.day * 24 + hr) * 78.233) * 43758.5453) % 1;
      if (hsh < p) { spawn(L, L.zone); grown++; }
    });
  }
  function renderReqs() {
    ui.reqCount.textContent = S.requests.length + ' 件';
    ui.reqList.innerHTML = '';
    if (!S.requests.length) { ui.reqList.innerHTML = '<p class="empty">今は届いている要望が無い</p>'; }
    for (const r of S.requests) {
      const d = REQ[r.id]; const left = r.due - S.day;
      const el = document.createElement('button'); el.type = 'button'; el.className = 'req';
      el.innerHTML = `<span class="av" style="background:${d.color}22;color:${d.color}">${d.icon}</span><span class="tx"><strong>${d.title}</strong><small>${d.who} ・ <em class="${left <= 1 ? 'hot' : ''}">あと ${Math.max(0, left)} 日</em></small></span>`;
      el.addEventListener('click', () => openReq(r.id)); ui.reqList.appendChild(el);
    }
    for (const id of Object.keys(S.answered)) {
      const d = REQ[id]; const el = document.createElement('div'); el.className = 'req done';
      el.innerHTML = `<span class="av" style="background:#56d68a22;color:#56d68a">✓</span><span class="tx"><strong>${d.title}</strong><small>${S.answered[id] === 'learned' ? '学んだ手で応えた' : '業者に任せた'}</small></span>`; ui.reqList.appendChild(el);
    }
    renderMarkers();
  }
  const markerEls = new Map();
  function renderMarkers() {
    for (const [k, el] of markerEls) if (!S.requests.find((r) => r.id === k)) { el.remove(); markerEls.delete(k); }
    for (const r of S.requests) if (!markerEls.has(r.id)) {
      const d = REQ[r.id]; const el = document.createElement('button'); el.type = 'button'; el.className = 'marker'; el.style.setProperty('--c', d.color);
      el.setAttribute('aria-label', d.who + 'の要望を開く'); el.innerHTML = `<span class="pin"><b>!</b></span><span class="lbl">${d.who}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); openReq(r.id); }); ui.markers.appendChild(el); markerEls.set(r.id, el);
    }
  }
  function toast(title, body, kind, actions) {
    const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.setAttribute('role', 'status');
    el.innerHTML = `<strong>${title}</strong>${body ? '<span>' + body + '</span>' : ''}`;
    if (actions) { const row = document.createElement('div'); row.className = 'row'; for (const [lab, fn, cls] of actions) { const b = document.createElement('button'); b.type = 'button'; b.className = cls || ''; b.textContent = lab; b.addEventListener('click', () => { fn(); }); row.appendChild(b); } el.appendChild(row); }
    ui.toasts.prepend(el); setTimeout(() => el.classList.add('out'), actions ? 14000 : 5200); setTimeout(() => el.remove(), actions ? 14600 : 5800);
  }
  const floats = [];
  function floater(x, y, z, text, kind) { const el = document.createElement('div'); el.className = 'floater ' + (kind || ''); el.textContent = text; ui.floaters.appendChild(el); floats.push({ x, y, z, el, t: 0 }); }

  // request dialog
  function openReq(id) {
    const d = REQ[id]; const r = S.requests.find((x) => x.id === id); if (!r) return;
    const b = d.at(); flyTo(cx(b), cz(b), 110, 0.55);
    const learned = S.learned[d.lesson];
    const needOk = !d.needs || S.answered[d.needs] === 'learned';
    ui.dlg.innerHTML = `
      <div class="card" role="dialog" aria-modal="true" aria-label="${d.who}からの要望" style="outline:none">
        <header><span class="av big" style="background:${d.color}22;color:${d.color}">${d.icon}</span>
          <div><span class="kick" style="color:${d.color}">要望 ・ 期限 あと ${Math.max(0, r.due - S.day)} 日</span><h2>${d.title}</h2><span class="who">${d.who}</span></div>
          <button class="x" type="button" aria-label="閉じる" data-close>×</button></header>
        <p class="quote">${d.quote}</p>
        <div class="conds">${d.conds.map((c) => `<div><small>条件</small>${c}</div>`).join('')}<div><small>見返り</small>${d.reward}</div></div>
        <button type="button" class="lessonBtn" data-lesson ${learned ? 'disabled' : ''}><span><small>この要望に効く解説（${LESSONS[d.lesson].tool} ・ ${LESSONS[d.lesson].steps.length} ステップ）</small><strong>${LESSONS[d.lesson].title}</strong></span><em>${learned ? '学んだ ✓' : '解説を受ける →'}</em></button>
        <div class="opts">
          <button type="button" class="opt good" data-ans="learned" ${learned && needOk ? '' : 'disabled'}><span><strong>${d.learnedOpt.label}</strong><small>${learned ? d.learnedOpt.note : (needOk ? '解説を受けると選べる' : '先に記録庫を建てると選べる')}</small></span><b>¥${d.learnedOpt.cost}</b></button>
          <button type="button" class="opt" data-ans="out"><span><strong>${d.outOpt.label}</strong><small>${d.outOpt.note}</small></span><b>¥${d.outOpt.cost}</b></button>
          <button type="button" class="later" data-close>後回しにする</button>
        </div>
      </div>`;
    ui.dlg.hidden = false; S.prevSpeed = S.speed; setSpeed(0);
    ui.dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeDlg));
    ui.dlg.querySelector('[data-lesson]').addEventListener('click', () => openLesson(d.lesson, () => openReq(id)));
    ui.dlg.querySelectorAll('[data-ans]').forEach((b) => b.addEventListener('click', () => answer(id, b.dataset.ans)));
    const cd = ui.dlg.querySelector('.card'); cd.tabIndex = -1; cd.focus({ preventScroll: true });
  }
  function closeDlg() { ui.dlg.hidden = true; setSpeed(S.prevSpeed || 1); }

  // lesson player
  function openLesson(lid, back) {
    const L = LESSONS[lid]; let step = 0;
    ui.dlg.hidden = true; ui.lesson.hidden = false;
    const draw = (animate) => {
      const st = L.steps[step];
      ui.lesson.innerHTML = `
        <div class="card wide" role="dialog" aria-modal="true" aria-label="解説 ${L.title}">
          <header><div><span class="kick">解説 ・ ${L.tool}</span><h2>${L.title}</h2></div><button class="x" type="button" aria-label="閉じる" data-close>×</button></header>
          <ol class="steps">${L.steps.map((s, i) => `<li class="${i === step ? 'on' : i < step ? 'done' : ''}"><button type="button" data-go="${i}">${i + 1}</button></li>`).join('')}</ol>
          <div class="stage"><svg viewBox="0 0 600 ${L.vh}" role="img" aria-label="${st.t}の動き">
            <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#4a6a8c"/></marker></defs>
            ${L.edges.map(([a, b2, lab]) => { const A = L.nodes.find((n) => n.id === a), B2 = L.nodes.find((n) => n.id === b2); const x1 = A.x + 78, x2 = B2.x - 80; return `<path class="edge" d="M${x1} ${A.y} C ${(x1 + x2) / 2} ${A.y}, ${(x1 + x2) / 2} ${B2.y}, ${x2} ${B2.y}" fill="none" stroke="#4a6a8c" stroke-width="2" stroke-dasharray="6 6" marker-end="url(#ah)"/>${lab ? `<text x="${(x1 + x2) / 2}" y="${(A.y + B2.y) / 2 - 8}" text-anchor="middle" font-size="10" fill="#8ea0b5">${lab}</text>` : ''}`; }).join('')}
            ${L.nodes.map((n) => `<g><rect x="${n.x - 76}" y="${n.y - 52}" width="152" height="${L.nodes.length > 3 ? 92 : 112}" rx="14" fill="#141c26" stroke="#2c3a4c"/><text x="${n.x}" y="${n.y - 30}" text-anchor="middle" font-size="13" font-weight="700" fill="#e9eef5">${n.label}</text><text x="${n.x}" y="${n.y - 14}" text-anchor="middle" font-size="10" fill="#8ea0b5">${n.sub}</text></g>`).join('')}
            ${Object.keys(L.steps.reduce((a, s) => Object.assign(a, s.tok), {})).map((k) => `<g class="tok" data-k="${k}"><rect x="-33" y="-12" width="66" height="24" rx="7"/><text y="4" text-anchor="middle" font-size="11" font-weight="700"></text></g>`).join('')}
          </svg><button type="button" class="replay" data-replay>↻ この動きをもう一度</button></div>
          <div class="body"><h3>${step + 1}. ${st.t}</h3><p>${st.d}</p>
            <div class="cmd"><small>操作</small><code>${st.cmd}</code></div>
            <table><tbody>${st.facts.map((f) => `<tr><th>${f[0]}</th><td>${f[1]}</td></tr>`).join('')}</tbody></table></div>
          <footer><button type="button" data-prev ${step === 0 ? 'disabled' : ''}>← 前へ</button>
            ${step < L.steps.length - 1 ? '<button type="button" class="pri" data-next>次へ →</button>' : '<button type="button" class="pri" data-finish>学んだ ・ 要望に戻る</button>'}</footer>
        </div>`;
      const place = (s, instant) => {
        ui.lesson.querySelectorAll('.tok').forEach((g) => {
          const k = g.dataset.k; const tk = s.tok[k];
          if (!tk) { g.style.opacity = 0; return; }
          const n = L.nodes.find((x) => x.id === tk[0]); const x = n.x + (lid === 'net' ? ({ a: -46, b: 0, c: 46 })[k] : (tk[3] || 0)), y = n.y + 10 + (tk[4] || 0);
          g.style.transition = instant ? 'none' : 'transform 900ms cubic-bezier(.6,.05,.3,1), opacity 400ms';
          g.style.transform = `translate(${x}px, ${y}px)`; g.style.opacity = 1;
          g.querySelector('text').textContent = tk[1]; g.classList.toggle('hl', !!tk[2]);
        });
      };
      if (animate && step > 0) { place(L.steps[step - 1], true); requestAnimationFrame(() => requestAnimationFrame(() => place(st, false))); } else place(st, true);
      ui.lesson.querySelector('[data-close]').addEventListener('click', () => { ui.lesson.hidden = true; back(); });
      ui.lesson.querySelector('[data-replay]').addEventListener('click', () => { if (step > 0) { place(L.steps[step - 1], true); requestAnimationFrame(() => requestAnimationFrame(() => place(st, false))); } });
      ui.lesson.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { step = +b.dataset.go; draw(true); }));
      ui.lesson.querySelector('[data-prev]').addEventListener('click', () => { step--; draw(false); });
      const nx = ui.lesson.querySelector('[data-next]'); nx && nx.addEventListener('click', () => { step++; draw(true); });
      const fin = ui.lesson.querySelector('[data-finish]'); fin && fin.addEventListener('click', () => { S.learned[lid] = true; ui.lesson.hidden = true; toast('解説を修了', L.title + ' ・ 応え方が 1 つ増えた', 'learn'); back(); });
    };
    draw(false);
  }

  function answer(id, how) {
    const d = REQ[id]; const cost = how === 'learned' ? d.learnedOpt.cost : d.outOpt.cost;
    if (S.money < cost) { toast('資金が足りない', '必要 ¥' + cost, 'warn'); return; }
    S.money -= cost; S.answered[id] = how; S.requests = S.requests.filter((r) => r.id !== id); ledger('要望：' + (how === 'learned' ? d.learnedOpt.label : d.outOpt.label), -cost);
    closeDlg(); renderReqs();
    const target = d.at();
    let focus = target;
    if (d.builds) { const bb = d.builds(); focus = bb; bb.hidden = false; const v = d.view; flyTo(cx(bb) + v[0], cz(bb) + v[1], v[2], v[3], v[4]);
      construct(bb, 3.4, () => resolveEffects(id, how)); }
    else if (id === 'school') { flyTo(cx(F.school), cz(F.school), 120, 0.55); setTimeout(() => resolveEffects(id, how), 1200); }
    else { flyTo(cx(target), cz(target), 110, 0.55); setTimeout(() => resolveEffects(id, how), 1200); }
    void focus;
    sfxNote();
  }
  function resolveEffects(id, how) {
    const d = REQ[id]; const t = d.at(); const k = how === 'learned' ? 1 : 0.5; let n = 0;
    for (const b of city.B) { const dd = Math.hypot(cx(b) - cx(t), cz(b) - cz(t)); if (dd < (how === 'learned' ? 110 : 70) && !b.hidden) { S.buildingsHappy.set(b.id, Math.min(1, (S.buildingsHappy.get(b.id) || 0.6) + 0.12 * k)); if (n < (how === 'learned' ? 7 : 3) && b.kind !== 'board') { floater(cx(b), b.h + 3 + (b.y0 || 0), cz(b), '満足 ↑', 'good'); n++; } } }
    buildInfra(); applyInfoColors(); checkGoal();
    const lines = {
      board: how === 'learned' ? '掲示板を直すたびに、直した人・日時・中身が記録庫へ流れ込む。前の文面にも戻せる。' : '仕組みは入ったが中身が見えない。町の誰も使い方を説明できない。',
      school: how === 'learned' ? '中継器を 1 台足して振り分けた。昼休みの待ちが消えた。' : '回線は太くなったが、費用がかさんだ。混む理由は分からないまま。',
      shop: how === 'learned' ? '前に建てた記録庫に、商店街の帳面がそのままつながった。' : '業者の箱が 1 つ増えた。記録庫とは別の仕組みになった。',
      clinic: how === 'learned' ? '予約を表にして、日ごとの数と二重の予約がすぐ出るようになった。' : '機械は入ったが、数え方は業者しか分からない。',
      harbor: how === 'learned' ? '事務所からだけ記録へ届くようになり、断った接続は門番の記録に残る。' : '見張りは付いたが、毎月の費用がかかり続ける。'
    };
    toast(how === 'learned' ? '要望に応えた ・ 満足度 大きく上昇' : '要望に応えた ・ 満足度 少し上昇', lines[id], how === 'learned' ? 'learn' : '', [
      ['↻ 変化をもう一度', () => replayChange(id), ''], ['地下の仕組みで見る', () => setView('infra'), 'pri']]);
    if (id === 'board') setTimeout(() => addRequest('shop'), 9000);
  }
  function replayChange(id) {
    setView('ground');
    const d = REQ[id];
    if (d.builds) { const bb = d.builds(); const v = d.view; flyTo(cx(bb) + v[0], cz(bb) + v[1], v[2], v[3], v[4]); construct(bb, 3.4, () => { for (const b of city.B) if (Math.hypot(cx(b) - cx(bb), cz(b) - cz(bb)) < 80 && !b.hidden && b.kind !== 'board') floater(cx(b), b.h + 3, cz(b), '満足 ↑', 'good'); }); }
    else { const t = REQ[id].at(); flyTo(cx(t), cz(t), 120, 0.55); setTimeout(() => { setView('infra'); }, 900); }
  }

  // building info
  function select(b) {
    S.sel = b;
    if (!b) { ui.info.hidden = true; return; }
    const h = Math.round((S.buildingsHappy.get(b.id) || 0.6) * 100);
    const voices = { house: ['静かで住みやすい', 'もう少しお店が近いといい', '夜の街灯がうれしい'], apt: ['駅まで歩けたらいいのに', 'ベランダから港が見える'], office: ['昼の通信が遅いときがある', '人手が足りない'], shop: ['帳面の管理が大変', '週末は人が多い'], school: ['昼休みの無線が混む'], hall: ['掲示板の書き換えが心配'], warehouse: ['荷が増えてきた'] };
    const v = voices[b.kind] ? voices[b.kind][b.id % voices[b.kind].length] : '';
    ui.info.innerHTML = `<header><strong>${b.name}</strong><button type="button" class="x" aria-label="閉じる" data-x>×</button></header>
      <dl>${b.residents ? `<div><dt>住んでいる人</dt><dd>${b.residents} 人</dd></div>` : ''}${b.jobs ? `<div><dt>働く場所</dt><dd>${b.jobs} 人分</dd></div>` : ''}<div><dt>満足度</dt><dd><span class="bar"><i style="width:${h}%;background:${h > 70 ? '#56d68a' : h > 55 ? '#f2c14e' : '#ff7a59'}"></i></span>${h}</dd></div></dl>
      ${v ? `<p class="voice">「${v}」</p>` : ''}${b.player ? '<p class="note">あなたが建てた建物' + (b.kind === 'house' ? (b.floors >= 3 ? ' ・ 建て替え済み' : ' ・ 満足度 74 以上が続くと 3 階建てに建て替わる（近くに公園や店があると上がる）') : '') + '</p>' : ''}`;
    ui.info.hidden = false; ui.info.querySelector('[data-x]').addEventListener('click', () => select(null));
  }

  // ---------------- input ----------------
  let drag = null; const keys = new Set();
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, b: e.button, shift: e.shiftKey, moved: false, pts: drag && drag.pts ? drag.pts : new Map() }; drag.pts.set(e.pointerId, [e.clientX, e.clientY]); cam.fly = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) { hover(e); return; }
    if (drag.pts.size >= 2) { const prev = [...drag.pts.values()]; drag.pts.set(e.pointerId, [e.clientX, e.clientY]); const now = [...drag.pts.values()];
      const d0 = Math.hypot(prev[0][0] - prev[1][0], prev[0][1] - prev[1][1]), d1 = Math.hypot(now[0][0] - now[1][0], now[0][1] - now[1][1]);
      cam.v.dist *= d0 / Math.max(1, d1); const a0 = Math.atan2(prev[1][1] - prev[0][1], prev[1][0] - prev[0][0]), a1 = Math.atan2(now[1][1] - now[0][1], now[1][0] - now[0][0]); cam.v.yaw += (a1 - a0);
      const my0 = (prev[0][1] + prev[1][1]) / 2, my1 = (now[0][1] + now[1][1]) / 2; cam.v.pitch += (my1 - my0) * 0.004; clampCam(); drag.moved = true; return; }
    drag.pts.set(e.pointerId, [e.clientX, e.clientY]);
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
    if (drag.b === 2 || drag.b === 1 || drag.shift) { cam.v.yaw -= dx * 0.005; cam.v.pitch += dy * 0.004; }
    else { const k = cam.v.dist * 0.0021; const sy = Math.sin(cam.v.yaw), cy = Math.cos(cam.v.yaw); cam.v.tx -= (dx * cy + dy * sy) * k; cam.v.tz -= (-dx * sy + dy * cy) * k; }
    clampCam();
  });
  const up = (e) => { if (!drag) return; drag.pts.delete(e.pointerId); if (drag.pts.size === 0) { if (!drag.moved && drag.b === 0) click(e); if (!drag.moved && drag.b === 2 && S.tool === 'road' && S.roadStart) { S.roadStart = null; previewRoad(null); lastPlanKey = ''; ui.hint.textContent = '街の端の交差点を押して始める'; } drag = null; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.v.dist *= Math.exp(e.deltaY * 0.0012); clampCam(); cam.fly = null; }, { passive: false });
  addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('input,textarea')) return; keys.add(e.key.toLowerCase());
    if (e.key === ' ') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); } if (['1', '2', '3'].includes(e.key)) setSpeed(+e.key);
    if (e.key === 'Escape') { if (!ui.lesson.hidden) { ui.lesson.querySelector('[data-close]').click(); } else if (!ui.dlg.hidden) closeDlg(); else { setTool('select'); select(null); } } });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  let lastVP = null;
  function ray(e) {
    const rc = canvas.getBoundingClientRect(); const nx = ((e.clientX - rc.left) / rc.width) * 2 - 1, ny = -(((e.clientY - rc.top) / rc.height) * 2 - 1);
    const inv = E.M4.inv(lastVP); const a = E.M4.xf(inv, nx, ny, -1, 1), b = E.M4.xf(inv, nx, ny, 1, 1);
    const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], f = [b[0] / b[3], b[1] / b[3], b[2] / b[3]]; const d = [f[0] - o[0], f[1] - o[1], f[2] - o[2]]; const l = Math.hypot(...d);
    return { o, d: d.map((v) => v / l) };
  }
  function hitBuilding(rr) {
    let best = null, bt = 1e9;
    for (const b of city.B.concat(S.built)) {
      if (b.hidden && E.getRise(b.id) < 0.5) continue; const y0 = (b.y0 || 0), y1 = y0 + b.h + Y;
      let t0 = 0, t1 = 1e9; const mn = [b.x0, y0, b.z0], mx = [b.x1, y1, b.z1]; let ok = true;
      for (let k = 0; k < 3; k++) { if (Math.abs(rr.d[k]) < 1e-8) { if (rr.o[k] < mn[k] || rr.o[k] > mx[k]) { ok = false; break; } continue; }
        let ta = (mn[k] - rr.o[k]) / rr.d[k], tb = (mx[k] - rr.o[k]) / rr.d[k]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } }
      if (ok && t0 < bt) { bt = t0; best = b; }
    }
    return best;
  }
  function groundHit(rr) { if (rr.d[1] >= -1e-4) return null; const t = (Y - rr.o[1]) / rr.d[1]; return [rr.o[0] + rr.d[0] * t, rr.o[2] + rr.d[2] * t]; }
  let hoverId = -1;
  function hover(e) { if (!lastVP) return; const rr = ray(e);
    if (S.tool === 'road') { canvas.style.cursor = 'crosshair'; const g = groundHit(rr); if (!g || !S.roadStart) return; const p = snapPoint(g); const key = p.x + ',' + p.z; if (key === lastPlanKey) return; lastPlanKey = key; const plan = roadPlan(S.roadStart, p); previewRoad(plan); S.plan = plan; ui.hint.textContent = plan.ok ? Math.round(plan.L) + ' m ・ ¥' + plan.cost + ' ・ 押すと引く' : '引けない：' + plan.why; return; } if (['home', 'shop', 'park'].includes(S.tool)) { canvas.style.cursor = 'pointer'; hoverId = -1; return; } const b = hitBuilding(rr); hoverId = b ? b.id : -1; canvas.style.cursor = b ? 'pointer' : 'grab'; }
  function click(e) {
    const rr = ray(e);
    if (S.tool === 'road') { const g = groundHit(rr); if (!g) return; const p = snapPoint(g);
      if (!S.roadStart) { S.roadStart = p; previewRoad(null); ui.hint.textContent = '伸ばしたい先を押す（右クリックでやめる）'; return; }
      const plan = roadPlan(S.roadStart, p); if (!plan.ok) { toast('ここには引けない', plan.why, 'warn'); return; }
      addRoad(plan); const endN = NODES.find((n) => n.x === plan.b.x && n.z === plan.b.z); S.roadStart = { x: plan.b.x, z: plan.b.z, node: endN }; lastPlanKey = ''; previewRoad(null); ui.hint.textContent = '続けて伸ばせる。別の所から引くなら右クリック'; return; }
    if (['home', 'shop', 'park'].includes(S.tool)) { const g = groundHit(rr); if (!g) return; const L = city.lots.find((l) => !l.taken && g[0] > l.x0 && g[0] < l.x1 && g[1] > l.z0 && g[1] < l.z1); if (L) placeOnLot(L); return; }
    const b = hitBuilding(rr);
    if (S.tool === 'bulldoze') { if (b) bulldoze(b); return; }
    if (b) { const req = S.requests.find((r) => REQ[r.id].at() === b); if (req) { openReq(req.id); return; } select(b); } else select(null);
  }
  // simple sound (optional)
  let AC = null; function sfxNote() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = 660; g.gain.setValueAtTime(0.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.05, AC.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.4); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.45); } catch (_) { /* no audio */ } }

  // ---------------- main loop ----------------
  const STILL = location.hash.includes('still');
  let FT = 16, QS = 1;
  let TIME = 0, last = performance.now(), simAcc = 0, lastHour = Math.floor(S.minute / 60);
  window.__game = { checkGoal, onNewDay, onHour, demand, S, cam, flyTo, setView, setTool, openReq, answer, openLesson, city, E, setSpeed, roadPlan, addRoad, snapPoint, placeOnLot, addRequest: (id) => addRequest(id) };
  function frame(now) {
    const dtR = Math.min(0.1, (now - last) / 1000); last = now;
    const mult = [0, 1, 3, 8][S.speed];
    TIME += dtR * (mult ? 1 : 0.0) + (mult ? 0 : 0);
    // camera input
    const kp = cam.v.dist * 0.9 * dtR; const sy = Math.sin(cam.v.yaw), cyw = Math.cos(cam.v.yaw);
    if (keys.has('w') || keys.has('arrowup')) { cam.v.tx -= sy * kp; cam.v.tz -= cyw * kp; cam.fly = null; }
    if (keys.has('s') || keys.has('arrowdown')) { cam.v.tx += sy * kp; cam.v.tz += cyw * kp; cam.fly = null; }
    if (keys.has('a') || keys.has('arrowleft')) { cam.v.tx -= cyw * kp; cam.v.tz += sy * kp; cam.fly = null; }
    if (keys.has('d') || keys.has('arrowright')) { cam.v.tx += cyw * kp; cam.v.tz -= sy * kp; cam.fly = null; }
    if (keys.has('q')) cam.v.yaw += 1.2 * dtR; if (keys.has('e')) cam.v.yaw -= 1.2 * dtR;
    if (keys.has('r')) cam.v.dist *= 1 - dtR; if (keys.has('f')) cam.v.dist *= 1 + dtR; clampCam();
    if (cam.fly) { cam.fly.t = Math.min(1, cam.fly.t + dtR / 1.4); const t = cam.fly.t, k = t * t * (3 - 2 * t); for (const p of ['tx', 'tz', 'dist', 'pitch', 'yaw']) cam.v[p] = cam.fly.from[p] + (cam.fly.to[p] - cam.fly.from[p]) * k; if (t >= 1) cam.fly = null; }
    const sm = 1 - Math.pow(0.0005, dtR); for (const p of ['tx', 'tz', 'dist', 'pitch', 'yaw']) cam[p] += (cam.v[p] - cam[p]) * sm;
    // sim
    if (mult) {
      S.minute += dtR * 10 * mult;
      if (S.minute >= 24 * 60) { S.minute -= 24 * 60; S.day += 1; if (S.day > 30) { S.day = 1; S.month = S.month % 12 + 1; } onNewDay(); }
      const hr = Math.floor(S.minute / 60); if (hr !== lastHour) { lastHour = hr; onHour(hr); }
      const bySeg = new Map();
      for (const c of cars) if (c.phase === 'seg') { const k = c.a.x + ',' + c.a.z + '>' + c.b.x + ',' + c.b.z; (bySeg.get(k) || bySeg.set(k, []).get(k)).push(c); }
      for (const arr of bySeg.values()) { arr.sort((p1, p2) => p1.t - p2.t); for (let i = 0; i < arr.length; i++) arr[i].lead = i < arr.length - 1 ? arr[i + 1].t - arr[i].t : null; }
      for (const c of cars) { if (c.phase !== 'seg') c.lead = null; stepCar(c, dtR * Math.min(mult, 3)); }
      for (const p of peds) { p.s += p.v * dtR * Math.min(mult, 3); p.bob += dtR * 8; }
      for (const b of boats) {
        b.ph = (b.ph || 0) + dtR * 1.5;
        if (b.kind === 'ferry') { const P = b.path; b.t = (b.t + dtR * Math.min(mult, 3) * b.sp / 150) % P.length; const i = Math.floor(b.t), f = b.t - i, A = P[i], B2 = P[(i + 1) % P.length]; b.x = A[0] + (B2[0] - A[0]) * f; b.z = A[1] + (B2[1] - A[1]) * f; b.h = Math.atan2(B2[1] - A[1], B2[0] - A[0]); }
        else { b.a += b.sp * dtR * Math.min(mult, 3); b.x = b.cx + Math.cos(b.a) * b.r; b.z = b.cz + Math.sin(b.a) * b.r; b.h = b.a + (b.sp > 0 ? Math.PI / 2 : -Math.PI / 2); }
      }
    }
    for (const b of boats) if (b.x === undefined) { b.x = b.cx || b.path[0][0]; b.z = b.cz || b.path[0][1]; b.h = 0; }
    // constructions
    for (const cn of constructions) { if (cn.p >= 1) continue; cn.p = Math.min(1, cn.p + dtR / cn.dur); const e = cn.p < 0.25 ? 0 : (cn.p - 0.25) / 0.75; E.setData(cn.b.id, 0, 0, 0, Math.round(255 * (1 - Math.pow(1 - e, 3)))); if (cn.p >= 1) { applyInfoColors(); cn.onDone && cn.onDone(); } }
    for (let i = constructions.length - 1; i >= 0; i--) if (constructions[i].p >= 1) constructions.splice(i, 1);
    // render
    const hour = S.minute / 60; const L = lightAt(hour);
    S.infra += (S.infraTarget - S.infra) * Math.min(1, dtR * 4);
    E.setMesh('dyn', buildDyn(L.night), true);
    FT = FT * 0.95 + dtR * 1000 * 0.05; if (!STILL) { if (FT > 30 && QS > 0.55) QS -= 0.01; else if (FT < 17 && QS < 1) QS += 0.005; }
    const dpr = Math.min(devicePixelRatio || 1, 1.75) * QS;
    const w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
    const eye = eyeOf(cam);
    const tilt = Math.max(0.08, Math.min(0.95, (420 - cam.dist) / 360));
    const opaque = ['city', 'water', 'dyn', 'built']; if (S.view === 'infra' && S.infra > 0.05) opaque.push('infra'); if (E.meshes.lots && E.meshes.lots.visible) opaque.push('lots'); if (S.tool === 'road') opaque.push('preview');
    const res = E.render({ w, h, fov: 0.72, near: Math.max(0.5, cam.dist * 0.01), far: 6000, eye, target: [cam.tx, 0, cam.tz], sunDir: L.sd, shadowR: Math.min(950, Math.max(110, cam.dist * 1.05)),
      light: L, time: TIME + 100, info: S.infra, sel: S.sel ? S.sel.id : hoverId, fog: 0.00032, tilt, bloom: 0.55 + L.night * 0.5, aoK: 0.85, aoR: 2.5,
      opaque, casters: ['city', 'dyn', 'built'], glow: ['glow'] });
    lastVP = res.VP; window.__proj = (x, z) => { const rc2 = canvas.getBoundingClientRect(); const pp = E.M4.xf(res.VP, x, Y, z, 1); return [(pp[0] / pp[3] * 0.5 + 0.5) * rc2.width, (1 - (pp[1] / pp[3] * 0.5 + 0.5)) * rc2.height]; };
    // markers & floaters
    const rc = canvas.getBoundingClientRect();
    const proj = (x, y, z) => { const p = E.M4.xf(res.VP, x, y, z, 1); if (p[3] <= 0) return null; return [(p[0] / p[3] * 0.5 + 0.5) * rc.width, (1 - (p[1] / p[3] * 0.5 + 0.5)) * rc.height]; };
    for (const r of S.requests) { const el = markerEls.get(r.id); if (!el) continue; const b = REQ[r.id].at(); const p = proj(cx(b), (b.y0 || 0) + b.h + Y + 4, cz(b)); if (!p) { el.style.display = 'none'; continue; } el.style.display = ''; el.style.transform = `translate(${p[0]}px, ${p[1]}px)`; }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t += dtR; const p = proj(f.x, f.y + f.t * 6, f.z); if (!p || f.t > 2.4) { if (f.t > 2.4) { f.el.remove(); floats.splice(i, 1); } continue; } f.el.style.transform = `translate(${p[0]}px, ${p[1]}px)`; f.el.style.opacity = f.t < 0.2 ? f.t / 0.2 : Math.max(0, 1 - (f.t - 1.6) / 0.8); }
    if (Math.floor(now / 250) !== Math.floor((now - dtR * 1000) / 250)) renderHUD();
    if (S.sel && Math.floor(now / 1000) !== Math.floor((now - dtR * 1000) / 1000)) select(S.sel);
    if (!STILL) requestAnimationFrame(frame);
  }
  // ---------------- goals, growth, daily report ----------------
  const answeredN = () => Object.keys(S.answered).length;
  const playerHouses = () => S.built.filter((b) => b.kind === 'house').length;
  const GOALS = [
    { t: '人口を 2,400 人にする', cur: () => pop(), goal: 2400, fmt: (v) => fmt(v) + ' 人', reward: 300 },
    { t: '要望に 2 件応える', cur: answeredN, goal: 2, fmt: (v) => v + ' 件', reward: 400 },
    { t: '自分で家を 8 軒建てる（住宅地を指定する）', cur: playerHouses, goal: 8, fmt: (v) => v + ' 軒', reward: 600 },
    { t: '満足度を 72 にする', cur: () => Math.round(avgHappy() * 100), goal: 72, fmt: (v) => v, reward: 800 },
    { t: '人口を 2,600 人にする', cur: () => pop(), goal: 2600, fmt: (v) => fmt(v) + ' 人', reward: 1000 },
    { t: '届いた要望 5 件に全て応える', cur: answeredN, goal: 5, fmt: (v) => v + ' 件', reward: 1500 }
  ];
  const RANKS = ['港の小さな町', '港の町', 'にぎわう港町', '学びの港町', '港の市', '港の都'];
  S.goal = 0;
  function renderGoal() {
    const el = $('#goal'); if (!el) return;
    if (S.goal >= GOALS.length) { el.innerHTML = '<strong>目標を全て達成した</strong><small>自由に街を育てよう</small>'; return; }
    const g = GOALS[S.goal]; const v = g.cur(); const pct = Math.max(0, Math.min(100, Math.round(v / g.goal * 100)));
    el.innerHTML = `<div class="gh"><strong>次の目標</strong><span>${S.goal + 1} / ${GOALS.length}</span></div><p>${g.t}</p><div class="meter wide"><i style="width:${pct}%;background:var(--acc)"></i></div><small>${g.fmt(v)} / ${g.fmt(g.goal)} ・ 報酬 ¥${fmt(g.reward)}</small>`;
  }
  function checkGoal() {
    if (S.goal >= GOALS.length) return; const g = GOALS[S.goal];
    if (g.cur() >= g.goal) { S.money += g.reward; ledger('目標を達成：' + g.t, g.reward); S.goal++;
      $('#rank').textContent = RANKS[Math.min(S.goal, RANKS.length - 1)] + ' ・ 町長 1 年目';
      toast('目標を達成した ・ 町の格が上がった', g.t + ' ・ 報酬 ¥' + fmt(g.reward) + ' ・ 今の町：' + RANKS[Math.min(S.goal, RANKS.length - 1)], 'learn'); sfxNote(); }
    renderGoal();
  }
  function growBuildings(hr) {
    if (hr % 4 !== 0) return; let up = 0;
    for (const b of S.built) {
      if (up >= 2 || b.kind !== 'house' || b.floors >= 3 || E.getRise(b.id) < 1) continue;
      const age = (S.day * 24 + hr) - (b.bornH || 0); if (age < 18 || (S.buildingsHappy.get(b.id) || 0.6) < 0.74) continue;
      b.floors = 3; b.residents += 3; b.h += 2.9; b.name = '建て替えた住宅'; up++;
      rebuildBuilt(); construct(b, 2.2, () => floater(cx(b), b.h + 2 + (b.lot.y0 || Y), cz(b), '建て替え +3 人', 'good'));
    }
    if (up) ledger('満足した家が建て替わった（' + up + ' 軒）', 0);
  }
  S.dayStart = null;
  function dailyReport() {
    const now = { pop: pop(), money: S.money, sat: Math.round(avgHappy() * 100) };
    if (S.dayStart) { const d = S.dayStart; const sg = (v) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v));
      toast(S.month + '月' + (S.day - 1) + '日の日報', '人口 ' + sg(now.pop - d.pop) + ' 人 ・ 資金 ' + sg(now.money - d.money) + ' ・ 満足度 ' + d.sat + ' → ' + now.sat + ' ・ 応えた要望 ' + answeredN() + ' 件', ''); }
    S.dayStart = now;
  }
  function onNewDay() {
    dailyReport();
    if (S.day === 11 && !S.answered.school) addRequest('school');
    if (S.day === 12 && !S.answered.clinic) addRequest('clinic');
    if (S.day === 13 && !S.answered.harbor) addRequest('harbor');
    for (const r of S.requests) if (r.due < S.day) { toast('期限を過ぎた', REQ[r.id].who + 'の満足度が下がった', 'warn'); const t = REQ[r.id].at(); for (const b of city.B) if (Math.hypot(cx(b) - cx(t), cz(b) - cz(t)) < 90) S.buildingsHappy.set(b.id, Math.max(0.2, (S.buildingsHappy.get(b.id) || 0.6) - 0.08)); r.due = S.day + 2; }
    renderReqs(); if (S.view !== 'ground') applyInfoColors();
  }
  // initial
  rebuildBuilt(); lotMarkers(); previewRoad(null); E.meshes.lots.visible = false; E.meshes.infra.visible = false;
  setSpeed(1); setTool('select'); setView('ground');
  renderReqs(); renderHUD(); renderGoal(); S.dayStart = { pop: pop(), money: S.money, sat: Math.round(avgHappy() * 100) };
  if (!STILL) {
    ui.dlg.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="はじめに"><header><div><span class="kick">はじめに</span><h2>みなと町の町長になった</h2><span class="who">港の小さな町を、町の人の声を聞きながら育てる</span></div></header>
      <ol class="intro"><li><b>要望が届く</b><span>町の人が困りごとを持ってくる。街の上に <em>!</em> が出る</span></li><li><b>解説で学ぶ</b><span>困りごとに効く IT の仕組みを、動きを見ながら覚える</span></li><li><b>応えると街が変わる</b><span>学んだ手で応えると、街と地下の仕組みが育つ。学ばずに業者へ任せることもできる</span></li></ol>
      <div class="opts"><button type="button" class="opt good" data-start><span><strong>町を見て回る</strong><small>左ドラッグで移動、右ドラッグで回転、ホイールでズーム</small></span><b>▶</b></button></div></div>`;
    ui.dlg.hidden = false; S.prevSpeed = 1; setSpeed(0);
    ui.dlg.querySelector('[data-start]').addEventListener('click', () => { closeDlg(); setTimeout(() => addRequest('board'), 2500); });
  } else setTimeout(() => addRequest('board'), 1800);
  $('#boot').remove();
  window.__ready = true;
  window.__frame = (n, dt) => { for (let i = 0; i < (n || 1); i++) { last = performance.now() - (dt || 0.05) * 1000; frame(performance.now()); } };
  window.__snap = () => { cam.tx = cam.v.tx; cam.tz = cam.v.tz; cam.yaw = cam.v.yaw; cam.pitch = cam.v.pitch; cam.dist = cam.v.dist; };
  if (!STILL) requestAnimationFrame(frame); else frame(performance.now());
})();
