import { Role } from '@prisma/client';
import { UnitsService } from './units.service';

const contact = { fullName: 'Ayşe Yılmaz', phone: '+905551112233', whatsapp: '+905551112233', whatsappSameAsPhone: true, email: 'ayse@example.com', projectId: 'secret', id: 'secret' };
const owner = { office: { ownerUserId: 'office-owner' } };

function view(user: { id: string; role: Role }, unlocked: boolean, value: unknown = contact) {
  const service: any = Object.create(UnitsService.prototype);
  service.isSuperAdmin = (current: { role?: string }) => current?.role === Role.SUPER_ADMIN;
  return service.getProjectAuthorizedContact(user, value, owner, unlocked);
}

describe('Proje Yetkilisi görünürlüğü', () => {
  it('kilitliyken diğer kullanıcıya dönmez', () => {
    expect(view({ id: 'viewer', role: Role.EMLAKCI }, false)).toBeNull();
  });

  it('Özel bilgileri açan kullanıcıya yalnız ilgili alanlar döner', () => {
    expect(view({ id: 'viewer', role: Role.EMLAKCI }, true)).toEqual({
      fullName: 'Ayşe Yılmaz', phone: '+905551112233', whatsapp: '+905551112233', whatsappSameAsPhone: true, email: 'ayse@example.com',
    });
  });

  it('ofis sahibi ve süper admin kilitliyken de görür', () => {
    expect(view({ id: 'office-owner', role: Role.EMLAKCI }, false)).not.toBeNull();
    expect(view({ id: 'admin', role: Role.SUPER_ADMIN }, false)).not.toBeNull();
  });

  it('kayıt yoksa null döner', () => {
    expect(view({ id: 'admin', role: Role.SUPER_ADMIN }, true, null)).toBeNull();
  });
});
