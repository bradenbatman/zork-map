/* The explorer: a small adventurer with a lantern who stands where the game left off, and who will walk to any
   room that has been found, following the exits the game confirmed. Also plans routes over the discovered map. */
import * as THREE from 'three';
import { Mesher } from './mesher.js';
import { OPP, clamp, smooth } from './util.js';

export function makeAvatar(glowTex) {
  const g = new THREE.Group(), body = new Mesher(401), mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  body.box(0, 0.2, 0, 0.27, 0.3, 0.19, '#4d8fd6', { jit: 0.05 });
  body.box(0, 0.3, 0, 0.29, 0.05, 0.2, '#6a4630');
  body.box(-0.16, 0.26, 0, 0.07, 0.22, 0.09, '#3f74b3');
  body.ico(0, 0.62, 0, 0.14, '#f0c9a0', { detail: 1, jit: 0.03 });
  body.box(-0.05, 0.64, 0.12, 0.03, 0.03, 0.02, '#0d1117'); body.box(0.05, 0.64, 0.12, 0.03, 0.03, 0.02, '#0d1117');
  body.cyl(0, 0.7, 0, 0.21, 0.04, '#553826', 8);
  body.cone(0, 0.73, 0, 0.14, 0.22, '#6a4630', 7, { jit: 0.06 });
  body.box(0, 0.22, -0.16, 0.2, 0.26, 0.1, '#b4794c', { jit: 0.06 });
  body.box(0, 0.44, -0.16, 0.22, 0.05, 0.12, '#8a5a3b');
  const torso = body.mesh(mat, { cast: true, receive: false }); g.add(torso);
  const leg = (x) => { const lg = new THREE.Group(), lm = new Mesher(402 + x * 10); lm.box(0, -0.2, 0, 0.1, 0.22, 0.12, '#553826', { jit: 0.04 }); lg.add(lm.mesh(mat, { cast: true, receive: false })); lg.position.set(x, 0.22, 0); return lg; };
  const legL = leg(-0.07), legR = leg(0.07); g.add(legL, legR);
  /* the arm and the lantern */
  const arm = new THREE.Group(); arm.position.set(0.16, 0.42, 0.02); g.add(arm);
  const am = new Mesher(403); am.box(0, -0.2, 0, 0.07, 0.22, 0.09, '#3f74b3'); arm.add(am.mesh(mat, { cast: false, receive: false }));
  const lant = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.17, 0.13), new THREE.MeshBasicMaterial({ color: '#ffd98a' })); lant.position.set(0.02, -0.3, 0.1); arm.add(lant);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.07, 4), new THREE.MeshLambertMaterial({ color: '#3a3f4f' })); cap.position.set(0.02, -0.19, 0.1); cap.rotation.y = Math.PI / 4; arm.add(cap);
  const light = new THREE.PointLight('#ffb35a', 3.2, 6, 1.8); light.position.set(0.05, -0.22, 0.12); arm.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc870', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
  glow.scale.set(1.0, 1.0, 1); glow.position.set(0.05, -0.28, 0.12); arm.add(glow);
  g.scale.setScalar(1.25);
  return {
    group: g, light, glow, lantern: lant,
    animate(t, walking) {
      const ph = t * 10;
      if (walking) { legL.rotation.x = Math.sin(ph) * 0.7; legR.rotation.x = -Math.sin(ph) * 0.7; arm.rotation.x = Math.sin(ph) * 0.35; torso.position.y = Math.abs(Math.sin(ph)) * 0.05; }
      else { legL.rotation.x *= 0.8; legR.rotation.x *= 0.8; arm.rotation.x = Math.sin(t * 1.6) * 0.06; torso.position.y = Math.sin(t * 2) * 0.008; }
      const f = 1 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1) * 0.03;
      glow.scale.set(1.0 * f, 1.0 * f, 1);
    }
  };
}

