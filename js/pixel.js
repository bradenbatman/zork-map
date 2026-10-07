/* Pixel toolkit: palette, seeded noise and integer drawing primitives. Everything draws on whole pixels. */
var ZP = (function () {
  var c = {
    ink: '#0d1117', rock0: '#101620', rock1: '#161d2a', rock2: '#1e2737', rock3: '#283248',
    stone1: '#2c364e', stone2: '#3a4664', stone3: '#4c5c80', stone4: '#6a7da5', stone5: '#8ea1c7',
    bone: '#e9e2cf', paper: '#f2ead6', cream: '#f7f1de', white: '#ffffff',
    gold: '#f5c542', goldD: '#b8862a', goldL: '#ffe58a', amber: '#ffb627', orange: '#e8892b',
    red: '#c8442f', redD: '#8e2a22', redL: '#e8735a',
    brown: '#8a5a3b', brownD: '#553826', brownL: '#b4794c',
    wood: '#a87a48', woodD: '#7d5630', woodL: '#c9975c',
    sand: '#dcb984', sandD: '#a98358', sandL: '#f0d9aa',
    green: '#4a9b46', greenL: '#86c95c', greenD: '#2f6b37', greenX: '#1d452b',
    grass0: '#3d8544', grass1: '#4a9b46', grass2: '#5fae4f',
    blue: '#4d8fd6', blueD: '#2b5aa8', blueL: '#8cc4f0',
    cyan: '#6fd3e0', teal: '#2e8ca0', tealD: '#1f5f73',
    purple: '#a06bd6', purpleD: '#6a3f9e', pink: '#e08aa8',
    steel: '#a3afc2', steelD: '#5d6a84', steelL: '#d4dcea', mirror: '#c5e8f4',
    slate: '#4a5068', slateD: '#363b50', slateL: '#61698a',
    houseW: '#f0eee4', houseD: '#d5d1c2', houseX: '#a9a595'
  };
  var rgbCache = {};
  function rgb(h) {
    var v = rgbCache[h];
    if (!v) { v = rgbCache[h] = [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
    return v;
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function n2(x, y, s) {
    var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vn(x, y, s, cell) {
    var gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = x / cell - gx, fy = y / cell - gy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = n2(gx, gy, s), b = n2(gx + 1, gy, s), cc = n2(gx, gy + 1, s), d = n2(gx + 1, gy + 1, s);
    return a + (b - a) * fx + (cc - a) * fy + (a - b - cc + d) * fx * fy;
  }
  function rng(seed) {
    var a = seed | 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function canvas(w, h) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    return { c: cv, g: g, w: w, h: h };
  }
  function R(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function P(g, col, x, y) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function line(g, col, x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    g.fillStyle = col;
    for (;;) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function disc(g, col, cx, cy, r) {
    g.fillStyle = col;
    for (var dy = -r; dy <= r; dy++) { var dx = Math.floor(Math.sqrt(r * r - dy * dy + 0.25)); g.fillRect(Math.round(cx - dx), Math.round(cy + dy), 2 * dx + 1, 1); }
  }
  function ell(g, col, cx, cy, rx, ry) {
    g.fillStyle = col;
    for (var dy = -ry; dy <= ry; dy++) { var dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.25))) + 0.5); g.fillRect(Math.round(cx - dx), Math.round(cy + dy), 2 * dx + 1, 1); }
  }
  function dith(g, col, x, y, w, h, ph) {
    g.fillStyle = col;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (((i + j + (ph || 0)) & 1) === 0) g.fillRect(Math.round(x + i), Math.round(y + j), 1, 1);
  }
  /* rectangle with a one pixel outline and a highlight along the top */
  function box(g, fill, edge, x, y, w, h, hi) {
    R(g, edge, x, y, w, h); R(g, fill, x + 1, y + 1, w - 2, h - 2);
    if (hi) R(g, hi, x + 1, y + 1, w - 2, 1);
  }
  return { c: c, rgb: rgb, hash: hash, n2: n2, vn: vn, rng: rng, canvas: canvas, R: R, P: P, line: line, disc: disc, ell: ell, dith: dith, box: box };
})();
