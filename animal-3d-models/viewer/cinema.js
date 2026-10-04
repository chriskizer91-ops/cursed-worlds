// cinema.js is copied as it was from envoi-on-the-longest-night, 3d-model-main-characters/io/cinema.js (October 4, 2026).
// It is used here for the envoi look of Henry (viewer/henry-motion.js). Nothing in it is changed.
// cinema.js: the field study's camera, as a film camera sees: the scene rendered in high dynamic range with 4x
// multisampling, then depth of field with round bokeh (focus, aperture), bloom from everything bright, shafts of
// moonlight through the mist, and a film grade (an ACES curve, lift and gain, a cool-shadow / warm-light split, a
// vignette, a touch of lens fringing, and grain). three.js r128 (global THREE). Defines makeCinema(renderer, opts) only.
// Returns { render(scene, camera, dt), setSize(w, h), set({ focus, aperture, exposure, ... }), params, sun(dir) }.
// opts: { scale (the 3D's resolution against the canvas, default 1), msaa (default 4), quality: 'high' | 'max' }.
function makeCinema(renderer, opts) {
  'use strict';
  opts = opts || {};
  const gl2 = renderer.capabilities.isWebGL2;
  const HF = THREE.HalfFloatType, LIN = THREE.LinearFilter;
  const P = {
    focus: 12, aperture: 1, maxBlur: 14, exposure: 1.25, bloom: .45, bloomRadius: 1, rays: .3, grain: .035, vignette: .32,
    fringe: .0016, lift: new THREE.Vector3(-.012, -.012, -.004), gain: new THREE.Vector3(1.03, 1.02, 1), saturation: .95, split: .1,
    bars: 0, fade: 1, flash: 0, flashC: new THREE.Color(1, 1, 1), dof: true, scale: opts.scale || 1
  };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.frustumCulled = false; qs.add(quad);
  const VS = 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const mat = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
  const rt = (w, h, o) => new THREE.WebGLRenderTarget(w, h, Object.assign({ type: HF, minFilter: LIN, magFilter: LIN, depthBuffer: false, stencilBuffer: false }, o));
  function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(qs, qc); }

  // ---------- targets ----------
  let W = 2, H = 2, main = null, half = [], blm = [], rays = [];
  const depthTex = () => { const d = new THREE.DepthTexture(2, 2, THREE.UnsignedIntType); d.format = THREE.DepthFormat; return d; };
  function build(w, h) {
    for (const t of [main, ...half, ...blm, ...rays]) if (t) { if (t.depthTexture) t.depthTexture.dispose(); t.dispose(); }
    W = Math.max(2, Math.round(w)); H = Math.max(2, Math.round(h));
    if (gl2 && (opts.msaa === undefined || opts.msaa > 0)) { main = new THREE.WebGLMultisampleRenderTarget(W, H, { type: HF, minFilter: LIN, magFilter: LIN, stencilBuffer: false }); main.samples = opts.msaa || 4; }
    else main = new THREE.WebGLRenderTarget(W, H, { type: HF, minFilter: LIN, magFilter: LIN, stencilBuffer: false });
    main.depthTexture = depthTex(); main.depthTexture.image.width = W; main.depthTexture.image.height = H;
    const hw = Math.max(2, W >> 1), hh = Math.max(2, H >> 1);
    half = [rt(hw, hh), rt(hw, hh), rt(W, H)];        // CoC prefiltered, bokeh, composited full size
    blm = []; let bw = hw, bh = hh; for (let i = 0; i < 6; i++) { blm.push(rt(bw, bh)); bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); }
    blm.up = blm.map((t) => rt(t.width, t.height));
    rays = [rt(Math.max(2, W >> 2), Math.max(2, H >> 2)), rt(Math.max(2, W >> 2), Math.max(2, H >> 2))];
  }

  // ---------- shaders ----------
  const DEPTH = 'uniform sampler2D tDepth; uniform float uNear, uFar;\nfloat linZ(vec2 uv){ float d = texture2D(tDepth, uv).x; float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }\n';
  // the circle of confusion, signed (negative in front of focus), in half-resolution pixels; the colour premultiplied
  const cocM = mat('uniform sampler2D tColor; uniform float uFocus, uAp, uMax; uniform vec2 uTx;\n' + DEPTH +
    'varying vec2 vUv;\nfloat coc(vec2 uv){ float z = linZ(uv); return clamp(uAp * (z - uFocus) / max(z, .001) * 12., -uMax, uMax); }\n' +
    'void main(){ vec3 c = vec3(0.); float cc = 0.; vec2 o = uTx * .5;\n' +
    ' vec2 s[4]; s[0] = vec2(-o.x, -o.y); s[1] = vec2(o.x, -o.y); s[2] = vec2(-o.x, o.y); s[3] = vec2(o.x, o.y);\n' +
    ' float mn = 1e4, mx = -1e4; for (int i = 0; i < 4; i++) { vec3 t = texture2D(tColor, vUv + s[i]).rgb; float k = coc(vUv + s[i]); c += t / (1. + max(max(t.r, t.g), t.b) * .1); mn = min(mn, k); mx = max(mx, k); cc += k; }\n' +
    ' cc *= .25; float k = abs(mn) > abs(mx) ? mn : cc; gl_FragColor = vec4(c * .25, k); }',
    { tColor: { value: null }, tDepth: { value: null }, uNear: { value: .1 }, uFar: { value: 1000 }, uFocus: { value: 10 }, uAp: { value: 1 }, uMax: { value: 14 }, uTx: { value: new THREE.Vector2() } });
  // the bokeh: a golden-angle spiral of samples, each counted where its own blur reaches this pixel (Dennis Gustafsson's
  // single-pass method), so blur from in front spills over sharp things behind and never the other way
  const bokM = mat('uniform sampler2D tCoc; uniform vec2 uTx; uniform float uMax;\nvarying vec2 vUv;\n' +
    'void main(){ vec4 cen = texture2D(tCoc, vUv); float cs = abs(cen.a); vec3 col = cen.rgb; float tot = 1.; float r = 1.1; float a = 0.;\n' +
    ' for (int i = 0; i < 110; i++) { if (r > uMax) break; vec2 tc = vUv + vec2(cos(a), sin(a)) * uTx * r; vec4 s = texture2D(tCoc, tc); float ss = abs(s.a);\n' +
    '  if (s.a > cen.a) ss = clamp(ss, 0., cs * 2.); float m = smoothstep(r - .5, r + .5, ss); col += mix(col / tot, s.rgb, m); tot += 1.; r += 1.1 / r; a += 2.39996323; }\n' +
    ' col /= tot; col = col / max(1. - max(max(col.r, col.g), col.b) * .1, .1); gl_FragColor = vec4(col, cen.a); }',
    { tCoc: { value: null }, uTx: { value: new THREE.Vector2() }, uMax: { value: 14 } });
  // composite: sharp where in focus, the bokeh where blurred
  const dofM = mat('uniform sampler2D tColor, tBok; uniform float uOn; uniform vec2 uTxH;\nvarying vec2 vUv;\n' +
    'void main(){ vec3 c = texture2D(tColor, vUv).rgb; vec4 b = texture2D(tBok, vUv); float k = smoothstep(.6, 1.8, abs(b.a)) * uOn; gl_FragColor = vec4(mix(c, b.rgb, k), 1.); }',
    { tColor: { value: null }, tBok: { value: null }, uOn: { value: 1 }, uTxH: { value: new THREE.Vector2() } });
  // bloom: a soft threshold, then down (13 taps) and up (a tent) through a chain of halving targets
  const preM = mat('uniform sampler2D tSrc; uniform float uThr, uKnee; uniform vec2 uTx;\nvarying vec2 vUv;\n' +
    'void main(){ vec3 c = texture2D(tSrc, vUv).rgb * .5 + (texture2D(tSrc, vUv + uTx * vec2(1., 1.)).rgb + texture2D(tSrc, vUv - uTx).rgb + texture2D(tSrc, vUv + uTx * vec2(1., -1.)).rgb + texture2D(tSrc, vUv + uTx * vec2(-1., 1.)).rgb) * .125;\n' +
    ' float br = max(max(c.r, c.g), c.b); float rq = clamp(br - uThr + uKnee, 0., 2. * uKnee); rq = rq * rq / (4. * uKnee + 1e-4); float w = max(rq, br - uThr) / max(br, 1e-4);\n' +
    ' gl_FragColor = vec4(min(c * w, vec3(60.)), 1.); }',
    { tSrc: { value: null }, uThr: { value: .9 }, uKnee: { value: .6 }, uTx: { value: new THREE.Vector2() } });
  const downM = mat('uniform sampler2D tSrc; uniform vec2 uTx;\nvarying vec2 vUv;\n#define S(x,y) texture2D(tSrc, vUv + uTx * vec2(x,y)).rgb\n' +
    'void main(){ vec3 a = S(-2.,-2.), b = S(0.,-2.), c = S(2.,-2.), d = S(-1.,-1.), e = S(1.,-1.), f = S(-2.,0.), g = S(0.,0.), h = S(2.,0.), i = S(-1.,1.), j = S(1.,1.), k = S(-2.,2.), l = S(0.,2.), m = S(2.,2.);\n' +
    ' vec3 o = (d + e + i + j) * .125 + (a + b + g + f) * .03125 + (b + c + h + g) * .03125 + (f + g + l + k) * .03125 + (g + h + m + l) * .03125; gl_FragColor = vec4(o, 1.); }',
    { tSrc: { value: null }, uTx: { value: new THREE.Vector2() } });
  const upM = mat('uniform sampler2D tSrc, tLow; uniform vec2 uTx; uniform float uR;\nvarying vec2 vUv;\n#define S(x,y) texture2D(tLow, vUv + uTx * uR * vec2(x,y)).rgb\n' +
    'void main(){ vec3 t = (S(-1.,-1.) + S(1.,-1.) + S(-1.,1.) + S(1.,1.)) + (S(0.,-1.) + S(-1.,0.) + S(1.,0.) + S(0.,1.)) * 2. + S(0.,0.) * 4.; gl_FragColor = vec4(texture2D(tSrc, vUv).rgb + t / 16., 1.); }',
    { tSrc: { value: null }, tLow: { value: null }, uTx: { value: new THREE.Vector2() }, uR: { value: 1 } });
  // moonlight shafts: what of the sky shows near the moon, smeared out from it in a long radial blur
  const rayMaskM = mat('uniform sampler2D tColor; uniform vec2 uSun; uniform float uAsp;\n' + DEPTH + 'varying vec2 vUv;\n' +
    'void main(){ float d = texture2D(tDepth, vUv).x; float sky = step(.9999995, d); vec3 c = texture2D(tColor, vUv).rgb; vec2 q = (vUv - uSun) * vec2(uAsp, 1.);\n' +
    ' float near = exp(-dot(q, q) * 9.); gl_FragColor = vec4(min(c, vec3(4.)) * sky * near, 1.); }',
    { tColor: { value: null }, tDepth: { value: null }, uNear: { value: .1 }, uFar: { value: 1000 }, uSun: { value: new THREE.Vector2(.5, .5) }, uAsp: { value: 1 } });
  const rayM = mat('uniform sampler2D tSrc; uniform vec2 uSun; uniform float uLen;\nvarying vec2 vUv;\n' +
    'void main(){ vec2 d = (uSun - vUv) * uLen / 40.; vec2 p = vUv; vec3 s = vec3(0.); float w = 1.; for (int i = 0; i < 40; i++) { s += texture2D(tSrc, p).rgb * w; w *= .955; p += d; } gl_FragColor = vec4(s / 14., 1.); }',
    { tSrc: { value: null }, uSun: { value: new THREE.Vector2(.5, .5) }, uLen: { value: .8 } });
  // the grade, to the screen
  const finM = mat('uniform sampler2D tSrc, tBloom, tRays; uniform float uExp, uBloom, uRays, uGrain, uVig, uFringe, uSat, uSplit, uTime, uBars, uFade, uFlash; uniform vec3 uLift, uGain, uFlashC; uniform vec2 uRes;\nvarying vec2 vUv;\n' +
    'vec3 aces(vec3 x){ const mat3 A = mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777); const mat3 B = mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);\n' +
    ' x = A * x; vec3 a = x * (x + .0245786) - .000090537; vec3 b = x * (.983729 * x + .4329510) + .238081; return clamp(B * (a / b), 0., 1.); }\n' +
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
    'void main(){ vec2 c = vUv - .5; float r2 = dot(c, c); vec2 f = c * uFringe * (1. + r2 * 4.);\n' +
    ' vec3 col = vec3(texture2D(tSrc, vUv + f).r, texture2D(tSrc, vUv).g, texture2D(tSrc, vUv - f).b);\n' +
    ' col += texture2D(tBloom, vUv).rgb * uBloom * .055 + texture2D(tRays, vUv).rgb * uRays;\n' +
    ' col = mix(col, uFlashC * 3., uFlash);\n' +
    ' col *= uExp; col = aces(col);\n' +
    ' float l = dot(col, vec3(.2126, .7152, .0722)); col = mix(vec3(l), col, uSat);\n' +
    ' col = col + (vec3(-.03, -.006, .04) * (1. - smoothstep(0., .45, l)) + vec3(.03, .012, -.03) * smoothstep(.35, 1., l)) * uSplit * 3.;\n' +
    ' col = uLift + col * (uGain - uLift);\n' +
    ' col *= mix(1., smoothstep(1.15, .25, sqrt(r2) * 1.4), uVig);\n' +
    ' col = pow(max(col, 0.), vec3(1. / 2.2));\n' +
    ' float g = hash(vUv * uRes + fract(uTime * 7.3) * 91.) - .5; col += g * uGrain * (1.2 - l);\n' +
    ' col += (hash(vUv * uRes + 3.1) - .5) / 255.;\n' +
    ' col *= uFade; if (abs(vUv.y - .5) > .5 - uBars) col = vec3(0.);\n' +
    ' gl_FragColor = vec4(col, 1.); }',
    { tSrc: { value: null }, tBloom: { value: null }, tRays: { value: null }, uExp: { value: 1 }, uBloom: { value: 1 }, uRays: { value: .5 }, uGrain: { value: .03 }, uVig: { value: .3 }, uFringe: { value: .002 },
      uSat: { value: 1 }, uSplit: { value: .1 }, uTime: { value: 0 }, uBars: { value: 0 }, uFade: { value: 1 }, uFlash: { value: 0 }, uLift: { value: new THREE.Vector3() }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uFlashC: { value: new THREE.Color() }, uRes: { value: new THREE.Vector2() } });

  // ---------- frame ----------
  const sunDir = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), size = new THREE.Vector2();
  let time = 0;
  function render(scene, camera, dt) {
    time += dt || 0;
    renderer.getDrawingBufferSize(size);
    const tw = Math.round(size.x * P.scale), th = Math.round(size.y * P.scale);
    if (!main || tw !== W || th !== H) build(tw, th);
    const tm = renderer.toneMapping, enc = renderer.outputEncoding; renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(main); renderer.clear(); renderer.render(scene, camera);
    const near = camera.near, far = camera.far;
    // depth of field
    let src = main.texture;
    if (P.dof && P.aperture > .01) {
      const u = cocM.uniforms; u.tColor.value = main.texture; u.tDepth.value = main.depthTexture; u.uNear.value = near; u.uFar.value = far; u.uFocus.value = P.focus; u.uAp.value = P.aperture; u.uMax.value = P.maxBlur; u.uTx.value.set(1 / W, 1 / H);
      pass(cocM, half[0]);
      bokM.uniforms.tCoc.value = half[0].texture; bokM.uniforms.uTx.value.set(1 / half[0].width, 1 / half[0].height); bokM.uniforms.uMax.value = P.maxBlur; pass(bokM, half[1]);
      dofM.uniforms.tColor.value = main.texture; dofM.uniforms.tBok.value = half[1].texture; dofM.uniforms.uOn.value = 1; pass(dofM, half[2]);
      src = half[2].texture;
    }
    // bloom
    preM.uniforms.tSrc.value = src; preM.uniforms.uTx.value.set(1 / W, 1 / H); pass(preM, blm[0]);
    for (let i = 1; i < blm.length; i++) { downM.uniforms.tSrc.value = blm[i - 1].texture; downM.uniforms.uTx.value.set(1 / blm[i - 1].width, 1 / blm[i - 1].height); pass(downM, blm[i]); }
    let low = blm[blm.length - 1];
    for (let i = blm.length - 2; i >= 0; i--) { const u = upM.uniforms; u.tSrc.value = blm[i].texture; u.tLow.value = low.texture; u.uTx.value.set(1 / low.width, 1 / low.height); u.uR.value = P.bloomRadius; pass(upM, blm.up[i]); low = blm.up[i]; }
    // moonlight shafts, when the moon is in front
    let raysOn = 0;
    _v.copy(sunDir).multiplyScalar(far * .5).add(camera.position).project(camera);
    const behind = new THREE.Vector3().copy(sunDir).dot(camera.getWorldDirection(new THREE.Vector3())) < .05;
    if (P.rays > 0 && !behind) {
      const sx = _v.x * .5 + .5, sy = _v.y * .5 + .5; raysOn = P.rays * (1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(_v.x), Math.abs(_v.y)), .9, 1.8));
      if (raysOn > .01) {
        const m = rayMaskM.uniforms; m.tColor.value = main.texture; m.tDepth.value = main.depthTexture; m.uNear.value = near; m.uFar.value = far; m.uSun.value.set(sx, sy); m.uAsp.value = W / H; pass(rayMaskM, rays[0]);
        rayM.uniforms.tSrc.value = rays[0].texture; rayM.uniforms.uSun.value.set(sx, sy); pass(rayM, rays[1]);
      }
    }
    const u = finM.uniforms;
    u.tSrc.value = src; u.tBloom.value = low.texture; u.tRays.value = rays[1].texture; u.uRays.value = raysOn;
    u.uExp.value = P.exposure; u.uBloom.value = P.bloom; u.uGrain.value = P.grain; u.uVig.value = P.vignette; u.uFringe.value = P.fringe; u.uSat.value = P.saturation; u.uSplit.value = P.split;
    u.uTime.value = time; u.uBars.value = P.bars; u.uFade.value = P.fade; u.uFlash.value = P.flash; u.uFlashC.value.copy(P.flashC); u.uLift.value.copy(P.lift); u.uGain.value.copy(P.gain); u.uRes.value.set(size.x, size.y);
    pass(finM, null);
    renderer.toneMapping = tm; renderer.outputEncoding = enc;
  }
  return {
    render, params: P,
    set(o) {
      for (const k in o) {
        if (!(k in P)) continue;
        const v = o[k], cur = P[k];
        if (cur && cur.isVector3 && Array.isArray(v)) cur.fromArray(v); else if (cur && cur.isColor && Array.isArray(v)) cur.setRGB(v[0], v[1], v[2]);
        else if (cur && cur.copy && v && v.copy) cur.copy(v); else P[k] = v;
      }
    },
    sun(dir) { sunDir.copy(dir).normalize(); },
    get size() { return { w: W, h: H }; },
    dispose() { for (const t of [main, ...half, ...blm, ...(blm.up || []), ...rays]) if (t) t.dispose(); }
  };
}
