import { planFloor, placeFloor } from './layout.mjs?v=20261029-eph26';
const SHOP_TYPES = new Set(['DUKKAN_MAGAZA', 'MARKET', 'SHOWROOM']);
const finite = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
export function adaptProject(setup, scene) {
  if (!setup || typeof setup.id !== 'string' || !Array.isArray(setup.blocks) || !Array.isArray(setup.units)) throw new Error('Proje verisi okunamadı.');
  if (setup.units.length > 10000 || setup.blocks.length > 100) throw new Error('Proje görüntüleme sınırını aşıyor.');
  const ids = new Set(); const warnings = new Set();
  const blocks = setup.blocks.map((block, index) => {
    const source = scene?.elements?.find(element => element.type === 'BLOCK' && (element.sourceId === block.id || element.blockId === block.id));
    const width = finite(source?.size?.width, 20), depth = finite(source?.size?.depth, 20);
    if (!source?.size?.width || !source?.size?.depth) warnings.add('Blok ölçüsü eksik: 20 × 20 m şematik oturum gösteriliyor.');
    if (!['DIKDORTGEN','KARE','TEK_CEPHELI_STANDART','CIFT_CEPHELI_STANDART','UC_CEPHELI_STANDART','DORT_CEPHELI_STANDART'].includes(block.geometryType)) warnings.add('Karmaşık geometri dikdörtgen şema olarak gösterilir; mevcut mimari yerleşim kaydı değiştirilmez.');
    const floors = [...(block.floors || [])].sort((a,b) => a.level - b.level).map((floor, floorIndex) => {
      const raw = setup.units.filter(unit => unit.blockId === block.id && unit.floorId === floor.id);
      raw.forEach(unit => { if (!unit.id || ids.has(unit.id)) throw new Error('Bölüm kimlikleri geçersiz veya tekrar ediyor.'); ids.add(unit.id); });
      const byId = new Map(raw.map(unit => [unit.id, unit]));
      if (raw.some(unit => !finite(unit.netArea, finite(unit.area, finite(unit.grossArea, null))))) warnings.add('m² eksik bölümlerin genişliği oda sayısına göre belirlendi; envanterden alanlarını tamamlayın.');
      const units = placeFloor(planFloor(raw, unit => SHOP_TYPES.has(unit.type)), width, depth).map(item => {
        const unit = byId.get(item.id), shop = item.usage === 'shop';
        return { id: item.id, sourceId: item.id, number: item.number, title: `${shop ? 'Mağaza' : 'Daire'} ${item.number}`,
          type: item.type, roomCount: unit.roomCount || '', usage: item.usage, label: unit.conceptLabel || (shop ? 'Mağaza' : unit.roomCount || unit.type),
          area: item.area, netArea: unit.netArea ?? null, grossArea: unit.grossArea ?? null, side: item.side, level: floor.level, floorId: floor.id, floor: floorIndex + 1,
          slot: item.slot, width: item.width, depth: item.depth, x: item.x, z: item.z };
      });
      return { id: floor.id, label: floor.label, level: floor.level, index: floorIndex, units: [...units.filter(u => u.side === 'front'), ...units.filter(u => u.side === 'rear')] };
    });
    const height = finite(source?.size?.height, floors.length * 3.52);
    const facadeCount = Number(block.facadeViewCount) || { TEK_CEPHELI_STANDART: 1, CIFT_CEPHELI_STANDART: 2, UC_CEPHELI_STANDART: 3, DORT_CEPHELI_STANDART: 4 }[block.geometryType] || null;
    return { facadeCount, id: block.id, name: block.name || `${block.code} Blok`, width, depth, floorHeight: height / Math.max(1,floors.length), floors, index, sourcePosition: Array.isArray(source?.position) && Number.isFinite(source.position[0]) && Number.isFinite(source.position[2]) ? { x: source.position[0], z: source.position[2] } : null };
  });
  const placed = layoutBlocks(blocks);
  if (placed.some(block => block.schematicPosition) && blocks.length > 1) warnings.add('Blokların arsa konumu eksik veya çakışıyor; bloklar şematik olarak yan yana yerleştirildi.');
  if (ids.size !== setup.units.length) warnings.add('Bloğa veya kata bağlanmamış bölümler çizilmedi.');
  return { projectId: setup.id, name: setup.name, blocks: placed, warnings: [...warnings] };
}

export function layoutBlocks(blocks) {
  const hasPositions = blocks.every(block => block.sourcePosition) && blocks.every((block,index) => blocks.slice(0,index).every(other => Math.abs(block.sourcePosition.x-other.sourcePosition.x) >= (block.width+other.width)/2+2 || Math.abs(block.sourcePosition.z-other.sourcePosition.z) >= (block.depth+other.depth)/2+2));
  const columns=Math.ceil(Math.sqrt(blocks.length)),rows=Math.ceil(blocks.length/columns);
  const stepX=Math.max(20,...blocks.map(block=>block.width))*2.2+4,stepZ=Math.max(20,...blocks.map(block=>block.depth))*2.2+4;
  return blocks.map((block,index)=>({...block,position:hasPositions?{...block.sourcePosition}:{x:(index%columns-(columns-1)/2)*stepX,z:(Math.floor(index/columns)-(rows-1)/2)*stepZ},schematicPosition:!hasPositions}));
}
