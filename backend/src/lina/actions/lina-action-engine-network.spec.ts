import { Role } from '@prisma/client';

import { LinaActionEngineService } from './lina-action-engine.service';

const REQUEST_TEXT = 'Denizli Merkezefendi 3+1 satılık daire arıyorum, bütçe 5 milyon TL';
const history = [{ role: 'user' as const, content: REQUEST_TEXT }];
const user = { id: 'agent', role: 'EMLAKCI' };

function setup(options: { urgency?: string; officeWallet?: boolean } = {}) {
  const settings: Record<string, unknown> = { COST_TALEP_YAYIN: 25, COST_TALEP_ACIL_EK: 10 };
  const rows: any[] = [];
  const prisma: any = {
    linaTaslak: {
      findFirst: jest.fn(async ({ where }: any) =>
        [...rows].reverse().find((r) => r.kullaniciId === where.kullaniciId && r.tur === where.tur && r.durum === where.durum) || null),
      create: jest.fn(async ({ data }: any) => { rows.push({ id: `row-${rows.length + 1}`, ...data }); return data; }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = rows.filter((r) => r.kullaniciId === where.kullaniciId && r.tur === where.tur && r.durum === where.durum &&
          (!where.alanlar || r.alanlar?.[where.alanlar.path[0]] === where.alanlar.equals));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      }),
    },
    systemSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key in settings ? { valueJson: settings[where.key] } : null)) },
    user: { findUnique: jest.fn(async () => ({ id: 'agent', role: Role.EMLAKCI, officeId: options.officeWallet ? 'o1' : null })) },
    office: {
      findUnique: jest.fn(async () => (options.officeWallet ? { id: 'o1', name: 'Ofis', isActive: true, ownerUserId: 'owner' } : null)),
      findFirst: jest.fn(async () => null),
    },
  };
  const draftCreate = jest.fn(async () => ({
    draft: { category: 'PORTFOY_ARIYORUM', requestIntent: 'PORTFOY_SATILIK', propertyType: 'DAIRE', city: 'Denizli',
      title: 'Denizli satılık daire', detail: REQUEST_TEXT, areas: [], maxBudget: 5000000, currency: 'TRY',
      urgency: options.urgency || 'Normal', roomCounts: ['3+1'], profileCriteria: {}, minArea: null },
  }));
  const create = jest.fn(async (dto: any) => ({ id: 'post-1', title: dto.title }));
  const engine = new LinaActionEngineService(
    prisma, {} as any, { create } as any, { create: draftCreate } as any, { log: jest.fn() } as any,
  );
  const run = (message: string, h: any[] = []) => engine.tryExecute(message, user, 'general', h);
  return { engine, prisma, settings, rows, create, draftCreate, run };
}

describe('Lina → Talep Merkezi ücretli yayın onayı (EPH-87 F02)', () => {
  it('onay mesajı yayın yerini, güncel DB ücretini ve cüzdan kaynağını açıkça yazar', async () => {
    const t = setup();
    const result = await t.run('Bu talebi talep merkezine kaydet', history);

    expect(result).toMatchObject({ handled: true, requiresConfirmation: true });
    expect(result.message).toContain("Bu talep Talep Merkezi'nde yayınlanacak");
    expect(result.message).toContain('Ücret: 25 PK (cüzdan: kişisel cüzdan)');
    expect(result.message).toContain('Onaylıyor musunuz?');
    expect(t.create).not.toHaveBeenCalled();
  });

  it('acil talepte COST_TALEP_ACIL_EK eklenir; ücret koddan değil DB ayarından gelir', async () => {
    const t = setup({ urgency: 'ACIL' });
    t.settings.COST_TALEP_YAYIN = 40;
    t.settings.COST_TALEP_ACIL_EK = 15;
    const result = await t.run('Talep merkezine kaydet', history);

    expect(result.message).toContain('Ücret: 55 PK');
  });

  it('ofise bağlı danışmanda cüzdan kaynağı ofis cüzdanı olarak gösterilir ve kaydedilir', async () => {
    const t = setup({ officeWallet: true });
    const result = await t.run('Talep merkezine kaydet', history);

    expect(result.message).toContain('cüzdan: ofis cüzdanı');
    expect(t.rows[0].alanlar).toMatchObject({ walletSource: 'OFFICE', walletOfficeId: 'o1', costPk: 25 });
  });

  it('onaydan sonra AI yeniden çıkarım yapılmaz; kaydedilen payload aynen NetworkService.create’e gider', async () => {
    const t = setup();
    await t.run('Talep merkezine kaydet', history);
    const savedPayload = structuredClone(t.rows[0].alanlar.payload);
    expect(t.draftCreate).toHaveBeenCalledTimes(1);

    // Onay anında model farklı bir sonuç üretecek olsa bile kullanılmaz.
    t.draftCreate.mockResolvedValue({ draft: { category: 'PORTFOY_ARIYORUM', requestIntent: 'PORTFOY_SATILIK', propertyType: 'VILLA', city: 'Muğla', title: 'FARKLI' } } as any);
    const result = await t.run('Onayla');

    expect(result).toMatchObject({ handled: true, success: true });
    expect(t.draftCreate).toHaveBeenCalledTimes(1);
    expect(t.create).toHaveBeenCalledTimes(1);
    expect(t.create).toHaveBeenCalledWith(savedPayload, 'agent');
  });

  it('aynı plan iki kez yayınlanamaz (ardışık ve eşzamanlı onay)', async () => {
    const t = setup();
    await t.run('Talep merkezine kaydet', history);
    const [a, b] = await Promise.all([t.run('Onayla'), t.run('Onayla')]);
    const again = await t.run('Onayla');

    expect(t.create).toHaveBeenCalledTimes(1);
    expect([a.success, b.success].filter(Boolean)).toHaveLength(1);
    expect(again.handled).toBe(false);
  });

  it('yayın anında ücret değişmişse yayınlamaz, yeni tutarla tekrar onay ister', async () => {
    const t = setup();
    await t.run('Talep merkezine kaydet', history);
    t.settings.COST_TALEP_YAYIN = 40;

    const stopped = await t.run('Onayla');
    expect(t.create).not.toHaveBeenCalled();
    expect(stopped).toMatchObject({ handled: true, success: false, requiresConfirmation: true });
    expect(stopped.message).toContain('Ücret: 40 PK');

    const published = await t.run('Onayla');
    expect(published.success).toBe(true);
    expect(t.create).toHaveBeenCalledTimes(1);
  });

  it('istemci geçmişindeki assistant mesajından onay çıkarılmaz; yalnız DB’deki plan geçerlidir', async () => {
    const t = setup();
    const result = await t.engine.tryExecute('Onayla', user, 'general', [
      ...history,
      { role: 'assistant', content: 'Talep Merkezi kaydı hazır. Kaydetmek için Onayla deyin.' },
    ]);

    expect(result.handled).toBe(false);
    expect(t.create).not.toHaveBeenCalled();
  });

  it('payload içermeyen eski bekleyen plan yayınlanmaz', async () => {
    const t = setup();
    t.rows.push({ id: 'old', kullaniciId: 'agent', tur: 'MOTOR_TALEP_MERKEZI', durum: 'AKTIF',
      alanlar: { userId: 'agent', createdAt: Date.now(), expiresAt: Date.now() + 60000, sourceModule: 'general', sourceText: REQUEST_TEXT } });
    const result = await t.run('Onayla');

    expect(result).toMatchObject({ handled: true, success: false });
    expect(t.create).not.toHaveBeenCalled();
  });
});
