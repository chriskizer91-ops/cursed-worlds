// land-kit.js: envoi's way of drawing land for real, as parts a page builds its own place from. Taken from the wild meadow
// of Colossus in the Meadow (envoi-on-the-longest-night, living-battlefields/field.js, makeLivingField, at commit 5439f2c),
// by way of Henry's pasture (henry-meadow.js), and shared by Henry's pasture and the ranch (the-ranch/ranch-land.js):
//   - the hour: day, dusk or night, its colors written as they should look on screen and taken back through envoi's film
//     curve (cinema.js: exposure, then an ACES curve), so they come out the same after it;
//   - the air: one wind for everything (gusts rolling across the grass, the clouds and their shadows drifting with it, and
//     pushes that bend the grass aside), written once in GLSL for every shader that needs it;
//   - painted textures (made the first time they are asked for): grass tufts, turf, trees far off, leaves, bark, mist;
//   - the sky (the sun or a big moon, stars, clouds, low hills far off), the lights and the haze;
//   - the grass's material (tufts on cards that turn to the camera, bend with the wind and catch the light from behind), the
//     swaying material for trees, and the soft light that shiny things reflect, drawn from the sky.
// three.js r128 (global THREE). Defines makeLandKit(renderer, opts).
// opts: { time: 'day' | 'dusk' | 'night', seed, maz (the sun's or the moon's direction: an angle from +z toward +x; 2.45) }
// Everything it makes is listed in the object it returns; dispose() frees it all.
(function (root) {
  'use strict';
  function makeLandKit(renderer, opts) {
    opts = opts || {};
    const TAU = Math.PI * 2, PI = Math.PI;
    let seed = opts.seed || 610091;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
    const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const V3 = (x, y, z) => new THREE.Vector3(x || 0, y || 0, z || 0), V4 = () => new THREE.Vector4(0, 0, 0, 0), COL = h => new THREE.Color(h);
    const rgb = (r, g, b, a) => 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + (a === undefined ? 1 : a) + ')';
    const TIME = ['day', 'dusk', 'night'].includes(opts.time) ? opts.time : 'night', NIGHT = TIME === 'night', DAY = TIME === 'day';
    const GL2 = renderer.capabilities.isWebGL2;
    const owned = [], own = o => { owned.push(o); return o; };
    const tex = (c, rx, ry, data) => { const t = own(new THREE.CanvasTexture(c)); if (!data) t.encoding = THREE.sRGBEncoding; if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || rx); } t.anisotropy = 4; return t; };
    // mipmaps that keep their cover: each smaller level is drawn from the one before with its alpha raised, so grass and
    // leaves seen from far off stay full instead of thinning away (the Colossus page's own)
    const fullMips = (c, data) => {
      const t = tex(c, 0, 0, data), m = [c]; let p = c;
      while (p.width > 1 || p.height > 1) {
        const q = cvs(Math.max(1, p.width >> 1), Math.max(1, p.height >> 1)), g = q.getContext('2d'); g.drawImage(p, 0, 0, q.width, q.height);
        const d = g.getImageData(0, 0, q.width, q.height), a = d.data; for (let i = 3; i < a.length; i += 4) a[i] = Math.min(255, a[i] * 1.3);
        g.putImageData(d, 0, 0); m.push(q); p = q;
      }
      t.mipmaps = m; t.generateMipmaps = false; return t;
    };

    // ---------- the hour: the Colossus page's night, dusk on the ranch, or a sunny afternoon ----------
    // Colors written as hex are as they should look on screen; the lights are in linear light.
    const LIN = h => COL(h).convertSRGBToLinear(), LINV = a => new THREE.Color(a[0], a[1], a[2]);
    const P = NIGHT ? {
      top: '#0b0816', mid: '#1d1634', hor: '#3f3058', haze: '#2c2344', hill: '#1f1932', disc: '#dfe4ff', tree: '#141826', deep: '#1f1d33', rim: '#7f8cd0', lit: '#2a3352',
      mist: '#4a4268', bank: '#3e3760', dust: '#5a5468', ground: 0x5a6650, grass: 0xd2dcc2, bark: 0x7a706a, leaf: 0x5c6a66,
      hs: LIN('#756aa8'), hg: LIN('#33262f'), hi: 1.1, lc: LIN('#b8c0ff'), li: .62, fc: LIN('#ffdcc0'), fi: .34,
      exposure: 1.6, fog: [26, 190], stars: 1, cloud: .18, discR: .046, discEl: .16, lightEl: .62, flies: 1, sun: 0, mistA: .36, aperture: .06, envGain: .45, bloom: .3, rays: .22, vignette: .28,
    } : DAY ? {
      top: '#3f78c0', mid: '#7fa9d8', hor: '#cfdde3', haze: '#b9c7cc', hill: '#7e8f8c', disc: '#fff4dc', cloudC: '#f2f4f6', tree: '#3e5631', deep: '#2c3f24', rim: '#e0eaa8', lit: '#8aa858', litK: 1,
      mist: '#dde4e2', bank: '#d4dcdc', bankA: .06, feetMist: .2, dust: '#b3a07c', ground: 0x96a060, grass: 0xe2e8c4, bark: [1.6, 1.4, 1.2], leaf: [2.4, 2.7, 1.9],
      hs: LIN('#b8d2ee'), hg: LIN('#6e5c3c'), hi: .95, lc: LIN('#fff0d8'), li: 1.9, fc: LIN('#ffe6cc'), fi: .2,
      exposure: .95, fog: [70, 450], stars: 0, cloud: .32, discR: .03, discEl: .9, lightEl: .9, flies: 0, sun: 1, mistA: .04, aperture: .2, envGain: 1, bloom: .3, rays: .1, vignette: .22,
    } : {
      top: '#1a2350', mid: '#5b4f7c', hor: '#e8a46a', haze: '#8c6c68', hill: '#4e3a46', disc: '#ffcf96', tree: '#241c20', deep: '#3e2c30', rim: '#ffb27a', lit: '#5a4440',
      mist: '#a8847a', bank: '#9c7a72', dust: '#8a6a50', ground: 0x8a8a62, grass: 0xe6dcc0, bark: 0xa0928a, leaf: 0xb0a890,
      hs: LINV([0.42, 0.46, 0.66]), hg: LINV([0.3, 0.2, 0.12]), hi: .8, lc: LINV([1, 0.6, 0.34]), li: 2.4, fc: LINV([0.6, 0.62, 0.85]), fi: .4,
      exposure: 1.05, fog: [30, 230], stars: .12, cloud: .3, discR: .02, discEl: .06, lightEl: .16, flies: .55, sun: 1, mistA: .1, aperture: .3, envGain: .6, bloom: .55, rays: .28, vignette: .38,
    };
    const E = P.exposure;
    // the film curve is ACES (Stephen Hill's fit): a matrix in, a curve on each channel, a matrix out; undone the other way round
    const AIN = [[.59719, .35458, .04823], [.07600, .90834, .01566], [.02840, .13383, .83777]], AOUT = [[1.60475, -.53108, -.07367], [-.10208, 1.10813, -.00605], [-.00327, -.07276, 1.07602]];
    const mul = (M, v) => M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
    const uncurve = y => { y = cl(y, 0, .985); const A = .983729 * y - 1, B = .432951 * y - .0245786, C = .238081 * y + .000090537; return (-B - Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A); };
    const UNF = h => { const c = COL(h), v = mul(AOUT, mul(AIN, [c.r, c.g, c.b].map(x => Math.pow(x, 2.2))).map(uncurve)).map(x => Math.max(0, x) / E); return c.setRGB(v[0], v[1], v[2]); };
    const SC = h => COL(h);   // a screen color, for the shaders that undo the film curve themselves
    // GLSL: from a color as it should look on screen to the light that shows as it after the film curve
    const UNFILM = 'uniform float uExp;\nvec3 unfilm(vec3 d){ vec3 y = clamp(mat3(.59719, .07600, .02840, .35458, .90834, .13383, .04823, .01566, .83777) * pow(clamp(d, 0., 1.), vec3(2.2)), 0., .985);\n' +
      ' vec3 A = .983729 * y - 1., B = .432951 * y - .0245786, C = .238081 * y + .000090537, u = (-B - sqrt(max(B * B - 4. * A * C, vec3(0.)))) / (2. * A);\n' +
      ' return max(mat3(1.60475, -.10208, -.00327, -.53108, 1.10813, -.07276, -.07367, -.00605, 1.07602) * u, vec3(0.)) / uExp; }\n';
    const EXPU = {uExp: {value: E}};
    // where the moon (or the sun) hangs: low over the gap in the trees, past the fence; its light comes from the same side,
    // higher, as the Colossus page lights its meadow
    const MAZ = 2.45, dirAt = (az, el) => V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const DISC = dirAt(MAZ, P.discEl), LIGHT = dirAt(MAZ, P.lightEl);
    const angTo = a => Math.abs(((a - MAZ) % TAU + TAU + PI) % TAU - PI);

    // ---------- the air: one wind for everything, pushes (x, z, radius, strength) and Henry's body (the Colossus page's) ----------
    const AIRU = {
      uT: {value: 0}, uWind: {value: new THREE.Vector4(.83, .55, .35, .6)}, uFlow: {value: V4()}, uRings: {value: [V4(), V4(), V4(), V4()]},
      uBodyA: {value: V4()}, uBodyB: {value: new THREE.Vector2(0, 0)},
      // where the camera is: three.js gives a Lambert material no cameraPosition, and the cards need it to turn to it
      uCam: {value: V3(0, 2, 10)},
    };
    const NOISE2 = [
      'float mh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float mn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mh(i), mh(i + vec2(1., 0.)), f.x), mix(mh(i + vec2(0., 1.)), mh(i + vec2(1., 1.)), f.x), f.y); }',
      'float mf(vec2 p){ return mn(p) * .55 + mn(p * 2.03 + 7.1) * .3 + mn(p * 4.01 + 3.3) * .15; }'].join('\n') + '\n';
    const AIR = [
      'uniform float uT; uniform vec4 uWind; uniform vec4 uFlow; uniform vec4 uRings[4]; uniform vec4 uBodyA; uniform vec2 uBodyB; uniform vec3 uCam;',
      NOISE2,
      'float gustAt(vec2 p){ vec2 d = uWind.xy; float a = dot(p, d), c = dot(p, vec2(-d.y, d.x)); return smoothstep(.38, .82, mf(vec2(a * .06 - uFlow.z, c * .045))) * uWind.w; }',
      'vec2 windAt(vec2 p){ vec2 d = uWind.xy; float a = dot(p, d), c = dot(p, vec2(-d.y, d.x));',
      ' return d * (uWind.z * (.22 + 1.3 * gustAt(p)) + .05 * sin(uT * 1.9 + a * .35 + c * .2)); }',
      'vec2 pushAt(vec2 p){ vec2 o = vec2(0.);',
      ' for (int i = 0; i < 4; i++) { vec4 R = uRings[i]; if (R.w > .002) { vec2 v = p - R.xy; float d = length(v) + .001;',
      '  o += v / d * R.w * (exp(-pow((d - R.z) / .55, 2.)) * 2.2 + .4 * step(d, R.z) * smoothstep(0., 1.2, R.z - d) * exp(-(R.z - d) * .8)); } }',
      // Henry: the grass leans out of the way of his body and his legs
      ' vec2 ab = uBodyB - uBodyA.xy; float h = clamp(dot(p - uBodyA.xy, ab) / max(dot(ab, ab), 1e-4), 0., 1.); vec2 v = p - uBodyA.xy - ab * h; float d = length(v) + .001;',
      ' o += v / d * uBodyA.w * smoothstep(uBodyA.z, uBodyA.z * .3, d);',
      ' return o; }'].join('\n') + '\n';
    // the clouds' shadows on the ground, drifting with the wind (the same waves as the clouds over the moon)
    const CSH = 'float cshade(vec2 p){ vec2 q = (p - uFlow.xy) * .05; return smoothstep(.3, .7, sin(q.x + 1.3 * sin(q.y * .7 + 1.1)) * sin(q.y * .83 + 1.1 * sin(q.x * .6 + 1.7))) * uFlow.w; }\n';
    // with four samples to a pixel, the edges of painted leaves and grass come out smooth (alpha to coverage, kept crisp)
    const A2C = GL2 ? '\n diffuseColor.a = clamp((diffuseColor.a - .45) / max(fwidth(diffuseColor.a), 1e-4) + .5, 0., 1.);' : '';

    // ---------- painted textures, each made the first time it is asked for ----------
    const once = f => { let v = null; return () => v || (v = f()); };
    // frostweed in flower, and low clover; each blade a tapered leaf, dark at its root and pale at its tip
    function blade(g, x, y0, h, lean, w, c0, c1) {
      const tx = x + lean, ty = y0 - h, cx = x + lean * .22, cy = y0 - h * .55, q = g.createLinearGradient(0, y0, 0, ty);
      q.addColorStop(0, c0); q.addColorStop(1, c1); g.fillStyle = q;
      g.beginPath(); g.moveTo(x - w / 2, y0); g.quadraticCurveTo(cx - w * .3, cy, tx, ty); g.quadraticCurveTo(cx + w * .3, cy, x + w / 2, y0); g.closePath(); g.fill();
    }
    const grassTex = once(() => {
      const W = 2048, H = 512, c = cvs(W, H), g = c.getContext('2d');
      for (let k = 0; k < 4; k++) {
        const ox = k * 512, n = [64, 40, 44, 30][k];
        for (let i = 0; i < n; i++) {
          const x = ox + rr(46, 466), h = rr(220, 490) * (k === 3 ? .55 : 1), sh = rr(.6, 1), w = rr(7, 15) * (k === 3 ? .8 : 1), dry = rnd() < .3 ? 1 : 0;
          blade(g, x, H, h, rr(-120, 120), w, rgb(66 * sh + 14 * dry, 92 * sh, 50 * sh), rgb((196 + 30 * dry) * sh, (224 - 10 * dry) * sh, (158 - 30 * dry) * sh));
        }
        if (k === 1) for (let i = 0; i < 12; i++) { // seed heads on thin stems: Johnson grass and little bluestem
          const x = ox + rr(80, 432), top = rr(30, 140), lean = rr(-40, 40);
          g.strokeStyle = 'rgb(150,152,104)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + lean * .3, (H + top) / 2, x + lean, top); g.stroke();
          g.fillStyle = i % 3 ? 'rgb(214,200,150)' : 'rgb(196,150,118)'; for (let s = 0; s < 9; s++) { g.beginPath(); g.ellipse(x + lean + rr(-5, 5), top + s * 7, 5, 8, rr(-.4, .4), 0, TAU); g.fill(); }
        }
        if (k === 2) for (let i = 0; i < 11; i++) { // fall asters and white frostweed
          const x = ox + rr(60, 452), y = rr(70, 230);
          g.strokeStyle = 'rgb(84,120,66)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + rr(-20, 20), (H + y) / 2, x, y); g.stroke();
          g.fillStyle = i % 3 ? '#f2eefa' : '#c9b4f0'; for (let p = 0; p < 7; p++) { const a = p / 7 * TAU; g.beginPath(); g.ellipse(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 10, 5, a, 0, TAU); g.fill(); }
          g.fillStyle = '#ffe07a'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
        }
        if (k === 3) for (let i = 0; i < 26; i++) { // clover leaves low among the blades
          const x = ox + rr(40, 472), y = H - rr(10, 150), s = rr(10, 18);
          g.fillStyle = rgb(70 + rr(0, 40), 110 + rr(0, 40), 60); for (let p = 0; p < 3; p++) { const a = p / 3 * TAU - PI / 2; g.beginPath(); g.ellipse(x + Math.cos(a) * s * .7, y + Math.sin(a) * s * .7, s * .62, s * .5, a, 0, TAU); g.fill(); }
        }
      }
      return fullMips(c);
    });
    // the ground: pasture turf with clover and dry patches
    const groundTex = once(() => {
      const S = 1024, c = cvs(S, S), g = c.getContext('2d');
      g.fillStyle = '#525f37'; g.fillRect(0, 0, S, S);
      const wrapFill = (x, y, r, col) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = q; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2); };
      for (let i = 0; i < 80; i++) wrapFill(rnd() * S, rnd() * S, rr(40, 150), ['rgba(40,58,30,.4)', 'rgba(110,128,60,.3)', 'rgba(128,110,64,.3)', 'rgba(70,96,46,.4)'][(rnd() * 4) | 0]);
      for (let i = 0; i < 26000; i++) { g.fillStyle = rnd() < .5 ? 'rgba(20,34,14,.25)' : 'rgba(200,214,140,.1)'; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 2 + rnd() * 4); }
      const t = tex(c, 22, 22); t.anisotropy = 8; return t;
    });
    // the trees round the pasture, painted in white as eight kinds (an atlas of 512-pixel cells): two post oaks, two
    // eastern red cedars, a dead tree, a cottonwood, brush and a mesquite. Red holds the shading inside the shape (darker
    // deep in the crown), alpha the shape.
    const TREECELL = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]];
    const treeTex = once(() => {
      const W = 2048, H = 1024, S = 512, c = cvs(W, H), g = c.getContext('2d'); g.lineCap = g.lineJoin = 'round';
      const blob = (x, y, rx, ry, a, l) => { g.fillStyle = rgb(255 * l, 255 * l, 255 * l); g.beginPath(); g.ellipse(x, y, rx, ry, a || 0, 0, TAU); g.fill(); };
      const limb = (x, y, x2, y2, w, l) => { g.strokeStyle = rgb(255 * l, 255 * l, 255 * l); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + rr(-8, 8), (y + y2) / 2 + rr(-8, 8), x2, y2); g.stroke(); };
      const clump = (x, y, r, n, flat) => { for (let k = 0; k < (n || 22); k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r; blob(x + Math.cos(a) * d, y + Math.sin(a) * d * .75 * (flat || 1), r * rr(.2, .4), r * rr(.16, .3), rnd() * 3, .55 + .45 * (1 - d / r) * (.6 + .4 * Math.sin(a + 2.2))); } };
      const branch = (x, y, a, l, w, d, leafy, l0) => {
        const x2 = x + Math.cos(a) * l, y2 = y - Math.sin(a) * l; limb(x, y, x2, y2, w, l0 || .7);
        if (d > 0) { const k = 2 + (rnd() < .35 ? 1 : 0); for (let i = 0; i < k; i++) branch(x2, y2, Math.min(PI - .4, Math.max(.4, a + rr(-.6, .6))), l * rr(.58, .78), w * .62, d - 1, leafy, l0); }
        else if (leafy) clump(x2, y2, l * rr(1, 1.5), 10);
      };
      TREECELL.forEach(([cx, cy], k) => {
        g.save(); g.beginPath(); g.rect(cx * S, cy * S, S, S); g.clip(); g.translate(cx * S, cy * S);
        const B = S - 4, mid = S / 2;
        if (k < 2) { // post oak: a short flared trunk, limbs spreading wide and a broad, clumpy crown, wider than it is tall
          const w0 = 20, top = B - (k ? 150 : 185);
          g.fillStyle = rgb(150, 150, 150); g.beginPath(); g.moveTo(mid - w0 * 2.2, B); g.quadraticCurveTo(mid - w0, B - 30, mid - w0 * .7, B - 80); g.lineTo(mid - w0 * .5, top); g.lineTo(mid + w0 * .5, top); g.lineTo(mid + w0 * .7, B - 80); g.quadraticCurveTo(mid + w0, B - 30, mid + w0 * 2.3, B); g.fill();
          for (let b = 0; b < 5; b++) branch(mid, top + 20, PI / 2 + (b / 4 - .5) * 2.1, rr(70, 100), 15, 2, true, .6);
          for (let q = 0; q < 8; q++) { const a = PI * (q / 7) + rr(-.2, .2), d = rr(60, 150); clump(mid + Math.cos(a) * d * 1.25, top - 40 - Math.sin(a) * d * .7, rr(48, 82), 16, .85); }
          clump(mid + rr(-30, 30), top - 90, rr(70, 95), 18, .8);
        } else if (k < 4) { // eastern red cedar: a dense, dark cone, ragged at its edge, on a short trunk
          limb(mid, B, mid, B - 70, 12, .5);
          const h = k === 2 ? B - 40 : B - 120, tw = k === 2 ? 88 : 118, wAt = f => tw * Math.pow(1 - f, k === 2 ? 1 : .6) * (1 + .18 * Math.sin(f * 23 + k)) + 8;
          for (let i = 0; i < 420; i++) {
            const f = Math.pow(rnd(), .85), y = B - 34 - f * h, w = wAt(f), x = mid + rr(-w, w), s = 1 - f * .45;
            blob(x, y, rr(7, 17) * s, rr(6, 14) * s, rnd() * 3, .42 + .58 * (1 - Math.abs(x - mid) / (w + 1)) * rr(.55, 1));
          }
          for (let i = 0; i < 70; i++) { // sprigs sticking out of the outline
            const f = rnd() * .95, y = B - 34 - f * h, sd = rnd() < .5 ? -1 : 1, w = wAt(f), L = rr(10, 26);
            limb(mid + sd * w * rr(.75, 1), y, mid + sd * (w * rr(.75, 1) + L), y - L * rr(.3, .9), rr(3, 6), rr(.45, .75));
          }
        } else if (k === 4) { // a dead tree: bare branching limbs
          branch(mid, B, PI / 2 + rr(-.08, .08), 150, 26, 5, false, .62);
        } else if (k === 5) { // a cottonwood by the creek: tall, with a big rounded crown
          limb(mid, B, mid + rr(-10, 10), B - 250, 26, .55);
          for (let b = 0; b < 5; b++) branch(mid, B - 230, PI / 2 + (b / 4 - .5) * 1.5, rr(60, 90), 13, 2, true, .6);
          clump(mid, B - 360, 125, 36); clump(mid - 70, B - 290, 90, 16); clump(mid + 75, B - 300, 90, 16);
        } else if (k === 6) { // brush along a fence line: yaupon and greenbrier, low and tangled
          for (let i = 0; i < 36; i++) { const a = rr(.25, 2.9), r = rr(90, 230); blob(mid + Math.cos(a) * r, B - Math.sin(a) * r * .55, rr(26, 48), rr(20, 36), rnd() * 3, .5 + .5 * Math.sin(a) * rnd()); }
          for (let i = 0; i < 9; i++) { const x0 = mid + rr(-200, 200), up = rr(120, 220); g.strokeStyle = rgb(170, 170, 170); g.lineWidth = 7; g.beginPath(); g.moveTo(x0, B); g.quadraticCurveTo(x0 + rr(-60, 60), B - up * 1.6, x0 + rr(-160, 160), B - rr(10, 60)); g.stroke(); }
        } else { // a mesquite: crooked stems leaning out from the ground, and an airy, flat-topped crown of feathery leaves
          for (let s = 0; s < 4; s++) branch(mid + rr(-12, 12), B, PI / 2 + (s / 3 - .5) * 1.2 + rr(-.12, .12), rr(105, 140), 13, 2, false, .55);
          const y0 = B - 235;
          for (let i = 0; i < 300; i++) { const dx = rr(-1, 1), th = 70 * Math.sqrt(Math.max(0, 1 - dx * dx)) + 8, y = y0 + rr(-th * .8, th * .5); blob(mid + dx * 215, y, rr(5, 12), rr(4, 9), rnd() * 3, .45 + .55 * rnd() * (1 - Math.abs(dx) * .4)); }
        }
        g.restore();
      });
      return fullMips(c, true);
    });
    // leaves for the two trees near the pasture: a cluster of post oak leaves (left) and of mesquite's feathery leaflets (right)
    const leafTex = once(() => {
      const W = 512, S = 256, c = cvs(W, S), g = c.getContext('2d');
      for (let i = 0; i < 150; i++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * 100, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, s = rr(.7, 1.3), sh = rr(.5, 1.05);
        g.save(); g.translate(x, y); g.rotate(rnd() * TAU); g.fillStyle = rgb(60 * sh, 100 * sh, 45 * sh);
        g.beginPath(); g.ellipse(0, 0, 14 * s, 7 * s, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(20,40,14,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-13 * s, 0); g.lineTo(13 * s, 0); g.stroke(); g.restore();
      }
      for (let i = 0; i < 26; i++) { // mesquite: thin stems, each with two rows of tiny leaflets
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * 80, x = S + 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, r = rnd() * TAU, L = rr(30, 52), sh = rr(.55, 1.05);
        g.save(); g.translate(x, y); g.rotate(r); g.strokeStyle = rgb(70 * sh, 90 * sh, 50 * sh); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
        g.fillStyle = rgb(78 * sh, 112 * sh, 56 * sh); for (let q = -L / 2 + 3; q < L / 2; q += 4) for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(q, sd * 4, 4.2, 1.6, sd * .5, 0, TAU); g.fill(); }
        g.restore();
      }
      return fullMips(c);
    });
    const barkTex = once(() => {
      const W = 128, H = 256, c = cvs(W, H), g = c.getContext('2d'); g.fillStyle = '#4a3c32'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = rnd() * W, w = rr(2, 7); g.fillStyle = rnd() < .5 ? 'rgba(20,14,10,.5)' : 'rgba(130,112,96,.25)'; for (const ox of [-W, 0, W]) g.fillRect(x + ox, 0, w, H); }
      for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(10,8,6,.35)'; g.fillRect(rnd() * W, rnd() * H, rr(3, 9), 1.5); }
      return tex(c, 2, 3);
    });
    const mistTex = once(() => {
      const S = 256, c = cvs(S, S), g = c.getContext('2d');
      for (let i = 0; i < 90; i++) { const x = rnd() * S, y = rnd() * S, r = rr(18, 60), q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, 'rgba(255,255,255,.22)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2); }
      const t = own(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    });

    // ---------- the sky: the hour's gradient, the moon (or the sun) with its halo, stars, low hills, clouds drifting ----------
    const SKYU = Object.assign({
      uDisc: {value: DISC}, uTop: {value: SC(P.top)}, uMid: {value: SC(P.mid)}, uHor: {value: SC(P.hor)}, uHaze: {value: SC(P.haze)}, uHill: {value: SC(P.hill)}, uMoonC: {value: SC(P.disc)},
      uStars: {value: P.stars}, uCloud: {value: P.cloud}, uSun: {value: P.sun}, uDiscR: {value: P.discR}, uGain: {value: 1}, uCloudC: {value: SC(P.cloudC || P.haze).multiplyScalar(P.cloudC ? 1 : 1.1)},
    }, AIRU, EXPU);
    const SKYFS = [
      'uniform vec3 uDisc, uTop, uMid, uHor, uHaze, uHill, uMoonC, uCloudC; uniform float uStars, uCloud, uSun, uDiscR, uGain; varying vec3 vD;',
      AIR, UNFILM,
      'float ridge3(float x){ float s = 0., a = .55, f = 1.; for (int i = 0; i < 3; i++) { s += a * (1. - abs(mn(vec2(x * f, float(i) * 7.3)) * 2. - 1.)); f *= 2.07; a *= .5; } return s + .12; }',
      'void main(){',
      ' vec3 d = normalize(vD); float y = d.y, az = atan(d.x, -d.z);',
      ' vec3 c = mix(uHor, uMid, smoothstep(-.02, .2, y)); c = mix(c, uTop, smoothstep(.2, .75, y));',
      ' float m = max(dot(d, uDisc), 0.);',
      // stars, where the moon's light and the haze low down leave them (a bright one now and then), twinkling
      ' if (uStars > 0.) { vec3 sp = d * 110.; vec3 ci = floor(sp), cf = fract(sp) - .5; float h = fract(sin(dot(ci, vec3(127.1, 311.7, 74.7))) * 43758.5453);',
      '  if (h > .9) { vec3 o = vec3(fract(h * 131.1), fract(h * 717.7), fract(h * 373.3)) - .5; float r = length(cf - o * .6), b = pow(fract(h * 53.7), 4.) * 2.2 + .3;',
      '   c += vec3(.92, .95, 1.) * b * (.7 + .3 * sin(uT * (1.5 + h * 7.) + h * 91.)) * smoothstep(.17, 0., r) * uStars * smoothstep(.04, .3, y) * (1. - smoothstep(.55, .97, m)); } }',
      // the glow in the air round it, and the disc: a full moon with darker seas and a bright rim, or the sun
      ' c += uMoonC * (pow(m, 6.) * .07 + pow(m, 40.) * .2 + pow(m, 400.) * .55) * (1. + uSun * 1.5);',
      ' vec3 e1 = normalize(cross(uDisc, vec3(0., 1., 0.))), e2 = cross(e1, uDisc); vec2 mp = vec2(dot(d, e1), dot(d, e2)) / uDiscR;',
      ' float disc = (1. - smoothstep(.97, 1.01, length(mp))) * step(0., dot(d, uDisc));',
      ' float sea = smoothstep(.52, .68, mf(mp * 1.2 + 3.)) * .8 + smoothstep(.55, .75, mf(mp * 3.1 + 9.)) * .3, limb = pow(max(0., 1. - dot(mp, mp)), .25);',
      ' vec3 moon = mix(vec3(.98, .96, .92) * (.8 + .2 * limb) * (1. - .26 * sea) * (.94 + .06 * mn(mp * 18.)), vec3(1., .93, .78), uSun);',
      ' c = mix(c, moon, disc);',
      ' c *= .92 + .16 * mf(vec2(az * 1.3, y * 2.6) + 5.);',
      // low hills far off in the haze: the rolling prairie round Bardwell
      ' for (int k = 0; k < 2; k++) { float fk = float(k), base = .004 + fk * .004, amp = .03 - fk * .012, fr = 2.4 + fk * 3.1, off = fk * 4.1 + 1.7;',
      '  float h = base + amp * pow(ridge3(az * fr + off), 1.5);',
      '  if (y < h) { float depth = clamp((h - y) / max(.01, h), 0., 1.); c = mix(uHill * (1. - .3 * depth), uHaze * 1.1, .55 - fk * .25 + .15 * depth); disc = 0.; } }',
      // clouds drifting over the moon, lit round it; how many there are is the hour's
      ' vec2 cu = d.xz / max(.06, d.y + .18) * 1.6 - uFlow.xy * .008;',
      ' float n = mf(cu * .42) * .62 + mf(cu * 1.25 + 4.) * .38, cov = smoothstep(1. - uCloud, 1.16 - uCloud, n) * smoothstep(-.03, .1, y);',
      ' vec3 cc = uCloudC * (.75 + .5 * n) + uMoonC * (pow(m, 6.) * .45 + pow(m, 30.) * .6) * (1.15 - n) * (1. + uSun);',
      ' c = mix(c, cc, cov * .95);',
      ' c = mix(c, uHaze, smoothstep(0., -.03, y));',
      ' vec3 o = unfilm(c);',
      // the sun is far brighter than any screen, so it flares
      ' o += vec3(20., 14., 7.) * disc * uSun * (1. - cov * .8);',
      ' gl_FragColor = linearToOutputTexel(vec4(o * uGain, 1.));',
      '}'].join('\n');
    const skyM = own(new THREE.ShaderMaterial({
      uniforms: SKYU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD;\nvoid main(){ vec4 w = modelMatrix * vec4(position, 1.); vD = w.xyz - cameraPosition; vec4 p = projectionMatrix * viewMatrix * w; gl_Position = p.xyww; }',
      fragmentShader: SKYFS,
    }));
    // the sky's dome: drawn first, behind everything, wherever it is (a page whose camera goes far moves it with the camera)
    function sky(scene, follow) {
      const m = new THREE.Mesh(skyG(), skyM); m.renderOrder = -10; m.frustumCulled = false; scene.add(m);
      if (follow) m.onBeforeRender = (r, s, cam) => { m.position.copy(cam.position); m.updateMatrixWorld(); };
      return m;
    }
    const skyG = once(() => own(new THREE.SphereGeometry(300, 64, 32)));

    // ---------- the light: the hour's sky and ground, the sun (or the moon) with its shadow, and a fill ----------
    // o: { shadow (half the width the shadow covers, in metres; 3.2), mapSize (2048) }
    let key = null;
    function lights(scene, o) {
      o = o || {}; const S = o.shadow || 3.2;
      const hemi = new THREE.HemisphereLight(P.hs, P.hg, P.hi); scene.add(hemi);
      key = new THREE.DirectionalLight(P.lc, P.li);
      key.castShadow = true; key.shadow.mapSize.set(o.mapSize || 2048, o.mapSize || 2048); Object.assign(key.shadow.camera, {left: -S, right: S, top: S, bottom: -S, near: 1, far: o.far || 60}); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
      scene.add(key); scene.add(key.target);
      const fill = new THREE.DirectionalLight(P.fc, P.fi); scene.add(fill); scene.add(fill.target);
      const fog = new THREE.Fog(UNF(P.haze), P.fog[0], P.fog[1]); scene.fog = fog;
      return {hemi, key, fill, fog};
    }

    // ---------- the grass: tufts on cards that turn to face the camera, bend from their roots with the wind and catch the
    // light from behind (the Colossus page's grass, the same in every way but the turning) ----------
    // A tuft is a card: aRoot (x, z, height, a turn) and aCard (across, -half to +half its width; up, 0 to 1) on each corner.
    // o.root can work them out in the shader instead (GLSL setting vec4 root and vec2 card; o.head declares what it needs,
    // o.uniforms gives its uniforms), for grass that is laid out as the camera goes (the ranch's); o.fhead and o.frag add to the
    // fragment shader (o.frag runs once the grass's color is known, in diffuseColor); o.post runs once the card is placed
    // (transformed), knowing which way the camera is (toC, and lc how far).
    function grassMat(o) {
      o = o || {};
      const m = own(new THREE.MeshLambertMaterial({map: grassTex(), side: THREE.DoubleSide, color: LIN(P.grass), alphaTest: .45}));
      if (GL2) m.alphaToCoverage = true;
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, AIRU, {uMoonC: {value: P.lc}, uMoonD: {value: LIGHT}}, o.uniforms || {});
        sh.vertexShader = AIR + CSH + '\n' + (o.head || 'attribute vec4 aRoot; attribute vec2 aCard;') + '\nvarying float vB; varying float vHt; varying vec3 vGw; varying float vCs;\n' +
          sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
            ' { ' + (o.root || 'vec4 root = aRoot; vec2 card = aCard;') + '\n' +
            '   vec2 toC = uCam.xz - root.xy; float lc = length(toC); toC /= max(lc, 1e-3);\n' +
            '   float cy = cos(root.w), sy = sin(root.w); vec2 sd = vec2(toC.y, -toC.x); sd = vec2(sd.x * cy - sd.y * sy, sd.x * sy + sd.y * cy);\n' +
            '   vec3 org = vec3(modelMatrix[3]); transformed.xz = root.xy + sd * card.x - org.xz; transformed.y = root.z * card.y;\n' +
            // grass right by the camera bows out of the way, so it never fills the lens
            '   transformed.y *= smoothstep(.6, 2.2, lc);\n' +
            '   vec2 w = windAt(root.xy) + pushAt(root.xy); vec2 off = w * card.y * card.y * root.z; float L = length(off), mx = root.z * .8; if (L > mx) off *= mx / L;\n' +
            '   transformed.xz += off; transformed.y -= dot(off, off) / max(.1, root.z) * .45 * card.y; vB = min(1., length(w)); vHt = card.y; vCs = cshade(root.xy);\n' +
            (o.post || '') + '\n   vGw = transformed + org; }');
        sh.fragmentShader = 'uniform vec3 uMoonC, uMoonD, uCam;\nvarying float vB; varying float vHt; varying vec3 vGw; varying float vCs;\n' + (o.fhead || '') + '\n' + sh.fragmentShader
          .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb /= max(texelColor.a, .3);')
          .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>' + A2C)
          .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(.58, 1.05, vHt) * (1. + .5 * vB * vHt) * (1. - .35 * vCs);\n' + (o.frag || ''))
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n vec3 vdir = normalize(vGw - uCam); float bl = pow(max(dot(vdir, normalize(uMoonD)), 0.), 3.);\n' +
            ' totalEmissiveRadiance += diffuseColor.rgb * uMoonC * bl * vHt * vHt * 1.1;');
      };
      m.customProgramCacheKey = () => 'lk-grass-' + (o.key || 'cards');
      return m;
    }

    // ---------- a tree's trunk and leaves that sway with the wind from the root up and glow where the light comes through
    // (aTree: its kind, how far up its height, and where its root is) ----------
    const airy = (m, name) => {
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, AIRU, {uMoonC: {value: P.lc}, uMoonD: {value: LIGHT}});
        sh.vertexShader = AIR + 'attribute vec4 aTree; varying vec3 vTw; varying float vTh;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
          ' { float h = aTree.y * aTree.y; vec2 w = windAt(aTree.zw) * .5 + pushAt(aTree.zw) * .2;\n' +
          '   transformed.xz += w * h * 1.5 + vec2(sin(uT * 2.1 + position.y * .9 + position.x), cos(uT * 1.7 + position.z * .8)) * .04 * aTree.y * (.4 + uWind.z); }\n' +
          ' vec4 tw = modelMatrix * vec4(transformed, 1.); vTw = tw.xyz; vTh = aTree.y;');
        sh.fragmentShader = 'uniform vec3 uMoonC, uMoonD, uCam; varying vec3 vTw; varying float vTh;\n' + sh.fragmentShader
          .replace('#include <map_fragment>', '#include <map_fragment>' + (name === 'leaf' ? '\n diffuseColor.rgb /= max(texelColor.a, .3);' : ''))
          .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>' + (name === 'leaf' ? A2C : ''))
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float bl = pow(max(dot(normalize(vTw - uCam), normalize(uMoonD)), 0.), 4.);\n totalEmissiveRadiance += diffuseColor.rgb * uMoonC * bl * .35 * vTh;');
      };
      m.customProgramCacheKey = () => 'lk-tree-' + name;
      return m;
    };

    // ---------- the soft light that shiny things reflect: this sky, and whatever is given (trees, say), drawn once ----------
    function env(scene, extra, groundHex) {
      const e = new THREE.Scene(); e.add(new THREE.Mesh(skyG(), skyM)); for (const m of extra || []) e.add(m);
      const g = new THREE.Mesh(new THREE.CircleGeometry(300, 32), new THREE.MeshBasicMaterial({color: UNF(groundHex || (NIGHT ? '#1c1a24' : DAY ? '#6c6e4c' : '#5a4a3c'))})); g.rotation.x = -PI / 2; g.position.y = -1.4; e.add(g);
      SKYU.uGain.value = P.envGain; const pm = new THREE.PMREMGenerator(renderer), rt = own(pm.fromScene(e, .04, .1, 1000)); scene.environment = rt.texture; pm.dispose(); SKYU.uGain.value = 1; g.geometry.dispose(); g.material.dispose();
      return rt;
    }

    // ---------- each frame: the wind wanders, the clouds drift, pushes spread and fade ----------
    const RING = [0, 1, 2, 3].map(() => ({x: 0, z: 0, t: 0, s: 0, s0: 0}));
    const hh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); return lerp(lerp(hh(ix, iy), hh(ix + 1, iy), fx), lerp(hh(ix, iy + 1), hh(ix + 1, iy + 1), fx), fy); };
    const vf = (x, y) => vn(x, y) * .55 + vn(x * 2.03 + 7.1, y * 2.03 + 7.1) * .3 + vn(x * 4.01 + 3.3, y * 4.01 + 3.3) * .15;
    // how much of the moon a drifting cloud covers (the same noise as the sky's clouds), to dim its light while it passes
    function cloudAtDisc() {
      const F = AIRU.uFlow.value, k = 1.6 / Math.max(.06, DISC.y + .18), cx = DISC.x * k - F.x * .008, cz = DISC.z * k - F.y * .008;
      const n = vf(cx * .42, cz * .42) * .62 + vf(cx * 1.25 + 4, cz * 1.25 + 4) * .38, cv = P.cloud;
      return sm(1 - cv, 1.16 - cv, n);
    }
    let cover = 0;
    // each frame: the wind wanders, the clouds drift (their shadow dims the sun's light as one passes), pushes spread and fade
    function update(dt, t, camPos) {
      dt = dt > 0 ? Math.min(dt, .05) : 0;
      AIRU.uT.value = t; if (camPos) AIRU.uCam.value.copy(camPos);
      const W = AIRU.uWind.value, F = AIRU.uFlow.value, wa = .6 + .45 * Math.sin(t * .021) + .2 * Math.sin(t * .057 + 1);
      W.x = Math.cos(wa); W.y = Math.sin(wa); W.z = .3 + .08 * Math.sin(t * .13); W.w = .55;
      F.x += W.x * (2 + 4 * W.z) * dt; F.y += W.y * (2 + 4 * W.z) * dt; F.z += dt * (.4 + .6 * W.z);
      cover += (cloudAtDisc() - cover) * (1 - Math.exp(-dt * 2)); F.w = .5 * (1 - cover);
      if (key) key.intensity = P.li * (1 - .55 * cover);
      RING.forEach((R, i) => { const U = AIRU.uRings.value[i]; if (R.s > .002) { R.t += dt; R.s = R.s0 * Math.exp(-R.t * 2.4); U.set(R.x, R.z, 4.5 * (1 - Math.exp(-R.t * 2.2)), R.s); } else U.w = 0; });
      return cover;
    }
    function ring(x, z, s) { let R = RING.find(q => q.s <= .002) || RING.reduce((a, b) => (a.s < b.s ? a : b)); Object.assign(R, {x, z, t: 0, s: s, s0: s}); }
    function dispose() {
      for (const o of owned) if (o && o.dispose) o.dispose();
      if (key && key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }   // the shadow's picture is the light's own, and three.js keeps it otherwise
    }
    return {
      time: TIME, night: NIGHT, day: DAY, P, E, GL2, MAZ, DISC, LIGHT, dirAt, angTo,
      rnd, rr, cl, lerp, sm, cvs, V3, V4, COL, rgb, own, tex, fullMips,
      LIN, LINV, UNF, SC, UNFILM, EXPU, AIRU, NOISE2, AIR, CSH, A2C, SKYU, skyM,
      get grassTex() { return grassTex(); }, get groundTex() { return groundTex(); }, get treeTex() { return treeTex(); }, TREECELL,
      get leafTex() { return leafTex(); }, get barkTex() { return barkTex(); }, get mistTex() { return mistTex(); }, get skyG() { return skyG(); },
      sky, lights, grassMat, airy, env, update, ring, dispose,
      get key() { return key; }, get cover() { return cover; },
    };
  }
  root.makeLandKit = makeLandKit;
})(typeof window !== 'undefined' ? window : globalThis);
