import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OfficePoolService } from './office-pool.service';

function fixture() {
  const users: any = { owner: { id: 'owner', officeId: 'o' }, a: { id: 'a', officeId: 'o' }, b: { id: 'b', officeId: 'o' }, out: { id: 'out', officeId: null } };
  const units: any[] = [
    { id: 'u1', hiddenFromOffice: false, project: { ownerId: 'a' } },
    { id: 'u2', hiddenFromOffice: true, project: { ownerId: 'a' } },
    { id: 'u3', hiddenFromOffice: true, project: { ownerId: 'b' } },
  ];
  const full = (u: any) => ({ ...u, type: 'DAIRE', roomCount: '2+1', netArea: 1, grossArea: 2, price: 3, priceCurrency: 'TRY', status: 'SATILIK', updatedAt: new Date(), images: [{ url: 'x', supabaseUrl: 's', isCover: true, sortOrder: 0 }], project: { ...u.project, name: 'P', city: 'c', district: 'd', neighborhood: 'n', owner: { id: u.project.ownerId, firstName: 'A', lastName: 'B' } } });
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
});
