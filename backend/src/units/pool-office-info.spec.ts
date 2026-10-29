import { Role } from '@prisma/client';
import { UnitsService } from './units.service';
import { serializePoolOfficeInfo } from './pool-privacy';

const officeOwner = { id: 'office-owner', firstName: 'Ofis', lastName: 'Sahibi', phone: '05550000002' };
const office = { id: 'o1', name: 'Ofis', city: 'Ankara', district: 'Çankaya', neighborhood: 'Kızılay', ownerUserId: 'office-owner', owner: officeOwner };
const project = { id: 'p1', ownerId: 'owner', isActive: true, owner: { id: 'owner', role: Role.EMLAKCI, phone: '05550000001', office } };
const unit = { id: 'u1', project, images: [], allowPhoneCall: false, allowWhatsapp: false };

function redact(user: { id: string; role: Role }, unlocked: boolean, u: any = unit) {
  const service: any = Object.create(UnitsService.prototype);
  service.isSuperAdmin = (x: { role?: string }) => x?.role === Role.SUPER_ADMIN;
  service.isOwner = (x: { id?: string }, ownerId: string) => x?.id === ownerId;
  service.redactDoorAccessInfo = (_u: unknown, value: unknown) => value;
  return service.redactPoolUnitForViewer(user, u, unlocked);
}

describe('Havuz ofis bilgileri (EPH-17C)', () => {
  it('yetkisiz kullanıcı yanıtında ofis alanları null ve değerler sızmaz', () => {
    const result = redact({ id: 'viewer', role: Role.EMLAKCI }, false);
    expect(result).toMatchObject({ officePhone: null, officeOwnerPhone: null, officeAddress: null });
    expect(JSON.stringify(result)).not.toContain('05550000');
  });

  it('İletişime Geç ile açan, ilan sahibi, ofis sahibi ve süper admin görür', () => {
    for (const [user, unlocked] of [
      [{ id: 'viewer', role: Role.EMLAKCI }, true],
      [{ id: 'owner', role: Role.EMLAKCI }, false],
      [{ id: 'office-owner', role: Role.EMLAKCI }, false],
      [{ id: 'admin', role: Role.SUPER_ADMIN }, false],
    ] as const) {
      expect(redact({ ...user }, unlocked)).toMatchObject({
        officePhone: '05550000001',
        officeOwnerPhone: '05550000002',
        officeAddress: 'Kızılay, Çankaya, Ankara',
      });
    }
  });

  it('ofis yoksa null', () => {
    const noOffice = { ...unit, project: { ...project, owner: { ...project.owner, office: null } } };
    expect(serializePoolOfficeInfo(noOffice, true)).toEqual({ officePhone: null, officeOwnerPhone: null, officeAddress: null });
    expect(redact({ id: 'admin', role: Role.SUPER_ADMIN }, true, noOffice)).toMatchObject({ officePhone: null, officeOwnerPhone: null, officeAddress: null });
  });
});
