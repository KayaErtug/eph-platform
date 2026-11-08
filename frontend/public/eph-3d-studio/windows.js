import * as THREE from './vendor/three.module.js';

export function addWindow(parent, { x, y, z, rotation = 0, kitchen = false, state = 0 }) {
  const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = rotation;
  group.userData.windowType = kitchen ? 'kitchen-full-height' : 'standard';
  group.userData.shutterState = ['open', 'partial', 'closed'][state % 3];
  const w = kitchen ? 1.95 : 1.42, h = kitchen ? 2.72 : 1.6;
  const box = (width, height, depth, px, py, pz, color, extra = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color, roughness: .65, ...extra }));
    mesh.position.set(px, py, pz); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  box(w + .2, h + .2, .12, 0, 0, 0, '#f4f6f7');
  box(w, h, .14, 0, 0, .08, '#82d0f5', { roughness: .08, metalness: .28, emissive: '#369bd0', emissiveIntensity: .12 });
  box(.045, h, .18, 0, 0, .12, '#becbd2');
  if (kitchen) box(w, .045, .18, 0, -.28, .12, '#becbd2');
  box(.065, h - .18, .025, -w * .32, 0, .165, '#dff6ff');
  box(w + .28, .19, .22, 0, h / 2 + .17, .10, '#3d4248');
  for (const px of [-w / 2 - .05, w / 2 + .05]) box(.065, h + .12, .12, px, 0, .16, '#454a50');
  const coverage = [0, .48, 1][state % 3];
  const count = Math.ceil(h * coverage / .115);
  for (let i = 0; i < count; i++) box(w + .03, .105, .075, 0, h / 2 - .055 - i * .115, .21, i % 2 ? '#353a40' : '#454a50');
  parent.add(group); return group;
}
