/* ZorkThree: the 3D exploration view. Entry point for the bundle; js/world3d.bundle.js is generated from here.
   create({ S, host, layout, onSelect }) returns the same small API as ZorkWorld, plus fly, home and getView. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeLayout } from './layout.js';
import { makeTerrain } from './terrain.js';
import * as scenery from './scenery.js';
import { Mesher } from './mesher.js';
import { roomProps, itemIcon } from './props.js';
import { buildHouse } from './house.js';
import { buildPath } from './paths.js';
import { makeAvatar, makeExplorer } from './explorer.js';
import { hash, rng, clamp, lerp } from './util.js';

const DIRV = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [0.707, -0.707], NW: [-0.707, -0.707], SE: [0.707, 0.707], SW: [-0.707, 0.707] };
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function create(o) {
  const S = o.S, host = o.host, rooms = S.rooms, L = makeLayout(S, o.layout || {}, window.ZorkWorld), ids = L.ids;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onSelect = o.onSelect || (() => {});
  host.classList.add('t3'); host.tabIndex = 0; host.setAttribute('aria-label', '3D map. Drag to orbit, scroll to zoom, click a room to walk there, arrow keys to step through exits.');

  /* ---------- renderer, camera, light ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement); renderer.domElement.className = 't3-canvas';
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.5, 700);
  const B = L.bounds, cxI = (B.x0 + B.x1) / 2, czI = (B.z0 + B.z1) / 2;

  const hemi = new THREE.HemisphereLight('#cfe3ff', '#8a7a6a', 1.15); scene.add(hemi);
  const amb = new THREE.AmbientLight('#fff4e0', 0.28); scene.add(amb);
  const sun = new THREE.DirectionalLight('#fff0d6', 2.6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06;
  const sh = sun.shadow.camera, ext = Math.max(B.x1 - B.x0, B.z1 - B.z0) * 0.78; sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.near = 1; sh.far = 280;
  sun.position.set(cxI + 46, 62, czI + 58); sun.target.position.set(cxI, 0, czI); scene.add(sun, sun.target);
  const DAY = { bg: scenery.skyTexture(false), fog: new THREE.Color('#dbe7f2'), hemi: [new THREE.Color('#cfe3ff'), new THREE.Color('#8a7a6a'), 1.15], sun: [new THREE.Color('#fff0d6'), 2.6] };
  const NIGHT = { bg: scenery.skyTexture(true), fog: new THREE.Color('#1a2448'), hemi: [new THREE.Color('#7f93d6'), new THREE.Color('#2a2440'), 0.6], sun: [new THREE.Color('#8fa6ff'), 1.15] };
  scene.background = DAY.bg; scene.fog = new THREE.Fog('#dbe7f2', 150, 340);

  const glowTex = scenery.glowTexture(), starTex = scenery.starTexture();
  const anims = [];
  let night = false;

  /* ---------- island ---------- */
  const T = makeTerrain(L), world = new THREE.Group(); scene.add(world);
  T.buildBase().forEach((m) => world.add(m));
  world.add(scenery.forest(T.treeSpots())); world.add(scenery.crags(T.rockSpots()));
  const cloudGroup = scenery.clouds(B); scene.add(cloudGroup);
  const starsPts = scenery.stars(B), flies = scenery.fireflies(B, L.Zg, 80); scene.add(starsPts, flies);
  let terrainMesh = null, waterMesh = null, waterBase = null;
  function rebuildTerrain(visRooms, visEdges) {
    const G = T.carveAll(visRooms, visEdges), r = T.render(G);
    if (terrainMesh) { world.remove(terrainMesh); terrainMesh.geometry.dispose(); }
    if (waterMesh) { world.remove(waterMesh); waterMesh.geometry.dispose(); waterMesh = null; waterBase = null; }
    terrainMesh = r.terrain; world.add(terrainMesh);
    if (r.water) { waterMesh = r.water; world.add(waterMesh); waterBase = waterMesh.geometry.attributes.position.array.slice(); }
  }

  /* house and the smoke from its chimney */
  const house = buildHouse(L); world.add(house.mesh);
  const smoke = scenery.puffs(house.chimney.x, house.chimney.y, house.chimney.z, { n: 6, size: 0.26, rise: 2.4, drift: 0.9, speed: 0.16 }); scene.add(smoke); anims.push((t) => smoke.userData.update(t));
  /* the river plunges underground at the end of the canyon */
  const mist = scenery.puffs(L.gorge.riverX, -L.gorge.depth - 0.2, L.gorge.z1 - 1.0, { n: 7, size: 0.5, rise: 2.0, drift: 0.0, speed: 0.3, alpha: 0.5, color: '#eaf6ff' }); scene.add(mist); anims.push((t) => mist.userData.update(t));

  /* ---------- rooms ---------- */
  const propMat = new THREE.MeshLambertMaterial({ vertexColors: true }), iconMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const RG = {}, hitBox = new THREE.BoxGeometry(1, 1, 1), hitMat = new THREE.MeshBasicMaterial({ visible: false });
  function addGlow(g, x, y, z, size, color) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color || '#ffc870', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    sp.scale.set(size, size, 1); sp.position.set(x, y, z); g.add(sp);
    const ph = Math.random() * 6; anims.push((t) => { const f = 1 + Math.sin(t * 6 + ph) * 0.06 + Math.sin(t * 11 + ph) * 0.03; sp.scale.set(size * f, size * f, 1); sp.material.opacity = (night ? 1 : 0.42) * (0.75 + Math.sin(t * 5 + ph) * 0.08); });
    return sp;
  }
  function addSparkle(g, x, y, z) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    sp.position.set(x, y, z); g.add(sp); const ph = Math.random() * 6;
    anims.push((t) => { const k = Math.max(0, Math.sin(t * 2.2 + ph)); sp.material.opacity = k * k; sp.scale.setScalar(0.12 + k * 0.42); sp.position.x = x + Math.sin(t * 0.9 + ph) * 0.3; });
  }
  function pad(m, id, sz) {
    const r = sz.r, k = L.kindOf(id), beach = k === 'beach' || id === 'canyon-bottom' || id === 'end-of-rainbow', ledge = id === 'rocky-ledge';
    if (k === 'tree') return;
    const top = beach ? '#dcb984' : ledge ? '#7a6c5c' : '#79c25a', rim = beach ? '#f0d9aa' : ledge ? '#9a8a78' : '#9fb08a';
    m.cyl(0, -0.12, 0, r, 0.16, top, 10, 0.97, { jit: 0.05 });
    const n = 12; for (let i = 0; i < n; i++) { const a = i / n * 6.283; m.dod(Math.cos(a) * r * 0.98, 0.02, Math.sin(a) * r * 0.98, 0.1 + ((i * 7) % 3) * 0.02, rim, { sy: 0.6, ry: i }); }
  }
  function buildRoom(id) {
    const room = rooms[id], p = L.P(id), y = L.elev(id), sz = L.size(id), g = new THREE.Group(), m = new Mesher(hash(id));
    g.position.set(p.x, y, p.z);
    const c = {
      id, room, m, x: 0, y: 0, z: 0, hw: sz.w / 2 - 0.15, hd: sz.d / 2 - 0.15, rnd: rng(hash(id) + 5), house, S, L,
      td: { x: house.trapdoor.x - p.x, z: house.trapdoor.z - p.z }, ground: T.heightAt(p.x, p.z) - y,
      glow: (x, yy, z, size, col) => addGlow(g, x, yy, z, size, col), sparkle: (x, yy, z) => addSparkle(g, x, yy, z)
    };
    if (sz.pad) pad(m, id, sz);
    roomProps(c);
    if (!m.empty) { const me = m.mesh(propMat, { cast: true, receive: true }); g.add(me); }
    /* what lies on the floor */
    const show = (room.items || []).filter((it) => !(it.type === 'fixture' || it.type === 'puzzle' || (it.type === 'junk' && !/pump|rope|sack/i.test(it.name))) && !(id === 'living-room' && it.type === 'treasure'));
    show.forEach((it, i) => {
      const ic = itemIcon(Mesher, it.name, it.type).mesh(iconMat, { cast: false, receive: false });
      const ix = -c.hw + 0.35 + i * 0.42, iz = Math.min(c.hd, 0.85) - 0.25, ph = i * 1.3;
      ic.position.set(clamp(ix, -c.hw, c.hw), 0.42, iz); g.add(ic);
      anims.push((t) => { ic.position.y = 0.42 + Math.sin(t * 2 + ph) * 0.06; ic.rotation.y = t * 1.2 + ph; });
      if (it.type === 'treasure') addSparkle(g, ic.position.x, 0.5, iz);
    });
    const hit = new THREE.Mesh(hitBox, hitMat); hit.scale.set(sz.pad ? sz.r * 2 : sz.w, 0.8, sz.pad ? sz.r * 2 : sz.d); hit.position.set(p.x, y + 0.35, p.z); hit.userData.id = id;
    const info = { id, g, hit, p, y, sz, pop: 1, shown: false };
    RG[id] = info; return info;
  }
  ids.forEach((id) => { const r = buildRoom(id); world.add(r.g); world.add(r.hit); r.g.visible = false; });

  /* path ribbons (the tunnels are carved into the terrain) */
  const EG = [];
  L.edges.forEach((e) => { if (!L.usable(e)) return; const me = buildPath(L, e); if (me) { world.add(me); EG.push({ e, me }); me.visible = false; } });

  /* ---------- which rooms are showing ---------- */
  let curLimit = -1, visSet = {}, visEdges = [], hitList = [], popQueue = [];
  function applyLimit(limit, first) {
    curLimit = limit; visSet = {};
    const vis = ids.filter((id) => rooms[id].order <= limit); vis.forEach((id) => { visSet[id] = 1; });
    visEdges = L.edges.filter((e) => e.order <= limit && visSet[e.from] && visSet[e.to] && L.usable(e));
    ids.forEach((id) => {
      const r = RG[id], on = !!visSet[id];
      if (on && !r.shown && !first && !reduce) { r.pop = 0.001; popQueue.push(r); r.g.scale.setScalar(0.001); }
      else if (on) r.g.scale.setScalar(1);
      r.shown = on; r.g.visible = on;
    });
    EG.forEach((x) => { x.me.visible = x.e.order <= limit && !!visSet[x.e.from] && !!visSet[x.e.to]; });
    hitList = vis.map((id) => RG[id].hit);
    rebuildTerrain(vis, visEdges);
  }

  /* ---------- explorer ---------- */
  const avatar = makeAvatar(glowTex); scene.add(avatar.group);
  let retracing = false, retracingSkip = false, following = false, lastUser = 0, selId = null;
  const ex = makeExplorer({
    L, S, avatar, start: S.status.location, edges: () => visEdges,
    onNode: () => hudUpdate(), onStart: () => { following = true; hudUpdate(); },
    onIdle: (id) => { following = false; if (retracing) { retracing = false; setRetraceBtn(); toast('Expedition retraced'); } hudUpdate(); if (id !== selId && !retracingSkip) onSelect(id); }
  });

  /* ---------- HUD ---------- */
  host.insertAdjacentHTML('beforeend',
    '<div class="t3-labels"></div><div class="t3-hud">' +
    '<div class="t3-card" role="group" aria-label="Explorer"><div class="k">Explorer is in</div><div class="n" data-k="room"></div><div class="t3-exits" data-k="exits"></div></div>' +
    '<div class="t3-tools"><button class="btn" data-k="retrace" type="button">Retrace expedition</button><button class="btn" data-k="night" type="button" aria-pressed="false">Night</button><button class="btn" data-k="orbit" type="button" aria-pressed="false">Drift</button></div>' +
    '<div class="t3-hint"><span>Drag to orbit</span><span>Right-drag to pan</span><span>Scroll to zoom</span><span>Click a room to walk there</span><span>Arrows or WASD step through exits, Q up, E down</span></div>' +
    '<div class="t3-toast" role="status"></div></div>');
  const $ = (s) => host.querySelector(s), labelsEl = $('.t3-labels'), toastEl = $('.t3-toast');
  const nameOf = (id) => (rooms[id] ? rooms[id].name : id);
  let toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200); }
  function hudUpdate() {
    $('[data-k=room]').textContent = nameOf(ex.room);
    const box = $('[data-k=exits]'), list = ex.exits();
    box.innerHTML = list.length ? list.map((x) => '<button type="button" class="t3-exit" data-dir="' + esc(x.dir) + '"' + (x.ok ? '' : ' disabled title="Not explored yet"') + '>' + esc(x.dir) + (x.ok ? '' : '<small>?</small>') + '</button>').join('') : '<span style="opacity:.6;font-size:12px">No known exits</span>';
  }
  $('[data-k=exits]').addEventListener('click', (ev) => { const b = ev.target.closest('.t3-exit'); if (b && !b.disabled && !ex.st.walking) { retracingSkip = false; ex.step(b.dataset.dir); } });
  function setRetraceBtn() { const b = $('[data-k=retrace]'); b.textContent = retracing ? 'Stop retracing' : 'Retrace expedition'; b.setAttribute('aria-pressed', retracing ? 'true' : 'false'); }
  function stopRetrace() {
    if (!retracing) return;
    retracing = false; following = false; ex.cancel(); setRetraceBtn();
  }
  function setNight(on) {
    night = on; const P = on ? NIGHT : DAY;
    scene.background = P.bg; scene.fog.color.copy(P.fog); hemi.color.copy(P.hemi[0]); hemi.groundColor.copy(P.hemi[1]); hemi.intensity = P.hemi[2]; sun.color.copy(P.sun[0]); sun.intensity = P.sun[1];
    amb.intensity = on ? 0.1 : 0.28; starsPts.visible = on; flies.visible = on; avatar.light.intensity = on ? 9 : 3.2;
    const b = $('[data-k=night]'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Day' : 'Night';
  }
  $('[data-k=night]').addEventListener('click', () => setNight(!night));
  $('[data-k=orbit]').addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; $('[data-k=orbit]').setAttribute('aria-pressed', controls.autoRotate ? 'true' : 'false'); });
  if (reduce) $('[data-k=orbit]').style.display = 'none';

  /* ---------- camera ---------- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = false; controls.zoomToCursor = true; controls.autoRotateSpeed = 0.7;
  controls.minDistance = 4.5; controls.maxDistance = 190; controls.maxPolarAngle = 1.42; controls.minPolarAngle = 0.1;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const sphere = new THREE.Vector3();
  function spherical() { sphere.copy(camera.position).sub(controls.target); const d = sphere.length(); return { d, polar: Math.acos(clamp(sphere.y / d, -1, 1)), az: Math.atan2(sphere.x, sphere.z) }; }
  function camAt(tx, ty, tz, dist, polar, az) { return { t: new THREE.Vector3(tx, ty, tz), p: new THREE.Vector3(tx + dist * Math.sin(polar) * Math.sin(az), ty + dist * Math.cos(polar), tz + dist * Math.sin(polar) * Math.cos(az)) }; }
  let tw = null, running = false;
  function flyTo(tx, ty, tz, dist, polar, az, dur) {
    const g = camAt(tx, ty, tz, dist, polar, az);
    if (reduce || !running) { controls.target.copy(g.t); camera.position.copy(g.p); controls.update(); return; }
    tw = { t0: controls.target.clone(), p0: camera.position.clone(), gt: g.t, gp: g.p, dur: dur || 1.0, k: 0 };
  }
  function stepTween(dt) {
    if (!tw) return;
    tw.k = Math.min(1, tw.k + dt / tw.dur); const e = tw.k * tw.k * (3 - 2 * tw.k);
    controls.target.lerpVectors(tw.t0, tw.gt, e); camera.position.lerpVectors(tw.p0, tw.gp, e);
    if (tw.k >= 1) tw = null;
  }
  controls.addEventListener('start', () => { tw = null; lastUser = performance.now(); });
  controls.addEventListener('end', () => { lastUser = performance.now(); });
  const hp = L.P('living-room'); { const asp0 = (host.clientWidth || 600) / (host.clientHeight || 400), d0 = asp0 >= 1.3 ? 27 : 27 + (1.3 - asp0) * 16; const g = camAt(hp.x + 1.4, 0, hp.z + 1, d0, 0.92, -0.62); controls.target.copy(g.t); camera.position.copy(g.p); controls.update(); }

  $('[data-k=retrace]').addEventListener('click', () => {
    if (retracing) { retracing = false; ex.cancel(); setRetraceBtn(); toast('Stopped'); return; }
    const path = (S.path || []).filter((id) => visSet[id]); if (path.length < 2) { toast('Nothing to retrace yet'); return; }
    retracing = true; retracingSkip = true; setRetraceBtn(); toast('Retracing the expedition'); ex.retrace(path, 9);
    const s = spherical(); flyTo(ex.pos.x, ex.pos.y, ex.pos.z, clamp(s.d, 12, 20), 0.95, s.az, 0.8);
  });

  /* ---------- picking, hover, labels ---------- */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let hoverId = null, downAt = null, pointerIn = false, mx = 0, my = 0, hoverDirty = false;
  const _pv = new THREE.Vector3();
  function pickAt(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect(), px = clientX - r.left, py = clientY - r.top;
    mouse.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1); ray.setFromCamera(mouse, camera);
    const score = (id) => { const q = RG[id]; _pv.set(q.p.x, q.y + 0.4, q.p.z).project(camera); return Math.hypot((_pv.x * 0.5 + 0.5) * r.width - px, (-_pv.y * 0.5 + 0.5) * r.height - py); };
    const hits = ray.intersectObjects(hitList, false);
    let best = null, bs = 1e9;
    hits.forEach((h) => { const s = score(h.object.userData.id); if (s < bs) { bs = s; best = h.object.userData.id; } });
    if (best) return best;
    hitList.forEach((h) => { const id = h.userData.id, s = score(id); if (s < 26 && s < bs) { bs = s; best = id; } });
    return best;
  }
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (ev) => { downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() }; host.focus({ preventScroll: true }); });
  cv.addEventListener('pointerup', (ev) => {
    if (!downAt) return; const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y), dt = performance.now() - downAt.t; downAt = null;
    if (moved > 5 || dt > 600) return;
    const id = pickAt(ev.clientX, ev.clientY); if (!id) return;
    onSelect(id); retracingSkip = false;
    if (retracing) { retracing = false; ex.cancel(); setRetraceBtn(); }
    if (id === ex.room && !ex.st.walking) { api.fly(id); return; }
    if (!ex.walkTo(id)) { toast('No known route to ' + nameOf(id)); api.fly(id); }
  });
  cv.addEventListener('pointermove', (ev) => { pointerIn = true; mx = ev.clientX; my = ev.clientY; hoverDirty = true; });
  cv.addEventListener('pointerleave', () => { pointerIn = false; hoverId = null; hovRing.visible = false; host.classList.remove('t3-pick'); });
  const labelEls = {};
  function labelEl(id) { let e = labelEls[id]; if (!e) { e = document.createElement('div'); e.className = 't3-lab'; e.textContent = rooms[id].name; labelsEl.appendChild(e); labelEls[id] = e; } return e; }
  const _v = new THREE.Vector3();
  function updateLabels() {
    const w = host.clientWidth, h = host.clientHeight, d = spherical().d, near = d < 38, cands = [], shownIds = {};
    ids.forEach((id) => {
      const r = RG[id];
      if (!r.shown) return;
      const want = id === selId || id === hoverId || id === ex.room || near;
      if (!want) return;
      _v.set(r.p.x, r.y + (r.sz.pad ? 1.6 : 1.3), r.p.z).project(camera);
      if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) return;
      const dist = Math.hypot(camera.position.x - r.p.x, camera.position.y - r.y, camera.position.z - r.p.z);
      cands.push({ id, x: (_v.x * 0.5 + 0.5) * w, y: (-_v.y * 0.5 + 0.5) * h, dist, pri: id === selId || id === hoverId || id === ex.room ? 0 : 1 });
    });
    cands.sort((a, b) => a.pri - b.pri || a.dist - b.dist);
    let n = 0; const boxes = [];
    cands.forEach((cnd) => {
      if (cnd.pri === 1 && n >= 16) return;
      const e = labelEl(cnd.id); e.style.display = '';
      const bw = e.offsetWidth || 70, bx = cnd.x - bw / 2, by = cnd.y - 10;
      if (cnd.pri === 1 && boxes.some((b) => bx < b[2] && bx + bw > b[0] && by < b[3] && by + 14 > b[1])) { e.style.display = 'none'; return; }
      boxes.push([bx, by, bx + bw, by + 14]); n++; shownIds[cnd.id] = 1;
      e.style.transform = 'translate(' + Math.round(bx) + 'px,' + Math.round(by) + 'px)';
      e.className = 't3-lab' + (cnd.id === ex.room ? ' cur' : '') + (cnd.id === selId ? ' sel' : '');
    });
    for (const id in labelEls) if (!shownIds[id]) labelEls[id].style.display = 'none';
  }

  /* selection and hover rings */
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffb627', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const selRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 40), ringMat); selRing.rotation.x = -Math.PI / 2; selRing.visible = false; scene.add(selRing);
  const selGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: '#ffd45a' })); selGem.visible = false; scene.add(selGem);
  const hovRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); hovRing.rotation.x = -Math.PI / 2; hovRing.visible = false; scene.add(hovRing);
  function placeRing(ring, id) { const r = RG[id]; if (!r || !r.shown) { ring.visible = false; return; } const k = r.sz.pad ? r.sz.r * 1.05 : Math.max(r.sz.w, r.sz.d) * 0.62; ring.scale.set(k, k, k); ring.position.set(r.p.x, r.y + 0.06, r.p.z); ring.visible = true; }

  /* ---------- keyboard: step through exits the way the screen points ---------- */
  function onKey(ev) {
    if (!running || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const t = ev.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    const k = ev.key; let sx = 0, sy = 0, dir = null;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') sy = 1; else if (k === 'ArrowDown' || k === 's' || k === 'S') sy = -1; else if (k === 'ArrowLeft' || k === 'a' || k === 'A') sx = -1; else if (k === 'ArrowRight' || k === 'd' || k === 'D') sx = 1;
    else if (k === 'q' || k === 'Q' || k === 'PageUp') dir = 'U'; else if (k === 'e' || k === 'E' || k === 'PageDown') dir = 'D'; else return;
    ev.preventDefault();
    if (ex.st.walking) return;
    if (retracing) { retracing = false; ex.cancel(); setRetraceBtn(); }
    const ends = ex.exits().filter((x) => x.ok);
    if (!dir) {
      const az = spherical().az, fw = [-Math.sin(az), -Math.cos(az)], rt = [Math.cos(az), -Math.sin(az)], want = [fw[0] * sy + rt[0] * sx, fw[1] * sy + rt[1] * sx];
      let best = 0.35, pick = null;
      ends.forEach((x) => { const v = DIRV[x.dir]; if (!v) return; const d = v[0] * want[0] + v[1] * want[1]; if (d > best) { best = d; pick = x.dir; } });
      dir = pick;
    }
    retracingSkip = false;
    if (!dir || !ends.some((x) => x.dir === dir) || !ex.step(dir)) toast('No exit that way');
  }
  window.addEventListener('keydown', onKey);

  /* ---------- size and loop ---------- */
  function resize() {
    const w = host.clientWidth || 600, h = host.clientHeight || 400;
    renderer.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(host);
  resize();

  let raf = 0, last = 0, time = 0, frameN = 0;
  const follow = new THREE.Vector3();
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; time += dt; frameN++;
    ex.update(dt, time);
    if (following && performance.now() - lastUser > 1500) {
      follow.copy(ex.pos); follow.y += 0.4; const f = Math.min(1, dt * 2.6), dx = (follow.x - controls.target.x) * f, dy = (follow.y - controls.target.y) * f, dz = (follow.z - controls.target.z) * f;
      controls.target.x += dx; controls.target.y += dy; controls.target.z += dz; camera.position.x += dx; camera.position.y += dy; camera.position.z += dz; tw = null;
    }
    stepTween(dt); controls.update();
    if (!reduce || frameN < 3) anims.forEach((f) => f(time));
    if (!reduce) cloudGroup.children.forEach((c) => { c.position.x += c.userData.sp * dt; if (c.position.x > cxI + 170) c.position.x = cxI - 170; });
    if (flies.visible) flies.userData.update(time);
    for (let i = popQueue.length - 1; i >= 0; i--) { const r = popQueue[i]; r.pop = Math.min(1, r.pop + dt / 0.55); const k = r.pop, s = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); r.g.scale.setScalar(Math.max(0.001, s)); if (k >= 1) { r.g.scale.setScalar(1); popQueue.splice(i, 1); } }
    if (waterMesh && frameN % 2 === 0) {
      const a = waterMesh.geometry.attributes.position, arr = a.array;
      for (let i = 0; i < arr.length; i += 3) arr[i + 1] = waterBase[i + 1] + Math.sin(arr[i] * 1.7 + time * 1.7) * 0.05 + Math.cos(arr[i + 2] * 1.3 + time * 1.3) * 0.04;
      a.needsUpdate = true; waterMesh.geometry.computeVertexNormals();
    }
    if (selRing.visible) { ringMat.opacity = 0.55 + Math.sin(time * 4) * 0.3; selGem.rotation.y = time * 2; selGem.position.set(selRing.position.x, selRing.position.y + 1.3 + Math.sin(time * 3) * 0.12, selRing.position.z); }
    if (hoverDirty && pointerIn && !downAt) { hoverDirty = false; const id = pickAt(mx, my); if (id !== hoverId) { hoverId = id; host.classList.toggle('t3-pick', !!id); if (id) placeRing(hovRing, id); else hovRing.visible = false; } }
    if (hoverId && hovRing.visible) hovRing.material.opacity = 0.4 + Math.sin(time * 6) * 0.15;
    renderer.render(scene, camera);
    updateLabels();
  }

  /* ---------- the public API ---------- */
  let lastCur = null, first = true;
  const api = {
    render(opt) {
      if (!first && (opt.limit !== curLimit || opt.cur !== lastCur)) stopRetrace();
      if (opt.limit !== curLimit) applyLimit(opt.limit, first);
      const cur = opt.cur;
      if (first) { first = false; ex.place(visSet[cur] ? cur : ids.find((i) => visSet[i])); lastCur = cur; }
      else if (cur !== lastCur) {
        lastCur = cur; retracingSkip = true;
        if (!visSet[ex.room]) ex.place(cur); else if (cur !== ex.room && !ex.walkTo(cur)) ex.place(cur);
      }
      if (opt.sel !== selId) { selId = opt.sel; if (selId && RG[selId] && RG[selId].shown) { placeRing(selRing, selId); selGem.visible = true; } else { selRing.visible = false; selGem.visible = false; } }
      hudUpdate();
    },
    resume() { if (running) return; running = true; last = performance.now(); resize(); raf = requestAnimationFrame(frame); },
    pause() { running = false; cancelAnimationFrame(raf); },
    resize: resize,
    busy() { return ex.walking || retracing || !!tw; },
    zoom(f) { const s = spherical(); flyTo(controls.target.x, controls.target.y, controls.target.z, clamp(s.d / f, 6, 170), s.polar, s.az, 0.35); },
    fit() { following = false; const asp = (host.clientWidth || 600) / (host.clientHeight || 400); flyTo(cxI, 0, czI, clamp(Math.max(80, 88 / asp), 80, 185), 0.9, -0.5, 1.2); },
    fly(id) { const p = L.P(id), y = L.elev(id), s = spherical(); flyTo(p.x, y, p.z, clamp(s.d, 9, 24), Math.min(s.polar, 1.05), s.az, 0.9); },
    home() { retracingSkip = true; if (retracing) { retracing = false; ex.cancel(); setRetraceBtn(); } const loc = S.status.location; if (!ex.walkTo(loc)) ex.place(loc); api.fly(loc); },
    getView() { const p = camera.position, t = controls.target; return { p: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), t: [t.x, t.y, t.z].map((v) => +v.toFixed(2)), night: night, at: ex.room }; },
    setView(v) {
      if (!v || !v.p || !v.t) return;
      controls.target.set(v.t[0], v.t[1], v.t[2]); camera.position.set(v.p[0], v.p[1], v.p[2]); controls.update();
      if (v.night) setNight(true);
      if (v.at && visSet[v.at] && (v.at !== ex.room || ex.walking || retracing)) { stopRetrace(); ex.place(v.at); }
    },
    debug: { L, scene, camera, controls, renderer, ex, RG, setNight, flyTo }
  };
  return api;
}

window.ZorkThree = { create: function (o) { const a = create(o); window.ZorkThree.last = a; return a; } };
