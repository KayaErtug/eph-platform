import { resolveOfficeWallet } from '../office/office-wallet.rules';
import { assertNoBlockedInteraction } from '../content-safety/block-policy';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { KontorIslemTuru, MatchScanAttemptStatus, MatchScanSourceType, Prisma, Role } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AdminService } from '../admin/admin.service';
import { KontorService } from '../kontor/kontor.service';
import { EphMatchDemand, EphMatchEngineService } from '../matching/eph-match-engine.service';
import { ACTIVE_MATCH_UNIT, PaidMatchItem, readablePaidMatches, visiblePaidUnits } from '../matching/paid-match-report';
import { PrismaService } from '../prisma/prisma.service';

export type CommercialScanType = 'CRM' | 'PRIVATE_PORTFOLIO' | 'POOL_PROPERTY' | 'REQUEST';
type ScanUser = { id?: string; role?: Role | string };
type WalletSelection = { walletSource?: string; walletOfficeId?: string };
type ScanContext = { record: any; demands: EphMatchDemand[]; sourceVersion: string };
const SOURCE_TYPES: Record<CommercialScanType, MatchScanSourceType> = {
  CRM: MatchScanSourceType.CRM_CUSTOMER, PRIVATE_PORTFOLIO: MatchScanSourceType.PRIVATE_PORTFOLIO,
  POOL_PROPERTY: MatchScanSourceType.POOL_PROPERTY, REQUEST: MatchScanSourceType.REQUEST,
};
const COST_KEYS: Record<CommercialScanType, string> = {
  CRM: 'MATCH_SCAN_COST_CRM_PK', PRIVATE_PORTFOLIO: 'MATCH_SCAN_COST_PRIVATE_PORTFOLIO_PK',
  POOL_PROPERTY: 'MATCH_SCAN_COST_POOL_PROPERTY_PK', REQUEST: 'MATCH_SCAN_COST_REQUEST_PK',
};
const MAX_CANDIDATES = 2000;
const MAX_RESULTS = 100;

@Injectable()
export class CommercialMatchScanService {
  constructor(private readonly prisma: PrismaService, private readonly adminService: AdminService,
    private readonly kontorService: KontorService, private readonly matchEngine: EphMatchEngineService) {}

  private reject(code: string, message: string): never {
    throw new BadRequestException({ code, message });
  }

  async config(rawUser: ScanUser, selection: WalletSelection = {}) {
    const user = await this.resolveUser(rawUser);
    await this.ensureScanAuthorized(user.id);
    const wallet = await this.resolveWallet(user.id, selection);
    const costPk = await this.cost('REQUEST');
    return { actorId: user.id, costPk, balance: wallet.balance,
      eligible: wallet.active && wallet.balance >= costPk, walletOfficeId: wallet.walletOfficeId };
  }

