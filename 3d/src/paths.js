/* Path ribbons above ground: dirt paths between the outdoor rooms, the plank through the kitchen window,
   and the long rainbow bridge. The tunnels are carved into the terrain instead (see terrain.js). */
import * as THREE from 'three';
import { Mesher } from './mesher.js';
import { hash } from './util.js';
import { RAINBOW } from './palette.js';

export function buildPath(L, e) {
  const cls = L.classOf(e);
  if (cls !== 'path' && cls !== 'rainbow') return null;
  const r = L.route(e), m = new Mesher(hash(e.from + e.to)), n = Math.max(2, Math.ceil(r.total / (cls === 'rainbow' ? 0.7 : 0.4)));
  const pts = [];
  for (let i = 0; i <= n; i++) { const p = r.at(r.total * i / n); pts.push({ x: p.x, y: p.y, z: p.z }); }
  if (cls === 'path') {
    const sand = ['#c79a62', '#d2a66f', '#bf9059'];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1];
      m.beam([a.x, a.y + 0.03, a.z], [b.x, b.y + 0.03, b.z], 0.66, 0.07, sand[i % 3], { jit: 0.07 });
      const steep = Math.abs(b.y - a.y) / (Math.hypot(b.x - a.x, b.z - a.z) + 1e-6) > 0.25;
      if (steep || (Math.abs(b.y - a.y) > 0.12)) m.beam([a.x - 0.36, a.y + 0.05, a.z], [a.x + 0.36, a.y + 0.05, a.z], 0.08, 0.06, '#7d5630');
    }
    for (let i = 1; i < n; i += 2) { const a = pts[i]; m.dod(a.x + ((i % 4) - 1.5) * 0.12, a.y + 0.06, a.z + ((i % 3) - 1) * 0.1, 0.06, '#a98358', { sy: 0.6 }); }
  } else {
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, L2 = Math.hypot(dx, dz) || 1, px = -dz / L2, pz = dx / L2;
      for (let k = 0; k < 6; k++) {
        const o = (k - 2.5) * 0.3;
        m.beam([a.x + px * o, a.y, a.z + pz * o], [b.x + px * o, b.y, b.z + pz * o], 0.3, 0.12, RAINBOW[k], { jit: 0.03 });
      }
    }
  }
  return m.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: cls === 'path', receive: true });
}
