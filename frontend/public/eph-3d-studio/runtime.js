import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { addWindow } from './windows.js';
import { resolveShop } from './shops.mjs?v=20261029-shops';
import { computeRowBalconies } from './balcony.mjs?v=20261029-eph30';
// Original pilot geometry, adapted to real unit IDs and block dimensions.
function createPilotArchitecture(parent, block) {
const FLOOR_HEIGHT = 3.52;
const model = new THREE.Group(); model.name = 'pilot-architecture';
model.scale.set(block.width / 20, block.floorHeight / FLOOR_HEIGHT, block.depth / 20); parent.add(model);
// Cephe sayısı: bilinmiyorsa ya da 4 ise dört yan da pencereli; 3 ise yalnız sağ yan; 1-2 ise yan cephe yok (ön/arka satırlar veriden gelir).
const openSides = !(block.facadeCount >= 1 && block.facadeCount < 4) ? [-1, 1] : block.facadeCount === 3 ? [1] : [];
function edgeSides(g) {
  const sides = [];
  if (Math.abs(g.x - g.width / 2 + 10) < .15) sides.push(-1);
  if (Math.abs(g.x + g.width / 2 - 10) < .15) sides.push(1);
  return sides.filter(side => openSides.includes(side));
}
function addSideWindows(group, g, sideDirection, base, direction, unit) {
  for (const dz of [-2.4, 2.4]) {
    const kitchen = dz * direction > 0;
    addWindow(group, { x: sideDirection * 10, y: base + (kitchen ? 1.68 : 1.6), z: g.z + dz,
      rotation: sideDirection * Math.PI / 2, kitchen, state: (unit.number + (dz > 0 ? 1 : 0)) % 3 });
  }
}
const facadeWhite = '#ffffff';
const edgeMaterial = new THREE.LineBasicMaterial({color:'#b9c6ce',transparent:true,opacity:.45});
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .75, ...extra });
function box(group, width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
function addStore(group, unit, g, picked) {
  const brand = unit.shop;
  const direction = unit.side === 'front' ? 1 : -1;
  const outside = direction * 10;
  const base = (unit.floor - 1) * FLOOR_HEIGHT;
  const wall = mat(picked ? '#f8b77b' : '#e1e1d8');
  box(group, g.width - .1, .12, (g.depth - .1), g.x, base + .08, g.z, mat('#d5d0c1'));
  box(group, g.width - .1, .12, (g.depth - .1), g.x, base + 2.97, g.z, wall);
  box(group, g.width - .1, 2.8, .12, g.x, base + 1.5, g.z - direction * g.depth / 2 + direction * .08, wall);
  const insideX = unit.slot === 0 ? g.x + g.width / 2 - .06 : g.x - g.width / 2 + .06;
  box(group, .12, 2.8, (g.depth - .1), insideX, base + 1.5, g.z, wall);
  const colors = ['#b8c47e', '#d5a478', '#bf5b4d', '#d6c58c', '#7b9c93'];
  for (const depth of [3, 6.8, 8.7]) {
    box(group, g.width - 1.1, .12, .75, g.x, base + .9, direction * depth, mat('#dad9cf'));
    box(group, g.width - 1.1, .12, .75, g.x, base + 1.55, direction * depth, mat('#dad9cf'));
    for (let i = 0; i < Math.floor(g.width / .7); i++) {
      const x = g.x - g.width / 2 + .7 + i * .65;
      for (const y of [1.12, 1.78]) box(group, .4, .32, .4, x, base + y, direction * depth, mat(colors[i % colors.length]));
    }
  }
  const glass = mat('#96bfca', { transparent: true, opacity: .2, roughness: .12, metalness: .1, depthWrite: false });
  box(group, g.width - .35, 1.9, .06, g.x, base + 1.2, outside + direction * .04, glass);
  for (let i = 0; i <= Math.ceil(g.width / 2); i++) {
    const x = g.x - g.width / 2 + .15 + i * (g.width - .3) / Math.ceil(g.width / 2);
    box(group, .07, 1.95, .09, x, base + 1.2, outside + direction * .1, mat('#4c6875'));
  }
  box(group, g.width - .3, .08, .1, g.x, base + .25, outside + direction * .1, mat('#607883'));
  box(group, g.width - .3, .1, .1, g.x, base + 2.18, outside + direction * .1, mat('#607883'));
  if (unit.side === 'front') {
    const doorX = g.x;
    box(group, 2.1, 2.18, .08, doorX, base + 1.2, outside + .16, mat('#345b71'));
    for (const dx of [-.49, .49]) {
      box(group, .91, 2.0, .08, doorX + dx, base + 1.2, outside + .22, mat('#9ed6ec', { roughness: .1, metalness: .25 }));
      box(group, .05, .48, .12, doorX + dx * .25, base + 1.2, outside + .29, mat('#dce8eb'));
    }
    box(group, 2.7, .12, 1.4, doorX, base + 2.29, outside + .55, mat(brand.accent));
    box(group, 2.1, .025, 1.0, doorX, base + .23, outside + .85, mat(brand.color));
    const entryCanvas = document.createElement('canvas'); entryCanvas.width = 256; entryCanvas.height = 64;
    const entryContext = entryCanvas.getContext('2d'); entryContext.fillStyle = '#ffffff'; entryContext.font = 'bold 42px Arial'; entryContext.textAlign = 'center'; entryContext.fillText('GİRİŞ ↓', 128, 48);
    const entryTexture = new THREE.CanvasTexture(entryCanvas); entryTexture.colorSpace = THREE.SRGBColorSpace;
    const entrySign = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .33), new THREE.MeshBasicMaterial({ map: entryTexture, transparent: true }));
    entrySign.position.set(doorX, base + 2.08, outside + .31); group.add(entrySign);
  }
  box(group, g.width - .22, .71, .26, g.x, base + 2.62, outside + direction * .12, mat(brand.color));
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = brand.color; context.fillRect(0, 0, 1024, 160);
  context.fillStyle = brand.accent; context.fillRect(0, 142, 1024, 18);
  context.fillStyle = brand.ink; context.font = '900 118px Arial';
  if (context.measureText(brand.name).width > 960) context.font = `900 ${Math.floor(118 * 960 / context.measureText(brand.name).width)}px Arial`;
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(brand.name, 512, 87);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(g.width - .7, 5.2), .64),
    new THREE.MeshBasicMaterial({ map: texture }));
  sign.position.set(g.x, base + 2.62, outside + direction * .26);
  if (direction < 0) sign.rotation.y = Math.PI;
  group.add(sign);
  const sideDirs = edgeSides(g);
  for (const sideDirection of sideDirs) {
  const sideX = sideDirection * 10;
  box(group, .06, 1.9, (g.depth - .35), sideX + sideDirection * .04, base + 1.2, g.z, glass);
  if (unit.shopBrand === 'kargo') {
    box(group, .12, 2.05, (g.depth - .25), sideX + sideDirection * .19, base + 1.2, g.z, mat(brand.color));
    const adCanvas = document.createElement('canvas'); adCanvas.width = 1024; adCanvas.height = 256;
    const ad = adCanvas.getContext('2d');
    ad.fillStyle = brand.color; ad.fillRect(0, 0, 1024, 256);
    ad.fillStyle = brand.accent; ad.fillRect(0, 214, 1024, 42);
    ad.fillStyle = '#ffffff'; ad.textAlign = 'center';
    ad.font = 'bold 82px Arial'; ad.fillText(brand.name, 512, 108);
    ad.font = '38px Arial'; ad.fillText('Hızlı ve güvenli teslimat', 512, 175);
    const adTexture = new THREE.CanvasTexture(adCanvas); adTexture.colorSpace = THREE.SRGBColorSpace;
    const adPanel = new THREE.Mesh(new THREE.PlaneGeometry((g.depth - .6), 1.93), new THREE.MeshBasicMaterial({ map: adTexture }));
    adPanel.rotation.y = sideDirection * Math.PI / 2;
    adPanel.position.set(sideX + sideDirection * .26, base + 1.2, g.z); group.add(adPanel);
  }
  for (const dz of [-4.8, -2.4, 0, 2.4, 4.8]) {
    box(group, .09, 1.95, .07, sideX + sideDirection * .1, base + 1.2, g.z + dz, mat('#4c6875'));
  }
  for (const y of [.25, 2.18]) box(group, .1, .08, (g.depth - .3), sideX + sideDirection * .1, base + y, g.z, mat('#607883'));
  box(group, .26, .71, (g.depth - .25), sideX + sideDirection * .12, base + 2.62, g.z, mat(brand.color));
  const sideSign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, .64), new THREE.MeshBasicMaterial({ map: texture }));
  sideSign.rotation.y = sideDirection * Math.PI / 2;
  sideSign.position.set(sideX + sideDirection * .26, base + 2.62, g.z);
  group.add(sideSign);
  box(group, .1, .15, .32, sideX + sideDirection * .1, base + 1.2, g.z + 4.88, mat('#f4f2e9'));
  }
  if (sideDirs.length) {
  box(group, g.width - .3, .14, 1.1, g.x, base + .12, outside + direction * .5, mat('#dddace'));
  for (const dx of [-g.width / 2 + .55, g.width / 2 - .55]) {
    box(group, .45, .52, .48, g.x + dx, base + .35, outside + direction * .65, mat('#9e9c89'));
    const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(.35, 1), mat('#7d9c64'));
    shrub.position.set(g.x + dx, base + .75, outside + direction * .65); group.add(shrub);
  }
  }
  group.scale.y = FLOOR_HEIGHT / 3.2;
}
function addRoof() {
  const half = 10.85, depth = 21.7, base = block.floors.length * FLOOR_HEIGHT + .15, rise = 1.65;
  const shape = new THREE.Shape();
  shape.moveTo(-half, -.12);
  shape.lineTo(half, -.12);
  shape.lineTo(half, 0); shape.lineTo(0, rise); shape.lineTo(-half, 0);
  shape.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }), mat('#985541'));
  roof.position.set(0, base, -depth / 2); roof.castShadow = true; roof.receiveShadow = true; roof.name = 'pilot-tiled-roof'; model.add(roof);
  const columns = 36, rows = 32;
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(half * 2 / columns - .025, .11, depth / rows - .025), mat('#bd6a46'), columns * rows);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let index = 0;
  for (let column = 0; column < columns; column++) for (let row = 0; row < rows; row++) {
    const x = -half + (column + .5) * half * 2 / columns;
    dummy.position.set(x, base + rise * (1 - Math.abs(x) / half) + .08, -depth / 2 + (row + .5) * depth / rows);
    dummy.rotation.set(0, 0, Math.atan(-Math.sign(x) * rise / half));
    dummy.updateMatrix(); tiles.setMatrixAt(index, dummy.matrix);
    color.setHSL(.045 + ((column * 7 + row * 3) % 5) * .004, .46, .36 + ((column * 3 + row * 7) % 7) * .012);
    tiles.setColorAt(index++, color);
  }
  tiles.instanceMatrix.needsUpdate = true; tiles.castShadow = true; tiles.receiveShadow = true; model.add(tiles);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, depth + .1, 12), mat('#a84f31'));
  ridge.rotation.x = Math.PI / 2; ridge.position.set(0, base + rise + .14, 0); ridge.castShadow = true; model.add(ridge);
  for (const x of [-half, half]) box(model, .2, .19, depth + .1, x, base - .1, 0, mat('#9a8874'));
}
function addPerson(parent, x, y, z, shirt, child = false) {
  const person = new THREE.Group(); person.position.set(x, y, z);
  const skin = mat('#d9ad8c'), trousers = mat('#3b5269');
  box(person, .38, .57, .25, 0, .98, 0, mat(shirt));
  for (const dx of [-.11, .11]) box(person, .13, .65, .17, dx, .37, 0, trousers);
  for (const dx of [-.26, .26]) box(person, .12, .54, .14, dx, .96, 0, skin);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), skin);
  head.position.y = 1.46; head.castShadow = true; person.add(head);
  if (child) person.scale.setScalar(.66);
  parent.add(person);
}
function addCargoVan(x, z, rotation) {
  const van = new THREE.Group(); van.name = 'pilot-transit-van'; van.position.set(x, .08, z); van.rotation.y = rotation;
  const blue = mat('#087fc4', { roughness: .29, metalness: .35 });
  const profile = new THREE.Shape();
  profile.moveTo(-2.85, .55); profile.lineTo(-2.85, 2.52);
  profile.quadraticCurveTo(-2.85, 2.72, -2.6, 2.72);
  profile.lineTo(.85, 2.72); profile.quadraticCurveTo(1.16, 2.69, 1.4, 2.33);
  profile.lineTo(1.96, 1.52); profile.lineTo(2.65, 1.25);
  profile.quadraticCurveTo(2.85, 1.16, 2.85, .9); profile.lineTo(2.85, .55); profile.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: 1.94, bevelEnabled: true, bevelThickness: .07, bevelSize: .07, bevelSegments: 3, steps: 1, curveSegments: 10 }), blue);
  body.rotation.y = -Math.PI / 2; body.position.x = .97; body.castShadow = true; van.add(body);
  const windshield = box(van, 1.72, .92, .045, 0, 2.01, 1.67, mat('#557f98', { roughness: .08, metalness: .35 }));
  windshield.rotation.x = .60;
  box(van, 1.15, .55, .08, 0, .94, 2.88, mat('#273844'));
  for (const y of [.78, .91, 1.04]) box(van, 1.12, .025, .09, 0, y, 2.93, mat('#a8b9c2', { metalness: .7 }));
  for (const side of [-1, 1]) {
    box(van, .37, .22, .12, side * .72, 1.16, 2.78, mat('#ecf6ff', { emissive: '#b5dfff', emissiveIntensity: .25 }));
    box(van, .14, .48, .1, side * .84, 1.6, -2.94, mat('#bd2531'));
    box(van, .23, .25, .23, side * 1.16, 1.73, 1.1, mat('#344651'));
  }
  for (const side of [-1, 1]) {
    const windowShape = new THREE.Shape(); windowShape.moveTo(.28, 1.58); windowShape.lineTo(.28, 2.49); windowShape.lineTo(.87, 2.49); windowShape.lineTo(1.48, 1.58); windowShape.closePath();
    const sideWindow = new THREE.Mesh(new THREE.ShapeGeometry(windowShape), mat('#557f98', { side: THREE.DoubleSide, roughness: .08, metalness: .3 }));
    sideWindow.rotation.y = -Math.PI / 2; sideWindow.position.x = side * 1.055; van.add(sideWindow);
    box(van, .06, .35, 5.45, side * 1.06, .66, -.05, mat('#29333d'));
    box(van, .035, 1.8, .018, side * 1.055, 1.55, .14, mat('#096ca8'));
    box(van, .05, .07, .27, side * 1.08, 1.4, .43, mat('#344651'));
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const stroke = (points, color, width) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
      ctx.beginPath(); points.forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
    };
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.font = 'bold 120px Arial'; ctx.fillStyle = '#ffffff';
    ctx.fillText('KARGO', 512, 250);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 1.6), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    logo.rotation.y = side * Math.PI / 2; logo.position.set(side * 1.09, 1.75, -1.05); van.add(logo);
    for (const wheelZ of [-1.85, 1.85]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .25, 24), mat('#293039'));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1.03, .46, wheelZ); van.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .27, 16), mat('#bcc9d0', { metalness: .65, roughness: .22 }));
      hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); van.add(hub);
    }
  }
  box(van, 1.96, .22, .15, 0, .59, 2.85, mat('#344651'));
  model.add(van);
}

