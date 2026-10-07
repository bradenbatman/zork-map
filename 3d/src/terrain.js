/* Terrain: one grid covers the whole floating island. North of the ground line it is grass, south of it bare
   rock. Discovered rooms, tunnels and the Great Canyon are carved out of it, so the underground reads as an
   excavation you can look straight into. The grid is rebuilt when the replay slider moves, everything else in
   the scene is built once. */
import * as THREE from 'three';
import { Mesher, C } from './mesher.js';
import { clamp, lerp, smooth, n2, vn } from './util.js';
import { CELL, UG, GORGE } from './layout.js';
import { GRASS, GRASS_LIP, ROCK_TOP, SOIL, STRATA, FLOORS, WALLS, KIND_LIST, KIND_ID } from './palette.js';

const SKIRT = 6.5, BASE_DEPTH = 15;

export function makeTerrain(L) {
  const B = L.bounds, nx = Math.round((B.x1 - B.x0) / CELL), nz = Math.round((B.z1 - B.z0) / CELL);
  const N = nx * nz, cx = (i) => B.x0 + i * CELL, cz = (j) => B.z0 + j * CELL;
  const idx = (i, j) => j * nx + i;
  const inb = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz;

  /* jagged grass/rock boundary along the ground line */
  const isGrass = new Uint8Array(N);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const z = cz(j) + CELL / 2, x = cx(i) + CELL / 2, edge = L.Zg + (vn(x, 0, 71, 3.2) - 0.5) * 2.6 + (vn(x, 0, 72, 1.1) - 0.5) * 0.7;
    isGrass[idx(i, j)] = z < edge ? 1 : 0;
  }

  /* ---------- carving ---------- */
  function newGrid() { return { depth: new Float32Array(N), kind: new Uint8Array(N), prio: new Uint8Array(N) }; }
  function mark(G, i, j, d, k, p) {
    if (!inb(i, j) || d <= 0.02) return;
    const q = idx(i, j);
    if (p >= G.prio[q] || G.depth[q] === 0) { G.kind[q] = k; G.prio[q] = p; }
    if (d > G.depth[q]) G.depth[q] = d;
  }
  function rectCells(x0, z0, x1, z1) {
    return { i0: Math.floor((x0 - B.x0) / CELL + 1e-6), i1: Math.ceil((x1 - B.x0) / CELL - 1e-6) - 1, j0: Math.floor((z0 - B.z0) / CELL + 1e-6), j1: Math.ceil((z1 - B.z0) / CELL - 1e-6) - 1 };
  }
  function carveRect(G, x0, z0, x1, z1, depth, kind, pr) {
    const r = rectCells(x0, z0, x1, z1);
    for (let j = r.j0; j <= r.j1; j++) for (let i = r.i0; i <= r.i1; i++) mark(G, i, j, typeof depth === 'function' ? depth(cx(i) + CELL / 2, cz(j) + CELL / 2) : depth, kind, pr);
  }
  function carveRoute(G, route, width, kind, pr) {
    const pts = route.pts, h = width / 2;
    let base = 0;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len > 1e-4) {
        const horiz = Math.abs(b.z - a.z) < 1e-4;
        const rx0 = horiz ? Math.min(a.x, b.x) - h : a.x - h, rx1 = horiz ? Math.max(a.x, b.x) + h : a.x + h;
        const rz0 = horiz ? a.z - h : Math.min(a.z, b.z) - h, rz1 = horiz ? a.z + h : Math.max(a.z, b.z) + h;
        const r = rectCells(rx0, rz0, rx1, rz1);
        for (let j = r.j0; j <= r.j1; j++) for (let i = r.i0; i <= r.i1; i++) {
          const x = cx(i) + CELL / 2, z = cz(j) + CELL / 2;
          const s = base + clamp(horiz ? (x - a.x) * Math.sign(b.x - a.x) : (z - a.z) * Math.sign(b.z - a.z), 0, len);
          const y = route.at(s).y;
          mark(G, i, j, -y, kind, pr);
        }
      }
      base += len;
    }
  }
  const EDGE_CARVE = { tunnel: ['stone', 1.2], slide: ['steel', 1.2], chimney: ['brickRed', 1.2], river: ['water', 1.6] };

  function carveAll(visRooms, visEdges) {
    const G = newGrid();
    /* the canyon: a ravine, a shelf for the Rocky Ledge, the river and a sinkhole where it goes underground */
    const g = L.gorge, s = L.shelf, h = L.houseRect;
    carveRect(G, h.x0 - 0.2, h.zb - 0.2, h.x1 + 0.2, h.zf + 0.2, 0.17, KIND_ID.woodDark, 0);
    carveRect(G, g.x0, g.z0, g.x1, g.z1, g.depth, KIND_ID.sand, 1);
    carveRect(G, s.x0, s.z0, s.x1, s.z1, s.depth, KIND_ID.rockfloor, 1);
    carveRect(G, g.riverX - 0.6, g.z0, g.riverX + 0.6, g.z1 - 1.0, g.depth + 0.5, KIND_ID.water, 2);
    carveRect(G, g.riverX - 1.0, g.z1 - 1.8, g.riverX + 1.0, g.z1 - 0.2, g.depth + 1.4, KIND_ID.abyss, 3);
    visEdges.forEach((e) => {
      const c = EDGE_CARVE[L.classOf(e)]; if (!c) return;
      const r = L.route(e); carveRoute(G, r, c[1], KIND_ID[c[0]], 2);
      if (L.classOf(e) === 'river') carveRoute(G, r, c[1], KIND_ID.water, 2);
    });
    visRooms.forEach((id) => {
      if (!L.carved(id)) return;
      const p = L.P(id), sz = L.size(id), fk = L.floorOf(id);
      carveRect(G, p.x - sz.w / 2, p.z - sz.d / 2, p.x + sz.w / 2, p.z + sz.d / 2, UG, KIND_ID[fk] || KIND_ID.stone, 3);
    });
    return G;
  }

  /* ---------- heights: gentle rolling grass, flat wherever anything happens ---------- */
  const all = carveAll(L.ids, L.edges.filter(L.usable));
  const prot = new Float32Array(N); // distance in cells to the nearest protected cell
  for (let q = 0; q < N; q++) prot[q] = 99;
  L.ids.forEach((id) => {
    const p = L.P(id), s = L.size(id), rr = s.pad ? s.r + 0.6 : Math.max(s.w, s.d) / 2 + 0.8;
    const r = rectCells(p.x - rr, p.z - rr, p.x + rr, p.z + rr);
    for (let j = r.j0; j <= r.j1; j++) for (let i = r.i0; i <= r.i1; i++) if (inb(i, j)) prot[idx(i, j)] = 0;
  });
  L.edges.forEach((e) => {
    if (!L.usable(e)) return;
    const cls = L.classOf(e); if (cls === 'rainbow' || cls === 'interior' || cls === 'stairs') return;
    const r = L.route(e); r.pts.forEach((p, k) => {
      if (!k) return; const a = r.pts[k - 1], rr = rectCells(Math.min(a.x, p.x) - 0.9, Math.min(a.z, p.z) - 0.9, Math.max(a.x, p.x) + 0.9, Math.max(a.z, p.z) + 0.9);
      for (let j = rr.j0; j <= rr.j1; j++) for (let i = rr.i0; i <= rr.i1; i++) if (inb(i, j)) prot[idx(i, j)] = 0;
    });
  });
  { const hr = rectCells(-2.6, 0.6, 5.4, 5.0); for (let j = hr.j0; j <= hr.j1; j++) for (let i = hr.i0; i <= hr.i1; i++) if (inb(i, j)) prot[idx(i, j)] = 0; }
  for (let q = 0; q < N; q++) if (all.depth[q] > 0) prot[q] = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const q = idx(i, j); if (i > 0) prot[q] = Math.min(prot[q], prot[q - 1] + 1); if (j > 0) prot[q] = Math.min(prot[q], prot[q - nx] + 1); }
  for (let j = nz - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const q = idx(i, j); if (i < nx - 1) prot[q] = Math.min(prot[q], prot[q + 1] + 1); if (j < nz - 1) prot[q] = Math.min(prot[q], prot[q + nx] + 1); }

  const cw = nx + 1, Hc = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    let m = 1, grass = 0;
    for (let dj = -1; dj <= 0; dj++) for (let di = -1; di <= 0; di++) {
      const a = i + di, b = j + dj;
      if (!inb(a, b)) { m = 0; continue; }
      m = Math.min(m, smooth((prot[idx(a, b)] - 1.5) / 5)); grass += isGrass[idx(a, b)];
    }
    const x = cx(i), z = cz(j), h = (vn(x, z, 81, 6) - 0.5) * 0.9 + (vn(x, z, 82, 2.2) - 0.5) * 0.3;
    Hc[j * cw + i] = grass === 4 ? h * m : 0;
  }
  const H = (i, j) => Hc[j * cw + i];

  /* ---------- rendering ---------- */
  const wallBand = (k, band, q) => { const pal = WALLS[KIND_LIST[k]] || WALLS.stone; return pal[(band + Math.floor(n2(q, band, 91) * 3)) % pal.length]; };
  function render(G) {
    const m = new Mesher(7), wm = new Mesher(8), rk = {};
    const UP = [0, 1, 0];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const q = idx(i, j), d = G.depth[q], x0 = cx(i), x1 = x0 + CELL, z0 = cz(j), z1 = z0 + CELL;
      if (d <= 0) {
        const h00 = H(i, j), h10 = H(i + 1, j), h11 = H(i + 1, j + 1), h01 = H(i, j + 1), grass = isGrass[q];
        const noise = n2(i, j, 101), pal = grass ? GRASS : ROCK_TOP;
        let c1 = pal[Math.floor(n2(i, j, 102) * pal.length) % pal.length], c2 = pal[Math.floor(n2(i, j, 103) * pal.length) % pal.length];
        if (!grass) { if (n2(i, j, 104) > 0.996) c1 = '#2e8ca0'; else if (n2(i, j, 105) > 0.997) c1 = '#b8862a'; }
        const a = [x0, h00, z0], b = [x1, h10, z0], c = [x1, h11, z1], dd = [x0, h01, z1];
        if (noise > 0.5) { m.tri(a, dd, b, c1, UP); m.tri(b, dd, c, c2, UP); } else { m.tri(a, dd, c, c1, UP); m.tri(a, c, b, c2, UP); }
        continue;
      }
      const k = G.kind[q], pal = FLOORS[KIND_LIST[k]] || FLOORS.stone, fy = -d;
      const fc = pal[(i + j) & 1];
      m.quad([x0, fy, z0], [x0, fy, z1], [x1, fy, z1], [x1, fy, z0], fc, UP, 0.03);
      if (k === KIND_ID.water) wm.quad([x0, fy + 0.55, z0], [x0, fy + 0.55, z1], [x1, fy + 0.55, z1], [x1, fy + 0.55, z0], '#3f86cc', UP, 0.05);
      /* walls: a face looks into this cell wherever the neighbour is shallower */
      const nb = [[i - 1, j, -1, 0], [i + 1, j, 1, 0], [i, j - 1, 0, -1], [i, j + 1, 0, 1]];
      for (let t = 0; t < 4; t++) {
        const ni = nb[t][0], nj = nb[t][1], dxn = nb[t][2], dzn = nb[t][3];
        const nd = inb(ni, nj) ? G.depth[idx(ni, nj)] : 0;
        if (nd >= d - 0.01) continue;
        /* the edge shared with the neighbour */
        let ax, az, bx, bz, ha, hb;
        if (dxn) { ax = dxn > 0 ? x1 : x0; bx = ax; az = z0; bz = z1; const ci = dxn > 0 ? i + 1 : i; ha = H(ci, j); hb = H(ci, j + 1); }
        else { az = dzn > 0 ? z1 : z0; bz = az; ax = x0; bx = x1; const cj = dzn > 0 ? j + 1 : j; ha = H(i, cj); hb = H(i + 1, cj); }
        const topA = nd > 0 ? -nd : ha, topB = nd > 0 ? -nd : hb, hint = [-dxn, 0, -dzn], height = (topA + topB) / 2 + d;
        const bands = Math.max(1, Math.round(height / 0.36));
        for (let s = 0; s < bands; s++) {
          const t0 = s / bands, t1 = (s + 1) / bands;
          const yA0 = lerp(fy, topA, t0), yA1 = lerp(fy, topA, t1), yB0 = lerp(fy, topB, t0), yB1 = lerp(fy, topB, t1);
          const col = wallBand(k, s, q + t * 7);
          m.quad([ax, yA0, az], [bx, yB0, bz], [bx, yB1, bz], [ax, yA1, az], col, hint, 0.05);
        }
      }
    }
    const terrain = m.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: true, receive: true });
    const water = wm.empty ? null : wm.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.78 }), { cast: false, receive: true });
    return { terrain, water };
  }

  /* ---------- island sides and the rocky underside ---------- */
  function buildBase() {
    const m = new Mesher(11), out = [];
    const nxs = nx, nzs = nz;
    const soilBand = (s, q) => (s < 1 ? GRASS_LIP : s < 4 ? SOIL[(s + Math.floor(n2(q, s, 111) * 3)) % SOIL.length] : STRATA[(s + Math.floor(n2(q, s, 112) * 4)) % STRATA.length]);
    const BAND = 0.5, bands = Math.round(SKIRT / BAND);
    const edgeQuad = (ax, az, bx, bz, hint, q, grass) => {
      for (let s = 0; s < bands; s++) {
        const y0 = -s * BAND, y1 = -(s + 1) * BAND;
        const col = grass ? soilBand(s, q) : STRATA[(s + Math.floor(n2(q, s, 113) * 4)) % STRATA.length];
        m.quad([ax, y0, az], [ax, y1, az], [bx, y1, bz], [bx, y0, bz], col, hint, 0.05);
      }
    };
    for (let i = 0; i < nxs; i++) {
      edgeQuad(cx(i), B.z0, cx(i + 1), B.z0, [0, 0, -1], i, isGrass[idx(i, 0)]);
      edgeQuad(cx(i), B.z1, cx(i + 1), B.z1, [0, 0, 1], i + 500, isGrass[idx(i, nz - 1)]);
    }
    for (let j = 0; j < nzs; j++) {
      edgeQuad(B.x0, cz(j), B.x0, cz(j + 1), [-1, 0, 0], j + 1000, isGrass[idx(0, j)]);
      edgeQuad(B.x1, cz(j), B.x1, cz(j + 1), [1, 0, 0], j + 1500, isGrass[idx(nx - 1, j)]);
    }
    /* the underside: a coarse jittered grid that narrows to a point, like a floating island */
    const gx = 12, gz = 16, w = B.x1 - B.x0, d = B.z1 - B.z0, pts = [];
    for (let j = 0; j <= gz; j++) for (let i = 0; i <= gx; i++) {
      const u = i / gx * 2 - 1, v = j / gz * 2 - 1, r = Math.max(Math.abs(u), Math.abs(v)), edge = i === 0 || j === 0 || i === gx || j === gz;
      const jx = edge ? 0 : (n2(i, j, 121) - 0.5) * w / gx * 0.6, jz = edge ? 0 : (n2(i, j, 122) - 0.5) * d / gz * 0.6;
      const depth = Math.pow(1 - r, 1.25) * BASE_DEPTH * (0.7 + 0.6 * n2(i, j, 123)) * (r < 0.98 ? 1 : 0);
      pts.push([B.x0 + (u + 1) / 2 * w + jx, -SKIRT - depth, B.z0 + (v + 1) / 2 * d + jz]);
    }
    const P = (i, j) => pts[j * (gx + 1) + i], DOWN = [0, -1, 0];
    const dark = ['#2f3a57', '#2a3450', '#37446a', '#243049', '#3e4c75'];
    for (let j = 0; j < gz; j++) for (let i = 0; i < gx; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), dd = P(i, j + 1), c1 = dark[Math.floor(n2(i, j, 131) * 5)], c2 = dark[Math.floor(n2(i, j, 132) * 5)];
      if (n2(i, j, 133) > 0.5) { m.tri(a, b, dd, c1, DOWN); m.tri(b, c, dd, c2, DOWN); } else { m.tri(a, b, c, c1, DOWN); m.tri(a, c, dd, c2, DOWN); }
    }
    out.push(m.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: false, receive: false }));
    return out;
  }

  /* where the trees go (computed once from the fully carved sheet, so they never pop) */
  function treeSpots() {
    const spots = [];
    for (let z = B.z0 + 1.2; z < L.Zg - 0.6; z += 1.45) for (let x = B.x0 + 1.2; x < B.x1 - 0.8; x += 1.45) {
      const jx = x + (n2(x * 10, z * 10, 141) - 0.5) * 1.3, jz = z + (n2(x * 10, z * 10, 142) - 0.5) * 1.3;
      const i = Math.floor((jx - B.x0) / CELL), j = Math.floor((jz - B.z0) / CELL);
      if (!inb(i, j) || !isGrass[idx(i, j)] || prot[idx(i, j)] < 4.2) continue;
      if (vn(jx, jz, 143, 7) < 0.22 && n2(x * 10, z * 10, 144) < 0.7) continue;
      const r = n2(x * 10, z * 10, 145), h = 0;
      spots.push({ x: jx, z: jz, y: h, s: r < 0.3 ? 0 : r < 0.82 ? 1 : 2, r: n2(x * 10, z * 10, 146), round: n2(x * 10, z * 10, 147) > 0.9 });
    }
    return spots;
  }
  /* crags and crystals on the bare rock */
  function rockSpots() {
    const spots = [];
    for (let z = L.Zg + 1.2; z < B.z1 - 0.8; z += 1.9) for (let x = B.x0 + 1; x < B.x1 - 0.6; x += 1.9) {
      const jx = x + (n2(x * 10, z * 10, 151) - 0.5) * 1.7, jz = z + (n2(x * 10, z * 10, 152) - 0.5) * 1.7;
      const i = Math.floor((jx - B.x0) / CELL), j = Math.floor((jz - B.z0) / CELL);
      if (!inb(i, j) || isGrass[idx(i, j)] || prot[idx(i, j)] < 4.0) continue;
      if (n2(x * 10, z * 10, 153) < 0.45) continue;
      spots.push({ x: jx, z: jz, r: n2(x * 10, z * 10, 154), t: n2(x * 10, z * 10, 155) });
    }
    return spots;
  }

  return { nx, nz, B, isGrass, carveAll, render, buildBase, treeSpots, rockSpots, heightAt: (x, z) => { const i = Math.floor((x - B.x0) / CELL), j = Math.floor((z - B.z0) / CELL); return inb(i, j) ? (H(i, j) + H(i + 1, j) + H(i, j + 1) + H(i + 1, j + 1)) / 4 : 0; }, prot, idx, inb };
}