export function makeExplorer(o) {
  const L = o.L, S = o.S, rooms = S.rooms, avatar = o.avatar;
  const pos = new THREE.Vector3();
  const st = { room: o.start, walking: false, leg: null, plan: [], pending: null, queue: [], speed: 5.2, facing: 0, idle: 0 };
  const revCache = {};

  function place(id, preserveReplay = false) {
    const p = L.P(id), y = L.elev(id);
    st.room = id; st.leg = null; st.plan = []; st.walking = false; st.pending = null;
    if (!preserveReplay) { st.queue = []; st.speed = 5.2; st.fast = false; }
    pos.set(p.x, y, p.z); avatar.group.position.copy(pos); if (o.onNode) o.onNode(id);
  }

  /* graph over what has been found */
  function adjacency() {
    const adj = {};
    const add = (a, b, e, rev) => { (adj[a] || (adj[a] = [])).push({ to: b, e: e, rev: rev, dir: rev ? (e.back || OPP[e.dir]) : e.dir }); };
    (o.edges() || []).forEach((e) => {
      if (!L.usable(e)) return;
      add(e.from, e.to, e, false);
      const two = e.kind === 'walk' || e.kind === 'door' || e.kind === 'window' || (!!e.back && e.kind !== 'oneway');
      if (two) add(e.to, e.from, e, true);
    });
    return adj;
  }
  function routeOf(a) {
    if (!a.rev) return L.route(a.e);
    const k = a.e.from + '>' + a.e.to;
    return revCache[k] || (revCache[k] = L.route(a.e).rev());
  }
  function plan(from, to) {
    if (from === to) return [];
    const adj = adjacency(), dist = {}, prev = {}, done = {};
    dist[from] = 0;
    for (;;) {
      let u = null;
      for (const k in dist) if (!done[k] && (u === null || dist[k] < dist[u])) u = k;
      if (u === null || u === to) break;
      done[u] = 1;
      (adj[u] || []).forEach((a) => { const w = dist[u] + routeOf(a).total + 1; if (dist[a.to] === undefined || w < dist[a.to]) { dist[a.to] = w; prev[a.to] = { from: u, a: a }; } });
    }
    if (dist[to] === undefined) return null;
    const out = []; let k = to;
    while (k !== from) { const p = prev[k]; out.unshift(p.a); k = p.from; }
    return out.map((a) => ({ route: routeOf(a), to: a.to, dir: a.dir }));
  }
  function exits() {
    const adj = adjacency(), seen = {}, out = [];
    (adj[st.room] || []).forEach((a) => { if (seen[a.dir]) return; seen[a.dir] = 1; out.push({ dir: a.dir, to: a.to, ok: true }); });
    (rooms[st.room].open_exits || []).forEach((x) => { if (seen[x.dir]) return; seen[x.dir] = 1; out.push({ dir: x.dir, ok: false, note: x.note }); });
    return out;
  }

  function begin(legs) { st.plan = legs; nextLeg(); }
  function nextLeg() {
    if (!st.plan.length) {
      st.leg = null; st.walking = false;
      /* A repeated room or a disconnected replay hop has no animated leg to
         finish. Drain those entries here instead of waiting for an update that
         can never advance the queue. Only replay may jump a disconnected gap. */
      while (st.pending || st.queue.length) {
        const replay = !st.pending, target = replay ? st.queue.shift() : st.pending;
        st.pending = null;
        const found = walkTo(target);
        if (st.walking) return;
        if (!found && replay) place(target, true);
      }
      st.speed = 5.2; st.fast = false;
      if (o.onIdle) o.onIdle(st.room);
      return;
    }
    const l = st.plan.shift(); st.leg = { r: l.route, s: 0, to: l.to }; st.walking = true;
  }
  function walkTo(id) {
    if (!rooms[id] || id === st.room && !st.walking) return id === st.room;
    if (st.walking) { st.pending = id; return true; }
    const legs = plan(st.room, id); if (!legs) return false;
    if (!legs.length) return true;
    if (!st.fast) { const tot = legs.reduce((a, l) => a + l.route.total, 0); st.speed = Math.min(11, Math.max(5.2, 5.2 + tot / 14)); }
    begin(legs); if (o.onStart) o.onStart(); return true;
  }
  function step(dir) {
    if (st.walking) return false;
    const a = (adjacency()[st.room] || []).find((x) => x.dir === dir); if (!a) return false;
    begin([{ route: routeOf(a), to: a.to, dir: a.dir }]); if (o.onStart) o.onStart(); return true;
  }
  function retrace(ids, speed) {
    st.queue = []; const seq = ids.filter((id, i) => rooms[id] && (i === 0 || ids[i - 1] !== id));
    if (!seq.length) return;
    st.speed = speed || 9; st.fast = true; st.pending = null; st.plan = [];
    /* Retain the first stop even when the current leg must finish first. */
    st.queue = seq;
    if (!st.walking) nextLeg();
    else if (o.onStart) o.onStart();
  }
  function cancel() { st.queue = []; st.pending = null; st.plan = []; st.speed = 5.2; st.fast = false; }

  function update(dt, t) {
    if (st.leg) {
      const l = st.leg, total = l.r.total, ramp = 1.1;
      const k = Math.min(1, 0.3 + 0.7 * smooth(l.s / ramp)) * Math.min(1, 0.3 + 0.7 * smooth((total - l.s) / ramp));
      l.s = Math.min(total, l.s + st.speed * Math.max(0.3, k) * dt);
      const p = l.r.at(l.s); pos.set(p.x, p.y, p.z);
      if (Math.abs(p.dx) + Math.abs(p.dz) > 1e-4) { const want = Math.atan2(p.dx, p.dz); let d = want - st.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); st.facing += d * Math.min(1, dt * 12); }
      if (l.s >= total) { st.room = l.to; if (o.onNode) o.onNode(l.to); nextLeg(); }
    } else st.walking = false;
    avatar.group.position.copy(pos); avatar.group.rotation.y = st.facing;
    avatar.animate(t, st.walking);
  }

  return { st, pos, place, walkTo, step, exits, retrace, cancel, update, plan, get room() { return st.room; }, get walking() { return st.walking || st.queue.length > 0; } };
}