function addUnit(source, floor, picked) {
 const g={width:source.width*20/block.width,depth:source.depth*20/block.depth,x:source.x*20/block.width,z:source.z*20/block.depth,y:(floor.index+.5)*FLOOR_HEIGHT};
 const peers=floor.units.filter(item=>item.usage==='shop');
 const shop=source.usage==='shop'?resolveShop(source.label,peers.indexOf(source)):null,cargo=shop?.sector==='Kargo';
 const unit={...source,floor:floor.index+1,slot:g.x<0?0:1,number:floor.index*4+source.slot+1,shopBrand:cargo?'kargo':'diger',shop};
 const group=new THREE.Group(); group.userData.unitId=source.id;group.name=source.usage==='shop'?'pilot-shop':'pilot-apartment';
 const direction=source.side==='front'?1:-1,outside=direction*10,base=floor.index*FLOOR_HEIGHT;
 if(g.width<2.4 || g.depth<3) {
   box(group,Math.max(.05,g.width-.1),FLOOR_HEIGHT-.25,Math.max(.05,g.depth-.1),g.x,g.y,g.z,mat(facadeWhite));
   if(source.usage!=='shop'&&g.depth>=3)for(const sideDirection of edgeSides(g))addSideWindows(group,g,sideDirection,base,direction,unit);
 } else if(source.usage==='shop') {
   addStore(group,{...unit,floor:1},g,picked);group.position.y=base;
   if(cargo) group.userData.cargoSide=unit.slot===0?-1:1;
 } else {
    const bodyMat = mat(facadeWhite, { roughness: .65 });
    const chrome = mat('#dce8ee', { roughness: .12, metalness: .72 });
    box(group, g.width - .1, FLOOR_HEIGHT - .25, g.depth - .1, g.x, g.y, g.z, bodyMat);

    const rowUnits = floor.units.filter(item => item.side === source.side).sort((a, b) => a.x - b.x);
    const rowBalconies = computeRowBalconies(rowUnits, block.width);
    const myBalcony = rowBalconies.balconies.find(item => item.unitId === source.id);

    if (myBalcony) {
      // 1) Kalan kısımda yalnız pencere (Rule 1)
      const wSec = myBalcony.windowSection;
      const windowCount = Math.max(1, Math.floor(wSec.width / 2.2));
      for (let i = 0; i < windowCount; i++) {
        const x = windowCount === 1 ? wSec.centerX : wSec.startX + (i + 0.5) * (wSec.width / windowCount);
        const kitchen = i === windowCount - 1;
        addWindow(group, {
          x,
          y: base + (kitchen ? 1.68 : 1.6),
          z: outside,
          rotation: direction < 0 ? Math.PI : 0,
          kitchen,
          state: kitchen ? (unit.floor + unit.slot) % 2 : (unit.number + i) % 3,
        });
      }

      // Balkon arkasında balkon kapısı / salon pencereleri
      const bWindowCount = Math.max(1, Math.floor(myBalcony.width / 2.5));
      for (let i = 0; i < bWindowCount; i++) {
        const x = bWindowCount === 1
          ? myBalcony.x
          : myBalcony.startX + (i + 0.5) * (myBalcony.width / bWindowCount);
        addWindow(group, {
          x,
          y: base + 1.6,
          z: outside,
          rotation: direction < 0 ? Math.PI : 0,
          kitchen: false,
          state: (unit.number + i + 1) % 3,
        });
      }

      // Yan cephe pencereleri (EPH-19 korunur)
      for (const sideDirection of edgeSides(g)) {
        addSideWindows(group, g, sideDirection, base, direction, unit);
      }

      // 2) Balkon çizimi: döşeme, cam korkuluk, küpeşte, dikmeler, yan korkuluklar
      const bWidth = myBalcony.width;
      const bX = myBalcony.x;

      const balconySlab = box(group, bWidth, .16, 1.3, bX, base + .25, outside + direction * .5, mat('#dce2e4'));
      balconySlab.userData.isBalcony = true;
      balconySlab.userData.unitId = source.id;

      const balconyGlass = mat('#31627e', { transparent: true, opacity: .78, roughness: .08, metalness: .18, depthWrite: false });
      box(group, bWidth - .08, .78, .06, bX, base + .82, outside + direction * 1.1, balconyGlass);
      for (const y of [.42, 1.24]) {
        box(group, bWidth - .04, .09, .1, bX, base + y, outside + direction * 1.1, chrome);
      }

      const posts = Math.max(1, Math.ceil((bWidth - .3) / 1.8));
      for (let i = 0; i <= posts; i++) {
        const x = bX - bWidth / 2 + .1 + i * (bWidth - .2) / posts;
        box(group, .07, .92, .09, x, base + .81, outside + direction * 1.1, chrome);
      }

      for (const dx of [-bWidth / 2 + .03, bWidth / 2 - .03]) {
        box(group, .06, .78, 1.12, bX + dx, base + .82, outside + direction * .53, balconyGlass);
        box(group, .1, .09, 1.2, bX + dx, base + 1.24, outside + direction * .5, chrome);
      }

      if (unit.number === 5 || unit.number === 14 || unit.number === 19) {
        addPerson(group, bX, base + .34, outside + direction * .65, '#d18452');
        if (unit.number === 5) addPerson(group, bX + .6, base + .34, outside + direction * .65, '#e5b93f', true);
      }
    } else {
      const windowCount = Math.max(2, Math.floor(g.width / 2.6));
      for (let i = 0; i < windowCount; i++) {
        const inset = Math.min(1.8, g.width * .35);
        const x = g.x - g.width / 2 + inset + i * (g.width - 2 * inset) / (windowCount - 1);
        const kitchen = i === windowCount - 1;
        addWindow(group, { x, y: base + (kitchen ? 1.68 : 1.6), z: outside,
          rotation: direction < 0 ? Math.PI : 0, kitchen, state: kitchen ? (unit.floor + unit.slot) % 2 : (unit.number + i) % 3 });
      }
      for (const sideDirection of edgeSides(g)) addSideWindows(group, g, sideDirection, base, direction, unit);
    }
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(g.width - .1, FLOOR_HEIGHT - .25, g.depth - .1)), edgeMaterial);
    edge.position.set(g.x, g.y, g.z); group.add(edge);

 }
 model.add(group); return group;
}
function finish() {
 addSite();
 for(let floor=0;floor<=block.floors.length;floor++) box(model,20.45,.19,20.45,0,floor*FLOOR_HEIGHT-.08,0,mat('#d6dfe2'));
 for(const floor of block.floors) {
   if(!floor.index)continue;
   for(const side of ['front','rear']) {
     const row=floor.units.filter(unit=>unit.side===side).sort((a,b)=>a.x-b.x);
     const { partitions, pilasters } = computeRowBalconies(row, block.width);
     const dir = side === 'front' ? 1 : -1;
     // Rule 3: Daire sınırlarında cephede ince dikey derz/pilaster
     for (const p of pilasters) {
       box(model, .14, FLOOR_HEIGHT - .22, .14, p.boundaryX, (floor.index + .5) * FLOOR_HEIGHT, dir * 10.07, mat(facadeWhite, { roughness: .65 }));
     }
     // Rule 2: Komşu dairelerin balkonları arasında dikey bölme duvarı/opak panel (balkon derinliği kadar, cephe renginde)
     for (const part of partitions) {
       box(model, .14, FLOOR_HEIGHT - .25, 1.30, part.boundaryX, (floor.index + .5) * FLOOR_HEIGHT, dir * 10.55, mat(facadeWhite, { roughness: .65 }));
     }
   }
 }
 addRoof();
 addPerson(model,-5,.08,12.6,'#447eac'); addPerson(model,-4.2,.08,12.8,'#e5b93f',true);
 addPerson(model,4,.08,12.7,'#b9798e'); addPerson(model,6.8,.08,13.5,'#568576');
 const cargo=model.children.find(object=>object.userData.cargoSide);
 if(cargo) {
   const side=cargo.userData.cargoSide;
   box(model,7,.04,13,side*15.8,-.04,0,mat('#b8c4cd'));
   for(const z of [-6,0,6])box(model,6.5,.02,.1,side*15.8,-.01,z,mat('#ffffff'));
   addCargoVan(side*16,-3,Math.PI/2);addCargoVan(side*16,3,Math.PI/2);
 }
}
function addSite() {
const pavement = mat('#e2e5e2');
box(model, 200, .1, 200, 0, -.35, 0, mat('#e9f0ed'));
box(model, 31, .22, 31, 0, -.2, 0, pavement);
box(model, 31, .03, 6, 0, -.06, 12.5, mat('#e4ded2'));
box(model, 31, .03, 5, 0, -.06, -12.8, mat('#c9d9b7'));
box(model, 58, .06, 7, 0, -.2, 20, mat('#c8d3db'));
for (let x = -25; x <= 25; x += 5) box(model, 2.3, .01, .12, x, -.16, 20, mat('#f7fafc'));
for (const x of [-13, 13]) for (const z of [-12.5, -6.5, 0, 6.5]) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  box(tree, .22, 1.3, .22, 0, .65, 0, mat('#ab9980'));
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), mat('#a3bc8f'));
  crown.scale.set(.8, 1.4, .8); crown.position.y = 1.7; crown.castShadow = true;
  tree.add(crown); model.add(tree);
}
function textPlane(text, width, z, rotation = 0) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 100;
  const context = canvas.getContext('2d');
  context.fillStyle = '#6e8395'; context.font = '600 28px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 384, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 100 / 768), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; plane.rotation.z = rotation; plane.position.set(0, -.01, z);
  model.add(plane);
}
textPlane('CADDE  /  ÖN CEPHE', 13, 16);
textPlane('BAHÇE  /  ARKA CEPHE', 12, -15, Math.PI);

}
return {addUnit,finish};
}

