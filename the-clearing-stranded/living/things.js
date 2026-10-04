// things.js: the things the survivor sets out away from camp, built in code. three.js r128 (global THREE).
// Defines makeThing(kind): a snare on a bent sapling, a woven fish trap, a seep well dug in a sandbar, a tarp water bag
// (docs/model-sheets/46-snare, 45-fish-trap, 47-seep-well, 44-water-bag). Each is a THREE.Group standing at the origin,
// toon-shaded with an outline like everything else; set its position (in metres) where it goes.
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  let grad = null, outMat = null;
  const kit = () => {
    if (!grad) { const d = new Uint8Array([100, 100, 100, 255, 175, 175, 175, 255, 240, 240, 240, 255]); grad = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true; }
    if (!outMat) outMat = new THREE.ShaderMaterial({uniforms: {uW: {value: 0.01}}, side: THREE.BackSide, vertexShader: 'uniform float uW; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.); }', fragmentShader: 'void main(){ gl_FragColor = vec4(.14, .1, .08, 1.); }'});
  };
  const mat = (c, o) => new THREE.MeshToonMaterial(Object.assign({color: c, gradientMap: grad}, o || {}));
  function makeThing(kind) {
    kit();
    const G = new THREE.Group(); G.name = kind;
    const mesh = (g, m, line) => { const o = new THREE.Mesh(g, m); G.add(o); if (line !== false) o.add(new THREE.Mesh(g, outMat)); return o; };
    const tube = (pts, r, m, line) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(q[0], q[1], q[2]))), 16, r, 6), m, line);
    const bark = mat(0x6b5238), rope = mat(0xc8b88e), leaf = mat(0x5f8a3e), sand = mat(0xd8c08a), water = mat(0x6a95a0), tarp = mat(0x3c7a8c), basket = mat(0xa88654);
    if (kind === 'snare') {
      // a sapling bent over and tied down to a trigger peg, the noose hanging over a run
      tube([[0, 0, -0.1], [0.05, 0.6, -0.08], [0.25, 1.0, 0], [0.55, 1.05, 0.02], [0.75, 0.85, 0.02]], 0.02, bark);
      for (let i = 0; i < 5; i++) { const o = mesh(new THREE.SphereGeometry(0.06, 6, 4), leaf, false); o.position.set(0.2 + i * 0.12, 1.0 + Math.sin(i) * 0.05, 0.02); o.scale.set(1, 0.6, 0.8); }
      tube([[0.75, 0.85, 0.02], [0.76, 0.5, 0.02], [0.77, 0.3, 0.02]], 0.004, rope, false);
      const noose = mesh(new THREE.TorusGeometry(0.09, 0.004, 4, 16), rope, false); noose.position.set(0.77, 0.2, 0.02);
      const peg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 5), bark); peg.position.set(0.72, 0.09, 0.02);
    } else if (kind === 'fishtrap') {
      // a funnel basket of woven cane, its mouth upstream
      const g = new THREE.CylinderGeometry(0.22, 0.04, 0.8, 14, 4, true); g.rotateZ(PI / 2); const o = mesh(g, mat(0xa88654, {side: THREE.DoubleSide})); o.position.y = 0.18;
      for (let i = 0; i < 5; i++) { const r = mesh(new THREE.TorusGeometry(0.22 - i * 0.04, 0.008, 4, 16), basket, false); r.position.set(-0.4 + i * 0.18, 0.18, 0); r.rotation.y = PI / 2; }
      tube([[-0.4, 0.2, 0], [-0.6, 0.35, 0.1], [-0.9, 0.3, 0.2]], 0.004, rope, false);
    } else if (kind === 'seep') {
      // a hole dug in the sand where clean water seeps up
      const lip = mesh(new THREE.TorusGeometry(0.34, 0.1, 6, 18), sand); lip.rotation.x = -PI / 2; lip.position.y = 0.03; lip.scale.set(1, 1, 0.5);
      const w = mesh(new THREE.CircleGeometry(0.28, 16), water, false); w.rotation.x = -PI / 2; w.position.y = 0.02;
    } else if (kind === 'waterbag') {
      // a square of tarp gathered and tied into a bag
      const g = new THREE.SphereGeometry(0.16, 10, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.06) { p.setX(i, p.getX(i) * (1 - (y - 0.06) * 5)); p.setZ(i, p.getZ(i) * (1 - (y - 0.06) * 5)); } } g.computeVertexNormals();
      const b = mesh(g, tarp); b.position.y = 0.15; b.scale.set(1.1, 1, 1);
      const k = mesh(new THREE.TorusGeometry(0.03, 0.008, 4, 10), rope, false); k.position.y = 0.3; k.rotation.x = PI / 2;
    }
    return G;
  }
  root.makeThing = makeThing;
})(typeof window !== 'undefined' ? window : globalThis);
