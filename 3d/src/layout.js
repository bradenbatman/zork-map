/* Layout: turns the schematic sheet (state.json pos, layout.json overrides) into scene coordinates, and
   every edge into a walkable route. Sheet x runs east and sheet y runs south, so scene X = x and scene Z = y,
   which keeps all three map views (World, Chart and 3D) agreeing on where things are. */
import { clamp, lerp, OPP } from './util.js';

export const KS = 2.8;          // scene units per sheet unit
export const CELL = 0.4;        // terrain grid cell
export const UG = 1.0;          // depth of the carved chambers and tunnels
export const GORGE = 2.0;       // depth of the Great Canyon
const RAMP = 3.2;               // how far a sloping route takes to change level

export const INSIDE = { 'living-room': 1, kitchen: 1, attic: 1 };
const STACK = { attic: 'kitchen' };
/* a few surface pads sit where the 3D house and trenches need them (scene units) */
const POS3 = { 'south-of-house': [1.4, 5.9], 'west-of-house': [-3.2, 2.8] };
const ELEV = { 'up-a-tree': 4.4, attic: 2.6, 'rocky-ledge': -UG, 'canyon-bottom': -GORGE, 'end-of-rainbow': -GORGE };

function mkRoute(pts, y) {
  const P = [];
  pts.forEach((p, i) => { if (!i || Math.hypot(p.x - P[P.length - 1].x, p.z - P[P.length - 1].z) > 1e-4 || (p.y !== undefined && p.y !== P[P.length - 1].y)) P.push(p); });
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z) + (P[i].y !== undefined && P[i - 1].y !== undefined ? Math.abs(P[i].y - P[i - 1].y) : 0));
  const total = cum[cum.length - 1];
  const r = {
    pts: P, cum: cum, total: total,
    at(s) {
      s = clamp(s, 0, total);
      let i = 1; while (i < P.length - 1 && cum[i] < s) i++;
      const a = P[i - 1], b = P[i], span = cum[i] - cum[i - 1] || 1, t = clamp((s - cum[i - 1]) / span, 0, 1);
      const x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
      let yy;
      if (typeof y === 'function') yy = y(s, total, x, z);
      else yy = lerp(a.y, b.y, t);
      return { x: x, y: yy, z: z, dx: b.x - a.x, dz: b.z - a.z };
    },
    rev() {
      const pr = P.slice().reverse().map((p) => ({ x: p.x, z: p.z, y: p.y }));
      return mkRoute(pr, typeof y === 'function' ? (s, tt, x, z) => y(tt - s, tt, x, z) : undefined);
    }
  };
  return r;
}

