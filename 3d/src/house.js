/* The white house: an open-fronted dollhouse so the Living Room, Kitchen and Attic can be seen into.
   The shell is always standing; the furniture belongs to the rooms and appears as they are found. */
import * as THREE from 'three';
import { Mesher } from './mesher.js';
import { PAL } from './palette.js';

export function buildHouse(L) {
  const lr = L.P('living-room'), k = L.P('kitchen'), T = L.ELEV.attic;
  const x0 = L.houseRect.x0, x1 = L.houseRect.x1, zb = L.houseRect.zb, zf = L.houseRect.zf, midX = (lr.x + k.x) / 2, wallH = 2.6, ridge = 4.5, zr = (zb + zf) / 2;
  const m = new Mesher(301), t = 0.14;
  const W = PAL.houseW, WD = PAL.houseD, wood = '#b08450';

  /* floor slab with the trapdoor and chimney openings left out */
  const slab = (ax, az, bx, bz) => m.box((ax + bx) / 2, -0.12, (az + bz) / 2, bx - ax, 0.12, bz - az, wood, { jit: 0.03 });
  const tdx = lr.x - 0.0, tdz = lr.z + 0.75, hole = 0.55;
  slab(x0, zb, x1, tdz - hole); slab(x0, tdz + hole, x1, zf);
  slab(x0, tdz - hole, tdx - hole, tdz + hole); slab(tdx + hole, tdz - hole, k.x - hole, tdz + hole); slab(k.x + hole, tdz - hole, x1, tdz + hole);
  /* foundation stones */
  m.box((x0 + x1) / 2, -0.35, zb, x1 - x0 + 0.3, 0.35, 0.3, '#8a94a6', { jit: 0.08 });
  m.box(x0, -0.35, (zb + zf) / 2, 0.3, 0.35, zf - zb, '#8a94a6', { jit: 0.08 });
  m.box(x1, -0.35, (zb + zf) / 2, 0.3, 0.35, zf - zb, '#8a94a6', { jit: 0.08 });

  /* back wall with a window, side walls, a partition with a doorway, a kitchen window on the east */
  const clap = (cx, cz, w, d, h, y0) => { m.box(cx, y0, cz, w, h, d, W, { jit: 0.025 }); };
  clap((x0 + x1) / 2, zb, x1 - x0, t, wallH, 0);
  m.box(lr.x, 1.05, zb + t / 2, 0.9, 0.9, 0.05, '#7fb4d6', { jit: 0.02 }); m.box(lr.x, 0.98, zb + t, 1.02, 0.06, 0.12, WD);
  m.box(k.x, 1.05, zb + t / 2, 0.9, 0.9, 0.05, '#7fb4d6', { jit: 0.02 }); m.box(k.x, 0.98, zb + t, 1.02, 0.06, 0.12, WD);
  clap(x0, (zb + zf) / 2, t, zf - zb, wallH, 0);
  /* boarded front door on the west wall */
  m.box(x0 - 0.08, 0.15, lr.z + 0.6, 0.06, 1.9, 1.0, '#6a4630', { jit: 0.03 });
  for (let i = 0; i < 4; i++) m.box(x0 - 0.13, 0.35 + i * 0.45, lr.z + 0.6, 0.05, 0.12, 1.15, '#b59a72', { jit: 0.05, rx: (i % 2 ? 0.12 : -0.12) });
  /* east wall: window onto the Kitchen */
  const wz0 = k.z - 0.55, wz1 = k.z + 0.55;
  m.box(x1, 0, (zb + wz0) / 2, t, wallH, wz0 - zb, W, { jit: 0.025 });
  m.box(x1, 0, (wz1 + zf) / 2, t, wallH, zf - wz1, W, { jit: 0.025 });
  m.box(x1, 0, k.z, t, 0.7, wz1 - wz0, W, { jit: 0.025 });
  m.box(x1, 1.75, k.z, t, wallH - 1.75, wz1 - wz0, W, { jit: 0.025 });
  m.box(x1 + 0.08, 0.7, k.z, 0.06, 0.06, 1.3, WD); m.box(x1 + 0.08, 1.75, k.z, 0.06, 0.06, 1.3, WD);
  m.box(x1 + 0.1, 0.72, wz0 - 0.03, 0.05, 1.05, 0.06, WD); m.box(x1 + 0.1, 0.72, wz1 + 0.03, 0.05, 1.05, 0.06, WD);
  /* partition between the rooms, with a doorway */
  const dz0 = lr.z - 0.45, dz1 = lr.z + 0.45;
  m.box(midX, 0, (zb + dz0) / 2, t, wallH, dz0 - zb, WD, { jit: 0.02 });
  m.box(midX, 0, (dz1 + zf) / 2, t, wallH, zf - dz1, WD, { jit: 0.02 });
  m.box(midX, 1.95, lr.z, t, wallH - 1.95, dz1 - dz0, WD, { jit: 0.02 });
  /* attic floor over the kitchen, with a gap for the stairs */
  const ax0 = k.x - 1.3, ax1 = k.x + 1.3, sx = k.x - 0.85;
  m.box((sx + 0.45 + ax1) / 2, T - 0.14, (zb + t + zr + 0.3) / 2, ax1 - sx - 0.45, 0.14, zr + 0.3 - zb - t, wood, { jit: 0.03 });
  /* rafters and the north roof slope (the south side is left open to see in), gables on the ends */
  const slope = [[x0 - 0.35, zb - 0.45, wallH], [x1 + 0.35, zb - 0.45, wallH], [x1 + 0.35, zr, ridge], [x0 - 0.35, zr, ridge]];
  const roofCols = ['#4a5068', '#444a62', '#51587a', '#3f455c'];
  const nRows = 7;
  for (let r = 0; r < nRows; r++) {
    const t0 = r / nRows, t1 = (r + 1) / nRows, col = roofCols[r % roofCols.length];
    const p = (tt, X) => [X, wallH + (ridge - wallH) * tt + 0.06, zb - 0.45 + (zr - (zb - 0.45)) * tt];
    const cols = 8;
    for (let c = 0; c < cols; c++) {
      const xa = x0 - 0.35 + (x1 - x0 + 0.7) * c / cols, xb = x0 - 0.35 + (x1 - x0 + 0.7) * (c + 1) / cols;
      m.quad(p(t0, xa), p(t0, xb), p(t1, xb), p(t1, xa), (r + c) % 2 ? col : roofCols[(r + 1) % roofCols.length], [0, 1, -0.6], 0.04);
    }
    /* underside so the roof reads from inside as well */
  }
  m.box((x0 + x1) / 2, ridge - 0.02, zr, x1 - x0 + 0.7, 0.14, 0.22, '#61698a', { jit: 0.04 });
  /* thickness along the eave */
  m.box((x0 + x1) / 2, wallH - 0.02, zb - 0.45, x1 - x0 + 0.7, 0.14, 0.14, '#363b50');
  [x0, x1].forEach((gx, gi) => {
    const s = gi ? 1 : -1, xx = gx + s * 0.02;
    m.tri([xx, wallH, zb], [xx, wallH, zf], [xx, ridge, zr], W, [s, 0, 0], 0.03);
    m.box(gx + s * 0.05, ridge - 0.06, zr, 0.1, 0.06, 0.1, WD);
    m.beam([gx, wallH + 0.02, zb - 0.45], [gx, ridge, zr], 0.12, 0.12, '#5b4632');
  });
  /* rafter over the open side so the roof looks supported */
  m.beam([x0, wallH, zf], [x0, ridge, zr], 0.1, 0.1, '#6a4630'); m.beam([x1, wallH, zf], [x1, ridge, zr], 0.1, 0.1, '#6a4630');
  m.beam([midX, wallH, zf], [midX, ridge - 0.25, zr], 0.08, 0.08, '#6a4630');
  m.box(x0 + 0.12, 0, zf - 0.06, 0.16, wallH, 0.16, WD); m.box(x1 - 0.12, 0, zf - 0.06, 0.16, wallH, 0.16, WD);
  /* chimney on the north slope above the Kitchen */
  const chx = k.x + 0.35, chz = zb - 0.1;
  m.box(chx, wallH - 0.1, chz, 0.62, 2.35, 0.62, '#9a4a36', { jit: 0.08 });
  m.box(chx, wallH + 2.22, chz, 0.78, 0.14, 0.78, '#6a3324');
  const house = m.mesh(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { cast: true, receive: true });
  return { mesh: house, chimney: { x: chx, y: wallH + 2.4, z: chz }, bounds: { x0, x1, zb, zf }, trapdoor: { x: tdx, z: tdz } };
}
