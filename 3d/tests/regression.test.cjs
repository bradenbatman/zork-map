/* Headless tests for the actual ES modules. Bundling to a temporary CommonJS file
   uses the same locked esbuild/Three.js dependencies as the shipped 3D view.
   This suite does not create a renderer, open a socket, or replace browser QA. */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { buildSync } = require('esbuild');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zork-3d-tests-'));
let api;
try {
  const outfile = path.join(tmp, 'modules.cjs');
  buildSync({
    stdin: {
      contents: [
        "export { makeExplorer, makeAvatar } from './src/explorer.js';",
        "export { makeLayout } from './src/layout.js';",
        "export { buildPath } from './src/paths.js';",
        "export { Mesher } from './src/mesher.js';",
        "export { Group } from 'three';",
      ].join('\n'),
      resolveDir: root,
    },
    bundle: true, platform: 'node', format: 'cjs', outfile,
    logLevel: 'silent',
  });
  api = require(outfile);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
const { makeExplorer, makeAvatar, makeLayout, buildPath, Mesher, Group } = api;
const state = JSON.parse(fs.readFileSync(path.join(root, '../state.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(root, '../layout.json'), 'utf8'));
const layout = makeLayout(state, overrides);
const near = (a, b, label = '') => assert.ok(Math.abs(a - b) < 1e-8, `${label}: ${a} != ${b}`);
const finitePoint = (p) => {
  for (const key of ['x', 'y', 'z', 'dx', 'dz']) assert.ok(Number.isFinite(p[key]), `${key} must be finite`);
};

function explorer({ S = state, L = layout, start = 'west-of-house', edges = S.edges } = {}) {
  const nodes = [], idle = [], animation = [];
  const avatar = { group: new Group(), animate: (...args) => animation.push(args) };
  const ex = makeExplorer({ S, L, start, avatar, edges: () => edges,
    onNode: (id) => nodes.push(id), onIdle: (id) => idle.push(id) });
  ex.place(start);
  nodes.length = 0;
  return { ex, nodes, idle, avatar, animation };
}

function drain(ex, limit = 30000) {
  for (let i = 0; i < limit && ex.walking; i++) ex.update(0.05, i * 0.05);
  assert.equal(ex.walking, false, `explorer must finish; room=${ex.room}, queue=${ex.st.queue}`);
}

function fixture(edges) {
  const S = structuredClone(state);
  for (const [id, pos] of Object.entries({ a: [0, 0], b: [1, 0], c: [2, 0], d: [3, 0], isolated: [4, 0] })) {
    S.rooms[id] = { name: id, pos, level: 'surface', open_exits: [], order: 1 };
  }
  S.edges = edges;
  return { S, L: makeLayout(S, {}), start: 'a' };
}
const edge = (from, to, dir = 'E', kind = 'walk', extra = {}) => ({ from, to, dir, kind, ...extra });

test('real saved map routes have finite, reversible geometry with room elevations', () => {
  assert.equal(Object.keys(state.rooms).length, 86);
  assert.equal(state.edges.length, 94);
  for (const e of state.edges.filter(layout.usable)) {
    const r = layout.route(e), reverse = r.rev();
    assert.ok(r.total > 0, `${e.from} > ${e.to}`);
    near(r.total, reverse.total, 'reverse length');
    for (const fraction of [0, 0.1, 0.5, 0.9, 1]) {
      const p = r.at(r.total * fraction), q = reverse.at(reverse.total * (1 - fraction));
      finitePoint(p); finitePoint(q);
      for (const axis of ['x', 'y', 'z']) near(p[axis], q[axis], `${e.from}: ${axis}`);
    }
    near(r.at(0).y, layout.elev(e.from), 'start elevation');
    near(r.at(r.total).y, layout.elev(e.to), 'end elevation');
    assert.deepEqual(r.at(-100), r.at(0));
    assert.deepEqual(r.at(r.total + 100), r.at(r.total));
  }
});

test('layout and path meshes are deterministic, finite and bounded for all visible ribbons', () => {
  const other = makeLayout(structuredClone(state), structuredClone(overrides));
  assert.deepEqual(other.bounds, layout.bounds);
  for (const id of layout.ids) assert.deepEqual(other.P(id), layout.P(id));
  for (const e of state.edges.filter(layout.usable)) {
    const first = buildPath(layout, e), second = buildPath(other, e);
    if (!['path', 'rainbow'].includes(layout.classOf(e))) {
      assert.equal(first, null); assert.equal(second, null); continue;
    }
    assert.ok(first.geometry.attributes.position.count > 0);
    for (const attribute of ['position', 'normal', 'color']) {
      const a = first.geometry.attributes[attribute], b = second.geometry.attributes[attribute];
      assert.deepEqual(a.array, b.array, `${e.from} ${attribute}`);
      assert.ok(a.array.every(Number.isFinite));
      assert.equal(a.count, first.geometry.attributes.position.count);
    }
    assert.ok(Number.isFinite(first.geometry.boundingSphere.radius));
    const positions = first.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      assert.ok(positions[i] >= layout.bounds.x0 && positions[i] <= layout.bounds.x1);
      assert.ok(positions[i + 2] >= layout.bounds.z0 && positions[i + 2] <= layout.bounds.z1);
    }
    for (const mesh of [first, second]) { mesh.geometry.dispose(); mesh.material.dispose(); }
  }
});

test('walk, door and window reverse exits work; one-way, boat and locked edges keep their direction', () => {
  for (const kind of ['walk', 'door', 'window', 'oneway', 'boat', 'locked']) {
    const f = fixture([edge('a', 'b', 'E', kind)]), { ex } = explorer(f);
    assert.equal(ex.plan('a', 'b') !== null, kind !== 'locked', `${kind} forward`);
    assert.equal(ex.plan('b', 'a') !== null, ['walk', 'door', 'window'].includes(kind), `${kind} reverse`);
  }
  const { ex } = explorer(fixture([edge('a', 'b', 'D', 'walk', { back: 'N' })]));
  ex.place('b');
  assert.deepEqual(ex.exits(), [{ dir: 'N', to: 'a', ok: true }]);
});

test('unknown exits are disabled and discovered exits are deduplicated', () => {
  const f = fixture([edge('a', 'b'), edge('a', 'c')]);
  f.S.rooms.a.open_exits = [{ dir: 'N', note: 'Unexplored passage' }, { dir: 'E' }];
  const { ex } = explorer(f);
  assert.deepEqual(ex.exits(), [{ dir: 'E', to: 'b', ok: true }, { dir: 'N', ok: false, note: 'Unexplored passage' }]);
  assert.equal(ex.step('N'), false);
});

test('ordinary walking reaches each route node and returns to idle', () => {
  const f = fixture([edge('a', 'b'), edge('b', 'c')]), { ex, nodes, idle, avatar } = explorer(f);
  assert.equal(ex.walkTo('c'), true);
  assert.equal(ex.step('W'), false);
  drain(ex);
  assert.deepEqual(nodes, ['b', 'c']); assert.deepEqual(idle, ['c']);
  assert.equal(ex.room, 'c');
  near(avatar.group.position.x, f.L.P('c').x);
  near(avatar.group.position.z, f.L.P('c').z);
  assert.equal(ex.st.speed, 5.2);
});

test('disconnected destinations and invalid IDs leave the explorer in place', () => {
  const { ex, nodes } = explorer(fixture([edge('a', 'b')]));
  assert.equal(ex.plan('a', 'isolated'), null);
  assert.equal(ex.walkTo('isolated'), false);
  assert.equal(ex.walkTo('missing'), false);
  assert.equal(ex.walkTo('a'), true);
  assert.equal(ex.room, 'a'); assert.equal(ex.walking, false); assert.deepEqual(nodes, []);
});

test('route planning chooses the shortest known route and excludes hidden edges', () => {
  const f = fixture([edge('a', 'd'), edge('a', 'b'), edge('b', 'd')]);
  f.S.rooms.b.pos = [1, 10];
  f.L = makeLayout(f.S, {});
  const { ex } = explorer(f);
  assert.deepEqual(ex.plan('a', 'd').map((leg) => leg.to), ['d']);
  f.S.edges.splice(0, 1);
  assert.deepEqual(ex.plan('a', 'd').map((leg) => leg.to), ['b', 'd']);
  f.S.edges.length = 0;
  assert.equal(ex.plan('a', 'd'), null);
});

test('new walk requests during walking use the latest destination', () => {
  const { ex, nodes } = explorer(fixture([edge('a', 'b'), edge('b', 'c'), edge('c', 'd')]));
  ex.walkTo('b'); ex.update(0.05, 0);
  ex.walkTo('c'); ex.walkTo('d'); drain(ex);
  assert.equal(ex.room, 'd'); assert.deepEqual(nodes, ['b', 'c', 'd']);
  assert.equal(ex.st.pending, null);
});

test('cancel clears queued and pending work, then stops at the current leg endpoint', () => {
  const { ex, nodes } = explorer(fixture([edge('a', 'b'), edge('b', 'c'), edge('c', 'd')]));
  ex.retrace(['a', 'b', 'c', 'd'], 9); ex.update(0.05, 0); ex.walkTo('d');
  ex.cancel(); drain(ex);
  assert.deepEqual(nodes, ['b']); assert.equal(ex.room, 'b');
  assert.equal(ex.st.pending, null); assert.deepEqual(ex.st.queue, []); assert.deepEqual(ex.st.plan, []);
  assert.equal(ex.st.fast, false); assert.equal(ex.st.speed, 5.2);
});

test('retrace maintains its requested speed and ignores duplicate or unknown IDs', () => {
  const { ex, nodes, idle } = explorer(fixture([edge('a', 'b'), edge('b', 'c')]));
  ex.retrace(['missing', 'a', 'a', 'b', 'b', 'c'], 9);
  for (let i = 0; i < 10000 && ex.walking; i++) {
    assert.equal(ex.st.speed, 9);
    ex.update(0.05, i * 0.05);
  }
  assert.equal(ex.walking, false); assert.deepEqual(nodes, ['b', 'c']); assert.deepEqual(idle, ['c']);
  assert.equal(ex.st.fast, false); assert.equal(ex.st.speed, 5.2);
});

test('retrace finishes after a disconnected intermediate hop', () => {
  const { ex, nodes, idle } = explorer(fixture([edge('a', 'b'), edge('c', 'd')]));
  ex.retrace(['a', 'b', 'c', 'd'], 9); drain(ex);
  assert.deepEqual(nodes, ['b', 'c', 'd']); assert.deepEqual(idle, ['d']);
});

test('retrace started during a walk visits its first requested room', () => {
  const { ex, nodes } = explorer(fixture([edge('a', 'b'), edge('b', 'c'), edge('c', 'd')]));
  ex.walkTo('b'); ex.update(0.05, 0); ex.retrace(['a', 'c', 'd'], 9); drain(ex);
  assert.deepEqual(nodes, ['b', 'a', 'b', 'c', 'd']);
});

test('restarting a retrace replaces all previous stops after the current leg', () => {
  const { ex, nodes } = explorer(fixture([edge('a', 'b'), edge('b', 'c'), edge('c', 'd')]));
  ex.retrace(['a', 'b', 'c', 'd'], 9); ex.update(0.05, 0);
  ex.retrace(['b', 'a'], 7); drain(ex);
  assert.deepEqual(nodes, ['b', 'a']); assert.equal(ex.room, 'a');
});

test('retrace can finish with only disconnected hops and repeated rooms', () => {
  const { ex, nodes, idle } = explorer(fixture([]));
  ex.retrace(['a', 'b', 'missing', 'b', 'c', 'd'], 9); drain(ex);
  assert.deepEqual(nodes, ['b', 'c', 'd']); assert.deepEqual(idle, ['d']);
});

test('an unreachable pending destination returns to idle without teleporting', () => {
  const { ex, nodes, idle } = explorer(fixture([edge('a', 'b', 'E', 'oneway')]));
  ex.walkTo('b'); ex.update(0.05, 0); ex.walkTo('a'); drain(ex);
  assert.deepEqual(nodes, ['b']); assert.deepEqual(idle, ['b']); assert.equal(ex.st.pending, null);
});

test('explicit placement cancels a replay instead of leaving a stale busy queue', () => {
  const { ex, nodes } = explorer(fixture([edge('a', 'b'), edge('b', 'c'), edge('c', 'd')]));
  ex.retrace(['a', 'b', 'c', 'd'], 9); ex.update(0.05, 0);
  ex.place('a'); drain(ex);
  assert.deepEqual(nodes, ['a']); assert.equal(ex.st.fast, false); assert.equal(ex.st.speed, 5.2);
  assert.deepEqual(ex.st.queue, []);
});

test('the actual expedition replay terminates at its final saved path room', () => {
  const { ex } = explorer({ start: state.status.location });
  ex.retrace(state.path, 9); drain(ex, 100000);
  assert.equal(ex.room, state.path.at(-1));
});

test('the real expedition can be retraced at every discovery checkpoint', () => {
  const checkpoints = [...new Set(Object.values(state.rooms).map((room) => room.order))].sort((a, b) => a - b);
  for (const limit of checkpoints) {
    const visible = new Set(Object.keys(state.rooms).filter((id) => state.rooms[id].order <= limit));
    const stops = state.path.filter((id) => visible.has(id));
    if (stops.length < 2) continue;
    const edges = state.edges.filter((e) => e.order <= limit && visible.has(e.from) && visible.has(e.to));
    const { ex } = explorer({ start: stops[0], edges });
    ex.retrace(stops, 9); drain(ex, 100000);
    assert.equal(ex.room, stops.at(-1), `checkpoint ${limit}`);
  }
});

test('avatar and generated primitive geometry work without a browser or GPU', () => {
  const avatar = makeAvatar(null);
  assert.ok(avatar.group.children.length > 0);
  for (const walking of [false, true, false]) avatar.animate(1.25, walking);
  const first = new Mesher(42), second = new Mesher(42);
  for (const m of [first, second]) {
    m.box(0, 0, 0, 1, 1, 1, '#abcdef'); m.beam([0, 0, 0], [1, 2, 3], 0.2, 0.1, '#987654');
  }
  const a = first.geometry(), b = second.geometry();
  for (const attr of ['position', 'normal', 'color']) assert.deepEqual(a.attributes[attr].array, b.attributes[attr].array);
  assert.ok(a.attributes.position.array.every(Number.isFinite));
  a.dispose(); b.dispose();
});
