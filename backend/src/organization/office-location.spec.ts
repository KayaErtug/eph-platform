import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { officeLocationData } from './office-location';
import { OrganizationService } from './organization.service';

describe('Office location hierarchy', () => {
  it.each([undefined, null, '', '  '])('requires city for create (%s)', city => {
    expect(() => officeLocationData({ city })).toThrow(BadRequestException);
  });
  it('accepts only a city, with optional children empty', () => {
    expect(officeLocationData({ city: ' denizli ' })).toEqual({ city: 'Denizli', district: null, neighborhood: null });
  });
  it('normalizes selected location and supports KKTC', () => {
    expect(officeLocationData({ city: 'KKTC', district: ' Lefkoşa ', neighborhood: ' Gönyeli ' })).toEqual({ city: 'KKTC', district: 'Lefkoşa', neighborhood: 'Gönyeli' });
  });
  it.each(['hayali il', 42, {}, ['Denizli']])('rejects invalid city (%s)', city => {
    expect(() => officeLocationData({ city: city as any })).toThrow(BadRequestException);
  });
  it('rejects neighborhood without district', () => {
    expect(() => officeLocationData({ city: 'Denizli', neighborhood: 'Şemikler' })).toThrow(BadRequestException);
  });
  const old = { city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Şemikler' };
  it('clears descendants on parent change', () => {
    expect(officeLocationData({ city: 'İzmir' }, old)).toEqual({ city: 'İzmir', district: null, neighborhood: null });
    expect(officeLocationData({ district: 'Pamukkale' }, old)).toEqual({ city: 'Denizli', district: 'Pamukkale', neighborhood: null });
    expect(officeLocationData({ district: null }, old)).toEqual({ city: 'Denizli', district: null, neighborhood: null });
  });
  it('keeps omitted descendants when parents remain unchanged', () => {
    expect(officeLocationData({ city: 'Denizli' }, old)).toEqual(old);
  });
  it('allows state-only updates on legacy offices without city', () => {
    expect(officeLocationData({}, { city: null, district: null })).toEqual({});
    expect(() => officeLocationData({ city: null }, old)).toThrow(BadRequestException);
  });
  it('rejects oversized or non-string children', () => {
    expect(() => officeLocationData({ city: 'Denizli', district: 'a'.repeat(161) })).toThrow(BadRequestException);
    expect(() => officeLocationData({ city: 'Denizli', district: {} as any })).toThrow(BadRequestException);
  });
});

describe('Organization office persistence', () => {
  const actor = { id: 'super', role: Role.SUPER_ADMIN };
  function setup(previous: any = null) {
    const create = jest.fn(async ({ data }) => ({ id: 'office', ...data }));
    const update = jest.fn(async ({ data }) => ({ id: 'office', ...data }));
    const prisma = { office: { findUnique: jest.fn(async ({ where }) => where.id ? previous : null) }, $transaction: jest.fn(async fn => fn({ office: { create, update } })) };
    return { service: new OrganizationService(prisma as any), prisma, create, update };
  }
  it('SUPER_ADMIN can create city-only office', async () => {
    const t = setup();
    expect(await t.service.createOffice({ name: 'Ofis', city: 'Denizli' }, actor)).toMatchObject({ city: 'Denizli', district: null, neighborhood: null });
    expect(t.create).toHaveBeenCalledTimes(1);
  });
  it('persists selected neighborhood during create and edit', async () => {
    const t = setup({ id: 'office', name: 'Ofis', ownerUserId: null, city: 'Denizli', district: 'Merkezefendi', neighborhood: null });
    const data = { name: 'Ofis', city: 'Denizli', district: 'Merkezefendi', neighborhood: 'Şemikler' };
    expect(await t.service.createOffice(data, actor)).toMatchObject(data);
    expect(await t.service.updateOffice('office', data, actor)).toMatchObject(data);
  });
  it('rejects missing city before database writes', async () => {
    const t = setup();
    await expect(t.service.createOffice({ name: 'Ofis' }, actor)).rejects.toThrow(BadRequestException);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('retains administrator and normal-user boundaries', async () => {
    const t = setup();
    await expect(t.service.createOffice({ name: 'Ofis', city: 'Denizli' }, { id: 'admin', role: Role.ADMIN })).resolves.toBeTruthy();
    await expect(t.service.createOffice({ name: 'Ofis', city: 'Denizli' }, { id: 'member', role: Role.EMLAKCI })).rejects.toThrow(ForbiddenException);
  });
  it('legacy office activation does not require city', async () => {
    const t = setup({ id: 'office', name: 'Ofis', ownerUserId: null, city: null, district: null, neighborhood: null });
    await expect(t.service.updateOffice('office', { isActive: false }, actor)).resolves.toMatchObject({ isActive: false });
    expect(t.update.mock.calls[0][0].data).not.toHaveProperty('city');
  });
});
