// walker.js: walks a figure over a place's walk grid. three.js r128 (global THREE). Defines makeWalker(stage, figure).
//
// The grid is the place's trace (48 x 32 squares): trails are quickest, grass a little slower, tallgrass slower still;
// woods, trees and rock can't be walked. A path is found square by square, then pulled straight wherever the way is
// clear, so the figure walks in easy lines instead of zig-zags. walker.goTo(x, z, done) walks to a point (in metres) or
// the nearest open ground to it; walker.update(dt) every frame moves the figure and returns its speed (m/s) for its
// walk cycle; walker.stop(), walker.moving, walker.face(x, z).
(function (root) {
  'use strict';
  function makeWalker(S, fig, opts) {
    opts = opts || {};
    const T = S.trace, K = S.K, SN = S.SN, B = Trace.build(T), GW = Trace.GW, GH = Trace.GH;
    const TW = T.size[0] / GW / K, TD = T.size[1] / GH / (K * SN);        // a square's width and depth in metres
    const COST = {t: 1, g: 1.25, G: 1.7};
    const cost = (gx, gy) => (gx < 0 || gy < 0 || gx >= GW || gy >= GH) ? 0 : (COST[B.M[gy][gx]] || 0);
    const tileOf = (x, z) => [Math.floor(x / TW), Math.floor(z / TD)];
    const centre = (gx, gy) => new THREE.Vector3((gx + 0.5) * TW, 0, (gy + 0.5) * TD);
    function nearestOpen(gx, gy) {
      if (cost(gx, gy)) return [gx, gy];
      for (let r = 1; r < 12; r++) { let best = null, bd = 1e9; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r || !cost(gx + i, gy + j)) continue; const d = (i * TW) ** 2 + (j * TD) ** 2; if (d < bd) { bd = d; best = [gx + i, gy + j]; } } if (best) return best; }
      return null;
    }
    // the cheapest way over the squares, eight ways round (diagonals only where both sides are open)
    function route(a, b) {
      const N = GW * GH, dist = new Float64Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), H = [], s0 = a[1] * GW + a[0], t0 = b[1] * GW + b[0];
      const push = (i, d) => { H.push([d, i]); let j = H.length - 1; while (j > 0) { const p = (j - 1) >> 1; if (H[p][0] <= H[j][0]) break; [H[p], H[j]] = [H[j], H[p]]; j = p; } };
      const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let j = 0; for (;;) { const l = j * 2 + 1, r = l + 1; let m = j; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === j) break; [H[m], H[j]] = [H[j], H[m]]; j = m; } } return top; };
      const hx = i => Math.hypot((i % GW - b[0]) * TW, (((i / GW) | 0) - b[1]) * TD);
      dist[s0] = 0; push(s0, hx(s0));
      while (H.length) {
        const [, i] = pop(); if (i === t0) break; const x = i % GW, y = (i / GW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy, c = cost(nx, ny); if (!c) continue;
          if (dx && dy && (!cost(x + dx, y) || !cost(x, y + dy))) continue;
          const j = ny * GW + nx, d = dist[i] + c * Math.hypot(dx * TW, dy * TD);
          if (d < dist[j]) { dist[j] = d; prev[j] = i; push(j, d + hx(j)); }
        }
      }
      if (prev[t0] < 0 && s0 !== t0) return null;
      const P = []; for (let i = t0; i !== s0 && i >= 0; i = prev[i]) P.unshift([i % GW, (i / GW) | 0]);
      return P;
    }
    // can you walk straight from p to q without crossing anything solid?
    function clear(p, q) {
      const n = Math.ceil(p.distanceTo(q) / 0.15);
      for (let k = 1; k <= n; k++) { const x = p.x + (q.x - p.x) * k / n, z = p.z + (q.z - p.z) * k / n, t = tileOf(x, z); if (!cost(t[0], t[1])) return false; }
      return true;
    }
    const st = {path: [], done: null, speed: 0, want: 0, face: 0, run: false};
    const pos = fig.root.position;
    function goTo(x, z, done, o) {
      o = o || {};
      const a = nearestOpen(...tileOf(pos.x, pos.z)), b = nearestOpen(...tileOf(x, z)); if (!a || !b) return false;
      const sq = route(a, b); if (!sq) return false;
      let pts = sq.map(q => centre(q[0], q[1]));
      // end on the point itself if it is open ground, otherwise on the square's middle
      const end = new THREE.Vector3(x, 0, z), et = tileOf(x, z);
      if (cost(et[0], et[1]) && !o.toSquare) pts.push(end);
      // pull the path straight
      const out = []; let from = pos.clone(), i = 0;
      while (i < pts.length) { let j = pts.length - 1; while (j > i && !clear(from, pts[j])) j--; out.push(pts[j]); from = pts[j]; i = j + 1; }
      st.path = out; st.done = done || null; st.run = !!o.run; st.faceTo = o.faceTo || null;
      return true;
    }
    function update(dt) {
      let speed = 0;
      if (st.path.length) {
        const q = st.path[0], d = new THREE.Vector3(q.x - pos.x, 0, q.z - pos.z), L = d.length();
        const top = st.run ? 2.7 : 1.4, onTall = (() => { const t = tileOf(pos.x, pos.z); return cost(t[0], t[1]) > 1.5; })();
        st.want = Math.min(top * (onTall ? 0.75 : 1), 0.6 + L * 2.2);
        if (L < 0.04) { st.path.shift(); if (!st.path.length) { st.want = 0; st.speed = 0; const cb = st.done; st.done = null; if (st.faceTo) face(st.faceTo.x, st.faceTo.z); if (cb) cb(); } }
        else { d.normalize(); pos.addScaledVector(d, Math.min(L, st.speed * dt)); st.face = Math.atan2(d.x, d.z); }
      } else st.want = 0;
      st.speed += (st.want - st.speed) * Math.min(1, dt * 8); if (st.speed < 0.02) st.speed = 0;
      speed = st.speed;
      // turn smoothly toward where it is going
      let r = fig.root.rotation.y, diff = ((st.face - r + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      fig.root.rotation.y = r + diff * Math.min(1, dt * 10);
      return speed;
    }
    function face(x, z) { st.face = Math.atan2(x - pos.x, z - pos.z); }
    return {goTo, update, face, stop() { st.path = []; st.done = null; }, get moving() { return st.path.length > 0; }, grid: B, tileOf, open: (x, z) => { const t = tileOf(x, z); return !!cost(t[0], t[1]); }};
  }
  root.makeWalker = makeWalker;
})(typeof window !== 'undefined' ? window : globalThis);
