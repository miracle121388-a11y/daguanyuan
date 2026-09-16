// Check staged approaches against the actual, unchanged high/mobile GLB solids.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as THREE from 'three';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const stage = JSON.parse(readFileSync('config/simulation.stage.json', 'utf8'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder': await draco.createDecoderModule()});
const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
const failures = [], rows = [], files = [];
for (const tier of ['places', 'places-low']) for (const [id, route] of Object.entries(stage.courts)) {
  const file = `public/models/${tier}/${id}.glb`, bytes = readFileSync(file), document = await io.read(file);
  files.push({file, sha256: createHash('sha256').update(bytes).digest('hex')});
  const solids = [];
  for (const node of document.getRoot().listNodes()) for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
    const name = primitive.getMaterial()?.getName() ?? '';
    if (/leaf|grass|water|earth|flower|petal|botanical|bamboo|moss|soil/i.test(name)) continue;
    const position = primitive.getAttribute('POSITION');
    if (!position) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position.getArray(), 3));
    if (primitive.getIndices()) geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(), 1));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrix.fromArray(node.getWorldMatrix()); mesh.matrixAutoUpdate = false; mesh.updateMatrixWorld(true);
    mesh.userData.material = name; solids.push(mesh);
  }
  for (let slot = 0; slot < 4; slot++) {
    const points = [[0, .22, 16], ...route.points].map(p => new THREE.Vector3(p[0] + (slot % 2 ? .65 : -.65), p[1], p[2] + (slot < 2 ? .65 : -.65)));
    let tests = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], direction = b.clone().sub(a).normalize(), length = a.distanceTo(b);
      const side = new THREE.Vector3(-direction.z, 0, direction.x);
      for (const radius of [-.38, 0, .38]) for (const height of [.42, 1.0, 1.55]) {
        const start = a.clone().addScaledVector(side, radius); start.y += height;
        const hits = new THREE.Raycaster(start, direction, 0, length).intersectObjects(solids, false);
        tests++;
        if (hits.length) failures.push({tier, id, slot, segment: i, height, radius, material: hits[0].object.userData.material, point: hits[0].point.toArray()});
      }
    }
    rows.push({tier, id, slot, tests});
  }
  for (const mesh of solids) mesh.geometry.dispose();
}
const report = {at: new Date().toISOString(), passed: failures.length === 0, method: 'Four character lanes, three body heights and three lateral rays per segment; actual high/mobile structural triangles. Soft foliage is excluded. Staged navigation, not literary evidence.', stageSha256: createHash('sha256').update(readFileSync('config/simulation.stage.json')).digest('hex'), files, rows, failures};
writeFileSync('reports/acceptance/simulation-space.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({passed: report.passed, rays: rows.reduce((sum, row) => sum + row.tests, 0), failures: failures.slice(0, 12)}, null, 2));
if (!report.passed) process.exitCode = 1;
