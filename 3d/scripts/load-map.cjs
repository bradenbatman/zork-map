// Execute the actual standalone page in a DOM with native 2D canvas rendering.
// This exercises UI logic and pixels, not browser layout, WebGL, or accessibility.
const { JSDOM, VirtualConsole } = require('jsdom');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('node:fs');
const path = require('node:path');

function loadMap({width = 1440, reducedMotion = true, savedView = null} = {}) {
  const errors = [], warnings = [], backing = new WeakMap();
  const getCanvas = element => {
    let value = backing.get(element);
    if (!value || value.width !== element.width || value.height !== element.height) {
      value = createCanvas(element.width || 300, element.height || 150);
      backing.set(element, value);
    }
    return value;
  };
  const console = new VirtualConsole();
  console.on('jsdomError', e => { if (e.type !== 'css parsing') errors.push(e); });
  console.on('error', (...args) => errors.push(args.join(' ')));
  console.on('warn', (...args) => warnings.push(args.join(' ')));
  const dom = new JSDOM(fs.readFileSync(path.resolve(__dirname, '../../out/map.html'), 'utf8'), {
    url: 'https://zork.invalid/map.html', runScripts: 'dangerously', pretendToBeVisual: true,
    virtualConsole: console,
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', {value: width});
      Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {get() {return this.id === 'vp' ? Math.min(896, width - 32) : 800;}});
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {get() {return this.id === 'vp' ? 620 : 400;}});
      window.matchMedia = () => ({matches: reducedMotion, addEventListener() {}, removeEventListener() {}});
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollTo = function(first, top) {
        this.scrollLeft = typeof first === 'object' ? first.left || 0 : first;
        this.scrollTop = typeof first === 'object' ? first.top || 0 : top;
      };
      window.HTMLCanvasElement.prototype.getContext = function(type) {
        if (type !== '2d') return null; // Deliberately no WebGL in this test harness.
        const ctx = getCanvas(this).getContext('2d');
        return new Proxy(ctx, {
          get(target, prop) {
            if (prop === 'drawImage') return (image, ...args) => target.drawImage(image instanceof window.HTMLCanvasElement ? getCanvas(image) : image, ...args);
            const value = target[prop];
            return typeof value === 'function' ? value.bind(target) : value;
          },
          set(target, prop, value) { target[prop] = value; return true; }
        });
      };
      if (savedView) window.sessionStorage.setItem('zork-view', JSON.stringify(savedView));
    }
  });
  return {dom, window: dom.window, document: dom.window.document, errors, warnings, getCanvas,
    close() {dom.window.close();}};
}
module.exports = {loadMap};
