// henry-meadow.js: the pasture round Henry, at night under a big moon or at dusk, drawn the way envoi draws its wild meadow
// in Colossus in the Meadow (envoi-on-the-longest-night, living-battlefields/field.js, makeLivingField, at commit 5439f2c;
// much of the code below is that file's, changed for a camera that moves and for a Texas pasture):
//   - one wind for everything: it wanders, gusts roll across the grass, the clouds and their shadows drift with it, and
//     Henry's body and his landings push the grass aside;
//   - grass painted into an atlas of four kinds of tuft (with mipmaps that keep their cover far off), each tuft stood up on a
//     card that bends with the wind from its root and catches the moon from behind;
//   - a painted turf ground, worn bare along the cattle's trail and trampled round the hay, with cloud shadows passing over;
//   - a forest of painted tree cards round the pasture (Texas trees: post oaks, cedars, mesquite, a cottonwood, brush and a
//     dead tree), shaded inside their crowns, rimmed with moonlight on the moon's side and lost in haze far off, mist at
//     their feet, and a gap toward the moon;
//   - the sky: a big moon with darker seas and a halo, stars, clouds drifting over it, and low hills far off (at dusk the sun
//     going down behind them);
//   - mist in soft layers, fireflies, and two old trees whose crowns sway.
// The Colossus page never moves its camera, so it paints everything far off once into one picture. Henry's camera goes round
// him, so here it is all live, and the cards turn to face the camera as it goes.
// Its colors are the Colossus page's own as they look on screen, taken back through envoi's film curve (cinema.js: exposure,
// then an ACES curve), so they come out the same after it.
// The sky, the light, the wind, the grass's material and the painted textures come from the land kit (land-kit.js), which
// the ranch uses too; what is here is this pasture's own.
// three.js r128 (global THREE). Defines makeHenryMeadow(renderer, scene, opts).
// opts: { time: 'day' | 'dusk' | 'night', pathR (the cattle trail's radius; 3.2), seed }
// Returns { time, night, exposure, aperture, bloom, rays, vignette (the film camera's settings for the hour), discDir (where
//   the moon or the sun is), lightDir (where its light comes from), key (that light), dust (a color for dust),
//   update(dt, t, henry, camPos), ring(x, z, s) (a push through the grass and the mist, from a landing), stats, dispose() }.
(function (root) {
  'use strict';
  function makeHenryMeadow(renderer, scene, opts) {
    opts = opts || {};
    const K = root.makeLandKit(renderer, {time: opts.time, seed: opts.seed || 610091, maz: 2.45});
    const {rnd, rr, cl, lerp, sm, V3, own, P, E, GL2, LIN, LINV, UNF, SC, UNFILM, EXPU, MAZ, LIGHT, angTo, AIRU, AIR, CSH, A2C, TREECELL} = K;
    const TAU = Math.PI * 2, PI = Math.PI, TIME = K.time, NIGHT = K.night, DAY = K.day, pathR = opts.pathR || 3.2;
    const groundTex = K.groundTex, treeTex = K.treeTex, leafTex = K.leafTex, barkTex = K.barkTex, mistTex = K.mistTex;

    // ---------- the sky, and the light: the hour's sky and ground, the moon (or the sun) and a warm fill from where you stand ----------
    K.sky(scene);
    const {key, fill} = K.lights(scene, {shadow: 3.2});

    // ---------- the ground: turf, worn to bare earth along the cattle's trail and trampled round the hay ----------
    const groundM = own(new THREE.MeshStandardMaterial({map: groundTex, roughness: .96, color: LIN(P.ground), envMapIntensity: .3}));
    groundM.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, AIRU, {uPathR: {value: pathR}, uDirt: {value: LIN(NIGHT ? '#6a6050' : DAY ? '#a08a66' : '#8a7458')}});
      sh.vertexShader = 'varying vec2 vGp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGp = (modelMatrix * vec4(position, 1.)).xz;');
      sh.fragmentShader = 'varying vec2 vGp; uniform float uPathR; uniform vec3 uDirt;\n' + AIR + CSH + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' +
        ' { float gr = length(vGp), n = mn(vGp * .9), tr = exp(-pow((gr - uPathR) / .42, 2.)) * (.8 + .5 * mn(vGp * 2.3)), hay = 1. - smoothstep(1.4, 3.6, length(vGp / vec2(1.6, 1.9)));\n' +
        '  diffuseColor.rgb = mix(diffuseColor.rgb, uDirt * (.75 + .5 * n), clamp(max(tr * 1.1, hay * .8) - .1, 0., 1.) * .9);\n' +
        // the gusts brighten the far grass as they roll over it, and the clouds' shadows drift across
        '  diffuseColor.rgb *= (1. + .3 * gustAt(vGp) * uWind.z * smoothstep(8., 30., gr)) * (1. - .35 * cshade(vGp)); }');
    };
    groundM.customProgramCacheKey = () => 'hm-ground';
    const groundG = own(new THREE.CircleGeometry(300, 96));
    const ground = new THREE.Mesh(groundG, groundM); ground.rotation.x = -PI / 2; ground.receiveShadow = true; scene.add(ground);

    // the edge of the trees round the pasture, with bays and points, and pushed back in the gap toward the moon
    const edgeR = a => 84 + 8 * Math.sin(a * 3 + 1) + 5 * Math.sin(a * 7 + 2.3) + 3 * Math.sin(a * 13) + 30 * (1 - sm(.3, .62, angTo(a)));

    // ---------- the grass: tufts on cards that turn to face the camera, bend from their roots with the wind and catch the
    // moon from behind (the Colossus page's grass, the same in every way but the turning) ----------
    // what grows where: nothing under the hay, the trail worn bare, short trampled grass in the clearing round it, and tall
    // pasture grass beyond, thinning and coarser toward the trees; some gone to seed, some in flower
    function tuftAt(x, z) {
      const r = Math.hypot(x, z), hay = Math.hypot(x / 1.6, z / 1.9); if (hay < 1.25) return null;
      const trail = Math.exp(-(((r - pathR) / .45) ** 2)); if (trail > .5 && rnd() < .85) return null;
      const tall = sm(7, 11, r), fl = rnd(), big = 1 + Math.max(0, r - 14) / 24;
      let H = lerp(rr(.07, .2), rr(.36, .8), tall) * (1 - .6 * trail) * (hay < 2.4 ? .6 : 1);
      const W = (H * rr(.9, 1.5) + .1) * big; H *= Math.sqrt(big);
      return {x, z, r, H, W, yaw: rr(-.5, .5), cell: fl < .06 ? 2 : fl < .16 ? 1 : fl < .3 * (1 - tall) + .05 ? 3 : 0};
    }
    const grassM = K.grassMat(), grassMeshes = [];
    let nTufts = 0;
    {
      const chunks = new Map();
      for (let r = 1.2; r < 118;) {
        const s = .2 + r * .018, n = Math.max(6, Math.round(TAU * r / s)), a0 = rnd() * TAU;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i + rr(-.4, .4)) / n * TAU, rj = r + rr(-.5, .5) * s, x = Math.sin(a) * rj, z = Math.cos(a) * rj;
          if (rnd() > (rj < 7 ? .42 : .75 * (1 - .55 * sm(20, 70, rj)))) continue;
          if (rj > edgeR(Math.atan2(x, z)) - 4) continue;
          const t = tuftAt(x, z); if (!t) continue;
          const key = ((((Math.atan2(x, z) + PI) / TAU * 16) | 0) % 16) * 8 + (rj < 9 ? 0 : rj < 22 ? 1 : rj < 40 ? 2 : 3);
          if (!chunks.has(key)) chunks.set(key, []); chunks.get(key).push(t);
        }
        r += s;
      }
      for (const list of chunks.values()) {
        let cx = 0, cz = 0; for (const t of list) { cx += t.x; cz += t.z; } cx /= list.length; cz /= list.length;
        const Pp = [], UV = [], N = [], R = [], C = [], I = [];
        for (const t of list) {
          const S = t.r > 20 ? 1 : 3, b = Pp.length / 3;
          for (let j = 0; j <= S; j++) for (let s = 0; s <= 1; s++) { const h = j / S; Pp.push(t.x - cx, t.H * h, t.z - cz); UV.push((t.cell + s) * .25, h); N.push(0, 1, 0); R.push(t.x, t.z, t.H, t.yaw); C.push((s ? 1 : -1) * t.W / 2, h); }
          for (let j = 0; j < S; j++) { const c = b + j * 2; I.push(c, c + 1, c + 2, c + 1, c + 3, c + 2); }
        }
        const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        g.setAttribute('aRoot', new THREE.Float32BufferAttribute(R, 4)); g.setAttribute('aCard', new THREE.Float32BufferAttribute(C, 2)); g.setIndex(I);
        g.computeBoundingSphere(); g.boundingSphere.radius += 2;
        const mesh = new THREE.Mesh(g, grassM); mesh.position.set(cx, 0, cz); mesh.receiveShadow = true; scene.add(mesh); grassMeshes.push(mesh);
        nTufts += list.length;
      }
    }
    // ---------- the trees round the pasture: painted cards that turn to face the camera, many deep, hazier further off ----------
    // R holds a tree's own shading, so the near trees show their crowns' depth and the far ones are flat in the haze; the
    // side of each shape toward the moon catches a rim of its light, and the faces it shines on light up; mist lies at
    // their feet
    const forestU = Object.assign({
      uMap: {value: treeTex}, uTree: {value: SC(P.tree)}, uDeep: {value: SC(P.deep)}, uRim: {value: SC(P.rim)}, uLit: {value: SC(P.lit)}, uHazeC: {value: SC(P.haze)}, uMist: {value: SC(P.mist)},
      uMoonD: {value: LIGHT}, uHazeN: {value: NIGHT ? 55 : DAY ? 40 : 50}, uHazeF: {value: NIGHT ? 250 : DAY ? 320 : 220}, uLitK: {value: P.litK || .5}, uFeet: {value: P.feetMist == null ? .62 : P.feetMist},
    }, EXPU);
    let nTrees = 0;
    const forest = (() => {
      const Pp = [], CO = [], SZ = [], CE = [], AD = [], I = [];
      const tr = [];
      // a few trees alone out in the pasture, as Texas pastures have them
      for (let n = 0; n < 12; n++) { const a = rnd() * TAU; if (angTo(a) < .5) continue; const r = rr(38, 66), kind = [7, 7, 2, 3, 0, 7, 2, 3][(rnd() * 8) | 0]; tr.push({x: Math.sin(a) * r, z: Math.cos(a) * r, kind}); }
      // the edge of the trees and the woods behind it
      for (let n = 0; n < 30000 && tr.length < 1100; n++) {
        const a = rnd() * TAU, e = edgeR(a), deep = Math.pow(rnd(), 1.5) * 80, r = e - 2 + deep, gap = 1 - sm(.3, .62, angTo(a));
        if (rnd() > 1.1 - deep / 95 - gap * .75) continue;
        const kind = deep < 5 && rnd() < .4 ? 6 : rnd() < .4 ? (rnd() < .5 ? 2 : 3) : rnd() < .04 ? 4 : rnd() < .05 ? 5 : rnd() < .16 ? 7 : rnd() < .5 ? 0 : 1;
        tr.push({x: Math.sin(a) * r, z: Math.cos(a) * r, kind});
      }
      for (const t of tr) {
        const k = t.kind, H = (k === 6 ? rr(2.5, 4.5) : k === 7 ? rr(4, 7) : k === 5 ? rr(14, 20) : k === 4 ? rr(7, 11) : k === 2 || k === 3 ? rr(5, 9.5) : rr(8, 12.5)) * rr(.9, 1.1);
        const W = H * (k === 6 ? 2.6 : k === 7 ? 1.55 : k === 5 ? .78 : k === 4 ? .8 : k === 2 || k === 3 ? .55 : 1.25) * rr(.85, 1.15), b = Pp.length / 3, cc = TREECELL[k], flip = rnd() < .5 ? 1 : 0, shade = rr(.85, 1.1);
        for (const [sx, sy] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { Pp.push(t.x, 0, t.z); CO.push(sx, sy); SZ.push(W, H); CE.push(cc[0] * .25, (1 - cc[1]) * .5, .25, .5); AD.push(shade, flip); }
        I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
      nTrees = tr.length;
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('aCorner', new THREE.Float32BufferAttribute(CO, 2)); g.setAttribute('aSize', new THREE.Float32BufferAttribute(SZ, 2));
      g.setAttribute('aCell', new THREE.Float32BufferAttribute(CE, 4)); g.setAttribute('aD', new THREE.Float32BufferAttribute(AD, 2)); g.setIndex(I);
      const M = own(new THREE.ShaderMaterial({
        uniforms: forestU, side: THREE.DoubleSide, fog: false, alphaToCoverage: GL2, extensions: {derivatives: true},
        vertexShader: [
          'attribute vec2 aCorner; attribute vec2 aSize; attribute vec4 aCell; attribute vec2 aD; uniform vec3 uMoonD;',
          'varying vec2 vUv; varying vec4 vCell; varying float vShade; varying float vDist; varying float vY; varying vec2 vM2; varying float vBack;',
          'void main(){ vec3 rt = (modelMatrix * vec4(position, 1.)).xyz; vec2 toC = cameraPosition.xz - rt.xz; float L = length(toC); toC /= max(L, 1e-3);',
          ' vec2 sd = vec2(toC.y, -toC.x); vec3 w = rt + vec3(sd.x, 0., sd.y) * aCorner.x * aSize.x * .5 + vec3(0., aCorner.y * aSize.y - .4, 0.);',
          ' float u = aCorner.x * .5 + .5; vUv = vec2(aD.y > .5 ? 1. - u : u, aCorner.y); vCell = aCell; vShade = aD.x; vDist = L; vY = w.y;',
          // where its light is, seen across this card: the rims go on the edges toward it
          ' vec3 m = normalize(uMoonD); vM2 = normalize(vec2(dot(m.xz, sd) * (aD.y > .5 ? -1. : 1.), m.y + .35)); vBack = max(0., dot(-toC, normalize(m.xz)));',
          ' gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }'].join('\n'),
        fragmentShader: [
          'uniform sampler2D uMap; uniform vec3 uTree, uDeep, uRim, uLit, uHazeC, uMist; uniform float uHazeN, uHazeF, uLitK, uFeet;', UNFILM,
          'varying vec2 vUv; varying vec4 vCell; varying float vShade; varying float vDist; varying float vY; varying vec2 vM2; varying float vBack;',
          'void main(){ vec2 uv = vCell.xy + vUv * vCell.zw; vec4 t = texture2D(uMap, uv); if (t.a < .3) discard;',
          ' vec2 o = vM2 * vCell.zw * .005; float a2 = texture2D(uMap, uv + o).a, a3 = texture2D(uMap, uv + o * 2.2).a;',
          ' float rim = clamp(t.a - (a2 * .6 + a3 * .4), 0., 1.) * smoothstep(.15, .6, vUv.y) * .55 * (.3 + .7 * vBack);',
          ' float far = smoothstep(40., 170., vDist);',
          ' vec3 c = mix(uDeep, uTree, t.r) * vShade * (1. - .35 * far) + uLit * t.r * t.r * (1. - vBack) * uLitK * (1. - .6 * far) + uRim * rim * (1.3 - far * .9);',
          ' c = mix(c, uHazeC * 1.05, smoothstep(uHazeN, uHazeF, vDist) * .75);',
          ' c = mix(c, uMist, (1. - smoothstep(0., 4.5, vY)) * uFeet);',
          ' float a = clamp((t.a - .5) / max(fwidth(t.a), .001) + .5, 0., 1.);',
          ' gl_FragColor = linearToOutputTexel(vec4(unfilm(c), a)); }'].join('\n'),
      }));
      const mesh = new THREE.Mesh(g, M); mesh.frustumCulled = false; scene.add(mesh);
      return mesh;
    })();

    // ---------- two old trees near the pasture's edge, framing Henry as the camera goes round: a post oak and a mesquite
    // (trunks as tubes along their own frames, crowns of leaf cards, swaying in the wind and lit from behind) ----------
    {
      const tP = [], tN = [], tU = [], tT = [], tI = [], cP = [], cN = [], cU = [], cT = [], cC = [], cI = [];
      const tube = (pts, rFn, k, top, rx, rz) => {
        const curve = new THREE.CatmullRomCurve3(pts), segs = 10, rs = 8, fr = curve.computeFrenetFrames(segs, false), Pt = V3(), D = V3(), b = tP.length / 3;
        for (let i = 0; i <= segs; i++) { const t = i / segs; curve.getPointAt(t, Pt); for (let j = 0; j <= rs; j++) { const th = j / rs * TAU, r = rFn(t); D.copy(fr.normals[i]).multiplyScalar(Math.cos(th)).addScaledVector(fr.binormals[i], Math.sin(th)); tP.push(Pt.x + D.x * r, Pt.y + D.y * r, Pt.z + D.z * r); tN.push(D.x, D.y, D.z); tU.push(j / rs, t * 3); tT.push(k, cl(Pt.y / top, 0, 1), rx, rz); } }
        for (let i = 0; i < segs; i++) for (let j = 0; j < rs; j++) { const a = b + i * (rs + 1) + j, c = a + rs + 1; tI.push(a, c, a + 1, a + 1, c, c + 1); }
      };
      const n = V3(), m2 = V3(), t1 = V3(), t2 = V3(), Pq = V3(), YUP = V3(0, 1, 0);
      const crown = (lobes, k, top, x, z, sc, nLeaf, sz, half, flat) => {
        const C = V3(); for (const L of lobes) C.add(V3(L[0], L[1], L[2])); C.divideScalar(lobes.length);
        lobes.forEach(L => {
          for (let i = 0; i < nLeaf; i++) {
            const u = rnd() * TAU, v = Math.acos(rr(-.7, 1)), dd = rr(.5, 1.05), s = rr(sz[0], sz[1]) * sc;
            n.set(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)); Pq.set(L[0] + n.x * L[3] * dd, L[1] + n.y * L[3] * flat * dd, L[2] + n.z * L[3] * dd);
            m2.subVectors(Pq, C).normalize().add(n).normalize();
            t1.crossVectors(n, YUP); if (t1.lengthSq() < 1e-3) t1.set(1, 0, 0); t1.normalize(); t2.crossVectors(n, t1).normalize();
            const ro = rnd() * TAU, ca = Math.cos(ro), sa = Math.sin(ro), e1 = t1.clone().multiplyScalar(ca).addScaledVector(t2, sa), e2 = t2.clone().multiplyScalar(ca).addScaledVector(t1, -sa), b = cP.length / 3;
            const tint = Math.pow(rr(.8, 1.1) * (.5 + .5 * (m2.y * .5 + .5)) * (.75 + .25 * dd), 2.2);
            for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const py = Pq.y + (e1.y * sx + e2.y * sy) * s / 2; cP.push(Pq.x + (e1.x * sx + e2.x * sy) * s / 2, py, Pq.z + (e1.z * sx + e2.z * sy) * s / 2); cN.push(m2.x, m2.y, m2.z); cU.push((half + sx * .5 + .5) * .5, sy * .5 + .5); cT.push(k, cl(py / top, 0, 1), x, z); cC.push(tint * rr(.9, 1.05), tint, tint * rr(.85, 1)); }
            cI.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
          }
        });
      };
      // the post oak: one trunk forking into limbs, a big round crown
      {
        const a = MAZ + 2.05, x = Math.sin(a) * 27, z = Math.cos(a) * 27, sc = 1, H = 6.6, R = 4.2, top = H + R, lx = rr(-.4, .4) - .6, lz = rr(-.4, .4);
        const pts = []; for (let j = 0; j <= 4; j++) { const f = j / 4; pts.push(V3(x + lx * f + Math.sin(f * 3) * .25, -.3 + f * H * .55, z + lz * f + Math.cos(f * 2.5) * .2)); }
        tube(pts, f => lerp(.62, .34, f) * sc * (1 + .7 * Math.exp(-f * 9)), 0, top, x, z);
        const fork = pts[4], lobes = [], a0 = rnd() * TAU;
        for (let b = 0; b <= 5; b++) {
          const lead = b === 5, ba = a0 + b / 5 * TAU + rr(-.4, .4), sp = lead ? rr(0, .3) : rr(.6, .95), up = lead ? rr(2.6, 3.4) : rr(1.4, 2.8);
          const e = V3(fork.x + Math.cos(ba) * R * sp, fork.y + up, fork.z + Math.sin(ba) * R * sp), p0 = pts[3].clone().lerp(fork, rr(.4, 1));
          tube([p0, V3(lerp(p0.x, e.x, .45), lerp(p0.y, e.y, .6) + .3, lerp(p0.z, e.z, .45)), e], f => lerp(lead ? .32 : .26, .07, f) * sc, 0, top, x, z);
          lobes.push([e.x, e.y + .5, e.z, R * (lead ? rr(.5, .62) : rr(.42, .56))]);
        }
        crown(lobes, 0, top, x, z, sc, 22, [1.5, 2.3], 0, .75);
      }
      // the mesquite: three crooked stems leaning out from the ground, a low, wide, airy crown of feathery leaves
      {
        const a = MAZ - 2.3, x = Math.sin(a) * 25, z = Math.cos(a) * 25, sc = .9, H = 4.2, R = 3.4, top = H + 1.5, lobes = [], a0 = rnd() * TAU;
        for (let s = 0; s < 3; s++) {
          const ba = a0 + s / 3 * TAU + rr(-.3, .3), out = rr(1.6, 2.6), p0 = V3(x + Math.cos(ba) * .15, -.2, z + Math.sin(ba) * .15);
          const e = V3(x + Math.cos(ba) * out, H * rr(.8, 1), z + Math.sin(ba) * out);
          tube([p0, V3(lerp(p0.x, e.x, .35) + rr(-.3, .3), H * .4, lerp(p0.z, e.z, .35) + rr(-.3, .3)), V3(lerp(p0.x, e.x, .7) + rr(-.25, .25), H * .72, lerp(p0.z, e.z, .7) + rr(-.25, .25)), e], f => lerp(.2, .07, f) * (1 + .5 * Math.exp(-f * 8)), 1, top, x, z);
          lobes.push([e.x, e.y + .3, e.z, R * rr(.48, .6)]);
          lobes.push([lerp(x, e.x, .4) + rr(-.5, .5), e.y + .1, lerp(z, e.z, .4) + rr(-.5, .5), R * rr(.35, .45)]);
        }
        crown(lobes, 1, top, x, z, sc, 15, [1.1, 1.6], 1, .45);
      }
      const mk = (Pa, Na, Ua, Ta, Ia, Ca) => { const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(Pa, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Na, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(Ua, 2)); g.setAttribute('aTree', new THREE.Float32BufferAttribute(Ta, 4)); if (Ca) g.setAttribute('color', new THREE.Float32BufferAttribute(Ca, 3)); g.setIndex(Ia); return g; };
      const airy = K.airy;
      const CK = c => (Array.isArray(c) ? LINV(c) : LIN(c));
      const trunks = new THREE.Mesh(mk(tP, tN, tU, tT, tI), airy(own(new THREE.MeshLambertMaterial({map: barkTex, color: CK(P.bark)})), 'bark'));
      const leafM = own(new THREE.MeshLambertMaterial({map: leafTex, alphaTest: .45, side: THREE.DoubleSide, vertexColors: true, color: CK(P.leaf)})); if (GL2) leafM.alphaToCoverage = true;
      const crowns = new THREE.Mesh(mk(cP, cN, cU, cT, cI, cC), airy(leafM, 'leaf'));
      trunks.frustumCulled = crowns.frustumCulled = false; scene.add(trunks, crowns);
    }

    // ---------- mist: a low bank along the trees' feet, and soft layers drifting over the pasture, thin over the clearing
    // and blown open where Henry lands (the Colossus page's) ----------
    const MIST = {uC: {value: SC(P.mist)}, uA: {value: P.mistA}};
    {
      const M = own(new THREE.ShaderMaterial({
        uniforms: Object.assign({uC: {value: SC(P.bank)}, uMap: {value: mistTex}, uA: {value: P.bankA == null ? .32 : P.bankA}}, EXPU), transparent: true, depthWrite: false, fog: false, side: THREE.BackSide,
        vertexShader: 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: 'uniform vec3 uC; uniform sampler2D uMap; uniform float uA; varying vec2 vUv;\n' + UNFILM +
          'void main(){ float n = texture2D(uMap, vUv * vec2(24., .6)).r * 2.2; float a = smoothstep(0., .25, vUv.y) * (1. - smoothstep(.35, 1., vUv.y)); gl_FragColor = linearToOutputTexel(vec4(unfilm(uC), a * min(1., n) * uA)); }',
      }));
      for (const [r, h] of [[50, 9], [72, 13]]) { const g = own(new THREE.CylinderGeometry(r, r, h, 72, 1, true)), m = new THREE.Mesh(g, M); m.position.y = h * .3; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); }
    }
    {
      const disc = own(new THREE.CircleGeometry(70, 64));
      for (const [y, k, sp] of [[.18, 1, .6], [.6, .75, -.4], [1.3, .5, .3]]) {
        const u = Object.assign({uMap: {value: mistTex}, uK: {value: k}, uSp: {value: sp}, uClear: {value: 7}}, MIST, AIRU, EXPU);
        const m = new THREE.Mesh(disc, own(new THREE.ShaderMaterial({
          uniforms: u, transparent: true, depthWrite: false, fog: false,
          vertexShader: 'varying vec2 vP; varying float vCam;\nvoid main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; vCam = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
          fragmentShader: AIR + UNFILM + '\nuniform sampler2D uMap; uniform vec3 uC; uniform float uA, uK, uSp, uClear; varying vec2 vP; varying float vCam;\n' +
            'void main(){ float r = length(vP); vec2 dr = uFlow.xy * uSp * .3;\n float n = texture2D(uMap, vP / 9. - dr * .06).r * texture2D(uMap, vP / 23. - dr * .025).r * 3.;\n' +
            ' float a = uA * uK * min(n, 1.2) * (.3 + .7 * smoothstep(uClear, uClear + 6., r)) * smoothstep(3., 12., vCam) * (1. - smoothstep(32., 50., vCam)) * (1. - clamp(length(pushAt(vP)) * .6, 0., 1.));\n gl_FragColor = linearToOutputTexel(vec4(unfilm(uC), a)); }',
        })));
        m.rotation.x = -PI / 2; m.position.y = y; m.renderOrder = 4; m.frustumCulled = false; scene.add(m);
      }
    }

    // ---------- fireflies over the grass, drifting with the air, blinking (the Colossus page's) ----------
    const NF = 110, fpos = new Float32Array(NF * 3), fph = new Float32Array(NF * 4);
    for (let i = 0; i < NF; i++) { const a = rnd() * TAU, r = rr(7, 34); fpos.set([Math.sin(a) * r, rr(.25, 2.2), Math.cos(a) * r], i * 3); fph.set([rnd() * TAU, rr(.5, 1.4), rr(.15, .5), rr(.6, 1.6)], i * 4); }
    const fgeo = own(new THREE.BufferGeometry()); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fgeo.setAttribute('aPh', new THREE.BufferAttribute(fph, 4));
    const fliesU = Object.assign({uScale: {value: 400}, uOn: {value: P.flies}}, AIRU);
    const fireflies = new THREE.Points(fgeo, own(new THREE.ShaderMaterial({
      uniforms: fliesU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: AIR + '\nattribute vec4 aPh; uniform float uScale, uOn; varying float vA;\n' +
        'void main(){ vec3 p = position + vec3(sin(uT * aPh.y * .5 + aPh.x) * 1.2, sin(uT * aPh.y * .7 + aPh.x * 2.) * .35, cos(uT * aPh.y * .4 + aPh.x * 1.3) * 1.2);\n' +
        ' vec2 w = pushAt(p.xz); p.xz += w * 1.6 + windAt(p.xz) * .8; p.y += length(w) * .8;\n' +
        ' vA = uOn * pow(max(0., sin(uT * aPh.w + aPh.x * 3.)), 3.); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? aPh.z * .22 * uScale / -mv.z : 0.; }',
      fragmentShader: 'varying float vA;\nvoid main(){ float d = length(gl_PointCoord - .5) * 2.; float k = smoothstep(1., 0., d); gl_FragColor = vec4(vec3(.85, 1., .45) * 1.6 * (k * k + .6 * smoothstep(.35, 0., d)) * vA, 1.); }',
    })));
    fireflies.frustumCulled = false; fireflies.renderOrder = 9; scene.add(fireflies);
    const _db = new THREE.Vector2();
    fireflies.onBeforeRender = r => { r.getDrawingBufferSize(_db); fliesU.uScale.value = _db.y; };

    // ---------- what Henry's coat, horns and eyes reflect: this sky and these trees, drawn once into a soft light ----------
    K.env(scene, [new THREE.Mesh(forest.geometry, forest.material)]);

    // ---------- each frame: the kit's wind, clouds and pushes, then Henry's body in the grass and the light following him ----------
    const _h = V3();
    function update(dt, t, henry, camPos) {
      K.update(dt, t, camPos);
      if (henry) {
        const p = henry.root.position, h = henry.root.rotation.y, fx = Math.sin(h), fz = Math.cos(h), st = henry.state, down = st === 'lie' || st === 'sleep' || st === 'lying-down' ? 1 : 0;
        AIRU.uBodyA.value.set(p.x + fx * .75, p.z + fz * .75, down ? .85 : .5, down ? 1.3 : .9); AIRU.uBodyB.value.set(p.x - fx * .85, p.z - fz * .85);
        // the light follows him, so his shadow is always sharp
        _h.copy(p); key.target.position.copy(_h); key.position.copy(_h).addScaledVector(LIGHT, 25);
        if (camPos) { const dx = camPos.x - _h.x, dz = camPos.z - _h.z, c = Math.cos(.9), s = Math.sin(.9); fill.target.position.copy(_h); fill.position.set(_h.x + dx * c - dz * s, _h.y + 3, _h.z + dx * s + dz * c); }
      }
    }
    function dispose() {
      K.dispose();
      for (const m of grassMeshes) scene.remove(m);
    }
    return {
      time: TIME, night: NIGHT, exposure: E, aperture: P.aperture, bloom: P.bloom, rays: P.rays, vignette: P.vignette, discDir: K.DISC, lightDir: LIGHT, key, dust: UNF(P.dust), update, ring: K.ring, dispose,
      stats: {tufts: nTufts, trees: nTrees, grassChunks: grassMeshes.length}, kit: K,
    };
  }
  root.makeHenryMeadow = makeHenryMeadow;
})(typeof window !== 'undefined' ? window : globalThis);
