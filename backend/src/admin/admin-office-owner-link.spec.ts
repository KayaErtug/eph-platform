import { Capability, Role } from '@prisma/client';
import { AdminService } from './admin.service';

describe('EPH-33 OFFICE_OWNER yetkisi ↔ Office.ownerUserId', () => {
  const actor = { id: 'super-id', role: Role.SUPER_ADMIN };
  let prisma: any;
  let service: any;
  let userRow: any;

  beforeEach(() => {
    userRow = { id: 'kutay', email: 'k@example.com', firstName: 'Kutay', lastName: 'Kaya', role: Role.EMLAKCI, officeId: 'office-1', capabilities: [] };
    prisma = {
      user: { findUnique: jest.fn(async () => userRow), update: jest.fn((a: any) => a) },
      office: {
        findFirst: jest.fn().mockResolvedValue({ id: 'office-1', ownerUserId: 'old-owner' }),
        update: jest.fn((a: any) => a),
        updateMany: jest.fn((a: any) => a),
      },
      userCapability: { deleteMany: jest.fn((a: any) => a), upsert: jest.fn((a: any) => a) },
      document: { updateMany: jest.fn((a: any) => a) },
      $transaction: jest.fn(async (ops: any[]) => ops),
    };
    service = new AdminService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service, 'resolveOperationalPermission').mockResolvedValue({ enabled: true });
    jest.spyOn(service, 'logAdminAction').mockResolvedValue(undefined);
  });

  it('yetki verilince kullanıcının ofisinin ownerUserId değeri ona bağlanır', async () => {
    await service.updateUserCapabilities('kutay', [Capability.OFFICE_OWNER], actor);
    expect(prisma.office.update).toHaveBeenCalledWith({ where: { id: 'office-1' }, data: { ownerUserId: 'kutay' } });
    expect(prisma.office.updateMany).not.toHaveBeenCalled();
  });

  it('ofisi yoksa ofis kaydına dokunulmaz (Ofisim ekranından ofis kurulur)', async () => {
    userRow.officeId = null;
    await service.updateUserCapabilities('kutay', [Capability.OFFICE_OWNER], actor);
    expect(prisma.office.update).not.toHaveBeenCalled();
    expect(prisma.userCapability.upsert).toHaveBeenCalled();
  });

  it('yetki kaldırılınca ownerUserId bağı çözülür', async () => {
    userRow.capabilities = [{ capability: Capability.OFFICE_OWNER }];
    await service.updateUserCapabilities('kutay', [], actor);
    expect(prisma.office.updateMany).toHaveBeenCalledWith({ where: { ownerUserId: 'kutay' }, data: { ownerUserId: null } });
    expect(prisma.office.update).not.toHaveBeenCalled();
  });
});
