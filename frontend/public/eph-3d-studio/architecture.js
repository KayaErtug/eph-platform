import * as THREE from './vendor/three.module.js';
import { addWindow } from './windows.js';
// Original pilot geometry, adapted to real unit IDs and block dimensions.
export function createPilotArchitecture(parent, block) {
const FLOOR_HEIGHT = 3.52;
const model = new THREE.Group(); model.name = 'pilot-architecture';
model.scale.set(block.width / 20, block.floorHeight / FLOOR_HEIGHT, block.depth / 20); parent.add(model);
const brands = {
 migros: {name:'Migros',color:'#ef7d16',ink:'#ffffff',accent:'#f7a334'},
 yurtici: {name:'Yurtiçi Kargo',color:'#07508a',ink:'#ffffff',accent:'#ef7c20'},
 bim: {name:'BİM',color:'#dc252e',ink:'#ffffff',accent:'#ffffff'}
};
function brandFor(unit) {
 const name=String(unit.label||'').trim(), key=name.toLocaleLowerCase('tr-TR');
 if (/b[iı]m/.test(key)) return brands.bim;
 if (/m[iı]gros/.test(key)) return brands.migros;
 if (/yurt/.test(key)) return brands.yurtici;
 if (name && name!=='Mağaza') return {name,color:'#466780',ink:'#ffffff',accent:'#ef7c20'};
 return brands[unit.shopBrand] || brands.migros;
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
  const brand = brandFor(unit);
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
  context.fillStyle = brand.ink; context.font = `900 ${unit.shopBrand === 'yurtici' ? 94 : 118}px Arial`;
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(brand.name, 512, 87);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(g.width - .7, 5.2), .64),
    new THREE.MeshBasicMaterial({ map: texture }));
  sign.position.set(g.x, base + 2.62, outside + direction * .26);
  if (direction < 0) sign.rotation.y = Math.PI;
  group.add(sign);
  if (Math.abs(Math.abs(g.x) + g.width / 2 - 10) < .1) {
  const sideDirection = unit.slot === 0 ? -1 : 1;
  const sideX = sideDirection * 10;
  box(group, .06, 1.9, (g.depth - .35), sideX + sideDirection * .04, base + 1.2, g.z, glass);
  if (unit.shopBrand === 'yurtici') {
    box(group, .12, 2.05, (g.depth - .25), sideX + sideDirection * .19, base + 1.2, g.z, mat(brand.color));
    const adCanvas = document.createElement('canvas'); adCanvas.width = 1024; adCanvas.height = 256;
    const ad = adCanvas.getContext('2d');
    ad.fillStyle = brand.color; ad.fillRect(0, 0, 1024, 256);
    ad.fillStyle = brand.accent; ad.fillRect(0, 214, 1024, 42);
    ad.fillStyle = '#ffffff'; ad.textAlign = 'center';
    ad.font = 'bold 82px Arial'; ad.fillText('Yurtiçi Kargo', 512, 108);
    ad.font = '38px Arial'; ad.fillText('Türkiye’nin her yerine', 512, 175);
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
    stroke([[100, 82], [215, 240], [130, 416]], '#ffffff', 35);
    stroke([[270, 78], [206, 233], [280, 420]], '#ffffff', 35);
    stroke([[402, 80], [292, 243], [433, 417]], '#ff7c17', 37);
    ctx.textBaseline = 'middle'; ctx.font = 'italic 69px Arial'; ctx.fillStyle = '#ffffff';
    ctx.fillText('yurtiçi', 480, 250); ctx.fillStyle = '#ff7c17'; ctx.fillText('kargo', 672, 250);
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
 const cargo=peers.some(item=>/yurt/i.test(item.label||''))? /yurt/i.test(source.label||'') : !source.label || source.label==='Mağaza' ? peers.length>1 && source.area===Math.min(...peers.map(item=>item.area||1)) : false;
 const unit={...source,floor:floor.index+1,slot:g.x<0?0:1,number:floor.index*4+source.slot+1,shopBrand:cargo?'yurtici':'migros'};
 const group=new THREE.Group(); group.userData.unitId=source.id;group.name=source.usage==='shop'?'pilot-shop':'pilot-apartment';
 const direction=source.side==='front'?1:-1,outside=direction*10,base=floor.index*FLOOR_HEIGHT;
 if(g.width<2.4 || g.depth<3) {
   box(group,Math.max(.05,g.width-.1),FLOOR_HEIGHT-.25,Math.max(.05,g.depth-.1),g.x,g.y,g.z,mat(facadeWhite));
 } else if(source.usage==='shop') {
   addStore(group,{...unit,floor:1},g,picked);group.position.y=base;
   if(cargo) group.userData.cargoSide=unit.slot===0?-1:1;
 } else {
    const bodyMat = mat(facadeWhite, { roughness: .65 });
    const chrome = mat('#dce8ee', { roughness: .12, metalness: .72 });
    box(group, g.width - .1, FLOOR_HEIGHT - .25, g.depth - .1, g.x, g.y, g.z, bodyMat);
    const windowCount = Math.max(2, Math.floor(g.width / 2.6));
    for (let i = 0; i < windowCount; i++) {
      const inset = Math.min(1.8, g.width * .35);
      const x = g.x - g.width / 2 + inset + i * (g.width - 2 * inset) / (windowCount - 1);
      const kitchen = i === windowCount - 1;
      addWindow(group, { x, y: base + (kitchen ? 1.68 : 1.6), z: outside,
        rotation: direction < 0 ? Math.PI : 0, kitchen, state: kitchen ? (unit.floor + unit.slot) % 2 : (unit.number + i) % 3 });
    }
    if (Math.abs(Math.abs(g.x) + g.width / 2 - 10) < .1) {
    const sideX = unit.slot === 0 ? -10 : 10;
    const sideDirection = unit.slot === 0 ? -1 : 1;
    for (const dz of [-2.4, 2.4]) {
      const kitchen = dz * direction > 0;
      addWindow(group, { x: sideX, y: base + (kitchen ? 1.68 : 1.6), z: g.z + dz,
        rotation: sideDirection * Math.PI / 2, kitchen, state: (unit.number + (dz > 0 ? 1 : 0)) % 3 });
    }
    }
    box(group, g.width - .6, .16, 1.3, g.x, base + .25, outside + direction * .5, mat('#dce2e4'));
    const balconyGlass = mat('#31627e', { transparent: true, opacity: .78, roughness: .08, metalness: .18, depthWrite: false });
    box(group, g.width - .7, .78, .06, g.x, base + .82, outside + direction * 1.1, balconyGlass);
    for (const y of [.42, 1.24]) box(group, g.width - .65, .09, .1, g.x, base + y, outside + direction * 1.1, chrome);
    const posts = Math.ceil((g.width - .8) / 1.8);
    for (let i = 0; i <= posts; i++) {
      const x = g.x - g.width / 2 + .4 + i * (g.width - .8) / posts;
      box(group, .07, .92, .09, x, base + .81, outside + direction * 1.1, chrome);
    }
    for (const dx of [-g.width / 2 + .4, g.width / 2 - .4]) {
      box(group, .06, .78, 1.12, g.x + dx, base + .82, outside + direction * .53, balconyGlass);
      box(group, .1, .09, 1.2, g.x + dx, base + 1.24, outside + direction * .5, chrome);
    }
    if (unit.number === 5 || unit.number === 14 || unit.number === 19) {
      addPerson(group, g.x + 1.1, base + .34, outside + direction * .65, '#d18452');
      if (unit.number === 5) addPerson(group, g.x + 1.8, base + .34, outside + direction * .65, '#e5b93f', true);
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
     for(const unit of row.slice(0,-1))box(model,.95,FLOOR_HEIGHT-.22,2.8,(unit.x+unit.width/2)*20/block.width,(floor.index+.5)*FLOOR_HEIGHT,(side==='front'?1:-1)*10.7,mat('#ffffff'));
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
