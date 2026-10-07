/* Scenery: sky, light, forest, crags, clouds, stars and fireflies. Nothing here depends on game state. */
import * as THREE from 'three';
import { Mesher, C } from './mesher.js';
import { rng, n2 } from './util.js';
import { PAL } from './palette.js';

export function skyTexture(night) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  if (night) { gr.addColorStop(0, '#070d22'); gr.addColorStop(0.55, '#16234a'); gr.addColorStop(1, '#3a3d6e'); }
  else { gr.addColorStop(0, '#6fa6de'); gr.addColorStop(0.5, '#b9d8f0'); gr.addColorStop(1, '#fde7c6'); }
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(0.25, 'rgba(255,190,80,0.55)'); gr.addColorStop(1, 'rgba(255,170,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- trees, merged once and planted as instances ---------- */
function pineGeo() {
  const m = new Mesher(21);
  m.cyl(0, 0, 0, 0.14, 0.7, '#6a4630', 5, 0.8);
  m.cone(0, 0.45, 0, 0.78, 1.15, '#2f6b37', 7, { jit: 0.09 });
  m.cone(0, 1.1, 0, 0.6, 1.0, '#367a3f', 7, { jit: 0.09 });
  m.cone(0, 1.65, 0, 0.42, 0.9, '#3f8a46', 7, { jit: 0.09 });
  m.cone(0, 2.15, 0, 0.2, 0.55, '#4a9b46', 6, { jit: 0.09 });
  return m.geometry();
}
function roundTreeGeo() {
  const m = new Mesher(22);
  m.cyl(0, 0, 0, 0.16, 0.9, '#7a5336', 5, 0.75);
  m.ico(0, 1.35, 0, 0.78, '#5fae4f', { detail: 1, jit: 0.1 });
  m.ico(0.35, 1.0, 0.15, 0.5, '#54a549', { detail: 0, jit: 0.1 });
  m.ico(-0.3, 1.75, -0.1, 0.5, '#68b653', { detail: 0, jit: 0.1 });
  return m.geometry();
}
export function forest(spots) {
  const grp = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const pines = spots.filter((s) => !s.round), rounds = spots.filter((s) => s.round);
  [[pineGeo(), pines], [roundTreeGeo(), rounds]].forEach(([geo, list]) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(), col = new THREE.Color();
    list.forEach((s, i) => {
      const k = [0.85, 1.15, 1.6][s.s] * (0.9 + s.r * 0.25);
      o.position.set(s.x, s.y, s.z); o.rotation.set(0, s.r * 6.28, 0); o.scale.set(k * (0.9 + s.r * 0.2), k * (0.9 + n2(i, 3, 5) * 0.3), k * (0.9 + s.r * 0.2)); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      const v = 0.82 + n2(i, 7, 9) * 0.3; col.setRGB(v * (0.95 + s.r * 0.1), v, v * (0.92 + n2(i, 11, 3) * 0.12)); im.setColorAt(i, col);
    });
    im.castShadow = true; im.receiveShadow = false; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    grp.add(im);
  });
  return grp;
}

/* crags, boulders and crystals on the bare rock */
export function crags(spots) {
  const m = new Mesher(31), cols = ['#596a96', '#4c5c80', '#66779f'], gem = ['#6fd3e0', '#a06bd6', '#2e8ca0', '#e08aa8'];
  spots.forEach((s) => {
    if (s.t < 0.5) {
      const r = 0.35 + s.r * 0.55;
      m.dod(s.x, r * 0.6, s.z, r, cols[Math.floor(s.r * 3) % 3], { sy: 0.8, ry: s.r * 6 });
      if (s.r > 0.5) m.dod(s.x + r * 0.9, 0.2, s.z + 0.2, r * 0.45, cols[(Math.floor(s.r * 3) + 1) % 3], { ry: s.t * 9 });
    } else {
      const c = gem[Math.floor(s.r * 4) % 4];
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + s.r * 5, h = 0.6 + n2(i, Math.floor(s.r * 99), 77) * 0.9;
        m.oct(s.x + Math.cos(a) * 0.22, h * 0.6, s.z + Math.sin(a) * 0.22, 0.2, c, { sy: h * 2.4, sx: 0.8, sz: 0.8, jit: 0.12, rz: Math.cos(a) * 0.25, rx: Math.sin(a) * 0.25 });
      }
    }
  });
  return m.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: true, receive: true });
}

