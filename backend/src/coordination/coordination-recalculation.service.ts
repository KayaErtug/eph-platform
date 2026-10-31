import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { LinaGorevOnceligi, LinaModul, Role } from '@prisma/client';
import { CrmService } from '../crm/crm.service';
import { readablePaidMatches, PaidMatchItem, ACTIVE_MATCH_UNIT, visiblePaidUnits } from '../matching/paid-match-report';
import { NetworkService } from '../network/network.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommercialMatchScanService } from './commercial-match-scan.service';

type CoordinationUser = { id?: string; role?: Role | string };
export type RequestScanOptions = { walletSource?: string; walletOfficeId?: string; expectedActorId?: string; expectedCostPk?: number };

@Injectable()
export class CoordinationRecalculationService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly crmService: CrmService,
    private readonly networkService: NetworkService, private readonly paidScans: CommercialMatchScanService) {}

  onModuleInit() {
    this.networkService.registerRequestMatchHandler(async (postId, ownerId) => {
      await this.notify(ownerId, LinaModul.FORUM, 'Talep kaydedildi', postId, '/network');
    });
    this.crmService.registerInterestMatchHandler(async interestId => {
      const interest = await this.prisma.customerInterest.findUnique({ where: { id: interestId },
        include: { customer: { select: { ownerId: true } } } });
      if (interest?.isActive) await this.notify(interest.customer.ownerId, LinaModul.CRM, 'Müşteri talebi kaydedildi', interestId, '/crm');
    });
  }

  private notify(userId: string, module: LinaModul, title: string, relatedId: string, targetUrl: string) {
    return this.prisma.linaBildirim.create({ data: {
      kullaniciId: userId, modul: module, baslik: title, bildirimTuru: 'PAID_MATCH_SCAN_REQUIRED',
      mesaj: 'Güncel eşleşmeler için ilgili ekrandan PK ücretini onaylayarak tarama başlatabilirsiniz.',
      ilgiliKayitTuru: 'PAID_MATCH_SCAN_REQUIRED', ilgiliKayitId: relatedId,
      hedefUrl: targetUrl, oncelik: LinaGorevOnceligi.NORMAL,
    } });
  }

  async getMatchScanConfig(user: CoordinationUser, options: RequestScanOptions = {}) {
    return this.paidScans.config(user, options);
  }

  async runPaidRequestMatchScan(postId: string, user: CoordinationUser, requestId: string, options: RequestScanOptions = {}) {
    return this.paidScans.scan('REQUEST', postId, user, { ...options, requestId });
  }

  async requestMatchHistory(postId: string, user: CoordinationUser, requestId?: string) {
    return requestId ? this.paidScans.historyReceipt('REQUEST', postId, requestId, user) :
      this.paidScans.history('REQUEST', postId, user);
  }

  async recalculateCrmInterest(_interestId: string, user: CoordinationUser) {
    await this.resolveUser(user);
    throw new BadRequestException({ code: 'PAID_MATCH_REQUIRED', message: 'CRM Eşleşme ekranından güncel PK ücretini onaylayarak tarama başlatın.' });
  }

  async previewRequestPoolMatches(_input: unknown, user: CoordinationUser) {
    await this.resolveUser(user);
    throw new BadRequestException({ code: 'PAID_MATCH_REQUIRED', message: 'Ücretsiz canlı tarama kapalıdır. Talebi kaydedin; detay ekranından ücretli tarama başlatın.' });
  }

  async getAlerts(rawUser: CoordinationUser) {
    const user = await this.resolveUser(rawUser);
    const global = user.role === Role.SUPER_ADMIN; // §0: süper admin küresel kapsam
    const [interests, posts, scans] = await Promise.all([
      this.prisma.customerInterest.findMany({ where: { isActive: true, ...(global ? {} : { customer: { ownerId: user.id } }) },
        select: { id: true, title: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.networkPost.findMany({ where: { ...(global ? {} : { userId: user.id }), isActive: true, expiresAt: { gt: new Date() },
        type: { in: ['PORTFOY_ARIYORUM', 'KAT_KARSILIGI_ARSA_ARIYORUM'] } },
        select: { id: true, title: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 100 }),
      this.prisma.matchScanAttempt.findMany({ where: { ...(global ? {} : { userId: user.id }), status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' }, select: { sourceType: true, sourceId: true, completedAt: true }, take: 1000 }),
    ]);
    const latest = new Map<string, Date>();
    for (const scan of scans) {
      const key = scan.sourceType + ':' + scan.sourceId;
      if (!latest.has(key) && scan.completedAt) latest.set(key, scan.completedAt);
    }
    const alerts = [...interests.map(record => ({ ...record, sourceType: 'CRM_CUSTOMER', type: 'CRM_INTEREST_STALE', action: 'RECALCULATE_CRM_INTEREST' })),
      ...posts.map(record => ({ ...record, sourceType: 'REQUEST', type: 'REQUEST_POST_STALE', action: 'RECALCULATE_REQUEST_PORTFOLIOS' }))]
      .filter(record => !latest.has(record.sourceType + ':' + record.id) || record.updatedAt > latest.get(record.sourceType + ':' + record.id)!)
      .map(record => ({ type: record.type, entityId: record.id, title: record.title || 'Gayrimenkul talebi',
        message: 'Kayıt değişti veya henüz taranmadı. Yeni eşleşmeler için PK ücretini onaylayın.',
        updatedAt: record.updatedAt.toISOString(), action: record.action, requiresPaidScan: true }));
    return { count: alerts.length, alerts };
  }

  async getLinaOpportunities(rawUser: CoordinationUser) {
    const user = await this.resolveUser(rawUser);
    const scans = await this.prisma.matchScanAttempt.findMany({ where: { ...(user.role === Role.SUPER_ADMIN ? {} : { userId: user.id }), status: 'COMPLETED' },
      orderBy: { startedAt: 'desc' }, take: 100 });
    const seen = new Set<string>();
    const latest = scans.filter(scan => {
      const key = scan.sourceType + ':' + scan.sourceId;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const [interests, posts, sources] = await Promise.all([
      this.prisma.customerInterest.findMany({ where: { id: { in: latest.filter(s => s.sourceType === 'CRM_CUSTOMER').map(s => s.sourceId) },
        isActive: true, ...(user.role === Role.SUPER_ADMIN ? {} : { customer: { ownerId: user.id } }) },
        include: { customer: { select: { id: true, firstName: true, lastName: true } } } }),
      this.prisma.networkPost.findMany({ where: { id: { in: latest.filter(s => s.sourceType === 'REQUEST').map(s => s.sourceId) },
        isActive: true, expiresAt: { gt: new Date() }, ...(user.role === Role.SUPER_ADMIN ? {} : { userId: user.id }) } }),
      this.prisma.unit.findMany({ where: { ...ACTIVE_MATCH_UNIT,
        AND: [visiblePaidUnits(user)],
        id: { in: latest.filter(s => ['POOL_PROPERTY', 'PRIVATE_PORTFOLIO'].includes(s.sourceType)).map(s => s.sourceId) },
        OR: [{ isPoolVisible: true }, { project: { ownerId: user.id } }, ...(user.role === Role.SUPER_ADMIN ? [{ project: { isActive: true } }] : [])] },
        select: { id: true, isPoolVisible: true } }),
    ]);
    const interestMap = new Map(interests.map(interest => [interest.id, interest]));
    const postMap = new Map(posts.map(post => [post.id, post]));
    const sourceMap = new Map(sources.map(source => [source.id, source]));
    const candidates: PaidMatchItem[] = [];
    for (const scan of latest) {
      const source = scan.sourceType === 'CRM_CUSTOMER' ? interestMap.get(scan.sourceId) : scan.sourceType === 'REQUEST' ? postMap.get(scan.sourceId) : sourceMap.get(scan.sourceId);
      if (!source) continue;
      const report = scan.resultJson as { matches?: PaidMatchItem[]; pool?: { matches?: PaidMatchItem[] }; scannedAt?: string };
      for (const match of report?.matches || report?.pool?.matches || []) {
        candidates.push({ ...match, reportId: scan.requestId, reportSourceType: scan.sourceType, reportSourceId: scan.sourceId,
          scannedAt: report.scannedAt || scan.startedAt.toISOString() });
      }
    }
    const readable = await readablePaidMatches(this.prisma, candidates, user);
    const opportunities = readable.slice(0, 100).map((item, index) => {
      const crm = item.reportSourceType === 'CRM_CUSTOMER';
      const request = item.reportSourceType === 'REQUEST';
      const interest = crm ? interestMap.get(String(item.reportSourceId)) : undefined;
      const customer = interest?.customer;
      return { id: `${item.reportId}:${index}`, category: crm ? 'MUSTERILERIM_ICIN' : request ? 'TALEP_MERKEZIM' : 'PORTFOYLERIM_ICIN',
        origin: crm ? 'CRM' : request ? 'TALEP_MERKEZI' : 'PORTFOY', matchScore: item.matchScore, matchReasons: item.matchReasons,
        matchLevel: item.matchLevel, scannedAt: item.scannedAt, snapshot: true,
        customer: item.customerId ? { id: item.customerId, name: item.customerName, interestId: item.interestId } :
          customer ? { id: customer.id, name: [customer.firstName, customer.lastName].filter(Boolean).join(' '), interestId: interest!.id } : null,
        request: request ? { id: item.reportSourceId, title: postMap.get(String(item.reportSourceId))?.title } : null,
        asset: { ...item, isMine: item.isOwnPortfolio, type: item.type || item.unitType, ownerName: item.isOwnPortfolio ? 'Sizin portföyünüz' : 'EPH Üyesi' },
      };
    });
    return { generatedAt: new Date().toISOString(), policyVersion: 'EPH_PAID_MATCH_V1', user: { id: user.id }, snapshot: true,
      summary: { total: opportunities.length, strong: opportunities.filter(i => i.matchScore >= 75).length,
        suitable: opportunities.filter(i => i.matchScore >= 40 && i.matchScore < 75).length,
        customersFor: opportunities.filter(i => i.category === 'MUSTERILERIM_ICIN').length,
        portfoliosFor: opportunities.filter(i => i.category === 'PORTFOYLERIM_ICIN').length,
        requestsFor: opportunities.filter(i => i.category === 'TALEP_MERKEZIM').length }, opportunities,
      warning: 'Yalnızca kayıtlı ücretli tarama sonuçları gösterilir. Güncel eşleşmeler için yeni PK onaylı tarama gerekir.' };
  }

  private async resolveUser(rawUser: CoordinationUser) {
    const id = String(rawUser?.id || '').trim();
    if (!id) throw new ForbiddenException('Giriş yapmalısınız.');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return { id, role: user.role };
  }
}
