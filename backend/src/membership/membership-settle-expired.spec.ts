import { PaymentOrderPurpose, PaymentOrderStatus, PaymentTransactionStatus, PaymentTransactionType, UyelikDurumu } from '@prisma/client';
import { MembershipService } from './membership.service';

/**
 * EPH-70A2: süresi geçmiş üyelik işlemi PK yüklemez (EPH-70B1/K4 koruması).
 * Bellek içi sahte tx; DB/ödeme çağrısı yok.
 */
function build(endsAt: Date) {
  const calls = { lotCreate: 0, walletUpdate: 0, hareketCreate: 0, settlementCreate: 0, settlementData: null as any };
  const order = {
    id: 'order-1', kullaniciId: 'user-1', durum: PaymentOrderStatus.PAID, amac: PaymentOrderPurpose.MEMBERSHIP_PURCHASE,
    tutar: 100, paraBirimi: 'TRY', metadata: {}, fiyatSnapshot: { aylikPaketPk: 500 }, pkMiktari: null,
    hedefPaket: { id: 'pkg-1', paketAdi: 'Test Paket', paketKodu: 'BRONZ', segment: 'MUTEAHHIT', aylikPaketPk: 500 },
  };
  const tx: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'MUTEAHHIT' })) },
    $executeRaw: jest.fn(async () => 1),
    $queryRaw: jest.fn(async () => []),
    paymentSettlement: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => { calls.settlementCreate++; calls.settlementData = data; return { id: 'settlement-1', ...data }; }),
    },
    paymentOrder: { findUnique: jest.fn(async ({ select }: any) => (select ? { kullaniciId: order.kullaniciId } : order)) },
    paymentTransaction: { findFirst: jest.fn(async () => ({ id: 'tx-1', durum: PaymentTransactionStatus.SUCCEEDED, islemTuru: PaymentTransactionType.PAYMENT, tutar: 100, paraBirimi: 'TRY' })) },
    kullaniciUyelikPaketi: {
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({ id: 'mem-1', durum: UyelikDurumu.AKTIF, bitisTarihi: endsAt })),
    },
    portfolioCreditLot: {
      findMany: jest.fn(async () => []), create: jest.fn(async () => { calls.lotCreate++; return { id: 'lot-1' }; }) },
    kontorCuzdani: {
      upsert: jest.fn(async () => ({})),
      findUnique: jest.fn(async () => ({ id: 'wallet-1', bakiye: 0, aktifMi: true })),
      update: jest.fn(async () => { calls.walletUpdate++; return { bakiye: 500 }; }),
    },
    kontorHareketi: { create: jest.fn(async () => { calls.hareketCreate++; return {}; }) },
  };
  const service = new MembershipService({ $transaction: async (fn: any) => fn(tx) } as any);
  return { service, calls };
}

describe('EPH-70A2 settlePaidOrder: süresi geçmiş üyelik PK yüklemez', () => {
  it('bitişi geçmiş üyelikte lot, cüzdan artışı ve yükleme hareketi yazılmaz; yalnız tarihsel settlement kaydı oluşur', async () => {
    const { service, calls } = build(new Date(Date.now() - 24 * 3600 * 1000));
    const result: any = await service.settlePaidOrder('order-1');
    expect(result.settled).toBe(true);
    expect(result.portfolioCreditLotId).toBeNull();
    expect(calls.lotCreate).toBe(0);
    expect(calls.walletUpdate).toBe(0);
    expect(calls.hareketCreate).toBe(0);
    expect(calls.settlementCreate).toBe(1);
    expect(calls.settlementData.portfolioCreditLotId).toBeNull();
  });

  it('kontrol: bitişi gelecekte olan üyelikte PK lotu ve cüzdan yüklemesi yazılır', async () => {
    const { service, calls } = build(new Date(Date.now() + 24 * 3600 * 1000));
    const result: any = await service.settlePaidOrder('order-1');
    expect(result.portfolioCreditLotId).toBe('lot-1');
    expect(calls.lotCreate).toBe(1);
    expect(calls.walletUpdate).toBe(1);
    expect(calls.hareketCreate).toBe(1);
  });
});