export function makeLayout(S, LY, ZW) {
  const rooms = S.rooms, ids = Object.keys(rooms), wr = (LY && LY.rooms) || {}, ov = (LY && LY.routes) || {};
  const KIND = (ZW && ZW.KIND) || {}, FLOOR = (ZW && ZW.FLOOR) || {};
  const Zg = (S.groundY || 2.7) * KS;

  function sheetPos(id) { return STACK[id] ? sheetPos(STACK[id]) : (wr[id] || rooms[id].pos); }
  function P(id) {
    if (POS3[id]) return { x: POS3[id][0], z: POS3[id][1] };
    const s = sheetPos(id); return { x: s[0] * KS, z: s[1] * KS };
  }
  function elev(id) { return id in ELEV ? ELEV[id] : (rooms[id].level === 'under' ? -UG : 0); }
  function carved(id) { return rooms[id].level === 'under'; }
  function size(id) {
    if (id === 'living-room' || id === 'kitchen') return { w: 2.6, d: 3.0 };
    if (id === 'attic') return { w: 2.6, d: 2.2 };
    if (rooms[id].level === 'under') return { w: 2.4, d: 2.0 };
    return { w: 2.0, d: 2.0, pad: true, r: id === 'south-of-house' ? 0.8 : 1.0 };
  }
  function kindOf(id) { return KIND[id] || (rooms[id].level === 'surface' ? 'outdoor' : 'cave'); }
  function floorOf(id) { return FLOOR[id] || 'stone'; }

  /* ---------- edges ---------- */
  const usable = (e) => e.kind !== 'locked';
  function classOf(e) {
    const k = e.from + '>' + e.to;
    if (k === 'on-the-rainbow>end-of-rainbow') return 'rainbow';
    if (k === 'studio>kitchen') return 'chimney';
    if (k === 'slide-room>cellar') return 'slide';
    if (e.kind === 'boat') return 'river';
    const A = rooms[e.from], B = rooms[e.to];
    if (INSIDE[e.from] && INSIDE[e.to]) return (e.from === 'kitchen' && e.to === 'attic') || (e.from === 'attic' && e.to === 'kitchen') ? 'stairs' : 'interior';
    if (INSIDE[e.from] || INSIDE[e.to]) { const o = INSIDE[e.from] ? B : A; return o.level === 'under' ? 'tunnel' : 'path'; }
    if (A.level === 'surface' && B.level === 'surface') return 'path';
    return 'tunnel';
  }

  const cache = {};
  function manhattan(a, b, key) {
    const o = ov[key];
    if (o) return [a].concat(o.map((q) => ({ x: q[0] * KS, z: q[1] * KS })), [b]);
    if (Math.abs(b.z - a.z) < 0.18 * KS) { const mx = (a.x + b.x) / 2; return [a, { x: mx, z: a.z }, { x: mx, z: b.z }, b]; }
    const mz = (a.z + b.z) / 2; return [a, { x: a.x, z: mz }, { x: b.x, z: mz }, b];
  }
  /* the route from e.from to e.to; levels change over RAMP units next to the higher room */
  function route(e) {
    const key = e.from + '>' + e.to;
    if (cache[key]) return cache[key];
    const a = P(e.from), b = P(e.to), ea = elev(e.from), eb = elev(e.to), cls = classOf(e);
    let r;
    if (cls === 'stairs') {
      const K = P('kitchen'), sx = K.x - 0.85;
      const up = e.from === 'kitchen';
      const pts = [{ x: K.x, z: K.z, y: up ? 0 : ELEV.attic }, { x: sx, z: K.z + 0.2, y: up ? 0 : ELEV.attic }, { x: sx, z: K.z - 0.85, y: up ? ELEV.attic : 0 }, { x: K.x, z: K.z - 0.85, y: up ? ELEV.attic : 0 }];
      r = mkRoute(pts);
    } else if (e.kind === 'window') {
      const wx = 4.25, dir = Math.sign(a.x - b.x) || 1;
      r = mkRoute([{ x: a.x, z: a.z, y: 0 }, { x: wx + dir * 0.9, z: a.z, y: 0 }, { x: wx + dir * 0.25, z: a.z, y: 0.75 }, { x: wx - dir * 0.25, z: a.z, y: 0.75 }, { x: wx - dir * 0.9, z: a.z, y: 0 }, { x: b.x, z: b.z, y: 0 }]);
    } else if (cls === 'rainbow') {
      const pts = manhattan(a, b, key);
      r = mkRoute(pts, (s, tt) => lerp(ea, eb, s / tt) + 5.4 * Math.sin(Math.PI * clamp(s / tt, 0, 1)));
    } else {
      const pts = manhattan(a, b, key);
      const base = mkRoute(pts);
      if (ea === eb) r = mkRoute(pts.map((p) => ({ x: p.x, z: p.z, y: ea })));
      else {
        const hi = Math.max(ea, eb), lo = Math.min(ea, eb), hiIsA = ea > eb, total = base.total, ramp = Math.min(RAMP, total) || 1;
        r = mkRoute(pts, (s) => lerp(hi, lo, clamp((hiIsA ? s : total - s) / ramp, 0, 1)));
      }
    }
    return (cache[key] = r);
  }

  /* ---------- gorge and bounds ---------- */
  const eor = P('end-of-rainbow'), cb = P('canyon-bottom'), rl = P('rocky-ledge');
  const gorge = { x0: eor.x - 2.4, x1: eor.x + 2.4, z0: 0, z1: cb.z + 1.4, depth: GORGE, riverX: eor.x + 1.5 };
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  const grow = (x, z, m) => { x0 = Math.min(x0, x - m); x1 = Math.max(x1, x + m); z0 = Math.min(z0, z - m); z1 = Math.max(z1, z + m); };
  ids.forEach((id) => { const p = P(id), s = size(id); grow(p.x, p.z, Math.max(s.w, s.d) / 2 + 0.4); });
  S.edges.forEach((e) => { if (e.kind === 'locked') return; route(e).pts.forEach((p) => grow(p.x, p.z, 0.8)); });
  const M = 6.5;
  const bounds = { x0: Math.floor((x0 - M) / CELL) * CELL, x1: Math.ceil((x1 + M) / CELL) * CELL, z0: Math.floor((z0 - M - 1.5) / CELL) * CELL, z1: Math.ceil((z1 + M) / CELL) * CELL };
  gorge.z0 = bounds.z0 - 1;
  const shelf = { x0: rl.x - 1.3, x1: gorge.x0 + 0.4, z0: rl.z - 1.15, z1: rl.z + 1.15, depth: UG };

  const lrP = P('living-room'), kP = P('kitchen'), houseRect = { x0: lrP.x - 1.45, x1: kP.x + 1.45, zb: lrP.z - 1.45, zf: lrP.z + 1.6 };
  return {
    S, rooms, ids, KS, CELL, Zg, bounds, gorge, shelf, INSIDE, STACK, ELEV, houseRect,
    P, elev, carved, size, kindOf, floorOf, classOf, route, usable, sheetPos,
    edges: S.edges, OPP
  };
}
