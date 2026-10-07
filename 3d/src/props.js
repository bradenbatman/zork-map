/* Props: small low-poly landmarks for each room. A prop is a function (m, c) that adds geometry to the room's
   mesher m. c carries the room: centre x,z, floor y, half sizes hw,hd, a seeded rnd, and helpers for the few
   things that move (spin, glow). Everything is whole-number simple shapes, in the spirit of the pixel sprites. */
import { PAL } from './palette.js';

/* ---------- small building blocks ---------- */
const bush = (m, x, y, z, s) => { s = s || 1; m.ico(x, y + 0.3 * s, z, 0.42 * s, '#3f8c48', { sy: 0.85 }); m.ico(x + 0.3 * s, y + 0.22 * s, z + 0.1 * s, 0.3 * s, '#4a9b46'); m.ico(x - 0.28 * s, y + 0.2 * s, z - 0.08 * s, 0.28 * s, '#54a549'); };
const FL = ['#e8735a', '#f5c542', '#ffffff', '#e08aa8', '#a06bd6'];
const flowers = (m, x, y, z, rnd, n) => { for (let i = 0; i < (n || 6); i++) { const a = rnd() * 6.28, r = 0.25 + rnd() * 0.7, fx = x + Math.cos(a) * r, fz = z + Math.sin(a) * r; m.cyl(fx, y, fz, 0.012, 0.18, '#2f6b37', 4); m.oct(fx, y + 0.2, fz, 0.06, FL[Math.floor(rnd() * FL.length)], { sy: 0.8 }); } };
const rocks = (m, x, y, z, rnd, n, col) => { for (let i = 0; i < (n || 2); i++) { const r = 0.2 + rnd() * 0.22; m.dod(x + (rnd() - 0.5) * 0.7, y + r * 0.55, z + (rnd() - 0.5) * 0.7, r, col || ['#7b859c', '#6a748c', '#8a94a6'][Math.floor(rnd() * 3)], { sy: 0.75, ry: rnd() * 6 }); } };
const pine = (m, x, y, z, s) => { s = s || 1; m.cyl(x, y, z, 0.14 * s, 0.7 * s, '#6a4630', 5, 0.8); m.cone(x, y + 0.45 * s, z, 0.78 * s, 1.15 * s, '#2f6b37', 7); m.cone(x, y + 1.1 * s, z, 0.6 * s, 1.0 * s, '#367a3f', 7); m.cone(x, y + 1.65 * s, z, 0.42 * s, 0.9 * s, '#3f8a46', 7); m.cone(x, y + 2.15 * s, z, 0.2 * s, 0.55 * s, '#4a9b46', 6); };
const stalagmite = (m, x, y, z, h, col) => m.cone(x, y, z, h * 0.26, h, col || '#6b7ca3', 5, { jit: 0.1 });
const crate = (m, x, y, z, s, col) => { m.box(x, y, z, s, s, s, col || '#b08450', { jit: 0.05 }); m.box(x, y + s * 0.42, z, s * 1.02, s * 0.12, s * 1.02, '#7d5630'); };
const barrel = (m, x, y, z) => { m.cyl(x, y, z, 0.26, 0.55, '#8a5a3b', 8, 0.92); m.cyl(x, y + 0.14, z, 0.275, 0.05, '#3a3f4f', 8); m.cyl(x, y + 0.38, z, 0.255, 0.05, '#3a3f4f', 8); };
const table = (m, x, y, z, w, d, col) => { m.box(x, y + 0.42, z, w, 0.08, d, col || '#a87a48'); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((s) => m.box(x + s[0] * (w / 2 - 0.08), y, z + s[1] * (d / 2 - 0.08), 0.08, 0.42, 0.08, '#7d5630')); };
const pillar = (m, x, y, z, r, h, col) => { m.cyl(x, y, z, r * 1.25, 0.12, '#d4dcea', 8); m.cyl(x, y + 0.12, z, r, h - 0.24, col || '#e9e2cf', 8, 0.92); m.cyl(x, y + h - 0.12, z, r * 1.2, 0.12, '#d4dcea', 8); };
const timber = (m, x, y, z, w, h, along) => { const L = '#7d5630'; if (along === 'x') { m.box(x - w / 2, y, z, 0.14, h, 0.14, L); m.box(x + w / 2, y, z, 0.14, h, 0.14, L); m.box(x, y + h, z, w + 0.3, 0.14, 0.16, '#6a4630'); } else { m.box(x, y, z - w / 2, 0.14, h, 0.14, L); m.box(x, y, z + w / 2, 0.14, h, 0.14, L); m.box(x, y + h, z, 0.16, 0.14, w + 0.3, '#6a4630'); } };
const coal = (m, x, y, z, rnd, n) => { for (let i = 0; i < (n || 4); i++) { const r = 0.12 + rnd() * 0.14; m.dod(x + (rnd() - 0.5) * 0.7, y + r * 0.6, z + (rnd() - 0.5) * 0.5, r, ['#1d1f28', '#2a2d3a', '#15161e'][Math.floor(rnd() * 3)], { sy: 0.8, ry: rnd() * 6 }); } };
const bones = (m, x, y, z) => { m.ico(x - 0.3, y + 0.1, z, 0.1, '#e9e2cf', { sy: 0.9 }); m.beam([x - 0.2, y + 0.04, z + 0.02], [x + 0.35, y + 0.04, z + 0.06], 0.05, 0.05, '#e9e2cf'); m.beam([x - 0.05, y + 0.04, z - 0.12], [x + 0.25, y + 0.04, z + 0.2], 0.04, 0.04, '#e9e2cf'); m.beam([x + 0.05, y + 0.04, z - 0.18], [x + 0.4, y + 0.04, z - 0.05], 0.04, 0.04, '#e9e2cf'); };
const stairs = (m, x, y, z, w, n, rise, run, dir, col) => { for (let i = 0; i < n; i++) { const off = i * run * dir; m.box(x, y + i * rise, z + off, w, rise, run, col || '#8c7448', { jit: 0.05 }); } };
const frame = (m, x, y, z, w, h, art, rot) => { m.box(x, y, z, w + 0.12, h + 0.12, 0.06, '#c9975c'); m.box(x, y + 0.06, z + 0.035, w, h, 0.02, art); };
const chest = (m, x, y, z, col) => { m.box(x, y, z, 0.55, 0.3, 0.36, col || '#8a5a3b', { jit: 0.04 }); m.cyl(x, y + 0.025, z, 0.18, 0.55, col || '#7d5630', 8, 1, { rz: Math.PI / 2, jit: 0.04 }); m.box(x, y + 0.14, z + 0.19, 0.08, 0.1, 0.03, '#f5c542'); };
const goldPile = (m, x, y, z, rnd, n) => { for (let i = 0; i < (n || 12); i++) { const r = 0.08 + rnd() * 0.09; m.oct(x + (rnd() - 0.5) * 1.2, y + r * 0.8 + rnd() * 0.12, z + (rnd() - 0.5) * 0.6, r, rnd() > 0.5 ? '#f5c542' : '#ffe58a', { sy: 0.7, jit: 0.12 }); } };
const lamp = (c, x, z) => { const { m, y } = c; m.cyl(x, y, z, 0.05, 0.85, '#3a3f4f', 5); m.box(x, y + 0.85, z, 0.2, 0.22, 0.2, '#ffd27a', { jit: 0.02 }); m.cone(x, y + 1.07, z, 0.18, 0.12, '#3a3f4f', 4); c.glow(x, y + 0.98, z, 3.2); };

