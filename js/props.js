/* Landmark sprites and per-room scenes. Every scene gets a context p:
   p.g canvas, p.x/p.y chamber centre, p.top/p.floor rows, p.left/p.right columns, p.room, p.S game state, p.rnd seeded random. */
var ZProps = (function () {
  var Z = ZP, c = Z.c, R = Z.R, P = Z.P, line = Z.line, disc = Z.disc, ell = Z.ell, dith = Z.dith, box = Z.box;
  var PR = {};

  /* ---------- outdoors ---------- */
  PR.tree = function (g, x, y, s) {
    s = s == null ? 1 : s;
    var w = [9, 13, 18][s], h = [13, 19, 27][s], tr = [2, 3, 4][s], tiers = 3;
    var th = Math.round(h * 0.42), step = Math.round((h - th - tr) / (tiers - 1));
    R(g, c.brownD, x - 1, y - tr, 2, tr);
    for (var k = 0; k < tiers; k++) {
      var base = y - tr - k * step, hw = Math.round(w / 2 * (1 - k * 0.26));
      for (var j = 0; j < th; j++) {
        var half = Math.max(1, Math.round(hw * (j + 1) / th)), yy = base - th + j;
        R(g, c.greenD, x - half, yy, half * 2 + 1, 1);
        R(g, c.green, x - half + 1, yy, Math.max(1, half * 2 - 2), 1);
        R(g, c.greenL, x - half + 1, yy, Math.max(1, Math.round(half * 0.55)), 1);
      }
      R(g, c.greenX, x - hw, base - 1, hw * 2 + 1, 1);
    }
  };
  PR.bush = function (g, x, y) {
    ell(g, c.greenX, x, y - 3, 6, 4); ell(g, c.green, x, y - 4, 5, 3); ell(g, c.greenL, x - 2, y - 5, 2, 1);
    P(g, c.red, x + 2, y - 4); P(g, c.red, x - 3, y - 3); P(g, c.redL, x + 2, y - 5);
  };
  PR.flowers = function (g, x, y, rnd) {
    var cols = [c.white, c.gold, c.pink, c.blueL];
    for (var i = 0; i < 7; i++) { var fx = x - 10 + Math.floor(rnd() * 21), fy = y - Math.floor(rnd() * 5); P(g, cols[i % 4], fx, fy); P(g, c.greenD, fx, fy + 1); }
  };
  PR.rocks = function (g, x, y) {
    ell(g, c.stone2, x, y - 2, 5, 3); ell(g, c.stone3, x - 1, y - 3, 4, 2); ell(g, c.stone4, x - 2, y - 4, 2, 1);
    ell(g, c.stone2, x + 7, y - 1, 3, 2); ell(g, c.stone3, x + 7, y - 2, 2, 1);
  };
  PR.mailbox = function (g, x, y) {
    R(g, c.brownD, x - 1, y - 8, 2, 8);
    R(g, c.ink, x - 6, y - 15, 13, 8); R(g, c.steel, x - 5, y - 14, 11, 6); R(g, c.steelL, x - 5, y - 14, 11, 1); R(g, c.steelD, x - 5, y - 9, 11, 1);
    R(g, c.ink, x + 6, y - 19, 2, 6); R(g, c.red, x + 6, y - 19, 2, 5); R(g, c.redL, x + 6, y - 19, 2, 1);
    R(g, c.ink, x - 3, y - 12, 5, 1);
  };
  PR.nest = function (g, x, y) {
    ell(g, c.brownD, x, y - 3, 7, 3); ell(g, c.brown, x, y - 4, 6, 2); ell(g, c.brownD, x, y - 4, 3, 1);
    line(g, c.brownL, x - 7, y - 4, x - 4, y - 2); line(g, c.brownL, x + 6, y - 5, x + 3, y - 2); line(g, c.sandD, x - 5, y - 6, x - 2, y - 5);
  };
  PR.bigTree = function (g, x, y) { PR.tree(g, x, y, 2); R(g, c.brown, x + 4, y - 12, 8, 2); R(g, c.brownD, x + 4, y - 10, 8, 1); PR.tree(g, x + 13, y - 1, 1); };
  PR.canopy = function (g, p) {
    var r = p.rnd;
    ell(g, c.greenX, p.x, p.y, 21, 13);
    for (var i = 0; i < 46; i++) { var a = r() * 6.283, d = Math.sqrt(r()) * 19; var lx = Math.round(p.x + Math.cos(a) * d), ly = Math.round(p.y + Math.sin(a) * d * 0.62); disc(g, r() > 0.5 ? c.greenD : c.green, lx, ly, 2 + Math.floor(r() * 2)); }
    for (var k = 0; k < 24; k++) { var b = r() * 6.283, e = Math.sqrt(r()) * 17; P(g, c.greenL, Math.round(p.x + Math.cos(b) * e), Math.round(p.y + Math.sin(b) * e * 0.6)); }
    R(g, c.brownD, p.x - 15, p.y + 6, 24, 3); R(g, c.brown, p.x - 15, p.y + 5, 24, 2); R(g, c.brownL, p.x - 15, p.y + 5, 24, 1);
  };
  PR.rail = function (g, x, y, w) {
    for (var i = 0; i <= w; i += 8) { R(g, c.brownD, x + i, y - 8, 2, 8); R(g, c.brownL, x + i, y - 8, 1, 8); }
    R(g, c.brownD, x, y - 7, w + 2, 2); R(g, c.brownL, x, y - 7, w + 2, 1);
  };
  PR.ledge = function (g, x, y) {
    R(g, c.stone1, x - 18, y - 2, 36, 5); R(g, c.stone3, x - 18, y - 2, 36, 1); R(g, c.stone2, x - 16, y + 1, 32, 1);
    for (var i = 0; i < 5; i++) P(g, c.stone4, x - 14 + i * 7, y - 1);
  };
  PR.sandbar = function (g, x, y, rnd) {
    ell(g, c.sand, x, y - 3, 19, 6); ell(g, c.sandL, x - 3, y - 4, 12, 3);
    for (var i = 0; i < 12; i++) P(g, c.sandD, x - 16 + Math.floor(rnd() * 32), y - 6 + Math.floor(rnd() * 8));
  };
  PR.stream = function (g, x, y, w) {
    R(g, c.blueD, x - w / 2, y - 3, w, 5); R(g, c.blue, x - w / 2, y - 3, w, 3);
    for (var i = 0; i < w; i += 5) { P(g, c.blueL, x - w / 2 + i, y - 2); P(g, c.cyan, x - w / 2 + i + 2, y - 1); }
  };

  /* ---------- inside the house ---------- */
  PR.trophyCase = function (g, x, y, n) {
    var egg = n > 0;
    R(g, c.ink, x - 14, y - 15, 28, 16);
    R(g, c.brownD, x - 13, y - 14, 26, 14); R(g, c.mirror, x - 12, y - 13, 24, 10); R(g, c.brownL, x - 13, y - 14, 26, 1);
    line(g, c.white, x - 8, y - 12, x - 11, y - 9); line(g, c.white, x - 4, y - 12, x - 8, y - 8);
    R(g, c.brownD, x - 13, y - 3, 26, 3); R(g, c.brown, x - 13, y - 3, 26, 1);
    if (egg) {
      var cols = [c.cream, c.goldL, c.blueL, c.steelL, c.cyan, c.white, c.gold, c.pink];
      for (var i = 0; i < Math.min(n, 8); i++) {
        var ix = x - 10 + i * 3, iy = y - 5 - (i % 2) * 2;
        if (i === 0) { ell(g, c.cream, ix + 1, iy - 2, 2, 3); P(g, c.gold, ix + 1, iy - 3); P(g, c.blueL, ix, iy - 1); }
        else { R(g, cols[i], ix, iy - 4, 2, 4); P(g, c.white, ix, iy - 4); R(g, c.gold, ix, iy, 2, 1); }
      }
    }
  };
  PR.rug = function (g, x, y) {
    R(g, c.redD, x - 13, y - 8, 26, 9); R(g, c.red, x - 12, y - 7, 24, 7);
    R(g, c.gold, x - 12, y - 7, 24, 1); R(g, c.gold, x - 12, y - 1, 24, 1);
    for (var i = 0; i < 6; i++) { P(g, c.goldL, x - 9 + i * 4, y - 4); P(g, c.redD, x - 7 + i * 4, y - 4); }
    R(g, c.redD, x + 8, y - 8, 5, 3); R(g, c.red, x + 9, y - 8, 4, 2);
  };
  PR.trapdoor = function (g, x, y, open) {
    R(g, c.woodD, x - 8, y - 8, 16, 9); R(g, c.woodL, x - 8, y - 8, 16, 1);
    if (open) { R(g, c.ink, x - 6, y - 7, 12, 7); for (var i = 0; i < 4; i++) R(g, i % 2 ? c.stone1 : c.stone2, x - 5, y - 6 + i * 2, 10, 1); R(g, c.woodD, x + 6, y - 9, 2, 2); }
    else { R(g, c.wood, x - 7, y - 7, 14, 7); R(g, c.steel, x - 1, y - 5, 3, 2); }
  };
  PR.boardedDoor = function (g, x, y) {
    R(g, c.ink, x - 5, y - 17, 10, 17); R(g, c.brown, x - 4, y - 16, 8, 15);
    for (var i = 0; i < 4; i++) R(g, c.brownD, x - 4 + i * 2, y - 16, 1, 15);
    line(g, c.woodL, x - 5, y - 14, x + 4, y - 5); line(g, c.woodL, x - 5, y - 5, x + 4, y - 14);
    line(g, c.woodD, x - 5, y - 13, x + 4, y - 4); line(g, c.woodD, x - 5, y - 4, x + 4, y - 13);
    P(g, c.steel, x - 3, y - 13); P(g, c.steel, x + 3, y - 13); P(g, c.steel, x - 3, y - 5); P(g, c.steel, x + 3, y - 5);
  };
  PR.table = function (g, x, y) {
    R(g, c.woodD, x - 9, y - 7, 18, 3); R(g, c.woodL, x - 9, y - 8, 18, 1);
    R(g, c.woodD, x - 8, y - 4, 2, 4); R(g, c.woodD, x + 6, y - 4, 2, 4);
  };
  PR.stairsUp = function (g, x, y) {
    for (var i = 0; i < 6; i++) { R(g, i % 2 ? c.woodD : c.wood, x - 7 + i * 2, y - 2 - i * 2, 14 - i * 2, 2); R(g, c.woodL, x - 7 + i * 2, y - 2 - i * 2, 14 - i * 2, 1); }
    R(g, c.brownD, x - 8, y - 14, 1, 14);
  };
  PR.chimneyHole = function (g, x, y) {
    R(g, c.redD, x - 7, y - 11, 14, 12); R(g, c.ink, x - 5, y - 9, 10, 10);
    for (var i = 0; i < 3; i++) R(g, c.red, x - 7, y - 11 + i * 4, 14, 1);
    P(g, c.orange, x - 2, y - 2); P(g, c.amber, x - 1, y - 3); P(g, c.orange, x + 1, y - 2);
  };
  PR.windowOpen = function (g, x, y) {
    R(g, c.ink, x - 3, y - 14, 7, 14); R(g, c.woodD, x - 2, y - 13, 5, 12); R(g, c.mirror, x - 1, y - 12, 3, 5); R(g, c.ink, x - 1, y - 7, 3, 1); R(g, c.mirror, x - 1, y - 5, 3, 3);
    R(g, c.woodL, x + 3, y - 13, 1, 12);
  };
  PR.windowBoarded = function (g, x, y) {
    R(g, c.ink, x - 3, y - 6, 8, 7); R(g, c.houseX, x - 2, y - 5, 6, 5); R(g, c.brown, x - 2, y - 4, 6, 1); R(g, c.brownD, x - 2, y - 2, 6, 1); P(g, c.steel, x - 1, y - 4); P(g, c.steel, x + 3, y - 2);
  };
  PR.ropeCoil = function (g, x, y) { ell(g, c.sandD, x, y - 3, 5, 3); ell(g, c.sand, x, y - 3, 4, 2); ell(g, c.sandD, x, y - 3, 2, 1); P(g, c.sandL, x - 3, y - 4); };

  /* ---------- underground ---------- */
  PR.stalactites = function (g, x, top) {
    var xs = [-16, -9, -3, 4, 11, 17], ls = [4, 6, 3, 5, 4, 6];
    for (var i = 0; i < xs.length; i++) for (var j = 0; j < ls[i]; j++) { var half = Math.max(0, Math.round((ls[i] - j) / 3)); R(g, c.stone2, x + xs[i] - half, top + j, half * 2 + 1, 1); if (half) P(g, c.stone4, x + xs[i] - half, top + j); }
  };
  PR.drip = function (g, x, y) { P(g, c.cyan, x, y); P(g, c.blueL, x, y + 1); };
  PR.puddle = function (g, x, y) { ell(g, c.tealD, x, y - 2, 8, 3); ell(g, c.teal, x, y - 2, 6, 2); P(g, c.cyan, x - 2, y - 3); P(g, c.mirror, x + 1, y - 2); };
  PR.scratches = function (g, x, y) {
    for (var i = 0; i < 3; i++) line(g, c.bone, x - 6 + i * 3, y - 13, x - 3 + i * 3, y - 6);
    ell(g, c.redD, x + 8, y + 6, 6, 2); ell(g, c.red, x + 6, y + 6, 3, 1); P(g, c.redD, x - 10, y + 8); P(g, c.redD, x - 8, y + 9);
  };
  PR.roundRoom = function (g, x, y) {
    ell(g, c.stone2, x, y, 20, 9); ell(g, c.stone3, x, y - 1, 17, 7); ell(g, c.stone2, x, y - 1, 8, 3);
    for (var k = 0; k < 8; k++) {
      var a = k * Math.PI / 4, px = Math.round(x + Math.cos(a) * 16), py = Math.round(y - 1 + Math.sin(a) * 6);
      if (k === 2 || k === 5) { ell(g, c.stone1, px, py + 1, 3, 2); ell(g, c.stone2, px, py, 2, 1); continue; }
      R(g, c.stone5, px - 1, py - 6, 3, 6); R(g, c.stone4, px - 1, py - 6, 1, 6); R(g, c.stone1, px - 2, py, 5, 1);
    }
    P(g, c.stone5, x - 2, y - 2); P(g, c.stone5, x + 2, y);
  };
  PR.speaker = function (g, x, y) {
    R(g, c.steelD, x - 12, y - 8, 4, 6); R(g, c.steel, x - 11, y - 9, 3, 8);
    for (var i = 0; i < 5; i++) R(g, c.steel, x - 8 + i * 1, y - 10 - i, 1, 12 + i * 2);
    var rs = [7, 11, 15];
    for (var q = 0; q < 3; q++) for (var a = -50; a <= 50; a += 9) { var rad = a * Math.PI / 180; P(g, q === 1 ? c.mirror : c.cyan, Math.round(x - 2 + Math.cos(rad) * rs[q]), Math.round(y - 5 + Math.sin(rad) * rs[q] * 0.9)); }
  };
  PR.crackedCanyon = function (g, x, y, rnd) {
    R(g, c.ink, x - 20, y - 13, 41, 22);
    for (var j = 0; j < 22; j++) { var w = 6 + Math.round(Math.sin(j / 2.4) * 2 + rnd() * 2); R(g, c.rock1, x - w - 7, y - 13 + j, w, 1); R(g, c.rock1, x + 7, y - 13 + j, w, 1); }
    R(g, c.blueD, x - 6, y - 1, 13, 9); R(g, c.blue, x - 6, y - 1, 13, 3); for (var i = 0; i < 4; i++) P(g, c.cyan, x - 5 + i * 3, y + 1);
    for (var s = 0; s < 5; s++) R(g, s % 2 ? c.stone2 : c.stone3, x - 19 + s * 2, y - 13 + s * 2, 8 - s, 2);
  };
  PR.damWall = function (g, x, y, open) {
    R(g, c.ink, x - 22, y - 17, 45, 22); R(g, c.slateL, x - 21, y - 16, 43, 20); R(g, c.slate, x - 21, y - 9, 43, 13);
    R(g, c.steelL, x - 21, y - 16, 43, 2); R(g, c.steelD, x - 21, y - 14, 43, 1);
    for (var i = 0; i < 12; i++) R(g, c.steelD, x - 20 + i * 4, y - 18, 1, 3);
    for (var k = 0; k < 3; k++) {
      var gx = x - 17 + k * 12;
      R(g, c.ink, gx, y - 10, 7, 10); R(g, c.slateD, gx + 1, y - 10, 5, 2);
      if (open) { R(g, c.blue, gx + 1, y - 8, 5, 12); R(g, c.cyan, gx + 2, y - 8, 1, 12); R(g, c.white, gx + 4, y - 4, 1, 4); }
      else { R(g, c.slateD, gx + 1, y - 8, 5, 8); R(g, c.steelD, gx + 1, y - 5, 5, 1); }
    }
    if (open) { R(g, c.blueD, x - 21, y + 3, 43, 3); dith(g, c.cyan, x - 21, y + 3, 43, 3, 0); }
  };
  PR.controlPanel = function (g, x, y) {
    R(g, c.ink, x - 6, y - 12, 12, 13); R(g, c.slateD, x - 5, y - 11, 10, 11); disc(g, c.steelL, x, y - 5, 3); disc(g, c.steelD, x, y - 5, 2); R(g, c.ink, x - 1, y - 5, 3, 1);
    disc(g, c.greenL, x, y - 9, 1); P(g, c.white, x, y - 9);
  };
  PR.desk = function (g, x, y) {
    R(g, c.woodD, x - 12, y - 7, 24, 7); R(g, c.wood, x - 12, y - 9, 24, 3); R(g, c.woodL, x - 12, y - 9, 24, 1);
    R(g, c.paper, x - 8, y - 12, 5, 3); R(g, c.cyan, x - 7, y - 11, 3, 1); R(g, c.paper, x - 2, y - 11, 4, 2); R(g, c.bone, x - 2, y - 11, 4, 1);
  };
  PR.privateDoor = function (g, x, y) {
    R(g, c.ink, x - 4, y - 15, 9, 15); R(g, c.slateD, x - 3, y - 14, 7, 14); R(g, c.red, x - 2, y - 12, 5, 3); R(g, c.white, x - 1, y - 11, 1, 1); R(g, c.white, x + 1, y - 11, 1, 1);
  };
  PR.buttons = function (g, x, y, pressedYellow) {
    R(g, c.ink, x - 14, y - 13, 29, 13); R(g, c.slateD, x - 13, y - 12, 27, 11); R(g, c.slate, x - 13, y - 12, 27, 1);
    var cols = [c.blue, c.gold, c.brown, c.red], hl = [c.blueL, c.goldL, c.brownL, c.redL];
    for (var i = 0; i < 4; i++) {
      var bx = x - 9 + i * 6;
      disc(g, cols[i], bx, y - 6, 2); P(g, hl[i], bx - 1, y - 7);
      if (i === 1 && pressedYellow) { R(g, c.goldL, bx - 3, y - 9, 7, 7); disc(g, c.goldL, bx, y - 6, 2); P(g, c.white, bx - 1, y - 7); }
    }
  };
  PR.toolChest = function (g, x, y) {
    R(g, c.ink, x - 8, y - 9, 17, 10); R(g, c.brown, x - 7, y - 8, 15, 8); R(g, c.brownL, x - 7, y - 8, 15, 2); R(g, c.steel, x - 7, y - 5, 15, 1); R(g, c.steelL, x - 1, y - 6, 3, 3);
  };
  PR.boatPile = function (g, x, y) {
    ell(g, c.ink, x, y - 4, 10, 5); ell(g, c.orange, x, y - 5, 9, 4); ell(g, c.amber, x - 2, y - 6, 6, 2); ell(g, c.orange, x + 3, y - 4, 4, 2);
    line(g, c.redD, x - 6, y - 4, x + 5, y - 5); R(g, c.steel, x + 8, y - 7, 3, 3); P(g, c.steelL, x + 9, y - 7);
  };
  PR.mud = function (g, x, y, rnd) {
    ell(g, c.brownD, x, y - 3, 18, 7); ell(g, c.brown, x, y - 4, 16, 5);
    for (var i = 0; i < 10; i++) { var mx = x - 13 + Math.floor(rnd() * 27), my = y - 6 + Math.floor(rnd() * 6); P(g, c.brownL, mx, my); P(g, c.sandD, mx + 1, my); }
    ell(g, c.tealD, x + 6, y - 2, 4, 1);
  };
  PR.columns = function (g, x, y) {
    var xs = [-14, -1, 12];
    for (var i = 0; i < 3; i++) {
      var cx = x + xs[i], h = 15 - (i === 1 ? 0 : 4);
      R(g, c.stone5, cx - 2, y - h, 5, h); R(g, c.steelL, cx - 2, y - h, 1, h); R(g, c.stone3, cx + 2, y - h, 1, h);
      R(g, c.stone4, cx - 3, y - h - 1, 7, 2); R(g, c.stone4, cx - 3, y - 1, 7, 2);
    }
    R(g, c.tealD, x - 20, y - 2, 41, 4); dith(g, c.cyan, x - 20, y - 2, 41, 4, 1);
  };
  PR.mirror = function (g, x, y) {
    R(g, c.ink, x - 17, y - 21, 35, 22); R(g, c.steelD, x - 16, y - 20, 33, 20); R(g, c.mirror, x - 14, y - 18, 29, 16);
    R(g, c.blueL, x - 14, y - 10, 29, 8); dith(g, c.mirror, x - 14, y - 10, 29, 8, 0);
    line(g, c.white, x - 10, y - 17, x - 3, y - 4); line(g, c.white, x - 6, y - 17, x + 1, y - 4); line(g, c.white, x + 4, y - 17, x + 9, y - 8);
    ell(g, c.steelD, x, y + 1, 8, 1);
  };
  PR.slide = function (g, x, y) {
    R(g, c.brownD, x - 19, y - 16, 3, 18); R(g, c.brownD, x + 16, y - 16, 3, 18); R(g, c.brown, x - 19, y - 16, 38, 2);
    for (var i = 0; i < 26; i++) { var sx = x - 15 + i, sy = y - 12 + Math.round(i * 0.46); R(g, c.steel, sx, sy, 1, 4); P(g, c.steelL, sx, sy); P(g, c.steelD, sx, sy + 3); }
  };
  PR.graniteWall = function (g, x, top) {
    var marks = [[-14, 0, 3], [-9, 1, 2], [-5, 0, 3], [0, 1, 2], [4, 0, 3], [9, 1, 2], [13, 0, 2]];
    for (var i = 0; i < marks.length; i++) R(g, c.stone5, x + marks[i][0], top + 3 + marks[i][1], marks[i][2], 1);
    for (var j = 0; j < marks.length; j++) R(g, c.stone4, x + marks[j][0], top + 6 - marks[j][1], Math.max(1, marks[j][2] - 1), 1);
  };
  PR.easel = function (g, x, y) {
    line(g, c.brownD, x - 6, y, x - 2, y - 15); line(g, c.brownD, x + 6, y, x + 2, y - 15); line(g, c.brownD, x, y, x, y - 14);
    R(g, c.paper, x - 6, y - 14, 13, 9); R(g, c.blueL, x - 5, y - 13, 11, 4); R(g, c.green, x - 5, y - 9, 11, 3); P(g, c.gold, x + 2, y - 12); R(g, c.brownD, x - 6, y - 5, 13, 1);
  };
  PR.splatter = function (g, x, y, rnd) {
    var cols = [c.red, c.blue, c.gold, c.green, c.purple, c.pink, c.orange, c.cyan];
    for (var i = 0; i < 18; i++) { var sx = x - 19 + Math.floor(rnd() * 39), sy = y - 4 + Math.floor(rnd() * 15); var col = cols[Math.floor(rnd() * cols.length)]; P(g, col, sx, sy); if (rnd() > 0.6) P(g, col, sx + 1, sy); }
  };
  PR.paper = function (g, x, y) { R(g, c.ink, x - 3, y - 6, 7, 8); R(g, c.paper, x - 2, y - 5, 5, 6); R(g, c.stone3, x - 1, y - 4, 3, 1); R(g, c.stone3, x - 1, y - 2, 2, 1); };
  PR.frames = function (g, x, top) {
    var xs = [-16, -8, 0];
    for (var i = 0; i < 3; i++) { var fx = x + xs[i]; R(g, c.goldD, fx - 3, top + 1, 7, 8); R(g, c.rock2, fx - 2, top + 2, 5, 6); }
    R(g, c.goldD, x + 6, top, 13, 11); R(g, c.gold, x + 6, top, 13, 1); R(g, c.blueL, x + 8, top + 2, 9, 4); R(g, c.green, x + 8, top + 6, 9, 3); disc(g, c.goldL, x + 14, top + 4, 1); P(g, c.greenD, x + 10, top + 6);
  };
  PR.chasm = function (g, x, y, rnd) {
    R(g, c.ink, x - 22, y - 8, 30, 20);
    for (var j = 0; j < 20; j++) { var e = Math.round(rnd() * 2); R(g, c.stone1, x + 6 + e, y - 8 + j, 3, 1); }
    for (var i = 0; i < 9; i++) { dith(g, c.blueD, x - 21, y - 6 + i * 2, 27, 1, i); }
    R(g, c.rock0, x - 21, y + 6, 27, 6);
    R(g, c.stone3, x + 10, y - 4, 12, 10); R(g, c.stone2, x + 10, y - 4, 12, 1);
  };
  PR.ramp = function (g, x, y) {
    for (var i = 0; i < 20; i++) { var sx = x - 19 + i, sy = y - 14 + Math.round(i * 0.7); R(g, c.steel, sx, sy, 1, 6); P(g, c.steelL, sx, sy); P(g, c.steelD, sx, sy + 5); }
    for (var k = 0; k < 4; k++) P(g, c.steelD, x - 16 + k * 5, y - 10 + Math.round(k * 3.5));
  };
  PR.hatch = function (g, x, top) {
    R(g, c.ink, x - 8, top, 16, 8); R(g, c.woodD, x - 7, top + 1, 14, 6);
    for (var i = 0; i < 4; i++) R(g, c.steelD, x - 5 + i * 4, top + 1, 1, 6);
    R(g, c.steel, x - 7, top + 3, 14, 1);
  };
  PR.stairsDown = function (g, x, y) {
    for (var i = 0; i < 5; i++) { R(g, i % 2 ? c.stone2 : c.stone3, x - 7 + i, y - 2 - i * 2 + 8, 14 - i * 2, 2); }
    R(g, c.ink, x - 3, y - 2, 6, 3);
  };
  PR.stairsCave = function (g, x, y) {
    for (var i = 0; i < 5; i++) { R(g, c.stone4 + '', x - 8 + i * 2, y - 2 - i * 2, 14 - i * 2, 2); R(g, i % 2 ? c.stone2 : c.stone3, x - 8 + i * 2, y - 2 - i * 2, 14 - i * 2, 2); }
  };
  PR.windingPath = function (g, x, y) {
    var pts = [[-16, 6], [-8, 6], [-4, 0], [2, 0], [6, 7], [14, 7]];
    for (var i = 0; i < pts.length - 1; i++) { line(g, c.stone4, x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1]); line(g, c.stone3, x + pts[i][0], y + pts[i][1] + 1, x + pts[i + 1][0], y + pts[i + 1][1] + 1); }
  };
  PR.frost = function (g, p) {
    var r = p.rnd;
    for (var i = 0; i < 16; i++) { var fx = p.left + 2 + Math.floor(r() * 40), fy = p.top + Math.floor(r() * 26); P(g, c.mirror, fx, fy); if (r() > 0.6) { P(g, c.cyan, fx + 1, fy); P(g, c.white, fx, fy - 1); } }
    dith(g, c.steelL, p.left + 1, p.top + 9, 42, 2, 0);
  };
  PR.pump = function (g, x, y) { R(g, c.ink, x - 5, y - 11, 11, 12); R(g, c.steel, x - 4, y - 4, 9, 4); R(g, c.steelL, x - 4, y - 4, 9, 1); R(g, c.red, x - 1, y - 10, 3, 6); R(g, c.redL, x - 1, y - 10, 1, 6); R(g, c.steelD, x - 5, y - 3, 1, 3); };
  PR.moon = function (g, x, y) { disc(g, c.gold, x, y, 3); disc(g, c.rock0, x + 2, y - 1, 3); };

  /* ---------- item icons, small enough to lie on the floor ---------- */
  var ICONS = [
    [/platinum bar|\bbar\b/i, function (g, x, y) { R(g, c.ink, x - 5, y - 5, 11, 5); R(g, c.steel, x - 4, y - 4, 9, 3); R(g, c.white, x - 4, y - 4, 9, 1); R(g, c.steelD, x - 4, y - 2, 9, 1); P(g, c.white, x + 2, y - 3); }],
    [/knife/i, function (g, x, y) { R(g, c.steelL, x - 4, y - 4, 6, 1); R(g, c.steel, x - 4, y - 3, 6, 1); R(g, c.brownD, x + 2, y - 4, 3, 2); }],
    [/bottle/i, function (g, x, y) { R(g, c.ink, x - 2, y - 8, 5, 8); R(g, c.teal, x - 1, y - 6, 3, 5); R(g, c.mirror, x, y - 5, 1, 3); R(g, c.tealD, x - 1, y - 7, 3, 1); }],
    [/rope/i, function (g, x, y) { ell(g, c.sandD, x, y - 3, 4, 3); ell(g, c.sand, x, y - 3, 3, 2); P(g, c.sandD, x, y - 3); }],
    [/sack/i, function (g, x, y) { ell(g, c.sandD, x, y - 4, 4, 4); ell(g, c.sand, x - 1, y - 4, 3, 3); R(g, c.sandD, x - 2, y - 8, 5, 2); }],
    [/pump/i, function (g, x, y) { R(g, c.steel, x - 3, y - 4, 7, 3); R(g, c.red, x - 1, y - 8, 3, 4); R(g, c.steelD, x - 4, y - 2, 1, 2); }],
    [/wrench/i, function (g, x, y) { line(g, c.steelL, x - 4, y - 1, x + 3, y - 6); disc(g, c.steelD, x + 3, y - 6, 2); }],
    [/screwdriver/i, function (g, x, y) { line(g, c.steelL, x - 4, y - 2, x + 2, y - 5); R(g, c.red, x + 2, y - 7, 3, 3); }],
    [/tube/i, function (g, x, y) { R(g, c.ink, x - 4, y - 5, 9, 5); R(g, c.blue, x - 3, y - 4, 6, 3); R(g, c.white, x + 3, y - 4, 2, 3); }],
    [/skeleton key|\bkey\b/i, function (g, x, y) { disc(g, c.gold, x - 2, y - 3, 2); R(g, c.goldD, x, y - 3, 5, 1); R(g, c.goldD, x + 4, y - 3, 1, 3); }],
    [/matchbook/i, function (g, x, y) { R(g, c.red, x - 2, y - 4, 5, 4); P(g, c.amber, x, y - 5); }],
    [/trident/i, function (g, x, y) { R(g, c.tealD, x - 1, y - 10, 2, 10); R(g, c.cyan, x - 4, y - 12, 1, 5); R(g, c.cyan, x + 4, y - 12, 1, 5); R(g, c.cyan, x, y - 13, 1, 5); R(g, c.cyan, x - 4, y - 8, 9, 1); }],
    [/trunk/i, function (g, x, y) { R(g, c.ink, x - 6, y - 8, 13, 9); R(g, c.brown, x - 5, y - 7, 11, 7); R(g, c.gold, x - 5, y - 4, 11, 1); P(g, c.gold, x, y - 3); P(g, c.blueL, x - 3, y - 6); P(g, c.pink, x + 3, y - 6); }],
    [/leaflet/i, function (g, x, y) { R(g, c.paper, x - 3, y - 4, 6, 4); R(g, c.stone3, x - 2, y - 3, 3, 1); }],
    [/sword/i, function (g, x, y) { line(g, c.steelL, x - 5, y - 1, x + 4, y - 8); P(g, c.gold, x - 4, y - 2); }],
    [/egg/i, function (g, x, y) { ell(g, c.cream, x, y - 4, 3, 4); R(g, c.gold, x - 3, y - 2, 7, 1); P(g, c.blueL, x, y - 5); }]
  ];
  function iconsFor(item) {
    var out = [];
    for (var i = 0; i < ICONS.length; i++) if (ICONS[i][0].test(item.name)) out.push(ICONS[i][1]);
    if (!out.length && item.type === 'treasure') out.push(function (g, x, y) { R(g, c.ink, x - 3, y - 7, 7, 8); R(g, c.gold, x - 2, y - 6, 5, 6); R(g, c.goldL, x - 1, y - 6, 2, 3); P(g, c.white, x - 1, y - 5); });
    return out;
  }

  /* ---------- scenes: one function per room, drawn on the chamber floor ---------- */
  var SC = {};
  function floorY(p) { return p.y + 9; }
  SC['west-of-house'] = function (p) { PR.mailbox(p.g, p.x - 10, p.y + 6); PR.bush(p.g, p.x + 13, p.y + 8); PR.flowers(p.g, p.x, p.y + 10, p.rnd); };
  SC['south-of-house'] = function (p) { PR.bush(p.g, p.x - 12, p.y + 8); PR.bush(p.g, p.x + 12, p.y + 8); PR.flowers(p.g, p.x, p.y + 10, p.rnd); };
  SC['behind-house'] = function (p) { PR.bush(p.g, p.x + 12, p.y + 8); PR.rocks(p.g, p.x - 12, p.y + 8); PR.flowers(p.g, p.x, p.y + 10, p.rnd); };
  SC['north-of-house'] = function (p) { PR.bush(p.g, p.x - 12, p.y + 8); PR.rocks(p.g, p.x + 8, p.y + 8); };
  SC['clearing'] = function (p) { PR.flowers(p.g, p.x, p.y + 6, p.rnd); PR.rocks(p.g, p.x - 12, p.y + 9); PR.bush(p.g, p.x + 13, p.y + 8); };
  SC['forest-path'] = function (p) { PR.bigTree(p.g, p.x - 8, p.y + 9); };
  SC['up-a-tree'] = function (p) { PR.canopy(p.g, p); PR.nest(p.g, p.x + 4, p.y + 5); };
  SC['canyon-view'] = function (p) { PR.rail(p.g, p.x - 18, p.y + 9, 32); PR.flowers(p.g, p.x + 6, p.y + 10, p.rnd); };
  SC['rocky-ledge'] = function (p) { PR.ledge(p.g, p.x, p.y + 6); PR.rocks(p.g, p.x + 12, p.y + 10); };
  SC['canyon-bottom'] = function (p) { PR.rocks(p.g, p.x - 12, p.y + 9); PR.stream(p.g, p.x + 8, p.y + 9, 22); };
  SC['end-of-rainbow'] = function (p) { PR.sandbar(p.g, p.x, p.y + 10, p.rnd); };
  SC['living-room'] = function (p) {
    var banked = (p.room.items || []).filter(function (i) { return i.type === 'treasure'; }).length;
    PR.trophyCase(p.g, p.x - 8, p.y - 4, banked); PR.rug(p.g, p.x + 4, p.y + 11); PR.trapdoor(p.g, p.x + 5, p.y + 10, true);
  };
  SC['kitchen'] = function (p) { PR.stairsUp(p.g, p.x - 12, p.y + 4); PR.table(p.g, p.x + 2, p.y + 10); PR.chimneyHole(p.g, p.x + 15, p.y - 3); };
  SC['attic'] = function (p) { PR.table(p.g, p.x + 6, p.y + 9); PR.moon(p.g, p.x - 12, p.y - 5); };
  SC['cellar'] = function (p) { PR.ramp(p.g, p.x - 2, p.y + 11); PR.hatch(p.g, p.x + 5, p.top + 1); };
  SC['east-of-chasm'] = function (p) { PR.chasm(p.g, p.x - 2, p.y + 2, p.rnd); };
  SC['gallery'] = function (p) { PR.frames(p.g, p.x - 1, p.top + 1); };
  SC['studio'] = function (p) { PR.splatter(p.g, p.x, p.y + 4, p.rnd); PR.easel(p.g, p.x - 8, p.y + 10); PR.paper(p.g, p.x + 12, p.y - 2); PR.chimneyHole(p.g, p.x + 14, p.y + 9); };
  SC['troll-room'] = function (p) { PR.scratches(p.g, p.x, p.y); };
  SC['east-west-passage'] = function (p) { PR.stairsDown(p.g, p.x + 12, p.y + 4); };
  SC['round-room'] = function (p) { PR.roundRoom(p.g, p.x, p.y + 4); };
  SC['loud-room'] = function (p) { PR.speaker(p.g, p.x - 2, p.y + 6); };
  SC['damp-cave'] = function (p) { PR.stalactites(p.g, p.x, p.top + 1); PR.puddle(p.g, p.x - 4, p.y + 9); PR.drip(p.g, p.x - 3, p.y - 2); };
  SC['deep-canyon'] = function (p) { PR.crackedCanyon(p.g, p.x, p.y + 3, p.rnd); };
  SC['dam'] = function (p) {
    var solved = (p.S.puzzles || []).some(function (q) { return q.name === 'Dam gates' && q.status === 'solved'; });
    PR.damWall(p.g, p.x - 4, p.y + 4, solved); PR.controlPanel(p.g, p.x + 17, p.y + 9);
  };
  SC['dam-lobby'] = function (p) { PR.desk(p.g, p.x, p.y + 9); PR.privateDoor(p.g, p.x - 17, p.y + 4); PR.privateDoor(p.g, p.x + 17, p.y + 4); };
  SC['maintenance-room'] = function (p) { PR.buttons(p.g, p.x, p.top + 12, true); PR.toolChest(p.g, p.x + 14, p.y + 10); };
  SC['dam-base'] = function (p) { PR.stream(p.g, p.x, p.y + 4, 40); PR.stream(p.g, p.x - 2, p.y + 8, 40); PR.boatPile(p.g, p.x + 8, p.y + 2); };
  SC['reservoir-south'] = function (p) { PR.stream(p.g, p.x, p.y + 1, 40); PR.rocks(p.g, p.x - 14, p.y + 10); };
  SC['reservoir'] = function (p) { PR.mud(p.g, p.x, p.y + 8, p.rnd); };
  SC['reservoir-north'] = function (p) { PR.stream(p.g, p.x, p.y + 10, 36); PR.stairsDown(p.g, p.x + 12, p.y + 2); };
  SC['atlantis-room'] = function (p) { PR.columns(p.g, p.x, p.y + 8); };
  PR.bones = function (g, x, y) {
    R(g, c.bone, x - 6, y - 3, 9, 2); disc(g, c.bone, x - 9, y - 4, 2); P(g, c.ink, x - 10, y - 5); P(g, c.ink, x - 8, y - 5);
    R(g, c.bone, x + 3, y - 5, 6, 1); R(g, c.bone, x + 5, y - 2, 5, 1); R(g, c.steelD, x - 2, y - 7, 4, 1);
  };
  PR.hoard = function (g, x, y, rnd) {
    for (var i = 0; i < 16; i++) { var hx = x - 16 + Math.floor(rnd() * 33), hy = y - 6 + Math.floor(rnd() * 12); P(g, rnd() > 0.5 ? c.gold : c.goldD, hx, hy); if (rnd() > 0.7) P(g, c.goldL, hx + 1, hy - 1); }
    ell(g, c.stone1, x + 12, y + 2, 5, 2); ell(g, c.stone2, x - 12, y + 3, 4, 2);
  };
  PR.brokenWall = function (g, x, y) {
    R(g, c.ink, x - 3, y - 11, 6, 14); for (var i = 0; i < 5; i++) { P(g, c.stone3, x - 5 + (i * 3) % 7, y + 1 + (i % 2)); P(g, c.stone2, x + 3 - (i * 2) % 5, y + 2); }
  };
  SC['maze-4'] = function (p) { PR.bones(p.g, p.x - 4, p.y + 9); };
  SC['treasure-room'] = function (p) { PR.hoard(p.g, p.x, p.y + 6, p.rnd); PR.stairsCave(p.g, p.x - 12, p.y + 10); };
  SC['cyclops-room'] = function (p) { PR.stairsCave(p.g, p.x - 8, p.y + 10); PR.brokenWall(p.g, p.x + 19, p.y + 3); };
  SC['strange-passage'] = function (p) { R(p.g, c.woodD, p.x + 14, p.y - 4, 6, 14); R(p.g, c.ink, p.x + 15, p.y + 1, 4, 8); };
  SC['cave'] = function (p) { PR.stairsCave(p.g, p.x - 4, p.y + 10); PR.rocks(p.g, p.x + 12, p.y + 9); };
  SC['mirror-room'] = function (p) { PR.mirror(p.g, p.x, p.y + 12); };
  SC['twisting-passage'] = function (p) { PR.windingPath(p.g, p.x, p.y); };
  SC['cold-passage'] = function (p) { PR.frost(p.g, p); };
  SC['slide-room'] = function (p) { PR.slide(p.g, p.x, p.y + 10); PR.graniteWall(p.g, p.x, p.top); };

  /* which room ids sit inside the house cutaway, and which are outdoors */
  var INSIDE = { 'living-room': 1, 'kitchen': 1, 'attic': 1 };

  function scene(p) {
    var fn = SC[p.id];
    if (fn) fn(p);
    else if (p.room.level === 'surface') { PR.bush(p.g, p.x - 12, p.y + 8); PR.flowers(p.g, p.x, p.y + 10, p.rnd); }
    else PR.rocks(p.g, p.x, p.y + 9);
    var items = p.room.items || [], n = 0, ic = [];
    items.forEach(function (it) {
      if (it.type === 'fixture' || it.type === 'puzzle' || it.type === 'junk' && !/pump|rope|sack/i.test(it.name)) return;
      if (p.id === 'living-room' && it.type === 'treasure') return;
      iconsFor(it).forEach(function (f) { ic.push(f); });
    });
    ic.forEach(function (f, i) { f(p.g, p.left + 5 + i * 9, p.y + 12); });
  }

  return { PR: PR, SC: SC, scene: scene, INSIDE: INSIDE, iconsFor: iconsFor };
})();
