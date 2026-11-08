import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OfficeRealtorGuard } from './office-realtor.guard';
import { OfficeManagementService } from './office-management.service';
import { SisterViewingService, viewingInput } from './sister/sister-viewing.service';

function fixture() {
  const users: any = {
    ownerA: { id: 'ownerA', role: 'EMLAKCI', officeId: 'A', capabilities: [{ capability: 'OFFICE_OWNER' }] },
    agentA: { id: 'agentA', role: 'EMLAKCI', officeId: 'A', capabilities: [] },
    ownerB: { id: 'ownerB', role: 'EMLAKCI', officeId: 'B', capabilities: [{ capability: 'OFFICE_OWNER' }] },
    contractor: { id: 'contractor', role: 'MUTEAHHIT', officeId: 'A' },
    root: { id: 'root', role: 'SUPER_ADMIN', officeId: null },
    recipient: { id: 'recipient', role: 'EMLAKCI', officeId: null, isApproved: true, isVerified: true },
    other: { id: 'other', role: 'EMLAKCI', officeId: null, isApproved: true, isVerified: true },
  };
  const offices: any = { A: { id: 'A', name: 'Ofis A', ownerUserId: 'ownerA', isActive: true }, B: { id: 'B', name: 'Ofis B', ownerUserId: 'ownerB', isActive: true } };
  const settings: any = { KARDES_OFIS_PAKETLER: ['ALTIN'], OFFICE_SUBSCRIPTION_A: { packageCode: 'ALTIN' }, OFFICE_SUBSCRIPTION_B: { packageCode: 'ALTIN' } };
  const unit: any = { id: 'unit', sharedWithSisters: true, hiddenFromOffice: false, status: 'SATILIK', project: { isActive: true, name: 'Örnek Portföy', ownerId: 'ownerB', owner: { officeId: 'B' } } };
  const link = { status: 'AKTIF' };
  const rows: any[] = [];
  const db: any = { $executeRaw: jest.fn(async () => 1), $queryRaw: jest.fn(async () => []) };
  db.$transaction = async (work: any) => work(db);
  db.user = { findUnique: jest.fn(async ({ where }: any) => users[where.id] || null), findMany: jest.fn(async () => []), count: jest.fn(async () => 0) };
  db.office = {
    findUnique: jest.fn(async ({ where }: any) => offices[where.id] ? { ...offices[where.id], owner: users[offices[where.id].ownerUserId] } : null),
    findFirst: jest.fn(async ({ where }: any) => Object.values(offices).find((o: any) => o.ownerUserId === where.ownerUserId) || null),
    findMany: jest.fn(async () => Object.values(offices)),
    count: jest.fn(async ({ where }: any) => Object.values(offices).filter((o: any) => o.ownerUserId === where.ownerUserId && o.isActive).length),
  };
  db.systemSetting = {
    findUnique: jest.fn(async ({ where }: any) => settings[where.key] === undefined ? null : { valueJson: settings[where.key] }),
    findMany: jest.fn(async ({ where }: any) => where.key.in.map((key: string) => ({ key, valueJson: settings[key] }))),
    upsert: jest.fn(async ({ where, create, update }: any) => { settings[where.key] = (settings[where.key] ? update : create).valueJson; return { valueJson: settings[where.key] }; }),
  };
  db.unit = { findFirst: jest.fn(async ({ where }: any) => where.id === unit.id && unit.sharedWithSisters && !unit.hiddenFromOffice && unit.status !== 'PASIF' && unit.project.isActive ? unit : null) };
  db.officeSisterLink = { findUnique: jest.fn(async () => link) };
  db.sisterViewingRequest = {
    findFirst: jest.fn(async ({ where }: any) => rows.find(row => row.unitId === where.unitId && row.requesterUserId === where.requesterUserId && row.status === where.status && row.scheduledAt > where.scheduledAt.gt) || null),
    create: jest.fn(async ({ data }: any) => { const row = { id: `r${rows.length + 1}`, status: 'BEKLIYOR', createdAt: new Date(), ...data }; rows.push(row); return row; }),
    findUnique: jest.fn(async ({ where }: any) => rows.find(row => row.id === where.id) || null),
    findMany: jest.fn(async ({ where }: any) => rows.filter(row => Object.entries(where).every(([key, value]) => row[key] === value))),
    updateMany: jest.fn(async ({ where, data }: any) => { const row = rows.find(r => r.id === where.id && r.status === where.status); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; }),
  };
  const notifications: any = { notify: jest.fn(async () => ({})) };
  return { db, users, offices, unit, link, settings, rows, notifications, service: new SisterViewingService(db, notifications), management: new OfficeManagementService(db, undefined, notifications) };
}
const future = () => new Date(Date.now() + 86400000).toISOString();
const payload = () => ({ scheduledAt: future(), note: 'Müşterimle yer gösterme' });
const context = (roleUser: string, handler: string, controller = 'SisterController') => {
  const request = { user: { id: roleUser, role: 'EMLAKCI' } };
  return { switchToHttp: () => ({ getRequest: () => request }), getHandler: () => ({ name: handler }), getClass: () => ({ name: controller }) } as any;
};

