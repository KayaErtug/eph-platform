import * as THREE from './vendor/three.module.js';

function box(parent, w, h, d, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: .65 }));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  if (y > .5 && (z < -23 || Math.abs(x) > 28)) mesh.userData.contextBuilding = true;
  parent.add(mesh); return mesh;
}
function stoneWall(parent, x1, z1, x2, z2) {
  const length = Math.hypot(x2 - x1, z2 - z1), angle = Math.atan2(z2 - z1, x2 - x1);
  const group = new THREE.Group(); group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); group.rotation.y = -angle; group.name = 'parcel-stone-wall';
  box(group, length, .95, .4, 0, .45, 0, '#b4b0a5');
  const columns = Math.ceil(length / .7), rows = 4;
  const stones = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#b6af9f', roughness: .95 }), columns * rows);
  const dummy = new THREE.Object3D(), color = new THREE.Color(); let n = 0;
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const span = length / columns;
    dummy.position.set(-length / 2 + (col + .5) * span, .13 + row * .24, 0);
    dummy.scale.set(span - .035, .21, .45 + (col % 3) * .015); dummy.updateMatrix(); stones.setMatrixAt(n, dummy.matrix);
    color.setHSL(.10, .06, .47 + ((col * 7 + row * 3) % 6) * .032); stones.setColorAt(n++, color);
  }
  stones.castShadow = true; stones.receiveShadow = true; group.add(stones);
  box(group, length + .08, .12, .57, 0, 1.01, 0, '#d3d0c5'); parent.add(group);
}
function rearGarden(parent, blockName) {
  box(parent, 16, .08, 6.5, -10, .03, -14.4, '#a7bd86').name = 'rear-garden';
  box(parent, 2.6, .11, 7.6, -2, .08, -14.3, '#e2dac8');
  box(parent, 12.5, .09, 6.0, 10.9, .025, -14.9, '#aebbc4').name = 'rear-parking';
  for (const x of [5.1, 8.9, 12.7, 16.5]) box(parent, .09, .025, 5.3, x, .09, -15, '#f8f8f3');
  for (const x of [-16, -11, -6]) {
    box(parent, 1.7, .3, 1.7, x, .2, -16.2, '#c3b9a4');
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.1, .15, 1.5, 8), new THREE.MeshStandardMaterial({ color: '#91775e' }));
    trunk.position.set(x, .95, -16.2); parent.add(trunk);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 2), new THREE.MeshStandardMaterial({ color: '#789963' }));
    leaves.position.set(x, 2.1, -16.2); leaves.castShadow = true; parent.add(leaves);
    box(parent, 2, .14, .52, x, .62, -12.6, '#a38663');
    for (const dx of [-.7, .7]) box(parent, .1, .5, .45, x + dx, .3, -12.6, '#687780');
    box(parent, 2, .45, .1, x, .9, -12.86, '#a38663');
  }
  const entry = new THREE.Group(); entry.name = 'rear-building-entrance';
  for (let step = 0; step < 3; step++) box(entry, 3.3, .12, 1.9 - step * .4, -2, .08 + step * .12, -10.9, '#d8d2c6');
  box(entry, 2.4, 2.85, .22, -2, 1.7, -10.22, '#314b5e');
  for (const x of [-2.51, -1.49]) {
    box(entry, .92, 2.4, .08, x, 1.6, -10.39, '#86b9ce');
    box(entry, .045, .43, .12, x + (x < -2 ? .3 : -.3), 1.52, -10.47, '#d8e2e6');
  }
  box(entry, 3.5, .16, 2.4, -2, 3.22, -11.16, '#e1e7e9');
  for (const x of [-3.48, -.52]) box(entry, .13, 3.0, .13, x, 1.65, -12.1, '#8299a8');
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#274a68'; ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'center'; ctx.fillText(`${blockName} · GİRİŞ`, 256, 63, 490);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.35, .43), new THREE.MeshBasicMaterial({ map: texture }));
  sign.rotation.y = Math.PI; sign.position.set(-2, 2.98, -10.4); entry.add(sign); parent.add(entry);
}
export function addNeighborhood(parent, blockName) {
  box(parent, 100, .045, 5.2, 0, -.12, -21.1, '#c0cbd2').name = 'rear-narrow-street';
  for (let x = -45; x < 48; x += 6) box(parent, 2.4, .012, .09, x, -.09, -21.1, '#f5f5ee');
  box(parent, 39, .08, 34, 0, -.18, -1.2, '#d2e2ef');
  const frontCanvas = document.createElement('canvas'); frontCanvas.width = 1024; frontCanvas.height = 192;
  const frontContext = frontCanvas.getContext('2d'); frontContext.fillStyle = '#2563eb'; frontContext.fillRect(0, 0, 1024, 192);
  frontContext.fillStyle = '#ffffff'; frontContext.textAlign = 'center'; frontContext.font = 'bold 78px Arial'; frontContext.fillText('ÖN CEPHE · CADDE', 512, 120);
  const frontTexture = new THREE.CanvasTexture(frontCanvas); frontTexture.colorSpace = THREE.SRGBColorSpace;
  const frontMarker = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.5), new THREE.MeshBasicMaterial({ map: frontTexture }));
  frontMarker.rotation.x = -Math.PI / 2; frontMarker.position.set(0, .035, 14.2); frontMarker.name = 'front-facade-marker'; parent.add(frontMarker);
  for (const x of [-19.5, 19.5]) box(parent, .16, .1, 34, x, -.08, -1.2, '#5487bc');
  for (const z of [-18.2, 15.8]) box(parent, 39, .1, .16, 0, -.08, z, '#5487bc');
  for (const [x1,z1,x2,z2] of [[-19.5,15.8,-3,15.8],[3,15.8,19.5,15.8],[-19.5,-18.2,-3.5,-18.2],[-.5,-18.2,5,-18.2],[17,-18.2,19.5,-18.2],[-19.5,-18.2,-19.5,-4],[-19.5,4,-19.5,15.8],[19.5,-18.2,19.5,15.8]]) stoneWall(parent,x1,z1,x2,z2);
  rearGarden(parent, blockName);
  // Dekoratif komsu binalar kaldirildi; projeye ait bloklar runtime.js tarafindan olusturulur.
  for (const x of [-21, 22]) {
    box(parent, .16, 4.2, .16, x, 2, 17, '#657582');
    box(parent, .65, 1.5, .38, x, 4.1, 17, '#3b4a55');
    for (let i = 0; i < 3; i++) {
      const color = i === (x < 0 ? 0 : 2) ? (i === 0 ? '#ec5c54' : '#49c984') : '#77818a';
      const light = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .3 }));
      light.position.set(x, 4.57 - i * .45, 17.23); parent.add(light);
    }
    for (let i = 0; i < 7; i++) box(parent, .55, .02, 5.9, x + 2 + i * .75, -.14, 20, '#f6f7f7');
  }
  for (const [x, z, color, rotation] of [[-14, 19, '#bd6d62', 0], [5, 21.8, '#e8e9e3', Math.PI], [22, 19, '#577b98', 0], [7,-15,'#b7c3c9',Math.PI/2], [10.8,-15,'#4d7197',Math.PI/2], [14.6,-15,'#b98476',Math.PI/2]]) {
    const car = new THREE.Group(); car.position.set(x, -.08, z); car.rotation.y = rotation;
    car.userData.role = z < 0 ? 'rear-parked-car' : 'street-car';
    box(car, 4.3, .65, 1.8, 0, .7, 0, color);
    box(car, 2.2, .65, 1.58, -.15, 1.3, 0, '#7899ab');
    box(car, 2.3, .1, 1.65, -.15, 1.67, 0, color);
    for (const a of [-1.35, 1.35]) for (const b of [-.87, .87]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .2, 16), new THREE.MeshStandardMaterial({ color: '#34434f' }));
      tire.rotation.x = Math.PI / 2; tire.position.set(a, .38, b); car.add(tire);
    }
    parent.add(car);
  }
}