import { addFloorPlan } from './floorplan.js';
import { addNeighborhood } from './neighborhood.js';
import { adaptProject } from './adapter.mjs?v=20261029-eph26';
import { unitLabel, labelVisible, LABEL_MODES } from './labels.mjs';
const $ = id => document.getElementById(id);
if(new URLSearchParams(location.search).get('native')==='1')document.documentElement.classList.add('native-studio');
function emit(message) { if(window.ReactNativeWebView?.postMessage) window.ReactNativeWebView.postMessage(JSON.stringify(message)); else parent.postMessage(message,location.origin); }
let project, block, allBlocks = false, floorId = '', selectedId = '', dragging, objects = [], labels = [];
try { const value=localStorage.getItem('eph-3d-label-mode'); if(LABEL_MODES.includes(value))$('label-mode').value=value; } catch {}
const scene = new THREE.Scene(); scene.background = new THREE.Color('#f2f7fa'); scene.fog=new THREE.Fog('#f2f7fa',200,650);
let architecture;
const model = new THREE.Group(), context = new THREE.Group(); scene.add(model,context);
scene.add(new THREE.HemisphereLight('#e3f1ff','#d0d3c6',2));
const sun = new THREE.DirectionalLight('#fff1dc',2.8); sun.position.set(-22,42,30); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:120});sun.shadow.normalBias=.045;scene.add(sun);
const fill = new THREE.DirectionalLight('#d2e8ff',1.2); fill.position.set(25,18,-30); scene.add(fill);
const camera = new THREE.PerspectiveCamera(36,1,.1,1000);
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true}); } catch { fail('WebGL açılamadı. Mevcut yerleşim editörünü kullanabilirsiniz.'); throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.toneMappingExposure=1.05; renderer.toneMapping = THREE.ACESFilmicToneMapping; $('view').append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Projenin döndürülebilen üç boyutlu görünümü');
const controls = new OrbitControls(camera,renderer.domElement);
controls.enabled = true;
controls.enableRotate = true;
controls.enableZoom = true;
controls.enablePan = true;
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 1.0;
controls.panSpeed = 0.85;
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.02;
controls.maxPolarAngle = Math.PI - 0.02;
controls.minAzimuthAngle = -Infinity;
controls.maxAzimuthAngle = Infinity;
renderer.domElement.style.touchAction = 'none';
renderer.domElement.style.cursor = 'grab';
renderer.domElement.addEventListener('pointerdown', () => { renderer.domElement.style.cursor = 'grabbing'; });
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  renderer.domElement.addEventListener(eventName, () => { renderer.domElement.style.cursor = 'grab'; });
}
const box = (parent,w,h,d,x,y,z,color,extra={}) => {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.65,...extra}));
  mesh.position.set(x,y,z); parent.add(mesh); return mesh;
};
function fail(message) { $('error').hidden=false; $('error').textContent=message; emit({type:'EPH_STUDIO_ERROR'}); }
function dispose(group) { group.traverse(object=>{object.geometry?.dispose(); if(object.material){for(const m of Array.isArray(object.material)?object.material:[object.material]){m.map?.dispose();m.dispose();}}});group.clear(); }
function visibleBlocks(){return allBlocks?project.blocks:block?[block]:[];}
function offsetOf(item){return allBlocks?item.position:{x:0,z:0};}
function rebuildContext(){
  dispose(context);context.scale.set(1,1,1);
  for(const item of visibleBlocks()){
    const group=new THREE.Group(),offset=offsetOf(item);group.position.set(offset.x,0,offset.z);group.scale.set(item.width/20,1,item.depth/20);addNeighborhood(group,item.name);context.add(group);
  }
}
function build() {
  dispose(model);objects=[];labels=[];$('labels').replaceChildren();if(!block)return;
  if(visibleBlocks().some(item=>item.floors.reduce((sum,f)=>sum+f.units.length,0)>500)){fail('Bu blok 500 bölümden büyük; mevcut yerleşim editörünü kullanın.');return;}
  context.visible=!floorId;$('error').hidden=true;
  for(const item of visibleBlocks()){
    const offset=offsetOf(item),carrier=new THREE.Group();carrier.position.set(offset.x,0,offset.z);carrier.userData.blockId=item.id;model.add(carrier);
    if(floorId){
      const floor=item.floors.find(f=>f.id===floorId);
      for(const unit of floor?.units||[]){
        const group=new THREE.Group();group.userData.unitId=unit.id;group.userData.blockId=item.id;
        addFloorPlan(group,unit,{width:unit.width,depth:unit.depth,x:unit.x,z:unit.z},unit.id===selectedId,unit.title);
        group.traverse(object=>{if(object.userData.unitLabel)object.visible=false;});carrier.add(group);objects.push(group);
      }
    }else{
      const drawing=createPilotArchitecture(carrier,item);
      for(const floor of item.floors)for(const unit of floor.units){const group=drawing.addUnit(unit,floor,selectedId===unit.id);group.userData.blockId=item.id;objects.push(group);}
      drawing.finish();
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,96);ctx.fillStyle='#1749a3';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.name,256,48);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sign.position.set(0,item.floorHeight*item.floors.length+4,0);sign.scale.set(9,1.7,1);carrier.add(sign);
    }
    for(const floor of item.floors)for(const unit of floor.units){
      if(floorId&&floor.id!==floorId)continue;
      const label=document.createElement('div');label.className='unit-label';label.textContent=(allBlocks?item.name+' · ':'')+unitLabel(unit);label.hidden=true;$('labels').append(label);
      labels.push({unit,label,position:new THREE.Vector3(offset.x+unit.x,floorId?1.65:floor.index*item.floorHeight+item.floorHeight*.55,offset.z+(floorId?unit.z:(unit.side==='front'?1:-1)*(item.depth/2+1.1)))});
    }
  }
  renderer.domElement.dataset.mode=floorId?'floorplan':allBlocks?'project':'building';renderer.domElement.dataset.blockCount=String(visibleBlocks().length);renderer.domElement.dataset.unitCount=String(objects.length);renderer.domElement.dataset.balconyCount=String(objects.reduce((sum,g)=>sum+g.children.filter(c=>c.userData.isBalcony).length,0));details();
}
function findSelected(){for(const item of project?.blocks||[]){const unit=item.floors.flatMap(f=>f.units).find(u=>u.id===selectedId);if(unit)return {unit,block:item};}return null;}
function details(){
 const selection=findSelected(),unit=selection?.unit;
 $('detail').textContent=unit?`${selection.block.name} · ${unit.title} · ${unit.label} · ${unit.grossArea?`${unit.grossArea} m² brüt`:unit.netArea?`${unit.netArea} m² net`:'m² belirtilmedi'} · EPH: ${unit.sourceId}`:allBlocks?`${project.blocks.length} blok birlikte gösteriliyor. Bölümü modelden veya listeden seçin.`:'Bölümü listeden veya modelden seçin.';
 $('unit').value=selectedId;
 if(unit)emit({type:'EPH_STUDIO_SELECTION',projectId:project.projectId,unitId:unit.id,blockId:selection.block.id,floorId:unit.floorId});
}
function view(name='perspective'){
 if(!block)return;
 const bounds=new THREE.Box3();
 for(const item of visibleBlocks()){
  const offset=offsetOf(item),margin=floorId?1:9;
  bounds.expandByPoint(new THREE.Vector3(offset.x-item.width/2-margin,0,offset.z-item.depth/2-margin));
  bounds.expandByPoint(new THREE.Vector3(offset.x+item.width/2+margin,floorId?3:item.floorHeight*item.floors.length+5,offset.z+item.depth/2+margin));
 }
 const target=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(...({perspective:[32,27,36],front:[0,8,55],rear:[0,12,-58],top:[.01,58,.01]}[name]||[32,27,36])).normalize();
 camera.position.copy(target).add(direction);camera.lookAt(target);camera.updateMatrixWorld(true);
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),horizontal=vertical*camera.aspect;
 let distance=1;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const delta=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,Math.abs(delta.dot(right))/horizontal+delta.dot(direction),Math.abs(delta.dot(up))/vertical+delta.dot(direction));}
 camera.position.copy(target).addScaledVector(direction,distance*1.05);controls.target.copy(target);controls.minDistance=5;controls.maxDistance=Math.max(250,distance*4);controls.update();
 document.querySelectorAll('.toolbar button').forEach(button=>button.classList.toggle('active',button.id===name));
}
function options(select,values){select.replaceChildren(...values.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));}
function chooseBlock(){
 allBlocks=!$('block').value&&project.blocks.length>1;block=project.blocks.find(item=>item.id===$('block').value)||project.blocks[0];floorId='';selectedId='';
 options($('floor'),[['',allBlocks?'Kat için blok seçin':'Tüm bina'],...(allBlocks?[]:block?.floors||[]).map(f=>[f.id,f.label])]);$('floor').disabled=allBlocks;
 options($('unit'),[['','Bölüm seç'],...visibleBlocks().flatMap(item=>item.floors.flatMap(f=>f.units).map(u=>[u.id,`${allBlocks?item.name+' · ':''}${u.title} · ${u.label}`]))]);
 rebuildContext();build();view();
}
window.addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==location.origin)return;const data=event.data;
 if(data?.type==='EPH_STUDIO_SELECT'){
  if(data.projectId!==project?.projectId)return;const next=project.blocks.find(item=>item.id===data.blockId),floor=next?.floors.find(item=>item.id===data.floorId);if(!floor?.units.some(item=>item.id===data.unitId))return;
  if(allBlocks||block?.id!==next.id){$('block').value=next.id;chooseBlock();}if(floorId===floor.id&&selectedId===data.unitId)return;
  floorId=floor.id;selectedId=data.unitId;$('floor').value=floorId;build();view();return;
 }
 if(data?.type!=='EPH_STUDIO_LOAD')return;
 try{
  const previous=project?.projectId===data.setup?.id?{block:allBlocks?'':block?.id,floor:floorId,unit:selectedId}:null,position=camera.position.clone(),target=controls.target.clone();
  project=adaptProject(data.setup,data.scene);options($('block'),[...(project.blocks.length>1?[['','Tüm bloklar']]:[]),...project.blocks.map(item=>[item.id,item.name])]);
  $('notice').textContent=['Şematik görünüm; onaylı mimari plan değildir. Bölüm genişlikleri net m² oranına göre hesaplanır; m² yoksa oda sayısı kullanılır.',...project.warnings].join(' ');
  if(previous&&(!previous.block||project.blocks.some(item=>item.id===previous.block)))$('block').value=previous.block;
  chooseBlock();
  if(previous){floorId=!allBlocks&&block.floors.some(item=>item.id===previous.floor)?previous.floor:'';selectedId=project.blocks.some(item=>item.floors.some(f=>f.units.some(u=>u.id===previous.unit)))?previous.unit:'';$('floor').value=floorId;build();camera.position.copy(position);controls.target.copy(target);controls.update();}
  emit({type:'EPH_STUDIO_LOADED',projectId:project.projectId});
 }catch(error){fail(error.message||'Proje görüntülenemedi.');}
});
$('block').onchange=chooseBlock;
$('label-mode').onchange=()=>{try{localStorage.setItem('eph-3d-label-mode',$('label-mode').value);}catch{}};
$('floor').onchange=()=>{floorId=$('floor').value;build();view();};
$('unit').onchange=()=>{selectedId=$('unit').value;const selection=findSelected();if(floorId&&selection){floorId=selection.unit.floorId;$('floor').value=floorId;}build();};
for(const name of ['perspective','front','rear','top'])$(name).onclick=()=>view(name);
for(const [id,ratio]of[['zoom-in',.85],['zoom-out',1.18]])$(id).onclick=()=>{const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*ratio,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();};
// Kamera pan: oklar sahneyi ekranda istenen yone kaydirir (kamera hedefi ve konumu birlikte tasinir).
function moveCamera(dx,dy){
 const distance=camera.position.distanceTo(controls.target);
 const worldStep=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*0.075;
 camera.updateMatrixWorld(true);
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
 const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
 const movement=right.multiplyScalar(-dx*worldStep*camera.aspect).add(up.multiplyScalar(-dy*worldStep));
 camera.position.add(movement);controls.target.add(movement);controls.update();
}
for(const [id,dx,dy] of [['move-up',0,1],['move-down',0,-1],['move-left',-1,0],['move-right',1,0]]){
 const button=$(id);let active=false,frameId=0;
 const step=()=>{if(!active)return;moveCamera(dx,dy);frameId=requestAnimationFrame(step);};
 button.addEventListener('pointerdown',event=>{event.preventDefault();active=true;button.setPointerCapture(event.pointerId);moveCamera(dx,dy);frameId=requestAnimationFrame(step);});
 const stop=()=>{active=false;cancelAnimationFrame(frameId);};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,stop);
 button.addEventListener('click',event=>{if(event.detail===0)moveCamera(dx,dy);});
}
$('move-reset').onclick=()=>view();
renderer.domElement.onpointerdown=e=>{dragging=e.button===0?[e.clientX,e.clientY]:null;};
renderer.domElement.onpointerup=e=>{
 if(!dragging)return;const delta=Math.hypot(e.clientX-dragging[0],e.clientY-dragging[1]);dragging=null;if(delta>6)return;
 const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
 for(const hit of ray.intersectObjects(objects,true)){let object=hit.object;while(object&&object!==model){if(object.userData.unitId){selectedId=object.userData.unitId;build();return;}object=object.parent;}}
};
let previousViewportWidth = 0;
new ResizeObserver(() => {
 const v = $('view');
 if (!v.clientWidth || !v.clientHeight) return;
 const widthChanged = previousViewportWidth !== v.clientWidth;
 previousViewportWidth = v.clientWidth;
 renderer.setSize(v.clientWidth, v.clientHeight, false);
 camera.aspect = v.clientWidth / v.clientHeight;
 camera.updateProjectionMatrix();
 if (block && widthChanged && !camera.userData.initialized) {
   view(); camera.userData.initialized = true;
 }
}).observe($('view'));
function frame(){requestAnimationFrame(frame);if(document.hidden)return;controls.update();renderer.render(scene,camera);
 for(const item of labels){const p=item.position.clone().project(camera);const facing=floorId||(camera.position.z-item.position.z)*(item.unit.side==='front'?1:-1)>0;item.label.hidden=!(labelVisible($('label-mode').value,item.unit.id,selectedId)&&facing&&p.z>-1&&p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.96);if(!item.label.hidden){item.label.style.left=`${(p.x+1)*$('view').clientWidth/2}px`;item.label.style.top=`${(1-p.y)*$('view').clientHeight/2}px`;}}
}frame();emit({type:'EPH_STUDIO_READY'});