/* ---------- the landmarks ---------- */
const P = {};
P['west-of-house'] = (c) => { const { m, x, y, z, rnd } = c; m.cyl(x - 0.3, y, z + 0.5, 0.05, 0.75, '#6a4630', 5); m.box(x - 0.3, y + 0.72, z + 0.5, 0.42, 0.26, 0.3, '#5d6a84'); m.cyl(x - 0.3, y + 0.64, z + 0.5, 0.15, 0.42, '#5d6a84', 8, 1, { rz: Math.PI / 2 }); m.box(x - 0.08, y + 0.85, z + 0.5, 0.05, 0.22, 0.04, '#c8442f'); bush(m, x + 0.4, y, z - 0.5, 1); flowers(m, x, y, z - 0.2, rnd, 5); };
P['south-of-house'] = (c) => { const { m, x, y, z, rnd } = c; bush(m, x - 0.55, y, z - 0.1, 0.9); bush(m, x + 0.55, y, z + 0.05, 0.9); flowers(m, x, y, z + 0.3, rnd, 6); };
P['behind-house'] = (c) => { const { m, x, y, z, rnd } = c; bush(m, x + 0.4, y, z + 0.4, 1); rocks(m, x + 0.1, y, z - 0.5, rnd, 2); flowers(m, x, y, z, rnd, 5); };
P['north-of-house'] = (c) => { const { m, x, y, z, rnd } = c; bush(m, x - 0.45, y, z + 0.1, 1); rocks(m, x + 0.4, y, z - 0.2, rnd, 2); };
P['clearing'] = (c) => { const { m, x, y, z, rnd } = c; flowers(m, x, y, z, rnd, 9); rocks(m, x + 0.5, y, z - 0.4, rnd, 2); bush(m, x - 0.5, y, z + 0.4, 0.9); };
P['forest-path'] = (c) => { pine(c.m, c.x + 0.45, c.y, c.z - 0.4, 1.35); };
P['forest-1'] = (c) => { const { m, x, y, z, rnd } = c; m.cyl(x + 0.3, y, z, 0.3, 0.3, '#8a5a3b', 7, 0.9); m.cyl(x + 0.3, y + 0.3, z, 0.27, 0.03, '#c9975c', 7); for (let i = 0; i < 3; i++) { const fx = x - 0.4 + i * 0.12, fz = z + 0.3 + rnd() * 0.3; m.cyl(fx, y, fz, 0.03, 0.14, '#f0eee4', 4); m.cone(fx, y + 0.12, fz, 0.1, 0.08, '#c8442f', 6); } };
P['clearing-grating'] = (c) => { const { m, x, y, z } = c; m.box(x, y + 0.01, z, 1.0, 0.06, 0.8, '#2a2f45'); for (let i = -2; i <= 2; i++) m.box(x + i * 0.18, y + 0.06, z, 0.05, 0.05, 0.8, '#8a94a6'); for (let i = -1; i <= 1; i++) m.box(x, y + 0.06, z + i * 0.3, 1.0, 0.05, 0.05, '#8a94a6'); m.ico(x + 0.7, y + 0.1, z - 0.4, 0.3, '#b4794c', { sy: 0.4 }); m.ico(x - 0.65, y + 0.08, z + 0.45, 0.25, '#e8892b', { sy: 0.4 }); };
P['canyon-view'] = (c) => { const { m, x, y, z, rnd } = c; const rx = x + 0.95; for (let i = -2; i <= 2; i++) m.box(rx, y, z + i * 0.42, 0.08, 0.6, 0.08, '#8a5a3b'); m.box(rx, y + 0.45, z, 0.06, 0.06, 1.9, '#b08450'); m.box(rx, y + 0.25, z, 0.06, 0.05, 1.9, '#b08450'); flowers(m, x - 0.3, y, z + 0.2, rnd, 6); };
P['rocky-ledge'] = (c) => { const { m, x, y, z, rnd } = c; m.dod(x + 0.5, y + 0.3, z, 0.5, '#7b859c', { sy: 0.7 }); rocks(m, x - 0.4, y, z + 0.5, rnd, 3); };
P['canyon-bottom'] = (c) => { const { m, x, y, z, rnd } = c; rocks(m, x - 0.5, y, z - 0.3, rnd, 3); m.dod(x + 0.3, y + 0.25, z + 0.4, 0.35, '#9c8258', { sy: 0.7 }); };
P['end-of-rainbow'] = (c) => {
  const { m, x, y, z, rnd } = c;
  m.cyl(x, y, z, 0.42, 0.42, '#2a2f45', 8, 1.15); m.cyl(x, y + 0.4, z, 0.5, 0.06, '#15161e', 8); m.cyl(x, y + 0.42, z, 0.4, 0.02, '#f5c542', 8);
  goldPile(m, x, y + 0.42, z, rnd, 9); m.ico(x + 0.6, y + 0.08, z + 0.4, 0.3, '#dcb984', { sy: 0.35 });
  c.glow(x, y + 0.75, z, 2.4); c.sparkle(x, y + 0.9, z);
};
P['up-a-tree'] = (c) => {
  const { m, x, y, z, rnd } = c, g = c.ground;
  m.cyl(x, g, z, 0.5, y - g + 0.1, '#6a4630', 7, 0.62, { jit: 0.08 });
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; m.beam([x, y - 0.3, z], [x + Math.cos(a) * 1.4, y + 0.25, z + Math.sin(a) * 1.4], 0.16, 0.14, '#7a5336'); }
  m.cyl(x, y - 0.12, z, 1.15, 0.14, '#b08450', 9); m.cyl(x, y + 0.02, z, 1.2, 0.05, '#8a5a3b', 9);
  m.ico(x, y + 2.2, z, 1.9, '#4a9b46', { detail: 1, sy: 0.8, jit: 0.1 }); m.ico(x + 1.1, y + 1.7, z + 0.6, 1.1, '#54a549', { detail: 1, jit: 0.1 }); m.ico(x - 1.0, y + 1.9, z - 0.5, 1.2, '#44903f', { detail: 1, jit: 0.1 }); m.ico(x + 0.2, y + 2.9, z - 0.3, 1.0, '#68b653', { detail: 1, jit: 0.1 });
  m.cyl(x + 0.35, y + 0.02, z + 0.1, 0.34, 0.14, '#9a7a4e', 7, 0.78); m.cyl(x + 0.35, y + 0.14, z + 0.1, 0.3, 0.04, '#6a4630', 7, 0.9); m.ico(x + 0.33, y + 0.22, z + 0.1, 0.12, '#f7f1de', { sy: 1.2 });
};
P['living-room'] = (c) => {
  const { m, x, y, z, room } = c, n = (room.items || []).filter((i) => i.type === 'treasure').length;
  /* trophy case: glass cabinet with whatever has been banked glittering inside */
  const tx = x - 0.35, tz = z - 1.05;
  m.box(tx, y, tz, 1.5, 0.12, 0.55, '#5c4029'); m.box(tx - 0.72, y, tz, 0.06, 0.95, 0.5, '#7d5630'); m.box(tx + 0.72, y, tz, 0.06, 0.95, 0.5, '#7d5630'); m.box(tx, y + 0.95, tz, 1.5, 0.07, 0.55, '#7d5630');
  m.box(tx, y + 0.12, tz - 0.22, 1.4, 0.83, 0.03, '#3d2a1a');
  const cols = ['#f5c542', '#6fd3e0', '#e8735a', '#a06bd6', '#ffe58a', '#4a9b46', '#e08aa8'];
  for (let i = 0; i < Math.min(n, 19); i++) { const cx = tx - 0.6 + (i % 7) * 0.2, cy = y + 0.2 + Math.floor(i / 7) * 0.26; m.oct(cx, cy + 0.08, tz, 0.07, cols[i % cols.length], { sy: 1.2, jit: 0.1 }); }
  m.box(tx, y + 0.14, tz + 0.02, 1.4, 0.83, 0.02, '#bfe3f0', { jit: 0 });
  if (n) { c.glow(tx, y + 0.5, tz, 2.0); c.sparkle(tx, y + 0.6, tz); }
  /* oriental rug and the trap door beneath it */
  m.box(x + 0.25, y + 0.005, z + 0.3, 1.9, 0.03, 1.3, '#8e2a22'); m.box(x + 0.25, y + 0.03, z + 0.3, 1.6, 0.01, 1.0, '#c8442f'); m.box(x + 0.25, y + 0.04, z + 0.3, 1.0, 0.01, 0.5, '#f5c542', { jit: 0.02 });
  const td = c.td; m.box(td.x, y + 0.02, td.z - 0.62, 1.06, 0.06, 0.5, '#7d5630', { rx: -1.15 }); 
  lamp(c, x + 1.0, z - 1.1);
};
P['kitchen'] = (c) => {
  const { m, x, y, z } = c, sx = x - 0.85;
  table(m, x + 0.35, y, z - 0.55, 0.9, 0.6); m.cyl(x + 0.1, y + 0.5, z - 0.55, 0.06, 0.14, '#7fb4d6', 6); m.box(x + 0.6, y + 0.5, z - 0.55, 0.22, 0.2, 0.18, '#b08450');
  for (let i = 0; i < 8; i++) m.box(sx, y + i * 0.33, z + 0.2 - i * 0.133, 0.8, 0.33, 0.14, '#8a6036', { jit: 0.05 });
  /* fireplace over the chimney opening */
  m.box(x + 0.9, y, z - 1.25, 0.5, 0.75, 0.3, '#9a4a36', { jit: 0.06 }); m.box(x + 0.9, y + 0.05, z - 1.08, 0.3, 0.4, 0.06, '#15161e', { jit: 0 }); c.glow(x + 0.9, y + 0.25, z - 1.0, 1.5);
  m.cyl(x + 0.9, y + 0.4, z - 1.25, 0.3, 0.04, '#3a3f4f', 6);
};
P['attic'] = (c) => { const { m, x, y, z, rnd } = c; crate(m, x + 0.6, y, z - 0.3, 0.45); crate(m, x + 0.2, y, z - 0.6, 0.35, '#9a7a4e'); for (let i = 0; i < 4; i++) m.cyl(x - 0.1 + i * 0.02, y + i * 0.05, z + 0.1, 0.28 - i * 0.03, 0.06, '#dcb984', 8); m.ico(x + 0.9, y + 0.42, z + 0.2, 0.11, '#f5c542', { sy: 1.1 }); };
P['cellar'] = (c) => { const { m, x, y, z } = c; crate(m, x + 0.7, y, z - 0.55, 0.42); barrel(m, x + 0.95, y, z + 0.1); m.box(x - 0.85, y, z + 0.2, 0.06, 0.06, 0.06, '#6a4630'); };
P['east-of-chasm'] = (c) => { const { m, x, y, z } = c; m.box(x + 0.25, y + 0.01, z, 0.75, 0.04, 1.8, '#05060a', { jit: 0 }); m.box(x + 0.25, y + 0.01, z, 0.75, 0.04, 0.05, '#6a7da5'); for (let i = 0; i < 6; i++) m.box(x - 0.08, y, z - 0.75 + i * 0.3, 0.12, 0.1, 0.22, '#6a7da5', { jit: 0.1 }); };
P['gallery'] = (c) => { const { m, x, y, z, hd } = c, wz = z - hd + 0.04; frame(m, x - 0.7, y + 0.55, wz, 0.5, 0.42, '#c8442f'); frame(m, x, y + 0.6, wz, 0.55, 0.5, '#4d8fd6'); frame(m, x + 0.7, y + 0.55, wz, 0.45, 0.42, '#f5c542'); };
P['studio'] = (c) => { const { m, x, y, z, rnd } = c; for (let i = 0; i < 7; i++) m.cyl(x - 0.2 + rnd() * 1.1, y + 0.005, z - 0.3 + rnd() * 0.9, 0.08 + rnd() * 0.09, 0.012, FL[i % FL.length], 6); m.beam([x - 0.75, y, z - 0.2], [x - 0.6, y + 0.85, z - 0.2], 0.05, 0.05, '#7d5630'); m.beam([x - 0.45, y, z - 0.2], [x - 0.6, y + 0.85, z - 0.2], 0.05, 0.05, '#7d5630'); m.box(x - 0.6, y + 0.5, z - 0.22, 0.5, 0.4, 0.04, '#f2ead6'); m.box(x - 0.6, y + 0.55, z - 0.2, 0.3, 0.2, 0.01, '#e8735a'); m.box(x + 0.8, y, z + 0.4, 0.4, 0.03, 0.3, '#f2ead6'); };
P['troll-room'] = (c) => { const { m, x, y, z, rnd } = c; m.box(x - 0.4, y, z + 0.2, 0.05, 0.6, 0.05, '#7d5630', { rz: 0.9 }); m.box(x - 0.15, y + 0.28, z + 0.2, 0.3, 0.05, 0.12, '#c8442f', { jit: 0.05 }); bones(m, x + 0.5, y, z - 0.3); for (let i = 0; i < 5; i++) m.box(x - 0.9 + i * 0.05, y + 0.005, z - 0.6, 0.02, 0.01, 0.4, '#6a7da5', { rz: 0 }); };
P['east-west-passage'] = (c) => { const { m, x, y, z } = c; stairs(m, x + 0.65, y, z - 0.45, 0.5, 4, 0.12, 0.3, 1, '#6a7da5'); m.box(x - 0.6, y, z + 0.3, 0.06, 0.06, 0.06, '#6a7da5'); };
P['round-room'] = (c) => { const { m, x, y, z } = c; m.cyl(x, y, z, 0.9, 0.12, '#8894a8', 10); m.cyl(x, y + 0.12, z, 0.75, 0.06, '#7d889c', 10); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; pillar(m, x + Math.cos(a) * 1.0, y, z + Math.sin(a) * 0.8, 0.07, 0.7, '#d4dcea'); } };
P['loud-room'] = (c) => { const { m, x, y, z } = c; m.box(x, y, z - 0.2, 0.7, 0.5, 0.5, '#5d6a84'); m.cone(x, y + 0.5, z - 0.2, 0.42, 0.6, '#a3afc2', 8, { rx: 0 }); m.cyl(x, y + 0.56, z - 0.2, 0.3, 0.3, '#d4dcea', 8, 1.5, { rx: 1.4 }); for (let i = 0; i < 3; i++) m.box(x + 0.75 + i * 0.08, y + 0.02, z + 0.3 + i * 0.12, 0.3, 0.02 + i * 0.02, 0.04, '#6fd3e0', { jit: 0.04 }); };
P['damp-cave'] = (c) => { const { m, x, y, z, rnd } = c; stalagmite(m, x - 0.7, y, z - 0.4, 0.8); stalagmite(m, x + 0.6, y, z - 0.5, 0.6); stalagmite(m, x + 0.8, y, z + 0.4, 0.45); m.cyl(x - 0.3, y + 0.005, z + 0.4, 0.4, 0.015, '#6fd3e0', 8, 1, { sx: 1.4 }); };
P['deep-canyon'] = (c) => { const { m, x, y, z } = c; for (let i = 0; i < 6; i++) m.box(x - 0.9 + i * 0.3, y + 0.01, z + Math.sin(i * 1.3) * 0.4, 0.3, 0.02, 0.06, '#05060a', { ry: 0.5, jit: 0 }); m.dod(x + 0.8, y + 0.2, z - 0.4, 0.3, '#7b859c', { sy: 0.8 }); };
P['dam'] = (c) => { const { m, x, y, z, hd } = c; m.box(x, y, z - hd + 0.3, 2.3, 1.5, 0.5, '#7d889c', { jit: 0.05 }); m.box(x, y + 1.3, z - hd + 0.3, 2.4, 0.2, 0.6, '#6a7392'); for (let i = 0; i < 3; i++) m.cyl(x - 0.6 + i * 0.6, y + 0.5, z - hd + 0.58, 0.11, 0.05, '#f5c542', 6, 1, { rx: 1.57 }); m.box(x + 0.85, y, z + 0.3, 0.3, 0.55, 0.3, '#5d6a84'); m.box(x + 0.85, y + 0.55, z + 0.3, 0.34, 0.06, 0.34, '#c8442f'); };
P['dam-lobby'] = (c) => { const { m, x, y, z } = c; table(m, x, y, z + 0.1, 1.1, 0.55, '#7d5630'); m.box(x - 1.1, y, z - 0.3, 0.08, 1.0, 0.6, '#3a2a1a'); m.box(x + 1.1, y, z - 0.3, 0.08, 1.0, 0.6, '#3a2a1a'); m.box(x - 0.2, y + 0.46, z + 0.1, 0.3, 0.05, 0.22, '#f2ead6'); };
P['maintenance-room'] = (c) => { const { m, x, y, z, hd } = c, wz = z - hd + 0.06; m.box(x, y + 0.5, wz, 1.3, 0.75, 0.08, '#5d6a84'); ['#4d8fd6', '#c8442f', '#f5c542', '#8a5a3b'].forEach((col, i) => m.cyl(x - 0.45 + i * 0.3, y + 0.75, wz + 0.06, 0.09, 0.06, col, 6, 1, { rx: 1.57 })); chest(m, x + 0.85, y, z + 0.4, '#5d6a84'); m.cyl(x - 0.95, y, z - 0.6, 0.06, 1.0, '#8a94a6', 6); };
P['dam-base'] = (c) => { const { m, x, y, z } = c; m.ico(x + 0.15, y + 0.18, z + 0.1, 0.55, '#f5c542', { sx: 1.5, sy: 0.45, sz: 0.85, jit: 0.06 }); m.ico(x + 0.15, y + 0.3, z + 0.1, 0.38, '#e8892b', { sx: 1.4, sy: 0.3, sz: 0.7 }); m.cyl(x - 0.9, y, z - 0.4, 0.09, 0.3, '#c8442f', 6); m.box(x - 0.9, y + 0.3, z - 0.4, 0.3, 0.04, 0.04, '#8a94a6'); };
P['reservoir-south'] = (c) => { const { m, x, y, z, rnd } = c; rocks(m, x - 0.8, y, z + 0.4, rnd, 3); };
P['reservoir'] = (c) => { const { m, x, y, z, rnd } = c; rocks(m, x + 0.5, y, z - 0.3, rnd, 2, '#8a5a3b'); crate(m, x - 0.7, y, z + 0.3, 0.3, '#7d5630'); };
P['reservoir-north'] = (c) => { const { m, x, y, z } = c; stairs(m, x + 0.8, y, z - 0.5, 0.5, 4, 0.12, 0.3, 1, '#6a7da5'); };
P['atlantis-room'] = (c) => { const { m, x, y, z } = c; pillar(m, x - 0.8, y, z - 0.45, 0.13, 1.2); pillar(m, x + 0.8, y, z - 0.45, 0.13, 1.2); pillar(m, x - 0.8, y, z + 0.45, 0.13, 0.7); m.cyl(x, y, z, 0.5, 0.18, '#d4dcea', 8); m.cone(x, y + 0.18, z, 0.12, 0.5, '#6fd3e0', 4); c.sparkle(x, y + 0.6, z); };
P['cave'] = (c) => { const { m, x, y, z, rnd } = c; stairs(m, x - 0.6, y, z - 0.5, 0.5, 4, 0.12, 0.3, 1, '#6a7da5'); rocks(m, x + 0.6, y, z + 0.3, rnd, 2); };
P['mirror-room'] = (c) => { const { m, x, y, z, hd } = c, wz = z - hd + 0.06; m.box(x, y + 0.05, wz, 1.5, 1.45, 0.1, '#c9975c'); m.box(x, y + 0.15, wz + 0.06, 1.3, 1.25, 0.03, '#bfe8f4', { jit: 0.02 }); m.tri([x - 0.6, y + 0.2, wz + 0.09], [x - 0.15, y + 0.2, wz + 0.09], [x - 0.6, y + 1.0, wz + 0.09], '#ffffff', [0, 0, 1], 0); c.sparkle(x, y + 0.8, wz + 0.2); };
P['mirror-room-2'] = P['mirror-room'];
P['twisting-passage'] = (c) => { const { m, x, y, z } = c; for (let i = 0; i < 7; i++) m.box(x - 0.95 + i * 0.32, y + 0.01, z + Math.sin(i * 1.1) * 0.5, 0.26, 0.03, 0.2, '#7a8496', { ry: i * 0.4, jit: 0.08 }); };
P['cold-passage'] = (c) => { const { m, x, y, z, rnd } = c; for (let i = 0; i < 5; i++) m.oct(x - 0.8 + i * 0.4, y + 0.3, z - 0.3 + rnd() * 0.7, 0.16, ['#8ad6f0', '#c5e8f4', '#6fd3e0'][i % 3], { sy: 2.2, sx: 0.8, sz: 0.8, jit: 0.1 }); };
P['slide-room'] = (c) => { const { m, x, y, z, hd } = c; m.box(x + 0.2, y + 0.4, z, 1.1, 0.08, 1.7, '#a3afc2', { rz: 0.45, jit: 0.04 }); m.box(x + 0.5, y + 0.9, z, 0.06, 0.3, 1.7, '#5d6a84', { rz: 0.45 }); m.box(x - 0.85, y, z - 0.2, 0.3, 0.9, 1.3, '#3a4664', { jit: 0.08 }); };
P['strange-passage'] = (c) => { const { m, x, y, z } = c; m.box(x + 1.05, y, z, 0.08, 1.0, 0.55, '#7d5630'); m.box(x + 1.02, y + 0.4, z + 0.18, 0.05, 0.08, 0.06, '#f5c542'); m.beam([x - 0.3, y, z - 0.6], [x - 0.3, y + 0.0, z + 0.6], 0.06, 0.06, '#6a4630'); };
P['cyclops-room'] = (c) => { const { m, x, y, z, rnd } = c; for (let i = 0; i < 6; i++) m.box(x + 0.9 + (rnd() - 0.5) * 0.3, y + i * 0.06, z + (rnd() - 0.5) * 0.3, 0.3, 0.12, 0.2, '#6a7da5', { ry: rnd() * 3, jit: 0.1 }); m.box(x - 0.55, y, z - 0.6, 0.7, 0.4, 0.4, '#7d5630'); m.box(x - 0.55, y + 0.4, z - 0.6, 0.75, 0.05, 0.45, '#b08450'); stairs(m, x - 0.6, y, z + 0.5, 0.5, 3, 0.12, 0.3, -1, '#6a7da5'); };
P['treasure-room'] = (c) => { const { m, x, y, z, rnd } = c; goldPile(m, x, y, z, rnd, 26); chest(m, x + 0.8, y, z - 0.5); chest(m, x - 0.8, y, z - 0.6, '#5d6a84'); c.glow(x, y + 0.5, z, 3.0); c.sparkle(x, y + 0.6, z); };
P['maze-4'] = (c) => { const { m, x, y, z } = c; bones(m, x - 0.2, y, z + 0.1); m.cyl(x + 0.6, y, z - 0.3, 0.07, 0.22, '#8a6036', 6); m.box(x + 0.6, y + 0.22, z - 0.3, 0.12, 0.04, 0.12, '#3a3f4f'); m.beam([x - 0.75, y + 0.03, z + 0.4], [x - 0.35, y + 0.03, z + 0.55], 0.04, 0.03, '#a3afc2'); };
P['dome-room'] = (c) => { const { m, x, y, z } = c; m.cyl(x, y, z, 0.8, 0.06, '#8894a8', 10); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; m.cyl(x + Math.cos(a) * 0.8, y, z + Math.sin(a) * 0.8, 0.03, 0.4, '#b08450', 4); } m.beam([x, y + 0.4, z + 0.8], [x + 0.05, y - 0.9, z + 0.9], 0.03, 0.03, '#dcb984'); };
P['torch-room'] = (c) => { const { m, x, y, z } = c; m.cyl(x, y, z, 0.3, 0.55, '#7d889c', 8, 0.75); m.cyl(x, y + 0.55, z, 0.36, 0.05, '#d4dcea', 8); c.glow(x, y + 0.8, z, 1.8); };
P['temple'] = (c) => { const { m, x, y, z } = c; m.box(x, y, z - 0.3, 1.2, 0.6, 0.6, '#d4dcea', { jit: 0.04 }); m.box(x, y + 0.6, z - 0.3, 1.3, 0.06, 0.7, '#8894a8'); for (let i = -1; i <= 1; i += 2) { m.cyl(x + i * 0.42, y + 0.66, z - 0.3, 0.05, 0.3, '#f7f1de', 6); c.glow(x + i * 0.42, y + 1.0, z - 0.3, 1.3); } pillar(m, x - 0.95, y, z + 0.4, 0.1, 1.0); pillar(m, x + 0.95, y, z + 0.4, 0.1, 1.0); };
P['altar'] = P['temple'];
P['egyptian-room'] = (c) => { const { m, x, y, z } = c; m.box(x, y, z, 1.5, 0.45, 0.6, '#c2a874', { jit: 0.05 }); m.box(x, y + 0.45, z, 1.4, 0.2, 0.52, '#f5c542', { jit: 0.06 }); m.ico(x - 0.55, y + 0.62, z, 0.2, '#ffe58a', { sy: 1.1 }); for (let i = 0; i < 4; i++) m.box(x - 0.5 + i * 0.35, y + 0.6, z + 0.27, 0.12, 0.02, 0.02, '#4d8fd6'); };
P['entrance-to-hades'] = (c) => { const { m, x, y, z, hd } = c; m.box(x - 0.7, y, z - hd + 0.4, 0.3, 1.3, 0.3, '#4c5c80'); m.box(x + 0.7, y, z - hd + 0.4, 0.3, 1.3, 0.3, '#4c5c80'); m.box(x, y + 1.15, z - hd + 0.4, 1.7, 0.3, 0.3, '#4c5c80'); m.cone(x, y + 0.6, z - hd + 0.45, 0.14, 0.26, '#f5c542', 6, { rx: 3.14 }); m.ico(x, y + 0.56, z - hd + 0.45, 0.04, '#6a4630'); c.glow(x, y + 0.7, z - hd + 0.6, 2.0, '#9fe8ff'); };
P['land-of-the-dead'] = (c) => { const { m, x, y, z, rnd } = c; for (let i = 0; i < 6; i++) m.ico(x - 0.9 + i * 0.36, y + 0.09, z + (rnd() - 0.4) * 0.8, 0.1, '#e9e2cf', { sy: 0.9 }); m.cyl(x, y, z - 0.3, 0.3, 0.4, '#3a4664', 8, 0.8); m.oct(x, y + 0.65, z - 0.3, 0.18, '#c5e8f4', { sy: 1.2 }); c.glow(x, y + 0.65, z - 0.3, 2.2, '#9fe8ff'); };
P['sandy-cave'] = (c) => { const { m, x, y, z, rnd } = c; m.ico(x - 0.3, y + 0.12, z + 0.2, 0.55, '#dcb984', { sy: 0.35 }); m.ico(x + 0.6, y + 0.1, z - 0.2, 0.4, '#d2ab73', { sy: 0.35 }); };
P['aragain-falls'] = (c) => { const { m, x, y, z, hd } = c; m.box(x, y, z - hd + 0.3, 1.6, 1.6, 0.35, '#e9f7ff', { jit: 0.08 }); for (let i = 0; i < 5; i++) m.box(x - 0.6 + i * 0.3, y, z - hd + 0.5, 0.12, 1.5, 0.05, '#ffffff', { jit: 0.05 }); m.ico(x, y + 0.05, z - hd + 0.6, 0.6, '#ffffff', { sy: 0.4, sx: 1.6, jit: 0.05 }); };
P['on-the-rainbow'] = (c) => { const { m, x, y, z } = c; RAINBOW_POST(m, x, y, z); };
function RAINBOW_POST(m, x, y, z) { ['#c8442f', '#e8892b', '#f5c542', '#4a9b46', '#4d8fd6', '#a06bd6'].forEach((col, i) => m.box(x - 0.5 + i * 0.2, y + 0.02, z, 0.18, 0.06, 1.3, col, { jit: 0.03 })); }
P['shore'] = (c) => { const { m, x, y, z, rnd } = c; rocks(m, x - 0.7, y, z + 0.3, rnd, 3); };
P['sandy-beach'] = (c) => { const { m, x, y, z } = c; m.beam([x - 0.8, y + 0.1, z + 0.3], [x + 0.6, y + 0.12, z + 0.1], 0.1, 0.1, '#8a5a3b'); m.ico(x + 0.6, y + 0.1, z - 0.4, 0.3, '#dcb984', { sy: 0.4 }); };
P['shaft-room'] = (c) => { const { m, x, y, z } = c; m.box(x, y + 1.3, z, 0.06, 0.06, 0.06, '#8a94a6'); m.beam([x, y + 1.3, z], [x, y + 0.5, z], 0.02, 0.02, '#8a94a6'); m.box(x, y + 0.2, z, 0.5, 0.3, 0.4, '#b08450', { jit: 0.06 }); m.box(x, y + 0.48, z, 0.52, 0.04, 0.42, '#7d5630'); timber(m, x, y, z - 0.5, 1.6, 1.3, 'x'); };
P['gas-room'] = (c) => { const { m, x, y, z, rnd } = c; for (let i = 0; i < 6; i++) m.ico(x - 0.8 + rnd() * 1.6, y + 0.3 + rnd() * 0.6, z - 0.5 + rnd() * 1.0, 0.25 + rnd() * 0.2, '#b6e07a', { detail: 1, sy: 0.8, jit: 0.04 }); };
P['bat-room'] = (c) => { const { m, x, y, z } = c; m.ico(x + 0.2, y + 1.1, z, 0.1, '#2a2f45'); m.box(x + 0.05, y + 1.1, z, 0.18, 0.02, 0.1, '#15161e', { rz: 0.5 }); m.box(x + 0.35, y + 1.1, z, 0.18, 0.02, 0.1, '#15161e', { rz: -0.5 }); coal(m, x - 0.6, y, z + 0.3, c.rnd, 3); };
P['machine-room'] = (c) => { const { m, x, y, z } = c; m.box(x, y, z - 0.2, 1.0, 0.85, 0.8, '#5d6a84', { jit: 0.05 }); m.box(x, y + 0.85, z - 0.2, 0.9, 0.12, 0.7, '#8a94a6'); m.cyl(x + 0.2, y + 0.95, z - 0.2, 0.1, 0.06, '#e8735a', 6); m.box(x - 0.3, y + 0.5, z + 0.22, 0.26, 0.18, 0.04, '#0d1117'); m.cyl(x - 0.3, y + 0.56, z + 0.25, 0.05, 0.03, '#ffb627', 6, 1, { rx: 1.57 }); m.cyl(x + 0.6, y, z + 0.4, 0.1, 0.5, '#8a94a6', 6); };
P['ladder-top'] = (c) => { const { m, x, y, z } = c; for (let i = 0; i < 6; i++) m.box(x + 0.6, y + 0.1 + i * 0.16, z, 0.36, 0.04, 0.06, '#b08450'); m.box(x + 0.44, y, z, 0.05, 1.05, 0.06, '#8a5a3b'); m.box(x + 0.76, y, z, 0.05, 1.05, 0.06, '#8a5a3b'); };
P['ladder-bottom'] = P['ladder-top'];

