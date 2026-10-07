/* Mesher: accumulates flat-shaded, vertex-coloured triangles into one BufferGeometry, so a whole room or a
   whole forest is a single draw call. Every triangle gets a touch of brightness jitter, which is what gives
   the faceted "low-poly gem" look without any textures. Primitives stand on their base (y is the bottom). */
import * as THREE from 'three';
import { rng } from './util.js';

const _cache = new Map();
export function C(h) {
  if (h && h.isColor) return h;
  let c = _cache.get(h);
  if (!c) { c = new THREE.Color(h); _cache.set(h, c); }
  return c;
}

const _n3 = new THREE.Matrix3(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _bases = {};
function baseOf(key, make) {
  let b = _bases[key];
  if (b) return b;
  let g = make();
  if (g.index) g = g.toNonIndexed();
  g.computeVertexNormals();
  b = { pos: g.attributes.position.array, nor: g.attributes.normal.array, n: g.attributes.position.count };
  g.dispose();
  return (_bases[key] = b);
}
const BOX = () => baseOf('box', () => new THREE.BoxGeometry(1, 1, 1));
const CYL = (seg, ratio) => baseOf('cyl:' + seg + ':' + ratio, () => new THREE.CylinderGeometry(ratio, 1, 1, seg, 1));
const ICO = (d) => baseOf('ico:' + d, () => new THREE.IcosahedronGeometry(1, d));
const OCT = () => baseOf('oct', () => new THREE.OctahedronGeometry(1, 0));
const DOD = () => baseOf('dod', () => new THREE.DodecahedronGeometry(1, 0));

export class Mesher {
  constructor(seed) {
    this.rnd = rng(seed || 1);
    this.cap = 4096; this.n = 0;
    this.pos = new Float32Array(this.cap * 3); this.nor = new Float32Array(this.cap * 3); this.col = new Float32Array(this.cap * 3);
  }

  _grow(v) {
    if (this.n + v <= this.cap) return;
    let nc = this.cap; while (nc < this.n + v) nc *= 2;
    const g = (a) => { const b = new Float32Array(nc * 3); b.set(a.subarray(0, this.n * 3)); return b; };
    this.pos = g(this.pos); this.nor = g(this.nor); this.col = g(this.col); this.cap = nc;
  }

  /* one triangle, colour in linear space, winding flipped if the normal faces away from the hint */
  triRaw(ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b, hx, hy, hz) {
    let ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    if (hx !== undefined && nx * hx + ny * hy + nz * hz < 0) {
      let t; t = bx; bx = cx; cx = t; t = by; by = cy; cy = t; t = bz; bz = cz; cz = t; nx = -nx; ny = -ny; nz = -nz;
    }
    this._grow(3);
    const o = this.n * 3, P = this.pos, N = this.nor, K = this.col;
    P[o] = ax; P[o + 1] = ay; P[o + 2] = az; P[o + 3] = bx; P[o + 4] = by; P[o + 5] = bz; P[o + 6] = cx; P[o + 7] = cy; P[o + 8] = cz;
    for (let i = 0; i < 9; i += 3) { N[o + i] = nx; N[o + i + 1] = ny; N[o + i + 2] = nz; K[o + i] = r; K[o + i + 1] = g; K[o + i + 2] = b; }
    this.n += 3;
  }

  tri(a, b, c, color, hint, jit) {
    const col = C(color), k = jit ? 1 + (this.rnd() - 0.5) * 2 * jit : 1;
    this.triRaw(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], col.r * k, col.g * k, col.b * k, hint && hint[0], hint && hint[1], hint && hint[2]);
  }

  /* quad as two triangles; corners go around the quad in order */
  quad(a, b, c, d, color, hint, jit) { this.tri(a, b, c, color, hint, jit); this.tri(a, c, d, color, hint, jit); }

  _addBase(base, m, color, jit) {
    const col = C(color), me = m.elements, P = base.pos, N = base.nor;
    _n3.getNormalMatrix(m);
    this._grow(base.n);
    for (let i = 0; i < base.n; i += 3) {
      const k = 1 + (this.rnd() - 0.5) * 2 * (jit === undefined ? 0.07 : jit);
      const r = col.r * k, g = col.g * k, b = col.b * k;
      for (let j = 0; j < 3; j++) {
        const o = (i + j) * 3, x = P[o], y = P[o + 1], z = P[o + 2], w = (this.n + i + j) * 3;
        this.pos[w] = me[0] * x + me[4] * y + me[8] * z + me[12];
        this.pos[w + 1] = me[1] * x + me[5] * y + me[9] * z + me[13];
        this.pos[w + 2] = me[2] * x + me[6] * y + me[10] * z + me[14];
        _v.set(N[o], N[o + 1], N[o + 2]).applyMatrix3(_n3).normalize();
        this.nor[w] = _v.x; this.nor[w + 1] = _v.y; this.nor[w + 2] = _v.z;
        this.col[w] = r; this.col[w + 1] = g; this.col[w + 2] = b;
      }
    }
    this.n += base.n;
  }

  _place(x, yc, z, sx, sy, sz, o) {
    _e.set((o && o.rx) || 0, (o && o.ry) || 0, (o && o.rz) || 0, 'YXZ');
    _q.setFromEuler(_e); _p.set(x, yc, z); _s.set(sx, sy, sz);
    return _m.compose(_p, _q, _s);
  }

  /* box: x,z centre, y bottom */
  box(x, y, z, w, h, d, color, o) { this._addBase(BOX(), this._place(x, y + h / 2, z, w, h, d, o), color, o && o.jit); return this; }
  /* cylinder or cone (ratio = top radius / bottom radius): x,z centre, y bottom */
  cyl(x, y, z, r, h, color, seg, ratio, o) { this._addBase(CYL(seg || 7, ratio === undefined ? 1 : ratio), this._place(x, y + h / 2, z, r, h, r, o), color, o && o.jit); return this; }
  cone(x, y, z, r, h, color, seg, o) { return this.cyl(x, y, z, r, h, color, seg || 6, 0, o); }
  /* blobby icosahedron, y is the centre; sy squashes it */
  ico(x, y, z, r, color, o) { this._addBase(ICO((o && o.detail) || 0), this._place(x, y, z, r * ((o && o.sx) || 1), r * ((o && o.sy) || 1), r * ((o && o.sz) || 1), o), color, o && o.jit); return this; }
  oct(x, y, z, r, color, o) { this._addBase(OCT(), this._place(x, y, z, r * ((o && o.sx) || 1), r * ((o && o.sy) || 1.4), r * ((o && o.sz) || 1), o), color, o && o.jit); return this; }
  dod(x, y, z, r, color, o) { this._addBase(DOD(), this._place(x, y, z, r, r * ((o && o.sy) || 1), r, o), color, o && o.jit); return this; }

  /* a box from point a to point b (centre lines), w wide and h thick, for rails, beams and rungs */
  beam(a, b, w, h, color, o) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-6;
    _p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    _q.setFromUnitVectors(_v.set(0, 0, 1), _s.set(dx / L, dy / L, dz / L));
    _s.set(w, h, L);
    this._addBase(BOX(), _m.compose(_p, _q, _s), color, o && o.jit);
    return this;
  }

  get empty() { return this.n === 0; }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, this.n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor.slice(0, this.n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.slice(0, this.n * 3), 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }

  mesh(mat, opt) {
    const m = new THREE.Mesh(this.geometry(), mat);
    m.castShadow = !opt || opt.cast !== false; m.receiveShadow = !opt || opt.receive !== false;
    return m;
  }
}
