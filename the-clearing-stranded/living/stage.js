// stage.js: a painted place brought to life. three.js r128 (global THREE). Defines makeStage(opts).
//
// The painting is the world. A locked 3D camera matches the painter's (looking down at 33 degrees, with no
// perspective, 54.5 painting pixels to the metre), so anything made in code stands in the painting at the right size and
// in the right place. The place's trace says where every painted thing meets the ground; the painting writes that into
// the depth buffer, so a 3D thing that walks north of a boulder or a tree goes behind it.
//
// The painting's own shader brings it to life, the way the envoi meadow does (living-battlefields/field.js):
// - the hour: dawn, day, a golden evening, dusk and night under the moon, with firelight pooling round a fire;
// - the season: spring as painted; summer drying the grass; fall turning the oaks rust and gold and the tallgrass
//   russet; winter's straw-colored grass and the brown leaves post oaks hold all winter; snow lying on the ground;
// - the weather: clouds' shadows drifting over, wind in the leaves (the higher up a tree, the more it moves) and gusts
//   rolling across the grass, rain darkening the ground and rippling its puddles, lightning, mist in the hollows.
// Particles carry the rest: rain, snow, falling leaves, petals, pollen, dust, smoke, embers, sparks and fireflies.
//
// opts: { canvas, painting (an image or canvas), trace (living/traces/*.js), K, pitch, month, hour }
(function (root) {
  'use strict';

  function makeStage(opts) {
    let T = opts.trace; const PW = T.size[0], PH = T.size[1];
    const K = opts.K || 54.5, PITCH = (opts.pitch || 33) * Math.PI / 180, SN = Math.sin(PITCH), CS = Math.cos(PITCH);
    const TAU = Math.PI * 2;
    let seed = opts.seed || 20261004;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + (b - a) * rnd();
    const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t, sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const V3 = (x, y, z) => new THREE.Vector3(x || 0, y || 0, z || 0), V4 = (x, y, z, w) => new THREE.Vector4(x || 0, y || 0, z || 0, w || 0), COL = h => new THREE.Color(h);

    // ---------- renderer, scene and the locked camera ----------
    const renderer = new THREE.WebGLRenderer({canvas: opts.canvas, antialias: true, alpha: false, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.sortObjects = true;
    const scene = new THREE.Scene(), rootG = new THREE.Group(); scene.add(rootG);
    const C0 = V3(PW / 2 / K, 0, PH / 2 / (K * SN));                // the ground under the middle of the painting
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 500);
    camera.position.set(C0.x, 200 * SN, C0.z + 200 * CS); camera.up.set(0, 1, 0); camera.lookAt(C0);
    camera.updateMatrixWorld(true);
    const FWD = camera.getWorldDirection(V3());

    // painting pixels and the world: x across, z toward the viewer, y up, in metres
    const toWorld = (px, py, h) => V3(px / K, h || 0, py / (K * SN));
    const toPaint = v => [v.x * K, K * (v.z * SN - v.y * CS)];

    // ---------- the painting, and what each pixel of it is ----------
    // what each pixel of the painting is: where it meets the ground (the depth map), and a mask: R how much it moves in
    // the wind, G grass on the ground, B bare dirt (255) or flowers (128), A evergreen. Made again for each painting.
    let DP, DW, DH, mk, depthTex, maskTex, paintTex, seasonal = false;
    function makeMaps(img) {
      DP = Trace.depth(T, 2); DW = DP.W; DH = DP.H;
      const dRGBA = new Uint8Array(DW * DH * 4); for (let i = 0; i < DW * DH; i++) dRGBA[i * 4] = DP.D[i];
      if (depthTex) depthTex.dispose(); depthTex = new THREE.DataTexture(dRGBA, DW, DH, THREE.RGBAFormat); depthTex.magFilter = depthTex.minFilter = THREE.NearestFilter; depthTex.needsUpdate = true;
      const pc = document.createElement('canvas'); pc.width = DW; pc.height = DH; const pg = pc.getContext('2d'); pg.drawImage(img, 0, 0, DW, DH);
      const px = pg.getImageData(0, 0, DW, DH).data; mk = new Uint8Array(DW * DH * 4);
      const tallPoly = (T.ground || []).filter(g => g[0] === 'G').map(g => g[1]);
      for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
        const i = y * DW + x, r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx, s = mx > 0 ? (mx - mn) / mx : 0;
        let h = 0; if (mx > mn) { if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; h *= 60; if (h < 0) h += 360; }
        const obj = DP.D[i] > 0, green = h > 52 && h < 175 && s > 0.14 && v > 0.08;
        let R = 0, G = 0, B = 0, A = 0;
        if (obj) { if (green || (v < 0.22 && s > 0.1) || (seasonal && s > 0.25 && (h < 52 || h > 300))) { R = 255; if (h > 100 && s > 0.22 && v < 0.5) A = 255; } }
        else {
          if (green) G = 255;
          if (!green && h < 50 && s > 0.12 && s < 0.65 && v > 0.3 && r > g) B = 255;
          if (s > 0.5 && v > 0.45 && (h < 48 || h > 320) && !(h > 20 && h < 48 && s < 0.7)) B = 128;
          if ((green || G || seasonal) && tallPoly.some(P => Trace.inPoly(P, (x + 0.5) * 2, (y + 0.5) * 2))) { R = 150; G = 255; }
        }
        mk[i * 4] = R; mk[i * 4 + 1] = G; mk[i * 4 + 2] = B; mk[i * 4 + 3] = A;
      }
      if (maskTex) maskTex.dispose(); maskTex = new THREE.DataTexture(mk, DW, DH, THREE.RGBAFormat); maskTex.magFilter = maskTex.minFilter = THREE.LinearFilter; maskTex.needsUpdate = true;
      if (paintTex) paintTex.dispose(); paintTex = new THREE.Texture(img); paintTex.flipY = false; paintTex.minFilter = THREE.LinearMipmapLinearFilter; paintTex.magFilter = THREE.LinearFilter; paintTex.anisotropy = 4; paintTex.needsUpdate = true;
    }
    makeMaps(opts.painting);

    // ---------- the air: one wind for everything, the clouds' shadows, and up to four lights on the ground ----------
    const AIRU = {uT: {value: 0}, uWind: {value: V4(0.86, 0.5, 0.25, 0)}, uFlow: {value: V4(0, 0, 0, 0.2)}};
    const NOISE = [
      'float mh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float mn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mh(i), mh(i + vec2(1., 0.)), f.x), mix(mh(i + vec2(0., 1.)), mh(i + vec2(1., 1.)), f.x), f.y); }',
      'float mf(vec2 p){ return mn(p) * .55 + mn(p * 2.03 + 7.1) * .3 + mn(p * 4.01 + 3.3) * .15; }'].join('\n') + '\n';
    const AIR = 'uniform float uT; uniform vec4 uWind; uniform vec4 uFlow;\n' + NOISE + [
      // gusts roll across the ground in bands along the wind (from the envoi meadow)
      'float gustAt(vec2 p){ vec2 d = uWind.xy; float a = dot(p, d), c = dot(p, vec2(-d.y, d.x)); return smoothstep(.38, .82, mf(vec2(a * .09 - uFlow.z, c * .07))); }',
      'float cshade(vec2 p){ vec2 q = (p - uFlow.xy) * .06; return smoothstep(.25, .75, sin(q.x + 1.3 * sin(q.y * .7 + 1.1)) * sin(q.y * .83 + 1.1 * sin(q.x * .6 + 1.7)) * .5 + .5) * uFlow.w; }'].join('\n') + '\n';
    const GLOWU = {uGlowP: {value: [V4(), V4(), V4(), V4()]}, uGlowC: {value: [V3(), V3(), V3(), V3()]}};
    const GLOW = 'uniform vec4 uGlowP[4]; uniform vec3 uGlowC[4];\nvec3 glowAt(vec3 p){ vec3 s = vec3(0.); for (int i = 0; i < 4; i++) { vec4 g = uGlowP[i]; if (g.w > 0.) { vec3 v = p - g.xyz; float q = dot(v, v) / (g.w * g.w); s += uGlowC[i] * (1. - smoothstep(.45, 1., q)) / (1. + 9. * q); } } return s; }\n';
    // the season, and the light of the hour, shared by the painting and the live grass
    const LOOKU = {
      uSeason: {value: V4(0, 0, 0, 0)}, uFlowers: {value: 1}, uSnow: {value: 0}, uWet: {value: 0}, uRain: {value: 0},
      uTint: {value: V3(1, 1, 1)}, uAmb: {value: V3(0, 0, 0)}, uDesat: {value: 0}, uNight: {value: 0}, uMist: {value: 0}, uMistC: {value: COL(0xc8d0d8)}, uFlash: {value: 0}
    };
    const LOOK = [
      'uniform vec4 uSeason; uniform float uFlowers, uSnow, uWet, uRain, uDesat, uNight, uMist, uFlash; uniform vec3 uTint, uAmb, uMistC;',
      // what the season does to a painted color. mk: the mask (R wind, G grass, B dirt or flowers, A evergreen); obj: 1 if
      // it stands up out of the ground; P: where it is
      'vec3 seasonal(vec3 c, vec4 mk, float obj, vec3 P){',
      ' float l = dot(c, vec3(.299, .587, .114));',
      ' float decid = step(.5, mk.r) * obj * (1. - mk.a), ever = mk.a * obj, grass = mk.g * (1. - obj), tall = grass * step(.3, mk.r);',
      ' float flower = (1. - obj) * smoothstep(.3, .45, mk.b) * (1. - smoothstep(.6, .75, mk.b));',
      ' float v = mn(P.xz * .3 + vec2(3.1, 7.7));',
      ' vec3 fallC = mix(mix(vec3(.30, .10, .05), vec3(.86, .38, .10), smoothstep(.06, .5, l)), vec3(.98, .78, .30), smoothstep(.45, .8, l));',
      ' fallC = mix(fallC, mix(vec3(.36, .22, .05), vec3(.95, .80, .28), smoothstep(.06, .6, l)), smoothstep(.45, .8, v));',
      ' vec3 deadC = mix(vec3(.20, .13, .07), vec3(.64, .48, .30), smoothstep(.06, .66, l));',
      ' c = mix(c, fallC, decid * uSeason.y);',
      ' c = mix(c, deadC, decid * uSeason.z);',
      ' c = mix(c, c * vec3(.94, .88, .74) + vec3(.04, .03, 0.), ever * uSeason.z * .7);',
      ' vec3 strawC = mix(vec3(.40, .32, .18), vec3(.90, .80, .54), smoothstep(.1, .8, l));',
      ' vec3 russetC = mix(vec3(.38, .17, .09), vec3(.88, .58, .34), smoothstep(.1, .8, l));',
      ' c = mix(c, mix(strawC, russetC, tall), grass * uSeason.x * (.75 + .25 * v));',
      ' c = mix(c, mix(vec3(l * .9, l * .78, l * .52), strawC, .5), flower * (1. - uFlowers));',
      ' c = mix(c, c * vec3(.95, 1.07, .9), (grass + decid) * uSeason.w * .6);',
      // snow lies on the ground and on the lit tops of things, in drifts; the tallgrass pokes through
      ' float drift = smoothstep(.2, .75, mf(P.xz * .9 + 1.7)), lit0 = smoothstep(.12, .62, l);',
      ' float sn = uSnow * mix(.45 + .55 * drift, (.25 + .5 * drift) * lit0 * (.6 + .4 * ever + .3 * (1. - step(.5, mk.r))), obj) * (1. - .5 * tall * (1. - lit0));',
      ' c = mix(c, vec3(.88, .91, .97) * (.62 + .55 * l), clamp(sn * (.55 + .45 * lit0), 0., .92));',
      ' return c; }',
      // the light of the hour on a color, and the firelight
      'vec3 lit(vec3 c, vec3 gl){ float L = dot(c, vec3(.299, .587, .114)); c = mix(c, vec3(L), uDesat); return c * (uTint + gl * (.3 + 1.2 * uNight)) + uAmb + gl * .02 * uNight; }'].join('\n') + '\n';

    // ---------- the painting on a plane behind everything, alive ----------
    const PV = new THREE.Matrix4();
    const BU = Object.assign({
      uPaint: {value: paintTex}, uDepth: {value: depthTex}, uMask: {value: maskTex}, uSize: {value: new THREE.Vector2(PW, PH)},
      uK: {value: K}, uSn: {value: SN}, uCs: {value: CS}, uPV: {value: PV}, uCloud: {value: 0}, uDebug: {value: 0}, uSky: {value: COL(0x8899aa)}
    }, AIRU, GLOWU, LOOKU);
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(PW / K, PH / K), new THREE.ShaderMaterial({
      uniforms: BU, depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth, extensions: {fragDepth: true},
      vertexShader: 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: [AIR, GLOW, LOOK,
        'uniform sampler2D uPaint, uDepth, uMask; uniform vec2 uSize; uniform float uK, uSn, uCs, uCloud, uDebug; uniform mat4 uPV; uniform vec3 uSky; varying vec2 vUv;',
        'void main(){',
        ' vec2 pp = vec2(vUv.x, 1. - vUv.y) * uSize, pu = pp / uSize;',
        ' float b = floor(texture2D(uDepth, pu).r * 255. + .5) * 4., obj = step(.5, b);',
        ' vec3 P = obj > .5 ? vec3(pp.x / uK, max(0., (b - pp.y) / (uK * uCs)), b / (uK * uSn)) : vec3(pp.x / uK, 0., pp.y / (uK * uSn));',
        ' vec4 mk = texture2D(uMask, pu);',
        // the wind in the leaves, and a shiver through the tallgrass
        ' float g = gustAt(P.xz), wz = uWind.z;',
        ' float sway = step(.5, mk.r) * obj * clamp((b - pp.y) / 150., 0., 1.) * (.9 + 2.2 * wz) + (1. - obj) * step(.3, mk.r) * (.35 + 1.1 * wz);',
        ' float ph = uT * (1.4 + 1.3 * wz) + dot(P.xz, vec2(.33, .21));',
        ' vec2 off = vec2(uWind.x * (.35 + 1.4 * g) * wz * 1.6 + .32 * sin(ph), .22 * cos(ph * 1.27 + P.x)) * sway;',
        ' off += (vec2(mn(pp * .09 + uT * 2.6), mn(pp * .11 - uT * 2.3)) - .5) * sway * (.4 + 1.2 * wz);',
        ' vec3 c = texture2D(uPaint, (pp + off) / uSize).rgb;',
        ' c = seasonal(c, mk, obj, P);',
        ' float grass = mk.g * (1. - obj), dirt = (1. - obj) * smoothstep(.85, .95, mk.b);',
        // gusts show the paler undersides of the grass; the clouds' shadows drift over
        ' c *= 1. + (.10 + .1 * step(.3, mk.r)) * g * wz * grass;',
        ' c *= 1. - .32 * cshade(P.xz);',
        // rain: everything darker, puddles in the dirt that hold the sky and ripple
        ' float pud = smoothstep(.58, .7, mf(P.xz * .55)) * uWet * max(dirt, .25 * grass * (1. - obj));',
        ' c *= 1. - .28 * uWet * (1. - .5 * obj);',
        ' c = mix(c, uSky * (.75 + .2 * c), pud * .55);',
        ' { vec2 q = P.xz * 2.2, cc = floor(q), fr = fract(q) - .5, o = vec2(mh(cc + 3.1), mh(cc + 7.7)) - .5; float rp = fract(uT * 1.3 + mh(cc));',
        '   c += vec3(.45, .5, .55) * smoothstep(.07, 0., abs(length(fr - o * .5) - rp * .42)) * (1. - rp) * uRain * pud * step(mh(cc + 1.9), .65); }',
        ' c = lit(c, glowAt(P));',
        // mist lies low in the morning, thinner over the open ground
        ' c = mix(c, uMistC * (uTint * .5 + .55), clamp(uMist * (.35 + .65 * mf(P.xz * .25 + vec2(uT * .02, 0.))) * (1. - .45 * obj), 0., .85));',
        ' c += uFlash * (c * .9 + .08);',
        ' if (uDebug > .5 && obj > .5) { float hh = fract(b / 1024. * 2.7); c = mix(c, vec3(.5 + .5 * cos(6.283 * (hh + vec3(0., .33, .67)))), .5); }',
        ' gl_FragColor = vec4(c, 1.);',
        ' vec4 q = uPV * vec4(P, 1.);',
        ' gl_FragDepthEXT = clamp(q.z / q.w * .5 + .5, 0., 1.);',
        '}'].join('\n')
    }));
    backdrop.position.copy(C0).addScaledVector(FWD, 120); backdrop.quaternion.copy(camera.quaternion);
    backdrop.renderOrder = -1000; backdrop.frustumCulled = false; scene.add(backdrop);

    // ---------- the lights for the things made in code: never more or fewer, only brighter or dimmer ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x6a6048, 0.6); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-6, 10, -3); scene.add(sun); scene.add(sun.target);
    const fires = [0, 1].map(() => { const L = new THREE.PointLight(0xffa050, 0, 9, 2); scene.add(L); return L; });

    // ---------- the hour, the season and the weather ----------
    const state = {hour: opts.hour == null ? 10 : opts.hour, month: opts.month == null ? 4.6 : opts.month, weather: 'clear'};
    const RISE = [7.5, 7.25, 7.4, 7.0, 6.5, 6.3, 6.5, 6.85, 7.15, 7.5, 7.0, 7.35], SET = [17.75, 18.25, 19.6, 20.0, 20.35, 20.65, 20.65, 20.2, 19.55, 18.9, 17.5, 17.4];
    const mAt = (A, m) => { const i = Math.floor(m) % 12, f = m - Math.floor(m); return lerp(A[i], A[(i + 1) % 12], f); };
    // the season's look by month (0 January): grass dryness, fall color, brown leaves, spring green, flowers
    const DRY = [0.95, 0.85, 0.35, 0.05, 0, 0.12, 0.42, 0.6, 0.48, 0.5, 0.78, 0.92];
    const FALL = [0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0.35, 0.92, 0.35];
    const BROWN = [0.88, 0.82, 0.35, 0, 0, 0, 0, 0, 0, 0, 0.12, 0.66];
    const LUSH = [0, 0, 0.55, 1, 0.55, 0.2, 0, 0, 0, 0, 0, 0];
    const FLOW = [0, 0, 0.35, 1, 1, 0.85, 0.55, 0.45, 0.45, 0.3, 0.05, 0];
    // weather: wind, clouds (how dim and grey), clouds' shadows, rain, snow falling, mist
    const WX = {
      clear: {wind: 0.22, cloud: 0, shade: 0.22, rain: 0, snow: 0, mist: 0},
      breezy: {wind: 0.75, cloud: 0.15, shade: 0.5, rain: 0, snow: 0, mist: 0},
      overcast: {wind: 0.35, cloud: 0.75, shade: 0, rain: 0, snow: 0, mist: 0},
      rain: {wind: 0.55, cloud: 0.9, shade: 0, rain: 1, snow: 0, mist: 0.15},
      storm: {wind: 1.3, cloud: 1, shade: 0, rain: 1.5, snow: 0, mist: 0.1},
      snow: {wind: 0.4, cloud: 0.8, shade: 0, rain: 0, snow: 1, mist: 0.1},
      fog: {wind: 0.05, cloud: 0.5, shade: 0, rain: 0, snow: 0, mist: 1}
    };
    const cur = Object.assign({}, WX.clear), wxLight = {snowCover: 0, wet: 0, flash: 0, nextBolt: 4};
    const light = {tint: V3(1, 1, 1), night: 0, day: 1, sunCol: COL(0xffffff)};

    function sky(dt) {
      const W = WX[state.weather] || WX.clear, k = dt > 0 ? 1 - Math.exp(-dt / 2.5) : 1;
      for (const n in W) cur[n] = lerp(cur[n], W[n], k);
      const m = state.month, rise = mAt(RISE, m), set = mAt(SET, m), h = state.hour;
      // how high the sun is (1 at midday, 0 at the horizon, negative after dark)
      const mid = (rise + set) / 2, half = (set - rise) / 2;
      const e = Math.abs(h - mid) < half ? Math.sin(Math.PI / 2 * (1 - Math.abs(h - mid) / half)) : -Math.min(1, (Math.abs(h - mid) - half) / 1.4);
      const dayTint = new THREE.Vector3(1, 1, 1), gold = new THREE.Vector3(1.03, 0.83, 0.64), dusk = new THREE.Vector3(0.62, 0.5, 0.62), night = new THREE.Vector3(0.2, 0.25, 0.42);
      const t = new THREE.Vector3();
      if (e > 0) t.copy(gold).lerp(dayTint, sm(0.0, 0.3, e));
      else if (e > -0.45) t.copy(dusk).lerp(gold, sm(-0.45, 0, e));
      else t.copy(night).lerp(dusk, sm(-0.75, -0.45, e));
      const nightK = sm(0.05, -0.55, e);
      // clouds dim and grey the day; snow on the ground brightens it
      const dim = 1 - 0.3 * cur.cloud - 0.12 * Math.max(0, cur.rain - 1);
      t.multiplyScalar(dim).lerp(new THREE.Vector3(t.x, t.y, t.z).multiplyScalar(1.06).add(V3(0, 0.02, 0.06)), wxLight.snowCover * 0.4 * (1 - nightK));
      light.tint.copy(t); light.night = nightK; light.day = sm(-0.1, 0.25, e);
      const L = LOOKU;
      L.uTint.value.copy(t); L.uDesat.value = cl(0.12 * cur.cloud + 0.5 * nightK + (state.month >= 11 || state.month < 2 ? 0.08 : 0), 0, 0.75);
      L.uAmb.value.set(0.015, 0.018, 0.03).multiplyScalar(nightK);
      L.uNight.value = nightK;
      // a painting made for its season already shows it; the spring paintings are turned toward the month in code
      if (seasonal) { L.uSeason.value.set(0, 0, 0, 0); L.uFlowers.value = 1; } else { L.uSeason.value.set(mAt(DRY, m), mAt(FALL, m), mAt(BROWN, m), mAt(LUSH, m)); L.uFlowers.value = mAt(FLOW, m); }
      // snow builds up while it snows and melts slowly after; the ground dries after rain
      wxLight.snowCover = cl(wxLight.snowCover + dt * (cur.snow > 0.5 ? 0.05 : -0.012 * (state.month >= 11 || state.month < 2 ? 0.3 : 1)), 0, 1);
      wxLight.wet = cl(wxLight.wet + dt * (cur.rain > 0.3 ? 0.12 : cur.snow > 0.3 ? 0.02 : -0.02), 0, 1);
      if (dt === 0 && cur.rain > 0.3) wxLight.wet = 1;
      L.uSnow.value = wxLight.snowCover; L.uWet.value = wxLight.wet; L.uRain.value = Math.min(1, cur.rain);
      L.uMist.value = cur.mist * (0.35 + 0.65 * sm(-0.3, 0.1, e) * sm(0.6, 0.15, e)) + 0.25 * cur.mist;
      BU.uCloud.value = cur.cloud; AIRU.uFlow.value.w = cur.shade * light.day;
      AIRU.uWind.value.z = cur.wind;
      BU.uSky.value.setRGB(0.55 + 0.25 * light.day, 0.62 + 0.25 * light.day, 0.72 + 0.2 * light.day).multiplyScalar(1 - 0.4 * cur.cloud);
      // the lights on the things made in code follow the painting's
      const sunK = light.day * (1 - 0.6 * cur.cloud);
      sun.color.setRGB(t.x, t.y, t.z); sun.intensity = 0.55 * sunK + 0.18 * nightK;
      if (nightK > 0.5) sun.color.setRGB(0.55, 0.62, 0.9);
      hemi.color.setRGB(t.x * 0.95, t.y * 0.97, t.z); hemi.groundColor.setRGB(t.x * 0.55, t.y * 0.5, t.z * 0.38); hemi.intensity = 0.62 + 0.15 * cur.cloud;
      light.sunCol.setRGB(t.x, t.y, t.z);
      return e;
    }

    // ---------- glows: firelight on the painting and the point lights on the models ----------
    function glow(i, x, y, z, r, color, k) {
      const P = GLOWU.uGlowP.value[i], C = GLOWU.uGlowC.value[i];
      if (!r || !k) { P.w = 0; if (fires[i]) fires[i].intensity = 0; return; }
      P.set(x, y, z, r); const c = COL(color); C.set(c.r * k, c.g * k, c.b * k);
      if (fires[i]) { fires[i].position.set(x, y + 0.5, z); fires[i].color.copy(c); fires[i].intensity = k * (0.6 + 1.6 * light.night); fires[i].distance = r * 1.6; }
    }

    // ---------- particles ----------
    // an atlas of four sprites: a soft dot, a leaf, a streak of rain and a puff of smoke
    const atlas = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      let gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      g.save(); g.translate(96, 32); g.rotate(0.5); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, 11, 22, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(160,160,160,1)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 24); g.stroke(); g.restore();
      gr = g.createLinearGradient(0, 66, 0, 126); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,.95)'); g.fillStyle = gr; g.fillRect(30, 66, 4, 60);
      for (let i = 0; i < 26; i++) { const a = rnd() * TAU, d = rnd() * 15, r = 8 + rnd() * 12, x = 96 + Math.cos(a) * d, y = 96 + Math.sin(a) * d; gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      const t = new THREE.CanvasTexture(c); t.flipY = false; return t;
    })();
    const PSU = Object.assign({uAtlas: {value: atlas}, uScale: {value: 100}, uLight: {value: V3(1, 1, 1)}, uNightP: LOOKU.uNight}, AIRU, GLOWU);
    function particles(n, additive) {
      const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n), rot = new Float32Array(n), kind = new Float32Array(n);
      for (let i = 0; i < n; i++) pos[i * 3 + 1] = -999;
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aCol', new THREE.BufferAttribute(col, 4)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aRot', new THREE.BufferAttribute(rot, 1)); geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: PSU, transparent: true, depthWrite: false, depthTest: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        vertexShader: GLOW + 'attribute vec4 aCol; attribute float aSize, aRot, aKind; uniform float uScale, uNightP; uniform vec3 uLight; varying vec4 vCol; varying float vRot, vKind; varying vec3 vLit;\nvoid main(){ vCol = aCol; vRot = aRot; vKind = aKind; vLit = uLight + glowAt(position) * (.4 + 1.4 * uNightP); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_PointSize = aSize * uScale; }',
        fragmentShader: 'uniform sampler2D uAtlas; varying vec4 vCol; varying float vRot, vKind; varying vec3 vLit;\nvoid main(){ vec2 p = gl_PointCoord - .5; float c = cos(vRot), s = sin(vRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + .5; if (p.x < 0. || p.y < 0. || p.x > 1. || p.y > 1.) discard;\n vec2 cell = vec2(mod(vKind, 2.), floor(vKind / 2.)) * .5; vec4 t = texture2D(uAtlas, cell + p * .5); float a = t.a * vCol.a; if (a < .01) discard;\n gl_FragColor = vec4(vCol.rgb * t.rgb * ' + (additive ? '1.' : 'vLit') + ', a); }'
      });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = additive ? 20 : 10; scene.add(pts);
      const L = Array.from({length: n}, () => ({on: false, p: V3(), v: V3(), life: 0, max: 1, s: 0.1, s1: 0.1, c: [1, 1, 1, 1], a: 1, rot: 0, spin: 0, k: 0, kind: 0}));
      let next = 0;
      return {geo, L, n, emit(o) {
        let q = null; for (let j = 0; j < n; j++) { const c = L[(next + j) % n]; if (!c.on) { q = c; next = (next + j + 1) % n; break; } }
        if (!q) { q = L[next]; next = (next + 1) % n; }
        q.on = true; q.p.set(o.x, o.y, o.z); q.v.set(o.vx || 0, o.vy || 0, o.vz || 0); q.life = 0; q.max = o.life || 1; q.s = o.s || 0.1; q.s1 = o.s1 == null ? q.s : o.s1;
        q.c = o.c || [1, 1, 1]; q.a = o.a == null ? 1 : o.a; q.rot = o.rot == null ? rnd() * TAU : o.rot; q.spin = o.spin || 0; q.k = o.k || 0; q.kind = o.kind || 0; q.seed = rnd() * 100; return q;
      }};
    }
    const PN = particles(opts.maxParticles || 2600, false), PA = particles(700, true);
    // how each moves (k): 0 a leaf or petal fluttering down, 1 rain, 2 a mote drifting (pollen, ember), 3 smoke, 4 snow,
    // 5 a spark, 6 a splash, 7 a firefly, 8 dust
    function stepParticles(S, dt, t) {
      const W = AIRU.uWind.value, wx = W.x * W.z, wz = W.y * W.z;
      const pos = S.geo.attributes.position.array, col = S.geo.attributes.aCol.array, size = S.geo.attributes.aSize.array, rot = S.geo.attributes.aRot.array, kind = S.geo.attributes.aKind.array;
      for (let i = 0; i < S.n; i++) {
        const q = S.L[i];
        if (q.on) {
          q.life += dt; if (q.life >= q.max) q.on = false;
        }
        if (!q.on) { pos[i * 3 + 1] = -999; col[i * 4 + 3] = 0; continue; }
        const u = q.life / q.max, v = q.v, p = q.p;
        switch (q.k) {
          case 0: v.x += (wx * 2.2 - v.x) * dt * 1.5; v.z += (wz * 2.2 - v.z) * dt * 1.5; v.y = -0.55 - 0.25 * Math.sin(t * 3 + q.seed); p.x += Math.sin(t * 2.3 + q.seed) * dt * 0.6; q.rot += dt * (1.5 + Math.sin(q.seed) * 2);
            if (p.y <= 0.01) { p.y = 0.01; v.set(0, 0, 0); q.rot -= dt * 1.5; } break;
          case 1: if (p.y <= 0) { q.on = false; emitSplash(p.x, p.z); } break;
          case 2: v.x += (wx * 1.2 - v.x) * dt; v.z += (wz * 1.2 - v.z) * dt; v.y += (0.15 * Math.sin(t * 1.7 + q.seed) - v.y * 0.5) * dt; break;
          case 3: v.x += (wx * 1.6 - v.x) * dt * 0.6; v.z += (wz * 1.6 - v.z) * dt * 0.6; v.y *= 1 - dt * 0.25; break;
          case 4: v.x += (wx * 1.8 + Math.sin(t * 1.3 + q.seed) * 0.3 - v.x) * dt * 2; v.z += (wz * 1.8 - v.z) * dt * 2; if (p.y <= 0.01) { p.y = 0.01; v.set(0, 0, 0); } break;
          case 5: v.y -= 9 * dt; v.x += (wx - v.x) * dt; if (p.y < 0.02) { p.y = 0.02; v.multiplyScalar(0.2); } break;
          case 7: v.x += (Math.sin(t * 0.7 + q.seed * 3) * 0.35 - v.x) * dt; v.z += (Math.cos(t * 0.6 + q.seed * 5) * 0.35 - v.z) * dt; v.y += (Math.sin(t * 0.9 + q.seed) * 0.15 - v.y) * dt; break;
          case 8: v.x += (wx * 2.5 - v.x) * dt; v.z += (wz * 2.5 - v.z) * dt; v.y *= 1 - dt; break;
        }
        p.addScaledVector(v, dt);
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        // how big and how clear it is through its life
        let a = q.a, s = lerp(q.s, q.s1, u);
        if (q.k === 3) a *= sm(0, 0.12, u) * (1 - sm(0.45, 1, u));
        else if (q.k === 7) a *= Math.max(0, Math.sin(t * 2.2 + q.seed * 7)) ** 3 * sm(0, 0.1, u) * (1 - sm(0.85, 1, u));
        else if (q.k === 6) a *= 1 - u;
        else a *= sm(0, 0.06, u) * (1 - sm(0.8, 1, u));
        if (q.k === 2 && q.kind === 0) a *= 0.6 + 0.4 * Math.sin(t * 9 + q.seed * 5);
        col[i * 4] = q.c[0]; col[i * 4 + 1] = q.c[1]; col[i * 4 + 2] = q.c[2]; col[i * 4 + 3] = a;
        size[i] = s; rot[i] = q.k === 1 ? q.rot : q.rot; kind[i] = q.kind;
      }
      for (const n of ['position', 'aCol', 'aSize', 'aRot', 'aKind']) S.geo.attributes[n].needsUpdate = true;
    }
    function emitSplash(x, z) { if (rnd() < 0.5) PN.emit({x, y: 0.02, z, life: 0.28, s: 0.05, s1: 0.16, c: [0.8, 0.85, 0.9], a: 0.5, k: 6, kind: 0}); }
    const emit = o => (o.add ? PA : PN).emit(o);

    // what the camera sees of the ground, in metres
    const view = {cx: PW / 2, cy: PH / 2, w: PW, h: PH};
    function viewBox(m) {
      const x0 = (view.cx - view.w / 2) / K - (m || 0), x1 = (view.cx + view.w / 2) / K + (m || 0);
      const z0 = (view.cy - view.h / 2) / (K * SN) - (m || 0), z1 = (view.cy + view.h / 2) / (K * SN) + (m || 0) * 3;
      return [x0, x1, z0, z1];
    }
    // a pixel of the painting in view: one that is a leaf on a tree, for leaves to fall from
    function leafPixel() {
      for (let k = 0; k < 12; k++) {
        const x = view.cx + (rnd() - 0.5) * view.w, y = view.cy + (rnd() - 0.6) * view.h, X = Math.floor(x / 2), Y = Math.floor(y / 2);
        if (X < 0 || Y < 0 || X >= DW || Y >= DH) continue;
        const i = Y * DW + X, b = DP.D[i] * 4;
        if (b && mk[i * 4] > 200 && !mk[i * 4 + 3] && b - y > 40) return V3(x / K, (b - y) / (K * CS), b / (K * SN));
      }
      return null;
    }
    const weatherAcc = {rain: 0, snow: 0, leaf: 0, mote: 0, fly: 0, dust: 0};
    function weather(dt, t) {
      const [x0, x1, z0, z1] = viewBox(1), area = (x1 - x0) * (z1 - z0), m = state.month;
      // rain: drops from above the view, slanting with the wind
      weatherAcc.rain += dt * cur.rain * area * 9;
      while (weatherAcc.rain > 1) {
        weatherAcc.rain--; const x = rr(x0, x1), z = rr(z0, z1 + 4), y = rr(1, 7), W = AIRU.uWind.value;
        const vx = W.x * W.z * 3, vz = W.y * W.z * 3, vy = -11;
        const sp = toPaint(V3(vx, vy, vz)), ang = Math.atan2(sp[0], sp[1]) * -1;
        PN.emit({x, y, z, vx, vy, vz, life: y / 11 + 0.02, s: 0.42, c: [0.75, 0.8, 0.9], a: 0.36, rot: ang, k: 1, kind: 2});
      }
      weatherAcc.snow += dt * cur.snow * area * 2.2;
      while (weatherAcc.snow > 1) { weatherAcc.snow--; PN.emit({x: rr(x0 - 2, x1), y: rr(2, 7), z: rr(z0, z1 + 4), vy: -rr(0.5, 0.9), life: 12, s: rr(0.05, 0.11), c: [1, 1, 1], a: 0.9, k: 4, kind: 0}); }
      // falling leaves from the painted trees: in fall, and on any windy day
      const leafRate = (mAt(FALL, m) * 1.4 + mAt(BROWN, m) * 0.4 + 0.06) * (0.3 + cur.wind * 1.4) * area * 0.012;
      weatherAcc.leaf += dt * leafRate;
      while (weatherAcc.leaf > 1) {
        weatherAcc.leaf--; const p = leafPixel(); if (!p) continue;
        const fallK = mAt(FALL, m) + mAt(BROWN, m), c = fallK > 0.3 ? [[0.86, 0.42, 0.12], [0.75, 0.25, 0.08], [0.9, 0.7, 0.25], [0.55, 0.38, 0.2]][Math.floor(rnd() * 4)] : [0.45, 0.62, 0.22];
        PN.emit({x: p.x, y: p.y, z: p.z, life: rr(6, 10), s: rr(0.07, 0.11), c, a: 1, k: 0, kind: 1, spin: 1});
      }
      // pollen and seeds drifting in the sun
      weatherAcc.mote += dt * light.day * (1 - cur.cloud) * (m > 2.5 && m < 9 ? 1 : 0.2) * area * 0.02;
      while (weatherAcc.mote > 1) { weatherAcc.mote--; PA.emit({x: rr(x0, x1), y: rr(0.3, 2.5), z: rr(z0, z1), vx: 0.2, life: rr(4, 8), s: 0.045, c: [0.55, 0.52, 0.4], a: 0.5, k: 2, kind: 0}); }
      // fireflies on warm nights, low over the grass by the woods
      weatherAcc.fly += dt * light.night * (m > 3.5 && m < 8.5 ? 1 : 0) * (1 - Math.min(1, cur.rain)) * area * 0.035;
      while (weatherAcc.fly > 1) { weatherAcc.fly--; PA.emit({x: rr(x0, x1), y: rr(0.25, 1.4), z: rr(z0, z1), life: rr(5, 9), s: 0.14, c: [0.75, 1, 0.35], a: 1, k: 7, kind: 0}); }
      // dust off the trails in a hard dry wind
      weatherAcc.dust += dt * Math.max(0, cur.wind - 0.6) * mAt(DRY, m) * (1 - Math.min(1, cur.rain + cur.snow)) * area * 0.02;
      while (weatherAcc.dust > 1) { weatherAcc.dust--; PN.emit({x: rr(x0, x1), y: 0.1, z: rr(z0, z1), vy: 0.3, life: rr(1.5, 3), s: 0.4, s1: 1.4, c: [0.75, 0.66, 0.5], a: 0.22, k: 8, kind: 3}); }
      // lightning in a storm
      if (cur.rain > 1.1) { wxLight.nextBolt -= dt; if (wxLight.nextBolt < 0) { wxLight.flash = 1; wxLight.nextBolt = rr(5, 14); if (api.onThunder) setTimeout(() => api.onThunder(), 700 + rnd() * 1500); } }
      wxLight.flash = Math.max(0, wxLight.flash - dt * 3.5);
      const fl = wxLight.flash > 0.6 ? 1 : wxLight.flash > 0.3 ? 0.2 : wxLight.flash > 0.12 ? 0.7 : wxLight.flash;
      LOOKU.uFlash.value = fl * 0.6;
    }

    // ---------- the view: a box of the painting to show, in painting pixels ----------
    function setView(cx, cy, w, h) {
      view.w = w; view.h = h; view.cx = cl(cx, w / 2, PW - w / 2); view.cy = cl(cy, h / 2, PH - h / 2);
      if (w >= PW) view.cx = PW / 2; if (h >= PH) view.cy = PH / 2;
      camera.left = (view.cx - w / 2 - PW / 2) / K; camera.right = (view.cx + w / 2 - PW / 2) / K;
      camera.top = (PH / 2 - (view.cy - h / 2)) / K; camera.bottom = (PH / 2 - (view.cy + h / 2)) / K;
      camera.updateProjectionMatrix();
      PV.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const H = renderer.domElement.height || 1; PSU.uScale.value = H / (h / K);
    }
    // a point on the screen (in CSS pixels of the canvas) to the painting, and to the ground there
    function paintAt(cx, cy) {
      const r = renderer.domElement.getBoundingClientRect();
      return [view.cx - view.w / 2 + (cx - r.left) / r.width * view.w, view.cy - view.h / 2 + (cy - r.top) / r.height * view.h];
    }
    // the ground a painted pixel belongs to: its own spot, or where the thing painted there meets the ground
    function groundAt(px, py) {
      const X = Math.floor(px / 2), Y = Math.floor(py / 2); if (X < 0 || Y < 0 || X >= DW || Y >= DH) return [px, py];
      const b = DP.D[Y * DW + X] * 4; return b ? [px, b] : [px, py];
    }
    // a soft round shadow on the ground, for anything made in code to stand on
    const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const shadows = [];
    function shadow(target, rx, rz) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: shadowTex, transparent: true, depthWrite: false, color: 0x1a1e14}));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 1; scene.add(m);
      const S = {m, target, rx: rx || 0.35, rz: rz || 0.3, k: 1}; shadows.push(S); return S;
    }
    function dropShadow(S) { const i = shadows.indexOf(S); if (i >= 0) { shadows.splice(i, 1); scene.remove(S.m); S.m.geometry.dispose(); S.m.material.dispose(); } }
    function stepShadows() {
      for (const S of shadows) {
        const t = S.target; if (!t.visible) { S.m.visible = false; continue; }
        const p = t.getWorldPosition(V3()); S.m.visible = true;
        // short, down and to the right in the sun; longer and away from a fire at night
        let ox = 0.12, oz = 0.1, sx = 1, sz = 1;
        const g = GLOWU.uGlowP.value[0];
        if (light.night > 0.3 && g.w > 0) { const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz) || 1; ox = dx / d * 0.35 * light.night; oz = dz / d * 0.35 * light.night; sx = 1 + 0.6 * light.night; }
        S.m.position.set(p.x + ox * S.k, 0.012, p.z + oz * S.k); S.m.scale.set(S.rx * 2 * sx * S.k, S.rz * 2 * sz * S.k, 1);
        S.m.material.opacity = (0.35 + 0.65 * light.day * (1 - 0.6 * cur.cloud) + 0.4 * light.night) * Math.min(1, 1 / Math.max(0.6, 1 + (t.userData.lift || 0)));
      }
    }

    // ---------- every frame ----------
    let lastT = 0;
    function update(t, dt) {
      AIRU.uT.value = t;
      const W = AIRU.uWind.value, F = AIRU.uFlow.value;
      F.x += W.x * (0.6 + W.z * 2.2) * dt; F.y += W.y * (0.6 + W.z * 2.2) * dt; F.z += (0.15 + W.z * 0.9) * dt;
      sky(dt);
      PSU.uLight.value.copy(light.tint).multiplyScalar(1).addScalar(0.05);
      weather(dt, t);
      stepParticles(PN, dt, t); stepParticles(PA, dt, t);
      stepShadows();
      lastT = t;
    }
    function resize(w, h) { renderer.setSize(w, h, false); setView(view.cx, view.cy, view.w, view.h); }
    function render() { PV.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); renderer.render(scene, camera); }

    const api = {
      renderer, scene, camera, root: rootG, K, SN, CS, size: [PW, PH], get trace() { return T; }, get depth() { return DP; }, get mask() { return mk; }, get paintTex() { return paintTex; },
      // a different place, or the same place's painting for another season (season true when the painting is made for it)
      setPlace(trace, img, season) { const moved = T !== trace; T = trace; seasonal = !!season; makeMaps(img); if (moved) for (const P of [PN, PA]) for (const q of P.L) q.on = false; BU.uPaint.value = paintTex; BU.uDepth.value = depthTex; BU.uMask.value = maskTex; wxLight.snowCover = Math.min(wxLight.snowCover, 1); },
      get seasonal() { return seasonal; },
      toWorld, toPaint, paintAt, groundAt, setView, view, viewBox, resize, update, render, glow, emit, shadow, dropShadow, light, sun, hemi,
      // is the ground at a painting pixel open, or does something stand there (by the depth map)
      standsAt(px, py) { const X = Math.floor(px / 2), Y = Math.floor(py / 2); return X >= 0 && Y >= 0 && X < DW && Y < DH ? DP.D[Y * DW + X] * 4 : 0; },
      uniforms: {AIRU, LOOKU, GLOWU, BU}, chunks: {NOISE, AIR, GLOW, LOOK}, rnd,
      setHour(h) { state.hour = ((h % 24) + 24) % 24; }, get hour() { return state.hour; },
      setMonth(m) { state.month = ((m % 12) + 12) % 12; }, get month() { return state.month; },
      setWeather(w) { if (WX[w]) state.weather = w; }, get weather() { return state.weather; }, get wx() { return cur; }, wxLight,
      setWind(dirDeg) { const a = dirDeg * Math.PI / 180; AIRU.uWind.value.x = Math.cos(a); AIRU.uWind.value.y = Math.sin(a); },
      setDebug(on) { BU.uDebug.value = on ? 1 : 0; },
      settle() { sky(0); for (let i = 0; i < 40; i++) sky(0.5); },
      onThunder: null
    };
    return api;
  }
  root.makeStage = makeStage;
})(typeof window !== 'undefined' ? window : globalThis);
