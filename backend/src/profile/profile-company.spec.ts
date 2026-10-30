import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProfileService } from './profile.service';
import { AdminService } from '../admin/admin.service';
import { companyName } from './company-name';
import { networkProfessionalContact } from '../network/network-contact-policy';
import { serializePoolPrivateInfo } from '../units/pool-privacy';

describe('Professional employer profile', () => {
  const file = { buffer: Buffer.from('document'), size: 8, mimetype: 'application/pdf', originalname: 'myk.pdf' } as any;
  let db: any; let storage: any; let service: ProfileService;
  beforeEach(() => {
    db = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'user', role: Role.EMLAKCI, companyName: null, capabilities: [], professionalVerificationStatus: 'PENDING' }), update: jest.fn() } };
    storage = { uploadFile: jest.fn() };
    service = new ProfileService(db, storage);
    jest.spyOn(service, 'getProfile').mockResolvedValue({ companyName: 'Kaya Emlak' } as any);
  });
  it.each([undefined, null, '', ' ', 'A', 42, {}, '123456', 'a'.repeat(121), 'Kaya\u0000'])('rejects invalid employer %p', v => expect(() => companyName(v)).toThrow(BadRequestException));
  it('normalizes Turkish office/company name', () => expect(companyName('  Şimşek   İnşaat  ')).toBe('Şimşek İnşaat'));
  it.each([Role.EMLAKCI, Role.MUTEAHHIT, Role.INSAAT_FIRMASI])('requires employer during profile save for %s', async role => {
    db.user.findUnique.mockResolvedValue({ role, companyName: null });
    await expect(service.updateProfile('user', { firstName: 'Ali' })).rejects.toThrow(/firma/);
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it('saves name without assigning office, team or capability', async () => {
    await service.updateProfile('user', { companyName: ' Kaya Emlak ', officeId: 'attack', capabilities: ['OFFICE_OWNER'] } as any);
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 'user' }, data: { companyName: 'Kaya Emlak' } });
  });
  it('preserves saved employer if omitted; rejects clearing it', async () => {
    db.user.findUnique.mockResolvedValue({ role: Role.EMLAKCI, companyName: 'Kaya Emlak' });
    await service.updateProfile('user', { firstName: 'Ali' });
    expect(db.user.update.mock.calls[0][0].data.companyName).toBe('Kaya Emlak');
    await expect(service.updateProfile('user', { companyName: '' })).rejects.toThrow();
  });
  it('onboarding rejects missing company before password/role writes', async () => {
    db.user.findUnique.mockResolvedValue({ role: Role.ADAY, passwordHash: null });
    await expect(service.completeInitialProfile('user', { firstName: 'Ali', lastName: 'Kaya', city: 'Denizli', role: Role.EMLAKCI, registrationType: 'EMLAK_DANISMANI', password: 'test123' })).rejects.toThrow(/firma/);
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it('onboarding stores employer and does not create an office membership', async () => {
    db.user.findUnique.mockResolvedValue({ role: Role.ADAY, passwordHash: null });
    const tx = { user: db.user, userCapability: { upsert: jest.fn() }, pendingRegistration: { findFirst: jest.fn().mockResolvedValue(null) } };
    db.$transaction = jest.fn(cb => cb(tx));
    await service.completeInitialProfile('user', { firstName: 'Ali', lastName: 'Kaya', city: 'Denizli', role: Role.EMLAKCI, registrationType: 'EMLAK_DANISMANI', password: 'test123', companyName: 'Kaya Emlak' });
    expect(db.user.update.mock.calls[0][0].data).toMatchObject({ companyName: 'Kaya Emlak', profileCompleted: false });
    expect(db.user.update.mock.calls[0][0].data).not.toHaveProperty('officeId');
    expect(tx.userCapability.upsert).not.toHaveBeenCalled();
  });
  it('blocks document storage until company exists', async () => {
    await expect(service.uploadDocument('user', 'MYK_BELGESI', file)).rejects.toThrow(/firma/);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });
  it('accepts document with persisted employer', async () => {
    db.user.findUnique.mockResolvedValue({ role: Role.EMLAKCI, companyName: 'Kaya Emlak', capabilities: [], professionalVerificationStatus: 'PENDING' });
    db.$transaction = jest.fn(cb => cb({ document: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'doc', fileUrl: 'path' }) }, user: { update: jest.fn() } }));
    storage.createSignedUrl = jest.fn().mockResolvedValue('signed');
    await expect(service.uploadDocument('user', 'MYK_BELGESI', file)).resolves.toMatchObject({ id: 'doc' });
    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
  });
  it('admin cannot approve a professional document with missing employer', async () => {
    const admin = Object.create(AdminService.prototype) as any;
    admin.prisma = db; admin.resolveOperationalPermission = jest.fn().mockResolvedValue({ enabled: true });
    db.document = { findUnique: jest.fn().mockResolvedValue({ userId: 'user' }), update: jest.fn() };
    await expect(admin.approveDocument('doc')).rejects.toThrow(/firma/);
    expect(db.document.update).not.toHaveBeenCalled();
  });
  it('document status sync cannot mark a missing employer profile complete', async () => {
    const admin = Object.create(AdminService.prototype) as any;
    admin.prisma = db;
    db.user.findUnique.mockResolvedValue({ role: Role.EMLAKCI, companyName: null, professionalVerificationStatus: 'PENDING', capabilities: [], documents: [{ type: 'MYK_BELGESI', status: 'APPROVED' }] });
    await expect(admin.syncProfessionalVerificationStatus('user')).resolves.toBe('PENDING');
    expect(db.user.update.mock.calls[0][0].data.profileCompleted).toBe(false);
  });
  it('private contact uses employer while locked pool info conceals it', () => {
    const owner = { firstName: 'Ali', lastName: 'Kaya', role: 'EMLAKCI', companyName: 'Kaya Emlak', office: { name: 'Old', isActive: true } };
    expect(networkProfessionalContact(owner).officeName).toBe('Kaya Emlak');
    const unit = { project: { owner } };
    expect(serializePoolPrivateInfo(unit, false).listingOfficeName).toBeNull();
    expect(serializePoolPrivateInfo(unit, true).listingOfficeName).toBe('Kaya Emlak');
    expect(networkProfessionalContact({ ...owner, role: 'SUPER_ADMIN' }).officeName).toBeNull();
  });
});
