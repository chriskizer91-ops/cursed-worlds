// zebu-moves.js: how the skinned cattle of zebu-hd.js move. three.js r128 (global THREE). Defines makeZebuMoves(rig).
//
// Animated the way envoi animates its models (envoi-on-the-longest-night, 3d-model-main-characters/io/model/80-actions.js):
// every move is a table of keys (a channel's value at each key time), eased from key to key, with anticipation before
// it and overshoot and settling after; ears, tail, dewlap and hump hang on springs worked on 1/120-second steps, so they
// swing and flop after the body moves; and under everything the animal breathes, blinks, looks about, flicks its ears
// and swats its tail.
//
// What it can do:
//   states (mv.act): 'stand', 'graze' (head down in the grass, biting, tearing and chewing), 'lie' (lies down front knees
//     first, chews the cud) and 'sleep' (head round on its flank, eyes shut). It goes from one to another the way cattle
//     do, so act('stand') from asleep wakes up, then gets up back end first.
//   walking: mv.update(dt, t, {speed, turn}): speed in metres a second, a walk below 1.6 and a trot above, with the
//     feet kept in step with the ground; turn in radians a second, to lean and look into the turn.
//   moves (mv.play): 'moo', 'shake' (shakes the flies off his head), 'swat' (swings his head round at a fly on his flank
//     and whips his tail), 'paw' (paws the ground like a bull), 'toss' (hooks a horn), 'buck', 'hop' (the storybook's
//     happy hop, all squash and stretch), 'stretch' (and a yawn), 'lick' (licks his nose, as cattle do).
//   mv.lookAt(point or null, seconds): looks at a point (the camera, say) for a while.
//   mv.events: what just happened, for sound and dust: {type: 'moo' | 'snort' | 'step' | 'dust' | 'thump' | 'tear' |
//     'land', pos (a world position), ...}. Read them and empty the array each frame.
//
// rig (from zebu-hd.js): {B: bones by name, BW: their rest positions, R: the root, legLen: {front, hind}, dropK (how much
// lower the body sits on shorter legs), springs: [[bone, K, C, limit, tip]], blink(k), squash(s), style}.
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, ease = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => ease(cl((x - a) / (b - a), 0, 1));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- channels ----------
  // Body: by drop, bz forward, bx to its left (metres); bp pitch nose-down, br roll onto its right side, byaw turn.
  // sp/sy the spine's pitch (sagging) and bend; cp/cy the chest's. rb breathing (how far the ribs swell).
  // nx/ny/nz the neck's pitch (down), turn (to its left) and roll; n2x/n2y the upper neck's; hx/hy/hz the head's.
  // jw the jaw open, jy the jaw sideways (chewing); tg the tongue out, tgx the tongue's tip up (negative).
  // eLx.. eRz the ears; t0x the tail lifted, t0z swung to its left. bk the eyes shut. sq squash (+ stretch, - squash).
  // Legs: sh (shoulder, + swings the leg back), el (elbow), kn (knee, + folds the hoof back), ff (front fetlock), shz;
  // hi (hip, + back), st (stifle), hk (hock, - folds), hf (hind fetlock), hiz, hiy.
  const CH = ['by', 'bz', 'bx', 'bp', 'br', 'byaw', 'sp', 'sy', 'cp', 'cy', 'rb', 'nx', 'ny', 'nz', 'n2x', 'n2y', 'hx', 'hy', 'hz',
    'jw', 'jy', 'tg', 'tgx', 'eLx', 'eLy', 'eLz', 'eRx', 'eRy', 'eRz', 't0x', 't0z', 'bk', 'sq'];
  for (const n of ['L', 'R']) CH.push('sh' + n, 'el' + n, 'kn' + n, 'ff' + n, 'shz' + n, 'hi' + n, 'st' + n, 'hk' + n, 'hf' + n, 'hiz' + n, 'hiy' + n);
  const IX = {}; CH.forEach((k, i) => { IX[k] = i; });
  const NC = CH.length;
  const both = (o, k, v) => { o[k + 'L'] = v; o[k + 'R'] = v; return o; };

  // ---------- the held poses ----------
  // Lying down and getting up were solved for where the joints should rest (front knees and fetlocks on the ground,
  // hooves planted); see animal-3d-models/tools/solve-pose.mjs.
  const KNEEL = Object.assign({by: -0.17, bz: 0.02, bp: 0.27, nx: 0.05, hx: 0.12}, both({}, 'sh', -0.56), both({}, 'el', 0.23), both({}, 'kn', 1.62), both({}, 'ff', 0.25), both({}, 'hi', -0.34), both({}, 'st', 0.25), both({}, 'hk', -0.07));
  const LIE = {by: -0.47, br: 0.09, nx: -0.12, ny: 0.06, rb: 0.01, shL: -0.21, elL: -0.77, knL: 2.44, ffL: 0.5, shR: -0.16, elR: -0.86, knR: 2.56, ffR: 0.5,
    hiL: -0.46, stL: 0.35, hkL: -1.22, hfL: 0.3, hizL: 0.33, hiR: -0.4, stR: 0.55, hkR: -1.47, hfR: 0.3, hizR: -0.06, t0x: 0.25, t0z: 0.5};
  const POSES = {
    stand: {nx: -0.04},
    graze: {nx: 1.35, n2x: -0.1, hx: -0.85, by: -0.03, bp: 0.05, shL: -0.06, shR: 0.04},
    sniff: {nx: 0.85, hx: -0.35, by: -0.02, ny: 0.15},
    kneel: KNEEL,
    lie: LIE,
    // asleep: the head swung round to rest on his left flank, eyes shut
    sleep: Object.assign({}, LIE, {nx: 0.42, ny: 1.05, n2y: 0.55, n2x: 0.25, hy: 0.45, hx: 0.35, hz: -0.35, rb: 0, bk: 1}),
    // getting up: a heave forward, the back end up, then a front leg out and up
    heave: Object.assign({}, LIE, {nx: 0.45, hx: 0.2, bz: 0.06, bp: 0.06}),
    rumpUp: Object.assign({}, KNEEL, {nx: -0.05, hx: 0}),
    frontStep: Object.assign({}, KNEEL, {by: -0.09, bp: 0.13, nx: -0.15, shR: -0.45, elR: 0.1, knR: 0.35, ffR: 0.1, knL: 1.2})
  };
  const SEQ = {
    down: [[0, 'stand'], [0.8, 'sniff'], [1.75, 'kneel', 'thump', 'front'], [3.0, 'lie', 'thump', 'hind'], [3.4, 'lie']],
    up: [[0, 'lie'], [0.55, 'heave'], [1.45, 'rumpUp', 'thump', 'hind'], [2.2, 'frontStep'], [2.9, 'stand', 'thump', 'front']]
  };

  // ---------- the moves ----------
  // t: key times (0 to 1 of dur), then a value per key for each channel moved; added on top of what the animal is
  // doing. at: the states it can do it in. ev: [time, event, detail].
  const MOVES = {
    moo: {dur: 2.6, at: ['stand', 'graze', 'lie'], neck: 1,
      t: [0, 0.12, 0.24, 0.34, 0.5, 0.72, 0.86, 1],
      nx: [0, 0.14, 0.18, -0.26, -0.3, -0.28, -0.05, 0], n2x: [0, 0, 0, 0.12, 0.14, 0.12, 0.02, 0],
      hx: [0, 0.12, 0.16, -0.5, -0.56, -0.5, -0.08, 0], jw: [0, 0, 0, 0.16, 0.26, 0.22, 0.03, 0],
      by: [0, -0.015, -0.02, 0.01, 0.012, 0.01, 0, 0], bz: [0, -0.02, -0.03, 0.03, 0.035, 0.03, 0, 0],
      rb: [0, 0.025, 0.04, 0.03, 0.005, -0.02, -0.005, 0],
      eLx: [0, 0, -0.05, 0.3, 0.35, 0.3, 0.05, 0], eRx: [0, 0, -0.05, 0.3, 0.35, 0.3, 0.05, 0],
      t0x: [0, 0, 0, 0.22, 0.28, 0.22, 0.05, 0], sq: [0, -0.05, -0.07, 0.06, 0.05, 0.05, -0.015, 0],
      bk: [0, 0, 0.2, 0.35, 0.4, 0.35, 0.1, 0],
      ev: [[0.3, 'moo', {dur: 1.45}]]},
    shake: {dur: 1.3, at: ['stand', 'graze', 'lie'], neck: 1,
      t: [0, 0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.85, 1],
      hy: [0, 0.15, -0.42, 0.45, -0.4, 0.3, -0.15, 0.05, 0], hz: [0, 0.1, -0.32, 0.35, -0.3, 0.22, -0.1, 0.03, 0],
      ny: [0, 0.05, -0.15, 0.16, -0.14, 0.1, -0.05, 0, 0], nx: [0, 0.1, 0.12, 0.12, 0.12, 0.1, 0.05, 0, 0],
      bk: [0, 0.6, 0.85, 0.85, 0.85, 0.6, 0.2, 0, 0], sq: [0, -0.03, 0.02, -0.02, 0.02, -0.01, 0.01, 0, 0],
      ev: [[0.05, 'snort']]},
    swat: {dur: 2.3, at: ['stand', 'lie'], neck: 1,
      t: [0, 0.15, 0.3, 0.45, 0.6, 0.78, 1],
      ny: [0, 0.5, 0.95, 1.0, 0.9, 0.35, 0], n2y: [0, 0.2, 0.4, 0.45, 0.4, 0.15, 0], hy: [0, 0.2, 0.45, 0.5, 0.4, 0.15, 0],
      nx: [0, 0.1, 0.25, 0.3, 0.25, 0.1, 0], hx: [0, 0.1, 0.2, 0.25, 0.2, 0.05, 0], hz: [0, -0.1, -0.25, -0.3, -0.2, -0.05, 0],
      sy: [0, 0.06, 0.12, 0.13, 0.12, 0.05, 0], br: [0, 0.015, 0.025, 0.025, 0.02, 0, 0],
      t0z: [0, 0.25, 0.95, -0.55, 0.85, 0.15, 0], t0x: [0, 0.2, 0.4, 0.3, 0.35, 0.1, 0],
      stL: [0, 0, 0, 0.45, 0, 0, 0], hkL: [0, 0, 0, -0.85, 0, 0, 0], hfL: [0, 0, 0, 0.55, 0, 0, 0], hiL: [0, 0, 0, -0.12, 0, 0, 0],
      ev: [[0.62, 'thump', 'hfL']]},
    paw: {dur: 3.0, at: ['stand'], neck: 1,
      t: [0, 0.1, 0.2, 0.3, 0.38, 0.48, 0.56, 0.66, 0.76, 0.9, 1],
      nx: [0, 0.3, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.4, 0.15, 0], hx: [0, 0.1, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.1, 0.05, 0],
      ny: [0, 0.05, 0.1, 0.1, 0.1, 0.1, 0.08, 0.05, 0.03, 0, 0],
      shR: [0, 0, -0.42, 0.3, -0.42, 0.32, -0.08, 0, 0, 0, 0], elR: [0, 0, 0.15, 0, 0.15, 0, 0, 0, 0, 0, 0],
      knR: [0, 0.2, 1.3, 0.08, 1.3, 0.08, 0.3, 0, 0, 0, 0], ffR: [0, 0.1, 0.6, 0.25, 0.6, 0.25, 0.1, 0, 0, 0, 0],
      br: [0, -0.02, -0.035, -0.03, -0.035, -0.03, -0.02, 0, 0, 0, 0], bp: [0, 0.02, 0.04, 0.04, 0.04, 0.04, 0.03, 0.02, 0.01, 0, 0],
      t0x: [0, 0.2, 0.3, 0.35, 0.3, 0.35, 0.3, 0.2, 0.1, 0.05, 0], t0z: [0, 0.2, -0.2, 0.25, -0.2, 0.2, -0.1, 0.05, 0, 0, 0],
      eLx: [0, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3, 0.2, 0.1, 0, 0], eRx: [0, 0.2, 0.3, 0.3, 0.3, 0.3, 0.3, 0.2, 0.1, 0, 0],
      ev: [[0.29, 'dust', 'ffR'], [0.47, 'dust', 'ffR'], [0.6, 'snort'], [0.74, 'snort']]},
    toss: {dur: 1.4, at: ['stand'], neck: 1,
      t: [0, 0.18, 0.3, 0.45, 0.6, 0.8, 1],
      nx: [0, 0.35, 0.4, -0.1, -0.15, 0, 0], hx: [0, 0.2, 0.25, -0.25, -0.3, -0.05, 0],
      hz: [0, 0.1, 0.15, -0.45, -0.4, -0.1, 0], hy: [0, 0.15, 0.2, -0.3, -0.25, -0.05, 0], ny: [0, 0.1, 0.1, -0.15, -0.12, 0, 0],
      bz: [0, -0.03, -0.04, 0.05, 0.04, 0, 0], by: [0, -0.03, -0.035, 0.02, 0.01, 0, 0],
      shL: [0, -0.1, -0.12, 0.05, 0.05, 0, 0], shR: [0, -0.1, -0.12, 0.05, 0.05, 0, 0], sq: [0, -0.08, -0.1, 0.08, 0.04, 0, 0],
      ev: [[0.42, 'snort']]},
    buck: {dur: 1.5, at: ['stand'], neck: 1,
      t: [0, 0.15, 0.28, 0.38, 0.5, 0.65, 0.8, 1],
      bp: [0, -0.06, -0.08, 0.3, 0.26, 0.05, -0.02, 0], by: [0, -0.04, -0.05, 0.05, 0.04, 0, -0.01, 0], bz: [0, -0.03, -0.04, 0.1, 0.08, 0.02, 0, 0],
      hiL: [0, -0.15, -0.25, 0.8, 0.7, 0.1, 0, 0], hiR: [0, -0.15, -0.25, 0.75, 0.68, 0.1, 0, 0],
      stL: [0, 0.3, 0.5, -0.2, -0.1, 0.1, 0, 0], stR: [0, 0.3, 0.5, -0.2, -0.1, 0.1, 0, 0],
      hkL: [0, -0.6, -0.9, 0.2, 0.1, -0.2, 0, 0], hkR: [0, -0.6, -0.9, 0.2, 0.1, -0.2, 0, 0],
      hfL: [0, 0.3, 0.5, 0.1, 0.1, 0.2, 0, 0], hfR: [0, 0.3, 0.5, 0.1, 0.1, 0.2, 0, 0],
      shL: [0, -0.1, -0.15, 0.15, 0.12, 0, 0, 0], shR: [0, -0.1, -0.15, 0.15, 0.12, 0, 0, 0],
      nx: [0, -0.1, -0.15, 0.35, 0.3, 0.05, 0, 0], t0x: [0, 0.3, 0.5, 1.0, 0.9, 0.3, 0.1, 0], sq: [0, -0.06, -0.08, 0.06, 0.04, -0.04, 0.01, 0],
      ev: [[0.64, 'thump', 'hfL'], [0.65, 'dust', 'hfL'], [0.66, 'dust', 'hfR'], [0.25, 'snort']]},
    hop: {dur: 1.15, at: ['stand'], neck: 1,
      t: [0, 0.15, 0.25, 0.38, 0.5, 0.62, 0.72, 0.85, 1],
      sq: [0, -0.12, -0.16, 0.15, 0.06, -0.02, -0.15, 0.04, 0], by: [0, -0.04, -0.06, 0.18, 0.32, 0.18, -0.05, 0.01, 0],
      knL: [0, 0.2, 0.3, 0.2, 0.9, 0.4, 0.2, 0, 0], knR: [0, 0.2, 0.3, 0.2, 0.9, 0.4, 0.2, 0, 0],
      shL: [0, 0.1, 0.15, -0.2, -0.35, -0.1, 0.05, 0, 0], shR: [0, 0.1, 0.15, -0.2, -0.35, -0.1, 0.05, 0, 0],
      hiL: [0, -0.1, -0.15, 0.2, 0.35, 0.1, -0.05, 0, 0], hiR: [0, -0.1, -0.15, 0.2, 0.35, 0.1, -0.05, 0, 0],
      hkL: [0, -0.2, -0.3, -0.1, -0.7, -0.3, -0.2, 0, 0], hkR: [0, -0.2, -0.3, -0.1, -0.7, -0.3, -0.2, 0, 0],
      nx: [0, 0.1, 0.15, -0.2, -0.25, -0.1, 0.15, 0, 0], hx: [0, 0.05, 0.08, -0.15, -0.2, -0.05, 0.1, 0, 0],
      t0x: [0, 0, 0, 0.5, 0.8, 0.5, 0.2, 0, 0], bk: [0, 0.3, 0.5, 0, 0, 0, 0.6, 0, 0],
      ev: [[0.71, 'land'], [0.72, 'dust', 'ffL'], [0.72, 'dust', 'hfR']]},
    stretch: {dur: 3.0, at: ['stand'], neck: 1,
      t: [0, 0.15, 0.35, 0.5, 0.62, 0.75, 0.88, 1],
      shL: [0, -0.15, -0.35, -0.35, -0.1, 0, 0, 0], shR: [0, -0.15, -0.35, -0.35, -0.1, 0, 0, 0],
      bz: [0, -0.04, -0.1, -0.1, -0.03, 0, 0, 0], bp: [0, 0.03, 0.08, 0.08, 0.02, 0, 0, 0], sp: [0, 0.03, 0.08, 0.08, 0.02, 0, 0, 0],
      nx: [0, -0.1, -0.25, -0.25, -0.05, 0, 0, 0], hx: [0, -0.1, -0.35, -0.35, -0.05, 0, 0, 0], jw: [0, 0, 0.22, 0.3, 0.02, 0, 0, 0],
      hiL: [0, 0, 0, 0, 0.3, 0.55, 0.2, 0], stL: [0, 0, 0, 0, -0.2, -0.4, -0.1, 0], hkL: [0, 0, 0, 0, 0.3, 0.6, 0.15, 0],
      bk: [0, 0, 0.7, 0.95, 0.1, 0, 0, 0], eLx: [0, 0, 0.35, 0.4, 0, 0, 0, 0], eRx: [0, 0, 0.35, 0.4, 0, 0, 0, 0], sq: [0, 0.02, 0.06, 0.06, 0, 0, 0, 0]},
    lick: {dur: 1.9, at: ['stand', 'graze', 'lie'], neck: 0.6,
      t: [0, 0.15, 0.3, 0.45, 0.6, 0.78, 1],
      jw: [0, 0.08, 0.12, 0.1, 0.12, 0.04, 0], tg: [0, 0.35, 1, 1, 0.9, 0.3, 0], tgx: [0, 0, -0.55, -0.95, -0.65, -0.2, 0],
      jy: [0, 0, 0.02, -0.03, 0.03, 0, 0], hz: [0, 0.05, 0.1, 0.12, 0.08, 0.02, 0], hx: [0, -0.03, -0.06, -0.08, -0.05, 0, 0],
      bk: [0, 0, 0.3, 0.5, 0.3, 0, 0]}
  };
  // a curve through the keys, eased from each key to the next (as envoi's kf)
  function kf(u, ts, vs) {
    if (u <= ts[0]) return vs[0];
    for (let i = 0; i < ts.length - 1; i++) if (u <= ts[i + 1]) { const f = (u - ts[i]) / (ts[i + 1] - ts[i]); return vs[i] + (vs[i + 1] - vs[i]) * ease(f); }
    return vs[vs.length - 1];
  }
  const pose = (o, k) => { const a = new Float32Array(NC); for (const n in o) if (n in IX) a[IX[n]] = o[n]; if (k != null) { a[IX.by] *= k; a[IX.bz] *= k; } return a; };

  function makeZebuMoves(rig) {
    const Bn = rig.B, BW = rig.BW, R = rig.R, dropK = rig.dropK || 1;
    const P = {}; for (const k in POSES) P[k] = pose(Object.assign({}, POSES[k], (rig.poses || {})[k] || {}), dropK);
    const cur = P.stand.slice(), out = new Float32Array(NC), add = new Float32Array(NC);
    const st = {
      state: 'stand', want: 'stand', seq: null, seqT: 0, seqName: '', blend: null, queue: [], active: [],
      walkW: 0, trotW: 0, phase: 0, speed: 0, turn: 0, prevLegPh: [0, 0, 0, 0],
      blinkT: 2, blinkU: -1, blink2: false, flick: [{t: 3, k: 0, s: 1}, {t: 5, k: 0, s: 1}], tailT: 5, tailK: 0, tailDir: 1,
      look: {yaw: 0, pitch: 0, vy: 0, vp: 0, ty: 0, tp: 0, timer: 2, target: null, hold: 0, w: 0},
      shift: {br: 0, bx: 0, tbr: 0, tbx: 0, timer: 6}, chew: {on: 0, timer: 8}, graze: {c: 0, T: 4, side: 1}, breath: 0
    };
    const events = [];
    const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), m1 = new THREE.Matrix4(), E = new THREE.Euler();
    const hoofBone = {fL: 'ffL', fR: 'ffR', hL: 'hfL', hR: 'hfR', ffL: 'ffL', ffR: 'ffR', hfL: 'hfL', hfR: 'hfR', front: 'ffL', hind: 'hfL'};
    function emit(type, detail) {
      const e = {type, pos: new THREE.Vector3()};
      if (typeof detail === 'string' && hoofBone[detail]) { Bn[hoofBone[detail]].getWorldPosition(e.pos); e.pos.y = Math.max(0, e.pos.y - 0.1 * R.scale.y); e.foot = detail; }
      else { Bn.head.getWorldPosition(e.pos); if (detail && typeof detail === 'object') Object.assign(e, detail); }
      if (detail === 'front' || detail === 'hind') { const a = new THREE.Vector3(), b = new THREE.Vector3(); Bn[detail === 'front' ? 'ffL' : 'hfL'].getWorldPosition(a); Bn[detail === 'front' ? 'ffR' : 'hfR'].getWorldPosition(b); e.pos.copy(a).add(b).multiplyScalar(0.5); e.pos.y = 0; }
      events.push(e);
    }

    // ---------- states ----------
    function startSeq(name) { st.seq = SEQ[name]; st.seqName = name; st.seqT = 0; st.fired = 0; st.state = name === 'down' ? 'lying-down' : 'getting-up'; }
    function blendTo(name, dur) { st.blend = {from: cur.slice(), to: name, t: 0, dur}; }
    // where it is going; it works its way there one step at a time
    function act(name) {
      if (name === 'eat') name = 'graze';
      if (!P[name] && name !== 'lie') return;
      st.want = name; st.queue = st.queue.filter(m => MOVES[m].at.includes(name) || name === 'stand');
    }
    function stepState() {
      if (st.seq || st.blend) return;
      const s = st.state, w = st.want;
      if (s === w) return;
      // from standing it first comes to a stop: grazing or lying down waits until it has stopped walking
      if (s === 'stand') { if (st.speed > 0.04) return; if (w === 'graze') { st.state = 'graze'; blendTo('graze', 0.9); } else if (w === 'lie' || w === 'sleep') startSeq('down'); }
      else if (s === 'graze') { st.state = 'stand'; blendTo('stand', 0.8); }
      else if (s === 'lie') { if (w === 'sleep') { st.state = 'sleep'; blendTo('sleep', 1.8); } else startSeq('up'); }
      else if (s === 'sleep') { st.state = 'lie'; blendTo('lie', 1.2); }
    }
    function evalStates(dt) {
      if (st.seq) {
        st.seqT += dt; const S = st.seq, end = S[S.length - 1][0];
        let i = 0; while (i < S.length - 2 && st.seqT > S[i + 1][0]) i++;
        const [t0, a] = S[i], [t1, b] = S[i + 1], k = ease(cl((st.seqT - t0) / (t1 - t0), 0, 1));
        for (let c = 0; c < NC; c++) cur[c] = lerp(P[a][c], P[b][c], k);
        for (let j = 1; j < S.length; j++) if (S[j][2] && st.seqT >= S[j][0] - 0.12 && !(st.fired & (1 << j))) { st.fired |= 1 << j; emit(S[j][2], S[j][3]); if (S[j][2] === 'thump') emit('dust', S[j][3]); }
        if (st.seqT >= end) { st.state = st.seqName === 'down' ? 'lie' : 'stand'; st.seq = null; cur.set(P[st.state]); }
        return;
      }
      if (st.blend) {
        const b = st.blend; b.t += dt; const k = ease(cl(b.t / b.dur, 0, 1));
        for (let c = 0; c < NC; c++) cur[c] = lerp(b.from[c], P[b.to][c], k);
        if (b.t >= b.dur) st.blend = null;
        return;
      }
      const tp = P[st.state] || P.stand, k = 1 - Math.exp(-dt * 4);
      for (let c = 0; c < NC; c++) cur[c] += (tp[c] - cur[c]) * k;
    }

    // ---------- moves ----------
    function play(name) {
      const m = MOVES[name]; if (!m) return false;
      if (!m.at.includes(st.state) || st.seq || st.blend) {
        // get to where the move can be done first (it stands up for a paw, say), then do it
        if (!m.at.includes(st.want)) act(m.at.includes('stand') ? 'stand' : m.at[0]);
        if (!st.queue.includes(name)) st.queue.push(name);
        return true;
      }
      for (const a of st.active) if (a.m.neck && m.neck) a.fade = Math.min(a.fade, 0.25);
      st.active.push({name, m, t: 0, fade: 1e9, fired: 0});
      return true;
    }
    function evalMoves(dt) {
      add.fill(0);
      if (st.queue.length && !st.seq && !st.blend) { const n = st.queue[0]; if (MOVES[n].at.includes(st.state)) { st.queue.shift(); play(n); } }
      let neck = 0;
      for (const a of st.active) {
        a.t += dt; const m = a.m, u = cl(a.t / m.dur, 0, 1);
        let w = 1; if (a.fade < 1e8) { a.fade -= dt; w = cl(a.fade / 0.25, 0, 1); }
        for (const k in m) { const i = IX[k]; if (i != null && Array.isArray(m[k])) add[i] += kf(u, m.t, m[k]) * w; }
        if (m.ev) m.ev.forEach((e, j) => { if (u >= e[0] && !(a.fired & (1 << j))) { a.fired |= 1 << j; emit(e[1], e[2]); } });
        neck = Math.max(neck, (m.neck || 0) * w * Math.sin(PI * cl(u * 1.15, 0, 1)));
      }
      st.active = st.active.filter(a => a.t < a.m.dur && a.fade > 0);
      return neck;
    }

    // ---------- walking and trotting ----------
    // A walk is four beats (left hind, left fore, right hind, right fore), each foot down 64% of the time; a trot is the
    // diagonal pairs together, each foot down 42% of the time, with a moment in the air between. The stride matches the
    // speed, so the feet keep pace with the ground.
    const GAIT = {walk: {A: 0.3, duty: 0.64, off: [0.25, 0.75, 0, 0.5]}, trot: {A: 0.42, duty: 0.42, off: [0, 0.5, 0.5, 0]}};
    for (const g of Object.values(GAIT)) g.stride = 2 * rig.legLen.front * Math.sin(g.A) / g.duty;
    function legCycle(p, g, front) {
      const A = g.A, duty = g.duty;
      if (p < duty) { const s = p / duty; return [lerp(-A, A, s), 0, 0, front ? sstep(0.75, 1, s) * 0.18 : sstep(0.75, 1, s) * 0.15]; }
      const s = (p - duty) / (1 - duty), up = Math.sin(PI * s), up2 = Math.sin(PI * Math.pow(s, 0.8));
      return [lerp(A, -A * 1.06, ease(s)), up, up2, 0];
    }
    function locomotion(dt, o) {
      const sp = st.speed, canWalk = st.state === 'stand' && !st.seq && !st.blend;
      const wantTrot = canWalk && sp > 1.6 ? 1 : 0, wantWalk = canWalk && sp > 0.04 ? 1 - wantTrot : 0;
      st.walkW += (wantWalk - st.walkW) * Math.min(1, dt * 5); st.trotW += (wantTrot - st.trotW) * Math.min(1, dt * 4);
      const lw = st.walkW + st.trotW; if (lw < 0.002) { st.phase = 0; return 0; }
      const stride = lerp(GAIT.walk.stride, GAIT.trot.stride, st.trotW / Math.max(1e-4, lw));
      st.phase = (st.phase + dt * Math.max(0.35, sp) / stride) % 1;
      const legs = [['L', true], ['R', true], ['L', false], ['R', false]];
      legs.forEach(([n, front], i) => {
        for (const [gname, gw] of [['walk', st.walkW], ['trot', st.trotW]]) {
          if (gw < 0.001) continue;
          const g = GAIT[gname], lp = (st.phase + g.off[i]) % 1, [a, up, up2, roll] = legCycle(lp, g, front), k = gw * (gname === 'trot' ? 1.15 : 1);
          if (front) { o[IX['sh' + n]] += a * gw; o[IX['el' + n]] += 0.2 * up * k; o[IX['kn' + n]] += 1.25 * up2 * k; o[IX['ff' + n]] += (0.75 * up * up + roll) * k; }
          else { o[IX['hi' + n]] += a * gw; o[IX['st' + n]] += 0.38 * up * k; o[IX['hk' + n]] += -0.95 * up2 * k; o[IX['hf' + n]] += (0.8 * up * up + roll) * k; }
          // a foot coming down
          if (gw > 0.5) { const prev = st.prevLegPh[i]; if (prev > 0.9 && lp < 0.1) emit('step', (front ? 'f' : 'h') + n); st.prevLegPh[i] = lp; }
        }
      });
      const ph = st.phase * TAU;
      o[IX.by] += (-0.012 * Math.cos(ph * 2) * st.walkW) + (0.03 * Math.abs(Math.sin(ph)) - 0.02) * st.trotW;
      o[IX.br] += 0.022 * Math.sin(ph) * st.walkW + 0.01 * Math.sin(ph) * st.trotW;
      o[IX.bp] += 0.008 * Math.sin(ph * 2) * lw;
      o[IX.nx] += (0.05 * Math.sin(ph * 2 + 0.6) + 0.06) * st.walkW - 0.14 * st.trotW;
      o[IX.hx] += 0.03 * Math.sin(ph * 2 + 1.1) * st.walkW - 0.08 * st.trotW;
      o[IX.t0z] += 0.08 * Math.sin(ph) * lw; o[IX.t0x] += 0.22 * st.trotW;
      o[IX.eLx] += 0.15 * st.trotW; o[IX.eRx] += 0.15 * st.trotW;
      // leaning and looking into a turn
      const tn = cl(st.turn, -1.5, 1.5);
      o[IX.br] += -tn * Math.min(1, sp) * 0.05; o[IX.ny] += tn * 0.22 * lw; o[IX.sy] += tn * 0.05 * lw; o[IX.hy] += tn * 0.1 * lw;
      return lw;
    }

    // ---------- living: breath, weight, look, ears, tail, blink, chewing, grazing ----------
    function idle(dt, t, o, busyNeck, lw) {
      const s = st.state, lying = s === 'lie' || s === 'sleep' || s === 'lying-down' || s === 'getting-up', asleep = s === 'sleep';
      // breathing: slower and deeper lying down, slowest asleep
      st.breath += dt * (asleep ? 0.2 : lying ? 0.3 : 0.24) * TAU * (1 + lw * 0.8);
      o[IX.rb] += Math.sin(st.breath) * (asleep ? 0.03 : lying ? 0.022 : 0.014) * (1 + lw);
      // standing about, the weight shifts from side to side
      const sh = st.shift; sh.timer -= dt;
      if (sh.timer < 0) { sh.timer = rnd(5, 11); sh.tbr = rnd(-0.025, 0.025); sh.tbx = rnd(-0.015, 0.015); }
      const kk = Math.min(1, dt * 0.8); sh.br += (sh.tbr - sh.br) * kk; sh.bx += (sh.tbx - sh.bx) * kk;
      if (s === 'stand' || s === 'graze') { o[IX.br] += sh.br * (1 - lw); o[IX.bx] += sh.bx * (1 - lw); o[IX[sh.br > 0 ? 'ffR' : 'ffL']] += Math.abs(sh.br) * 4 * (1 - lw); }
      // looking about, or at something
      const L = st.look; L.timer -= dt;
      if (L.target && L.hold > 0) {
        L.hold -= dt; if (L.hold <= 0) L.target = null;
        if (L.target) {
          Bn.chest.updateWorldMatrix(true, false); m1.copy(Bn.chest.matrixWorld).invert(); v1.copy(L.target).applyMatrix4(m1);
          v2.copy(BW.head).sub(BW.chest);
          const dx = v1.x - v2.x, dy = v1.y - v2.y, dz = v1.z - v2.z;
          L.ty = cl(Math.atan2(dx, dz), -1.1, 1.1); L.tp = cl(-Math.atan2(dy, Math.hypot(dx, dz)), -0.5, 0.6);
          if (dz < -0.2) L.ty = Math.sign(dx || 1) * 1.1;
        }
      } else if (L.timer < 0) {
        L.timer = rnd(2.5, 7);
        const r = Math.random();
        if (asleep) { L.ty = 0; L.tp = 0; } else if (r < 0.35) { L.ty = 0; L.tp = 0; } else { L.ty = rnd(-0.75, 0.75) * (lying ? 0.7 : 1); L.tp = rnd(-0.2, 0.18); }
      }
      const lookOn = (asleep || st.seq ? 0 : 1) * (1 - busyNeck) * (s === 'graze' ? 0.35 : 1) * (1 - lw * 0.6);
      L.w += (lookOn - L.w) * Math.min(1, dt * 3);
      const K = 22, C = 8.5; L.vy += (K * (L.ty - L.yaw) - C * L.vy) * dt; L.yaw += L.vy * dt; L.vp += (K * (L.tp - L.pitch) - C * L.vp) * dt; L.pitch += L.vp * dt;
      o[IX.ny] += L.yaw * 0.5 * L.w; o[IX.n2y] += L.yaw * 0.2 * L.w; o[IX.hy] += L.yaw * 0.3 * L.w;
      o[IX.nx] += L.pitch * 0.35 * L.w; o[IX.hx] += L.pitch * 0.65 * L.w; o[IX.hz] += -L.yaw * 0.12 * L.w;
      // ears flick at flies now and then, each on its own
      st.flick.forEach((f, i) => {
        f.t -= dt; if (f.t < 0) { f.t = rnd(2, 7.5) * (asleep ? 2 : 1); f.k = 1; f.s = Math.random() < 0.7 ? 1 : -1; }
        f.k = Math.max(0, f.k - dt * 3.2); const a = Math.sin(f.k * PI) * 0.55 * f.s;
        o[IX[i ? 'eRx' : 'eLx']] += a * 0.6; o[IX[i ? 'eRz' : 'eLz']] += (i ? -a : a) * 0.5;
      });
      // the tail swats
      st.tailT -= dt; if (st.tailT < 0) { st.tailT = rnd(3.5, 10) * (asleep ? 2 : 1); st.tailK = 1; st.tailDir = Math.random() < 0.5 ? 1 : -1; }
      st.tailK = Math.max(0, st.tailK - dt * 0.85);
      if (st.tailK > 0) { const u = 1 - st.tailK; o[IX.t0z] += Math.sin(u * TAU * 1.5) * 0.55 * Math.sin(PI * u) * st.tailDir; o[IX.t0x] += 0.15 * Math.sin(PI * u); }
      o[IX.t0z] += Math.sin(t * 0.9) * 0.05;
      // blinking (twice, sometimes)
      st.blinkT -= dt;
      if (st.blinkT < 0 && st.blinkU < 0) { st.blinkU = 0; st.blink2 = Math.random() < 0.2; st.blinkT = rnd(2, 5.5); }
      let bk = 0;
      if (st.blinkU >= 0) { st.blinkU += dt / 0.17; bk = Math.sin(PI * cl(st.blinkU, 0, 1)); if (st.blinkU >= 1) { if (st.blink2) { st.blink2 = false; st.blinkU = -0.35; } else st.blinkU = -1; } }
      if (st.blinkU < -0.01 && st.blinkU > -0.5) { st.blinkU += dt / 0.17; if (st.blinkU >= -0.01) st.blinkU = 0; }
      o[IX.bk] = Math.max(o[IX.bk], bk);
      // chewing: the cud lying down and now and then standing; grass when grazing
      if (s === 'graze' && !st.blend) {
        const g = st.graze; g.c += dt; if (g.c > g.T) { g.c = 0; g.T = rnd(3.6, 5.2); g.side = Math.random() < 0.5 ? 1 : -1; }
        const u = g.c / g.T;
        const bite = sstep(0.0, 0.08, u) * (1 - sstep(0.1, 0.16, u)), tear = sstep(0.16, 0.22, u) * (1 - sstep(0.26, 0.36, u));
        o[IX.nx] += 0.06 * bite - 0.05 * tear; o[IX.hx] += 0.05 * bite - 0.14 * tear; o[IX.hy] += 0.1 * tear * g.side; o[IX.hz] += 0.06 * tear * g.side;
        o[IX.jw] += 0.07 * bite;
        if (u > 0.16 && !g.torn) { g.torn = true; emit('tear'); } if (u < 0.16) g.torn = false;
        const ch = sstep(0.34, 0.4, u) * (1 - sstep(0.9, 0.97, u));
        o[IX.jw] += ch * 0.055 * Math.max(0, Math.sin(t * 8.5)); o[IX.jy] += ch * 0.045 * Math.sin(t * 4.25); o[IX.hx] -= ch * 0.06;
      } else {
        const c = st.chew; c.timer -= dt; if (c.timer < 0) { c.timer = rnd(6, 14); c.on = lying ? (Math.random() < 0.8 ? 1 : 0) : (Math.random() < 0.3 ? 1 : 0); }
        if (asleep) c.on = 0;
        o[IX.jw] += c.on * 0.035 * Math.max(0, Math.sin(t * 5.5)) * (1 - busyNeck); o[IX.jy] += c.on * 0.04 * Math.sin(t * 2.75) * (1 - busyNeck);
      }
      if (asleep) o[IX.bk] = 1;
    }

    // ---------- putting it on the bones ----------
    const restLocal = {}; for (const n in Bn) restLocal[n] = Bn[n].position.clone();
    const tongueAxis = rig.tongueAxis ? rig.tongueAxis.clone() : new THREE.Vector3(0, -0.85, 0.52);
    function rot(name, x, y, z, order) { const b = Bn[name]; if (!b) return; E.set(x, y, z, order || 'XYZ'); b.quaternion.setFromEuler(E); }
    function apply(o) {
      const base = Bn.base; base.position.set(restLocal.base.x + o[IX.bx], restLocal.base.y + o[IX.by], restLocal.base.z + o[IX.bz]);
      rot('base', o[IX.bp], o[IX.byaw], o[IX.br], 'YXZ');
      rot('spine', o[IX.sp], o[IX.sy], 0); rot('chest', o[IX.cp], o[IX.cy], 0);
      if (Bn.ribs) { const r = o[IX.rb]; Bn.ribs.scale.set(1 + r, 1 + r * 0.7, 1 + r * 0.25); }
      rot('neck1', o[IX.nx] * 0.55, o[IX.ny] * 0.55, o[IX.nz] * 0.5); rot('neck2', o[IX.nx] * 0.45 + o[IX.n2x], o[IX.ny] * 0.45 + o[IX.n2y], o[IX.nz] * 0.5);
      rot('head', o[IX.hx], o[IX.hy], o[IX.hz]);
      rot('jaw', cl(o[IX.jw], -0.02, 0.5), o[IX.jy], 0);
      if (Bn.tongue) { const g = cl(o[IX.tg], 0, 1.2); Bn.tongue.position.copy(restLocal.tongue).addScaledVector(tongueAxis, g * 0.075 * (rig.headScale || 1)); rot('tongue', o[IX.tgx], 0, 0); Bn.tongue.scale.setScalar(1 + g * 0.15); }
      rot('earL', o[IX.eLx], o[IX.eLy], o[IX.eLz]); rot('earR', o[IX.eRx], o[IX.eRy], o[IX.eRz]);
      if (Bn.earL2) { rot('earL2', 0, 0, 0); rot('earR2', 0, 0, 0); }
      rot('tail0', o[IX.t0x], 0, o[IX.t0z]);
      for (let i = 1; i < 6; i++) if (Bn['tail' + i]) rot('tail' + i, 0, 0, 0);
      for (const n of ['L', 'R']) {
        rot('sh' + n, o[IX['sh' + n]], 0, o[IX['shz' + n]]); rot('el' + n, o[IX['el' + n]], 0, 0); rot('kn' + n, o[IX['kn' + n]], 0, 0); rot('ff' + n, o[IX['ff' + n]], 0, 0);
        rot('hi' + n, o[IX['hi' + n]], o[IX['hiy' + n]], o[IX['hiz' + n]]); rot('st' + n, o[IX['st' + n]], 0, 0); rot('hk' + n, o[IX['hk' + n]], 0, 0); rot('hf' + n, o[IX['hf' + n]], 0, 0);
      }
      if (Bn.hump) rot('hump', 0, 0, 0); if (Bn.dewlap) rot('dewlap', 0, 0, 0);
      rig.blink(cl(o[IX.bk], 0, 1));
      if (rig.squash) rig.squash(o[IX.sq]);
    }

    // ---------- springs: ears, tail, dewlap, hump ----------
    // Each hangs from its bone; the tip is a weight on a spring, worked on 1/120-second steps, so it lags behind,
    // swings and settles. The bone is then turned to point at where the weight has got to.
    const SPR = (rig.springs || []).filter(s => Bn[s[0]]).map(([name, K, C, lim, tip]) => ({b: Bn[name], K, C, lim, tip: tip.clone(), p: new THREE.Vector3(), v: new THREE.Vector3(), init: false}));
    const tw = new THREE.Vector3(), bwp = new THREE.Vector3(), dl = new THREE.Vector3(), dr = new THREE.Vector3(), inv = new THREE.Matrix4();
    function springs(dt) {
      R.updateMatrixWorld(true);
      const n = Math.min(10, Math.max(1, Math.ceil(dt * 120))), h = dt / n;
      for (const s of SPR) {
        tw.copy(s.tip).applyMatrix4(s.b.matrixWorld);
        if (!s.init || s.p.distanceToSquared(tw) > 1) { s.p.copy(tw); s.v.set(0, 0, 0); s.init = true; }
        for (let i = 0; i < n; i++) { s.v.x += (s.K * (tw.x - s.p.x) - s.C * s.v.x) * h; s.v.y += (s.K * (tw.y - s.p.y) - s.C * s.v.y) * h; s.v.z += (s.K * (tw.z - s.p.z) - s.C * s.v.z) * h; s.p.addScaledVector(s.v, h); }
        // turn the bone toward the weight
        inv.copy(s.b.matrixWorld).invert(); dl.copy(s.p).applyMatrix4(inv).normalize(); dr.copy(s.tip).normalize();
        q1.setFromUnitVectors(dr, dl); const ang = 2 * Math.acos(cl(q1.w, -1, 1));
        if (ang > s.lim) q1.slerp(new THREE.Quaternion(), 1 - s.lim / ang);
        s.b.quaternion.multiply(q1); s.b.updateMatrixWorld(true);
      }
    }
    function resetSprings() { for (const s of SPR) s.init = false; }

    // ---------- each frame ----------
    function update(dt, t, o) {
      dt = Math.min(dt || 0, 0.1); o = o || {};
      st.speed = o.speed || 0; st.turn = o.turn || 0;
      if (st.speed > 0.04 && st.state !== 'stand') act('stand');
      stepState(); evalStates(dt);
      const busyNeck = evalMoves(dt);
      out.set(cur); for (let i = 0; i < NC; i++) out[i] += add[i];
      const lw = locomotion(dt, out);
      idle(dt, t, out, busyNeck, lw);
      apply(out);
      springs(dt);
    }
    function jump(name) {
      if (name === 'eat') name = 'graze';
      if (!P[name]) return;
      st.state = st.want = name; st.seq = null; st.blend = null; st.active = []; st.queue = []; cur.set(P[name]); out.set(cur); apply(out); resetSprings();
    }
    function lookAt(p, hold) { st.look.target = p ? p.clone ? p.clone() : new THREE.Vector3(p.x, p.y, p.z) : null; st.look.hold = hold == null ? 3 : hold; st.look.timer = 1.5; }
    apply(cur);
    return {
      update, act, play, jump, lookAt, events, MOVES: Object.keys(MOVES), STATES: ['stand', 'graze', 'lie', 'sleep'], resetSprings,
      // for checks and tools: set a pose's channels by name
      setPose(name, o) { const a = P[name] || (P[name] = pose({})); for (const k in o) if (k in IX) a[IX[k]] = o[k]; },
      get state() { return st.state; }, get want() { return st.want; }, get busy() { return !!(st.seq || st.blend || st.active.length || st.queue.length); },
      get playing() { return st.active.map(a => a.name).concat(st.queue); }, get gait() { return st.trotW > st.walkW ? 'trot' : st.walkW > 0.05 ? 'walk' : 'none'; }
    };
  }
  root.makeZebuMoves = makeZebuMoves; root.ZEBU_MOVES = MOVES; root.ZEBU_CHANNELS = CH;
})(typeof window !== 'undefined' ? window : globalThis);
