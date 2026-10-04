// trace.js: turns a place's trace (living/traces/*.js) into what the game needs: a walk grid of 48 x 32 squares, the
// squares of each spot and exit, and a depth map that says, for every pixel of the painting, where the thing painted
// there meets the ground, so that anything standing north of it goes behind it. Defines window.Trace.
(function (root) {
  'use strict';
  const GW = 48, GH = 32;

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
  const onTrail = (T, x, y, pad) => T.trails.some(t => toLine(t.slice(1), x, y) < t[0] / 2 + (pad || 0));

  // the walk grid: rows of letters, as the game's maps are (g grass, G tallgrass, t trail, F woods and trees, L rock)
  function grid(T) {
    const sx = T.size[0] / GW, sy = T.size[1] / GH, M = [];
    for (let gy = 0; gy < GH; gy++) {
      const row = [];
      for (let gx = 0; gx < GW; gx++) {
        let solid = 0, rock = 0, tall = 0, trail = 0;
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
          const x = (gx + (i + 0.5) / 4) * sx, y = (gy + (j + 0.5) / 4) * sy;
          if (onTrail(T, x, y)) { trail++; continue; }
          const st = T.stand.find(s => !s.walk && inPoly(s.pts, x, y));
          if (st) { if (st.kind === 'rock') rock++; else solid++; continue; }
          if (T.ground.some(g => g[0] === 'G' && inPoly(g[1], x, y))) tall++;
        }
        let c = T.ground0 || 'g';
        if (trail >= 6) c = 't';
        else if (rock + solid >= 8) c = rock > solid ? 'L' : 'F';
        else if (tall >= 8) c = 'G';
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
          if (s.kind === 'woods' && onTrail(T, x, y, -4)) { D[Y * W + X] = 0; continue; }
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
    const exits = T.exits.map(e => { const [x, y] = tileOf(T, e[1], e[2]); return {to: e[0], x, y, dir: x === 0 ? 'left' : x === GW - 1 ? 'right' : y === 0 ? 'up' : 'down'}; });
    return {M, spots, exits, hub: tileOf(T, T.hub[0], T.hub[1]), tileOf: (x, y) => tileOf(T, x, y)};
  }

  root.Trace = {GW, GH, grid, depth, build, inPoly, toLine};
})(typeof window !== 'undefined' ? window : globalThis);
