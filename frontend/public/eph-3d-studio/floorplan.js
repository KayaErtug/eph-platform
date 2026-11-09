import * as THREE from './vendor/three.module.js';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: .72 });
function block(parent, w, h, d, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function soft(parent, w, h, d, x, y, z, color, radius = .1) {
  const r = Math.min(radius, w / 3, d / 3), s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 5 }), material(color));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y - h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function round(parent, radius, height, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function lamp(parent, x, z) {
  round(parent, .09, .04, x, .78, z, '#a5824d'); round(parent, .025, .22, x, .9, z, '#b89a68');
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.14, .2, 16, 1, true), material('#f4dfb3'));
  shade.position.set(x, 1.06, z); parent.add(shade);
}
function caption(parent, text, x, z, width = 2.6) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffffee'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#234566'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64, 490);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 1.45, z); parent.add(mesh); return mesh;
}
export function addFloorPlan(group, unit, geometry, selected, title) {
  const w = geometry.width - .16, d = geometry.depth - .16;
  const tint = selected ? '#ffd09a' : (unit.side === 'front' ? ['#b9d5f2', '#b6d6c5'] : ['#d8c7e6', '#e6d5ba'])[unit.slot];
  const wall = '#171c24';
  group.position.set(geometry.x, 0, geometry.z);
  if (unit.side === 'rear') group.rotation.y = Math.PI;
  block(group, w, .18, d, 0, 0, 0, tint);
  for (const x of [-w / 2, w / 2]) block(group, .16, 1.25, d, x, .68, 0, wall);
  for (const z of [-d / 2, d / 2]) block(group, w, 1.25, .16, 0, .68, z, wall);
  const outline = selected ? '#ec740d' : '#343c49';
  for (const x of [-w / 2, w / 2]) block(group, .22, .06, d + .12, x, 1.34, 0, outline);
  for (const z of [-d / 2, d / 2]) block(group, w + .12, .06, .22, 0, 1.34, z, outline);
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, .2, d)), new THREE.LineBasicMaterial({ color: selected ? '#ea580c' : '#6b97ba' }));
  group.add(line);
  caption(group, title, 0, 0, 3.4).userData.unitLabel = true;
  if (unit.usage === 'shop') {
    for (const z of [-2.8, -.7, 1.4]) block(group, w - 2.0, .55, .5, 0, .4, z, unit.shopBrand === 'migros' ? '#ca6a76' : '#71a9cb');
    block(group, 1.5, .7, .7, w / 2 - 1.2, .45, 3.4, '#d8b990');
    caption(group, unit.label || 'Mağaza · Kullanım alanı', 0, 2.9, Math.min(5, w - 1));
    return;
  }
  const bedrooms = Number(unit.type.split('+')[0]);
  const bedWidth = w / Math.max(2, bedrooms);
  for (let i = 0; i < bedrooms; i++) {
    const x = -w / 2 + (i + .5) * bedWidth;
    const door = Math.min(.85, bedWidth * .35);
    block(group, bedWidth - door, 1.25, .12, x - door / 2, .68, -1.0, wall);
    const swing = [];
    for (let j = 0; j <= 12; j++) {
      const a = j * Math.PI / 24;
      swing.push(new THREE.Vector3(x + bedWidth / 2 - door + Math.cos(a) * door, .17, -1 + Math.sin(a) * door));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(swing), new THREE.LineBasicMaterial({ color: '#9b8069' })));
    block(group, Math.min(1.7, bedWidth - .35), .6, .19, x, .82, -d / 2, '#93c7e4');
    if (i) block(group, .12, 1.25, 3.8, -w / 2 + i * bedWidth, .68, -3.0, wall);
    block(group, Math.min(1.45, bedWidth - .4), .35, 2.0, x, .32, -3.2, '#b4a08d');
    block(group, Math.min(1.4, bedWidth - .45), .18, 1.55, x, .58, -3.05, i ? '#d5bb94' : '#91aac4');
    block(group, Math.min(1.15, bedWidth - .5), .12, .37, x, .72, -3.65, '#ffffff');
    const bw = Math.min(1.45, bedWidth - .4);
    block(group, bw + .08, .78, .13, x, .58, -4.23, '#796452');
    soft(group, bw - .06, .16, 1.86, x, .59, -3.2, '#f5f0e7');
    soft(group, bw - .07, .11, 1.22, x, .72, -2.93, i ? '#c2a27e' : '#698ca6');
    for (const dx of [-bw * .23, bw * .23]) soft(group, bw * .41, .13, .37, x + dx, .75, -3.85, '#faf8f2', .12);
    block(group, bw - .08, .035, .1, x, .79, -2.5, '#e5d4bf');
    if (bedWidth > 2.7) {
      block(group, .4, .47, .4, x + bw / 2 + .29, .36, -3.85, '#ad9478');
      lamp(group, x + bw / 2 + .29, -3.85);
    }
    block(group, bedWidth - .4, 1.0, .42, x, .62, -4.64, '#bcac98');
    for (const dx of [-.25, .25]) block(group, .025, .16, .04, x + dx, .65, -4.4, '#665f54');
    caption(group, i ? `Oda ${i}` : 'Yatak odası', x, -1.7, Math.min(2.4, bedWidth - .2));
  }
  const partition = w * .12;
  block(group, .12, 1.25, 3.2, partition, .68, 3.2, wall);
  block(group, w * .39, .025, 4.0, w * .3, .12, 2.8, '#e4e0d6');
  block(group, w * .36, .75, .7, w * .3, .55, 4.35, '#c2b29e');
  block(group, .7, .75, 2.1, w / 2 - .5, .55, 3.0, '#c2b29e');
  block(group, w * .36, .07, .79, w * .3, .98, 4.35, '#ebe8e1');
  block(group, .79, .07, 2.1, w / 2 - .5, .98, 3.0, '#ebe8e1');
  for (let j = 0; j < 4; j++) block(group, .025, .53, .025, w * .12 + j * w * .09, .6, 3.98, '#826c55');
  block(group, .65, .045, .48, w * .24, 1.025, 4.35, '#647782');
  block(group, .49, .025, .32, w * .24, 1.05, 4.35, '#c6d8df');
  round(group, .025, .26, w * .24, 1.15, 4.58, '#a9b5bc');
  block(group, .65, .025, .55, w * .39, 1.03, 4.35, '#273441');
  for (const dx of [-.16, .16]) for (const dz of [-.14, .14]) round(group, .075, .016, w * .39 + dx, 1.05, 4.35 + dz, '#74828c');
  block(group, 1.1, .7, .8, w * .3, .5, 2.3, '#bfa385');
  for (const dx of [-.8, .8]) {
    soft(group, .4, .1, .4, w * .3 + dx, .49, 2.3, '#778c9d');
    block(group, .08, .55, .44, w * .3 + dx + Math.sign(dx) * .16, .65, 2.3, '#778c9d');
    for (const dz of [-.14, .14]) block(group, .045, .35, .045, w * .3 + dx, .28, 2.3 + dz, '#685a4c');
  }
  round(group, .18, .025, w * .3, .87, 2.3, '#f5f0e7');
  const livingX = -w * .22;
  block(group, Math.min(2.4, w * .42), .6, .8, livingX, .45, 3.7, '#7d9eaf');
  block(group, .7, .6, 1.8, -w / 2 + .55, .45, 2.7, '#7d9eaf');
  const sofaWidth = Math.min(2.4, w * .42);
  block(group, sofaWidth, .025, 2.3, livingX, .15, 2.9, '#e0ceae');
  block(group, sofaWidth, .55, .16, livingX, .65, 4.02, '#537788');
  for (const dx of [-sofaWidth / 2 + .1, sofaWidth / 2 - .1]) soft(group, .2, .5, .9, livingX + dx, .58, 3.7, '#537788');
  for (let j = 0; j < 3; j++) {
    const x = livingX - sofaWidth * .3 + j * sofaWidth * .3;
    soft(group, sofaWidth * .28, .16, .64, x, .68, 3.64, '#91abb6');
    soft(group, .3, .28, .14, x, .88, 3.87, j === 1 ? '#c99f75' : '#b9c7ca');
  }
  block(group, 1.15, .35, .7, livingX, .28, 2.25, '#bca58b');
  soft(group, 1.2, .08, .75, livingX, .51, 2.25, '#95795e', .18);
  block(group, .34, .045, .25, livingX - .2, .58, 2.23, '#e2ded0');
  round(group, .08, .13, livingX + .22, .61, 2.25, '#eee6d7');
  caption(group, 'Salon', livingX, 1.0);
  caption(group, 'Mutfak', w * .3, 1.0, 2.2);
  block(group, w * .27, .025, 1.55, w * .32, .14, -.08, '#bfdadf');
  block(group, w * .27 - .65, 1.25, .12, w * .32 + .325, .68, .7, wall);
  const bathX = w * .32;
  block(group, .12, 1.25, 1.55, w * .17, .68, -.08, wall);
  for (let j = 0; j < 5; j++) block(group, w * .27, .012, .018, bathX, .17, -.8 + j * .34, '#91afb5');
  soft(group, .38, .34, .55, bathX, .35, -.2, '#f9faf8');
  round(group, .2, .05, bathX, .55, -.14, '#ffffff');
  round(group, .12, .055, bathX, .58, -.14, '#b6c9ce');
  block(group, .43, .55, .14, bathX, .46, -.52, '#f3f5f1');
  soft(group, .44, .12, .34, w / 2 - .34, .77, .36, '#f9faf8');
  round(group, .1, .025, w / 2 - .34, .85, .36, '#91a9b4');
  const showerX = w / 2 - .52;
  block(group, .77, .08, .63, showerX, .22, -.57, '#e8efef');
  const screen = block(group, .025, .88, .65, showerX - .4, .7, -.56, '#a5d4e1');
  screen.material.transparent = true; screen.material.opacity = .4;
  caption(group, 'Banyo', bathX, -.1, 1.6);
  caption(group, 'Hol', -w * .2, -.1, 1.5);
  block(group, w - .6, .15, 1.2, 0, 0, d / 2 + .62, '#dde8ef');
  block(group, w - .6, .7, .08, 0, .46, d / 2 + 1.2, '#80a9bb');
  caption(group, 'Balkon', 0, d / 2 + .6, 2.4);
}