/* ---------- clouds ---------- */
export function clouds(B) {
  const grp = new THREE.Group(), r = rng(41), mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2, span = Math.max(B.x1 - B.x0, B.z1 - B.z0);
  for (let i = 0; i < 9; i++) {
    const m = new Mesher(50 + i), n = 4 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) m.ico((k - n / 2) * 1.5 + r(), r() * 0.6, (r() - 0.5) * 1.6, 1.3 + r() * 1.3, r() > 0.5 ? '#ffffff' : '#f3f8ff', { detail: 1, sy: 0.62, jit: 0.05 });
    const c = m.mesh(mat, { cast: false, receive: false });
    const a = i / 9 * 6.283 + r() * 0.6, rad = span * (0.78 + r() * 0.3);
    c.position.set(cx + Math.cos(a) * rad, 24 + r() * 16, cz + Math.sin(a) * rad * 0.75);
    c.scale.setScalar(0.9 + r() * 1.0); c.userData = { sp: 0.25 + r() * 0.35, ph: r() * 6, rad: rad, a0: a };
    grp.add(c);
  }
  return grp;
}

/* ---------- night extras ---------- */
export function stars(B) {
  const r = rng(61), n = 340, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, e = 0.12 + r() * 1.2, R = 240;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * R + (B.x0 + B.x1) / 2; pos[i * 3 + 1] = Math.sin(e) * R * 0.7 + 10; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R + (B.z0 + B.z1) / 2;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff6d8', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
  p.visible = false; return p;
}

export function fireflies(B, Zg, count) {
  const r = rng(71), n = count || 70, pos = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) { const x = B.x0 + 2 + r() * (B.x1 - B.x0 - 4), z = B.z0 + 2 + r() * (Zg - B.z0 - 3), y = 0.6 + r() * 2.2; base.push([x, y, z, r() * 6.28, 0.4 + r() * 0.8]); pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#d8ff7a', size: 5, sizeAttenuation: false, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.userData.update = (t) => { const a = g.attributes.position; for (let i = 0; i < n; i++) { const b = base[i]; a.array[i * 3] = b[0] + Math.sin(t * b[4] + b[3]) * 0.7; a.array[i * 3 + 1] = b[1] + Math.sin(t * b[4] * 1.3 + b[3] * 2) * 0.35; a.array[i * 3 + 2] = b[2] + Math.cos(t * b[4] * 0.9 + b[3]) * 0.7; } a.needsUpdate = true; };
  p.visible = false; p.frustumCulled = false; return p;
}

/* ---------- soft puffs: chimney smoke and the river's mist ---------- */
export function puffs(x, y, z, o) {
  o = o || {};
  const grp = new THREE.Group(), n = o.n || 6, mats = [], meshes = [];
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshLambertMaterial({ color: o.color || '#f3f6fa', transparent: true, opacity: 0.0, depthWrite: false, flatShading: true });
    const me = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat); me.castShadow = false; grp.add(me); mats.push(mat); meshes.push(me);
  }
  grp.position.set(x, y, z);
  grp.userData.update = (t) => {
    for (let i = 0; i < n; i++) {
      const ph = ((t * (o.speed || 0.22) + i / n) % 1), s = (o.size || 0.3) * (0.4 + ph * 1.5);
      meshes[i].position.set((o.drift || 0.6) * ph + Math.sin(ph * 5 + i) * 0.08, ph * (o.rise || 2.2), Math.cos(ph * 4 + i) * 0.08);
      meshes[i].scale.setScalar(s); meshes[i].rotation.set(ph * 3 + i, ph * 2, 0);
      mats[i].opacity = Math.sin(Math.PI * ph) * (o.alpha || 0.55);
    }
  };
  return grp;
}

export function starTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'); g.translate(32, 32);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,240,170,0.9)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -30); g.lineTo(4, -4); g.lineTo(30, 0); g.lineTo(4, 4); g.lineTo(0, 30); g.lineTo(-4, 4); g.lineTo(-30, 0); g.lineTo(-4, -4); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
