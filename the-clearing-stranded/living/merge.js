// merge.js: joins the many small meshes of a thing that never comes apart (a shelter, a rack, a bird's body) into one
// mesh per material, so the phone draws it in a few calls instead of dozens. Outlines (meshes drawn with the outline
// material, as children of the mesh they outline) are joined the same way. Defines window.mergeMeshes(group, outlineMat).
(function (root) {
  'use strict';
  function mergeMeshes(G, outMat) {
    G.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(G.matrixWorld).invert(), rel = new THREE.Matrix4();
    const buckets = new Map(), lines = [], drop = [];
    G.traverse(o => {
      if (!o.isMesh || o.material === outMat || Array.isArray(o.material) || o.userData.keep) return;
      rel.multiplyMatrices(inv, o.matrixWorld);
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(rel);
      if (!buckets.has(o.material.uuid)) buckets.set(o.material.uuid, {m: o.material, list: []});
      buckets.get(o.material.uuid).list.push(g);
      if (o.children.some(c => c.material === outMat)) lines.push(g);
      drop.push(o);
    });
    for (const o of drop) o.parent.remove(o);
    const join = list => {
      const keys = ['position', 'normal', 'uv', 'color'].filter(k => list.every(g => g.attributes[k]));
      const out = new THREE.BufferGeometry();
      for (const k of keys) { const n = list.reduce((s, g) => s + g.attributes[k].array.length, 0), size = list[0].attributes[k].itemSize, arr = new Float32Array(n); let o = 0; for (const g of list) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(arr, size)); }
      if (!out.attributes.normal) out.computeVertexNormals();
      out.computeBoundingSphere(); return out;
    };
    for (const b of buckets.values()) G.add(new THREE.Mesh(join(b.list), b.m));
    if (lines.length && outMat) G.add(new THREE.Mesh(join(lines.map(g => { const c = new THREE.BufferGeometry(); c.setAttribute('position', g.attributes.position); c.setAttribute('normal', g.attributes.normal); return c; })), outMat));
    return G;
  }
  root.mergeMeshes = mergeMeshes;
})(typeof window !== 'undefined' ? window : globalThis);
