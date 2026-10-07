/* Controller integration only: execute the real 3D entry point and scene builders
   in a DOM, with WebGLRenderer replaced by an inert test double. This is not
   evidence of WebGL rendering, browser layout, or visual correctness. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { JSDOM } = require('jsdom');
const { createCanvas } = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const original = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
const importLine = "import * as THREE from 'three';";
assert.ok(original.includes(importLine), 'renderer-injection seam still exists');
const code = buildSync({
  stdin: {
    contents: original.replace(importLine,
      "import * as ThreeCore from 'three'; const THREE = { ...ThreeCore, WebGLRenderer: window.TestRenderer };"),
    resolveDir: path.join(root, 'src'),
  },
  bundle: true, format: 'iife', write: false, logLevel: 'silent',
}).outputFiles[0].text;
const S = JSON.parse(fs.readFileSync(path.join(root, '../state.json'), 'utf8'));
const layout = JSON.parse(fs.readFileSync(path.join(root, '../layout.json'), 'utf8'));

function load() {
  const dom = new JSDOM('<!doctype html><div id="host"></div>', { runScripts: 'outside-only' });
  const { window } = dom, document = window.document, backing = new WeakMap();
  window.matchMedia = () => ({ matches: true });
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null;
    let canvas = backing.get(this);
    if (!canvas) { canvas = createCanvas(this.width, this.height); backing.set(this, canvas); }
    return canvas.getContext('2d');
  };
  window.TestRenderer = class {
    constructor() { this.domElement = document.createElement('canvas'); this.shadowMap = {}; }
    setPixelRatio() {}
    setSize(w, h) { this.domElement.width = w; this.domElement.height = h; }
    render() {}
  };
  window.eval(code);
  const host = document.getElementById('host');
  const api = window.ZorkThree.create({ S, layout, host });
  api.render({ limit: 1000, cur: 'living-room', sel: 'living-room' });
  return { dom, host, api, ex: api.debug.ex };
}

function finish(ex) {
  for (let i = 0; i < 100000 && ex.walking; i++) ex.update(0.05, i * 0.05);
  assert.equal(ex.walking, false);
}

test('3D controller stops stale retraces on timeline or saved-position changes', () => {
  const { dom, host, api, ex } = load();
  const button = host.querySelector('[data-k=retrace]');
  const assertStopped = () => {
    assert.equal(button.textContent, 'Retrace expedition');
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(ex.st.queue.length, 0);
    finish(ex); assert.equal(api.busy(), false);
  };
  try {
    button.click(); assert.equal(button.getAttribute('aria-pressed'), 'true');
    api.render({ limit: 1000, cur: 'kitchen', sel: 'kitchen' });
    assertStopped();

    button.click(); assert.equal(button.getAttribute('aria-pressed'), 'true');
    api.render({ limit: 6, cur: 'kitchen', sel: 'kitchen' });
    assertStopped();

    api.render({ limit: 1000, cur: 'living-room', sel: 'living-room' }); finish(ex);
    button.click();
    api.setView({ ...api.getView(), at: ex.room });
    assertStopped();

    button.click();
    api.setView({ ...api.getView(), at: 'west-of-house' });
    assertStopped(); assert.equal(ex.room, 'west-of-house');
  } finally { dom.window.close(); }
});

test('3D controller preserves walking and retrace for selection-only and camera-only changes', () => {
  const { dom, host, api, ex } = load();
  const button = host.querySelector('[data-k=retrace]');
  try {
    ex.walkTo('attic');
    const leg = ex.st.leg;
    api.render({ limit: 1000, cur: 'living-room', sel: 'kitchen' });
    assert.equal(ex.st.leg, leg); assert.equal(ex.walking, true);
    const view = api.getView(); delete view.at;
    api.setView(view);
    assert.equal(ex.st.leg, leg); finish(ex); assert.equal(ex.room, 'attic');

    button.click();
    const remaining = ex.st.queue.length;
    api.render({ limit: 1000, cur: 'living-room', sel: 'attic' });
    api.setView(view);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(ex.st.queue.length, remaining);
    finish(ex);
    assert.equal(button.getAttribute('aria-pressed'), 'false'); assert.equal(api.busy(), false);
  } finally { dom.window.close(); }
});
