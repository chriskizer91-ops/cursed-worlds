// trace.js: turns a place's trace (living/traces/*.js) into what the game needs: a walk grid of 48 x 32 squares, the
// squares of each spot and exit, and a depth map that says, for every pixel of the painting, where the thing painted
// there meets the ground, so that anything standing north of it goes behind it. Defines window.Trace.
//
// A trace, in painting pixels (1536 x 1024):
//   stand:  things that stand up out of the ground: {id, kind, base, deep, pts, walk}. kind: woods, tree, rock, ledge,
//           bramble, brush or reeds (each blocks the way; walk: true for something you can walk under). base: the painting y
//           where it meets the ground, or 'col' for each column's lowest point (woods, bushes). deep: how far back a big
//           rock goes; its depth is taken at its middle, so things set on top of it show in front of it.
//   ground: kinds of ground over the place's own (ground0, 'g' grass unless said): [letter, points], later ones win.
//           G tallgrass, f leaf litter, s sand, m mud (all walkable); w river, o pond, c creek, k spring pool, L rock,
//           h brush, b bramble (none walkable).
//   trails: [width, point, point...], always walkable; {w, kind: 'H', pts} for a hidden path, closed until it is found.
//   hub, exits ([place, x, y, 'hidden'] where a trail leaves the painting), spots ({id: [[x, y], ...]}: where each of
//   the game's spots meets the ground), and for the camp its build sites, fire ring and pocket.
(function (root) {
  'use strict';
  const GW = 48, GH = 32;
  const STANDC = {woods: 'F', tree: 'F', reeds: 'F', rock: 'L', ledge: 'L', bramble: 'b', brush: 'h'};
  const WALK = 'gGtfsmH';                      // what can be walked on ('H' only once it is found)

  function inPoly(P, x, y) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  // distance from a point to a polyline
  function toLine(L, x, y) {
    let best = 1e9;
    for (let i = 1; i < L.length; i++) {
      const ax = L[i - 1][0], ay = L[i - 1][1], bx = L[i][0], by = L[i][1], dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return best;
  }
  // trails as {w, kind, pts}, whichever way they were written
  const trailsOf = T => (T.trails || []).map(t => Array.isArray(t) ? {w: t[0], kind: 't', pts: t.slice(1)} : {w: t.w, kind: t.kind || 't', pts: t.pts});
  const trailAt = (T, x, y, pad) => { for (const t of trailsOf(T)) if (toLine(t.pts, x, y) < t.w / 2 + (pad || 0)) return t; return null; };
  const onTrail = (T, x, y, pad) => !!trailAt(T, x, y, pad);

  // the walk grid: rows of letters, as the game's maps are
  function grid(T) {
    const sx = T.size[0] / GW, sy = T.size[1] / GH, M = [];
    for (let gy = 0; gy < GH; gy++) {
      const row = [];
      for (let gx = 0; gx < GW; gx++) {
        const n = {};
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
          const x = (gx + (i + 0.5) / 4) * sx, y = (gy + (j + 0.5) / 4) * sy;
          let c = null;
          const tr = trailAt(T, x, y);
          if (tr) c = tr.kind === 'H' ? 'H' : 't';
          else {
            const st = T.stand.find(s => !s.walk && inPoly(s.pts, x, y));
            if (st) c = STANDC[st.kind] || 'F';
            else for (const g of T.ground || []) if (inPoly(g[1], x, y)) c = g[0];
          }
          c = c || T.ground0 || 'g'; n[c] = (n[c] || 0) + 1;
        }
        // trails win at six of sixteen; anything else needs a clear majority, or the place's own ground stays
        let c = T.ground0 || 'g';
        if ((n.t || 0) + (n.H || 0) >= 6) c = (n.H || 0) > (n.t || 0) ? 'H' : 't';
        else { let best = 0; for (const k in n) if (n[k] > best) { best = n[k]; c = k; } if (best < 8 && WALK.indexOf(c) < 0) { let w = 0, wc = T.ground0 || 'g'; for (const k in n) if (WALK.indexOf(k) >= 0 && n[k] > w) { w = n[k]; wc = k; } if (w >= 8) c = wc; } }
        row.push(c);
      }
      M.push(row);
    }
    // the fire ring's stones: nobody walks through the fire
    if (T.ring) { const [x, y, rx, ry] = T.ring; for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const cx = (gx + 0.5) * sx, cy = (gy + 0.5) * sy; if (((cx - x) / rx) ** 2 + ((cy - y) / ry) ** 2 < 1) M[gy][gx] = 'r'; } }
    return M;
  }
  const tileOf = (T, x, y) => [Math.max(0, Math.min(GW - 1, Math.floor(x / T.size[0] * GW))), Math.max(0, Math.min(GH - 1, Math.floor(y / T.size[1] * GH)))];

  // the depth map, at half the painting's size: each pixel holds where its thing meets the ground (painting y / 4), or 0
  // for open ground. Later (more southern) things are drawn over earlier ones, so the front-most wins.
  function depth(T, scale) {
    scale = scale || 2;
    const W = Math.round(T.size[0] / scale), H = Math.round(T.size[1] / scale), D = new Uint8Array(W * H);
    const list = T.stand.map(s => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of s.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      return {s, x0, x1, y0, y1, b: s.base === 'col' ? y1 : s.base};
    }).sort((a, b) => a.b - b.b);
    for (const o of list) {
      const s = o.s, X0 = Math.max(0, Math.floor(o.x0 / scale)), X1 = Math.min(W - 1, Math.ceil(o.x1 / scale)), Y0 = Math.max(0, Math.floor(o.y0 / scale)), Y1 = Math.min(H - 1, Math.ceil(o.y1 / scale));
      for (let X = X0; X <= X1; X++) {
        const x = (X + 0.5) * scale;
        let colBase = 0;
        if (s.base === 'col') for (let Y = Y1; Y >= Y0; Y--) { if (inPoly(s.pts, x, (Y + 0.5) * scale)) { colBase = (Y + 1) * scale; break; } }
        for (let Y = Y0; Y <= Y1; Y++) {
          const y = (Y + 0.5) * scale;
          if (!inPoly(s.pts, x, y)) continue;
          if ((s.kind === 'woods' || s.kind === 'brush') && onTrail(T, x, y, -4)) { D[Y * W + X] = 0; continue; }
          const b = (s.base === 'col' ? colBase : s.base) - (s.deep || 0) / 2;
          D[Y * W + X] = Math.max(1, Math.min(255, Math.round(b / 4)));
        }
      }
    }
    return {W, H, D, scale};
  }

  function build(T) {
    const M = grid(T), spots = {};
    const tilesNear = (x, y, n) => { const [gx, gy] = tileOf(T, x, y), out = []; for (let j = 0; j < (n || 1); j++) for (let i = 0; i < (n || 1); i++) out.push([gx + i, gy + j]); return out; };
    for (const k in T.sites || {}) spots[k] = tilesNear(T.sites[k][0], T.sites[k][1]);
    if (T.ring) { spots.ring = []; for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) if (M[gy][gx] === 'r') spots.ring.push([gx, gy]); }
    if (T.pocket) spots.pocket = tilesNear(T.pocket[0] - 16, T.pocket[1] - 16, 2);
    for (const k in T.spots || {}) { const seen = {}; spots[k] = []; for (const p of T.spots[k]) { const t = tileOf(T, p[0], p[1]), key = t.join(','); if (!seen[key]) { seen[key] = 1; spots[k].push(t); } } }
    const exits = T.exits.map(e => { const [x, y] = tileOf(T, e[1], e[2]); return {to: e[0], x, y, hidden: e[3] === 'hidden', dir: x === 0 ? 'left' : x === GW - 1 ? 'right' : y === 0 ? 'up' : 'down'}; });
    return {M, spots, exits, hub: tileOf(T, T.hub[0], T.hub[1]), tileOf: (x, y) => tileOf(T, x, y)};
  }

  // what is wrong with a trace: exits off the edge or cut off from the middle, spots you can't get next to
  function check(T, need) {
    const B = build(T), M = B.M, out = [];
    const open = (x, y, hidden) => x >= 0 && y >= 0 && x < GW && y < GH && (WALK.indexOf(M[y][x]) >= 0) && (hidden || M[y][x] !== 'H');
    const reach = hidden => { const R = new Uint8Array(GW * GH), Q = [B.hub]; if (!open(B.hub[0], B.hub[1], hidden)) return R; R[B.hub[1] * GW + B.hub[0]] = 1; while (Q.length) { const [x, y] = Q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny, hidden) && !R[ny * GW + nx]) { R[ny * GW + nx] = 1; Q.push([nx, ny]); } } } return R; };
    const R0 = reach(false), R1 = reach(true);
    if (!open(B.hub[0], B.hub[1])) out.push('the hub is not on open ground');
    for (const e of B.exits) {
      if (!(e.x === 0 || e.y === 0 || e.x === GW - 1 || e.y === GH - 1)) out.push('the exit to ' + e.to + ' is not on the edge of the picture');
      if (!(e.hidden ? R1 : R0)[e.y * GW + e.x]) out.push('the exit to ' + e.to + ' (' + e.x + ',' + e.y + ') cannot be walked to from the hub');
    }
    for (const k of need || Object.keys(T.spots || {})) {
      const tiles = B.spots[k]; if (!tiles || !tiles.length) { out.push('spot ' + k + ' is missing'); continue; }
      const ok = tiles.some(([x, y]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => R0[(y + dy) * GW + x + dx] && y + dy >= 0 && y + dy < GH && x + dx >= 0 && x + dx < GW));
      if (!ok) out.push('spot ' + k + ' cannot be walked up to');
    }
    return out;
  }

  root.Trace = {GW, GH, WALK, grid, depth, build, check, inPoly, toLine, trailsOf};
})(typeof window !== 'undefined' ? window : globalThis);
