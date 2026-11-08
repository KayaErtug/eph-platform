import { TextSafetyService } from '../text-safety/text-safety.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { NetworkService } from './network.service';
import { NETWORK_CONTACT_OWNER_SELECT, networkProfessionalContact, networkContactPhone, networkOwnerLabel, networkPaidAccessWhere } from './network-contact-policy';

describe('Talep Merkezi contact privacy and billing', () => {
  let service: NetworkService;
  let db: any;
  let post: any;
  let balance: number;
  let paid: boolean;
  let adapter: any;
  const actor = { id: 'viewer', role: Role.EMLAKCI };
  beforeEach(() => {
    balance = 100; paid = false;
    post = { id: 'post-1', userId: 'owner', title: '3+1 daire', visibility: 'HERKES', isActive: true,
      expiresAt: new Date('2099-01-01'), allowPhoneCall: true, contactPhone: '0532 111 22 33',
      allowWhatsapp: true, whatsappPhone: '+90 532 111 22 33',
      User: { id: 'owner', firstName: 'Ali', lastName: 'Kaya', email: 'ali@example.test', phone: '0533 222 44 55', office: { name: 'Örnek Gayrimenkul', isActive: true }, role: Role.EMLAKCI, capabilities: [] } };
    db = {
      $executeRaw: jest.fn().mockResolvedValue(1), $queryRaw: jest.fn().mockResolvedValue([]),
      user: { findUnique: jest.fn().mockImplementation(async ({ where }) => ({ id: where.id, role: Role.EMLAKCI, officeId: 'office', firstName: 'Üye', lastName: 'Test' })), findFirst: jest.fn().mockResolvedValue({ id: 'viewer' }) },
      networkPost: { findFirst: jest.fn().mockImplementation(async () => post) },
      systemSetting: { findUnique: jest.fn().mockImplementation(async ({ where }) => ({ valueJson: where.key.startsWith('EPH_OFFICE_SPENDING_') ? { mode: 'ALLOCATED' } : 25 })) },
      office: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue({ id: 'office', isActive: true, ownerUserId: 'office-owner' }) },
      portfolioCreditLot: { findMany: async () => [], update: async () => ({}), create: async () => ({ id: 'lot' }) }, portfolioCreditLotTuketim: { create: async () => ({}), findMany: async () => [], update: async () => ({}) }, kontorCuzdani: {
        findUnique: jest.fn().mockImplementation(async () => ({ bakiye: balance, aktifMi: true })),
        update: jest.fn().mockImplementation(async ({ data }) => ({ bakiye: balance -= data.bakiye.decrement })),
        create: jest.fn(),
      },
      kontorHareketi: {
        findFirst: jest.fn().mockImplementation(async () => paid ? { id: 'movement' } : null),
        findMany: jest.fn().mockImplementation(async () => paid ? [{ ilgiliKayitId: post.id }] : []),
        create: jest.fn().mockImplementation(async () => { paid = true; return { id: 'movement' }; }),
      },
      conversation: { findFirst: jest.fn().mockResolvedValue({ id: 'conversation', ConversationParticipant: [{ userId: 'viewer' }, { userId: 'owner' }] }), update: jest.fn().mockResolvedValue({}) },
      message: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      networkNotification: { create: jest.fn().mockResolvedValue({}) },
    };
    db.$transaction = jest.fn(async (callback) => { const before = { balance, paid }; try { return await callback(db); } catch (error) { balance = before.balance; paid = before.paid; throw error; } });
    adapter = { fromNetworkPost: jest.fn().mockReturnValue({ cardProfileCriteria: {} }) };
    service = new NetworkService(db, {} as any, {} as any, adapter, {} as any, new TextSafetyService());
  });

  it('masks locked owner identity and phones in list/detail serializers', () => {
    const result = (service as any).serializeNetworkPostForViewer(post, 'viewer');
    expect(result).toMatchObject({ userId: null, listingOwnerLabel: 'EMLAKÇI', listingOwnerName: null, listingOwnerEmail: null, contactPhone: null, whatsappPhone: null, privateInfoUnlocked: false, User: { id: null, role: Role.EMLAKCI } });
    expect(JSON.stringify(result)).not.toMatch(/Ali|Kaya|ali@example|0532|90532/);
  });
  it('keeps paid public cards anonymous until explicit private-info request', () => {
    expect((service as any).serializeNetworkPostForViewer(post, 'viewer', true).listingOwnerName).toBeNull();
    const result = (service as any).serializeNetworkPostForViewer(post, 'viewer', true, true);
    expect(result.listingOwnerName).toBe('Ali Kaya');
    expect(result.contactPhone).toBe('+905321112233');
  });
  it('never enables disabled direct channels even with paid profile access', () => {
    post.allowPhoneCall = false; post.allowWhatsapp = false;
    const result = (service as any).serializeNetworkPostForViewer(post, 'viewer', true, true);
    expect(result.contactPhone).toBeNull(); expect(result.whatsappPhone).toBeNull();
  });
  it('masks software-team personal identity even after access', () => {
    post.User.role = Role.SUPER_ADMIN;
    const result = (service as any).serializeNetworkPostForViewer(post, 'viewer', true, true);
    expect(result.listingOwnerName).toBe('Yazılım Ekibi'); expect(result.listingOwnerEmail).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/Ali|Kaya|ali@example/);
  });
  it.each([['EMLAKCI', [], 'EMLAKÇI'], ['EMLAKCI', [{ capability: 'OFFICE_OWNER' }], 'EMLAK OFİSİ'], ['MUTEAHHIT', [], 'MÜTEAHHİT'], ['INSAAT_FIRMASI', [], 'İNŞAAT FİRMASI']])('labels actual role/capability %s', (role, capabilities, label) => {
    expect(networkOwnerLabel(role as string, capabilities as any)).toBe(label);
  });
  it.each(['javascript:alert(1)', 'tel:05321112233', '123', '+000000000000', '05321112233?x=1'])('rejects unsafe/invalid phone %s', value => expect(networkContactPhone(value)).toBeNull());
  it.each(['05321112233', '(532) 111-22-33', '00905321112233', '+90 532 111 22 33'])('normalizes phone %s', value => expect(networkContactPhone(value)).toBe('+905321112233'));
  it('uses only positive paid movements attributed to the acting user', () => {
    expect(networkPaidAccessWhere('viewer', post.id)).toMatchObject({ OR: [{ olusturanId: 'viewer' }, { olusturanId: null, kullaniciId: 'viewer' }], miktar: { gt: 0 }, ilgiliKayitTuru: 'NETWORK_POST', ilgiliKayitId: post.id, hareketTuru: 'HARCAMA' });
  });
  it('does not grant free access from an existing conversation', async () => {
    expect(await service.hasPostPrivateAccess(post.id, 'viewer', 'owner')).toBe(false);
    expect(db.conversation.findFirst).not.toHaveBeenCalled();
    expect([...(await service.getUnlockedPostIdsForViewer('viewer'))]).toEqual([]);
  });
  it('quotes authoritative tariff and balance without debit', async () => {
    expect(await service.getContactQuote(post.id, actor)).toMatchObject({ costPk: 25, eligible: true, balance: 100, alreadyUnlocked: false });
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('charges once across private info, phone, WhatsApp and repeated access', async () => {
    const first = await service.postPrivateInfo(post.id, actor, { expectedCostPk: 25, expectedActorId: 'viewer' });
    expect(first).toMatchObject({ spent: 25, operationId: 'movement', balance: 75, walletOfficeId: null, post: { listingOwnerName: 'Ali Kaya', privateInfoUnlocked: true } });
    expect(await service.postContact(post.id, actor, 'CALL')).toMatchObject({ spent: 0, url: 'tel:+905321112233' });
    expect(await service.postContact(post.id, actor, 'WHATSAPP')).toMatchObject({ spent: 0, url: 'https://wa.me/905321112233' });
    expect(db.kontorHareketi.create).toHaveBeenCalledTimes(1); expect(balance).toBe(75);
    expect(db.$executeRaw.mock.calls[0][1]).toBe('network-access:viewer:post-1');
  });
  it.each([false, true])('rejects missing consent/invalid phone before debit (%s)', async invalid => {
    if (invalid) post.contactPhone = 'invalid'; else post.allowPhoneCall = false;
    await expect(service.postContact(post.id, actor, 'CALL', { expectedCostPk: 25 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('rejects unknown channel without starting a transaction', async () => {
    await expect(service.postContact(post.id, actor, 'SMS')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each([undefined, 24, -25, 25.1])('requires the current approved tariff (%s)', async expectedCostPk => {
    await expect(service.postPrivateInfo(post.id, actor, { expectedCostPk })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('rejects account change before accessing the wallet', async () => {
    await expect(service.postPrivateInfo(post.id, actor, { expectedActorId: 'another', expectedCostPk: 25 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.kontorCuzdani.findUnique).not.toHaveBeenCalled();
  });
  it('fails closed for hidden/expired/missing posts', async () => {
    db.networkPost.findFirst.mockResolvedValue(null);
    await expect(service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 })).rejects.toBeInstanceOf(NotFoundException);
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('rejects insufficient balance with no movement', async () => {
    balance = 24;
    await expect(service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.kontorHareketi.create).not.toHaveBeenCalled();
  });
  it.each([0, -1, 'broken', 25.5, true])('rejects corrupt tariff (%s)', async valueJson => {
    db.systemSetting.findUnique.mockResolvedValue({ valueJson });
    await expect(service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('does not turn a setting outage into a fallback charge', async () => {
    db.systemSetting.findUnique.mockRejectedValue(new Error('DB unavailable'));
    await expect(service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 })).rejects.toThrow('DB unavailable');
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('returns the office wallet receipt while attributing access to the member', async () => {
    db.systemSetting.findUnique.mockImplementation(async ({ where }) => ({ valueJson: where.key.startsWith('EPH_OFFICE_SPENDING_') ? { mode: 'SHARED' } : 25 }));
    const receipt = await service.postPrivateInfo(post.id, actor, { walletSource: 'OFFICE', walletOfficeId: 'office', expectedCostPk: 25 });
    expect(receipt.walletOfficeId).toBe('office');
    expect(db.kontorHareketi.create.mock.calls[0][0].data).toMatchObject({ kullaniciId: 'office-owner', olusturanId: 'viewer', miktar: 25 });
  });
  it.each([{ walletSource: 'OFFICE' }, { walletSource: 'UNKNOWN' }, { walletSource: 'PERSONAL', walletOfficeId: 'office' }])('never falls back to personal wallet for invalid selection %j', async options => {
    await expect(service.postPrivateInfo(post.id, actor, { ...options, expectedCostPk: 25 })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('rejects unauthorized office access', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'viewer', role: Role.EMLAKCI, officeId: null });
    await expect(service.postPrivateInfo(post.id, actor, { walletSource: 'OFFICE', walletOfficeId: 'office', expectedCostPk: 25 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('serializes private information inside the debit transaction', async () => {
    adapter.fromNetworkPost.mockImplementation(() => { throw new Error('serialize failed'); });
    await expect(service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 })).rejects.toThrow('serialize failed');
    expect(balance).toBe(100); expect(paid).toBe(false); expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
  it('rolls back debit on notification failure in the transaction callback', async () => {
    db.networkNotification.create.mockRejectedValue(new Error('notification failed'));
    await expect(service.postContact(post.id, actor, 'CALL', { expectedCostPk: 25 })).rejects.toThrow('notification failed');
    expect(balance).toBe(100); expect(paid).toBe(false);
  });
  it('replays a reply request without another message or debit', async () => {
    const options = { expectedCostPk: 25, requestId: 'reply-test-123', message: 'Merhaba' };
    await service.messagePost(post.id, actor, options);
    const sent = db.message.create.mock.calls[0][0].data;
    db.message.findUnique.mockResolvedValue(sent);
    const replay = await service.messagePost(post.id, actor, options);
    expect(replay).toMatchObject({ spent: 0, replayed: true, conversationId: 'conversation' });
    expect(db.message.create).toHaveBeenCalledTimes(1); expect(db.kontorHareketi.create).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid reply request id before payment', async () => {
    await expect(service.messagePost(post.id, actor, { expectedCostPk: 25, requestId: '../bad' })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled();
  });
  it('returns profile telephone and office after explicit private access even without per-post channel configuration', async () => {
    post.allowPhoneCall = false; post.contactPhone = null; post.allowWhatsapp = false; post.whatsappPhone = null;
    const result = await service.postPrivateInfo(post.id, actor, { expectedCostPk: 25, expectedActorId: 'viewer' });
    expect(result.post).toMatchObject({ listingOwnerName: 'Ali Kaya', listingOwnerPhone: '+905332224455', listingOfficeName: 'Örnek Gayrimenkul', listingOwnerEmail: 'ali@example.test', phoneCallAllowed: false, whatsappAllowed: false, contactPhone: null, whatsappPhone: null });
    expect(db.networkPost.findFirst.mock.calls.some(([query]: any[]) => query.include?.User?.select === NETWORK_CONTACT_OWNER_SELECT)).toBe(true);
    expect(result.spent).toBe(25);
  });
  it('keeps profile phone and office hidden in locked and already-paid public serializers', () => {
    for (const unlocked of [false, true]) {
      const result = (service as any).serializeNetworkPostForViewer(post, 'viewer', unlocked);
      expect(result.listingOwnerPhone).toBeNull(); expect(result.listingOfficeName).toBeNull();
      expect(JSON.stringify(result)).not.toMatch(/5332224455|Örnek Gayrimenkul|ali@example/);
      expect(result.User.phone).toBeUndefined(); expect(result.User.office).toBeUndefined();
    }
  });
  it('reveals complete professional contact to a previous payer without another debit', async () => {
    paid = true;
    const result = await service.postPrivateInfo(post.id, actor, { expectedCostPk: 0 });
    expect(result.spent).toBe(0); expect(result.replayed).toBe(true);
    expect(result.post.listingOwnerPhone).toBe('+905332224455'); expect(result.post.listingOfficeName).toBe('Örnek Gayrimenkul');
    expect(db.kontorCuzdani.update).not.toHaveBeenCalled(); expect(db.kontorHareketi.create).not.toHaveBeenCalled();
  });
  it('quotes contact availability without disclosing the profile values', async () => {
    post.allowPhoneCall = false; post.contactPhone = null;
    const quote = await service.getContactQuote(post.id, actor);
    expect(quote).toMatchObject({ availableInfo: { name: true, phone: true, office: true, email: true }, phoneCallAllowed: false });
    expect(JSON.stringify(quote)).not.toMatch(/Ali|Kaya|5332224455|Örnek Gayrimenkul|ali@example/);
    expect(db.kontorHareketi.create).not.toHaveBeenCalled();
  });
  it('does not substitute the viewer office for the listing owner office', async () => {
    post.User.office = null; post.User.ownedOffices = [{ name: 'Sahibinin Ofisi', isActive: true }];
    const result = await service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 });
    expect(result.post.listingOfficeName).toBe('Sahibinin Ofisi');
  });
  it('reports missing or unsafe profile phone truthfully', async () => {
    post.User.phone = 'javascript:alert(1)'; post.User.office = null; post.allowPhoneCall = false;
    expect((await service.getContactQuote(post.id, actor)).availableInfo).toMatchObject({ phone: false, office: false });
    const result = await service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 });
    expect(result.post.listingOwnerPhone).toBeNull(); expect(result.post.listingOfficeName).toBeNull();
  });
  it('software-team profile never discloses personal phone, email or office', async () => {
    post.User.role = Role.SUPER_ADMIN;
    const result = await service.postPrivateInfo(post.id, actor, { expectedCostPk: 25 });
    expect(result.post).toMatchObject({ listingOwnerName: 'Yazılım Ekibi', listingOwnerPhone: null, listingOfficeName: null, listingOwnerEmail: null });
  });
  it('resolves active membership before owned offices and ignores inactive office records', () => {
    expect(networkProfessionalContact({ office: { name: 'Üye Ofisi', isActive: true }, ownedOffices: [{ name: 'Sahip Ofisi', isActive: true }] }).officeName).toBe('Üye Ofisi');
    expect(networkProfessionalContact({ office: { name: 'Kapalı Ofis', isActive: false }, ownedOffices: [{ name: 'Aktif Ofis', isActive: true }, { name: 'Eski Ofis', isActive: false }] }).officeName).toBe('Aktif Ofis');
  });

});
