import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OfficePoolService } from './office-pool.service';

function fixture() {
  const users: any = { owner: { id: 'owner', officeId: 'o' }, a: { id: 'a', officeId: 'o' }, b: { id: 'b', officeId: 'o' }, out: { id: 'out', officeId: null } };
  const units: any[] = [
    { id: 'u1', hiddenFromOffice: false, project: { ownerId: 'a' } },
    { id: 'u2', hiddenFromOffice: true, project: { ownerId: 'a' } },
    { id: 'u3', hiddenFromOffice: true, project: { ownerId: 'b' } },
  ];
  const full = (u: any) => ({ ...u, type: 'DAIRE', roomCount: '2+1', netArea: 1, grossArea: 2, price: 3, priceCurrency: 'TRY', status: 'SATILIK', updatedAt: new Date(), images: [{ url: 'x', supabaseUrl: 's', isCover: true, sortOrder: 0 }], project: { ...u.project, name: 'P', city: 'c', district: 'd', neighborhood: 'n', owner: { id: u.project.ownerId, firstName: 'A', lastName: 'B', phone: '555' } }, description: 'd', floor: 1, floorLabel: '1', totalFloors: 5, facades: ['N'], features: ['f'], deedOwnerName: 'SECRET', contactPhone: 'SECRET' });
  // Evaluates only the visibility clause; the scope/status clauses are covered by the Prisma query shape.
  const visible = (u: any, where: any): boolean => where.AND.every((w: any) => {
    if (!w.OR || !w.OR.some((c: any) => 'hiddenFromOffice' in c)) return true;
    return w.OR.some((c: any) => ('hiddenFromOffice' in c ? !u.hiddenFromOffice : u.project.ownerId === c.project.ownerId));
  });
  const db: any = {
    office: { findUnique: jest.fn(async () => ({ id: 'o', ownerUserId: 'owner' })) },
    user: { findFirst: jest.fn(async ({ where }) => (users[where.id]?.officeId === where.officeId ? users[where.id] : null)) },
    unit: {
      findMany: jest.fn(async ({ where }) => units.filter(u => visible(u, where)).map(full)),
      findFirst: jest.fn(async ({ where }) => { const u = units.find(x => x.id === where.AND[0].id); return u && visible(u, where) ? full(u) : null; }),
      findUnique: jest.fn(async ({ where }) => units.find(u => u.id === where.id) || null),
      update: jest.fn(async ({ where, data }) => Object.assign(units.find(u => u.id === where.id), data)),
    },
  };
  return { service: new OfficePoolService(db), units, db };
}

describe('EPH-68A office shared pool', () => {
  it('owner sees every record', async () => {
    const f = fixture();
    const r = await f.service.pool('owner', 'o');
    expect(r.items.map(i => i.id)).toEqual(['u1', 'u2', 'u3']);
  });
  it('advisor does not see others hidden records but sees own hidden ones', async () => {
    const f = fixture();
    const r = await f.service.pool('a', 'o');
    expect(r.items.map(i => i.id)).toEqual(['u1', 'u2']);
    expect(r.items.find(i => i.id === 'u2')).toMatchObject({ isMine: true, hiddenFromOffice: true });
  });
  it('scopes to active, non-PASIF office units and returns no private fields', async () => {
    const f = fixture();
    const r = await f.service.pool('owner', 'o', { status: 'rent' });
    const where = JSON.stringify(f.db.unit.findMany.mock.calls[0][0].where);
    expect(where).toContain('"isActive":true');
    expect(where).toContain('PASIF');
    expect(where).toContain('KIRALIK');
    expect(JSON.stringify(r)).not.toMatch(/deedOwner|contactPhone|whatsappPhone|doorAccessInfo|adaNo|parselNo/);
    expect(r.items[0].coverUrl).toBe('s');
  });
  it('rejects users outside the office with 403', async () => {
    const f = fixture();
    await expect(f.service.pool('out', 'o')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(f.service.setVisibility('out', 'o', 'u1', true)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('only the portfolio owner can hide; others and the office owner cannot', async () => {
    const f = fixture();
    await expect(f.service.setVisibility('b', 'o', 'u1', true)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(f.service.setVisibility('owner', 'o', 'u1', true)).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.units[0].hiddenFromOffice).toBe(false);
    expect(await f.service.setVisibility('a', 'o', 'u1', true)).toMatchObject({ id: 'u1', hiddenFromOffice: true });
  });
  it('validates body and status', async () => {
    const f = fixture();
    await expect(f.service.setVisibility('a', 'o', 'u1', 'yes')).rejects.toBeInstanceOf(BadRequestException);
    await expect(f.service.pool('a', 'o', { status: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('detail applies the same visibility rule as the list', async () => {
    const f = fixture();
    await expect(f.service.detail('a', 'o', 'u3')).rejects.toBeInstanceOf(NotFoundException);
    expect(await f.service.detail('a', 'o', 'u2')).toMatchObject({ id: 'u2', isMine: true, hiddenFromOffice: true });
    expect(await f.service.detail('a', 'o', 'u1')).toMatchObject({ id: 'u1', isMine: true });
    expect((await f.service.detail('owner', 'o', 'u3')).id).toBe('u3');
    await expect(f.service.detail('b', 'o', 'nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(f.service.detail('out', 'o', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('detail returns agent phone and images, no private fields', async () => {
    const f = fixture();
    const r = await f.service.detail('owner', 'o', 'u1');
    expect(r.agent).toEqual({ id: 'a', fullName: 'A B', phone: '555' });
    expect(r.images).toEqual([{ id: undefined, url: 's' }]);
    expect(r).toMatchObject({ title: 'P', floorLabel: '1', totalFloors: 5, facades: ['N'], features: ['f'], description: 'd' });
    expect(JSON.stringify(r)).not.toMatch(/SECRET|deedOwner|contactPhone|whatsappPhone|doorAccessInfo|adaNo|parselNo|latitude|longitude/);
  });
});