    private async ensureScanAuthorized(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, officeId: true },
    });
    if (user?.role === Role.EMLAKCI && user.officeId) {
      const office = await this.prisma.office.findUnique({
        where: { id: user.officeId },
        select: { ownerUserId: true },
      });
      if (office?.ownerUserId !== userId) {
        const policy = await this.prisma.systemSetting.findUnique({
          where: { key: `EPH_OFFICE_SPENDING_${user.officeId}` },
        });
        const permissions = (policy?.valueJson as any)?.scanPermissions;
        if (permissions && permissions[userId] === false) {
          throw new ForbiddenException(
            'Eşleştirme taraması yapma yetkiniz bulunmamaktadır. Lütfen ofis yöneticinizle iletişime geçin.',
          );
        }
      }
    }
  }

  async quote(typeValue: string, sourceIdValue: string, rawUser: ScanUser, selection: WalletSelection = {}) {
    const user = await this.resolveUser(rawUser);
    const type = this.parseType(typeValue);
    const sourceId = this.cleanSourceId(sourceIdValue);
    const context = await this.context(type, sourceId, user);
    const wallet = await this.resolveWallet(user.id, selection);
    const costPk = await this.cost(type);
    return { actorId: user.id, costPk, balance: wallet.balance,
      eligible: wallet.active && wallet.balance >= costPk, source: wallet.source,
      walletOfficeId: wallet.walletOfficeId, remainingBudget: null, sourceVersion: context.sourceVersion };
  }

  async scan(typeValue: string, sourceIdValue: string, rawUser: ScanUser, body: Record<string, unknown>) {
    const user = await this.resolveUser(rawUser);
    const type = this.parseType(typeValue);
    const sourceId = this.cleanSourceId(sourceIdValue);
    const requestId = String(body.requestId || '').trim();
    if (!/^[A-Za-z0-9_-]{12,120}$/.test(requestId)) this.reject('MATCH_SCAN_INVALID_REQUEST', 'Geçerli bir tarama işlem kimliği gereklidir.');
    if (body.expectedActorId && body.expectedActorId !== user.id) throw new ForbiddenException('Oturum değişti. Tarama başlatılmadı.');
    let context = await this.context(type, sourceId, user, false);
    const selection = this.selection(body);
    const existing = await this.prisma.matchScanAttempt.findUnique({ where: { requestId } });
    if (existing) return this.replay(existing, type, sourceId, user, selection);
    context = await this.context(type, sourceId, user);
    const wallet = await this.resolveWallet(user.id, selection);
    const costPk = await this.cost(type);
    if (!Number.isSafeInteger(body.expectedCostPk) || body.expectedCostPk !== costPk ||
      (body.expectedSourceVersion && body.expectedSourceVersion !== context.sourceVersion)) {
      this.reject('MATCH_SCAN_RECONFIRM', 'Tarife veya kaynak kriterleri değişti. Güncel bilgileri yeniden onaylayın.');
    }
    if (!wallet.active || wallet.balance < costPk) this.reject('MATCH_SCAN_RECONFIRM', 'Seçilen PK bakiyesi yetersiz veya cüzdan aktif değil.');
    let attempt: { id: string };
    try {
      attempt = await this.prisma.matchScanAttempt.create({ data: {
        requestId, userId: user.id, sourceType: SOURCE_TYPES[type], sourceId,
        ...(type === 'REQUEST' ? { postId: sourceId } : {}), status: MatchScanAttemptStatus.PROCESSING, cost: costPk,
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.matchScanAttempt.findUnique({ where: { requestId } });
        if (raced) return this.replay(raced, type, sourceId, user, selection);
      }
      throw error;
    }
    try {
      const findings = await this.findMatches(type, context, user);
      const current = await this.context(type, sourceId, user);
      if (current.sourceVersion !== context.sourceVersion) this.reject('MATCH_SCAN_RECONFIRM', 'Kaynak tarama sırasında değişti. Yeni kriterlerle tekrar onaylayın.');
      const currentWallet = await this.resolveWallet(user.id, selection);
      if (currentWallet.chargeUserId !== wallet.chargeUserId || !currentWallet.active) this.reject('MATCH_SCAN_RECONFIRM', 'Seçilen PK hesabının yetkisi değişti.');
      // Kesinti ve rapor kaydı tek transaction içinde tamamlanır.
      const receipt = await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "MatchScanAttempt" WHERE "id" = ${attempt.id} FOR UPDATE`;
        const locked = await tx.matchScanAttempt.findUnique({ where: { requestId } });
        if (locked?.status !== MatchScanAttemptStatus.PROCESSING) this.reject('MATCH_SCAN_REVIEW_REQUIRED', 'İşlem durumu değişti. Aynı işlem kimliğiyle kontrol edin.');
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR SHARE`;
        if (wallet.walletOfficeId) await tx.$queryRaw`SELECT "id" FROM "Office" WHERE "id" = ${wallet.walletOfficeId} FOR SHARE`;
        const actorNow = await tx.user.findUnique({ where: { id: user.id }, select: { role: true } });
        if (!actorNow || actorNow.role !== user.role) throw new ForbiddenException('Oturum yetkisi değişti.');
        if (type === 'CRM') {
          await tx.$queryRaw`SELECT "id" FROM "CustomerInterest" WHERE "id" = ${sourceId} FOR SHARE`;
          await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${context.record.customerId} FOR SHARE`;
        } else if (type === 'REQUEST') {
          await tx.$queryRaw`SELECT "id" FROM "NetworkPost" WHERE "id" = ${sourceId} FOR SHARE`;
        } else {
          await tx.$queryRaw`SELECT "id" FROM "Unit" WHERE "id" = ${sourceId} FOR SHARE`;
          await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${context.record.project.id} FOR SHARE`;
        }
        const lockedSource = await this.context(type, sourceId, user, true, tx);
        const lockedWallet = await this.resolveWallet(user.id, selection, tx);
        if (lockedSource.sourceVersion !== context.sourceVersion || lockedWallet.chargeUserId !== wallet.chargeUserId || !lockedWallet.active) {
          this.reject('MATCH_SCAN_RECONFIRM', 'Kaynak veya PK hesabı değişti. Yeni onay gerekir.');
        }
        const spend = await this.kontorService.harcamayiYap({
          userId: wallet.chargeUserId, actorId: user.id, walletSource: wallet.source, walletOfficeId: wallet.walletOfficeId || undefined, amount: costPk, islemTuru: KontorIslemTuru.ESLESME_TARAMASI,
          aciklama: `Eşleşme taraması (${type}): ${sourceId}`, ilgiliKayitTuru: `MATCH_SCAN:${SOURCE_TYPES[type]}:${sourceId}`,
          ilgiliKayitId: requestId, idempotencyKey: requestId, transaction: tx,
        });
        const scannedAt = new Date().toISOString();
        const matches = findings.matches.slice(0, MAX_RESULTS);
        const result = {
          ok: true, policyVersion: 'EPH_PAID_MATCH_V1', operationId: spend.movement.id, requestId, sourceId, sourceType: type,
          ...(type === 'REQUEST' ? { postId: sourceId } : {}), scannedAt, sourceVersion: context.sourceVersion,
          replayed: false, duplicateRequest: false, spent: spend.alreadyProcessed ? 0 : spend.spent, remainingBalance: spend.remainingBalance,
          billing: { cost: costPk, charged: !spend.alreadyProcessed, alreadyProcessed: Boolean(spend.alreadyProcessed),
            previousBalance: spend.previousBalance, remainingBalance: spend.remainingBalance, walletSource: wallet.source, walletOfficeId: wallet.walletOfficeId },
          demand: this.demandSummary(context),
          summary: { regionLabel: this.region(context.demands[0]), evaluatedCount: findings.evaluated,
            matchedCount: findings.matches.length, returnedCount: matches.length, resultLimit: MAX_RESULTS,
            noMatchReason: matches.length ? null : 'Konum, işlem türü, bütçe ve zorunlu kriterleri sağlayan aktif eşleşme bulunamadı.' },
          matches, unavailableResultCount: 0,
          ...(type === 'REQUEST' ? { pool: { recalculatedAt: scannedAt, warning: `${matches.length} kayıtlı eşleşme gösteriliyor.`,
            matches, resultCount: matches.length, unavailableResultCount: 0 },
            hiddenPortfolio: { recalculatedAt: scannedAt, wasStale: false, warning: 'Özel portföyler yalnızca kendi hesabınıza aitse gösterilir.' } } : {}),
        };
        await tx.matchScanAttempt.update({ where: { id: attempt.id }, data: {
          status: MatchScanAttemptStatus.COMPLETED, movementId: spend.movement.id,
          resultJson: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue, completedAt: new Date(), failedAt: null, errorMessage: null,
        } });
        return result;
      }, { maxWait: 10000, timeout: 20000 });
      return this.readable(receipt, context, user);
    } catch (error) {
      // Commit yanıtı kaybolduğunda yeni kesintiden önce kayıt kilit altında okunur.
      let settled: any;
      try {
        settled = await this.prisma.$transaction(async tx => {
          await tx.$queryRaw`SELECT "id" FROM "MatchScanAttempt" WHERE "id" = ${attempt.id} FOR UPDATE`;
          const row = await tx.matchScanAttempt.findUnique({ where: { requestId } });
          if (row?.status === MatchScanAttemptStatus.COMPLETED) return row;
          await tx.matchScanAttempt.update({ where: { id: attempt.id }, data: {
            status: MatchScanAttemptStatus.FAILED, failedAt: new Date(),
            errorMessage: 'Tarama tamamlanmadı; kesinti ve rapor transaction işlemi tamamlanmadı.',
          } });
          return null;
        });
      } catch {
        this.reject('MATCH_SCAN_REVIEW_REQUIRED', 'İşlem sonucu doğrulanamadı. Yeni tarama açmadan aynı işlemle tekrar kontrol edin.');
      }
      if (settled) return this.replay(settled, type, sourceId, user, selection);
      if (error instanceof BadRequestException) {
        const response = error.getResponse() as { code?: string; message?: string };
        if (['MATCH_SCAN_SOURCE_INVALID', 'MATCH_SCAN_RECONFIRM'].includes(response?.code || '') && typeof response.message === 'string') {
          this.reject('MATCH_SCAN_FAILED_RETRY_NEW', response.message + ' Bu işlem için PK kesilmedi.');
        }
      }
      this.reject('MATCH_SCAN_FAILED_RETRY_NEW', 'Tarama tamamlanamadı; bu işlem için PK kesilmedi. Güncel ücretle yeniden deneyin.');
    }
  }

  async history(typeValue: string, sourceIdValue: string, rawUser: ScanUser) {
    const user = await this.resolveUser(rawUser), type = this.parseType(typeValue), sourceId = this.cleanSourceId(sourceIdValue);
    await this.context(type, sourceId, user, false);
    const rows = await this.prisma.matchScanAttempt.findMany({
      where: { ...(user.role === Role.SUPER_ADMIN ? {} : { userId: user.id }), sourceType: SOURCE_TYPES[type], sourceId, status: MatchScanAttemptStatus.COMPLETED },
      orderBy: { startedAt: 'desc' }, take: 50, select: { id: true, requestId: true, cost: true, startedAt: true, status: true },
    });
    return rows.map(row => ({ ...row, costPk: row.cost, createdAt: row.startedAt.toISOString() }));
  }

  async historyReceipt(typeValue: string, sourceIdValue: string, requestId: string, rawUser: ScanUser) {
    const user = await this.resolveUser(rawUser), type = this.parseType(typeValue), sourceId = this.cleanSourceId(sourceIdValue);
    const context = await this.context(type, sourceId, user, false);
    const row = await this.prisma.matchScanAttempt.findFirst({ where: { requestId, sourceType: SOURCE_TYPES[type], sourceId,
      ...(user.role === Role.SUPER_ADMIN ? {} : { userId: user.id }), status: MatchScanAttemptStatus.COMPLETED } });
    if (!row?.resultJson) throw new NotFoundException('Kayıtlı tarama raporu bulunamadı.');
    return this.readable(await this.legacyReceipt(row, user), context, user);
  }

  private async replay(row: any, type: CommercialScanType, sourceId: string, user: { id: string; role: Role }, selection: WalletSelection) {
    if (row.userId !== user.id || row.sourceType !== SOURCE_TYPES[type] || row.sourceId !== sourceId) throw new ForbiddenException('İşlem kimliği başka kullanıcıya veya kaynağa ait.');
    const context = await this.context(type, sourceId, user, false);
    if (row.status === MatchScanAttemptStatus.COMPLETED && row.resultJson) {
      const result = await this.legacyReceipt(row, user, selection);
      if ((result.billing?.walletOfficeId ?? null) !== (selection.walletSource === 'OFFICE' ? selection.walletOfficeId : null)) throw new ForbiddenException('Tekrar denemede PK hesabı değiştirilemez.');
      return this.readable({ ...result, replayed: true, duplicateRequest: true, spent: 0, billing: { ...result.billing, charged: false } }, context, user);
    }
    if (row.status === MatchScanAttemptStatus.PROCESSING) {
      if (row.startedAt && Date.now() - new Date(row.startedAt).getTime() > 120000) {
        let recovered: any;
        try {
          recovered = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT "id" FROM "MatchScanAttempt" WHERE "id" = ${row.id} FOR UPDATE`;
            const current = await tx.matchScanAttempt.findUnique({ where: { requestId: row.requestId } });
            if (current?.status !== MatchScanAttemptStatus.PROCESSING) return current;
            const movement = await tx.kontorHareketi.findFirst({ where: {
              islemTuru: KontorIslemTuru.ESLESME_TARAMASI, hareketTuru: 'HARCAMA', ilgiliKayitId: row.requestId,
            }, select: { id: true } });
            if (movement) return null;
            return tx.matchScanAttempt.update({ where: { id: row.id }, data: { status: MatchScanAttemptStatus.FAILED,
              failedAt: new Date(), errorMessage: 'Zaman aşımı; kontör hareketi bulunmuyor.' } });
          });
        } catch { this.reject('MATCH_SCAN_REVIEW_REQUIRED', 'Bekleyen işlem doğrulanamadı. Aynı işlem kimliğini koruyun.'); }
        if (!recovered) this.reject('MATCH_SCAN_REVIEW_REQUIRED', 'Bekleyen işlem için finansal kontrol gerekiyor.');
        return this.replay(recovered, type, sourceId, user, selection);
      }
      this.reject('MATCH_SCAN_PROCESSING', 'Tarama henüz doğrulanmadı. Aynı işlemle tekrar kontrol edin.');
    }
    if (row.movementId || /iade.*tamamlanamadı|finansal kontrol/i.test(row.errorMessage || '')) this.reject('MATCH_SCAN_REVIEW_REQUIRED', 'Önceki işlemin finansal kontrolü gerekiyor. Yeni tarama başlatılmadı.');
    this.reject('MATCH_SCAN_FAILED_RETRY_NEW', 'Önceki tarama başarısız. Güncel ücretle yeni tarama başlatabilirsiniz.');
  }

  private async legacyReceipt(row: any, user: { id: string; role: Role }, selection?: WalletSelection) {
    const result = row.resultJson;
    if (result.billing) return { ...result, ok: true };
    let billing: any = { cost: row.cost, charged: false, previousBalance: null, remainingBalance: result.remainingBalance ?? null };
    if (row.movementId) {
      const movement = await this.prisma.kontorHareketi.findUnique({ where: { id: row.movementId } });
      if (movement) {
        billing = { ...billing, previousBalance: movement.oncekiBakiye, remainingBalance: movement.sonrakiBakiye,
          walletSource: movement.kullaniciId === row.userId ? 'PERSONAL' : 'OFFICE', walletOfficeId: null };
        if (selection) {
          const wallet = await this.resolveWallet(user.id, selection);
          if (wallet.chargeUserId !== movement.kullaniciId || (movement.olusturanId || row.userId) !== row.userId) {
            throw new ForbiddenException('Önceki işlemin PK hesabı doğrulanamadı.');
          }
          billing.walletOfficeId = wallet.walletOfficeId;
        }
      } else if (selection) this.reject('MATCH_SCAN_REVIEW_REQUIRED', 'Önceki kesinti kaydı doğrulanamadı. Yeni tarama başlatılmadı.');
    } else if (selection?.walletSource === 'OFFICE') {
      this.reject('MATCH_SCAN_REVIEW_REQUIRED', 'Eski rapordaki ofis PK kaynağı doğrulanamadı.');
    }
    return { ...result, ok: true, billing, operationId: result.operationId || row.movementId || row.id };
  }

  private async readable(result: any, context: ScanContext, user: { id: string; role: Role }) {
    const saved: PaidMatchItem[] = Array.isArray(result.matches) ? result.matches : result.pool?.matches || [];
    const matches = await readablePaidMatches(this.prisma, saved, user);
    return { ...result, ok: true, matches, stale: Boolean(result.sourceVersion && context.sourceVersion !== result.sourceVersion), snapshot: true,
      unavailableResultCount: saved.length - matches.length,
      ...(result.pool ? { pool: { ...result.pool, matches, resultCount: matches.length, unavailableResultCount: saved.length - matches.length } } : {}) };
  }

  private async findMatches(type: CommercialScanType, context: ScanContext, user: { id: string; role: Role }) {
    const options = { source: type === 'REQUEST' ? 'TALEP_MERKEZI' as const : 'CRM' as const,
      strictBudget: true, strictLocation: true, useDistance: false, paidScan: true };
    if (type === 'PRIVATE_PORTFOLIO' || type === 'POOL_PROPERTY') {
      const interests = await this.prisma.customerInterest.findMany({ where: { isActive: true, city: { equals: context.record.project.city, mode: 'insensitive' },
        propertyTypes: { has: context.record.type }, customer: user.role === Role.SUPER_ADMIN ? {} : { ownerId: user.id } },
        include: { customer: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { id: 'asc' }, take: MAX_CANDIDATES + 1 });
      this.checkLimit(interests.length);
      const best = new Map<string, PaidMatchItem>();
      for (const interest of interests) {
        if (!this.demandReady(interest)) continue;
        const match = await this.matchEngine.matchDemandToUnit(interest, context.record, options);
        if (!match) continue;
        const item = { ...this.item(match, context.record, user.id), customerId: interest.customerId, interestId: interest.id,
          customerName: [interest.customer.firstName, interest.customer.lastName].filter(Boolean).join(' ') };
        if (!best.has(interest.customerId) || best.get(interest.customerId)!.matchScore < item.matchScore) best.set(interest.customerId, item);
      }
      return { matches: [...best.values()].sort((a, b) => b.matchScore - a.matchScore), evaluated: interests.length };
    }
    const units = await this.prisma.unit.findMany({ where: { ...ACTIVE_MATCH_UNIT,
      AND: [visiblePaidUnits(user), { OR: context.demands.map(demand => this.candidateWhere(demand)) }],
      OR: [{ isPoolVisible: true }, { isPoolVisible: false, isSalesInventory: true, project: { ownerId: user.id } }],
      type: { in: [...new Set(context.demands.flatMap(demand => demand.propertyTypes || []))] as any } },
      include: { project: true, images: { where: { isCover: true }, take: 1 } }, orderBy: { id: 'asc' }, take: MAX_CANDIDATES + 1 });
    this.checkLimit(units.length);
    const unitMap = new Map(units.map(unit => [unit.id, unit]));
    const best = new Map<string, PaidMatchItem>();
    for (const demand of context.demands) {
      const matches = await this.matchEngine.matchDemandToUnits(demand, units, options);
      for (const match of matches) {
        const item = this.item(match, unitMap.get(match.unitId), user.id);
        if (!best.has(item.unitId) || best.get(item.unitId)!.matchScore < item.matchScore) best.set(item.unitId, item);
      }
    }
    return { matches: [...best.values()].sort((a, b) => b.matchScore - a.matchScore), evaluated: units.length };
  }

  private candidateWhere(demand: EphMatchDemand): Prisma.UnitWhereInput {
    const currency = String(demand.priceCurrency || 'TRY').toUpperCase().replace(/^TL$/, 'TRY');
    const max = Number(demand.maxBudget ?? demand.budget), min = Number(demand.minBudget);
    return { project: { city: { equals: String(demand.city), mode: 'insensitive' },
      ...(demand.district ? { district: { equals: demand.district, mode: 'insensitive' as const } } : {}) },
      ...(demand.statuses?.length ? { status: { in: demand.statuses as any } } : {}),
      price: { gt: 0, ...(Number.isFinite(max) && max > 0 ? { lte: max } : {}), ...(Number.isFinite(min) && min > 0 ? { gte: min } : {}) },
      AND: [currency === 'TRY' ? { OR: [{ priceCurrency: null }, { priceCurrency: { in: ['TRY', 'TL'], mode: 'insensitive' } }] } :
        { priceCurrency: { equals: currency, mode: 'insensitive' } }],
    };
  }

  private item(match: any, unit: any, userId: string): PaidMatchItem {
    return { ...match, title: match.projectName || 'Gayrimenkul', ephId: unit.listingNumber || null,
      unitType: match.type, priceCurrency: unit.priceCurrency || 'TRY', city: unit.project.city || null,
      district: unit.project.district || null, neighborhood: unit.project.neighborhood || null,
      isOwnPortfolio: unit.project.ownerId === userId, isPoolVisible: unit.isPoolVisible,
      netArea: unit.netArea == null ? null : String(unit.netArea), grossArea: unit.grossArea == null ? null : String(unit.grossArea) };
  }

  private async context(type: CommercialScanType, sourceId: string, user: { id: string; role: Role }, validate = true, db: PrismaService | Prisma.TransactionClient = this.prisma): Promise<ScanContext> {
    let record: any, demands: EphMatchDemand[] = [];
    if (type === 'CRM') {
      record = await db.customerInterest.findUnique({ where: { id: sourceId }, include: { customer: { select: { ownerId: true } } } });
      if (!record || !record.isActive) throw new NotFoundException('Aktif CRM talebi bulunamadı.');
      if (user.role !== Role.SUPER_ADMIN && record.customer.ownerId !== user.id) throw new ForbiddenException('Bu CRM talebine erişim yetkiniz yok.');
      demands = [record];
    } else if (type === 'REQUEST') {
      record = await db.networkPost.findFirst({ where: { id: sourceId, isActive: true, expiresAt: { gt: new Date() }, ...(user.role === Role.SUPER_ADMIN ? {} : { userId: user.id }) } });
      if (!record) throw new NotFoundException('Aktif veya size ait Talep Havuzu kaydı bulunamadı.');
      if (!['PORTFOY_ARIYORUM', 'KAT_KARSILIGI_ARSA_ARIYORUM'].includes(record.type)) this.reject('MATCH_SCAN_SOURCE_INVALID', 'Bu kayıt türünde eşleşme taraması bulunmuyor.');
      const requestType = (record.tags || []).find((tag: string) => tag.startsWith('Talep Türü:')) || '';
      const statuses = record.type === 'KAT_KARSILIGI_ARSA_ARIYORUM' ? ['KAT_KARSILIGI'] : requestType.toLocaleUpperCase('tr-TR').includes('KIRALIK') ? ['KIRALIK'] : ['SATILIK'];
      const areas = Array.isArray(record.areas) && record.areas.length ? record.areas : [record];
      if (areas.length > 20) this.reject('MATCH_SCAN_SOURCE_INVALID', 'Bir taramada en fazla 20 bölge seçilebilir.');
      demands = areas.map((area: any) => ({ ...record, city: area.city || record.city, district: area.district || record.district,
        neighborhood: area.neighborhood || record.neighborhood, maxBudget: record.maxBudget ?? record.budget, statuses }));
    } else {
      record = await db.unit.findUnique({ where: { id: sourceId }, include: { project: true, images: { where: { isCover: true }, take: 1 } } });
      if (!record || record.isOffMarket || !record.project.isActive || ['PASIF', 'SATILDI', 'KIRALANDII'].includes(record.status)) throw new NotFoundException('Aktif portföy bulunamadı.');
      if (validate && (!Number.isFinite(Number(record.price)) || Number(record.price) <= 0 || !record.project.city)) {
        this.reject('MATCH_SCAN_SOURCE_INVALID', 'Taramadan önce portföyün il ve geçerli fiyat bilgisini tamamlayın.');
      }
      if (type === 'PRIVATE_PORTFOLIO' && (record.isPoolVisible || (user.role !== Role.SUPER_ADMIN && record.project.ownerId !== user.id))) throw new ForbiddenException('Bu özel portföyü tarama yetkiniz yok.');
      await assertNoBlockedInteraction(db, user.id, [record.project.ownerId]);
      if (type === 'POOL_PROPERTY' && !record.isPoolVisible) throw new NotFoundException('Havuz ilanı bulunamadı.');
      if (type === 'POOL_PROPERTY' && user.role !== Role.SUPER_ADMIN && record.project.ownerId !== user.id) {
        const visible = await db.unit.findFirst({ where: { id: sourceId, AND: [visiblePaidUnits(user)] }, select: { id: true } });
        if (!visible) throw new NotFoundException('Havuz ilanına erişim izniniz bulunmuyor.');
      }
    }
    if (validate && demands.some(demand => !this.demandReady(demand))) this.reject('MATCH_SCAN_SOURCE_INVALID', 'Taramadan önce il, gayrimenkul türü, işlem türü ve maksimum bütçeyi tamamlayın.');
    const version = createHash('sha256').update(JSON.stringify([
      record.id, record.updatedAt, record.project?.updatedAt, record.city, record.district, record.neighborhood,
      record.propertyTypes, record.statuses, record.minBudget, record.maxBudget, record.budget, record.minArea, record.maxArea,
      record.roomCounts, record.features, record.cardProfileCriteria, record.areas, record.tags, record.priceCurrency, record.price, record.type, record.status,
    ])).digest('hex');
    return { record, demands, sourceVersion: version };
  }

  private demandReady(demand: EphMatchDemand) {
    const hasIntent = Boolean(demand.statuses?.length || ['SATIN_ALMA', 'KIRALAMA', 'YATIRIM', 'KAT_KARSILIGI'].includes(demand.purchaseIntent || ''));
    const kat = demand.statuses?.includes('KAT_KARSILIGI') || demand.purchaseIntent === 'KAT_KARSILIGI';
    const budget = Number(demand.maxBudget ?? demand.budget), min = Number(demand.minBudget || 0);
    const criteria = demand.cardProfileCriteria as { values?: Record<string, unknown[]>; priorities?: Record<string, string> } | null;
    const completeMust = Object.entries(criteria?.priorities || {}).every(([key, value]) => value !== 'MUST' || Boolean(criteria?.values?.[key]?.length));
    return Boolean(String(demand.city || '').trim() && demand.propertyTypes?.length && hasIntent && completeMust && (kat || (Number.isFinite(budget) && budget > 0 && min <= budget)));
  }

  private demandSummary(context: ScanContext) {
    const demand = context.demands[0];
    return demand ? { interestId: demand.id, title: demand.title, city: demand.city, district: demand.district,
      neighborhood: demand.neighborhood, regionLabel: this.region(demand), maxBudget: demand.maxBudget,
      minBudget: demand.minBudget, priceCurrency: demand.priceCurrency || 'TRY' } : null;
  }
  private region(demand?: EphMatchDemand) {
    return demand ? [demand.city, demand.district, demand.neighborhood].filter(Boolean).join(' / ') : 'Portföye uygun müşteriler';
  }
  private checkLimit(count: number) {
    if (count > MAX_CANDIDATES) this.reject('MATCH_SCAN_SOURCE_INVALID', 'Tarama kapsamı çok geniş. Kriterleri daraltın; bu işlem için PK kesilmedi.');
  }
  private async cost(type: CommercialScanType) {
    const general = await this.adminService.getNumericSystemSetting('MATCH_SCAN_COST_PK', 25);
    const value = await this.adminService.getNumericSystemSetting(COST_KEYS[type], general);
    if (!Number.isSafeInteger(value) || value <= 0) this.reject('MATCH_SCAN_TARIFF_INVALID', 'Pozitif PK tarama ücreti tanımlanmamış. Yönetimden tarifeyi kontrol edin.');
    return value;
  }
  private async resolveWallet(userId: string, selection: WalletSelection, db: PrismaService | Prisma.TransactionClient = this.prisma) {
    const selected = await resolveOfficeWallet(db, userId, selection, db !== this.prisma);
    const { chargeUserId, walletOfficeId } = selected;
    const source = selected.walletSource;
    const wallet = db === this.prisma ? await this.kontorService.getCuzdan(chargeUserId) : await db.kontorCuzdani.findUnique({ where: { kullaniciId: chargeUserId } });
    if (!wallet) throw new BadRequestException('PK hesabı bulunamadı.');
    return { source, chargeUserId, walletOfficeId, balance: wallet.bakiye, active: wallet.aktifMi };
  }
  private selection(body: Record<string, unknown>): WalletSelection {
    return { walletSource: String(body.walletSource || 'PERSONAL').toUpperCase(), walletOfficeId: String(body.walletOfficeId || '') || undefined };
  }
  private parseType(value: string): CommercialScanType {
    const type = String(value || '').trim().toUpperCase() as CommercialScanType;
    if (!Object.prototype.hasOwnProperty.call(SOURCE_TYPES, type)) throw new BadRequestException('Geçersiz tarama türü.');
    return type;
  }
  private cleanSourceId(value: string) {
    const id = String(value || '').trim();
    if (!id || id.length > 128) throw new BadRequestException('Geçersiz tarama kaynağı.');
    return id;
  }
  private async resolveUser(raw: ScanUser) {
    const id = String(raw?.id || '').trim();
    if (!id) throw new ForbiddenException('Tarama için giriş yapmalısınız.');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return { id, role: user.role };
  }
}