describe('EPH17 ofis erişimi ve davet', () => {
  it.each(['contractor'])('ofis API erişimini güncel DB rolüyle reddeder: %s', async userId => {
    const f = fixture(); await expect(new OfficeRealtorGuard(f.db).canActivate(context(userId, 'sisterPool'))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('emlakçıyı kabul eder, yazılım ekibi yönetimini ve ortak cüzdan seçimini korur', async () => {
    const f = fixture(); const guard = new OfficeRealtorGuard(f.db);
    await expect(guard.canActivate(context('agentA', 'dashboard', 'OfficeManagementController'))).resolves.toBe(true);
    await expect(guard.canActivate(context('root', 'rollout', 'OfficeManagementController'))).resolves.toBe(true);
    await expect(guard.canActivate(context('root', 'sisterPool'))).resolves.toBe(true);
    await expect(guard.canActivate(context('root', 'dashboard', 'OfficeManagementController'))).resolves.toBe(true);
    await expect(guard.canActivate(context('contractor', 'walletOptions', 'OfficeManagementController'))).resolves.toBe(true);
    await expect(guard.canActivate(context('agentA', 'rollout', 'OfficeManagementController'))).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('alıcısız veya emlakçı olmayan hesaba davet göndermez', async () => {
    const f = fixture(); await expect(f.management.invite('ownerA', 'A')).rejects.toBeInstanceOf(BadRequestException);
    await expect(f.management.invite('ownerA', 'A', 'contractor')).rejects.toBeInstanceOf(BadRequestException);
    expect(f.notifications.notify).not.toHaveBeenCalled();
  });
  it('hedef emlakçıya bildirim gönderir; başka kullanıcı kodu kullanamaz', async () => {
    const f = fixture(); const invite = await f.management.invite('ownerA', 'A', 'recipient');
    expect(f.notifications.notify).toHaveBeenCalledWith('recipient', expect.objectContaining({ type: 'OFFICE_INVITATION' }), f.db);
    await expect(f.management.requestJoin('other', invite.code)).rejects.toBeInstanceOf(ForbiddenException);
    await f.management.requestJoin('recipient', invite.code);
    expect(f.settings.EPH_OFFICE_JOIN_A_recipient.status).toBe('PENDING');
    expect(f.users.recipient.officeId).toBeNull();
  });
  it('davet kabulünde rol değişikliğini tekrar denetler', async () => {
    const f = fixture(); const invite = await f.management.invite('ownerA', 'A', 'recipient');
    f.users.recipient.role = 'MUTEAHHIT';
    await expect(f.management.requestJoin('recipient', invite.code)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('arama sonucunu emlakçı, doğrulanmış ve ofissiz hesaplarla sınırlar', async () => {
    const f = fixture(); await f.management.inviteCandidates('ownerA', 'A', 'Ali');
    expect(f.db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: 'EMLAKCI', isApproved: true, isVerified: true, officeId: null }), take: 30 }));
    await expect(f.management.inviteCandidates('agentA', 'A', 'Ali')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('EPH17 yer gösterme', () => {
  it.each([{}, { scheduledAt: '2026-11-01T15:00:00' }, { scheduledAt: new Date(0).toISOString() }, { scheduledAt: '2030-02-30T10:00:00Z' }, { scheduledAt: future(), note: 'a'.repeat(501) }])('geçersiz veya geçmiş girdiyi reddeder', input => { expect(() => viewingInput(input)).toThrow(BadRequestException); });
  it('talebi ayrı kaydeder ve portföy ofis sahibine bildirir', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload());
    expect(f.rows[0]).toMatchObject({ ownerOfficeId: 'B', requesterOfficeId: 'A', requesterUserId: 'agentA', status: 'BEKLIYOR' });
    expect(f.notifications.notify).toHaveBeenCalledWith('ownerB', expect.objectContaining({ type: 'SISTER_VIEWING_REQUEST', actionUrl: '/office-viewing-requests?officeId=B&box=incoming' }));
  });
  it('çift tıklamada ikinci bekleyen talebi oluşturmaz', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload());
    await expect(f.service.create('agentA', 'A', 'unit', payload())).rejects.toBeInstanceOf(ConflictException);
    expect(f.rows).toHaveLength(1);
  });
  it('süresi geçmiş bekleyen talep yeni tarih talebini engellemez', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload()); f.rows[0].scheduledAt = new Date(0);
    await f.service.create('agentA', 'A', 'unit', payload()); expect(f.rows).toHaveLength(2);
  });
  it.each(['hidden', 'unshared', 'inactive', 'suspended'])('kullanılamayan portföye talep oluşturmaz: %s', async mode => {
    const f = fixture(); if (mode === 'hidden') f.unit.hiddenFromOffice = true; if (mode === 'unshared') f.unit.sharedWithSisters = false; if (mode === 'inactive') f.link.status = 'SONLANDI'; if (mode === 'suspended') f.settings.OFFICE_SUBSCRIPTION_A.packageCode = 'BRONZ';
    await expect(f.service.create('agentA', 'A', 'unit', payload())).rejects.toThrow(); expect(f.rows).toHaveLength(0);
  });
  it('yalnız karşı ofis sahibi karar verir; karar tekrar değiştirilemez', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload());
    await expect(f.service.decide('agentA', 'A', 'r1', true)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(f.service.decide('ownerA', 'A', 'r1', true)).rejects.toBeInstanceOf(NotFoundException);
    await f.service.decide('ownerB', 'B', 'r1', true);
    expect(f.rows[0]).toMatchObject({ status: 'ONAYLANDI', decidedByUserId: 'ownerB' });
    await expect(f.service.decide('ownerB', 'B', 'r1', false)).rejects.toBeInstanceOf(ConflictException);
  });
  it('karar anında paylaşım ve talep sahibinin güncel ofisini tekrar denetler', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload()); f.unit.sharedWithSisters = false;
    await expect(f.service.decide('ownerB', 'B', 'r1', true)).rejects.toBeInstanceOf(NotFoundException);
    f.unit.sharedWithSisters = true; f.users.agentA.officeId = 'C';
    await expect(f.service.decide('ownerB', 'B', 'r1', true)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('üyeye yalnız kendi gönderdiği talepleri gösterir; gelen kutusu sahibindir', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload());
    const result = await f.service.list('agentA', 'A', 'outgoing'); expect(result.items).toHaveLength(1);
    expect(f.db.sisterViewingRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterOfficeId: 'A', requesterUserId: 'agentA' } }));
    await expect(f.service.list('agentA', 'A', 'incoming')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('zamanı geçmiş talep onaylanamaz; reddedilebilir', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload()); f.rows[0].scheduledAt = new Date(0);
    await expect(f.service.decide('ownerB', 'B', 'r1', true)).rejects.toBeInstanceOf(BadRequestException);
    await f.service.decide('ownerB', 'B', 'r1', false); expect(f.rows[0].status).toBe('REDDEDILDI');
  });
  it('eşzamanlı karar CAS kaybında bildirim göndermez', async () => {
    const f = fixture(); await f.service.create('agentA', 'A', 'unit', payload()); f.notifications.notify.mockClear();
    f.db.sisterViewingRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.service.decide('ownerB', 'B', 'r1', true)).rejects.toBeInstanceOf(ConflictException);
    expect(f.notifications.notify).not.toHaveBeenCalled();
  });
});
