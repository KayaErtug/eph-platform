import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OfficePoolService } from '../office-pool.service';
import { SisterLinksService } from './sister-links.service';
import { SisterPoolService } from './sister-pool.service';
import { SisterRequestsService } from './sister-requests.service';

// EPH-81 kardeş ofis ağı: bellek içi sahte Prisma ile yetki, uygunluk, gizlilik ve erişim kaydı kuralları.
function fixture() {
  const user = (id: string, officeId: string | null, role = 'EMLAKCI') => ({ id, role, officeId, firstName: id, lastName: 'X', phone: `5-${id}` });
  const users: any = {
    ownerA: user('ownerA', 'A'), agentA: user('agentA', 'A'), ownerB: user('ownerB', 'B'), agentB: user('agentB', 'B'),
    ownerC: user('ownerC', 'C'), outsider: user('outsider', null), root: user('root', null, 'SUPER_ADMIN'),
  };
  const offices: any = {
    A: { id: 'A', name: 'Ofis A', code: 'OFS-111111', city: 'i', district: 'd', ownerUserId: 'ownerA', isActive: true },
    B: { id: 'B', name: 'Ofis B', code: 'OFS-222222', city: 'i', district: 'd', ownerUserId: 'ownerB', isActive: true },
    C: { id: 'C', name: 'Ofis C', code: 'OFS-333333', city: 'i', district: 'd', ownerUserId: 'ownerC', isActive: true },
  };
  const withOwner = (o: any) => o && ({ ...o, owner: users[o.ownerUserId] });
  const settings: any = {
    KARDES_OFIS_PAKETLER: ['ALTIN', 'PLATINUM'],
    OFFICE_SUBSCRIPTION_A: { packageCode: 'ALTIN' }, OFFICE_SUBSCRIPTION_B: { packageCode: 'PLATINUM' }, OFFICE_SUBSCRIPTION_C: { packageCode: 'BRONZ' },
  };
  const links: any[] = [];
  const requests: any[] = [];
  const logs: any[] = [];
  const mkUnit = (id: string, agent: string, officeId: string, extra: any = {}) => ({
    id, sharedWithSisters: false, hiddenFromOffice: false, status: 'SATILIK', type: 'DAIRE', roomCount: '2+1', netArea: 1, grossArea: 2, price: 3, priceCurrency: 'TRY',
    updatedAt: new Date(), description: 'Malik Ali Veli arıyor', floor: 1, floorLabel: '1', totalFloors: 5, facades: ['N'], features: ['f', '__EPH_META__:ownerphone:1', '__EPH_META__:balcony:1'],
    deedOwnerFullName: 'Ali Veli', deedOwnerPhone: '0555 000', deedOwnerEmail: 'ali@x.com', contactPhone: '0555 111', whatsappPhone: '0555 222', doorAccessInfo: 'KAPI-KODU', adaNo: '12', parselNo: '34',
    images: [{ id: 'i1', url: 'u', supabaseUrl: 's', isCover: true, sortOrder: 0 }],
    project: { name: `P-${id}`, city: 'c', district: 'd', neighborhood: 'n', address: 'Tam Adres 1', latitude: 1.5, longitude: 2.5, isActive: true, ownerId: agent, owner: { ...users[agent], officeId } },
    ...extra,
  });
  const units: any[] = [
    mkUnit('u1', 'agentB', 'B', { sharedWithSisters: true }),
    mkUnit('u2', 'agentB', 'B', { sharedWithSisters: true, hiddenFromOffice: true }),
    mkUnit('u3', 'agentB', 'B'),
    mkUnit('u4', 'ownerA', 'A', { sharedWithSisters: true }),
    mkUnit('u5', 'agentB', 'B', { sharedWithSisters: true, status: 'PASIF' }),
  ];
  // Prisma where alt kümesi: yalnız servislerin kullandığı anahtarlar.
  const m = (u: any, w: any): boolean => Object.entries(w).every(([k, v]: [string, any]) => {
    if (k === 'AND') return v.every((x: any) => m(u, x));
    if (k === 'OR') return v.some((x: any) => m(u, x));
    if (k === 'project') return m(u.project, v);
    if (k === 'owner') return m(u.owner, v);
    if (k === 'status' && v && typeof v === 'object') return 'not' in v ? u.status !== v.not : v.in.includes(u.status);
    if (v && typeof v === 'object' && 'contains' in v) return true;
    if (v && typeof v === 'object' && 'not' in v) return u[k] !== v.not;
    return u[k] === v;
  });
  const pairKey = (w: any) => `${w.officeAId}|${w.officeBId}`;
  const isActive = (id: string) => offices[id]?.isActive;
  const db: any = {
    office: {
      findUnique: jest.fn(async ({ where }) => withOwner(where.id ? offices[where.id] : Object.values(offices).find((o: any) => o.code === where.code))),
      findFirst: jest.fn(async ({ where }) => withOwner(Object.values(offices).find((o: any) => o.ownerUserId === where.ownerUserId))),
      findMany: jest.fn(async ({ where }) => where.id.in.map((id: string) => withOwner(offices[id])).filter(Boolean)),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    user: {
      findUnique: jest.fn(async ({ where }) => users[where.id] ?? null),
      findFirst: jest.fn(async ({ where }) => { const u = users[where.id]; return u && (where.role ? u.role === where.role : u.officeId === where.officeId) ? u : null; }),
      findMany: jest.fn(async ({ where }) => where.id.in.map((id: string) => users[id])),
      count: jest.fn(async ({ where }) => Object.values(users).filter((u: any) => u.officeId === where.officeId && (!where.id || u.id !== where.id.not)).length),
    },
    systemSetting: {
      findUnique: jest.fn(async ({ where }) => (where.key in settings ? { key: where.key, valueJson: settings[where.key] } : null)),
      findMany: jest.fn(async ({ where }) => where.key.in.filter((k: string) => k in settings).map((k: string) => ({ key: k, valueJson: settings[k] }))),
    },
    officeSisterLink: {
      findMany: jest.fn(async ({ where }) => {
        const mine = (l: any) => where.OR.some((c: any) => l.officeAId === c.officeAId || l.officeBId === c.officeBId);
        return links.filter(l => mine(l) && (where.status === 'AKTIF' ? l.status === 'AKTIF' : l.status !== where.status?.not))
          .map(l => ({ ...l, officeA: withOwner(offices[l.officeAId]), officeB: withOwner(offices[l.officeBId]) }));
      }),
      findUnique: jest.fn(async ({ where }) => (where.id ? links.find(l => l.id === where.id) : links.find(l => pairKey(l) === pairKey(where.officeAId_officeBId))) ?? null),
      create: jest.fn(async ({ data }) => { const l = { id: `L${links.length + 1}`, createdAt: new Date(), respondedAt: null, endedAt: null, endedByUserId: null, ...data }; links.push(l); return l; }),
      update: jest.fn(async ({ where, data }) => Object.assign(links.find(l => l.id === where.id), data)),
      updateMany: jest.fn(async ({ where, data }) => { const l = links.find(x => x.id === where.id && x.status === where.status); if (l) Object.assign(l, data); return { count: l ? 1 : 0 }; }),
    },
    unit: {
      findFirst: jest.fn(async ({ where }) => units.find(u => m(u, where)) ?? null),
      findMany: jest.fn(async ({ where }) => units.filter(u => m(u, where))),
      count: jest.fn(async ({ where }) => units.filter(u => m(u, where)).length),
      update: jest.fn(async ({ where, data, select }) => { const u = Object.assign(units.find(x => x.id === where.id), data); return select ? Object.fromEntries(Object.keys(select).map(k => [k, u[k]])) : u; }),
      findUnique: jest.fn(async ({ where }) => units.find(u => u.id === where.id) ?? null),
    },
    sisterPrivateInfoRequest: {
      findUnique: jest.fn(async ({ where }) => (where.id ? requests.find(r => r.id === where.id) : requests.find(r => r.unitId === where.unitId_requesterUserId.unitId && r.requesterUserId === where.unitId_requesterUserId.requesterUserId)) ?? null),
      create: jest.fn(async ({ data }) => { const r = { id: `R${requests.length + 1}`, createdAt: new Date(), decidedAt: null, decidedByUserId: null, ...data }; requests.push(r); return r; }),
      update: jest.fn(async ({ where, data }) => Object.assign(requests.find(r => r.id === where.id), data)),
      updateMany: jest.fn(async ({ where, data }) => { const r = requests.find(x => x.id === where.id && x.status === where.status); if (r) Object.assign(r, data); return { count: r ? 1 : 0 }; }),
      findMany: jest.fn(async ({ where }) => requests.filter(r => Object.entries(where).every(([k, v]) => r[k] === v)).map(r => {
        const u = units.find(x => x.id === r.unitId);
        return { ...r, ownerOffice: offices[r.ownerOfficeId], requesterOffice: offices[r.requesterOfficeId], unit: { ...u, project: { name: u.project.name } } };
      })),
    },
    sisterPrivateInfoAccessLog: { create: jest.fn(async ({ data }) => { logs.push(data); return data; }) },
  };
  void isActive;
  const notifications: any = { notify: jest.fn(async () => ({})) };
  const linksSvc = new SisterLinksService(db, notifications);
  const poolSvc = new SisterPoolService(db, linksSvc, notifications);
  const reqSvc = new SisterRequestsService(db, notifications);
  const officePool = new OfficePoolService(db);
  const connect = async () => { const r: any = await linksSvc.invite('ownerA', 'A', { code: 'OFS-222222' }); await linksSvc.accept('ownerB', 'B', r.id); return r.id as string; };
  return { db, offices, settings, links, requests, logs, units, notifications, linksSvc, poolSvc, reqSvc, officePool, connect };
}

describe('EPH-81 kardeş ofis ağı', () => {
  describe('davet / kabul / ret / sonlandırma', () => {
    it('yalnız ofis sahibi davet eder; üye ve ofis dışı 403', async () => {
      const f = fixture();
      await expect(f.linksSvc.invite('agentA', 'A', { code: 'OFS-222222' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.linksSvc.invite('outsider', 'A', { code: 'OFS-222222' })).rejects.toBeInstanceOf(ForbiddenException);
      const r: any = await f.linksSvc.invite('ownerA', 'A', { code: 'ofs-222222', commissionSplitPct: 60 });
      expect(r.status).toBe('BEKLIYOR');
      expect(f.notifications.notify).toHaveBeenCalledWith('ownerB', expect.objectContaining({ type: 'SISTER_INVITE' }));
    });
    it('kendine ve aynı çifte tekrar davet yok; geçersiz pay 400', async () => {
      const f = fixture();
      await expect(f.linksSvc.invite('ownerA', 'A', { code: 'OFS-111111' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(f.linksSvc.invite('ownerA', 'A', { code: 'OFS-222222', commissionSplitPct: 101 })).rejects.toBeInstanceOf(BadRequestException);
      await f.linksSvc.invite('ownerA', 'A', { code: 'OFS-222222' });
      await expect(f.linksSvc.invite('ownerA', 'A', { code: 'OFS-222222' })).rejects.toBeInstanceOf(ConflictException);
      await expect(f.linksSvc.invite('ownerB', 'B', { code: 'OFS-111111' })).rejects.toBeInstanceOf(ConflictException);
    });
    it('paket uygun değilse davet 400 (iki taraf için de)', async () => {
      const f = fixture();
      await expect(f.linksSvc.invite('ownerA', 'A', { code: 'OFS-333333' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(f.linksSvc.invite('ownerC', 'C', { code: 'OFS-111111' })).rejects.toBeInstanceOf(BadRequestException);
    });
    it('izinli paketler SystemSetting\'ten okunur (kodda sabit değil)', async () => {
      const f = fixture();
      f.settings.KARDES_OFIS_PAKETLER = ['ALTIN', 'PLATINUM', 'BRONZ'];
      await expect(f.linksSvc.invite('ownerA', 'A', { code: 'OFS-333333' })).resolves.toMatchObject({ status: 'BEKLIYOR' });
    });
    it('yalnız davet edilen ofisin sahibi kabul/ret eder', async () => {
      const f = fixture();
      const r: any = await f.linksSvc.invite('ownerA', 'A', { code: 'OFS-222222' });
      await expect(f.linksSvc.accept('ownerA', 'A', r.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.linksSvc.accept('agentB', 'B', r.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.linksSvc.accept('outsider', 'B', r.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.linksSvc.accept('ownerB', 'C', r.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.linksSvc.reject('ownerB', 'B', r.id)).resolves.toMatchObject({ status: 'REDDEDILDI' });
      expect(f.notifications.notify).toHaveBeenCalledWith('ownerA', expect.objectContaining({ type: 'SISTER_INVITE_REJECTED' }));
      await expect(f.linksSvc.accept('ownerB', 'B', r.id)).rejects.toBeInstanceOf(BadRequestException);
      // reddedilen çift yeniden davet edilebilir
      await expect(f.linksSvc.invite('ownerA', 'A', { code: 'OFS-222222' })).resolves.toMatchObject({ status: 'BEKLIYOR' });
    });
    it('kabul sonrası liste: yön, pay (ofis açısından), askı durumu', async () => {
      const f = fixture();
      const id = await f.connect();
      f.links[0].commissionSplitPct = 70;
      const a: any = await f.linksSvc.list('agentA', 'A');
      expect(a).toMatchObject({ myCode: 'OFS-111111', eligible: true });
      expect(a.links[0]).toMatchObject({ id, status: 'AKTIF', suspended: false, direction: 'outgoing', commissionSplitPct: 70 });
      expect(a.links[0].otherOffice).toMatchObject({ id: 'B', code: 'OFS-222222', ownerName: 'ownerB X', agentCount: 1, sharedCount: 1 });
      const b: any = await f.linksSvc.list('ownerB', 'B');
      expect(b.links[0]).toMatchObject({ direction: 'incoming', commissionSplitPct: 30 });
      await expect(f.linksSvc.list('outsider', 'A')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.linksSvc.list('root', 'A')).resolves.toBeDefined();
    });
    it('iki taraftan biri (yalnız sahip) sonlandırır; görünürlük anında kapanır', async () => {
      const f = fixture();
      const id = await f.connect();
      await expect(f.linksSvc.end('agentB', 'B', id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.linksSvc.end('ownerC', 'C', id)).rejects.toBeInstanceOf(NotFoundException);
      expect((await f.poolSvc.pool('agentA', 'A')).items.length).toBe(1);
      await expect(f.linksSvc.end('ownerB', 'B', id)).resolves.toMatchObject({ status: 'SONLANDI' });
      expect(f.links[0]).toMatchObject({ endedByUserId: 'ownerB' });
      expect((await f.poolSvc.pool('agentA', 'A')).items).toEqual([]);
      await expect(f.poolSvc.detail('agentA', 'A', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
    it('bildirim hatası akışı bozmaz', async () => {
      const f = fixture();
      f.notifications.notify.mockRejectedValue(new Error('push down'));
      await expect(f.linksSvc.invite('ownerA', 'A', { code: 'OFS-222222' })).resolves.toMatchObject({ status: 'BEKLIYOR' });
    });
  });

  describe('paylaşım ve havuz', () => {
    it('yalnız ofis sahibi paylaşır; kapsam dışı birim 404', async () => {
      const f = fixture();
      await expect(f.poolSvc.setShare('agentB', 'B', 'u3', true)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.poolSvc.setShare('outsider', 'B', 'u3', true)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.poolSvc.setShare('ownerB', 'B', 'u4', true)).rejects.toBeInstanceOf(NotFoundException);
      await expect(f.poolSvc.setShare('ownerB', 'B', 'u3', 'yes')).rejects.toBeInstanceOf(BadRequestException);
      await expect(f.poolSvc.setShare('ownerB', 'B', 'u3', true)).resolves.toEqual({ id: 'u3', sharedWithSisters: true });
    });
    it('gizli (hiddenFromOffice) birim paylaşılamaz; gizlenince paylaşım düşer', async () => {
      const f = fixture();
      await expect(f.poolSvc.setShare('ownerB', 'B', 'u2', true)).rejects.toThrow(/gizlen/);
      await expect(f.poolSvc.setShare('ownerB', 'B', 'u2', true)).rejects.toBeInstanceOf(BadRequestException);
      expect(f.units[0].sharedWithSisters).toBe(true);
      await f.officePool.setVisibility('agentB', 'B', 'u1', true);
      expect(f.units[0]).toMatchObject({ hiddenFromOffice: true, sharedWithSisters: false });
    });
    it('ofis havuzu sharedWithSisters alanını yalnız sahibe gösterir', async () => {
      const f = fixture();
      const owner = await f.officePool.pool('ownerB', 'B');
      expect(owner.items.find(i => i.id === 'u1')?.sharedWithSisters).toBe(true);
      expect(owner.items.find(i => i.id === 'u3')?.sharedWithSisters).toBe(false);
      const agent = await f.officePool.pool('agentB', 'B');
      expect(agent.items.every(i => i.sharedWithSisters === false)).toBe(true);
    });
    it('kardeş havuzda danışman adı/ID ve özel alanlar yok; yalnız uygun ilanlar', async () => {
      const f = fixture();
      await f.connect();
      const r: any = await f.poolSvc.pool('agentA', 'A', { status: 'sale' });
      expect(r.items.map((i: any) => i.id)).toEqual(['u1']); // u2 gizli, u3 paylaşılmamış, u5 PASIF
      expect(r.items[0].office).toEqual({ id: 'B', name: 'Ofis B', ownerName: 'ownerB X', ownerPhone: '5-ownerB' });
      const json = JSON.stringify(r);
      expect(json).not.toMatch(/agent|deedOwner|contactPhone|whatsappPhone|doorAccessInfo|adaNo|parselNo|latitude|longitude|Tam Adres|Ali Veli|KAPI-KODU|0555/);
      await expect(f.poolSvc.pool('agentA', 'A', { status: 'x' })).rejects.toBeInstanceOf(BadRequestException);
      expect((await f.poolSvc.pool('agentA', 'A', { officeId: 'C' })).items).toEqual([]);
      await expect(f.poolSvc.pool('outsider', 'A')).rejects.toBeInstanceOf(ForbiddenException);
    });
    it('detayda danışman ve özel alan yok; malik adı açıklamadan temizlenir', async () => {
      const f = fixture();
      await f.connect();
      const d: any = await f.poolSvc.detail('agentA', 'A', 'u1');
      expect(d.privateInfo).toEqual({ status: 'none' });
      expect(d.office).toMatchObject({ id: 'B', name: 'Ofis B' });
      expect(d.description).not.toContain('Ali Veli');
      expect(d.features).toEqual(['f', '__EPH_META__:balcony:1']);
      expect(JSON.stringify(d)).not.toMatch(/agentB|deedOwner|contactPhone|whatsappPhone|doorAccessInfo|adaNo|parselNo|latitude|Tam Adres|KAPI-KODU|ali@x/);
      await expect(f.poolSvc.detail('agentA', 'A', 'u2')).rejects.toBeInstanceOf(NotFoundException);
      await expect(f.poolSvc.detail('agentA', 'A', 'u3')).rejects.toBeInstanceOf(NotFoundException);
      await expect(f.poolSvc.detail('agentA', 'A', 'u4')).rejects.toBeInstanceOf(NotFoundException); // kendi ofisinin ilanı kardeş havuzda değil
      await expect(f.poolSvc.detail('outsider', 'A', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });
    it('paket uygun değilse bağ askıda: havuz boş + suspended, detay 403, liste suspended', async () => {
      const f = fixture();
      await f.connect();
      f.settings.OFFICE_SUBSCRIPTION_B = { packageCode: 'BRONZ' };
      const r: any = await f.poolSvc.pool('agentA', 'A');
      expect(r).toMatchObject({ items: [], suspended: true });
      await expect(f.poolSvc.detail('agentA', 'A', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
      const list: any = await f.linksSvc.list('ownerA', 'A');
      expect(list.links[0]).toMatchObject({ status: 'AKTIF', suspended: true });
      expect(list.links[0].otherOffice.sharedCount).toBe(0);
      // süresi dolan abonelik de uygunsuzdur
      f.settings.OFFICE_SUBSCRIPTION_B = { packageCode: 'PLATINUM', expiresAt: new Date(Date.now() - 1000).toISOString() };
      expect((await f.poolSvc.pool('agentA', 'A')).items).toEqual([]);
    });
  });

  describe('özel bilgi isteği', () => {
    it('onaydan önce veri yok; onaydan sonra veri döner ve her görüntülemede erişim kaydı yazılır', async () => {
      const f = fixture();
      await f.connect();
      await expect(f.poolSvc.requestPrivateInfo('outsider', 'A', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
      const req: any = await f.poolSvc.requestPrivateInfo('agentA', 'A', 'u1');
      expect(req.status).toBe('BEKLIYOR');
      expect(f.notifications.notify).toHaveBeenCalledWith('ownerB', expect.objectContaining({ type: 'SISTER_PRIVATE_REQUEST' }));
      // tek açık istek
      await expect(f.poolSvc.requestPrivateInfo('agentA', 'A', 'u1')).resolves.toMatchObject({ id: req.id });
      expect(f.requests.length).toBe(1);
      expect((await f.poolSvc.detail('agentA', 'A', 'u1') as any).privateInfo).toEqual({ status: 'pending' });
      expect(f.logs.length).toBe(0);
      // yalnız birimin ofisinin sahibi karar verir
      await expect(f.reqSvc.approve('agentB', 'B', req.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.reqSvc.approve('ownerA', 'A', req.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(f.reqSvc.approve('ownerB', 'B', req.id)).resolves.toMatchObject({ status: 'ONAYLANDI' });
      expect(f.notifications.notify).toHaveBeenCalledWith('agentA', expect.objectContaining({ type: 'SISTER_PRIVATE_APPROVED' }));
      const d1: any = await f.poolSvc.detail('agentA', 'A', 'u1');
      expect(d1.privateInfo.status).toBe('approved');
      expect(d1.privateInfo.data).toEqual({
        ownerFullName: 'Ali Veli', ownerPhone: '0555 000', whatsappPhone: '0555 222', ownerEmail: 'ali@x.com',
        location: { address: 'Tam Adres 1', latitude: 1.5, longitude: 2.5, adaNo: '12', parselNo: '34' },
      });
      expect(JSON.stringify(d1)).not.toMatch(/KAPI-KODU|agentB/);
      await f.poolSvc.detail('agentA', 'A', 'u1');
      expect(f.logs).toHaveLength(2);
      expect(f.logs[0]).toMatchObject({ requestId: req.id, unitId: 'u1', viewerUserId: 'agentA' });
      // onay başka kullanıcıya geçmez
      expect((await f.poolSvc.detail('ownerA', 'A', 'u1') as any).privateInfo).toEqual({ status: 'none' });
    });
    it('bağ sonlanınca onaylı veri de kapanır', async () => {
      const f = fixture();
      const id = await f.connect();
      const req: any = await f.poolSvc.requestPrivateInfo('agentA', 'A', 'u1');
      await f.reqSvc.approve('ownerB', 'B', req.id);
      await f.linksSvc.end('ownerA', 'A', id);
      await expect(f.poolSvc.detail('agentA', 'A', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
    it('reddedilen istek tekrar açılabilir; karar verilmiş istek tekrar karara bağlanamaz', async () => {
      const f = fixture();
      await f.connect();
      const req: any = await f.poolSvc.requestPrivateInfo('agentA', 'A', 'u1');
      await expect(f.reqSvc.reject('ownerB', 'B', req.id)).resolves.toMatchObject({ status: 'REDDEDILDI' });
      expect(f.notifications.notify).toHaveBeenCalledWith('agentA', expect.objectContaining({ type: 'SISTER_PRIVATE_REJECTED' }));
      await expect(f.reqSvc.approve('ownerB', 'B', req.id)).rejects.toBeInstanceOf(BadRequestException);
      expect((await f.poolSvc.detail('agentA', 'A', 'u1') as any).privateInfo).toEqual({ status: 'rejected' });
      await expect(f.poolSvc.requestPrivateInfo('agentA', 'A', 'u1')).resolves.toMatchObject({ id: req.id, status: 'BEKLIYOR' });
      expect(f.requests.length).toBe(1);
    });
    it('istek listesi: incoming yalnız sahip; outgoing üye kendi isteklerini görür', async () => {
      const f = fixture();
      await f.connect();
      await f.poolSvc.requestPrivateInfo('agentA', 'A', 'u1');
      await expect(f.reqSvc.list('agentB', 'B', 'incoming')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(f.reqSvc.list('ownerB', 'B', 'x')).rejects.toBeInstanceOf(BadRequestException);
      const inc: any = await f.reqSvc.list('ownerB', 'B', 'incoming');
      expect(inc.items).toHaveLength(1);
      expect(inc.items[0]).toMatchObject({ status: 'BEKLIYOR', requesterName: 'agentA X', office: { id: 'A' } });
      expect(JSON.stringify(inc)).not.toMatch(/agentB|Ali Veli/);
      expect((await f.reqSvc.list('agentA', 'A', 'outgoing') as any).items).toHaveLength(1);
      expect((await f.reqSvc.list('ownerA', 'A', 'outgoing') as any).items).toHaveLength(1);
      await expect(f.reqSvc.list('outsider', 'A', 'outgoing')).rejects.toBeInstanceOf(ForbiddenException);
      expect((await f.reqSvc.list('root', 'B', 'incoming') as any).items).toHaveLength(1);
    });
    it('süper admin istek/onay olmadan özel bilgiyi görür; diğer roller etkilenmez', async () => {
      const f = fixture();
      await f.connect();
      const d: any = await f.poolSvc.detail('root', 'A', 'u1');
      expect(d.privateInfo.status).toBe('approved');
      expect(d.privateInfo.data).toMatchObject({ ownerFullName: 'Ali Veli', ownerPhone: '0555 000', whatsappPhone: '0555 222', ownerEmail: 'ali@x.com', location: { address: 'Tam Adres 1' } });
      expect(f.requests).toHaveLength(0);
      expect((await f.poolSvc.detail('agentA', 'A', 'u1') as any).privateInfo).toEqual({ status: 'none' });
    });
    it('süper admin her uç noktada işlem yapabilir', async () => {
      const f = fixture();
      const r: any = await f.linksSvc.invite('root', 'A', { code: 'OFS-222222' });
      await expect(f.linksSvc.accept('root', 'B', r.id)).resolves.toMatchObject({ status: 'AKTIF' });
      await expect(f.poolSvc.setShare('root', 'B', 'u3', true)).resolves.toMatchObject({ sharedWithSisters: true });
      await expect(f.poolSvc.pool('root', 'A')).resolves.toBeDefined();
      await expect(f.officePool.pool('root', 'B')).resolves.toBeDefined();
    });
  });
});
