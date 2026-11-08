import { ForbiddenException } from '@nestjs/common';
import { KontorIslemTuru } from '@prisma/client';
import { KontorService } from './kontor.service';

describe('PK wallet owner and authenticated actor attribution', () => {
  function setup() {
    let balance = 100; let movement: any = null;
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: { findUnique: jest.fn(async ({ where }) => ({ id: where.id, role: 'SUPER_ADMIN', officeId: null })) }, office: { findUnique: jest.fn(async () => ({ id: 'office', isActive: true, ownerUserId: 'office-owner' })), findFirst: jest.fn().mockResolvedValue(null) }, systemSetting: { findUnique: jest.fn().mockResolvedValue({ valueJson: { mode: 'SHARED' } }) }, $queryRaw: jest.fn().mockResolvedValue([{ id: 'wallet' }]),
      kontorHareketi: { findFirst: jest.fn(async ({ where }) => movement && (!where.hareketTuru || movement.hareketTuru === where.hareketTuru) ? movement : null), create: jest.fn(async ({ data }) => { movement = { id: 'movement', ...data }; return movement; }) },
      kontorCuzdani: { upsert: jest.fn().mockResolvedValue({}), findUnique: jest.fn(async () => ({ bakiye: balance, toplamHarcama: 100 - balance, aktifMi: true })), update: jest.fn(async ({ data }) => { balance += data.bakiye.increment ?? -data.bakiye.decrement; return { bakiye: balance, aktifMi: true }; }) },
    };
    const db = { $transaction: jest.fn(async fn => fn(tx)) };
    return { service: new KontorService(db as any, {} as any), tx, balance: () => balance };
  }
  const input = { walletSource: 'OFFICE', walletOfficeId: 'office', userId: 'office-owner', actorId: 'super', amount: 25, islemTuru: KontorIslemTuru.ESLESME_TARAMASI, idempotencyKey: 'request-123', ilgiliKayitTuru: 'MATCH' };
  it('debits selected owner, records actor, and does not charge twice', async () => {
    const t = setup(); expect(await t.service.harcamayiYap(input)).toMatchObject({ spent: 25, previousBalance: 100, remainingBalance: 75, alreadyProcessed: false });
    expect(t.tx.kontorHareketi.create.mock.calls[0][0].data).toMatchObject({ kullaniciId: 'office-owner', olusturanId: 'super' });
    expect(await t.service.harcamayiYap(input)).toMatchObject({ alreadyProcessed: true, remainingBalance: 75 }); expect(t.tx.kontorCuzdani.update).toHaveBeenCalledTimes(1);
  });
  it('another actor cannot reuse the wallet operation key', async () => {
    const t = setup(); await t.service.harcamayiYap(input); await expect(t.service.harcamayiYap({ ...input, actorId: 'other' })).rejects.toThrow(ForbiddenException); expect(t.balance()).toBe(75);
  });
  it('refund returns funds to the wallet owner while preserving original actor', async () => {
    const t = setup(); await t.service.harcamayiYap(input); await t.service.harcamayiIadeEt({ userId: 'office-owner', originalMovementId: 'movement' });
    expect(t.balance()).toBe(100); expect(t.tx.kontorHareketi.create.mock.calls[1][0].data).toMatchObject({ kullaniciId: 'office-owner', olusturanId: 'super', hareketTuru: 'IADE' });
  });
  it('existing personal wallet callers keep owner as actor', async () => {
    const t = setup(); await t.service.harcamayiYap({ ...input, userId: 'member', actorId: undefined, walletSource: 'PERSONAL', walletOfficeId: undefined }); expect(t.tx.kontorHareketi.create.mock.calls[0][0].data).toMatchObject({ kullaniciId: 'member', olusturanId: 'member' });
  });
});
