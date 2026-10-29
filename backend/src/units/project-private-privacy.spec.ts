import { Role } from '@prisma/client';
import { UnitsService } from './units.service';
import { canSeeProjectPrivateInfo, redactProjectPrivateInfo } from './project-private-privacy';

const project = {
  id: 'p1', ownerId: 'owner', city: 'Ankara', district: 'Çankaya', neighborhood: 'Kızılay',
  name: 'Proje', address: 'Gizli Sk. 5', mapAddress: 'Gizli Sk. 5 Çankaya', latitude: 39.91234, longitude: 32.85678, placeId: 'pid',
  authorizedContact: { fullName: 'Ayşe', phone: '0555', whatsapp: '0555', whatsappSameAsPhone: true, email: 'a@b.c' },
  owner: { role: Role.MUTEAHHIT, office: { ownerUserId: 'office-owner' } },
};
const unit = { id: 'u1', project, images: [], allowPhoneCall: false, allowWhatsapp: false };

function redact(user: { id: string; role: Role }, unlocked: boolean) {
  const service: any = Object.create(UnitsService.prototype);
  service.isSuperAdmin = (u: { role?: string }) => u?.role === Role.SUPER_ADMIN;
  service.isOwner = (u: { id?: string }, ownerId: string) => u?.id === ownerId;
  service.redactDoorAccessInfo = (_u: unknown, value: unknown) => value;
  return service.redactPoolUnitForViewer(user, unit, unlocked);
}

describe('Proje adres/konum gizleme', () => {
  it('yetkisiz kullanıcı yanıtında alanlar yok, şehir/ilçe/mahalle açık', () => {
    const result = redact({ id: 'viewer', role: Role.EMLAKCI }, false);
    expect(result.project).toMatchObject({ address: null, mapAddress: null, latitude: 39.91, longitude: 32.86, locationApproximate: true, city: 'Ankara', district: 'Çankaya', neighborhood: 'Kızılay' });
    expect(result.project.authorizedContact).toBeUndefined();
    expect(result.projectAuthorizedContact).toBeNull();
    expect(JSON.stringify(result)).not.toContain('Gizli Sk.');
    expect(result.project.placeId).toBeNull();
  });

  it('proje sahibi, ofis sahibi, süper admin ve açan kullanıcı görür', () => {
    for (const [user, unlocked] of [
      [{ id: 'owner', role: Role.MUTEAHHIT }, false],
      [{ id: 'office-owner', role: Role.EMLAKCI }, false],
      [{ id: 'admin', role: Role.SUPER_ADMIN }, false],
      [{ id: 'viewer', role: Role.EMLAKCI }, true],
    ] as const) {
      const result = redact({ ...user }, unlocked);
      expect(result.project).toMatchObject({ address: 'Gizli Sk. 5', mapAddress: 'Gizli Sk. 5 Çankaya', latitude: 39.91234, longitude: 32.85678, locationApproximate: false });
      expect(result.projectAuthorizedContact).not.toBeNull();
    }
  });

  it('yardımcı: redactProjectPrivateInfo alanları siler', () => {
    expect(redactProjectPrivateInfo(project, false)).toMatchObject({ address: null, mapAddress: null, latitude: 39.91, longitude: 32.86, locationApproximate: true, city: 'Ankara' });
    expect((redactProjectPrivateInfo(project, false) as any).authorizedContact).toBeUndefined();
    expect(redactProjectPrivateInfo(project, true)).toMatchObject({ address: 'Gizli Sk. 5', latitude: 39.91234, locationApproximate: false });
    expect(redactProjectPrivateInfo({ ...project, latitude: 39.91234, longitude: 32.85678 }, false)).toMatchObject({ latitude: 39.91, longitude: 32.86 });
    expect(redactProjectPrivateInfo({ ...project, latitude: null, longitude: undefined }, false)).toMatchObject({ latitude: null, longitude: null, locationApproximate: true });
    expect(canSeeProjectPrivateInfo({ id: 'x', role: Role.EMLAKCI }, 'owner', 'office-owner', false)).toBe(false);
  });
});