/* zone defaults for rooms without their own landmark */
function byZone(c) {
  const { m, x, y, z, rnd, room } = c, zn = room.zone;
  if (room.level === 'surface') { bush(m, x - 0.45, y, z + 0.1, 0.9); flowers(m, x + 0.2, y, z, rnd, 5); return; }
  if (zn === 'mine') { timber(m, x, y, z - 0.35, 1.5, 1.25, 'x'); coal(m, x + 0.5, y, z + 0.4, rnd, 4); if (rnd() > 0.5) coal(m, x - 0.6, y, z + 0.3, rnd, 2); return; }
  if (zn === 'maze') { rocks(m, x + (rnd() - 0.5) * 0.8, y, z + 0.3, rnd, 2, '#5d6a84'); if (rnd() > 0.55) stalagmite(m, x - 0.7, y, z - 0.5, 0.6, '#4c5c80'); return; }
  if (zn === 'river') { if (rnd() > 0.6) rocks(m, x + 0.7, y, z - 0.4, rnd, 1); return; }
  if (zn === 'temple') { pillar(m, x - 0.8, y, z - 0.4, 0.09, 0.8, '#d4dcea'); return; }
  stalagmite(m, x + (rnd() - 0.5), y, z - 0.45, 0.5 + rnd() * 0.5); rocks(m, x + 0.6, y, z + 0.4, rnd, 1);
}

