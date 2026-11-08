// EPH-30: Her daireye ayrı balkon, bölme duvarı ve derz/pilaster geometrisi
export function getBalconyRatio(roomCount) {
  const text = String(roomCount || '');
  if (text.includes('3+') || text.includes('4+') || text.includes('5+')) return 0.68;
  if (text.includes('2+')) return 0.60;
  if (text.includes('1+')) return 0.56;
  return 0.62;
}

export function computeRowBalconies(rowUnits, blockWidth = 20) {
  const margin = 0.20;
  const balconies = [];
  const partitions = [];
  const pilasters = [];
  const n = rowUnits.length;

  for (let i = 0; i < n; i++) {
    const u = rowUnits[i];
    if (u.usage === 'shop') continue;

    const W = u.width * 20 / blockWidth;
    const gX = u.x * 20 / blockWidth;
    const xStart = gX - W / 2;
    const xEnd = gX + W / 2;

    const ratio = getBalconyRatio(u.roomCount);
    // Genişliğin %55 - %70'i
    const bWidth = Math.max(1.2, Math.min(W - 0.5, W * ratio));

    // Salon tarafı: çiftlerde birbirine doğru (i%2===0 sağa, i%2===1 sola), tek kalan sola
    let align = 'right';
    if (i % 2 === 0) {
      align = (i + 1 < n) ? 'right' : 'left';
    } else {
      align = 'left';
    }

    let bStartX, bEndX, bX;
    let wStartX, wEndX;
    if (align === 'right') {
      bEndX = xEnd - margin;
      bStartX = bEndX - bWidth;
      bX = (bStartX + bEndX) / 2;
      wStartX = xStart + 0.15;
      wEndX = bStartX - 0.15;
    } else {
      bStartX = xStart + margin;
      bEndX = bStartX + bWidth;
      bX = (bStartX + bEndX) / 2;
      wStartX = bEndX + 0.15;
      wEndX = xEnd - 0.15;
    }

    balconies.push({
      unitId: u.id,
      number: u.number,
      roomCount: u.roomCount,
      side: u.side,
      width: bWidth,
      unitWidth: W,
      ratio: bWidth / W,
      startX: bStartX,
      endX: bEndX,
      x: bX,
      align,
      indexInRow: i,
      windowSection: {
        startX: wStartX,
        endX: wEndX,
        width: Math.max(0, wEndX - wStartX),
        centerX: (wStartX + wEndX) / 2,
      },
    });
  }

  // Daire sınırlarında derz/pilaster ve komşu balkonlar arasında bölme duvarı
  for (let i = 0; i < n - 1; i++) {
    const uCurr = rowUnits[i];
    const uNext = rowUnits[i + 1];
    const boundaryX = (uCurr.x + uCurr.width / 2) * 20 / blockWidth;
    pilasters.push({ boundaryX, side: uCurr.side });

    const bCurr = balconies.find(b => b.unitId === uCurr.id);
    const bNext = balconies.find(b => b.unitId === uNext.id);
    if (bCurr && bNext) {
      partitions.push({
        boundaryX,
        side: uCurr.side,
        depth: 1.30,
        between: [bCurr.unitId, bNext.unitId]
      });
    }
  }

  // Komşu balkonlar arasındaki mesafeler
  const gaps = [];
  for (let i = 0; i < balconies.length - 1; i++) {
    const b1 = balconies[i];
    const b2 = balconies[i + 1];
    const gap = b2.startX - b1.endX;
    gaps.push({ b1: b1.unitId, b2: b2.unitId, gap });
  }

  return { balconies, partitions, pilasters, gaps };
}
