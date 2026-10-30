import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UnitsService } from './units.service';

// Danışmanın portföy detayını: ilan sahibi, aynı ofisin sahibi ve süper admin açar (EPH_KURALLARI §0).
const unit = {
  id: 'unit-1',
  status: 'AKTIF',
  isPoolVisible: false,
  approvalStatus: 'INCELEMEDE',
  deedOwnerFullName: 'Tapu Sahibi',
  doorAccessInfo: 'Kapı 12',
  project: { id: 'p1', ownerId: 'advisor', isActive: true, code: null, declaredIndependentUnitCount: null, declaredSalesInventoryCount: null, plannedUnitTypes: [], _count: {} },
};

function service() {
  const prisma: any = {
    unit: { findUnique: jest.fn().mockResolvedValue(unit) },
    user: {
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(where.office.ownerUserId === 'office-owner' ? [{ id: 'advisor' }] : []),
      ),
    },
    userBlock: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return new UnitsService(prisma);
}

const open = (id: string, role: Role) => service().findOne({ id, role }, 'unit-1');

describe('Portföy detayı – ofis sahibi erişimi', () => {
  it('ilan sahibi açar', async () => {
    await expect(open('advisor', Role.EMLAKCI)).resolves.toMatchObject({ id: 'unit-1', deedOwnerFullName: 'Tapu Sahibi' });
  });

  it('aynı ofisin sahibi açar ve tapu sahibi bilgisini görür', async () => {
    await expect(open('office-owner', Role.EMLAKCI)).resolves.toMatchObject({
      id: 'unit-1',
      deedOwnerFullName: 'Tapu Sahibi',
      doorAccessInfo: 'Kapı 12',
    });
  });

  it('başka ofisin sahibi açamaz', async () => {
    await expect(open('other-office-owner', Role.EMLAKCI)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ilgisiz kullanıcı açamaz', async () => {
    await expect(open('stranger', Role.EMLAKCI)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ilgisiz kullanıcı havuzdaki ama onaysız ilanda yetki hatası alır', async () => {
    const svc: any = service();
    svc.prisma.unit.findUnique.mockResolvedValue({ ...unit, status: 'AKTIF', isPoolVisible: true });
    await expect(svc.findOne({ id: 'stranger', role: Role.EMLAKCI }, 'unit-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('süper admin her zaman açar', async () => {
    await expect(open('admin', Role.SUPER_ADMIN)).resolves.toMatchObject({ id: 'unit-1', deedOwnerFullName: 'Tapu Sahibi' });
  });
});