/* ---------- item icons, as tiny standalone meshes so they can bob and spin ---------- */
export function itemIcon(Mesher, name, type) {
  const m = new Mesher(Math.abs(name.length * 7919) + 3), n = name.toLowerCase();
  if (type === 'treasure') { m.oct(0, 0.0, 0, 0.17, /diamond|crystal|trident|skull/.test(n) ? '#bfe8f4' : /emerald|jade/.test(n) ? '#4fc37a' : /sapphire/.test(n) ? '#4d8fd6' : '#f5c542', { sy: 1.25, jit: 0.1 }); }
  else if (type === 'weapon') { m.box(0, -0.02, 0, 0.05, 0.4, 0.02, /elvish/.test(n) ? '#8ad6f0' : '#a3afc2'); m.box(0, -0.05, 0, 0.17, 0.04, 0.04, '#b4794c'); m.box(0, -0.2, 0, 0.05, 0.12, 0.04, '#6a4630'); m.box(0, 0.0, 0, 0.0, 0.0, 0.0, '#fff'); }
  else if (type === 'danger') { m.cone(0, -0.05, 0, 0.14, 0.3, '#c8442f', 5, { jit: 0.1 }); }
  else if (/lantern/.test(n)) { m.box(0, -0.08, 0, 0.16, 0.2, 0.16, '#ffd27a'); m.cone(0, 0.12, 0, 0.14, 0.1, '#3a3f4f', 4); m.box(0, 0.2, 0, 0.14, 0.02, 0.02, '#3a3f4f'); }
  else if (/key/.test(n)) { m.cyl(0, 0.06, 0, 0.07, 0.03, '#f5c542', 6, 1, { rx: 1.57 }); m.box(0, -0.08, 0, 0.03, 0.26, 0.03, '#f5c542'); m.box(0.04, -0.17, 0, 0.06, 0.03, 0.03, '#f5c542'); }
  else if (/bell/.test(n)) { m.cone(0, -0.08, 0, 0.14, 0.2, '#f5c542', 7); m.ico(0, -0.1, 0, 0.04, '#6a4630'); }
  else if (/shovel/.test(n)) { m.box(0, -0.05, 0, 0.03, 0.32, 0.03, '#8a5a3b'); m.box(0, -0.22, 0, 0.12, 0.12, 0.02, '#a3afc2'); }
  else if (/pump/.test(n)) { m.cyl(0, -0.12, 0, 0.06, 0.26, '#c8442f', 6); m.box(0, 0.14, 0, 0.14, 0.03, 0.03, '#3a3f4f'); }
  else if (/sack|bag/.test(n)) { m.ico(0, -0.04, 0, 0.12, '#b08450', { sy: 1.1 }); m.cone(0, 0.06, 0, 0.05, 0.1, '#8a5a3b', 5); }
  else { m.box(0, -0.06, 0, 0.05, 0.28, 0.05, '#8a94a6', { rz: 0.6 }); m.cyl(0.08, 0.1, 0, 0.07, 0.04, '#8a94a6', 6, 1, { rx: 1.57 }); m.cyl(-0.1, -0.2, 0, 0.05, 0.04, '#8a94a6', 6, 1, { rx: 1.57 }); }
  return m;
}

export function roomProps(c) {
  const fn = P[c.id];
  if (fn) fn(c); else byZone(c);
  if (c.room.level === 'under' && !(c.room.tags || []).includes('dark') && c.lit !== false && !c.noLamp) lamp(c, c.x + c.hw - 0.22, c.z - c.hd + 0.25);
}
export { bush, flowers, rocks, pine, stalagmite, crate, barrel, table, stairs, goldPile, chest, pillar, lamp };
