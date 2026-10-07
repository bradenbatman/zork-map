/* Pixel-art world map. Draws the overworld, the house cutaway, the canyon and the underground from game state,
   lights what has been explored, hides the rest in fog, and exposes clickable landmarks. */
var ZorkWorld = (function () {
  var Z = ZP, c = Z.c, R = Z.R, P = Z.P, line = Z.line, disc = Z.disc, ell = Z.ell, dith = Z.dith, PR = ZProps.PR;
  var UX = 64, UY = 44, CW = 44, CH = 28, MX = 46, MYT = 46, SOIL = 22;
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var KIND = { 'living-room': 'built', kitchen: 'built', attic: 'built', 'dam-lobby': 'built', 'maintenance-room': 'built', studio: 'built', gallery: 'built', 'up-a-tree': 'tree', 'end-of-rainbow': 'beach', 'canyon-bottom': 'beach', 'sandy-beach': 'beach', shore: 'beach', 'aragain-falls': 'beach', 'on-the-rainbow': 'beach' };
  var FLOOR = { 'living-room': 'wood', kitchen: 'wood', attic: 'woodDark', 'dam-lobby': 'tile', 'maintenance-room': 'tile', studio: 'woodDark', gallery: 'wood', reservoir: 'mud', 'reservoir-south': 'water', 'reservoir-north': 'water', 'dam-base': 'water', 'atlantis-room': 'water', dam: 'concrete', 'cold-passage': 'ice', 'river-1': 'water', 'river-2': 'water', 'river-3': 'water', 'river-4': 'water', 'river-5': 'water', 'machine-room': 'tile', 'temple': 'tile', altar: 'tile', 'torch-room': 'tile', 'egyptian-room': 'sandstone' };
  ['mine-entrance', 'squeaky-room', 'bat-room', 'shaft-room', 'smelly-room', 'gas-room', 'coal-mine-1', 'coal-mine-2', 'coal-mine-3', 'coal-mine-4', 'ladder-top', 'ladder-bottom', 'dead-end', 'timber-room', 'drafty-room'].forEach(function (id) { FLOOR[id] = 'coal'; });
  var DIRV = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], NE: [0, -1], NW: [0, -1], SE: [0, 1], SW: [0, 1], U: [0, -1], D: [0, 1] };

  function create(o) {
    var S = o.S, rooms = S.rooms, ids = Object.keys(rooms), LY = o.layout || {}, wr = LY.rooms || {}, host = o.host, onSelect = o.onSelect || function () {};
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function upos(id) { return wr[id] || rooms[id].pos; }
    var xs = ids.map(function (i) { return upos(i)[0]; }), ys = ids.map(function (i) { return upos(i)[1]; });
    var minx = Math.min.apply(0, xs), maxx = Math.max.apply(0, xs), miny = Math.min.apply(0, ys), maxy = Math.max.apply(0, ys);
    var W = Math.ceil(MX * 2 + (maxx - minx) * UX + CW), H = Math.ceil(MYT + (maxy - miny) * UY + CH + 44);
    function upt(u) { return { x: Math.round(MX + (u[0] - minx) * UX + CW / 2), y: Math.round(MYT + (u[1] - miny) * UY + CH / 2) }; }
    function ctr(id) { return upt(upos(id)); }
    function rect(id) { var m = ctr(id); return { cx: m.x, cy: m.y, x0: m.x - CW / 2, y0: m.y - CH / 2, x1: m.x + CW / 2, y1: m.y + CH / 2 }; }
    var GY = upt([0, LY.ground || 2.55]).y;
    function kindOf(id) { return KIND[id] || (rooms[id].level === 'surface' ? 'outdoor' : 'cave'); }

    /* ---------- DOM ---------- */
    host.innerHTML = '<canvas class="wl-base"></canvas><canvas class="wl-over"></canvas><div class="wl-hot"></div>';
    var cvBase = host.querySelector('.wl-base'), cvOver = host.querySelector('.wl-over'), hot = host.querySelector('.wl-hot');
    cvBase.width = cvOver.width = W; cvBase.height = cvOver.height = H;
    var gBase = cvBase.getContext('2d'), gOver = cvOver.getContext('2d'); gBase.imageSmoothingEnabled = gOver.imageSmoothingEnabled = false;
    var layerA = Z.canvas(W, H), art = Z.canvas(W, H);
    var zoom = 2, built = null, st = { cur: null, sel: null }, dyn = { water: [], twinkle: [], thief: [] }, timer = null, tick = 0, active = true;

    /* ---------- routes ---------- */
    function routePts(from, to) {
      var a = ctr(from), b = ctr(to), ov = (LY.routes || {})[from + '>' + to];
      if (ov) return [a].concat(ov.map(upt), [b]);
      if (Math.abs(b.y - a.y) < 8) { var mx = Math.round((a.x + b.x) / 2); return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]; }
      var my = Math.round((a.y + b.y) / 2); return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
    }
    function edgeClass(e) {
      var k = e.from + '>' + e.to;
      if (k === 'living-room>cellar') return 'trapdoor';
      if (k === 'studio>kitchen') return 'chimney';
      if (k === 'slide-room>cellar') return 'slide';
      if (k === 'strange-passage>living-room') return 'tunnel';
      if (k === 'on-the-rainbow>end-of-rainbow') return 'rainbow';
      if (e.kind === 'boat') return 'river';
      var a = rooms[e.from], b = rooms[e.to], ia = ZProps.INSIDE[e.from], ib = ZProps.INSIDE[e.to];
      if (ia || ib) return null;
      if (e.from === 'forest-path' && e.to === 'up-a-tree') return null;
      if (a.level === 'surface' && b.level === 'surface') return 'path';
      if (a.level === 'under' && b.level === 'under') return 'tunnel';
      return null;
    }
    function segs(pts, fn) { for (var i = 0; i < pts.length - 1; i++) fn(pts[i], pts[i + 1]); }
    function band(g, p, q, w, fn) {
      var x0 = Math.min(p.x, q.x), x1 = Math.max(p.x, q.x), y0 = Math.min(p.y, q.y), y1 = Math.max(p.y, q.y), h = Math.floor(w / 2);
      fn(g, x0 - h, y0 - h, x1 - x0 + w, y1 - y0 + w);
    }

    /* ---------- static layer: terrain, gorge, forest, house ---------- */
    function grassPx(x, y) {
      var t = Z.vn(x, y, 11, 20), u = Z.n2(x, y, 5), col = t < 0.38 ? c.grass0 : t > 0.68 ? c.grass2 : c.grass1;
      if (u > 0.95) col = t > 0.5 ? c.greenL : c.greenD; else if (u < 0.004) col = c.white; else if (u > 0.9985) col = c.gold;
      return Z.rgb(col);
    }
    var SOILC = ['#3f7d3f', '#5e3f29', '#5e3f29', '#6f4b31', '#6f4b31', '#6f4b31', '#80583a', '#80583a', '#80583a', '#8f6a46', '#8f6a46', '#80583a', '#80583a', '#6f4b31', '#6f4b31', '#5e3f29', '#5e3f29', '#3f3a44', '#3a3a48', '#2c3040', '#232a3a', '#1c2432'];
    function soilPx(x, j) {
      var col = SOILC[Math.min(j, SOILC.length - 1)], u = Z.n2(x, j, 9);
      if (j > 3 && j < 16 && u > 0.93) col = c.stone3; else if (j > 3 && j < 16 && u < 0.05) col = c.brownD;
      return Z.rgb(col);
    }
    function rockPx(x, y) {
      var t = Z.vn(x, y, 21, 9), u = Z.n2(x, y, 7), s = Math.sin(y / 6 + Z.vn(x, y, 3, 40) * 4), col = t < 0.28 ? c.rock0 : t > 0.62 ? c.rock2 : c.rock1;
      if (s > 0.86) col = c.rock2;
      if (u > 0.9945) col = c.teal; else if (u > 0.9895) col = c.goldD;
      return Z.rgb(col);
    }
    function paintTerrain(g) {
      var img = g.createImageData(W, H), d = img.data;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var col = y < GY ? grassPx(x, y) : y < GY + SOIL ? soilPx(x, y - GY) : rockPx(x, y), i = (y * W + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    var eor = ctr('end-of-rainbow'), GX = eor.x, GL = GX - 60, GR = GX + 60;
    function paintGorge(g) {
      var top = 4, bot = GY + SOIL, x, y;
      for (y = top; y < bot; y++) {
        var wob = Math.round(Math.sin(y / 17) * 6 + Math.sin(y / 7) * 2);
        for (x = GL - 6; x <= GR + 6; x++) {
          var dx = x - GX, ax = Math.abs(dx), rd = Math.abs(dx - wob), col;
          if (y >= GY) { if (rd < 15) P(g, y > GY + 12 ? '#152a4d' : c.blueD, x, y); continue; }
          if (ax > 46) {
            var strata = Math.floor((y + Math.floor(Z.n2(x >> 3, 1, 33) * 5)) / 5) % 3;
            col = strata === 0 ? c.stone2 : strata === 1 ? c.stone3 : c.stone1;
            if (Z.n2(x, y, 34) > 0.94) col = c.stone4; else if (Z.n2(x, y, 35) < 0.06) col = c.slateD;
            if (ax > 55) col = Z.n2(x, y, 36) > 0.5 ? c.slate : c.slateD;
            if (ax === 47) col = c.stone5;
          } else if (rd < 15) {
            var wv = Z.vn(x, y, 4, 5);
            col = wv > 0.64 ? c.blueL : wv > 0.4 ? c.blue : c.blueD;
            if (rd > 12 && Z.n2(x, y, 37) > 0.4) col = c.mirror;
          } else {
            col = Z.vn(x, y, 7, 6) > 0.5 ? '#b09565' : '#9c8258';
            if (Z.n2(x, y, 38) > 0.95) col = c.stone4; else if (Z.n2(x, y, 39) < 0.04) col = '#7a6440';
          }
          P(g, col, x, y);
        }
      }
      var j, i;
      for (j = 0; j < 50; j++) for (i = 0; i < 20; i++) { var w2 = Z.n2(i, j >> 1, 41), edge = i < 2 || i > 17; P(g, edge ? c.blueL : w2 > 0.72 ? c.white : w2 > 0.38 ? c.mirror : c.cyan, GX - 10 + i, top + j); }
      ell(g, c.blueD, GX, top + 53, 25, 6); ell(g, c.white, GX, top + 52, 22, 5); ell(g, c.mirror, GX, top + 54, 17, 3); dith(g, c.cyan, GX - 22, top + 50, 44, 6, 0);
      for (var m = 0; m < 40; m++) P(g, c.white, GX - 22 + Math.floor(Z.n2(m, 5, 42) * 44), top + 40 + Math.floor(Z.n2(m, 6, 42) * 16));
      var rc = [c.red, c.orange, c.gold, c.green, c.blue, c.purple], cx = GX + 44, cy = top + 80;
      for (var yy = cy - 66; yy <= cy; yy++) for (var xx = cx - 66; xx <= cx + 66; xx++) {
        var r = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy)), bi = Math.floor((r - 44) / 3);
        if (bi >= 0 && bi < 6 && yy < cy - 1) { g.fillStyle = rc[bi]; g.globalAlpha = 0.8; g.fillRect(xx, yy, 1, 1); g.globalAlpha = 1; }
      }
    }
    function inClear(x, y, list) {
      for (var i = 0; i < list.length; i++) { var s = list[i]; if (x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1) return true; }
      return false;
    }
    function clearZones() {
      var z = [], LR = rect('living-room'), K = rect('kitchen'), A = rect('attic');
      z.push({ x0: LR.x0 - 22, y0: A.y0 - 34, x1: K.x1 + 26, y1: LR.y1 + 22 });
      z.push({ x0: GL - 14, y0: -4, x1: GR + 14, y1: GY + 2 });
      ids.forEach(function (id) { if (rooms[id].level === 'surface') { var r = rect(id); z.push({ x0: r.x0 - 12, y0: r.y0 - 16, x1: r.x1 + 12, y1: r.y1 + 8 }); } });
      S.edges.forEach(function (e) {
        if (edgeClass(e) !== 'path') return;
        segs(routePts(e.from, e.to), function (p, q) { z.push({ x0: Math.min(p.x, q.x) - 9, y0: Math.min(p.y, q.y) - 12, x1: Math.max(p.x, q.x) + 9, y1: Math.max(p.y, q.y) + 6 }); });
      });
      return z;
    }
    function paintForest(g, zones) {
      var trees = [];
      for (var y = 16; y < GY - 3; y += 9) for (var x = 4; x < W - 3; x += 9) {
        var jx = x + Math.floor(Z.n2(x, y, 51) * 7) - 3, jy = y + Math.floor(Z.n2(x, y, 52) * 6) - 2;
        if (inClear(jx, jy, zones)) continue;
        if (Z.vn(jx, jy, 53, 46) < 0.2 && Z.n2(x, y, 54) < 0.6) continue;
        var s = Z.n2(x, y, 55), size = s < 0.3 ? 0 : s < 0.85 ? 1 : 2;
        trees.push({ x: jx, y: jy + 8, s: size });
      }
      trees.sort(function (a, b) { return a.y - b.y; });
      trees.forEach(function (t) { ell(g, c.grass0, t.x, t.y, 5, 2); PR.tree(g, t.x, t.y, t.s); });
    }
    function paintHouse(g) {
      var LR = rect('living-room'), K = rect('kitchen'), A = rect('attic');
      var L = LR.x0 - 9, Rr = K.x1 + 9, T = LR.y0 - 9, B = LR.y1 + 9, roofTop = A.y0 - 8;
      R(g, c.greenX, L + 2, B, Rr - L, 4); dith(g, c.grass0, L + 2, B + 4, Rr - L, 1, 0);
      for (var y = roofTop; y < T; y++) {
        var t = (y - roofTop) / (T - roofTop), l = Math.round(L + 22 - 30 * t), r = Math.round(Rr - 22 + 30 * t), rowc = Math.floor((y - roofTop) / 3) % 2 ? c.slateD : c.slate;
        R(g, c.ink, l - 1, y, r - l + 3, 1); R(g, rowc, l, y, r - l + 1, 1);
        for (var x = l + ((y >> 1) & 3); x < r; x += 4) P(g, c.slateL, x, y);
        P(g, c.slateL, l, y);
      }
      R(g, c.ink, L - 9, T - 1, Rr - L + 19, 2); R(g, c.slateD, L - 8, T - 2, Rr - L + 17, 2);
      R(g, c.ink, L + 10, roofTop + 4, 10, 16); R(g, c.redD, L + 11, roofTop + 5, 8, 15); for (var b = 0; b < 4; b++) R(g, c.red, L + 11, roofTop + 7 + b * 4, 8, 1); R(g, c.stone2, L + 9, roofTop + 3, 12, 2);
      R(g, c.ink, L - 1, T - 1, Rr - L + 2, B - T + 3); R(g, c.houseW, L, T, Rr - L + 1, B - T + 1);
      for (var sy = T + 2; sy < B; sy += 3) R(g, c.houseD, L, sy, Rr - L + 1, 1);
      R(g, c.houseX, L, T, 2, B - T + 1); R(g, c.houseX, Rr - 1, T, 2, B - T + 1); R(g, c.stone3, L, B - 2, Rr - L + 1, 3); dith(g, c.stone2, L, B - 2, Rr - L + 1, 3, 0);
    }
    function paintStaticFeatures() {
      var g = layerA.g; paintTerrain(g); paintGorge(g); paintForest(g, clearZones()); paintHouse(g);
    }

    /* ---------- per-limit layer: paths, tunnels, chambers, props ---------- */
    function floorFill(g, x0, y0, w, h, kind) {
      for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
        var col, gx = x0 + i, gy = y0 + j, u = Z.n2(gx, gy, 61);
        switch (kind) {
          case 'wood': case 'woodDark': var row = Math.floor(j / 3), off = (row % 2) * 5; col = ((i + off) % 11 === 0) ? c.woodD : (row % 2 ? c.wood : '#b0834f'); if (kind === 'woodDark') col = ((i + off) % 11 === 0) ? '#5a3d22' : (row % 2 ? '#7d5630' : '#6f4c2b'); break;
          case 'tile': col = ((i >> 2) + (j >> 2)) % 2 ? '#7a8496' : '#6d778a'; if (u > 0.96) col = '#8a94a6'; break;
          case 'water': col = j % 4 < 2 ? '#2b5aa8' : '#3a76bd'; if (u > 0.9) col = c.blueL; else if (u > 0.85) col = c.cyan; break;
          case 'mud': col = u > 0.9 ? c.brownL : u < 0.2 ? c.brownD : c.brown; if (((i >> 2) + (j >> 2)) % 2) col = u > 0.5 ? c.brown : '#7d4f33'; break;
          case 'concrete': col = ((i >> 2) + (j >> 2)) % 2 ? '#5e667e' : '#565d75'; break;
          case 'sandstone': col = ((i >> 2) + (j >> 2)) % 2 ? '#a58a5a' : '#977e51'; if (u > 0.93) col = '#c2a874'; else if (u < 0.05) col = '#6f5a38'; break;
          case 'coal': col = ((i >> 2) + (j >> 2)) % 2 ? '#2a2d3a' : '#242733'; if (u > 0.95) col = '#4a4e60'; else if (u < 0.04) col = '#15161e'; break;
          case 'ice': col = ((i >> 2) + (j >> 2)) % 2 ? '#5e7ea6' : '#557499'; if (u > 0.9) col = c.mirror; break;
          default: col = ((i >> 2) + (j >> 2)) % 2 ? '#414f74' : '#39466a'; if (u > 0.94) col = c.stone4; else if (u < 0.05) col = '#2f3a58';
        }
        g.fillStyle = col; g.fillRect(gx, gy, 1, 1);
      }
    }
    function wallFill(g, x0, y0, w, h, kind, floor) {
      var plaster = kind === 'built' && (floor === 'wood' || floor === 'woodDark'), tile = floor === 'tile';
      for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
        var col;
        if (plaster) { col = floor === 'woodDark' ? (j % 4 === 3 ? '#4a3220' : '#5c4029') : (j >= h - 2 ? c.woodD : (i % 8 === 0 ? '#a88865' : '#9a7a58')); }
        else if (tile) { col = j >= h - 2 ? '#4f586d' : ((i >> 3) % 2 ? '#8a94a6' : '#7f899b'); }
        else { var brick = ((j >> 2) & 1) ? (i + 4) : i; col = (j % 4 === 3 || brick % 8 === 7) ? '#262f47' : '#31405d'; if (Z.n2(x0 + i, y0 + j, 62) > 0.93) col = '#3a4a6c'; }
        g.fillStyle = col; g.fillRect(x0 + i, y0 + j, 1, 1);
      }
      R(g, c.ink, x0, y0 + h - 1, w, 1);
    }
    function paintRim(g, id) {
      var r = rect(id), k = kindOf(id); if (k === 'outdoor' || k === 'tree' || k === 'beach') return;
      var sd = Z.hash(id), built = k === 'built';
      for (var j = -2; j <= CH + 1; j++) {
        var jl = built ? 0 : Math.floor(Z.n2(j, 1, sd) * 3) - 1, jr = built ? 0 : Math.floor(Z.n2(j, 2, sd) * 3) - 1;
        R(g, built ? c.ink : c.stone1, r.x0 - 2 + jl, r.y0 + j, CW + 4 - jl + jr, 1);
      }
      if (!built) { R(g, c.ink, r.x0 - 3, r.y0 + 3, 1, CH - 6); R(g, c.ink, r.x1 + 2, r.y0 + 3, 1, CH - 6); }
    }
    function paintInterior(g, id, visited) {
      var r = rect(id), k = kindOf(id), fl = FLOOR[id] || 'stone', rnd = Z.rng(Z.hash(id));
      var p = { g: g, id: id, x: r.cx, y: r.cy, top: r.y0, floor: r.y1 - 2, left: r.x0, right: r.x1, room: rooms[id], S: S, rnd: rnd };
      if (k === 'outdoor' || k === 'beach') {
        var beach = k === 'beach';
        ell(g, beach ? c.sandD : c.grass0, r.cx, r.cy, 23, 14); ell(g, beach ? c.sand : c.grass2, r.cx, r.cy, 21, 12);
        dith(g, beach ? c.sandL : c.greenL, r.cx - 16, r.cy - 9, 32, 3, 0);
        for (var i = 0; i < 16; i++) { var a = i / 16 * 6.283; P(g, beach ? c.mirror : c.stone3, Math.round(r.cx + Math.cos(a) * 23), Math.round(r.cy + Math.sin(a) * 14)); }
        if (beach) for (var q = 0; q < 26; q++) { var b = q / 26 * 6.283; P(g, q % 3 ? c.white : c.cyan, Math.round(r.cx + Math.cos(b) * 25), Math.round(r.cy + Math.sin(b) * 16)); }
      } else if (k === 'tree') {
        /* the canopy prop paints its own background */
      } else {
        wallFill(g, r.x0, r.y0, CW, 9, k, fl); floorFill(g, r.x0, r.y0 + 9, CW, CH - 9, fl);
        R(g, c.ink, r.x0, r.y0 + 9, CW, 1); R(g, 'rgba(0,0,0,0)', 0, 0, 0, 0);
        dith(g, 'rgba(0,0,0,0.35)', r.x0, r.y1 - 3, CW, 3, 0);
        g.fillStyle = c.ink; g.fillRect(r.x0, r.y0, 1, CH); g.fillRect(r.x1 - 1, r.y0, 1, CH);
      }
      ZProps.scene(p);
      if (id === 'attic' || id === 'cold-passage') { }
      if (!visited) { g.fillStyle = 'rgba(8,10,16,0.55)'; g.fillRect(r.x0, r.y0, CW, CH); }
    }
    function drawBand(g, pts, w, style) {
      segs(pts, function (p, q) {
        if (style === 'path') {
          band(g, p, q, w + 2, function (gg, x, y, ww, hh) { R(gg, '#8a6338', x, y, ww, hh); });
          band(g, p, q, w, function (gg, x, y, ww, hh) { R(gg, '#c79a62', x, y, ww, hh); dith(gg, '#d9b380', x, y, ww, hh, 0); });
        } else if (style === 'shaft') {
          band(g, p, q, w + 2, function (gg, x, y, ww, hh) { R(gg, c.ink, x, y, ww, hh); });
          band(g, p, q, w, function (gg, x, y, ww, hh) { R(gg, c.slate, x, y, ww, hh); R(gg, c.ink, x + 2, y, ww - 4, hh); });
        } else if (style === 'chimney') {
          band(g, p, q, w + 2, function (gg, x, y, ww, hh) { R(gg, c.ink, x, y, ww, hh); });
          band(g, p, q, w, function (gg, x, y, ww, hh) { R(gg, c.redD, x, y, ww, hh); R(gg, '#1a1214', x + 2, y, ww - 4, hh); });
        } else if (style === 'rainbow') {
          var rcols = [c.red, c.orange, c.gold, c.green, c.blue, c.purple], n = rcols.length;
          band(g, p, q, n * 2 + 2, function (gg, x, y, ww, hh) { R(gg, c.ink, x, y, ww, hh); });
          for (var bi = 0; bi < n; bi++) band(g, p, q, (n - bi) * 2, function (gg, x, y, ww, hh) { R(gg, rcols[bi], x, y, ww, hh); });
        } else if (style === 'river') {
          band(g, p, q, w + 2, function (gg, x, y, ww, hh) { R(gg, c.blueD, x, y, ww, hh); });
          band(g, p, q, w, function (gg, x, y, ww, hh) { R(gg, c.blue, x, y, ww, hh); dith(gg, c.blueL, x, y, ww, hh, 0); });
        } else if (style === 'slide') {
          band(g, p, q, w + 2, function (gg, x, y, ww, hh) { R(gg, c.ink, x, y, ww, hh); });
          band(g, p, q, w, function (gg, x, y, ww, hh) { R(gg, c.steelD, x, y, ww, hh); R(gg, '#7a879e', x + 1, y + 1, ww - 2, hh - 2); dith(gg, c.steel, x + 1, y + 1, ww - 2, hh - 2, 0); });
        } else {
          band(g, p, q, w + 4, function (gg, x, y, ww, hh) { R(gg, c.stone1, x, y, ww, hh); });
          band(g, p, q, w, function (gg, x, y, ww, hh) { R(gg, '#37436a', x, y, ww, hh); dith(gg, '#414f74', x, y, ww, hh, 1); });
        }
      });
    }
    function lengthOf(pts) { var l = 0; segs(pts, function (p, q) { l += Math.abs(p.x - q.x) + Math.abs(p.y - q.y); }); return l; }
    function chevrons(g, pts, col, dir) {
      var n = 0; segs(pts, function (p, q) {
        var L = Math.abs(p.x - q.x) + Math.abs(p.y - q.y), steps = Math.floor(L / 14);
        for (var i = 1; i <= steps; i++) { var t = i / (steps + 1), x = Math.round(p.x + (q.x - p.x) * t), y = Math.round(p.y + (q.y - p.y) * t); if (p.y !== q.y) { R(g, col, x - 2, y, 5, 1); R(g, col, x - 1, y + 1, 3, 1); P(g, col, x, y + 2); } n++; }
      });
    }

    var lights = [];
    function build(limit) {
      var g = art.g; g.clearRect(0, 0, W, H); g.drawImage(layerA.c, 0, 0);
      var vis = ids.filter(function (id) { return rooms[id].order <= limit; }), vset = {}; vis.forEach(function (id) { vset[id] = 1; });
      lights = []; dyn = { water: [], twinkle: [], thief: [] }; var pair = {}, linked = {};

      /* phase 1: chamber rims */
      vis.forEach(function (id) { paintRim(g, id); });
      /* phase 2: paths, tunnels, shafts */
      S.edges.forEach(function (e) {
        if (!(e.order <= limit && vset[e.from] && vset[e.to])) return;
        linked[e.from + ':' + e.dir] = 1; if (e.back) linked[e.to + ':' + e.back] = 1;
        var cls = edgeClass(e); if (!cls) return;
        var pk = [e.from, e.to].sort().join('|') + cls; if (pair[pk]) return; pair[pk] = 1;
        var pts = routePts(e.from, e.to), w = cls === 'path' ? 6 : cls === 'tunnel' ? 8 : cls === 'slide' ? 5 : 8;
        if (cls === 'trapdoor') { var a = ctr(e.from), b = ctr(e.to); pts = [{ x: a.x + 5, y: a.y + 8 }, { x: a.x + 5, y: b.y - 12 }]; drawBand(g, pts, 10, 'shaft'); for (var y = pts[0].y + 4; y < pts[1].y; y += 5) R(g, c.brownL, pts[0].x - 3, y, 7, 1); }
        else if (cls === 'chimney') { drawBand(g, pts, 8, 'chimney'); }
        else if (cls === 'slide') { drawBand(g, pts, 6, 'slide'); chevrons(g, pts, c.steelL); }
        else drawBand(g, pts, w, cls);
        var lr = cls === 'path' ? 8 : 10;
        segs(pts, function (p, q) { lights.push({ x0: Math.min(p.x, q.x), y0: Math.min(p.y, q.y), x1: Math.max(p.x, q.x), y1: Math.max(p.y, q.y), r: lr, s: cls === 'path' ? 1 : 0.9 }); });
      });
      /* phase 3: unexplored stubs */
      var stubs = [];
      vis.forEach(function (id) {
        var r = rect(id), used = {};
        (rooms[id].open_exits || []).forEach(function (ox) {
          if (linked[id + ':' + ox.dir]) return;
          var v = DIRV[ox.dir]; if (!v) return;
          var side = v[0] === 1 ? 'E' : v[0] === -1 ? 'W' : v[1] === -1 ? 'N' : 'S', k = used[side] || 0; used[side] = k + 1;
          var off = k === 0 ? 0 : (k % 2 ? -1 : 1) * 8 * Math.ceil(k / 2), sx, sy, ex, ey;
          if (side === 'E') { sx = r.x1 - 1; sy = r.cy; ex = r.x1 + 15; ey = sy; } else if (side === 'W') { sx = r.x0; sy = r.cy; ex = r.x0 - 15; ey = sy; }
          else if (side === 'N') { sx = r.cx + off; sy = r.y0; ex = sx; ey = r.y0 - 13; } else { sx = r.cx + off; sy = r.y1 - 1; ex = sx; ey = r.y1 + 13; }
          var surface = rooms[id].level === 'surface';
          drawBand(g, [{ x: sx, y: sy }, { x: ex, y: ey }], surface ? 5 : 6, surface ? 'path' : 'tunnel');
          stubs.push({ id: id, x: ex + (v[0] * 5), y: ey + (v[1] * 5), dir: ox.dir, note: ox.note || '', locked: ox.kind === 'locked' });
        });
      });
      /* phase 4: chamber interiors and props, house furniture */
      vis.forEach(function (id) { paintInterior(g, id, rooms[id].visited); });
      var LR = rect('living-room'), K = rect('kitchen');
      if (vset['living-room'] && vset['kitchen']) {
        var dy = Math.round((LR.cy + K.cy) / 2) + 3; R(g, c.ink, LR.x1 - 1, dy - 7, K.x0 - LR.x1 + 2, 14); R(g, c.wood, LR.x1, dy - 6, K.x0 - LR.x1, 12); dith(g, c.woodL, LR.x1, dy - 6, K.x0 - LR.x1, 12, 0);
      }
      if (vset['living-room']) PR.boardedDoor(g, LR.x0 - 4, LR.cy + 9);
      if (vset['kitchen']) PR.windowOpen(g, K.x1 + 4, K.cy + 8);
      if (vset['living-room']) { PR.windowBoarded(g, LR.x0 + 10, LR.y1 + 7); PR.windowBoarded(g, K.x1 - 10, LR.y1 + 7); }
      if (vset['kitchen'] && vset['attic']) { var A = rect('attic'); R(g, c.ink, K.cx - 5, A.y1 - 1, 10, K.y0 - A.y1 + 2); R(g, c.woodD, K.cx - 4, A.y1, 8, K.y0 - A.y1); }

      /* lights, item sparkles, landmarks */
      vis.forEach(function (id) {
        var r = rect(id), room = rooms[id], surf = room.level === 'surface';
        lights.push({ x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, r: surf ? 48 : 22, s: room.visited ? 1 : 0.32 });
        var hasT = (room.items || []).some(function (it) { return it.type === 'treasure'; });
        if (hasT) dyn.twinkle.push({ x: r.cx, y: r.cy, id: id });
        if ((room.items || []).some(function (it) { return /thief/i.test(it.name); })) dyn.thief.push({ x: r.cx + 12, y: r.cy + 8 });
        if (FLOOR[id] === 'water' || id === 'dam-base' || id === 'canyon-bottom') dyn.water.push({ x0: r.x0 + 2, y0: r.y0 + 10, x1: r.x1 - 2, y1: r.y1 - 2 });
      });
      dyn.water.push({ x0: GX - 14, y0: 60, x1: GX + 14, y1: GY - 2 });
      if (vset['canyon-view']) lights.push({ x0: GX - 14, y0: 4, x1: GX + 14, y1: 90, r: 42, s: 0.85 });
      buildHot(vis, stubs);
      shadeLit(limit);
    }

    function shadeLit(limit) {
      var img = art.g.getImageData(0, 0, W, H), d = img.data, Lm = new Float32Array(W * H), x, y, i;
      for (y = 0; y < H; y++) { var b0 = y < GY ? 0.13 : y < GY + SOIL ? 0.09 : 0.05; for (x = 0; x < W; x++) Lm[y * W + x] = b0; }
      var cur = st.cur && rooms[st.cur] && rooms[st.cur].order <= limit ? rect(st.cur) : null;
      var all = lights.slice(); if (cur) all.push({ x0: cur.x0, y0: cur.y0, x1: cur.x1, y1: cur.y1, r: 46, s: 1.1 });
      all.forEach(function (l) {
        var ya = Math.max(0, l.y0 - l.r), yb = Math.min(H - 1, l.y1 + l.r), xa = Math.max(0, l.x0 - l.r), xb = Math.min(W - 1, l.x1 + l.r);
        for (var yy = ya; yy <= yb; yy++) for (var xx = xa; xx <= xb; xx++) {
          var dx = xx < l.x0 ? l.x0 - xx : xx > l.x1 ? xx - l.x1 : 0, dy2 = yy < l.y0 ? l.y0 - yy : yy > l.y1 ? yy - l.y1 : 0, dist = Math.sqrt(dx * dx + dy2 * dy2);
          if (dist > l.r) continue; var t = 1 - dist / l.r, v = l.s * t * t * (3 - 2 * t), k = yy * W + xx; if (v > Lm[k]) Lm[k] = v;
        }
      });
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        i = y * W + x; var L = Lm[i], bay = BAYER[(y & 3) * 4 + (x & 3)] / 16, kq = Math.floor(L * 6 + bay) / 6; if (kq > 1) kq = 1;
        var edge = Math.min(x, W - 1 - x, y, H - 1 - y), vg = edge < 14 ? 0.55 + edge * 0.032 : 1, o = i * 4;
        var mr = (0.5 + 0.66 * kq) * vg, mg = (0.58 + 0.5 * kq) * vg, mb = (0.86 + 0.06 * kq) * vg;
        d[o] = Math.min(255, d[o] * mr); d[o + 1] = Math.min(255, d[o + 1] * mg); d[o + 2] = Math.min(255, d[o + 2] * mb);
      }
      gBase.putImageData(img, 0, 0);
    }

    /* ---------- hotspots, labels, region captions ---------- */
    var REGIONS = [
      { t: 'Great Canyon', u: [4.95, -1.65], w: 'canyon-view' }, { t: 'Aragain Falls', u: [6.0, -2.05], w: 'canyon-view' }, { t: 'Frigid River', u: [6.0, 0.15], w: 'end-of-rainbow' },
      { t: 'Forest', u: [-0.25, -1.9], w: 'forest-path' }, { t: 'Flood Control Dam #3', u: [6.5, 7.02], w: 'dam-lobby' },
      { t: 'The Reservoir', u: [3.6, 6.95], w: 'reservoir' }, { t: 'Great Underground Empire', u: [-0.9, 3.0], w: 'cellar' }
    ];
    var hotEls = {};
    function buildHot(vis, stubs) {
      hot.innerHTML = ''; hotEls = {};
      vis.forEach(function (id) {
        var r = rect(id), room = rooms[id], b = document.createElement('button');
        b.type = 'button'; b.className = 'hot' + (room.visited ? '' : ' dim') + (id === 'attic' ? ' side' : ''); b.dataset.id = id; b.setAttribute('aria-label', room.name);
        b.innerHTML = '<span class="ring"></span><span class="lab">' + room.name.replace(/&/g, '&amp;') + '</span>';
        b.addEventListener('click', function () { onSelect(id); });
        hot.appendChild(b); hotEls[id] = { el: b, r: r };
      });
      stubs.forEach(function (s) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hot q'; b.dataset.stub = s.id; b.textContent = s.locked ? 'x' : '?';
        b.title = s.dir + ' exit is unexplored' + (s.note ? ' (' + s.note + ')' : ''); b.addEventListener('click', function () { onSelect(s.id); });
        hot.appendChild(b); hotEls['q' + s.id + s.dir] = { el: b, q: s };
      });
      REGIONS.forEach(function (rg) {
        if (!rooms[rg.w] || rooms[rg.w].order > (built == null ? 1e9 : built)) return;
        var sp = document.createElement('span'); sp.className = 'reg'; sp.textContent = rg.t; hot.appendChild(sp); hotEls['r' + rg.t] = { el: sp, p: upt(rg.u) };
      });
      layoutHot();
    }
    function layoutHot() {
      cvBase.style.width = cvOver.style.width = W * zoom + 'px'; cvBase.style.height = cvOver.style.height = H * zoom + 'px';
      host.style.width = W * zoom + 'px'; host.style.height = H * zoom + 'px';
      host.style.setProperty('--wz', zoom); host.dataset.lo = zoom < 1.5 ? '1' : '';
      Object.keys(hotEls).forEach(function (k) {
        var h = hotEls[k], e = h.el;
        if (h.r) { e.style.left = h.r.x0 * zoom + 'px'; e.style.top = h.r.y0 * zoom + 'px'; e.style.width = CW * zoom + 'px'; e.style.height = CH * zoom + 'px'; }
        else if (h.q) { e.style.left = (h.q.x - 6) * zoom + 'px'; e.style.top = (h.q.y - 6) * zoom + 'px'; e.style.width = 12 * zoom + 'px'; e.style.height = 12 * zoom + 'px'; }
        else if (h.p) { e.style.left = h.p.x * zoom + 'px'; e.style.top = h.p.y * zoom + 'px'; }
      });
      markState();
    }
    function markState() {
      Object.keys(hotEls).forEach(function (k) { var h = hotEls[k]; if (h.r) { h.el.classList.toggle('sel', k === st.sel); h.el.classList.toggle('cur', k === st.cur); } });
    }

    /* ---------- animated overlay ---------- */
    var glow = Z.canvas(104, 104);
    (function () {
      var gi = glow.g.createImageData(104, 104), d = gi.data;
      for (var y = 0; y < 104; y++) for (var x = 0; x < 104; x++) {
        var dd = Math.sqrt((x - 52) * (x - 52) + (y - 52) * (y - 52)) / 50, a = dd >= 1 ? 0 : (1 - dd) * (1 - dd), on = a * 1.05 > BAYER[(y & 3) * 4 + (x & 3)] / 16, o = (y * 104 + x) * 4;
        d[o] = 255; d[o + 1] = 190; d[o + 2] = 80; d[o + 3] = on ? 255 : 0;
      }
      glow.g.putImageData(gi, 0, 0);
    })();
    function drawPlayer(g, x, y, bob) {
      var f = '#f0c9a0';
      R(g, c.ink, x - 4, y - 1 + bob, 9, 16); R(g, c.brownD, x - 3, y + bob, 7, 2); R(g, f, x - 2, y + 2 + bob, 5, 3); P(g, c.ink, x - 1, y + 3 + bob); P(g, c.ink, x + 1, y + 3 + bob);
      R(g, c.blueD, x - 3, y + 5 + bob, 7, 5); R(g, c.blue, x - 2, y + 5 + bob, 5, 1); R(g, c.brownD, x - 3, y + 8 + bob, 7, 1); R(g, c.brownD, x - 2, y + 10 + bob, 2, 3); R(g, c.brownD, x + 1, y + 10 + bob, 2, 3);
      R(g, c.ink, x + 4, y + 5 + bob, 4, 7); R(g, c.amber, x + 5, y + 7 + bob, 2, 4); P(g, c.goldL, x + 5, y + 8 + bob); R(g, c.brownD, x + 5, y + 5 + bob, 2, 1);
    }
    function drawThief(g, x, y, bob) {
      R(g, c.ink, x - 4, y - 1 + bob, 9, 14); R(g, '#2a2f45', x - 3, y + bob, 7, 12); R(g, c.ink, x - 3, y + 2 + bob, 7, 3); P(g, c.white, x - 2, y + 3 + bob); P(g, c.white, x + 1, y + 3 + bob);
      R(g, c.sandD, x + 4, y + 6 + bob, 5, 5); R(g, c.sand, x + 5, y + 7 + bob, 3, 3); R(g, c.red, x - 3, y + 8 + bob, 7, 1);
    }
    function frame() {
      if (!active) return; tick++; var g = gOver; g.clearRect(0, 0, W, H);
      dyn.water.forEach(function (w) { for (var i = 0; i < 6; i++) { var x = w.x0 + Math.floor(Math.random() * (w.x1 - w.x0)), y = w.y0 + Math.floor(Math.random() * (w.y1 - w.y0)); g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(140,196,240,0.8)'; g.fillRect(x, y, Math.random() > 0.6 ? 2 : 1, 1); } });
      dyn.twinkle.forEach(function (t, i) { var ph = (tick + i * 3) % 10; if (ph < 3) { var sx = t.x - 10 + ((i * 13 + tick) % 20), sy = t.y - 4 + (i * 7) % 10; g.fillStyle = '#fff6c9'; g.fillRect(sx, sy - 1, 1, 3); g.fillRect(sx - 1, sy, 3, 1); } });
      dyn.thief.forEach(function (t) { drawThief(g, t.x, t.y, tick % 2 ? 0 : -1); });
      var cur = st.cur && rooms[st.cur] && (built == null || rooms[st.cur].order <= built) ? rect(st.cur) : null;
      if (cur) {
        g.globalAlpha = 0.16 + 0.08 * Math.sin(tick / 2.2); g.globalCompositeOperation = 'lighter'; g.drawImage(glow.c, cur.cx - 52, cur.cy - 52); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        drawPlayer(g, cur.cx - 2, cur.cy - 6, tick % 4 < 2 ? 0 : -1);
      }
    }
    function play() { if (timer || reduce) { frame(); return; } timer = setInterval(frame, 150); frame(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    /* ---------- public ---------- */
    paintStaticFeatures();
    return {
      W: W, H: H,
      render: function (opt) {
        st.cur = opt.cur; st.sel = opt.sel;
        if (built !== opt.limit) { built = opt.limit; build(opt.limit); }
        else { markState(); }
        active = true; play();
      },
      rebuild: function (limit) { built = limit; build(limit); },
      setZoom: function (z) { zoom = z; layoutHot(); },
      getZoom: function () { return zoom; },
      pause: function () { active = false; stop(); },
      center: function (id, vp) {
        if (!rooms[id]) return; var m = ctr(id);
        vp.scrollTo({ left: Math.max(0, m.x * zoom - vp.clientWidth / 2), top: Math.max(0, m.y * zoom - vp.clientHeight / 2), behavior: reduce ? 'auto' : 'smooth' });
      },
      portrait: function (cv, id) {
        if (!rooms[id]) return; var m = ctr(id), sw = 96, sh = 64, sx = Math.max(0, Math.min(W - sw, m.x - sw / 2)), sy = Math.max(0, Math.min(H - sh, m.y - sh / 2));
        cv.width = sw; cv.height = sh; var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(cvBase, sx, sy, sw, sh, 0, 0, sw, sh);
        if (st.cur === id) drawPlayer(g, m.x - sx - 2, m.y - sy - 6, 0);
      }
    };
  }
  return { create: create, KIND: KIND, FLOOR: FLOOR };
})();
